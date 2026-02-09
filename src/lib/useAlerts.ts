import { useSyncExternalStore } from 'react'
import { AlertService } from '@/services/alertService'
import { Alert } from '@/types/database'

/**
 * Hook reactivo para consumir alertas del store.
 */
export function useAlerts(jurisdictionId?: number): Alert[] {
    const allAlerts = useSyncExternalStore(
        AlertService.subscribe,
        AlertService.getSnapshot,
        AlertService.getSnapshot
    )

    if (jurisdictionId) {
        return allAlerts.filter((a) => a.jurisdiction_id === jurisdictionId || a.jurisdiction_id === 0)
    }
    return allAlerts
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
