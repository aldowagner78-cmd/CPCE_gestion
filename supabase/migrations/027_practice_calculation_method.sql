-- ============================================================
-- Migración 027: Método de cálculo de valor de prácticas
-- Agrega calculation_method y calculation_config a la tabla practices
-- para soportar cálculos fijos, por unidad NBU o personalizados.
-- ============================================================

-- Tipo enum para el método de cálculo
DO $$ BEGIN
    CREATE TYPE practice_calculation_method AS ENUM (
        'fixed',    -- Valor fijo en pesos
        'nbu',      -- Cantidad de unidades × valor NBU del período
        'custom'    -- Fórmula personalizada en calculation_config
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Columnas nuevas en practices
ALTER TABLE public.practices
    ADD COLUMN IF NOT EXISTS calculation_method practice_calculation_method NOT NULL DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS calculation_config JSONB;

-- Índice para filtrar por método
CREATE INDEX IF NOT EXISTS idx_practices_calc_method
    ON public.practices(calculation_method);

-- Comentarios
COMMENT ON COLUMN public.practices.calculation_method IS
    'fixed = valor fijo; nbu = unidades × valor NBU; custom = lógica especial en calculation_config';
COMMENT ON COLUMN public.practices.calculation_config IS
    'JSON con parámetros del cálculo. Ej: {"nbu_units": 3.5} o {"formula": "base * 1.2"}';

-- Migrar prácticas existentes que tengan nbu_value definido
UPDATE public.practices
SET calculation_method = 'nbu'
WHERE nbu_value IS NOT NULL AND nbu_value > 0;
