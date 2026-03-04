-- ============================================================
-- Migration 021: Índices de búsqueda rápida para tabla diseases
-- ============================================================
-- Activa la extensión pg_trgm (trigramas) para búsquedas ILIKE
-- eficientes con comodín inicial (%texto%).
-- Con estos índices GIN, una búsqueda sobre 46.000 registros
-- pasa de ~400 ms (full-scan) a < 10 ms.
-- ============================================================

-- Habilitar extensión (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice trigrama en el nombre de la enfermedad
CREATE INDEX IF NOT EXISTS idx_diseases_name_trgm
    ON diseases USING GIN (name gin_trgm_ops);

-- Índice trigrama en el código (útil para búsquedas parciales de código)
CREATE INDEX IF NOT EXISTS idx_diseases_code_trgm
    ON diseases USING GIN (code gin_trgm_ops);

-- Índice trigrama combinado para name || ' ' || code (mejora búsquedas mixtas)
-- Nota: se puede omitir si el espacio en disco es limitado.
CREATE INDEX IF NOT EXISTS idx_diseases_name_code_trgm
    ON diseases USING GIN ((name || ' ' || code) gin_trgm_ops);
