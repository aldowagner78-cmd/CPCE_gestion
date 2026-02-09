'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para agenda con Supabase Realtime.
 * Los usuarios ven eventos nuevos o cambios al instante.
 */
export function useSupabaseAgenda(jurisdictionId?: number) {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchEvents = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            let query = supabase
                .from('agenda_events')
                .select('*')
                .order('start_date', { ascending: true })

            if (jurisdictionId) {
                query = query.eq('jurisdiction_id', jurisdictionId)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError
            setEvents(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar eventos')
            console.error('Error fetching events:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()

        const supabase = createClient()

        // REALTIME: Suscripción a cambios en agenda
        const channel = supabase
            .channel('agenda-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'agenda_events',
                },
                (payload) => {
                    console.log('[Realtime] Event cambió:', payload)
                    fetchEvents()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jurisdictionId])

    return { events, loading, error, refetch: fetchEvents }
}
