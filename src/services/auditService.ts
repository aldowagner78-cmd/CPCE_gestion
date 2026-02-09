import { AuditRecord, AuditStatus } from '@/types/database'
import { CoverageResult } from '@/lib/coverageEngine'
import { Affiliate, Plan, Practice } from '@/types/database'
import { AlertService } from './alertService'

/**
 * Store de auditorías en memoria.
 * Cuando se integre Supabase, este módulo se reemplaza
 * por llamadas a la tabla `audits` sin cambiar la interfaz pública.
 */

let auditCounter = 0
const auditsStore: AuditRecord[] = []

// Callbacks para notificar cambios a los consumidores (React)
type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
    listeners.forEach((fn) => fn())
}

export const AuditService = {
    /**
     * Registra una nueva auditoría a partir del resultado del motor de cobertura.
     */
    create(
        affiliate: Affiliate,
        plan: Plan,
        practice: Practice,
        coverageResult: CoverageResult,
        auditorName: string = 'Admin Sistema'
    ): AuditRecord {
        auditCounter++

        // Determinar el estado inicial automáticamente
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

        const record: AuditRecord = {
            id: auditCounter,
            affiliate_id: affiliate.id,
            affiliate_name: affiliate.full_name,
            affiliate_document: affiliate.document_number,
            practice_id: practice.id,
            practice_code: practice.code,
            practice_description: practice.description,
            practice_category: practice.category,
            practice_value: practice.financial_value,
            plan_id: plan.id,
            plan_name: plan.name,
            jurisdiction_id: affiliate.jurisdiction_id,
            coverage_percent: coverageResult.percentage,
            covered_amount: coverageResult.coveredAmount,
            copay: coverageResult.copay,
            authorization_required: coverageResult.authorizationRequired,
            messages: coverageResult.messages,
            status,
            auditor_name: auditorName,
            notes: '',
            created_at: new Date().toISOString(),
        }

        auditsStore.unshift(record) // Más recientes primero
        notifyListeners()

        // Evaluar reglas de alerta tras cada nueva auditoría
        try { AlertService.evaluate() } catch { /* no-op si hay dependencia circular */ }

        return record
    },

    /**
     * Actualiza el estado de una auditoría (ej: supervisor aprueba una que requería auth).
     */
    updateStatus(
        auditId: number,
        newStatus: AuditStatus,
        notes?: string,
        authorizationCode?: string
    ): AuditRecord | null {
        const record = auditsStore.find((a) => a.id === auditId)
        if (!record) return null

        record.status = newStatus
        record.reviewed_at = new Date().toISOString()
        if (notes) record.notes = notes
        if (authorizationCode) record.authorization_code = authorizationCode

        notifyListeners()
        return record
    },

    /**
     * Obtiene todas las auditorías, opcionalmente filtradas por jurisdicción.
     */
    getAll(jurisdictionId?: number): AuditRecord[] {
        if (jurisdictionId) {
            return auditsStore.filter((a) => a.jurisdiction_id === jurisdictionId)
        }
        return [...auditsStore]
    },

    /**
     * Obtiene una auditoría por ID.
     */
    getById(id: number): AuditRecord | null {
        return auditsStore.find((a) => a.id === id) ?? null
    },

    /**
     * Obtiene contadores de estado para el dashboard.
     */
    getStatusCounts(jurisdictionId?: number): Record<AuditStatus, number> {
        const filtered = jurisdictionId
            ? auditsStore.filter((a) => a.jurisdiction_id === jurisdictionId)
            : auditsStore

        return {
            pending: filtered.filter((a) => a.status === 'pending').length,
            approved: filtered.filter((a) => a.status === 'approved').length,
            rejected: filtered.filter((a) => a.status === 'rejected').length,
            partial: filtered.filter((a) => a.status === 'partial').length,
            requires_auth: filtered.filter((a) => a.status === 'requires_auth').length,
        }
    },

    /**
     * Suscribirse a cambios en el store (para useSyncExternalStore).
     */
    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    /**
     * Snapshot para useSyncExternalStore.
     */
    getSnapshot(): AuditRecord[] {
        return auditsStore
    },
}
