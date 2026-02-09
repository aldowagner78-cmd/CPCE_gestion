import { Alert, AlertRule, AlertStatusType } from '@/types/database'
import { AuditService } from './auditService'

/**
 * Servicio de alertas presupuestarias en memoria.
 * Evalúa reglas contra el store de auditorías y genera alertas automáticas.
 * Patrón reactivo con useSyncExternalStore (idéntico a AuditService).
 */

let alertCounter = 0
const alertsStore: Alert[] = []

// ── Reglas predefinidas ──

const DEFAULT_RULES: AlertRule[] = [
    {
        id: 1,
        name: 'Frecuencia alta — Consultas',
        description: 'Afiliado con más de 4 consultas aprobadas en un mes',
        type: 'frequency',
        threshold: 4,
        period_months: 1,
        jurisdiction_id: 0, // 0 = ambas jurisdicciones
        severity: 'warning',
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 2,
        name: 'Monto acumulado elevado',
        description: 'Afiliado superó $500.000 en cobertura acumulada',
        type: 'amount',
        threshold: 500000,
        period_months: 3,
        jurisdiction_id: 0,
        severity: 'critical',
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 3,
        name: 'Cirugías frecuentes',
        description: 'Más de 2 cirugías aprobadas en 6 meses para un afiliado',
        type: 'frequency',
        threshold: 2,
        period_months: 6,
        jurisdiction_id: 0,
        severity: 'critical',
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 4,
        name: 'Gasto mensual por categoría',
        description: 'Categoría supera $1.000.000 en un mes',
        type: 'category',
        threshold: 1000000,
        period_months: 1,
        jurisdiction_id: 0,
        severity: 'warning',
        is_active: true,
        created_at: new Date().toISOString(),
    },
]

const rulesStore: AlertRule[] = [...DEFAULT_RULES]

// ── Listeners reactivos ──

type Listener = () => void
const listeners = new Set<Listener>()
function notifyListeners() {
    listeners.forEach((fn) => fn())
}

// ── Motor de evaluación ──

function evaluateRules() {
    const allAudits = AuditService.getAll()
    const now = new Date()

    for (const rule of rulesStore) {
        if (!rule.is_active) continue

        const cutoffDate = new Date(now)
        cutoffDate.setMonth(cutoffDate.getMonth() - rule.period_months)

        // Filter audits by period and jurisdiction
        const periodAudits = allAudits.filter((a) => {
            const matchesJurisdiction = rule.jurisdiction_id === 0 || a.jurisdiction_id === rule.jurisdiction_id
            const inPeriod = new Date(a.created_at) >= cutoffDate
            const isApproved = a.status === 'approved' || a.status === 'partial'
            return matchesJurisdiction && inPeriod && isApproved
        })

        if (rule.type === 'frequency') {
            // Group by affiliate_id, check if any exceed threshold
            const byAffiliate = new Map<number, number>()
            for (const a of periodAudits) {
                byAffiliate.set(a.affiliate_id, (byAffiliate.get(a.affiliate_id) ?? 0) + 1)
            }

            for (const [affiliateId, count] of byAffiliate) {
                if (count > rule.threshold) {
                    const alreadyExists = alertsStore.some(
                        (al) => al.rule_id === rule.id && al.affiliate_id === affiliateId && al.status === 'active'
                    )
                    if (!alreadyExists) {
                        const auditOfAffiliate = periodAudits.find((a) => a.affiliate_id === affiliateId)
                        alertCounter++
                        alertsStore.unshift({
                            id: alertCounter,
                            rule_id: rule.id,
                            rule_name: rule.name,
                            affiliate_id: affiliateId,
                            affiliate_name: auditOfAffiliate?.affiliate_name ?? `Afiliado #${affiliateId}`,
                            description: `${rule.description}. Detectado: ${count} (umbral: ${rule.threshold})`,
                            detected_value: count,
                            threshold_value: rule.threshold,
                            severity: rule.severity,
                            status: 'active',
                            jurisdiction_id: auditOfAffiliate?.jurisdiction_id ?? 0,
                            created_at: new Date().toISOString(),
                        })
                    }
                }
            }
        }

        if (rule.type === 'amount') {
            // Group by affiliate_id, sum covered_amount
            const byAffiliate = new Map<number, { total: number; name: string; jId: number }>()
            for (const a of periodAudits) {
                const prev = byAffiliate.get(a.affiliate_id) ?? { total: 0, name: a.affiliate_name, jId: a.jurisdiction_id }
                prev.total += a.covered_amount
                byAffiliate.set(a.affiliate_id, prev)
            }

            for (const [affiliateId, data] of byAffiliate) {
                if (data.total > rule.threshold) {
                    const alreadyExists = alertsStore.some(
                        (al) => al.rule_id === rule.id && al.affiliate_id === affiliateId && al.status === 'active'
                    )
                    if (!alreadyExists) {
                        alertCounter++
                        alertsStore.unshift({
                            id: alertCounter,
                            rule_id: rule.id,
                            rule_name: rule.name,
                            affiliate_id: affiliateId,
                            affiliate_name: data.name,
                            description: `${rule.description}. Acumulado: $${data.total.toLocaleString('es-AR')} (umbral: $${rule.threshold.toLocaleString('es-AR')})`,
                            detected_value: data.total,
                            threshold_value: rule.threshold,
                            severity: rule.severity,
                            status: 'active',
                            jurisdiction_id: data.jId,
                            created_at: new Date().toISOString(),
                        })
                    }
                }
            }
        }

        if (rule.type === 'category') {
            // Group by category, sum covered_amount
            const byCategory = new Map<string, { total: number; jId: number }>()
            for (const a of periodAudits) {
                const prev = byCategory.get(a.practice_category) ?? { total: 0, jId: a.jurisdiction_id }
                prev.total += a.covered_amount
                byCategory.set(a.practice_category, prev)
            }

            for (const [category, data] of byCategory) {
                if (data.total > rule.threshold) {
                    const alreadyExists = alertsStore.some(
                        (al) => al.rule_id === rule.id && al.description.includes(category) && al.status === 'active'
                    )
                    if (!alreadyExists) {
                        alertCounter++
                        alertsStore.unshift({
                            id: alertCounter,
                            rule_id: rule.id,
                            rule_name: rule.name,
                            description: `Categoría "${category}": $${data.total.toLocaleString('es-AR')} superó el umbral de $${rule.threshold.toLocaleString('es-AR')}`,
                            detected_value: data.total,
                            threshold_value: rule.threshold,
                            severity: rule.severity,
                            status: 'active',
                            jurisdiction_id: data.jId,
                            created_at: new Date().toISOString(),
                        })
                    }
                }
            }
        }
    }

    notifyListeners()
}

// ── API Pública ──

export const AlertService = {
    /**
     * Evalúa todas las reglas activas contra el store de auditorías.
     * Llamar después de crear/modificar auditorías.
     */
    evaluate() {
        evaluateRules()
    },

    /**
     * Obtiene todas las alertas, opcionalmente filtradas.
     */
    getAll(jurisdictionId?: number): Alert[] {
        if (jurisdictionId) {
            return alertsStore.filter((a) => a.jurisdiction_id === jurisdictionId || a.jurisdiction_id === 0)
        }
        return [...alertsStore]
    },

    /**
     * Obtiene alertas activas (no revisadas ni descartadas).
     */
    getActive(jurisdictionId?: number): Alert[] {
        return this.getAll(jurisdictionId).filter((a) => a.status === 'active')
    },

    /**
     * Cuenta alertas activas por severidad.
     */
    getActiveCounts(jurisdictionId?: number): { total: number; info: number; warning: number; critical: number } {
        const active = this.getActive(jurisdictionId)
        return {
            total: active.length,
            info: active.filter((a) => a.severity === 'info').length,
            warning: active.filter((a) => a.severity === 'warning').length,
            critical: active.filter((a) => a.severity === 'critical').length,
        }
    },

    /**
     * Actualiza el estado de una alerta.
     */
    updateStatus(alertId: number, newStatus: AlertStatusType): Alert | null {
        const alert = alertsStore.find((a) => a.id === alertId)
        if (!alert) return null

        alert.status = newStatus
        if (newStatus !== 'active') {
            alert.reviewed_at = new Date().toISOString()
        }

        notifyListeners()
        return alert
    },

    /**
     * Obtiene las reglas de alerta.
     */
    getRules(): AlertRule[] {
        return [...rulesStore]
    },

    /**
     * Activa/desactiva una regla.
     */
    toggleRule(ruleId: number): AlertRule | null {
        const rule = rulesStore.find((r) => r.id === ruleId)
        if (!rule) return null
        rule.is_active = !rule.is_active
        notifyListeners()
        return rule
    },

    // ── Reactive subscriptions (useSyncExternalStore) ──

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    getSnapshot(): Alert[] {
        return alertsStore
    },
}
