-- ============================================================
-- Migración 026: Tabla de Reglas de Coseguro
-- Permite configurar el % de coseguro con jerarquía de prioridades:
--   1. practice_code         (código exacto de práctica)
--   2. special_condition     (condición especial del afiliado)
--   3. practice_category + plan_id
--   4. plan_id               (plan global)
--   5. Regla global          (sin filtros)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coseguro_rules (
    id                  SERIAL  PRIMARY KEY,
    description         TEXT    NOT NULL,

    -- Filtros de aplicación (NULL = aplica a todos)
    plan_id             INTEGER REFERENCES public.plans(id) ON DELETE CASCADE,
    practice_type_id    INTEGER REFERENCES public.practice_types(id) ON DELETE CASCADE,
    practice_category   TEXT,
    practice_code       TEXT,
    special_condition   TEXT,

    -- Porcentaje de coseguro (0-100)
    coseguro_percent    NUMERIC(5,2) NOT NULL
        CHECK (coseguro_percent >= 0 AND coseguro_percent <= 100),

    -- Vigencia
    valid_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to            DATE,

    -- Estado
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    -- Jurisdicción
    jurisdiction_id     INTEGER NOT NULL REFERENCES public.jurisdictions(id),

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Restricción: valid_to >= valid_from si está definido
    CONSTRAINT chk_coseguro_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- Índices para búsqueda eficiente por prioridad
CREATE INDEX IF NOT EXISTS idx_coseguro_jurisdiction ON public.coseguro_rules(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_coseguro_plan ON public.coseguro_rules(plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coseguro_practice_code ON public.coseguro_rules(practice_code) WHERE practice_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coseguro_active ON public.coseguro_rules(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.coseguro_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coseguro rules: lectura por jurisdicción"
    ON public.coseguro_rules FOR SELECT
    USING (
        jurisdiction_id = (
            SELECT jurisdiction_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Coseguro rules: gestión por admin/superuser"
    ON public.coseguro_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('admin', 'superuser')
              AND jurisdiction_id = coseguro_rules.jurisdiction_id
        )
    );

-- Regla global de ejemplo (0% = sin coseguro por defecto)
-- Las jurisdicciones deben configurar sus propias reglas.
COMMENT ON TABLE public.coseguro_rules IS
    'Reglas de coseguro con jerarquía: código práctica > condición especial > categoría+plan > plan > global';
COMMENT ON COLUMN public.coseguro_rules.coseguro_percent IS
    'Porcentaje que paga el afiliado (0 = gratis, 100 = paga todo)';
