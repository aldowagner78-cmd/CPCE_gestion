import { useSyncExternalStore, useCallback } from 'react'
import { AuditService } from '@/services/auditService'
import { AuditRecord } from '@/types/database'

/**
 * Hook reactivo para consumir el store de auditorías.
 * Se actualiza automáticamente cuando se crean o modifican auditorías.
 */
export function useAudits(jurisdictionId?: number): AuditRecord[] {
    const allAudits = useSyncExternalStore(
        AuditService.subscribe,
        AuditService.getSnapshot,
        AuditService.getSnapshot // Server snapshot (SSR)
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
