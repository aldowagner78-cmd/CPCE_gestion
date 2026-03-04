BEGIN;
INSERT INTO diseases (code, name, classification) VALUES
('XD5QV8', 'Oxímetros de Pulso, de Punta de Dedo', 'category', false, false, 'CIE-11'),
('XD8QY1', 'Bombas de Infusión', 'category', false, false, 'CIE-11'),
('XD4CT3', 'Bombas de Infusión, Volumétricas', 'category', false, false, 'CIE-11'),
('XD52M6', 'Bombas de infusión, Volumétricas, Resonancia Magnética Nuclear', 'category', false, false, 'CIE-11'),
('XD8DH3', 'Bombas de Infusión, Nutrición Enteral', 'category', false, false, 'CIE-11'),
('XD36Q1', 'Bombas de Infusión, Jeringa', 'category', false, false, 'CIE-11'),
('XD1N14', 'Bombas de infusión, Jeringa, Resonancia Magnética Nuclear', 'category', false, false, 'CIE-11'),
('XD80Z7', 'Sistemas de gases médicos / medicinales y accesorios relacionados', 'category', false, false, 'CIE-11'),
('XD4U38', 'Electrocardiógrafos de uso general', 'category', false, false, 'CIE-11'),
('XD6UU3', 'Concentradores de oxigeno', 'category', false, false, 'CIE-11');
ON CONFLICT (code) DO NOTHING;
COMMIT;