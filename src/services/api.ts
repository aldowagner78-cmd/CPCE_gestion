
import { Practice, Affiliate, Plan } from '@/types/database'
import { getSupabaseClient } from '@/lib/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

/**
 * Servicio de datos conectado a Supabase.
 * Convierte filas de la BD a los tipos de la app (coverage engine).
 */
export const DataService = {

    async searchPractices(query: string, jurisdictionId: number): Promise<Practice[]> {
        const supabase = getSupabaseClient()
        const lowerQuery = query.toLowerCase()

        const { data, error } = await supabase
            .from('practices')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .eq('is_active', true)
            .or(`code.ilike.%${lowerQuery}%,name.ilike.%${lowerQuery}%`)
            .limit(50)

        if (error || !data) return []

        return data.map((p: Row) => ({
            id: p.id,
            code: p.code,
            description: p.name,
            jurisdiction_id: p.jurisdiction_id ?? jurisdictionId,
            financial_value: p.fixed_value ?? 0,
            category: p.category ?? 'General',
            created_at: p.created_at,
        }))
    },

    async getPracticesByJurisdiction(jurisdictionId: number): Promise<Practice[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('practices')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .eq('is_active', true)
            .order('code')

        if (error || !data) return []

        return data.map((p: Row) => ({
            id: p.id,
            code: p.code,
            description: p.name,
            jurisdiction_id: p.jurisdiction_id ?? jurisdictionId,
            financial_value: p.fixed_value ?? 0,
            category: p.category ?? 'General',
            created_at: p.created_at,
        }))
    },

    async getAffiliateByDNI(dni: string, jurisdictionId: number): Promise<Affiliate | null> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('affiliates')
            .select('*')
            .eq('document_number', dni)
            .eq('jurisdiction_id', jurisdictionId)
            .single()

        if (error || !data) return null

        return {
            id: data.id,
            affiliate_number: data.affiliate_number ?? undefined,
            full_name: data.full_name,
            document_number: data.document_number,
            birth_date: data.birth_date ?? '',
            gender: data.gender ?? undefined,
            relationship: data.relationship ?? undefined,
            titular_id: data.titular_id,
            plan_id: data.plan_id ?? 0,
            jurisdiction_id: data.jurisdiction_id ?? jurisdictionId,
            start_date: data.start_date,
            end_date: data.end_date,
            status: data.status ?? 'activo',
            created_at: data.created_at,
        }
    },

    async getAffiliatesByJurisdiction(jurisdictionId: number): Promise<Affiliate[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('affiliates')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .eq('status', 'activo')
            .order('full_name')

        if (error || !data) return []

        return data.map((a: Row) => ({
            id: a.id,
            affiliate_number: a.affiliate_number ?? undefined,
            full_name: a.full_name,
            document_number: a.document_number,
            birth_date: a.birth_date ?? '',
            gender: a.gender ?? undefined,
            relationship: a.relationship ?? undefined,
            titular_id: a.titular_id,
            plan_id: a.plan_id ?? 0,
            jurisdiction_id: a.jurisdiction_id ?? jurisdictionId,
            start_date: a.start_date,
            end_date: a.end_date,
            status: a.status ?? 'activo',
            created_at: a.created_at,
        }))
    },

    async getPlan(planId: number): Promise<Plan | null> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('id', planId)
            .single()

        if (error || !data) return null

        return {
            id: data.id,
            name: data.name,
            jurisdiction_id: data.jurisdiction_id ?? 0,
            rules: {
                coverage_percent: data.coverage_percent ?? 80,
                waiting_period_months: data.waiting_period_months ?? 0,
            },
            created_at: data.created_at,
        }
    },

    async getPlansByJurisdiction(jurisdictionId: number): Promise<Plan[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)

        if (error || !data) return []

        return data.map((p: Row) => ({
            id: p.id,
            name: p.name,
            jurisdiction_id: p.jurisdiction_id ?? jurisdictionId,
            rules: {
                coverage_percent: p.coverage_percent ?? 80,
                waiting_period_months: p.waiting_period_months ?? 0,
            },
            created_at: p.created_at,
        }))
    },
}
