-- =====================================================
-- CPCE SALUD - MIGRACIÓN: Eliminar Nomencladores Hardcodeados
-- Ejecutar en Supabase SQL Editor
-- =====================================================
-- Esta migración elimina los nomencladores de ejemplo (NUN, FAAAR, IAPOS)
-- para que el usuario pueda crear sus propios nomencladores desde cero

-- Eliminar prácticas externas asociadas primero (cascada)
DELETE FROM external_practices 
WHERE nomenclator_id IN (
    SELECT id FROM external_nomenclators 
    WHERE code IN ('NUN', 'FAAAR', 'IAPOS')
);

-- Eliminar nomencladores hardcodeados
DELETE FROM external_nomenclators 
WHERE code IN ('NUN', 'FAAAR', 'IAPOS');

-- Verificar que la tabla esté vacía
DO $$ 
BEGIN
    IF (SELECT COUNT(*) FROM external_nomenclators) = 0 THEN
        RAISE NOTICE '✅ Nomencladores de ejemplo eliminados. Tabla limpia.';
    ELSE
        RAISE NOTICE '⚠️  Aún hay nomencladores en la tabla.';
    END IF;
END $$;
