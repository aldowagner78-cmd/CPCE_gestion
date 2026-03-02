-- =====================================================
-- MIGRACIÓN 008: Tabla de Protocolos Médicos
-- Reemplaza los protocolos hardcodeados con datos en Supabase
-- =====================================================

CREATE TABLE IF NOT EXISTS protocols (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    applies_to VARCHAR(200),
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocols_category ON protocols(category);
CREATE INDEX IF NOT EXISTS idx_protocols_jurisdiction ON protocols(jurisdiction_id);

-- Insertar los 6 protocolos iniciales (antes hardcodeados)
INSERT INTO protocols (title, category, description, applies_to, jurisdiction_id) VALUES
('Autorización previa — Cirugías programadas', 'Autorización', 'Toda cirugía programada requiere autorización previa del auditor médico con documentación completa: orden médica, estudios prequirúrgicos, y presupuesto del prestador.', 'Cirugía', 1),
('Período de carencia — Prácticas de alta complejidad', 'Carencia', 'Las prácticas de alta complejidad (RMN, TAC, cateterismo) tienen un período de carencia de 3 meses desde el alta del afiliado.', 'Diagnóstico por imágenes', 1),
('Tope mensual de consultas', 'Frecuencia', 'Se cubren hasta 4 consultas médicas por mes por afiliado. A partir de la 5ta consulta se requiere justificación del médico tratante.', 'Consultas', 1),
('Cobertura de medicamentos — Crónicos', 'Medicamentos', 'Los afiliados con enfermedades crónicas (diabetes, hipertensión, EPOC) tienen cobertura del 70% en medicamentos con receta actualizada cada 6 meses.', 'Farmacia', 1),
('Prótesis y órtesis — Presupuesto comparativo', 'Autorización', 'La provisión de prótesis u órtesis requiere al menos 2 presupuestos de proveedores diferentes y autorización del Comité de Prestaciones.', 'Prótesis', 1),
('Emergencias — Cobertura directa', 'Emergencia', 'Las emergencias médicas tienen cobertura directa al 100% sin necesidad de autorización previa, tanto en prestadores de red como fuera de red.', 'Urgencia', 1)
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

-- Política de lectura para usuarios autenticados
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocols' AND policyname = 'protocols_select_authenticated') THEN
        CREATE POLICY protocols_select_authenticated ON protocols FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- Política de escritura para admin/superuser
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocols' AND policyname = 'protocols_insert_admin') THEN
        CREATE POLICY protocols_insert_admin ON protocols FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocols' AND policyname = 'protocols_update_admin') THEN
        CREATE POLICY protocols_update_admin ON protocols FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocols' AND policyname = 'protocols_delete_admin') THEN
        CREATE POLICY protocols_delete_admin ON protocols FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE protocols;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
