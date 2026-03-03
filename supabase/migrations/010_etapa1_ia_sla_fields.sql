-- ============================================================
-- Migración 010: Portal Inteligente Etapa 1
-- Agrega campos de prioridad clínica IA y SLA a expedients
-- y audit_requests.
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Tabla: expedients ──────────────────────────────────

ALTER TABLE expedients
    ADD COLUMN IF NOT EXISTS clinical_priority_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ia_suggestions          JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sla_status              TEXT    DEFAULT 'verde'
        CHECK (sla_status IN ('verde', 'amarillo', 'rojo')),
    ADD COLUMN IF NOT EXISTS sla_hours_elapsed       NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at        TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS duplicate_warning       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS duplicate_ids           JSONB   DEFAULT '[]'::jsonb;

-- ── 2. Tabla: audit_requests ──────────────────────────────

ALTER TABLE audit_requests
    ADD COLUMN IF NOT EXISTS clinical_priority_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ia_suggestions          JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sla_status              TEXT    DEFAULT 'verde'
        CHECK (sla_status IN ('verde', 'amarillo', 'rojo')),
    ADD COLUMN IF NOT EXISTS sla_hours_elapsed       NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at        TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS duplicate_warning       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS duplicate_ids           JSONB   DEFAULT '[]'::jsonb;

-- ── 3. Índices de rendimiento ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_expedients_sla_status
    ON expedients (sla_status, jurisdiction_id)
    WHERE status IN ('pendiente', 'en_revision');

CREATE INDEX IF NOT EXISTS idx_expedients_clinical_priority
    ON expedients (clinical_priority_score DESC, jurisdiction_id);

CREATE INDEX IF NOT EXISTS idx_expedients_last_activity
    ON expedients (last_activity_at, jurisdiction_id)
    WHERE status IN ('pendiente', 'en_revision', 'observada');

-- ── 4. Trigger: actualizar last_activity_at ───────────────

CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expedients_last_activity ON expedients;
CREATE TRIGGER trg_expedients_last_activity
    BEFORE UPDATE ON expedients
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity();

DROP TRIGGER IF EXISTS trg_audit_requests_last_activity ON audit_requests;
CREATE TRIGGER trg_audit_requests_last_activity
    BEFORE UPDATE ON audit_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity();

-- ── 5. Confirmación ──────────────────────────────────────

SELECT
    'expedients' AS tabla,
    COUNT(*) AS registros_existentes,
    'Campos IA y SLA agregados correctamente' AS estado
FROM expedients
UNION ALL
SELECT
    'audit_requests',
    COUNT(*),
    'Campos IA y SLA agregados correctamente'
FROM audit_requests;
