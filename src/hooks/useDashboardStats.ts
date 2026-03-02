'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface DashboardStats {
    // Afiliados
    totalAffiliates: number
    activeAffiliates: number
    suspendedAffiliates: number
    droppedAffiliates: number
    // Auditorías
    totalAudits: number
    pendingAudits: number
    approvedAudits: number
    rejectedAudits: number
    partialAudits: number
    requiresAuthAudits: number
    approvalRate: number          // % aprobadas sobre resueltas
    // Alertas
    activeAlerts: number
    criticalAlerts: number
    // Agenda
    upcomingEvents: number
    // Recaudación / Siniestralidad
    totalRevenue: number
    totalExpense: number
    siniestralidad: number        // ratio gasto/ingreso × 100
    // Meta
    loading: boolean
    error: string | null
}

const INITIAL: DashboardStats = {
    totalAffiliates: 0, activeAffiliates: 0, suspendedAffiliates: 0, droppedAffiliates: 0,
    totalAudits: 0, pendingAudits: 0, approvedAudits: 0, rejectedAudits: 0,
    partialAudits: 0, requiresAuthAudits: 0, approvalRate: 0,
    activeAlerts: 0, criticalAlerts: 0,
    upcomingEvents: 0,
    totalRevenue: 0, totalExpense: 0, siniestralidad: 0,
    loading: true, error: null,
}

/**
 * Hook que carga todas las estadísticas del dashboard desde Supabase.
 * Todas las queries se ejecutan en paralelo.
 */
export function useDashboardStats(jurisdictionId?: number): DashboardStats {
    const [stats, setStats] = useState<DashboardStats>(INITIAL)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                // Construir queries con filtro de jurisdicción opcional
                const jFilter = jurisdictionId ? { column: 'jurisdiction_id', value: jurisdictionId } : null

                // ─── Afiliados ───
                const affiliatesQuery = supabase.from('affiliates').select('status', { count: 'exact', head: false })
                if (jFilter) affiliatesQuery.eq(jFilter.column, jFilter.value)

                // ─── Auditorías ───
                const auditsQuery = supabase.from('audits').select('status, coverage_result', { count: 'exact', head: false })
                if (jFilter) auditsQuery.eq(jFilter.column, jFilter.value)

                // ─── Alertas ───
                const alertsQuery = supabase.from('alerts').select('severity, status')
                    .in('status', ['active', 'acknowledged'])
                if (jFilter) alertsQuery.eq(jFilter.column, jFilter.value)

                // ─── Eventos próximos ───
                const now = new Date().toISOString()
                const eventsQuery = supabase.from('events').select('id', { count: 'exact', head: true })
                    .gte('start_datetime', now)
                    .in('status', ['pendiente', 'confirmado'])
                if (jFilter) eventsQuery.eq(jFilter.column, jFilter.value)

                // ─── Recaudación (últimos 12 meses) ───
                const twelveMonthsAgo = new Date()
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
                const revenueQuery = supabase.from('plan_revenue').select('amount')
                    .gte('period', twelveMonthsAgo.toISOString().slice(0, 10))
                if (jFilter) revenueQuery.eq(jFilter.column, jFilter.value)

                // Ejecutar todas en paralelo
                const [affiliatesRes, auditsRes, alertsRes, eventsRes, revenueRes] = await Promise.all([
                    affiliatesQuery,
                    auditsQuery,
                    alertsQuery,
                    eventsQuery,
                    revenueQuery,
                ])

                if (cancelled) return

                // ─── Procesar afiliados ───
                const affiliates = affiliatesRes.data || []
                const activeAffiliates = affiliates.filter((a: { status: string }) => a.status === 'activo').length
                const suspendedAffiliates = affiliates.filter((a: { status: string }) => a.status === 'suspendido').length
                const droppedAffiliates = affiliates.filter((a: { status: string }) => a.status === 'baja').length

                // ─── Procesar auditorías ───
                const audits = auditsRes.data || []
                const pendingAudits = audits.filter((a: { status: string }) => a.status === 'pending').length
                const approvedAudits = audits.filter((a: { status: string }) => a.status === 'approved').length
                const rejectedAudits = audits.filter((a: { status: string }) => a.status === 'rejected').length
                const partialAudits = audits.filter((a: { status: string }) => a.status === 'partial').length
                const requiresAuthAudits = audits.filter((a: { status: string }) => a.status === 'requires_auth').length
                const resolved = approvedAudits + rejectedAudits
                const approvalRate = resolved > 0 ? Math.round((approvedAudits / resolved) * 100) : 0

                // ─── Calcular gasto total (suma de covered_amount en auditorías aprobadas) ───
                let totalExpense = 0
                audits
                    .filter((a: { status: string }) => a.status === 'approved')
                    .forEach((a: { coverage_result: Record<string, unknown> | null }) => {
                        const cr = a.coverage_result
                        if (cr && typeof cr === 'object' && 'covered_amount' in cr) {
                            totalExpense += Number((cr as { covered_amount: number }).covered_amount) || 0
                        }
                    })

                // ─── Procesar alertas ───
                const alerts = alertsRes.data || []
                const criticalAlerts = alerts.filter((a: { severity: string }) => a.severity === 'critical').length

                // ─── Procesar recaudación ───
                const revenues = revenueRes.data || []
                const totalRevenue = revenues.reduce((sum: number, r: { amount: number }) => sum + Number(r.amount), 0)
                const siniestralidad = totalRevenue > 0 ? Math.round((totalExpense / totalRevenue) * 100) : 0

                setStats({
                    totalAffiliates: affiliates.length,
                    activeAffiliates,
                    suspendedAffiliates,
                    droppedAffiliates,
                    totalAudits: audits.length,
                    pendingAudits,
                    approvedAudits,
                    rejectedAudits,
                    partialAudits,
                    requiresAuthAudits,
                    approvalRate,
                    activeAlerts: alerts.length,
                    criticalAlerts,
                    upcomingEvents: eventsRes.count || 0,
                    totalRevenue,
                    totalExpense,
                    siniestralidad,
                    loading: false,
                    error: null,
                })
            } catch (err) {
                if (!cancelled) {
                    console.error('Dashboard stats error:', err)
                    setStats((prev) => ({ ...prev, loading: false, error: 'Error cargando estadísticas' }))
                }
            }
        }

        load()
        return () => { cancelled = true }
    }, [jurisdictionId])

    return stats
}
