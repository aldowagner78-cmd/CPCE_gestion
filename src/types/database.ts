
export type Jurisdiction = {
    id: number
    name: string
    theme_config: Record<string, any>
    created_at: string
}

export type Plan = {
    id: number
    name: string
    jurisdiction_id: number
    rules: PlanRules
    created_at: string
}

export type PlanRules = {
    coverage_percent: number
    waiting_period_months?: number
    category_overrides?: Record<string, number>
    authorization_required_categories?: string[]
    max_sessions_per_year?: Record<string, number>
}

export type Practice = {
    id: number
    code: string
    description: string
    jurisdiction_id: number
    financial_value: number
    category: string
    created_at: string
}

export type Affiliate = {
    id: number
    full_name: string
    document_number: string
    birth_date: string
    plan_id: number
    jurisdiction_id: number
    start_date: string
    status?: 'activo' | 'suspendido' | 'baja'
    created_at: string
}

export type UserProfile = {
    id: string
    full_name?: string
    role: 'admin' | 'auditor' | 'affiliate'
    jurisdiction_id?: number
    created_at: string
}

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'partial' | 'requires_auth'

export type AuditRecord = {
    id: number
    // Referencias
    affiliate_id: number
    affiliate_name: string
    affiliate_document: string
    practice_id: number
    practice_code: string
    practice_description: string
    practice_category: string
    practice_value: number
    plan_id: number
    plan_name: string
    jurisdiction_id: number
    // Resultado del motor
    coverage_percent: number
    covered_amount: number
    copay: number
    authorization_required: boolean
    messages: string[]
    // Estado del flujo
    status: AuditStatus
    // Trazabilidad
    auditor_name: string
    notes: string
    authorization_code?: string
    // Timestamps
    created_at: string
    reviewed_at?: string
}

export type Database = any

// ── Alertas de Desvíos Presupuestarios ──

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertRuleType = 'frequency' | 'amount' | 'provider' | 'category'
export type AlertStatusType = 'active' | 'reviewed' | 'dismissed'

export type AlertRule = {
    id: number
    name: string
    description: string
    type: AlertRuleType
    threshold: number
    period_months: number
    jurisdiction_id: number
    severity: AlertSeverity
    is_active: boolean
    created_at: string
}

export type Alert = {
    id: number
    rule_id: number
    rule_name: string
    affiliate_id?: number
    affiliate_name?: string
    description: string
    detected_value: number
    threshold_value: number
    severity: AlertSeverity
    status: AlertStatusType
    jurisdiction_id: number
    created_at: string
    reviewed_at?: string
}
