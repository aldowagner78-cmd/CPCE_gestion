-- =====================================================
-- MIGRACIÓN 006: Sistema de Roles, Permisos, Recaudación, Anuncios
-- CPCE Salud — Fase 1
-- =====================================================

-- ─── 1. ROLES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- roles del sistema no se pueden borrar
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, display_name, description, is_system) VALUES
    ('superuser',      'Superusuario',   'Acceso total al sistema. Ambas jurisdicciones.', TRUE),
    ('admin',          'Administrador',  'Gestión completa dentro de su jurisdicción.', TRUE),
    ('auditor',        'Auditor Médico', 'Auditorías, calculadora, protocolos. Pacientes solo lectura.', TRUE),
    ('administrativo', 'Administrativo', 'Pacientes, turnos, chat. Sin acceso a auditoría.', TRUE),
    ('gerencia',       'Gerencia',       'Dashboard ejecutivo, estadísticas, reportes. Solo lectura.', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ─── 2. PERMISOS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    UNIQUE(module, action)
);

INSERT INTO permissions (module, action, description) VALUES
    -- Dashboard
    ('dashboard', 'view',       'Ver dashboard y KPIs'),
    -- Calculadora
    ('calculator', 'use',       'Usar calculadora de cobertura'),
    -- Nomencladores
    ('nomenclators', 'view',    'Ver nomencladores'),
    ('nomenclators', 'manage',  'Crear/editar nomencladores'),
    -- Auditorías
    ('audits', 'view',          'Ver historial de auditorías'),
    ('audits', 'create',        'Crear nuevas auditorías'),
    ('audits', 'approve',       'Aprobar/rechazar auditorías'),
    -- Alertas
    ('alerts', 'view',          'Ver alertas presupuestarias'),
    ('alerts', 'resolve',       'Resolver/descartar alertas'),
    -- Chat
    ('chat', 'all_channels',    'Acceder a todos los canales de chat'),
    ('chat', 'direct_only',     'Solo mensajes directos'),
    -- Agenda
    ('agenda', 'view',          'Ver agenda de eventos'),
    ('agenda', 'create',        'Crear eventos en agenda'),
    -- Pacientes
    ('patients', 'view',        'Ver padrón de afiliados'),
    ('patients', 'manage',      'Crear/editar afiliados'),
    -- Configuración
    ('config', 'view',          'Ver configuración general'),
    ('config', 'values',        'Modificar valores de unidades'),
    -- Usuarios
    ('users', 'manage',         'Gestionar usuarios del sistema'),
    -- Backup
    ('backup', 'export',        'Exportar datos / backup'),
    -- Homologador
    ('matcher', 'use',          'Usar homologador de nomencladores'),
    -- Pendientes
    ('pending', 'view',         'Ver prácticas pendientes'),
    -- Protocolos
    ('protocols', 'view',       'Ver protocolos clínicos'),
    -- Estadísticas (futuro)
    ('stats', 'view',           'Ver estadísticas avanzadas'),
    -- Recaudación
    ('revenue', 'view',         'Ver recaudación por plan'),
    ('revenue', 'manage',       'Cargar/editar recaudación')
ON CONFLICT (module, action) DO NOTHING;

-- ─── 3. ROLE_PERMISSIONS (asignación) ───────────────
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Función helper para asignar permisos por nombre de rol y módulo.acción
CREATE OR REPLACE FUNCTION assign_permission(p_role VARCHAR, p_module VARCHAR, p_action VARCHAR)
RETURNS VOID AS $$
BEGIN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = p_role AND p.module = p_module AND p.action = p_action
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- SUPERUSER: todo
DO $$
DECLARE perm RECORD;
BEGIN
    FOR perm IN SELECT id FROM permissions LOOP
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, perm.id FROM roles r WHERE r.name = 'superuser'
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ADMIN: todo excepto users.manage (lo gestiona superuser)
DO $$
DECLARE perm RECORD;
BEGIN
    FOR perm IN SELECT p.id FROM permissions p WHERE NOT (p.module = 'users' AND p.action = 'manage') LOOP
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, perm.id FROM roles r WHERE r.name = 'admin'
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- AUDITOR
SELECT assign_permission('auditor', 'dashboard', 'view');
SELECT assign_permission('auditor', 'calculator', 'use');
SELECT assign_permission('auditor', 'nomenclators', 'view');
SELECT assign_permission('auditor', 'audits', 'view');
SELECT assign_permission('auditor', 'audits', 'create');
SELECT assign_permission('auditor', 'alerts', 'view');
SELECT assign_permission('auditor', 'chat', 'direct_only');
SELECT assign_permission('auditor', 'agenda', 'view');
SELECT assign_permission('auditor', 'patients', 'view');
SELECT assign_permission('auditor', 'matcher', 'use');
SELECT assign_permission('auditor', 'pending', 'view');
SELECT assign_permission('auditor', 'protocols', 'view');

-- ADMINISTRATIVO
SELECT assign_permission('administrativo', 'dashboard', 'view');
SELECT assign_permission('administrativo', 'calculator', 'use');
SELECT assign_permission('administrativo', 'nomenclators', 'view');
SELECT assign_permission('administrativo', 'chat', 'direct_only');
SELECT assign_permission('administrativo', 'agenda', 'view');
SELECT assign_permission('administrativo', 'agenda', 'create');
SELECT assign_permission('administrativo', 'patients', 'view');
SELECT assign_permission('administrativo', 'patients', 'manage');
SELECT assign_permission('administrativo', 'pending', 'view');

-- GERENCIA
SELECT assign_permission('gerencia', 'dashboard', 'view');
SELECT assign_permission('gerencia', 'stats', 'view');
SELECT assign_permission('gerencia', 'revenue', 'view');
SELECT assign_permission('gerencia', 'alerts', 'view');
SELECT assign_permission('gerencia', 'audits', 'view');
SELECT assign_permission('gerencia', 'nomenclators', 'view');
SELECT assign_permission('gerencia', 'patients', 'view');

-- Limpieza de función helper
DROP FUNCTION IF EXISTS assign_permission(VARCHAR, VARCHAR, VARCHAR);

-- ─── 4. USER_ROLES (many-to-many) ──────────────────
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- ─── 5. Agregar is_superuser a users si no existe ──
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_superuser'
    ) THEN
        ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ampliar CHECK del campo role en users para incluir gerencia
-- (no tocamos la columna, solo extendemos si es necesario)
DO $$
BEGIN
    -- Eliminar constraint viejo si existe
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    -- Crear nuevo constraint con todos los roles
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'supervisor', 'auditor', 'superuser', 'administrativo', 'gerencia'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint ya existe o no se pudo modificar: %', SQLERRM;
END $$;

-- ─── 6. PLAN_REVENUE (recaudación por plan) ────────
CREATE TABLE IF NOT EXISTS plan_revenue (
    id SERIAL PRIMARY KEY,
    plan_id INT REFERENCES plans(id) ON DELETE CASCADE,
    period DATE NOT NULL,              -- primer día del mes (ej: 2026-01-01)
    amount DECIMAL(14, 2) NOT NULL,    -- monto recaudado
    affiliate_count INT,               -- cantidad de afiliados cotizantes ese mes
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, period, jurisdiction_id)
);

-- ─── 7. ANNOUNCEMENTS (tablero de anuncios) ────────
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_active BOOLEAN DEFAULT TRUE,
    target_roles TEXT[] DEFAULT '{}',   -- vacío = todos, o array de nombres de rol
    jurisdiction_id INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publicar announcements en realtime (solo si no está ya)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'announcements ya está en supabase_realtime';
END $$;

-- =====================================================
-- FIN MIGRACIÓN 006
-- =====================================================
