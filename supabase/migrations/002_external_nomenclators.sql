-- =====================================================
-- CPCE SALUD - MIGRACIÓN: Nomencladores Externos
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de Definición de Nomencladores (NUN, FAAAR, etc.)
CREATE TABLE IF NOT EXISTS external_nomenclators (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE, -- 'NUN', 'FAAAR'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO external_nomenclators (code, name, description) VALUES
    ('NUN', 'Nomenclador Único Nacional', 'Nomenclador bioquímico unificado'),
    ('FAAAR', 'Federación Argentina de Anestesia', 'Nomenclador de anestesiología'),
    ('IAPOS', 'IAPOS', 'Obra social provincial')
ON CONFLICT (code) DO NOTHING;

-- 2. Tabla de Prácticas Externas y Mapeo
CREATE TABLE IF NOT EXISTS external_practices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomenclator_id INT REFERENCES external_nomenclators(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Valores propios del nomenclador externo (opcional)
    value DECIMAL(12, 2),
    unit VARCHAR(20),
    
    -- Homologación: vínculo con nuestra práctica interna
    internal_practice_id BIGINT REFERENCES practices(id) ON DELETE SET NULL,
    
    match_confidence DECIMAL(5, 2), -- 0.00 a 1.00 para sugerencias automáticas
    match_type VARCHAR(20) DEFAULT 'manual' CHECK (match_type IN ('manual', 'automatic', 'suggestion')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(nomenclator_id, code)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ext_practices_code ON external_practices(code);
CREATE INDEX IF NOT EXISTS idx_ext_practices_nomenclator ON external_practices(nomenclator_id);
CREATE INDEX IF NOT EXISTS idx_ext_practices_internal ON external_practices(internal_practice_id);
