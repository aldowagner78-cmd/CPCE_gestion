'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para prácticas con Supabase Realtime.
 * Los usuarios ven cambios en el nomenclador al instante.
 */
export function useSupabasePractices(jurisdictionId?: number) {
    const [practices, setPractices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPractices = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            let query = supabase
                .from('practices')
                .select('*')
                .order('code')

            if (jurisdictionId) {
                query = query.eq('jurisdiction_id', jurisdictionId)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError
            setPractices(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar prácticas')
            console.error('Error fetching practices:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPractices()

        const supabase = createClient()

        // REALTIME: Suscripción a cambios en prácticas
        const channel = supabase
            .channel('practices-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'practices',
                },
                (payload) => {
                    console.log('[Realtime] Practice cambió:', payload)
                    fetchPractices()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jurisdictionId])

    return { practices, loading, error, refetch: fetchPractices }
}
