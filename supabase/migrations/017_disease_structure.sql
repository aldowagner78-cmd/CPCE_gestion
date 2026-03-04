-- =====================================================
-- MIGRACIÓN 014: CLASIFICACIÓN DE ENFERMEDADES
-- Agrega columna 'classification' para distinguir entre
-- CIE-10, CIE-11 y DSM-5-TR
-- =====================================================

-- 1. Agregar columnas classification y description
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS classification VARCHAR(20) DEFAULT 'CIE-10';
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Asegurar que los datos actuales se marquen como CIE-10
UPDATE diseases SET classification = 'CIE-10' WHERE classification IS NULL;

-- 3. Crear índice por clasificación para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_diseases_classification ON diseases(classification);
