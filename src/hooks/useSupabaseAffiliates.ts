'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para afiliados con Supabase Realtime.
 * Los usuarios ven nuevos afiliados o cambios al instante.
 */
export function useSupabaseAffiliates(jurisdictionId?: number) {
    const [affiliates, setAffiliates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAffiliates = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            let query = supabase
                .from('affiliates')
                .select('*')
                .order('full_name')

            if (jurisdictionId) {
                query = query.eq('jurisdiction_id', jurisdictionId)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError
            setAffiliates(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar afiliados')
            console.error('Error fetching affiliates:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAffiliates()

        const supabase = createClient()

        // REALTIME: Suscripción a cambios en afiliados
        const channel = supabase
            .channel('affiliates-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'affiliates',
                },
                (payload) => {
                    console.log('[Realtime] Affiliate cambió:', payload)
                    fetchAffiliates()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jurisdictionId])

    return { affiliates, loading, error, refetch: fetchAffiliates }
}
