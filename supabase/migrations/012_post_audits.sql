-- =====================================================
-- MIGRACIÓN 012: AUDITORÍA POSTERIOR (Facturación + HC)
-- Cruce de facturas de prestadores vs autorizaciones
-- emitidas. Detección de inconsistencias y débitos.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 0. FUNCIÓN AUXILIAR: update_updated_at()
--    (se crea si no existe, usada por triggers de todas las tablas)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────
-- 1. TABLA: post_audits (cabecera de auditoría posterior)
--    Vincula una factura con las autorizaciones que cubre
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Número correlativo: PA-2026-00001
    audit_number VARCHAR(25) UNIQUE,

    -- Factura bajo auditoría
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,

    -- Prestador (denormalizado para consulta rápida)
    provider_id INT REFERENCES providers(id),

    -- Período auditado
    period_month INT,
    period_year INT,

    -- Estado del flujo
    status VARCHAR(20) DEFAULT 'pendiente' NOT NULL CHECK (status IN (
        'pendiente',           -- recién creada, sin revisar
        'en_revision',         -- auditor la tomó
        'aprobada',            -- todo coincide, se aprueba pago
        'con_debitos',         -- hay débitos que aplicar
        'en_disputa',          -- el prestador disputa los débitos
        'cerrada'              -- finalizada (con o sin débitos)
    )),

    -- Resumen económico (calculado)
    invoiced_total DECIMAL(14,2) DEFAULT 0,     -- total facturado
    authorized_total DECIMAL(14,2) DEFAULT 0,   -- total autorizado
    difference DECIMAL(14,2) DEFAULT 0,         -- diferencia (facturado - autorizado)
    debit_total DECIMAL(14,2) DEFAULT 0,        -- total de débitos aplicados
    approved_total DECIMAL(14,2) DEFAULT 0,     -- total finalmente aprobado para pago

    -- Resultado del cruce automático
    auto_check_result VARCHAR(10) CHECK (auto_check_result IN ('ok', 'warning', 'error')),
    auto_check_messages JSONB DEFAULT '[]'::jsonb,
    auto_check_at TIMESTAMPTZ,

    -- Resolución
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,

    -- Trazabilidad
    assigned_to UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pa_status ON post_audits(status);
CREATE INDEX IF NOT EXISTS idx_pa_invoice ON post_audits(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pa_provider ON post_audits(provider_id);
CREATE INDEX IF NOT EXISTS idx_pa_period ON post_audits(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_pa_jurisdiction ON post_audits(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_pa_assigned ON post_audits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pa_created ON post_audits(created_at DESC);

-- ─────────────────────────────────────────────────────
-- 2. TABLA: post_audit_items (línea a línea del cruce)
--    Cada línea de la factura se cruza con su autorización
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_audit_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_audit_id UUID NOT NULL REFERENCES post_audits(id) ON DELETE CASCADE,

    -- Referencia al detalle de factura
    invoice_detail_id INT REFERENCES invoice_details(id) ON DELETE SET NULL,

    -- Referencia a la autorización (si existe match)
    authorization_id INT REFERENCES authorizations(id) ON DELETE SET NULL,
    authorization_detail_id INT REFERENCES authorization_details(id) ON DELETE SET NULL,
    expedient_practice_id UUID REFERENCES expedient_practices(id) ON DELETE SET NULL,

    -- Datos de la factura (denormalizados para vista rápida)
    practice_id BIGINT REFERENCES practices(id),
    practice_description TEXT,
    affiliate_id UUID REFERENCES affiliates(id),

    -- Montos facturados
    invoiced_quantity INT DEFAULT 1,
    invoiced_unit_price DECIMAL(12,2),
    invoiced_total DECIMAL(12,2),

    -- Montos autorizados (si hay match)
    authorized_quantity INT,
    authorized_unit_price DECIMAL(12,2),
    authorized_total DECIMAL(12,2),
    authorized_coverage_percent DECIMAL(5,2),

    -- Resultado del cruce
    match_status VARCHAR(20) DEFAULT 'pendiente' CHECK (match_status IN (
        'pendiente',           -- aún no revisado
        'ok',                  -- coincide perfectamente
        'cantidad_excedida',   -- facturó más cantidad que la autorizada
        'precio_excedido',     -- precio mayor al autorizado
        'sin_autorizacion',    -- no hay autorización para esta práctica
        'autorizacion_vencida',-- la autorización expiró antes de la fecha de factura
        'duplicada',           -- posible duplicado de otra factura
        'aprobado_manual',     -- aprobado por el auditor manualmente
        'debitado'             -- se generó débito
    )),

    -- Inconsistencias detectadas por el cruce automático
    issues JSONB DEFAULT '[]'::jsonb,
    -- Ejemplo: [{"type": "price_mismatch", "message": "Precio facturado $500 vs autorizado $350", "severity": "warning"}]

    -- Débito (si corresponde)
    debit_amount DECIMAL(12,2) DEFAULT 0,
    debit_reason TEXT,

    -- Resolución del auditor
    auditor_action VARCHAR(15) CHECK (auditor_action IN (
        'aprobar',             -- aceptar tal como está
        'debitar',             -- aplicar débito
        'rechazar',            -- rechazar la línea completa
        'ajustar'              -- aceptar con ajuste de montos
    )),
    auditor_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,

    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pai_post_audit ON post_audit_items(post_audit_id);
CREATE INDEX IF NOT EXISTS idx_pai_match_status ON post_audit_items(match_status);
CREATE INDEX IF NOT EXISTS idx_pai_authorization ON post_audit_items(authorization_id);
CREATE INDEX IF NOT EXISTS idx_pai_invoice_detail ON post_audit_items(invoice_detail_id);
CREATE INDEX IF NOT EXISTS idx_pai_practice ON post_audit_items(practice_id);

-- ─────────────────────────────────────────────────────
-- 3. TABLA: debit_notes (notas de débito generadas)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debit_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Número correlativo: ND-2026-00001
    debit_number VARCHAR(25) UNIQUE,

    -- Relación con la auditoría posterior
    post_audit_id UUID NOT NULL REFERENCES post_audits(id) ON DELETE CASCADE,
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    provider_id INT REFERENCES providers(id),

    -- Montos
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    detail_count INT DEFAULT 0,

    -- Estado
    status VARCHAR(20) DEFAULT 'borrador' CHECK (status IN (
        'borrador',       -- recién generada
        'emitida',        -- enviada al prestador
        'aceptada',       -- prestador acepta
        'disputada',      -- prestador disputa
        'resuelta',       -- disputa resuelta
        'anulada'         -- anulada
    )),

    -- Motivo global (resumen)
    reason TEXT,

    -- Disputa
    dispute_reason TEXT,
    dispute_date TIMESTAMPTZ,
    dispute_resolution TEXT,
    dispute_resolved_by UUID REFERENCES users(id),
    dispute_resolved_at TIMESTAMPTZ,

    -- Trazabilidad
    created_by UUID NOT NULL REFERENCES users(id),
    emitted_by UUID REFERENCES users(id),
    emitted_at TIMESTAMPTZ,
    jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dn_post_audit ON debit_notes(post_audit_id);
CREATE INDEX IF NOT EXISTS idx_dn_invoice ON debit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dn_provider ON debit_notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_dn_status ON debit_notes(status);
CREATE INDEX IF NOT EXISTS idx_dn_number ON debit_notes(debit_number);

-- ─────────────────────────────────────────────────────
-- 4. TABLA: debit_note_items (detalle de la nota de débito)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debit_note_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debit_note_id UUID NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
    post_audit_item_id UUID REFERENCES post_audit_items(id) ON DELETE SET NULL,

    -- Datos de la práctica
    practice_id BIGINT REFERENCES practices(id),
    practice_description TEXT,

    -- Montos
    invoiced_amount DECIMAL(12,2),
    authorized_amount DECIMAL(12,2),
    debit_amount DECIMAL(12,2) NOT NULL,

    -- Motivo del débito
    reason TEXT,
    debit_type VARCHAR(25) CHECK (debit_type IN (
        'precio_excedido',
        'cantidad_excedida',
        'sin_autorizacion',
        'autorizacion_vencida',
        'duplicada',
        'otro'
    )),

    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dni_debit_note ON debit_note_items(debit_note_id);

-- ─────────────────────────────────────────────────────
-- 5. TABLA: post_audit_log (trazabilidad)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_audit_id UUID NOT NULL REFERENCES post_audits(id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,

    performed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pal_post_audit ON post_audit_log(post_audit_id, created_at);

-- ─────────────────────────────────────────────────────
-- 6. TRIGGERS: Número correlativo automático
-- ─────────────────────────────────────────────────────

-- Trigger para post_audits: PA-2026-00001
CREATE OR REPLACE FUNCTION generate_post_audit_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
    year_str VARCHAR(4);
BEGIN
    year_str := EXTRACT(YEAR FROM NOW())::VARCHAR;
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(audit_number, '-', 3) AS INT)
    ), 0) + 1
    INTO next_num
    FROM post_audits
    WHERE audit_number LIKE 'PA-' || year_str || '-%';

    NEW.audit_number := 'PA-' || year_str || '-' || LPAD(next_num::VARCHAR, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_audit_number ON post_audits;
CREATE TRIGGER trg_post_audit_number
    BEFORE INSERT ON post_audits
    FOR EACH ROW
    WHEN (NEW.audit_number IS NULL)
    EXECUTE FUNCTION generate_post_audit_number();

-- Trigger para debit_notes: ND-2026-00001
CREATE OR REPLACE FUNCTION generate_debit_note_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
    year_str VARCHAR(4);
BEGIN
    year_str := EXTRACT(YEAR FROM NOW())::VARCHAR;
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(debit_number, '-', 3) AS INT)
    ), 0) + 1
    INTO next_num
    FROM debit_notes
    WHERE debit_number LIKE 'ND-' || year_str || '-%';

    NEW.debit_number := 'ND-' || year_str || '-' || LPAD(next_num::VARCHAR, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_debit_note_number ON debit_notes;
CREATE TRIGGER trg_debit_note_number
    BEFORE INSERT ON debit_notes
    FOR EACH ROW
    WHEN (NEW.debit_number IS NULL)
    EXECUTE FUNCTION generate_debit_note_number();

-- ─────────────────────────────────────────────────────
-- 7. TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────
CREATE TRIGGER trg_post_audits_updated
    BEFORE UPDATE ON post_audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_post_audit_items_updated
    BEFORE UPDATE ON post_audit_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_debit_notes_updated
    BEFORE UPDATE ON debit_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────
-- 8. RLS: Políticas de seguridad
-- ─────────────────────────────────────────────────────
ALTER TABLE post_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para usuarios autenticados
CREATE POLICY "post_audits_select" ON post_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_audits_insert" ON post_audits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "post_audits_update" ON post_audits FOR UPDATE TO authenticated USING (true);

CREATE POLICY "post_audit_items_select" ON post_audit_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_audit_items_insert" ON post_audit_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "post_audit_items_update" ON post_audit_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "debit_notes_select" ON debit_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "debit_notes_insert" ON debit_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "debit_notes_update" ON debit_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "debit_note_items_select" ON debit_note_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "debit_note_items_insert" ON debit_note_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "debit_note_items_update" ON debit_note_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "post_audit_log_select" ON post_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_audit_log_insert" ON post_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════
-- FIN DE MIGRACIÓN 012
-- ═══════════════════════════════════════════
