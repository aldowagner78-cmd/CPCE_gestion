-- ============================================================
-- Migración 024: Agregar rule_classification a expedient_practices
-- Clasificación extendida del semáforo (7 niveles)
-- ============================================================

ALTER TABLE expedient_practices
ADD COLUMN IF NOT EXISTS rule_classification VARCHAR(30)
CHECK (rule_classification IN (
    'auto_aprobable',
    'requiere_revision',
    'sin_cobertura',
    'limite_excedido',
    'requiere_mesa_control',
    'duplicada_reciente',
    'carencia'
));

-- ============================================================
-- FIN MIGRACIÓN 024
-- ============================================================
