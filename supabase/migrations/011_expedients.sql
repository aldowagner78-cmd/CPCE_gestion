-- =====================================================
-- MIGRACIÓN 011: EXPEDIENTES DIGITALES (CIRCUITO C+B)
-- Modelo de Expediente con prácticas individuales
-- + Tabla de reglas configurables por jurisdicción
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. TIPOS ENUMERADOS
-- ─────────────────────────────────────────────────────

-- Tipo de expediente (ampliado respecto a audit_requests)
-- Se usa VARCHAR con CHECK para compatibilidad con Supabase
-- Valores: ambulatoria, bioquimica, internacion, odontologica,
--          programas_especiales, elementos, reintegros

-- Estado del expediente (cabecera)
-- borrador → pendiente → en_revision → parcialmente_resuelto → resuelto
--                                    → observada → (reenvío) → en_revision
--                                    → en_apelacion → resuelto
--                                    → anulada

-- Estado de resolución por práctica individual
-- pendiente → en_revision → autorizada / denegada / observada / autorizada_parcial / diferida

-- ─────────────────────────────────────────────────────
-- 2. TABLA PRINCIPAL: expedients (cabecera del expediente)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Clasificación
    expedient_number VARCHAR(25) UNIQUE,
    type VARCHAR(25) NOT NULL CHECK (type IN (
        'ambulatoria', 'bioquimica', 'internacion',
        'odontologica', 'programas_especiales', 'elementos', 'reintegros'
    )),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgente')),

    -- Afiliado y contexto al momento de la carga
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE RESTRICT,
    affiliate_plan_id INT REFERENCES plans(id),
    family_member_relation VARCHAR(30),

    -- Prestador / Médico solicitante (opcionales al crear)
    provider_id INT REFERENCES providers(id),
    requesting_doctor_id INT REFERENCES providers(id),

    -- Estado del flujo
    status VARCHAR(25) DEFAULT 'borrador' NOT NULL CHECK (status IN (
        'borrador', 'pendiente', 'en_revision',
        'parcialmente_resuelto', 'resuelto',
        'observada', 'en_apelacion', 'anulada'
    )),

    -- Internación (solo cuando type = 'internacion')
    hospitalization_id INT REFERENCES hospitalizations(id),
    estimated_days INT,

    -- Notas de carga
    request_notes TEXT,
    resolution_notes TEXT,

    -- Mesa de control (para casos complejos)
    requires_control_desk BOOLEAN DEFAULT FALSE,
    control_desk_status VARCHAR(15) CHECK (control_desk_status IN (
        'pendiente', 'aprobado', 'rechazado'
    )),
    control_desk_by UUID REFERENCES users(id),
    control_desk_at TIMESTAMPTZ,

    -- Motor de reglas: resultado general precalculado
    -- verde = todas auto-aprobables, amarillo = mixtas, rojo = requiere auditor
    rules_result VARCHAR(10) CHECK (rules_result IN ('verde', 'amarillo', 'rojo')),

    -- Trazabilidad
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_exp_status ON expedients(status);
CREATE INDEX IF NOT EXISTS idx_exp_type ON expedients(type);
CREATE INDEX IF NOT EXISTS idx_exp_affiliate ON expedients(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_exp_created ON expedients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exp_jurisdiction ON expedients(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_exp_number ON expedients(expedient_number);
CREATE INDEX IF NOT EXISTS idx_exp_type_status ON expedients(type, status);
CREATE INDEX IF NOT EXISTS idx_exp_assigned ON expedients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_exp_priority_status ON expedients(priority, status, created_at);

-- ─────────────────────────────────────────────────────
-- 3. TABLA: expedient_practices (prácticas del expediente)
--    Cada práctica tiene su propio estado de resolución
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedient_practices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expedient_id UUID NOT NULL REFERENCES expedients(id) ON DELETE CASCADE,

    -- Práctica
    practice_id BIGINT NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
    quantity INT DEFAULT 1,
    practice_value DECIMAL(12,2),

    -- Resolución individual
    status VARCHAR(25) DEFAULT 'pendiente' NOT NULL CHECK (status IN (
        'pendiente', 'en_revision', 'autorizada', 'denegada',
        'observada', 'autorizada_parcial', 'diferida'
    )),

    -- Autorización (se vincula al aprobar)
    authorization_id INT REFERENCES authorizations(id),
    authorization_code VARCHAR(50),
    authorization_expiry DATE,

    -- Cobertura
    coverage_percent DECIMAL(5,2),
    covered_amount DECIMAL(12,2),
    copay_amount DECIMAL(12,2),
    copay_percent DECIMAL(5,2),

    -- Diagnóstico (cargado por el auditor al resolver)
    disease_id INT REFERENCES diseases(id),
    diagnosis_code VARCHAR(20),
    diagnosis_description TEXT,

    -- Resolución
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,

    -- Diferida: fecha en la que se debe revisar
    review_date DATE,

    -- Motor de reglas: resultado individual
    rule_result VARCHAR(10) CHECK (rule_result IN ('verde', 'amarillo', 'rojo')),
    rule_messages JSONB DEFAULT '[]'::jsonb,

    -- Orden de la práctica dentro del expediente
    sort_order INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ep_expedient ON expedient_practices(expedient_id);
CREATE INDEX IF NOT EXISTS idx_ep_practice ON expedient_practices(practice_id);
CREATE INDEX IF NOT EXISTS idx_ep_status ON expedient_practices(status);
CREATE INDEX IF NOT EXISTS idx_ep_auth_code ON expedient_practices(authorization_code);

-- ─────────────────────────────────────────────────────
-- 4. TABLA: expedient_notes (historial de comunicaciones)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedient_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expedient_id UUID NOT NULL REFERENCES expedients(id) ON DELETE CASCADE,

    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,

    note_type VARCHAR(20) DEFAULT 'interna'
        CHECK (note_type IN ('interna', 'para_afiliado', 'sistema', 'resolucion')),

    -- Si es un cambio de estado
    status_from VARCHAR(25),
    status_to VARCHAR(25),

    -- Referencia opcional a práctica específica
    practice_id UUID REFERENCES expedient_practices(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_en_expedient ON expedient_notes(expedient_id, created_at);

-- ─────────────────────────────────────────────────────
-- 5. TABLA: expedient_attachments (documentos adjuntos)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedient_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expedient_id UUID NOT NULL REFERENCES expedients(id) ON DELETE CASCADE,

    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    storage_path TEXT NOT NULL,

    document_type VARCHAR(30) DEFAULT 'otro'
        CHECK (document_type IN (
            'orden_medica', 'receta', 'estudio', 'informe',
            'consentimiento', 'factura', 'historia_clinica', 'otro'
        )),

    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ea_expedient ON expedient_attachments(expedient_id);

-- ─────────────────────────────────────────────────────
-- 6. TABLA: expedient_log (trazabilidad completa)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedient_log (
    id BIGSERIAL PRIMARY KEY,
    expedient_id UUID NOT NULL REFERENCES expedients(id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,

    -- Referencia opcional a práctica específica
    practice_id UUID REFERENCES expedient_practices(id) ON DELETE SET NULL,

    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_el_expedient ON expedient_log(expedient_id, performed_at);

-- ─────────────────────────────────────────────────────
-- 7. TABLA: audit_rules_config (reglas configurables)
--    Motor de reglas por jurisdicción
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_rules_config (
    id SERIAL PRIMARY KEY,

    jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,

    -- Tipo de regla
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN (
        'auto_approve',           -- Auto-aprobación automática
        'frequency_limit',        -- Límite de frecuencia
        'amount_limit',           -- Tope de monto
        'requires_authorization', -- Fuerza autorización manual
        'copay_override',         -- Sobreescribe coseguro del plan
        'control_desk'            -- Fuerza mesa de control
    )),

    -- Aplicabilidad (NULL = aplica a todas)
    practice_type_id INT REFERENCES practice_types(id),
    practice_id BIGINT REFERENCES practices(id),

    -- Parámetros de la regla
    auto_approve BOOLEAN DEFAULT FALSE,
    max_amount_auto DECIMAL(12,2),
    max_per_month INT,
    max_per_year INT,
    min_days_between INT,
    copay_percent DECIMAL(5,2),
    requires_control_desk BOOLEAN DEFAULT FALSE,

    -- Vigencia
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Evitar reglas duplicadas exactas
    UNIQUE (jurisdiction_id, rule_type, practice_type_id, practice_id)
);

CREATE INDEX IF NOT EXISTS idx_arc_jurisdiction ON audit_rules_config(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_arc_active ON audit_rules_config(is_active, jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_arc_practice ON audit_rules_config(practice_id);

-- ─────────────────────────────────────────────────────
-- 8. FUNCIÓN: Generar número de expediente correlativo
--    Formato: EXP-2026-00001
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_expedient_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_seq INT;
BEGIN
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;

    -- Obtener siguiente número correlativo del año
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(expedient_number, '-', 3) AS INT)
    ), 0) + 1
    INTO v_seq
    FROM expedients
    WHERE expedient_number LIKE 'EXP-' || v_year || '-%';

    NEW.expedient_number := 'EXP-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_expedient_number
    BEFORE INSERT ON expedients
    FOR EACH ROW
    WHEN (NEW.expedient_number IS NULL)
    EXECUTE FUNCTION generate_expedient_number();

-- ─────────────────────────────────────────────────────
-- 9. FUNCIÓN: Auto-actualizar updated_at
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_expedient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_exp_updated
    BEFORE UPDATE ON expedients
    FOR EACH ROW
    EXECUTE FUNCTION update_expedient_timestamp();

CREATE OR REPLACE TRIGGER trg_ep_updated
    BEFORE UPDATE ON expedient_practices
    FOR EACH ROW
    EXECUTE FUNCTION update_expedient_timestamp();

CREATE OR REPLACE TRIGGER trg_arc_updated
    BEFORE UPDATE ON audit_rules_config
    FOR EACH ROW
    EXECUTE FUNCTION update_expedient_timestamp();

-- ─────────────────────────────────────────────────────
-- 10. AUTO-CÁLCULO: Actualizar estado del expediente
--     cuando cambian las prácticas individuales
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_expedient_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total INT;
    v_resolved INT;
    v_expedient_status VARCHAR(25);
BEGIN
    -- Contar prácticas del expediente
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status IN ('autorizada', 'denegada', 'autorizada_parcial'))
    INTO v_total, v_resolved
    FROM expedient_practices
    WHERE expedient_id = NEW.expedient_id;

    -- Determinar estado del expediente
    IF v_resolved = v_total AND v_total > 0 THEN
        v_expedient_status := 'resuelto';
    ELSIF v_resolved > 0 THEN
        v_expedient_status := 'parcialmente_resuelto';
    ELSE
        -- No cambiar si no hay resoluciones
        RETURN NEW;
    END IF;

    -- Solo actualizar si estaba en revisión o parcialmente resuelto
    UPDATE expedients
    SET status = v_expedient_status,
        resolved_at = CASE WHEN v_expedient_status = 'resuelto' THEN NOW() ELSE resolved_at END
    WHERE id = NEW.expedient_id
      AND status IN ('en_revision', 'parcialmente_resuelto');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_expedient_status
    AFTER UPDATE OF status ON expedient_practices
    FOR EACH ROW
    EXECUTE FUNCTION sync_expedient_status();

-- ─────────────────────────────────────────────────────
-- 11. Habilitar realtime
-- ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE expedients;
ALTER PUBLICATION supabase_realtime ADD TABLE expedient_notes;

-- ─────────────────────────────────────────────────────
-- 12. Reglas de ejemplo para desarrollo
-- ─────────────────────────────────────────────────────
-- (Se ejecutan solo si la tabla está vacía)
INSERT INTO audit_rules_config (jurisdiction_id, rule_type, auto_approve, max_amount_auto, description)
SELECT 1, 'auto_approve', TRUE, 5000.00, 'Auto-aprobar ambulatorias simples hasta $5000'
WHERE NOT EXISTS (SELECT 1 FROM audit_rules_config LIMIT 1);

INSERT INTO audit_rules_config (jurisdiction_id, rule_type, requires_control_desk, description)
SELECT 1, 'control_desk', TRUE, 'Mesa de control para internaciones'
WHERE NOT EXISTS (SELECT 1 FROM audit_rules_config WHERE rule_type = 'control_desk');

-- =====================================================
-- FIN DE MIGRACIÓN 011
-- =====================================================
