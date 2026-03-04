-- ============================================================
-- Migración 022: Campos enriquecidos para tabla diseases
-- Convierte la tabla en un manual clínico por tarjetas
-- ============================================================

-- Categoría clínica (ej: Endocrinología, Neurología, Oncología)
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS category TEXT;

-- Sinónimos y términos alternativos (array de texto)
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS synonyms TEXT[];

-- Criterios diagnósticos (array de texto)
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS criteria TEXT[];

-- Exclusiones diagnósticas (array de texto)
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS exclusions TEXT[];

-- Notas clínicas adicionales
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS clinical_notes TEXT;

-- Índice trigrama en category para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_diseases_category_trgm
    ON diseases USING GIN (category gin_trgm_ops);

-- Índice en category (btree) para agrupar/filtrar
CREATE INDEX IF NOT EXISTS idx_diseases_category
    ON diseases (category);
