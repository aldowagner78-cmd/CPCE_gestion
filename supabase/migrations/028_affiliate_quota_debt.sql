-- ================================================================
-- Migración 028: Deuda de cuota mensual en afiliados
-- ================================================================
-- Agrega la columna quota_debt para registrar la deuda de cuota
-- mensual del afiliado (diferente del copay_debt que es coseguro).
-- ================================================================

ALTER TABLE affiliates
    ADD COLUMN IF NOT EXISTS quota_debt NUMERIC(12, 2) DEFAULT 0;

COMMENT ON COLUMN affiliates.quota_debt IS
    'Deuda acumulada de cuota mensual del afiliado (distinto de copay_debt que es coseguro)';
