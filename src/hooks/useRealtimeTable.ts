'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook genérico para suscribirse a cambios en tiempo real de cualquier tabla de Supabase.
 * Los usuarios ven actualizaciones automáticamente sin recargar el navegador.
 * 
 * @param tableName - Nombre de la tabla de Supabase
 * @param initialFetch - Función para cargar datos iniciales
 * @param filter - Filtro opcional (ej: { column: 'jurisdiction_id', value: 1 })
 * @returns { data, loading, error, refetch }
 */
export function useRealtimeTable<T>(
    tableName: string,
    initialFetch: () => Promise<T[]>,
    filter?: { column: string; value: any }
) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            const result = await initialFetch()
            setData(result)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar datos')
            console.error(`Error fetching ${tableName}:`, err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()

        const supabase = createClient()
        let channel: RealtimeChannel

        // Suscripción a cambios en tiempo real
        const filterString = filter ? `${filter.column}=eq.${filter.value}` : undefined

        channel = supabase
            .channel(`${tableName}-changes-${filterString || 'all'}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: tableName,
                    filter: filterString,
                },
                (payload) => {
                    console.log(`[Realtime] ${tableName} cambió:`, payload.eventType, payload.new || payload.old)
                    
                    // Refetch completo para simplificar
                    fetchData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tableName, filter?.column, filter?.value])

    return { data, loading, error, refetch: fetchData }
}
