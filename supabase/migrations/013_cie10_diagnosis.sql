-- =====================================================
-- MIGRACIÓN 013: DIAGNÓSTICO CIE-10 + COLUMNAS FALTANTES
-- Agrega diagnosis_code/diagnosis_description a expedients
-- Carga datos CIE-10 de ejemplo en diseases
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. Columnas de diagnóstico en la cabecera del expediente
-- ─────────────────────────────────────────────────────
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(20);
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS diagnosis_description TEXT;
ALTER TABLE expedients ADD COLUMN IF NOT EXISTS disease_id INT REFERENCES diseases(id);

-- ─────────────────────────────────────────────────────
-- 2. Datos CIE-10 de ejemplo (diagnósticos más frecuentes
--    en auditoría médica de obra social)
-- ─────────────────────────────────────────────────────

-- Limpiamos duplicados posibles
DELETE FROM diseases WHERE code LIKE 'A%' OR code LIKE 'B%' OR code LIKE 'C%'
    OR code LIKE 'D%' OR code LIKE 'E%' OR code LIKE 'F%'
    OR code LIKE 'G%' OR code LIKE 'H%' OR code LIKE 'I%'
    OR code LIKE 'J%' OR code LIKE 'K%' OR code LIKE 'L%'
    OR code LIKE 'M%' OR code LIKE 'N%' OR code LIKE 'O%'
    OR code LIKE 'P%' OR code LIKE 'Q%' OR code LIKE 'R%'
    OR code LIKE 'S%' OR code LIKE 'T%' OR code LIKE 'Z%';

INSERT INTO diseases (code, name, level, is_chronic, requires_authorization) VALUES
-- ── Infecciosas (A/B) ──
('A09', 'Gastroenteritis infecciosa', 'A', false, false),
('A15', 'Tuberculosis respiratoria', 'A', true, true),
('A49', 'Infección bacteriana no especificada', 'A', false, false),
('B18', 'Hepatitis viral crónica', 'B', true, true),
('B24', 'Enfermedad por VIH', 'B', true, true),
('B34', 'Infección viral no especificada', 'B', false, false),
('B37', 'Candidiasis', 'B', false, false),
-- ── Neoplasias (C/D) ──
('C18', 'Neoplasia maligna del colon', 'C', true, true),
('C34', 'Neoplasia maligna del pulmón', 'C', true, true),
('C50', 'Neoplasia maligna de mama', 'C', true, true),
('C61', 'Neoplasia maligna de próstata', 'C', true, true),
('C67', 'Neoplasia maligna de vejiga', 'C', true, true),
('C73', 'Neoplasia maligna de tiroides', 'C', true, true),
('C85', 'Linfoma no Hodgkin', 'C', true, true),
('C91', 'Leucemia linfoblástica', 'C', true, true),
('D50', 'Anemia por deficiencia de hierro', 'D', false, false),
('D64', 'Anemia no especificada', 'D', false, false),
-- ── Endocrinas (E) ──
('E03', 'Hipotiroidismo', 'E', true, false),
('E05', 'Hipertiroidismo', 'E', true, true),
('E10', 'Diabetes mellitus tipo 1', 'E', true, true),
('E11', 'Diabetes mellitus tipo 2', 'E', true, false),
('E13', 'Diabetes mellitus no especificada', 'E', true, false),
('E20', 'Hipoparatiroidismo', 'E', true, true),
('E28', 'Disfunción ovárica', 'E', false, false),
('E29', 'Disfunción testicular', 'E', false, false),
('E34', 'Trastorno endocrino no especificado', 'E', false, false),
('E66', 'Obesidad', 'E', true, false),
('E78', 'Trastornos del metabolismo de lipoproteínas', 'E', true, false),
('E83', 'Trastornos del metabolismo de minerales', 'E', false, false),
('E87', 'Trastornos del equilibrio hídrico-electrolítico', 'E', false, false),
-- ── Trastornos mentales (F) ──
('F10', 'Trastornos mentales por uso de alcohol', 'F', true, true),
('F20', 'Esquizofrenia', 'F', true, true),
('F31', 'Trastorno afectivo bipolar', 'F', true, true),
('F32', 'Episodio depresivo', 'F', false, false),
('F33', 'Trastorno depresivo recurrente', 'F', true, true),
('F40', 'Trastornos fóbicos de ansiedad', 'F', false, false),
('F41', 'Trastorno de ansiedad generalizada', 'F', true, false),
('F43', 'Reacción al estrés y trastornos de adaptación', 'F', false, false),
('F84', 'Trastornos generalizados del desarrollo (TEA)', 'F', true, true),
('F90', 'Trastorno por déficit de atención (TDAH)', 'F', true, true),
-- ── Sistema nervioso (G) ──
('G20', 'Enfermedad de Parkinson', 'G', true, true),
('G30', 'Enfermedad de Alzheimer', 'G', true, true),
('G35', 'Esclerosis múltiple', 'G', true, true),
('G40', 'Epilepsia', 'G', true, true),
('G43', 'Migraña', 'G', true, false),
('G47', 'Trastornos del sueño', 'G', false, false),
('G54', 'Trastornos de raíces y plexos nerviosos', 'G', false, false),
('G56', 'Síndrome del túnel carpiano', 'G', false, false),
-- ── Ojo y anexos (H00-H59) ──
('H10', 'Conjuntivitis', 'H', false, false),
('H25', 'Catarata senil', 'H', false, true),
('H26', 'Catarata no especificada', 'H', false, true),
('H33', 'Desprendimiento de retina', 'H', false, true),
('H40', 'Glaucoma', 'H', true, true),
('H52', 'Trastornos de la refracción', 'H', false, false),
-- ── Oído (H60-H95) ──
('H65', 'Otitis media no supurativa', 'H', false, false),
('H66', 'Otitis media supurativa', 'H', false, false),
('H90', 'Hipoacusia conductiva y neurosensorial', 'H', true, true),
-- ── Aparato circulatorio (I) ──
('I10', 'Hipertensión arterial esencial', 'I', true, false),
('I11', 'Enfermedad cardíaca hipertensiva', 'I', true, false),
('I20', 'Angina de pecho', 'I', true, true),
('I21', 'Infarto agudo de miocardio', 'I', false, true),
('I25', 'Enfermedad isquémica crónica del corazón', 'I', true, true),
('I42', 'Cardiomiopatía', 'I', true, true),
('I48', 'Fibrilación auricular', 'I', true, true),
('I50', 'Insuficiencia cardíaca', 'I', true, true),
('I63', 'Accidente cerebrovascular isquémico', 'I', false, true),
('I64', 'ACV no especificado', 'I', false, true),
('I73', 'Enfermedad vascular periférica', 'I', true, false),
('I80', 'Tromboflebitis', 'I', false, false),
('I83', 'Venas varicosas de miembros inferiores', 'I', false, false),
-- ── Aparato respiratorio (J) ──
('J00', 'Rinofaringitis aguda (resfrío)', 'J', false, false),
('J02', 'Faringitis aguda', 'J', false, false),
('J03', 'Amigdalitis aguda', 'J', false, false),
('J06', 'Infección aguda de vías respiratorias superiores', 'J', false, false),
('J10', 'Influenza (gripe)', 'J', false, false),
('J15', 'Neumonía bacteriana', 'J', false, false),
('J18', 'Neumonía no especificada', 'J', false, false),
('J20', 'Bronquitis aguda', 'J', false, false),
('J30', 'Rinitis alérgica', 'J', true, false),
('J31', 'Rinitis crónica', 'J', true, false),
('J34', 'Desviación del tabique nasal', 'J', false, true),
('J40', 'Bronquitis crónica', 'J', true, false),
('J44', 'EPOC', 'J', true, true),
('J45', 'Asma', 'J', true, true),
-- ── Aparato digestivo (K) ──
('K02', 'Caries dental', 'K', false, false),
('K04', 'Enfermedades de la pulpa dental', 'K', false, false),
('K05', 'Gingivitis y enfermedad periodontal', 'K', false, false),
('K21', 'Enfermedad por reflujo gastroesofágico', 'K', true, false),
('K25', 'Úlcera gástrica', 'K', false, false),
('K29', 'Gastritis', 'K', false, false),
('K35', 'Apendicitis aguda', 'K', false, true),
('K40', 'Hernia inguinal', 'K', false, true),
('K50', 'Enfermedad de Crohn', 'K', true, true),
('K51', 'Colitis ulcerosa', 'K', true, true),
('K57', 'Enfermedad diverticular del intestino', 'K', false, false),
('K59', 'Trastornos funcionales del intestino', 'K', false, false),
('K70', 'Enfermedad hepática alcohólica', 'K', true, true),
('K74', 'Fibrosis y cirrosis hepática', 'K', true, true),
('K76', 'Hígado graso no alcohólico', 'K', true, false),
('K80', 'Colelitiasis (cálculos biliares)', 'K', false, true),
('K81', 'Colecistitis', 'K', false, true),
('K85', 'Pancreatitis aguda', 'K', false, true),
('K86', 'Pancreatitis crónica', 'K', true, true),
-- ── Piel (L) ──
('L20', 'Dermatitis atópica', 'L', true, false),
('L23', 'Dermatitis alérgica de contacto', 'L', false, false),
('L40', 'Psoriasis', 'L', true, true),
('L50', 'Urticaria', 'L', false, false),
('L70', 'Acné', 'L', false, false),
-- ── Aparato locomotor (M) ──
('M06', 'Artritis reumatoide', 'M', true, true),
('M10', 'Gota', 'M', true, false),
('M15', 'Artrosis generalizada', 'M', true, false),
('M16', 'Artrosis de cadera', 'M', true, true),
('M17', 'Artrosis de rodilla', 'M', true, true),
('M23', 'Trastorno interno de la rodilla (menisco)', 'M', false, true),
('M32', 'Lupus eritematoso sistémico', 'M', true, true),
('M45', 'Espondilitis anquilosante', 'M', true, true),
('M47', 'Espondilosis (artrosis vertebral)', 'M', true, false),
('M50', 'Trastornos del disco cervical', 'M', false, false),
('M51', 'Trastornos del disco lumbar / hernia de disco', 'M', false, true),
('M54', 'Dorsalgia / Lumbalgia', 'M', false, false),
('M62', 'Trastornos musculares', 'M', false, false),
('M65', 'Sinovitis y tenosinovitis', 'M', false, false),
('M75', 'Trastornos del hombro', 'M', false, false),
('M79', 'Fibromialgia', 'M', true, false),
('M80', 'Osteoporosis con fractura patológica', 'M', true, true),
('M81', 'Osteoporosis sin fractura', 'M', true, false),
-- ── Aparato genitourinario (N) ──
('N10', 'Nefritis tubulointersticial aguda (pielonefritis)', 'N', false, false),
('N17', 'Insuficiencia renal aguda', 'N', false, true),
('N18', 'Insuficiencia renal crónica', 'N', true, true),
('N20', 'Cálculos renales (litiasis)', 'N', false, true),
('N30', 'Cistitis', 'N', false, false),
('N39', 'Infección urinaria no especificada', 'N', false, false),
('N40', 'Hiperplasia de próstata', 'N', true, false),
('N41', 'Prostatitis', 'N', false, false),
('N60', 'Displasia mamaria benigna', 'N', false, false),
('N76', 'Vaginitis aguda', 'N', false, false),
('N80', 'Endometriosis', 'N', true, true),
('N83', 'Quiste de ovario', 'N', false, true),
('N92', 'Menstruación excesiva', 'N', false, false),
('N95', 'Trastornos menopaúsicos', 'N', false, false),
-- ── Embarazo y parto (O) ──
('O20', 'Hemorragia precoz del embarazo', 'O', false, true),
('O24', 'Diabetes gestacional', 'O', false, true),
('O26', 'Atención materna por otras complicaciones del embarazo', 'O', false, false),
('O34', 'Atención materna por anomalía uterina', 'O', false, true),
('O42', 'Ruptura prematura de membranas', 'O', false, true),
('O47', 'Falso trabajo de parto', 'O', false, false),
('O80', 'Parto único espontáneo', 'O', false, false),
('O82', 'Parto por cesárea', 'O', false, true),
-- ── Perinatales (P) ──
('P07', 'Recién nacido prematuro', 'P', false, true),
('P22', 'Dificultad respiratoria del recién nacido', 'P', false, true),
('P59', 'Ictericia neonatal', 'P', false, false),
-- ── Malformaciones (Q) ──
('Q21', 'Malformaciones congénitas del tabique cardíaco', 'Q', true, true),
('Q35', 'Fisura del paladar', 'Q', false, true),
('Q65', 'Displasia congénita de cadera', 'Q', false, true),
('Q66', 'Pie equinovaro', 'Q', false, true),
-- ── Síntomas y signos (R) ──
('R00', 'Taquicardia no especificada', 'R', false, false),
('R05', 'Tos', 'R', false, false),
('R06', 'Disnea', 'R', false, false),
('R07', 'Dolor de garganta / dolor torácico', 'R', false, false),
('R10', 'Dolor abdominal', 'R', false, false),
('R11', 'Náuseas y vómitos', 'R', false, false),
('R42', 'Vértigo / mareos', 'R', false, false),
('R50', 'Fiebre de origen desconocido', 'R', false, false),
('R51', 'Cefalea', 'R', false, false),
('R53', 'Malestar y fatiga', 'R', false, false),
('R56', 'Convulsiones', 'R', false, true),
('R73', 'Nivel elevado de glucosa en sangre', 'R', false, false),
-- ── Traumatismos (S/T) ──
('S02', 'Fractura de huesos del cráneo y de la cara', 'S', false, true),
('S06', 'Traumatismo intracraneal', 'S', false, true),
('S22', 'Fractura de costillas / esternón', 'S', false, false),
('S32', 'Fractura de columna lumbar / pelvis', 'S', false, true),
('S42', 'Fractura de hombro / brazo', 'S', false, true),
('S52', 'Fractura de antebrazo', 'S', false, true),
('S62', 'Fractura de muñeca / mano', 'S', false, false),
('S72', 'Fractura de fémur', 'S', false, true),
('S82', 'Fractura de pierna (tibia/peroné)', 'S', false, true),
('S83', 'Luxación / esguince de rodilla', 'S', false, false),
('S93', 'Esguince de tobillo', 'S', false, false),
('T14', 'Traumatismo no especificado', 'T', false, false),
('T78', 'Reacción alérgica no especificada', 'T', false, false),
('T81', 'Complicaciones de procedimientos', 'T', false, true),
-- ── Factores de salud (Z) ──
('Z00', 'Examen general de salud de rutina', 'Z', false, false),
('Z01', 'Examen especial (dental, ojos, oídos, etc.)', 'Z', false, false),
('Z09', 'Control de seguimiento postratamiento', 'Z', false, false),
('Z12', 'Control de detección de neoplasias', 'Z', false, false),
('Z30', 'Anticoncepción', 'Z', false, false),
('Z32', 'Control de embarazo', 'Z', false, false),
('Z34', 'Supervisión de embarazo normal', 'Z', false, false),
('Z35', 'Supervisión de embarazo de alto riesgo', 'Z', false, true),
('Z71', 'Consulta de asesoramiento', 'Z', false, false),
('Z76', 'Contacto con los servicios de salud por otras circunstancias', 'Z', false, false),
('Z96', 'Presencia de implantes funcionales', 'Z', false, false)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- 3. Índice para búsqueda rápida de diagnósticos
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_diseases_code ON diseases(code);
CREATE INDEX IF NOT EXISTS idx_diseases_name ON diseases(name);
CREATE INDEX IF NOT EXISTS idx_expedients_diagnosis ON expedients(diagnosis_code);

-- ═══════════════════════════════════════
-- FIN DE MIGRACIÓN 013
-- ═══════════════════════════════════════
