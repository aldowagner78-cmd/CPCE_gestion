import { Database as SupabaseDatabase } from './supabase'

export type Database = SupabaseDatabase

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
    // Campos legacy
    legacy_code?: string             // plan_codigo
    company?: string                 // plan_empresa
    level?: number                   // plan_nivel
    adjustment_type?: string         // plan_ajusta
    description?: string
    is_special?: boolean
    created_at: string
}

export type PlanRules = {
    coverage_percent: number
    waiting_period_months?: number
    category_overrides?: Record<string, number>
    authorization_required_categories?: string[]
    max_sessions_per_year?: Record<string, number>
}

/**
 * Tipo de práctica a nivel de aplicación.
 * `description` y `financial_value` son los campos que usa el motor de cobertura.
 * Se mapean desde los campos de Supabase `name` y `fixed_value` respectivamente.
 */
export type Practice = {
    id: number
    code: string
    description: string
    jurisdiction_id: number
    financial_value: number
    category: string
    // Campos legacy del nomenclador
    nomenclator_type?: string        // nome_nomenclador ('medico'|'bioquimico'|'odontologico'|'farmacia')
    calculation_method?: string      // método de cálculo
    nbu_value?: number               // unidades NBU
    valid_from?: string              // vigencia desde
    valid_to?: string                // vigencia hasta
    legacy_code?: string             // nome_viejo
    requires_prescription?: boolean
    // Medicamentos (quando nomenclator_type = 'farmacia')
    drug_name?: string               // nome_mdroga
    troquel?: string                 // nome_mtroquel
    barcode?: string                 // nome_mbarras
    presentation?: string            // nome_presentacion
    lab_name?: string                // nome_laboratorio
    is_vaccine?: boolean             // nome_mvacuna
    is_imported?: boolean            // nome_mimportado
    // Asociaciones
    default_provider_id?: number     // nome_prestador
    // Límites y reglas
    min_days_between?: number        // nome_dias
    max_per_year_plan?: Record<string, number>
    // Códigos externos
    federation_code?: string         // nome_federacion
    dss_code?: string                // Dirección Seguridad Social
    ace_included?: boolean           // ACE incluido
    created_at: string
}

export type Affiliate = {
    id: string | number
    affiliate_number?: string
    full_name: string
    document_number: string
    birth_date: string
    gender?: 'M' | 'F' | 'X'
    relationship?: string
    titular_id?: string | null
    plan_id: number
    jurisdiction_id: number
    start_date: string
    end_date?: string | null
    status?: 'activo' | 'suspendido' | 'baja'
    // Contacto
    phone?: string
    email?: string
    address?: string
    city?: string
    postal_code?: string
    province?: string
    // Identificación
    cuit?: string
    legacy_number?: string           // número en sistema viejo (afil_viejo)
    certificate_number?: string      // certificado del grupo familiar
    // Asignaciones
    category_id?: number             // categoría de afiliado
    assigned_provider_id?: number    // médico de cabecera
    // Datos adicionales
    observations?: string
    copay_debt?: number              // deuda de coseguro
    quota_coefficient?: number       // coeficiente de cuota
    agreement?: string               // convenio/empresa
    frozen_quota?: boolean           // cuota congelada
    children_count?: number
    has_life_insurance?: boolean
    special_pharmacy?: boolean
    medical_exam_done?: boolean
    special_conditions?: Record<string, unknown> | string[]
    created_at: string
    updated_at?: string
}

// ── Prestadores ──

export type Provider = {
    id: number
    legacy_id?: string
    name: string
    cuit?: string
    enrollment?: string              // matrícula profesional
    specialty?: string
    type: 'medico' | 'odontologo' | 'bioquimico' | 'clinica' | 'sanatorio' | 'laboratorio' | 'farmacia' | 'otro'
    address?: string
    city?: string
    phone?: string
    email?: string
    nomenclator_code?: string
    observations?: string
    jurisdiction_id: number
    is_active: boolean
    created_at: string
}

// ── Categorías de Afiliado ──

export type AffiliateCategory = {
    id: number
    code: string
    name: string
    coefficient: number
    age_limit?: number
    monthly_extra?: number
    notes?: string
    jurisdiction_id: number
    is_active: boolean
    created_at: string
}

// ── Enfermedades ──

export type Disease = {
    id: number
    code: string
    name: string
    level?: string
    is_chronic: boolean
    requires_authorization: boolean
    created_at: string
}

// ── Autorizaciones ──

export type Authorization = {
    id: number
    affiliate_id?: string
    family_member_relation?: string
    plan_id?: number
    provider_id?: number
    requesting_doctor_id?: number
    authorization_number?: string
    type?: string
    disease_id?: number
    is_oncology: boolean
    is_hospitalization: boolean
    status: 'pendiente' | 'aprobada' | 'rechazada' | 'anulada' | 'vencida'
    request_date?: string
    resolution_date?: string
    total_amount?: number
    balance?: number
    is_reimbursement: boolean
    is_direct: boolean
    observations?: string
    legacy_number?: string
    jurisdiction_id: number
    created_at: string
}

// ── Internaciones ──

export type Hospitalization = {
    id: number
    affiliate_id?: string
    family_member_relation?: string
    type?: string
    hospitalization_type?: string
    facility_id?: number
    room?: string
    attending_doctor_id?: number
    admission_date?: string
    discharge_date?: string
    coseguro?: number
    observations?: string
    legacy_number?: string
    authorization_id?: number
    jurisdiction_id: number
    created_at: string
}

// ── Farmacia ──

export type PharmacyRecord = {
    id: number
    affiliate_id?: string
    family_member_relation?: string
    plan_id?: number
    pharmacy_id?: number
    prescriber_id?: number
    practice_id?: number
    troquel?: string
    drug_trade_name?: string
    drug_active_name?: string
    lab_name?: string
    presentation?: string
    quantity: number
    unit_price?: number
    total?: number
    discount_percent?: number
    patient_copay?: number
    os_contribution?: number
    prescription_number?: string
    therapeutic_action?: string
    dispense_date?: string
    jurisdiction_id: number
    created_at: string
}

// ── Reintegros ──

export type Reimbursement = {
    id: number
    affiliate_id?: string
    family_member_relation?: string
    plan_id?: number
    provider_id?: number
    type?: string
    disease_id?: number
    is_hospitalization: boolean
    is_oncology: boolean
    request_date?: string
    resolution_date?: string
    status: 'pendiente' | 'aprobado' | 'rechazado' | 'pagado' | 'anulado'
    total_amount?: number
    approved_amount?: number
    balance?: number
    payment_method?: string
    cbu?: string
    observations?: string
    legacy_number?: string
    jurisdiction_id: number
    created_at: string
}

// ── Órdenes Bioquímicas ──

export type LabOrder = {
    id: number
    affiliate_id?: string
    family_member_relation?: string
    document_number?: string
    prescription_number?: string
    diagnosis?: string
    order_date?: string
    process_date?: string
    is_direct: boolean
    direct_amount?: number
    authorized_amount?: number
    status: 'pendiente' | 'autorizado' | 'rechazado' | 'anulado'
    observations?: string
    legacy_number?: string
    jurisdiction_id: number
    created_at: string
}

// ── Historia Clínica ──

export type MedicalRecord = {
    id: number
    disease_code?: string
    description?: string
    nomenclator_code?: string
    calculation_method?: string
    display_order?: number
    jurisdiction_id: number
    created_at: string
}

// ── Facturación ──

export type Invoice = {
    id: number
    provider_id?: number
    invoice_number?: string
    invoice_type?: string
    invoice_date?: string
    period_from?: string
    period_to?: string
    gross_total?: number
    deductions?: number
    net_total?: number
    payment_date?: string
    payment_method?: string
    status: 'pendiente' | 'aprobada' | 'pagada' | 'rechazada' | 'anulada'
    observations?: string
    legacy_number?: string
    jurisdiction_id: number
    created_at: string
}

// ── Detalle de Factura ──

export type InvoiceDetail = {
    id: number
    invoice_id: number
    practice_id?: number
    description?: string
    quantity: number
    unit_price?: number
    subtotal?: number
    affiliate_id?: string
    authorization_id?: number
}

// ── Detalle de Autorización ──

export type AuthorizationDetail = {
    id: number
    authorization_id: number
    practice_id?: number
    description?: string
    quantity: number
    unit_price?: number
    subtotal?: number
    authorized_amount?: number
    status: 'pendiente' | 'aprobado' | 'rechazado'
}

export type UserProfile = {
    id: string
    full_name?: string
    role: 'admin' | 'auditor' | 'affiliate' | 'supervisor' | 'superuser' | 'administrativo' | 'gerencia'
    jurisdiction_id?: number
    is_superuser?: boolean
    created_at: string
}

// ── Roles y Permisos ──

export type Role = {
    id: number
    name: string
    display_name: string
    description?: string
    is_system: boolean
    created_at: string
}

export type DbPermission = {
    id: number
    module: string
    action: string
    description?: string
}

export type UserRoleAssignment = {
    id: number
    user_id: string
    role_id: number
    assigned_by?: string
    assigned_at: string
    role?: Role              // joined
}

// ── Recaudación ──

export type PlanRevenue = {
    id: number
    plan_id: number
    period: string           // YYYY-MM-DD (primer día del mes)
    amount: number
    affiliate_count?: number
    jurisdiction_id: number
    notes?: string
    created_by?: string
    created_at: string
    plan_name?: string       // joined
}

// ── Anuncios ──

export type Announcement = {
    id: string
    title: string
    body?: string
    priority: 'low' | 'normal' | 'high' | 'urgent'
    is_active: boolean
    target_roles: string[]
    jurisdiction_id?: number
    author_id?: string
    expires_at?: string
    created_at: string
}

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'partial' | 'requires_auth'

export type AuditRecord = {
    id: string | number
    // Referencias
    affiliate_id: string | number
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
    // Campos legacy
    provider_id?: number
    authorization_id?: number
    disease_id?: number
    family_member_relation?: string
    // Trazabilidad
    auditor_name: string
    notes: string
    authorization_code?: string
    // Timestamps
    created_at: string
    reviewed_at?: string
}

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
    id: number | string
    rule_id: number
    rule_name: string
    affiliate_id?: number | string
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
