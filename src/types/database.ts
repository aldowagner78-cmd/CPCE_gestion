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

// ── IA Suggestions (Etapa 1) ──

export type IASuggestion = {
    type: 'priority' | 'coherence' | 'duplicate'
    severity: 'info' | 'warning' | 'critical'
    message: string
    data?: Record<string, unknown>
}

// ── Solicitudes de Auditoría ──

export type AuditRequestType = 'ambulatoria' | 'bioquimica' | 'internacion'
export type AuditRequestStatus = 'pendiente' | 'en_revision' | 'autorizada' | 'denegada' | 'observada' | 'anulada' | 'vencida'
export type AuditRequestPriority = 'normal' | 'urgente'

export type AuditRequest = {
    id: string
    request_number: string
    type: AuditRequestType
    priority: AuditRequestPriority

    // Afiliado
    affiliate_id: string
    affiliate_plan_id?: number
    family_member_relation?: string

    // Práctica
    practice_id: number
    practice_quantity: number

    // Prestador
    provider_id?: number
    requesting_doctor_id?: number

    // Diagnóstico (cargado por auditor)
    disease_id?: number
    diagnosis_code?: string
    diagnosis_description?: string

    // Cobertura calculada
    coverage_percent?: number
    covered_amount?: number
    copay_amount?: number
    practice_value?: number

    // Estado
    status: AuditRequestStatus

    // Autorización
    authorization_id?: number
    authorization_code?: string
    authorization_expiry?: string

    // Internación
    hospitalization_id?: number
    estimated_days?: number

    // Notas
    request_notes?: string
    resolution_notes?: string

    // ── IA y SLA (Etapa 1) ──
    clinical_priority_score?: number      // 0-100; >= 30 = Estrella
    ia_suggestions?: IASuggestion[]       // sugerencias JSON del motor IA
    sla_status?: 'verde' | 'amarillo' | 'rojo'
    sla_hours_elapsed?: number
    last_activity_at?: string
    duplicate_warning?: boolean
    duplicate_ids?: string[]

    // Trazabilidad
    created_by: string
    resolved_by?: string
    resolved_at?: string
    jurisdiction_id: number
    created_at: string
    updated_at: string

    // Relaciones expandidas (joins)
    affiliate?: Affiliate
    practice?: Practice
    plan?: Plan
    provider?: Provider
    requesting_doctor?: Provider
    disease?: Disease
    creator?: { full_name: string; role: string }
    resolver?: { full_name: string; role: string }
}

export type AuditRequestNote = {
    id: string
    request_id: string
    author_id: string
    content: string
    note_type: 'interna' | 'para_afiliado' | 'sistema' | 'resolucion'
    status_from?: string
    status_to?: string
    created_at: string
    author?: { full_name: string; role: string }
}

export type AuditRequestAttachment = {
    id: string
    request_id: string
    file_name: string
    file_type?: string
    file_size?: number
    storage_path: string
    document_type: 'orden_medica' | 'receta' | 'estudio' | 'informe' | 'consentimiento' | 'factura' | 'otro'
    uploaded_by: string
    created_at: string
    uploader?: { full_name: string }
}

export type AuditRequestLog = {
    id: number
    request_id: string
    action: string
    details: Record<string, unknown>
    performed_by: string
    performed_at: string
    performer?: { full_name: string }
}

// ── Expedientes Digitales (Circuito C+B) ──

export type ExpedientType =
    | 'ambulatoria'
    | 'bioquimica'
    | 'internacion'
    | 'odontologica'
    | 'programas_especiales'
    | 'elementos'
    | 'reintegros'

export type ExpedientStatus =
    | 'borrador'
    | 'pendiente'
    | 'en_revision'
    | 'parcialmente_resuelto'
    | 'resuelto'
    | 'observada'
    | 'en_apelacion'
    | 'anulada'

export type PracticeResolutionStatus =
    | 'pendiente'
    | 'en_revision'
    | 'autorizada'
    | 'denegada'
    | 'observada'
    | 'autorizada_parcial'
    | 'diferida'

export type RulesResult = 'verde' | 'amarillo' | 'rojo'

export type ExpedientPriority = 'normal' | 'urgente'

export type ExpedientDocumentType =
    | 'orden_medica'
    | 'receta'
    | 'estudio'
    | 'informe'
    | 'consentimiento'
    | 'factura'
    | 'historia_clinica'
    | 'otro'

export type ExpedientNoteType = 'interna' | 'para_afiliado' | 'sistema' | 'resolucion'

export type Expedient = {
    id: string
    expedient_number: string
    type: ExpedientType
    priority: ExpedientPriority

    // Afiliado
    affiliate_id: string
    affiliate_plan_id?: number
    family_member_relation?: string

    // Prestador
    provider_id?: number
    requesting_doctor_id?: number

    // Estado
    status: ExpedientStatus

    // Internación
    hospitalization_id?: number
    estimated_days?: number

    // Notas
    request_notes?: string
    resolution_notes?: string

    // Mesa de control
    requires_control_desk: boolean
    control_desk_status?: 'pendiente' | 'aprobado' | 'rechazado'
    control_desk_by?: string
    control_desk_at?: string

    // Motor de reglas
    rules_result?: RulesResult

    // ── IA y SLA (Etapa 1) ──
    clinical_priority_score?: number      // 0-100; >= 30 = Estrella
    ia_suggestions?: IASuggestion[]       // sugerencias JSONB del motor IA
    sla_status?: 'verde' | 'amarillo' | 'rojo'
    sla_hours_elapsed?: number
    last_activity_at?: string
    duplicate_warning?: boolean
    duplicate_ids?: string[]
    ocr_text?: string                     // texto extraído de la orden manuscrita

    // Trazabilidad
    created_by: string
    assigned_to?: string
    resolved_by?: string
    resolved_at?: string
    jurisdiction_id: number

    // Timestamps
    created_at: string
    updated_at: string

    // Relaciones expandidas (joins)
    affiliate?: Affiliate
    plan?: Plan
    provider?: Provider
    requesting_doctor?: Provider
    practices?: ExpedientPractice[]
    creator?: { full_name: string; role: string }
    assignee?: { full_name: string; role: string }
    resolver?: { full_name: string; role: string }
}

export type ExpedientPractice = {
    id: string
    expedient_id: string

    // Práctica
    practice_id: number
    quantity: number
    practice_value?: number

    // Resolución
    status: PracticeResolutionStatus

    // Autorización
    authorization_id?: number
    authorization_code?: string
    authorization_expiry?: string

    // Cobertura
    coverage_percent?: number
    covered_amount?: number
    copay_amount?: number
    copay_percent?: number

    // Diagnóstico
    disease_id?: number
    diagnosis_code?: string
    diagnosis_description?: string

    // Resolución
    resolution_notes?: string
    resolved_by?: string
    resolved_at?: string

    // Diferida
    review_date?: string

    // Motor de reglas
    rule_result?: RulesResult
    rule_messages?: string[]

    // Orden
    sort_order: number

    // Timestamps
    created_at: string
    updated_at: string

    // Relaciones expandidas (joins)
    practice?: Practice
    disease?: Disease
    resolver?: { full_name: string; role: string }
}

export type ExpedientNote = {
    id: string
    expedient_id: string
    author_id: string
    content: string
    note_type: ExpedientNoteType
    status_from?: string
    status_to?: string
    practice_id?: string
    created_at: string
    author?: { full_name: string; role: string }
}

export type ExpedientAttachment = {
    id: string
    expedient_id: string
    file_name: string
    file_type?: string
    file_size?: number
    storage_path: string
    document_type: ExpedientDocumentType
    uploaded_by: string
    created_at: string
    uploader?: { full_name: string }
}

export type ExpedientLog = {
    id: number
    expedient_id: string
    action: string
    details: Record<string, unknown>
    practice_id?: string
    performed_by: string
    performed_at: string
    performer?: { full_name: string }
}

// ── Reglas de Auditoría Configurables ──

export type AuditRuleType =
    | 'auto_approve'
    | 'frequency_limit'
    | 'amount_limit'
    | 'requires_authorization'
    | 'copay_override'
    | 'control_desk'

export type AuditRuleConfig = {
    id: number
    jurisdiction_id: number
    rule_type: AuditRuleType
    practice_type_id?: number
    practice_id?: number

    // Parámetros
    auto_approve: boolean
    max_amount_auto?: number
    max_per_month?: number
    max_per_year?: number
    min_days_between?: number
    copay_percent?: number
    requires_control_desk: boolean

    // Vigencia
    valid_from: string
    valid_to?: string
    is_active: boolean

    // Metadata
    description?: string
    created_by?: string
    created_at: string
    updated_at: string
}

// ── Auditoría Posterior (Facturación) ──

export type PostAuditStatus =
    | 'pendiente'
    | 'en_revision'
    | 'aprobada'
    | 'con_debitos'
    | 'en_disputa'
    | 'cerrada'

export type PostAuditCheckResult = 'ok' | 'warning' | 'error'

export type PostAuditItemMatchStatus =
    | 'pendiente'
    | 'ok'
    | 'cantidad_excedida'
    | 'precio_excedido'
    | 'sin_autorizacion'
    | 'autorizacion_vencida'
    | 'duplicada'
    | 'aprobado_manual'
    | 'debitado'

export type PostAuditItemAction = 'aprobar' | 'debitar' | 'rechazar' | 'ajustar'

export type DebitNoteStatus =
    | 'borrador'
    | 'emitida'
    | 'aceptada'
    | 'disputada'
    | 'resuelta'
    | 'anulada'

export type DebitType =
    | 'precio_excedido'
    | 'cantidad_excedida'
    | 'sin_autorizacion'
    | 'autorizacion_vencida'
    | 'duplicada'
    | 'otro'

export type PostAuditIssue = {
    type: string
    message: string
    severity: 'info' | 'warning' | 'error'
}

export type PostAudit = {
    id: string
    audit_number?: string
    invoice_id: number
    provider_id?: number
    period_month?: number
    period_year?: number
    status: PostAuditStatus
    invoiced_total: number
    authorized_total: number
    difference: number
    debit_total: number
    approved_total: number
    auto_check_result?: PostAuditCheckResult
    auto_check_messages: PostAuditIssue[]
    auto_check_at?: string
    resolution_notes?: string
    resolved_by?: string
    resolved_at?: string
    assigned_to?: string
    created_by: string
    jurisdiction_id: number
    created_at: string
    updated_at: string

    // Joins
    items?: PostAuditItem[]
    invoice?: Invoice
    provider?: { id: number; name: string; cuit?: string; type?: string }
    assigned_user?: { full_name?: string }
    resolved_user?: { full_name?: string }
}

export type PostAuditItem = {
    id: string
    post_audit_id: string
    invoice_detail_id?: number
    authorization_id?: number
    authorization_detail_id?: number
    expedient_practice_id?: string
    practice_id?: number
    practice_description?: string
    affiliate_id?: string
    invoiced_quantity: number
    invoiced_unit_price?: number
    invoiced_total?: number
    authorized_quantity?: number
    authorized_unit_price?: number
    authorized_total?: number
    authorized_coverage_percent?: number
    match_status: PostAuditItemMatchStatus
    issues: PostAuditIssue[]
    debit_amount: number
    debit_reason?: string
    auditor_action?: PostAuditItemAction
    auditor_notes?: string
    resolved_by?: string
    resolved_at?: string
    sort_order: number
    created_at: string
    updated_at: string

    // Joins
    practice?: { id: number; code?: string; description?: string }
    affiliate?: { id: string; name?: string; affiliate_number?: string }
    authorization?: { authorization_number?: string; status?: string; request_date?: string }
}

export type DebitNote = {
    id: string
    debit_number?: string
    post_audit_id: string
    invoice_id: number
    provider_id?: number
    total_amount: number
    detail_count: number
    status: DebitNoteStatus
    reason?: string
    dispute_reason?: string
    dispute_date?: string
    dispute_resolution?: string
    dispute_resolved_by?: string
    dispute_resolved_at?: string
    created_by: string
    emitted_by?: string
    emitted_at?: string
    jurisdiction_id: number
    created_at: string
    updated_at: string

    // Joins
    items?: DebitNoteItem[]
    provider?: { id: number; name: string; cuit?: string }
    post_audit?: PostAudit
}

export type DebitNoteItem = {
    id: string
    debit_note_id: string
    post_audit_item_id?: string
    practice_id?: number
    practice_description?: string
    invoiced_amount?: number
    authorized_amount?: number
    debit_amount: number
    reason?: string
    debit_type?: DebitType
    sort_order: number
    created_at: string
}

export type PostAuditLog = {
    id: string
    post_audit_id: string
    action: string
    details: Record<string, unknown>
    performed_by: string
    created_at: string

    // Join
    user?: { full_name?: string }
}
