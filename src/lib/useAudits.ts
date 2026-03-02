import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { AuditService } from '@/services/auditService'
import { AuditRecord } from '@/types/database'

/**
 * Hook reactivo para consumir auditorías desde Supabase.
 * Carga datos al montar y se actualiza con el store reactivo.
 */
export function useAudits(jurisdictionId?: number): AuditRecord[] {
    const [loaded, setLoaded] = useState(false)

    // Trigger initial fetch from Supabase
    useEffect(() => {
        AuditService.fetchAll(jurisdictionId).then(() => setLoaded(true))
    }, [jurisdictionId])

    // React to cache changes
    const allAudits = useSyncExternalStore(
        AuditService.subscribe,
        AuditService.getSnapshot,
        AuditService.getSnapshot
    )

    if (jurisdictionId) {
        return allAudits.filter((a) => a.jurisdiction_id === jurisdictionId)
    }
    return allAudits
}

/**
 * Hook para obtener contadores de estado reactivos.
 */
export function useAuditCounts(jurisdictionId?: number) {
    const audits = useAudits(jurisdictionId)

    return {
        pending: audits.filter((a) => a.status === 'pending').length,
        approved: audits.filter((a) => a.status === 'approved').length,
        rejected: audits.filter((a) => a.status === 'rejected').length,
        partial: audits.filter((a) => a.status === 'partial').length,
        requires_auth: audits.filter((a) => a.status === 'requires_auth').length,
        total: audits.length,
    }
}
