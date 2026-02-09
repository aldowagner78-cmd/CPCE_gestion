-- =====================================================
-- CPCE SALUD - MIGRACIÓN: Tabla de Homologaciones
-- Tabla para mapear prácticas internas con códigos externos
-- =====================================================

-- Verificar si ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'homologations') THEN
        CREATE TABLE homologations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            
            -- Práctica interna (nuestra)
            internal_practice_id BIGINT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
            
            -- Código externo
            external_nomenclator_id INT NOT NULL REFERENCES external_nomenclators(id) ON DELETE CASCADE,
            external_code VARCHAR(50) NOT NULL,
            external_description TEXT,
            
            -- Relación de conversión
            ratio DECIMAL(10, 4) DEFAULT 1.0, -- Factor de conversión (ej: 1 unidad interna = 1.5 unidades externas)
            
            -- Tipo de mapeo
            mapping_type VARCHAR(20) DEFAULT 'manual' CHECK (mapping_type IN ('manual', 'automatic', 'suggested')),
            confidence_score DECIMAL(5, 2), -- 0.00 a 1.00 para sugerencias automáticas
            
            -- Metadatos
            notes TEXT,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            -- Una práctica interna puede tener múltiples códigos externos (1:N)
            -- Pero un código externo solo puede estar mapeado a UNA práctica interna (unique)
            UNIQUE(external_nomenclator_id, external_code)
        );

        -- Índices para búsquedas rápidas
        CREATE INDEX idx_homologations_internal ON homologations(internal_practice_id);
        CREATE INDEX idx_homologations_external ON homologations(external_nomenclator_id, external_code);
        CREATE INDEX idx_homologations_type ON homologations(mapping_type);
        
        RAISE NOTICE 'Tabla homologations creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla homologations ya existe';
    END IF;
END $$;
