-- ============================================================
-- Migración 016: Módulo de Parametrización Integral
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ── 1. Topes de consumo por práctica ──────────────────────
CREATE TABLE IF NOT EXISTS practice_limits (
    id                   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    jurisdiction_id      int    NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,
    practice_id          int    REFERENCES practices(id) ON DELETE SET NULL,
    practice_code        text,              -- alternativa si no hay id directo
    plan_id              int    REFERENCES plans(id) ON DELETE SET NULL, -- null = todos los planes
    max_per_year         int,               -- máximo de autorizaciones por año calendario
    min_days_between     int,               -- días mínimos entre solicitudes sucesivas
    min_age_years        int,               -- edad mínima del beneficiario
    max_age_years        int,               -- edad máxima del beneficiario
    gender_restriction   text   CHECK (gender_restriction IN ('M', 'F', 'X')),
    diagnosis_code       text,              -- CIE-10 requerido (null = cualquier diagnóstico)
    requires_authorization boolean DEFAULT true,
    notes                text,
    is_active            boolean DEFAULT true,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- ── 2. Reglas de auto-aprobación (semáforo verde) ─────────
CREATE TABLE IF NOT EXISTS auto_authorization_rules (
    id                   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    jurisdiction_id      int    NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,
    rule_name            text   NOT NULL,
    description          text,
    practice_code        text,              -- código específico (null = aplica por categoría)
    practice_category    text,              -- 'medico'|'bioquimico'|'odontologico'|'farmacia'
    plan_id              int    REFERENCES plans(id) ON DELETE SET NULL,
    max_amount           numeric(12,2),     -- monto máximo para auto-aprobar
    requires_no_prior_in_period int,        -- días sin solicitudes previas de la misma práctica
    requires_active_affiliate   boolean DEFAULT true,
    conditions           jsonb  DEFAULT '{}',  -- condiciones adicionales extendibles
    is_active            boolean DEFAULT true,
    priority             int    DEFAULT 0,     -- mayor prioridad = se evalúa primero
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- ── 3. Sobreescrituras de cobertura por plan ──────────────
CREATE TABLE IF NOT EXISTS plan_coverage_overrides (
    id                   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    jurisdiction_id      int    NOT NULL,
    plan_id              int    NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    practice_id          int    REFERENCES practices(id) ON DELETE SET NULL,
    practice_category    text,              -- aplica a toda la categoría si no hay practice_id
    coverage_percent     numeric(5,2) NOT NULL CHECK (coverage_percent BETWEEN 0 AND 100),
    copay_type           text   DEFAULT 'percent' CHECK (copay_type IN ('percent', 'fixed')),
    copay_value          numeric(10,2) DEFAULT 0,
    notes                text,
    valid_from           date   DEFAULT CURRENT_DATE,
    valid_to             date,
    is_active            boolean DEFAULT true,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- ── 4. Programas especiales ───────────────────────────────
CREATE TABLE IF NOT EXISTS special_programs (
    id                   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    jurisdiction_id      int    NOT NULL,
    name                 text   NOT NULL,
    code                 text   NOT NULL,
    description          text,
    inclusion_criteria   jsonb  DEFAULT '{}',
    -- Ejemplo: {"min_age": 0, "max_age": 99, "diagnosis_codes": ["C50","C71"],
    --           "requires_cud": false, "requires_diagnosis": true}
    benefits             jsonb  DEFAULT '{}',
    -- Ejemplo: {"extra_sessions_per_year": 20, "full_coverage_codes": ["3-01-01"],
    --           "waives_copay": true}
    color                text   DEFAULT 'blue',  -- para UI: 'blue'|'green'|'red'|'purple'
    icon                 text   DEFAULT 'heart',  -- nombre de lucide icon
    is_active            boolean DEFAULT true,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now(),
    UNIQUE (jurisdiction_id, code)
);

-- ── 5. Configuración de SLA ───────────────────────────────
CREATE TABLE IF NOT EXISTS sla_config (
    id                   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    jurisdiction_id      int    NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,
    expedient_type       text   NOT NULL,
    -- 'ambulatorio'|'internacion'|'medicamento'|'discapacidad'|'oncologia'|'otro'
    priority_level       text   NOT NULL DEFAULT 'normal'
                         CHECK (priority_level IN ('normal', 'urgente', 'emergencia')),
    target_hours         int    NOT NULL,   -- horas hábiles objetivo total
    alert_at_percent     int    DEFAULT 80
                         CHECK (alert_at_percent BETWEEN 1 AND 100),
    working_hours_start  time   DEFAULT '08:00',
    working_hours_end    time   DEFAULT '18:00',
    working_days         int[]  DEFAULT '{1,2,3,4,5}', -- ISO weekday (1=Lun, 7=Dom)
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now(),
    UNIQUE (jurisdiction_id, expedient_type, priority_level)
);

-- ── Datos iniciales de SLA ────────────────────────────────
INSERT INTO sla_config (jurisdiction_id, expedient_type, priority_level, target_hours, alert_at_percent)
VALUES
    (1, 'ambulatorio',  'normal',      24, 80),
    (1, 'ambulatorio',  'urgente',      8, 75),
    (1, 'ambulatorio',  'emergencia',   2, 70),
    (1, 'internacion',  'normal',      12, 80),
    (1, 'internacion',  'urgente',      4, 75),
    (1, 'internacion',  'emergencia',   1, 70),
    (1, 'medicamento',  'normal',      48, 80),
    (1, 'discapacidad', 'normal',      72, 80),
    (2, 'ambulatorio',  'normal',      24, 80),
    (2, 'ambulatorio',  'urgente',      8, 75),
    (2, 'ambulatorio',  'emergencia',   2, 70),
    (2, 'internacion',  'normal',      12, 80),
    (2, 'internacion',  'urgente',      4, 75),
    (2, 'internacion',  'emergencia',   1, 70),
    (2, 'medicamento',  'normal',      48, 80),
    (2, 'discapacidad', 'normal',      72, 80)
ON CONFLICT (jurisdiction_id, expedient_type, priority_level) DO NOTHING;

-- ── Programas iniciales ───────────────────────────────────
INSERT INTO special_programs (jurisdiction_id, name, code, description, inclusion_criteria, benefits, color, icon)
VALUES
    (1, 'Oncología', 'ONCOLOGIA',   'Pacientes con diagnóstico oncológico activo',
     '{"requires_diagnosis": true, "diagnosis_prefix": ["C","D0","D1","D2","D3","D4"]}',
     '{"full_coverage": true, "waives_copay": true}', 'red', 'heart-pulse'),
    (1, 'Discapacidad (CUD)', 'CUD', 'Beneficiarios con Certificado Único de Discapacidad',
     '{"requires_cud": true}',
     '{"full_coverage": true, "extra_sessions_per_year": 40}', 'purple', 'accessibility'),
    (1, 'Maternidad', 'MATERNIDAD', 'Embarazo y puerperio (hasta 90 días post-parto)',
     '{"diagnosis_prefix": ["O","Z34","Z35","Z36","Z37"]}',
     '{"full_coverage": true, "waives_copay": true}', 'pink', 'baby'),
    (1, 'VIH / SIDA', 'VIH',       'Pacientes con diagnóstico VIH/SIDA',
     '{"requires_diagnosis": true, "diagnosis_codes": ["B20","B21","B22","B23","B24","Z21"]}',
     '{"full_coverage": true, "waives_copay": true}', 'orange', 'shield'),
    (1, 'Diabetes', 'DIABETES',     'Diabetes tipo 1 y tipo 2 con tratamiento activo',
     '{"diagnosis_codes": ["E10","E11","E12","E13","E14"]}',
     '{"extra_sessions_per_year": 12}', 'blue', 'activity'),
    (2, 'Oncología', 'ONCOLOGIA',   'Pacientes con diagnóstico oncológico activo',
     '{"requires_diagnosis": true, "diagnosis_prefix": ["C","D0","D1","D2","D3","D4"]}',
     '{"full_coverage": true, "waives_copay": true}', 'red', 'heart-pulse'),
    (2, 'Discapacidad (CUD)', 'CUD', 'Beneficiarios con Certificado Único de Discapacidad',
     '{"requires_cud": true}',
     '{"full_coverage": true, "extra_sessions_per_year": 40}', 'purple', 'accessibility'),
    (2, 'Maternidad', 'MATERNIDAD', 'Embarazo y puerperio',
     '{"diagnosis_prefix": ["O","Z34","Z35","Z36","Z37"]}',
     '{"full_coverage": true, "waives_copay": true}', 'pink', 'baby')
ON CONFLICT (jurisdiction_id, code) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE practice_limits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_authorization_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_coverage_overrides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_programs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config                ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado
CREATE POLICY "Authenticated read practice_limits"
    ON practice_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read auto_authorization_rules"
    ON auto_authorization_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read plan_coverage_overrides"
    ON plan_coverage_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read special_programs"
    ON special_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read sla_config"
    ON sla_config FOR SELECT TO authenticated USING (true);

-- Escritura: solo autenticados (el control de rol se hace en la app)
CREATE POLICY "Authenticated write practice_limits"
    ON practice_limits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write auto_authorization_rules"
    ON auto_authorization_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write plan_coverage_overrides"
    ON plan_coverage_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write special_programs"
    ON special_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write sla_config"
    ON sla_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
