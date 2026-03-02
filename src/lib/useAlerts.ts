import { useState, useEffect } from 'react'
import { SupabaseAlertService } from '@/services/alertService.supabase'
import { Alert } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook reactivo para alertas — delega a Supabase con Realtime.
 */
export function useAlerts(jurisdictionId?: number): Alert[] {
    const [alerts, setAlerts] = useState<Alert[]>([])

    useEffect(() => {
        const fetchAlerts = async () => {
            const data = await SupabaseAlertService.getAll()
            const mapped: Alert[] = data.map(a => ({
                id: a.id as unknown as number | string,
                rule_id: a.rule_id ?? 0,
                rule_name: a.title,
                description: a.description ?? '',
                detected_value: (a.metadata as Record<string, unknown>)?.detected_value as number ?? 0,
                threshold_value: (a.metadata as Record<string, unknown>)?.threshold_value as number ?? 0,
                severity: mapSeverity(a.severity),
                status: mapStatus(a.status),
                affiliate_id: (a.affiliate_id ?? 0) as unknown as number | string,
                jurisdiction_id: a.jurisdiction_id ?? 0,
                created_at: a.created_at,
                reviewed_at: a.resolved_at,
            }))
            if (jurisdictionId) {
                setAlerts(mapped.filter(a => a.jurisdiction_id === jurisdictionId || a.jurisdiction_id === 0))
            } else {
                setAlerts(mapped)
            }
        }
        fetchAlerts()

        const supabase = createClient()
        const channel = supabase
            .channel('alerts-hook')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchAlerts())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [jurisdictionId])

    return alerts
}

function mapSeverity(s: string): 'info' | 'warning' | 'critical' {
    if (s === 'critical') return 'critical'
    if (s === 'high' || s === 'warning') return 'warning'
    return 'info'
}

function mapStatus(s: string): 'active' | 'reviewed' | 'dismissed' {
    if (s === 'resolved' || s === 'acknowledged') return 'reviewed'
    if (s === 'dismissed') return 'dismissed'
    return 'active'
}

/**
 * Hook para obtener solo alertas activas.
 */
export function useActiveAlerts(jurisdictionId?: number): Alert[] {
    const alerts = useAlerts(jurisdictionId)
    return alerts.filter((a) => a.status === 'active')
}

/**
 * Hook para obtener contadores de alertas activas por severidad.
 */
export function useAlertCounts(jurisdictionId?: number) {
    const active = useActiveAlerts(jurisdictionId)

    return {
        total: active.length,
        info: active.filter((a) => a.severity === 'info').length,
        warning: active.filter((a) => a.severity === 'warning').length,
        critical: active.filter((a) => a.severity === 'critical').length,
    }
}
