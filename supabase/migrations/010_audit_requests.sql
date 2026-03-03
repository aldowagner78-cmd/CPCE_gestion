-- =====================================================
-- MIGRACIÓN 010: SOLICITUDES DE AUDITORÍA
-- Sistema completo de solicitudes con trazabilidad
-- =====================================================

-- 1. TABLA PRINCIPAL: audit_requests (Solicitudes de Auditoría)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Clasificación
    request_number VARCHAR(20) UNIQUE,                  -- Nro correlativo auto (AR-2026-00001)
    type VARCHAR(20) NOT NULL CHECK (type IN ('ambulatoria', 'bioquimica', 'internacion')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgente')),
    
    -- Afiliado y su contexto al momento de la solicitud
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE RESTRICT,
    affiliate_plan_id INT REFERENCES plans(id),          -- Plan vigente al momento
    family_member_relation VARCHAR(30),                  -- Si es familiar: Cónyuge, Hijo, etc.
    
    -- Práctica solicitada  
    practice_id BIGINT NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
    practice_quantity INT DEFAULT 1,                      -- Cantidad de sesiones/unidades
    
    -- Prestador
    provider_id INT REFERENCES providers(id),             -- Prestador/Efector
    requesting_doctor_id INT REFERENCES providers(id),    -- Médico que prescribe
    
    -- Diagnóstico (lo carga el auditor al resolver)
    disease_id INT REFERENCES diseases(id),
    diagnosis_code VARCHAR(20),                           -- Código CIE-10
    diagnosis_description TEXT,                           -- Texto libre del diagnóstico
    
    -- Resultado de cobertura (se calcula al crear y se confirma al autorizar)
    coverage_percent DECIMAL(5,2),
    covered_amount DECIMAL(12,2),
    copay_amount DECIMAL(12,2),
    practice_value DECIMAL(12,2),                         -- Valor de la práctica al momento
    
    -- Estado del flujo
    status VARCHAR(20) DEFAULT 'pendiente' NOT NULL 
        CHECK (status IN ('pendiente', 'en_revision', 'autorizada', 'denegada', 'observada', 'anulada', 'vencida')),
    
    -- Autorización generada
    authorization_id INT REFERENCES authorizations(id),   -- Vincula con tabla authorizations si se aprueba
    authorization_code VARCHAR(50),                       -- Código de autorización generado
    authorization_expiry DATE,                            -- Vencimiento de la autorización
    
    -- Internación (solo para type = 'internacion')
    hospitalization_id INT REFERENCES hospitalizations(id),
    estimated_days INT,
    
    -- Campos de texto
    request_notes TEXT,                                   -- Observaciones del administrativo al cargar
    resolution_notes TEXT,                                -- Motivo de la resolución del auditor
    
    -- Trazabilidad completa
    created_by UUID NOT NULL REFERENCES users(id),        -- Administrativo que carga
    resolved_by UUID REFERENCES users(id),                -- Auditor que resuelve
    resolved_at TIMESTAMPTZ,
    jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_ar_status ON audit_requests(status);
CREATE INDEX IF NOT EXISTS idx_ar_type ON audit_requests(type);
CREATE INDEX IF NOT EXISTS idx_ar_affiliate ON audit_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_ar_created ON audit_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_jurisdiction ON audit_requests(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_ar_number ON audit_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_ar_type_status ON audit_requests(type, status);

-- 2. TABLA: audit_request_notes (Historial de comunicaciones)
-- Registra TODA comunicación interna y con el afiliado
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_request_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES audit_requests(id) ON DELETE CASCADE,
    
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    
    -- Tipo de nota para filtrar
    note_type VARCHAR(20) DEFAULT 'interna' 
        CHECK (note_type IN ('interna', 'para_afiliado', 'sistema', 'resolucion')),
    
    -- Si es un cambio de estado, registrar la transición
    status_from VARCHAR(20),
    status_to VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arn_request ON audit_request_notes(request_id, created_at);

-- 3. TABLA: audit_request_attachments (Documentos adjuntos)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_request_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES audit_requests(id) ON DELETE CASCADE,
    
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),                                -- MIME type
    file_size INT,                                        -- bytes
    storage_path TEXT NOT NULL,                            -- Ruta en Supabase Storage
    
    -- Clasificación del documento
    document_type VARCHAR(30) DEFAULT 'otro'
        CHECK (document_type IN ('orden_medica', 'receta', 'estudio', 'informe', 'consentimiento', 'factura', 'otro')),
    
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ara_request ON audit_request_attachments(request_id);

-- 4. TABLA: audit_request_log (Log de auditoría de la solicitud)
-- Cada acción sobre la solicitud queda registrada
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_request_log (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES audit_requests(id) ON DELETE CASCADE,
    
    action VARCHAR(50) NOT NULL,                          -- created, status_changed, note_added, attachment_added, etc.
    details JSONB DEFAULT '{}'::jsonb,                    -- Datos del cambio (campo, valor_anterior, valor_nuevo)
    
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arl_request ON audit_request_log(request_id, performed_at);

-- 5. FUNCIÓN: Generar número de solicitud correlativo
-- =====================================================
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_seq INT;
    v_prefix TEXT;
BEGIN
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Prefijo según tipo
    CASE NEW.type
        WHEN 'ambulatoria' THEN v_prefix := 'AMB';
        WHEN 'bioquimica' THEN v_prefix := 'BIO';
        WHEN 'internacion' THEN v_prefix := 'INT';
        ELSE v_prefix := 'SOL';
    END CASE;
    
    -- Obtener siguiente número correlativo del año
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(request_number, '-', 3) AS INT)
    ), 0) + 1
    INTO v_seq
    FROM audit_requests
    WHERE request_number LIKE v_prefix || '-' || v_year || '-%';
    
    NEW.request_number := v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_request_number
    BEFORE INSERT ON audit_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL)
    EXECUTE FUNCTION generate_request_number();

-- 6. FUNCIÓN: Auto-actualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_audit_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ar_updated
    BEFORE UPDATE ON audit_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_request_timestamp();

-- 7. Habilitar realtime para solicitudes
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE audit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_request_notes;

-- 8. Storage bucket para adjuntos (ejecutar en Supabase Dashboard > Storage)
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('audit-attachments', 'audit-attachments', false);

-- =====================================================
-- FIN DE MIGRACIÓN 010
-- =====================================================
