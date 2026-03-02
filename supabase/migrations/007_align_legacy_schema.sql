-- =====================================================
-- MIGRACIÓN 007: Alinear schema con sistema legado (Delphi/MySQL)
-- CPCE Salud — Preparación para importación de datos reales
--
-- Fuente: análisis de camara.exe → tablas os_afil, os_afilg,
--         os_plan, os_nome, os_medicos/medicop, os_categ,
--         os_enferm, os_unidad, os_factura, os_sauto, os_srein, etc.
--
-- PRINCIPIO: Solo cambios ADITIVOS. No se elimina ni renombra nada.
-- =====================================================

-- ─── 1. TABLA: providers (Prestadores) ─────────────
-- Corresponde a: os_medicos + os_medicop del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    legacy_id VARCHAR(30),                    -- medicop_orden / medicos_matricula (ref al sistema viejo)
    name VARCHAR(200) NOT NULL,               -- medicop_denominacion
    cuit VARCHAR(15),                         -- CUIT sin guiones
    enrollment VARCHAR(30),                   -- medicop_matricula (matrícula profesional)
    specialty VARCHAR(100),                   -- medicop_especialidad
    type VARCHAR(30) DEFAULT 'medico'
        CHECK (type IN ('medico', 'odontologo', 'bioquimico', 'clinica', 'sanatorio', 'laboratorio', 'farmacia', 'otro')),
    address TEXT,                             -- medicop_domicilio
    city VARCHAR(100),                        -- medicop_localidad
    phone VARCHAR(100),                       -- medicop_telefonos
    email VARCHAR(255),
    nomenclator_code VARCHAR(30),             -- medicos_nomenclador
    observations TEXT,                        -- medicop_obs
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_enrollment ON providers(enrollment);
CREATE INDEX IF NOT EXISTS idx_providers_cuit ON providers(cuit);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);

-- ─── 2. TABLA: affiliate_categories (Categorías) ───
-- Corresponde a: os_categ del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,         -- categ_codigo
    name VARCHAR(100) NOT NULL,               -- categ_denominacion
    coefficient DECIMAL(6, 4) DEFAULT 1.0,    -- categ_coef (multiplicador de cuota)
    age_limit INT,                            -- categ_edad (edad máxima si aplica)
    monthly_extra DECIMAL(12, 2) DEFAULT 0,   -- categ_otros (cargos adicionales mensuales)
    notes TEXT,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. TABLA: diseases (Enfermedades / CIE) ───────
-- Corresponde a: os_enferm del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diseases (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,         -- enfermedad_codigo
    name VARCHAR(200) NOT NULL,               -- enfermedad_denominacion
    level VARCHAR(20),                        -- enfermedad_nivel (severidad/grupo)
    is_chronic BOOLEAN DEFAULT FALSE,
    requires_authorization BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. COLUMNAS FALTANTES EN affiliates ────────────
-- Datos que el sistema legado tiene y necesitamos recibir
-- ─────────────────────────────────────────────────────

-- Contacto (no existían)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='phone') THEN
        ALTER TABLE affiliates ADD COLUMN phone VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='email') THEN
        ALTER TABLE affiliates ADD COLUMN email VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='address') THEN
        ALTER TABLE affiliates ADD COLUMN address TEXT;            -- domicilio
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='city') THEN
        ALTER TABLE affiliates ADD COLUMN city VARCHAR(100);       -- localidad
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='postal_code') THEN
        ALTER TABLE affiliates ADD COLUMN postal_code VARCHAR(10); -- código postal
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='province') THEN
        ALTER TABLE affiliates ADD COLUMN province VARCHAR(100);   -- provincia
    END IF;
END $$;

-- Identificación fiscal
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='cuit') THEN
        ALTER TABLE affiliates ADD COLUMN cuit VARCHAR(15);        -- CUIT/CUIL sin guiones
    END IF;
END $$;

-- Referencia al sistema legado (CRÍTICO para migración)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='legacy_number') THEN
        ALTER TABLE affiliates ADD COLUMN legacy_number VARCHAR(30);  -- afil_viejo / afil_numero del sistema viejo
    END IF;
END $$;

-- Categoría de afiliado (determina cuota, coeficiente, edad máx.)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='category_id') THEN
        ALTER TABLE affiliates ADD COLUMN category_id INT REFERENCES affiliate_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Médico de cabecera asignado
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='assigned_provider_id') THEN
        ALTER TABLE affiliates ADD COLUMN assigned_provider_id INT REFERENCES providers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Número de certificado (del grupo familiar — afilg_certificado)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='certificate_number') THEN
        ALTER TABLE affiliates ADD COLUMN certificate_number VARCHAR(30);
    END IF;
END $$;

-- Observaciones / notas
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='observations') THEN
        ALTER TABLE affiliates ADD COLUMN observations TEXT;       -- afil_obs
    END IF;
END $$;

-- Deuda de coseguro acumulada
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='copay_debt') THEN
        ALTER TABLE affiliates ADD COLUMN copay_debt DECIMAL(12, 2) DEFAULT 0;  -- afil_deudacoseguro
    END IF;
END $$;

-- Coeficiente de cuota (multiplicador)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='quota_coefficient') THEN
        ALTER TABLE affiliates ADD COLUMN quota_coefficient DECIMAL(6, 4) DEFAULT 1.0;  -- afil_coef
    END IF;
END $$;

-- Convenio / empresa de origen
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='agreement') THEN
        ALTER TABLE affiliates ADD COLUMN agreement VARCHAR(100);  -- afil_convenio
    END IF;
END $$;

-- Congelamiento de cuota
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='frozen_quota') THEN
        ALTER TABLE affiliates ADD COLUMN frozen_quota BOOLEAN DEFAULT FALSE;  -- afil_congela
    END IF;
END $$;

-- Cantidad de hijos declarados
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='children_count') THEN
        ALTER TABLE affiliates ADD COLUMN children_count INT DEFAULT 0;  -- afil_hijos
    END IF;
END $$;

-- Seguro de vida (opt-in)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='has_life_insurance') THEN
        ALTER TABLE affiliates ADD COLUMN has_life_insurance BOOLEAN DEFAULT FALSE;  -- afil_svidao
    END IF;
END $$;

-- Farmacia especial (del grupo familiar — afilg_farmacia/especial)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='special_pharmacy') THEN
        ALTER TABLE affiliates ADD COLUMN special_pharmacy BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Examen médico de ingreso (afilg_emedica)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='medical_exam_done') THEN
        ALTER TABLE affiliates ADD COLUMN medical_exam_done BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ampliar relaciones del grupo familiar
DO $$ BEGIN
    ALTER TABLE affiliates DROP CONSTRAINT IF EXISTS affiliates_relationship_check;
    ALTER TABLE affiliates ADD CONSTRAINT affiliates_relationship_check
        CHECK (relationship IN (
            'Titular', 'Cónyuge', 'Hijo', 'Hijo Estudiante', 'Hijo Discapacidad',
            'Padre', 'Madre', 'Hermano', 'Conviviente', 'A Cargo', 'Otro'
        ));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo actualizar constraint de relationship: %', SQLERRM;
END $$;

-- Índices nuevos
CREATE INDEX IF NOT EXISTS idx_affiliates_legacy ON affiliates(legacy_number);
CREATE INDEX IF NOT EXISTS idx_affiliates_cuit ON affiliates(cuit);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_category ON affiliates(category_id);

-- ─── 5. COLUMNAS FALTANTES EN plans ─────────────────
-- Datos de os_plan del sistema legado
-- ─────────────────────────────────────────────────────

DO $$ BEGIN
    -- Código del plan en sistema legado (plan_codigo)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='legacy_code') THEN
        ALTER TABLE plans ADD COLUMN legacy_code VARCHAR(20);
    END IF;
    -- Empresa / empleador asociado (plan_empresa)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='company') THEN
        ALTER TABLE plans ADD COLUMN company VARCHAR(200);
    END IF;
    -- Nivel del plan (plan_nivel) — para jerarquía de cobertura
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='level') THEN
        ALTER TABLE plans ADD COLUMN level INT DEFAULT 1;
    END IF;
    -- Método de ajuste (plan_ajusta)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='adjustment_type') THEN
        ALTER TABLE plans ADD COLUMN adjustment_type VARCHAR(30);
    END IF;
    -- Descripción del plan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='description') THEN
        ALTER TABLE plans ADD COLUMN description TEXT;
    END IF;
    -- Si es plan especial (PMO, convenio, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='is_special') THEN
        ALTER TABLE plans ADD COLUMN is_special BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ─── 6. COLUMNAS FALTANTES EN practices (nomenclador) ─
-- Datos de os_nome + os_nomea/c/f/p/v del sistema legado
-- ─────────────────────────────────────────────────────

DO $$ BEGIN
    -- Tipo de nomenclador (nome_nomenclador): 'medico','bioquimico','odontologico','farmacia','especial'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='nomenclator_type') THEN
        ALTER TABLE practices ADD COLUMN nomenclator_type VARCHAR(30);
    END IF;
    -- Método de cálculo del precio
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='calculation_method') THEN
        ALTER TABLE practices ADD COLUMN calculation_method VARCHAR(20) DEFAULT 'fijo'
            CHECK (calculation_method IN ('fijo', 'galenos', 'nbu', 'unidades_odontologicas', 'porcentaje'));
    END IF;
    -- Valor en NBU (nome_nbu) — alternativo a unit_quantity para bioquímicos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='nbu_value') THEN
        ALTER TABLE practices ADD COLUMN nbu_value DECIMAL(10, 2);
    END IF;
    -- Fecha de vigencia desde/hasta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='valid_from') THEN
        ALTER TABLE practices ADD COLUMN valid_from DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='valid_to') THEN
        ALTER TABLE practices ADD COLUMN valid_to DATE;
    END IF;
    -- Código viejo del sistema legado (nome_viejo) — CRÍTICO para migración
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='legacy_code') THEN
        ALTER TABLE practices ADD COLUMN legacy_code VARCHAR(30);
    END IF;
    -- Si requiere receta (para farmacia)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='requires_prescription') THEN
        ALTER TABLE practices ADD COLUMN requires_prescription BOOLEAN DEFAULT FALSE;
    END IF;
    -- Datos de medicamento (para prácticas tipo farmacia)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='drug_name') THEN
        ALTER TABLE practices ADD COLUMN drug_name VARCHAR(200);   -- nome_mdroga
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='troquel') THEN
        ALTER TABLE practices ADD COLUMN troquel VARCHAR(30);      -- nome_mtroquel
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='barcode') THEN
        ALTER TABLE practices ADD COLUMN barcode VARCHAR(50);      -- nome_mbarras
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='presentation') THEN
        ALTER TABLE practices ADD COLUMN presentation VARCHAR(200); -- nome_presentacion
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='lab_name') THEN
        ALTER TABLE practices ADD COLUMN lab_name VARCHAR(100);    -- nome_laboratorio
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='is_vaccine') THEN
        ALTER TABLE practices ADD COLUMN is_vaccine BOOLEAN DEFAULT FALSE;  -- nome_mvacuna
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='is_imported') THEN
        ALTER TABLE practices ADD COLUMN is_imported BOOLEAN DEFAULT FALSE;  -- nome_mimportado
    END IF;
    -- Proveedor/prestador habitual de esta práctica
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='default_provider_id') THEN
        ALTER TABLE practices ADD COLUMN default_provider_id INT REFERENCES providers(id) ON DELETE SET NULL;
    END IF;
    -- Días de frecuencia mínima entre prestaciones
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='min_days_between') THEN
        ALTER TABLE practices ADD COLUMN min_days_between INT;     -- nome_dias
    END IF;
    -- Límites anuales (de nomea_/nomer_)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='max_per_year_plan') THEN
        ALTER TABLE practices ADD COLUMN max_per_year_plan JSONB;  -- límites por plan: {"plan_1": 12, "plan_2": 24}
    END IF;
    -- Códigos de referencia cruzada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='federation_code') THEN
        ALTER TABLE practices ADD COLUMN federation_code VARCHAR(30); -- nome_federacion
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='dss_code') THEN
        ALTER TABLE practices ADD COLUMN dss_code VARCHAR(30);     -- nome_dss (Dirección Seguridad Social)
    END IF;
    -- Incluido en ACE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practices' AND column_name='ace_included') THEN
        ALTER TABLE practices ADD COLUMN ace_included BOOLEAN DEFAULT FALSE;  -- nome_ace
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_practices_legacy ON practices(legacy_code);
CREATE INDEX IF NOT EXISTS idx_practices_nomenclator_type ON practices(nomenclator_type);
CREATE INDEX IF NOT EXISTS idx_practices_troquel ON practices(troquel);
CREATE INDEX IF NOT EXISTS idx_practices_barcode ON practices(barcode);

-- ─── 7. TABLA: authorizations (Autorizaciones) ─────
-- Corresponde a: os_sauto + os_sautod del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authorizations (
    id SERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    family_member_relation VARCHAR(30),       -- sauto_parentesco
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    provider_id INT REFERENCES providers(id) ON DELETE SET NULL,  -- sauto_prestador
    requesting_doctor_id INT REFERENCES providers(id) ON DELETE SET NULL,  -- sauto_medico
    authorization_number VARCHAR(30),         -- sauto_numero (número de autorización)
    type VARCHAR(30),                         -- sauto_tipo (tipo de prestación)
    disease_id INT REFERENCES diseases(id) ON DELETE SET NULL,    -- sauto_enfermedad
    is_oncology BOOLEAN DEFAULT FALSE,        -- sauto_oncologico
    is_hospitalization BOOLEAN DEFAULT FALSE, -- sauto_internacion
    status VARCHAR(30) DEFAULT 'pendiente'
        CHECK (status IN ('pendiente', 'aprobada', 'rechazada', 'anulada', 'vencida')),
    request_date DATE,                        -- sauto_fecha
    resolution_date DATE,                     -- sauto_fechai
    total_amount DECIMAL(14, 2),              -- sauto_total
    balance DECIMAL(14, 2),                   -- sauto_saldo
    is_reimbursement BOOLEAN DEFAULT FALSE,   -- sauto_reintegro
    is_direct BOOLEAN DEFAULT FALSE,          -- sauto_directo
    is_provisional BOOLEAN DEFAULT FALSE,     -- sauto_provisorio
    observations TEXT,                        -- sauto_obs
    legacy_number VARCHAR(30),                -- referencia al sistema viejo
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authorizations_affiliate ON authorizations(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_status ON authorizations(status);
CREATE INDEX IF NOT EXISTS idx_authorizations_number ON authorizations(authorization_number);

-- ─── 8. TABLA: authorization_details (Detalle Autoriz.) ─
-- Corresponde a: os_sautod del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authorization_details (
    id SERIAL PRIMARY KEY,
    authorization_id INT REFERENCES authorizations(id) ON DELETE CASCADE,
    practice_id BIGINT REFERENCES practices(id) ON DELETE SET NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12, 2),
    total_price DECIMAL(12, 2),
    coverage_percent INT,
    covered_amount DECIMAL(12, 2),
    copay DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'pendiente',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. TABLA: invoices (Facturación de prestadores) ─
-- Corresponde a: os_factura + os_facturad del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    provider_id INT REFERENCES providers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(30),               -- factura_numero
    invoice_type VARCHAR(5),                  -- factura_letra (A, B, C)
    point_of_sale VARCHAR(10),                -- factura_sucursal
    cuit VARCHAR(15),                         -- factura_cuit
    period_month INT,                         -- factura_mes
    period_year INT,                          -- factura_ano
    invoice_date DATE,                        -- factura_fecha
    due_date DATE,                            -- factura_fechav
    subtotal DECIMAL(14, 2),                  -- factura_total
    tax_amount DECIMAL(14, 2) DEFAULT 0,      -- factura_iva
    withholdings DECIMAL(14, 2) DEFAULT 0,    -- factura_ganancias
    discounts DECIMAL(14, 2) DEFAULT 0,       -- factura_descuentos
    total DECIMAL(14, 2),                     -- factura_total (neto)
    balance DECIMAL(14, 2) DEFAULT 0,         -- factura_saldo
    coseguro DECIMAL(14, 2) DEFAULT 0,        -- factura_coseguro
    status VARCHAR(20) DEFAULT 'pendiente'
        CHECK (status IN ('pendiente', 'pagada', 'parcial', 'anulada', 'en_disputa')),
    payment_date DATE,                        -- factura_fechar
    observations TEXT,                        -- factura_obs
    legacy_number VARCHAR(30),
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_year, period_month);

-- ─── 10. TABLA: invoice_details (Detalle de factura) ─
-- Corresponde a: os_facturad del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_details (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    practice_id BIGINT REFERENCES practices(id) ON DELETE SET NULL,
    authorization_id INT REFERENCES authorizations(id) ON DELETE SET NULL,
    family_member_relation VARCHAR(30),
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12, 2),
    total_price DECIMAL(12, 2),
    coverage_percent INT,
    debit_amount DECIMAL(12, 2) DEFAULT 0,    -- débito por diferencia arancelaria
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 11. TABLA: hospitalizations (Internaciones) ────
-- Corresponde a: os_interna del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitalizations (
    id SERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    family_member_relation VARCHAR(30),       -- interna_parentesco
    type VARCHAR(30),                         -- interna_tipo (tipo de internación)
    hospitalization_type VARCHAR(50),         -- interna_tinterna (ej: quirúrgica, clínica)
    facility_id INT REFERENCES providers(id) ON DELETE SET NULL,  -- interna_sanatorio
    room VARCHAR(30),                         -- interna_habitacion
    attending_doctor_id INT REFERENCES providers(id) ON DELETE SET NULL, -- interna_medico
    admission_date DATE,                      -- interna_fecha
    admission_time TIME,                      -- interna_horai
    discharge_date DATE,                      -- interna_fechae
    discharge_time TIME,                      -- interna_horae
    destination VARCHAR(100),                 -- interna_destino (alta / traslado)
    coseguro DECIMAL(12, 2) DEFAULT 0,        -- interna_coseguro
    observations TEXT,                        -- interna_obs
    legacy_number VARCHAR(30),
    authorization_id INT REFERENCES authorizations(id) ON DELETE SET NULL,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospitalizations_affiliate ON hospitalizations(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_dates ON hospitalizations(admission_date, discharge_date);

-- ─── 12. TABLA: pharmacy_records (Farmacia) ─────────
-- Corresponde a: os_colegf del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_records (
    id SERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    family_member_relation VARCHAR(30),       -- colegf_parentesco
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    pharmacy_id INT REFERENCES providers(id) ON DELETE SET NULL,  -- colegf_farmacia
    prescriber_id INT REFERENCES providers(id) ON DELETE SET NULL, -- colegf_medico (matricula)
    practice_id BIGINT REFERENCES practices(id) ON DELETE SET NULL, -- el medicamento como práctica
    troquel VARCHAR(30),                      -- colegf_troquel
    drug_trade_name VARCHAR(200),             -- colegf_comercial
    drug_active_name VARCHAR(200),            -- colegf_pactivo
    lab_name VARCHAR(100),                    -- colegf_laboratorio
    presentation VARCHAR(200),                -- colegf_presentacion
    quantity INT DEFAULT 1,                   -- colegf_cantidad
    unit_price DECIMAL(12, 2),                -- colegf_unitario
    total DECIMAL(12, 2),                     -- colegf_total
    discount_percent DECIMAL(5, 2) DEFAULT 0, -- colegf_dgto
    patient_copay DECIMAL(12, 2) DEFAULT 0,   -- colegf_acargo
    os_contribution DECIMAL(12, 2) DEFAULT 0, -- colegf_aporte
    prescription_number VARCHAR(30),          -- colegf_rp
    therapeutic_action VARCHAR(200),          -- colegf_aterapeutica
    dispense_date DATE,                       -- colegf_fecha
    registration VARCHAR(30),                 -- colegf_registro
    sequence VARCHAR(20),                     -- colegf_secuencia
    file_reference VARCHAR(100),              -- colegf_archivo
    legacy_number VARCHAR(30),
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_affiliate ON pharmacy_records(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_troquel ON pharmacy_records(troquel);
CREATE INDEX IF NOT EXISTS idx_pharmacy_date ON pharmacy_records(dispense_date);

-- ─── 13. TABLA: lab_orders (Órdenes Bioquímicas) ────
-- Corresponde a: os_bioquimico + os_bioquimicod del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_orders (
    id SERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    family_member_relation VARCHAR(30),       -- bioquimico_parentesco
    document_number VARCHAR(20),              -- bioquimico_documento
    prescription_number VARCHAR(30),          -- bioquimico_receta
    diagnosis VARCHAR(200),                   -- bioquimico_diagnostico
    order_date DATE,                          -- bioquimico_fecha
    processing_date DATE,                     -- bioquimico_fechai
    is_direct BOOLEAN DEFAULT FALSE,          -- bioquimico_directo
    is_authorized BOOLEAN DEFAULT FALSE,      -- bioquimico_autorizado
    authorized_by VARCHAR(100),               -- bioquimico_autorizadou
    authorized_date DATE,                     -- bioquimico_autorizadof
    is_void BOOLEAN DEFAULT FALSE,            -- bioquimico_anulado
    status VARCHAR(20) DEFAULT 'pendiente'
        CHECK (status IN ('pendiente', 'procesada', 'autorizada', 'anulada')),
    observations TEXT,                        -- bioquimico_obs
    legacy_number VARCHAR(30),
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_affiliate ON lab_orders(affiliate_id);

-- ─── 14. TABLA: reimbursements (Reintegros) ─────────
-- Corresponde a: os_srein + os_sreind del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reimbursements (
    id SERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    family_member_relation VARCHAR(30),       -- srein_parentesco
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    provider_id INT REFERENCES providers(id) ON DELETE SET NULL,  -- srein_prestador
    type VARCHAR(30),                         -- srein_tipo
    disease_id INT REFERENCES diseases(id) ON DELETE SET NULL,
    is_hospitalization BOOLEAN DEFAULT FALSE, -- srein_internacion
    is_oncology BOOLEAN DEFAULT FALSE,        -- srein_oncologico
    is_dental BOOLEAN DEFAULT FALSE,          -- srein_odontologico
    request_date DATE,                        -- srein_fecha
    resolution_date DATE,                     -- srein_fechar
    status VARCHAR(30) DEFAULT 'pendiente'
        CHECK (status IN ('pendiente', 'aprobado', 'rechazado', 'pagado', 'anulado')),
    total_amount DECIMAL(14, 2),              -- srein_total
    approved_amount DECIMAL(14, 2),           -- srein_final
    balance DECIMAL(14, 2),                   -- srein_saldo
    payment_method VARCHAR(30),               -- srein_fpago
    cbu VARCHAR(30),                          -- srein_cbu
    observations TEXT,                        -- srein_obs
    claim_status VARCHAR(30),                 -- srein_reclamo (si hubo reclamo)
    legacy_number VARCHAR(30),
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimbursements_affiliate ON reimbursements(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON reimbursements(status);

-- ─── 15. TABLA: medical_records (Historia Clínica) ──
-- Corresponde a: os_hclinica + os_hclinicad del sistema legado
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    family_member_relation VARCHAR(30),
    practice_id BIGINT REFERENCES practices(id) ON DELETE SET NULL, -- hclinica_nomenclador
    description TEXT,                         -- hclinica_denominacion
    clinical_data JSONB DEFAULT '{}'::jsonb,  -- hclinica_cuadro (datos clínicos)
    calculation_data JSONB,                   -- hclinica_calculo
    record_order INT,                         -- hclinica_orden
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_affiliate ON medical_records(affiliate_id);

-- ─── 16. COLUMNAS EXTRA EN audits ───────────────────
-- Para vincular con autorizaciones y prestadores
-- ─────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='provider_id') THEN
        ALTER TABLE audits ADD COLUMN provider_id INT REFERENCES providers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='authorization_id') THEN
        ALTER TABLE audits ADD COLUMN authorization_id INT REFERENCES authorizations(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='disease_id') THEN
        ALTER TABLE audits ADD COLUMN disease_id INT REFERENCES diseases(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='family_member_relation') THEN
        ALTER TABLE audits ADD COLUMN family_member_relation VARCHAR(30);
    END IF;
END $$;

-- =====================================================
-- FIN MIGRACIÓN 007
-- =====================================================
