-- ============================================================
-- Migración 023: Campos adicionales para expedientes
-- Médico solicitante, prestador, fecha prescripción, etc.
-- ============================================================

-- Médico prescriptor (texto libre, no FK — el médico puede no estar en providers)
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS requesting_doctor_name TEXT;
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS requesting_doctor_registration TEXT;  -- MN/MP
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS requesting_doctor_specialty TEXT;

-- Prestador / Efector (texto libre)
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS provider_name TEXT;

-- Fecha de prescripción de la orden médica
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS prescription_date DATE;

-- Número de receta / orden / remito
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS prescription_number TEXT;

-- Fecha de vencimiento de la orden médica
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS order_expiry_date DATE;

-- Diagnóstico en cabecera (ya existían diagnosis_code y diagnosis_description,
-- pero los agregamos por si la tabla no los tiene aún)
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(20);
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS diagnosis_description TEXT;
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS disease_id INT REFERENCES diseases(id);

-- Índice para búsqueda por médico
CREATE INDEX IF NOT EXISTS idx_exp_doctor_name
    ON expedients USING GIN (requesting_doctor_name gin_trgm_ops);

-- ============================================================
-- FIN MIGRACIÓN 023
-- ============================================================
