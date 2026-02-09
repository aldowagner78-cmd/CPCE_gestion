'use client'

import { useState, useEffect } from 'react'
import { SupabaseAlertService, Alert, AlertStatus } from '@/services/alertService.supabase'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook reactivo para consumir alertas desde Supabase CON REALTIME.
 * Los usuarios ven actualizaciones al instante sin recargar el navegador.
 */
export function useSupabaseAlerts(jurisdictionId?: number) {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAlerts = async () => {
        setLoading(true)
        try {
            const data = await SupabaseAlertService.getAll()
            if (jurisdictionId) {
                setAlerts(data.filter(a => a.jurisdiction_id === jurisdictionId || !a.jurisdiction_id))
            } else {
                setAlerts(data)
            }
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar alertas')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAlerts()

        const supabase = createClient()
        
        // REALTIME: Suscripción a cambios en la tabla alerts
        const channel = supabase
            .channel('alerts-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'alerts',
                },
                (payload) => {
                    console.log('[Realtime] Alert cambió:', payload)
                    fetchAlerts()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jurisdictionId])

    const updateStatus = async (id: string, status: AlertStatus) => {
        await SupabaseAlertService.updateStatus(id, status)
        await fetchAlerts()
    }

    const deleteAlert = async (id: string) => {
        await SupabaseAlertService.delete(id)
        await fetchAlerts()
    }

    return {
        alerts,
        loading,
        error,
        refetch: fetchAlerts,
        updateStatus,
        deleteAlert,
    }
}

/**
 * Hook para obtener solo alertas activas.
 */
export function useActiveSupabaseAlerts(jurisdictionId?: number) {
    const { alerts, ...rest } = useSupabaseAlerts(jurisdictionId)
    return {
        alerts: alerts.filter(a => a.status === 'active'),
        ...rest,
    }
}

/**
 * Hook para obtener contadores de alertas.
 */
export function useSupabaseAlertCounts(jurisdictionId?: number) {
    const [counts, setCounts] = useState({ total: 0, active: 0, high: 0, critical: 0 })

    useEffect(() => {
        const fetchCounts = async () => {
            const data = await SupabaseAlertService.getCounts()
            setCounts(data)
        }
        fetchCounts()

        const unsubscribe = SupabaseAlertService.subscribe(fetchCounts)
        return unsubscribe
    }, [jurisdictionId])

    return counts
}
