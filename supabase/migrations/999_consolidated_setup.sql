-- ==============================================================================
-- SCRIPT CONSOLIDADO DE CONFIGURACIÓN CPCE SALUD
-- Copia y pega TODO este contenido en el SQL Editor de Supabase y presiona RUN.
-- ==============================================================================

-- 0. AUTOMATIZACIÓN DE USUARIOS (Sincronización Auth -> Public)
-- ==============================================================================
-- Esto asegura que cada vez que se cree un usuario en Supabase Auth,
-- se cree automáticamente su perfil en la tabla 'users'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario Nuevo'), 
    'auditor' -- Rol por defecto
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configurar el trigger (se recrea para evitar duplicados)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 1. Actualización de ROLES y SUPERUSUARIO
-- ==============================================================================

-- Aumentar seguridad agregando columna de superusuario si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_superuser') THEN
        ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Actualizar restricción de roles para incluir 'administrativo' y 'superuser'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('superuser', 'admin', 'supervisor', 'auditor', 'administrativo'));

-- Índice simple para encontrar superusuarios rápido
CREATE INDEX IF NOT EXISTS idx_users_is_superuser ON users(is_superuser);


-- 2. Creación de Tablas para NOMENCLADORES EXTERNOS (NUN, FAAAR, etc.)
-- ==============================================================================

-- Tabla de definiciones (Catálogo de Nomencladores)
CREATE TABLE IF NOT EXISTS external_nomenclators (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE, -- Ejemplo: 'NUN', 'FAAAR'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NO insertar datos de ejemplo (el usuario creará sus propios nomencladores desde la UI)

-- Tabla de Prácticas Externas (Los códigos importados)
CREATE TABLE IF NOT EXISTS external_practices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomenclator_id INT REFERENCES external_nomenclators(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Valores del nomenclador externo (si los tiene)
    value DECIMAL(12, 2),
    unit VARCHAR(20),
    
    -- Homologación: Vínculo con nuestra tabla interna 'practices'
    internal_practice_id BIGINT REFERENCES practices(id) ON DELETE SET NULL,
    
    -- Metadatos de la homologación
    match_confidence DECIMAL(5, 2), 
    match_type VARCHAR(20) DEFAULT 'manual' CHECK (match_type IN ('manual', 'automatic', 'suggestion')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados de código dentro del mismo nomenclador
    UNIQUE(nomenclator_id, code)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_ext_practices_code ON external_practices(code);
CREATE INDEX IF NOT EXISTS idx_ext_practices_nomenclator ON external_practices(nomenclator_id);
CREATE INDEX IF NOT EXISTS idx_ext_practices_internal ON external_practices(internal_practice_id);


-- ==============================================================================
-- OPCIONAL: Convertir tu usuario en Superusuario
-- Descomenta la siguiente línea (quitando los guiones '--') y pon tu email real
-- UPDATE users SET role = 'superuser', is_superuser = true WHERE email = 'TU_EMAIL@EJEMPLO.COM';
-- ==============================================================================

-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================
