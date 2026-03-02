import { AuditRecord, AuditStatus } from '@/types/database'
import { CoverageResult } from '@/lib/coverageEngine'
import { Affiliate, Plan, Practice } from '@/types/database'
import { getSupabaseClient } from '@/lib/supabase/client'

/**
 * Servicio de auditorías con persistencia en Supabase.
 * Almacena datos desnormalizados en coverage_result JSONB para
 * evitar N+1 queries al mostrar la lista.
 */

// Reactive listeners for hooks
type Listener = () => void
const listeners = new Set<Listener>()
let cachedAudits: AuditRecord[] = []

function notifyListeners() {
    listeners.forEach((fn) => fn())
}

function mapRowToAuditRecord(row: any): AuditRecord {
    const cr = row.coverage_result ?? {}
    return {
        id: row.id,
        affiliate_id: row.affiliate_id ?? '',
        affiliate_name: cr.affiliate_name ?? '',
        affiliate_document: cr.affiliate_document ?? '',
        practice_id: row.practice_id ?? 0,
        practice_code: cr.practice_code ?? '',
        practice_description: cr.practice_description ?? '',
        practice_category: cr.practice_category ?? '',
        practice_value: cr.practice_value ?? 0,
        plan_id: row.plan_id ?? 0,
        plan_name: cr.plan_name ?? '',
        jurisdiction_id: row.jurisdiction_id ?? 0,
        coverage_percent: cr.coverage_percent ?? 0,
        covered_amount: cr.covered_amount ?? 0,
        copay: cr.copay ?? 0,
        authorization_required: cr.authorization_required ?? false,
        messages: cr.messages ?? [],
        status: row.status ?? 'pending',
        auditor_name: cr.auditor_name ?? '',
        notes: row.notes ?? '',
        authorization_code: row.authorization_code,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
    }
}

export const AuditService = {
    /**
     * Registra una nueva auditoría en Supabase.
     */
    async create(
        affiliate: Affiliate,
        plan: Plan,
        practice: Practice,
        coverageResult: CoverageResult,
        auditorName: string = 'Admin Sistema'
    ): Promise<AuditRecord | null> {
        const supabase = getSupabaseClient()

        // Determinar estado inicial
        let status: AuditStatus = 'pending'
        if (!coverageResult.covered) {
            status = 'rejected'
        } else if (coverageResult.authorizationRequired) {
            status = 'requires_auth'
        } else if (coverageResult.copay > 0) {
            status = 'partial'
        } else {
            status = 'approved'
        }

        // Datos desnormalizados para display rápido
        const coverageData = {
            affiliate_name: affiliate.full_name,
            affiliate_document: affiliate.document_number,
            practice_code: practice.code,
            practice_description: practice.description,
            practice_category: practice.category,
            practice_value: practice.financial_value,
            plan_name: plan.name,
            coverage_percent: coverageResult.percentage,
            covered_amount: coverageResult.coveredAmount,
            copay: coverageResult.copay,
            authorization_required: coverageResult.authorizationRequired,
            messages: coverageResult.messages,
            auditor_name: auditorName,
        }

        const { data, error } = await supabase
            .from('audits')
            .insert({
                affiliate_id: String(affiliate.id),
                practice_id: practice.id,
                plan_id: plan.id,
                jurisdiction_id: affiliate.jurisdiction_id,
                coverage_result: coverageData,
                status,
                notes: '',
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating audit:', error)
            return null
        }

        const record = mapRowToAuditRecord(data)
        cachedAudits.unshift(record)
        notifyListeners()
        return record
    },

    /**
     * Actualiza el estado de una auditoría.
     */
    async updateStatus(
        auditId: string | number,
        newStatus: AuditStatus,
        notes?: string,
        authorizationCode?: string
    ): Promise<AuditRecord | null> {
        const supabase = getSupabaseClient()
        const updates: Record<string, any> = {
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
        if (notes) updates.notes = notes
        if (authorizationCode) updates.authorization_code = authorizationCode

        const { data, error } = await supabase
            .from('audits')
            .update(updates)
            .eq('id', auditId)
            .select()
            .single()

        if (error) {
            console.error('Error updating audit:', error)
            return null
        }

        const record = mapRowToAuditRecord(data)
        // Update cache
        const idx = cachedAudits.findIndex(a => a.id === auditId)
        if (idx >= 0) cachedAudits[idx] = record
        notifyListeners()
        return record
    },

    /**
     * Obtiene todas las auditorías desde Supabase.
     */
    async fetchAll(jurisdictionId?: number): Promise<AuditRecord[]> {
        const supabase = getSupabaseClient()
        let query = supabase
            .from('audits')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)

        if (jurisdictionId) {
            query = query.eq('jurisdiction_id', jurisdictionId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching audits:', error)
            return []
        }

        cachedAudits = (data ?? []).map(mapRowToAuditRecord)
        notifyListeners()
        return cachedAudits
    },

    /**
     * Obtiene auditorías del cache (para uso síncrono en hooks).
     */
    getAll(jurisdictionId?: number): AuditRecord[] {
        if (jurisdictionId) {
            return cachedAudits.filter((a) => a.jurisdiction_id === jurisdictionId)
        }
        return [...cachedAudits]
    },

    getById(id: string | number): AuditRecord | null {
        return cachedAudits.find((a) => a.id === id) ?? null
    },

    getStatusCounts(jurisdictionId?: number): Record<AuditStatus, number> {
        const filtered = jurisdictionId
            ? cachedAudits.filter((a) => a.jurisdiction_id === jurisdictionId)
            : cachedAudits

        return {
            pending: filtered.filter((a) => a.status === 'pending').length,
            approved: filtered.filter((a) => a.status === 'approved').length,
            rejected: filtered.filter((a) => a.status === 'rejected').length,
            partial: filtered.filter((a) => a.status === 'partial').length,
            requires_auth: filtered.filter((a) => a.status === 'requires_auth').length,
        }
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    getSnapshot(): AuditRecord[] {
        return cachedAudits
    },
}
