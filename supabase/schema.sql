-- =====================================================
-- CPCE SALUD - ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. TABLA: jurisdictions (Cámaras/Jurisdicciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS jurisdictions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    theme_config JSONB DEFAULT '{"primaryColor": "blue", "secondaryColor": "slate"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO jurisdictions (name, theme_config) VALUES
    ('Cámara I - Santa Fe', '{"primaryColor": "blue", "secondaryColor": "slate"}'),
    ('Cámara II - Rosario', '{"primaryColor": "emerald", "secondaryColor": "slate"}')
ON CONFLICT DO NOTHING;

-- 2. TABLA: plans (Planes de Cobertura)
-- =====================================================
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    coverage_percent INT DEFAULT 80 CHECK (coverage_percent >= 0 AND coverage_percent <= 100),
    waiting_period_months INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO plans (name, jurisdiction_id, coverage_percent, waiting_period_months) VALUES
    ('Plan General', 1, 80, 6),
    ('Plan Premium', 1, 100, 0),
    ('Plan General', 2, 80, 6),
    ('Plan Premium', 2, 100, 0)
ON CONFLICT DO NOTHING;

-- 3. TABLA: affiliates (Padrón de Afiliados)
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_number VARCHAR(50) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    document_number VARCHAR(20) NOT NULL,
    birth_date DATE,
    gender VARCHAR(1) CHECK (gender IN ('M', 'F', 'X')),
    relationship VARCHAR(20) DEFAULT 'Titular' CHECK (relationship IN ('Titular', 'Cónyuge', 'Hijo', 'Hijo Estudiante', 'Hijo Discapacidad', 'Otro')),
    titular_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    special_conditions JSONB DEFAULT '[]'::jsonb,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'activo' CHECK (status IN ('activo', 'suspendido', 'baja')),
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_affiliates_document ON affiliates(document_number);
CREATE INDEX IF NOT EXISTS idx_affiliates_name ON affiliates(full_name);
CREATE INDEX IF NOT EXISTS idx_affiliates_titular ON affiliates(titular_id);

-- 4. TABLA: practice_types (Tipos de Nomenclador)
-- =====================================================
CREATE TABLE IF NOT EXISTS practice_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO practice_types (code, name, description, unit_name) VALUES
    ('MED', 'Médico', 'Prácticas médicas generales y especialidades', 'Galeno'),
    ('BIO', 'Bioquímico', 'Análisis clínicos y bioquímicos', 'NBU'),
    ('ODO', 'Odontológico', 'Prácticas odontológicas', 'UO'),
    ('FAR', 'Medicamentos', 'Medicamentos y fármacos', NULL),
    ('ESP', 'Especiales', 'Programas especiales y coberturas específicas', NULL)
ON CONFLICT DO NOTHING;

-- 5. TABLA: unit_values (Valores de Unidades)
-- =====================================================
CREATE TABLE IF NOT EXISTS unit_values (
    id SERIAL PRIMARY KEY,
    practice_type_id INT REFERENCES practice_types(id) ON DELETE CASCADE,
    value DECIMAL(12, 2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores iniciales (ejemplo)
INSERT INTO unit_values (practice_type_id, value, valid_from, jurisdiction_id) VALUES
    (1, 150.00, '2026-01-01', 1),  -- Galeno Cámara I
    (1, 155.00, '2026-01-01', 2),  -- Galeno Cámara II
    (2, 45.00, '2026-01-01', 1),   -- NBU Cámara I
    (2, 47.00, '2026-01-01', 2)    -- NBU Cámara II
ON CONFLICT DO NOTHING;

-- 6. TABLA: practices (Nomenclador Unificado)
-- =====================================================
CREATE TABLE IF NOT EXISTS practices (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    practice_type_id INT REFERENCES practice_types(id) ON DELETE SET NULL,
    unit_quantity DECIMAL(10, 2),
    fixed_value DECIMAL(12, 2),
    category VARCHAR(100),
    requires_authorization BOOLEAN DEFAULT FALSE,
    max_per_month INT,
    max_per_year INT,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practices_code ON practices(code);
CREATE INDEX IF NOT EXISTS idx_practices_name ON practices USING gin(to_tsvector('spanish', name));

-- 7. TABLA: users (Usuarios del Sistema)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'auditor' CHECK (role IN ('admin', 'supervisor', 'auditor')),
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: audits (Historial de Auditorías)
-- =====================================================
CREATE TABLE IF NOT EXISTS audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    practice_id BIGINT REFERENCES practices(id) ON DELETE SET NULL,
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    coverage_result JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'partial', 'requires_auth')),
    auditor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    authorization_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_affiliate ON audits(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_date ON audits(created_at DESC);

-- 9. TABLA: alert_rules (Reglas de Alertas)
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('threshold', 'frequency', 'deadline', 'anomaly', 'compliance')),
    config JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT TRUE,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLA: alerts (Alertas Generadas)
-- =====================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id INT REFERENCES alert_rules(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(20) CHECK (type IN ('threshold', 'frequency', 'deadline', 'anomaly', 'compliance')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- 11. TABLA: events (Agenda/Eventos)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(200),
    type VARCHAR(20) DEFAULT 'otro' CHECK (type IN ('reunion', 'capacitacion', 'vencimiento', 'recordatorio', 'otro')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'alta', 'urgente')),
    status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'completado', 'cancelado')),
    attendees TEXT[],
    reminder_minutes INT DEFAULT 30,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- 12. TABLA: conversations (Chat - Conversaciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'channel')),
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABLA: conversation_members (Chat - Miembros)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    last_read_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 14. TABLA: messages (Chat - Mensajes)
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type VARCHAR(10) DEFAULT 'text' CHECK (type IN ('text', 'file', 'system')),
    attachment_url TEXT,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- =====================================================
-- REALTIME SUBSCRIPTIONS (para chat en tiempo real)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- =====================================================
-- ROW LEVEL SECURITY (básico - activar después de auth)
-- =====================================================
-- Por ahora dejamos las tablas sin RLS para facilitar desarrollo
-- Se activará cuando implementemos autenticación

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para calcular edad desde fecha de nacimiento
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INT AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para obtener valor actual de una unidad
CREATE OR REPLACE FUNCTION get_current_unit_value(p_type_id INT, p_jurisdiction_id INT)
RETURNS DECIMAL AS $$
DECLARE
    v_value DECIMAL;
BEGIN
    SELECT value INTO v_value
    FROM unit_values
    WHERE practice_type_id = p_type_id
      AND jurisdiction_id = p_jurisdiction_id
      AND valid_from <= CURRENT_DATE
      AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    RETURN COALESCE(v_value, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
