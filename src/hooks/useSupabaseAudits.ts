'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para auditorías con Supabase Realtime.
 * Los usuarios ven auditorías nuevas al instante sin recargar.
 */
export function useSupabaseAudits(jurisdictionId?: number) {
    const [audits, setAudits] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAudits = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            let query = supabase
                .from('audits')
                .select('*')
                .order('created_at', { ascending: false })

            if (jurisdictionId) {
                query = query.eq('jurisdiction_id', jurisdictionId)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError
            setAudits(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar auditorías')
            console.error('Error fetching audits:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAudits()

        const supabase = createClient()

        // REALTIME: Suscripción a cambios en auditorías
        const channel = supabase
            .channel('audits-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'audits',
                },
                (payload) => {
                    console.log('[Realtime] Audit cambió:', payload)
                    fetchAudits()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jurisdictionId])

    return { audits, loading, error, refetch: fetchAudits }
}

/**
 * Hook para contadores de auditorías por estado
 */
export function useSupabaseAuditCounts(jurisdictionId?: number) {
    const { audits } = useSupabaseAudits(jurisdictionId)

    return {
        pending: audits.filter((a) => a.status === 'pending').length,
        approved: audits.filter((a) => a.status === 'approved').length,
        rejected: audits.filter((a) => a.status === 'rejected').length,
        partial: audits.filter((a) => a.status === 'partial').length,
        requires_auth: audits.filter((a) => a.status === 'requires_auth').length,
        total: audits.length,
    }
}
