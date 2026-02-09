-- =====================================================
-- CPCE SALUD - MIGRACIÓN: Sistema de Roles
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columna is_superuser a users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE;

-- 2. Actualizar constraint de role para incluir 'administrativo'
-- Primero eliminamos el constraint existente si existe
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN undefined_object THEN
    NULL;
END $$;

-- Agregar nuevo constraint con todos los roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('superuser', 'admin', 'supervisor', 'auditor', 'administrativo'));

-- 3. Crear superusuario inicial (solo si no existe)
-- NOTA: El ID de auth.users debe coincidir. Este es un placeholder.
-- En producción, primero crear usuario en Supabase Auth.

INSERT INTO users (email, full_name, role, is_superuser, jurisdiction_id, is_active)
VALUES ('super@cpce.org.ar', 'Superusuario CPCE', 'superuser', TRUE, 1, TRUE)
ON CONFLICT (email) DO UPDATE SET is_superuser = TRUE, role = 'superuser';

-- 4. Índice para búsqueda rápida de superusuarios
CREATE INDEX IF NOT EXISTS idx_users_superuser ON users(is_superuser) WHERE is_superuser = TRUE;

-- 5. Verificar
SELECT id, email, full_name, role, is_superuser FROM users WHERE is_superuser = TRUE;
