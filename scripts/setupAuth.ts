/**
 * Script simplificado para configurar roles
 * Usa el cliente anon para verificar estado y muestra SQL para ejecutar manualmente
 * 
 * Ejecutar: npx tsx scripts/setupAuth.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Faltan variables de entorno en .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkCurrentState() {
    console.log('🔍 Verificando estado actual de la base de datos...\n')

    // 1. Verificar estructura de tabla users
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .limit(5)

    if (error) {
        console.log('❌ Error al consultar users:', error.message)
        return
    }

    console.log('📊 Usuarios existentes:')
    if (users && users.length > 0) {
        const sample = users[0]
        console.log('   Columnas disponibles:', Object.keys(sample).join(', '))
        console.log('')

        const hasIsSuperuser = 'is_superuser' in sample
        console.log(`   ✅ is_superuser existe: ${hasIsSuperuser ? 'SÍ' : 'NO'}`)

        users.forEach(u => {
            console.log(`   - ${u.email} | rol: ${u.role} | superuser: ${u.is_superuser ?? 'N/A'}`)
        })
    } else {
        console.log('   No hay usuarios')
    }
}

function showMigrationSQL() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 SQL PARA EJECUTAR EN SUPABASE SQL EDITOR')
    console.log('='.repeat(60))
    console.log(`
-- 1. Agregar columna is_superuser (si no existe)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE;

-- 2. Actualizar constraint de role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('superuser', 'admin', 'supervisor', 'auditor', 'administrativo'));

-- 3. Crear índice para superusuarios
CREATE INDEX IF NOT EXISTS idx_users_superuser ON users(is_superuser) WHERE is_superuser = TRUE;

-- 4. Verificar
SELECT id, email, full_name, role, is_superuser, is_active FROM users;
`)
    console.log('='.repeat(60))
}

function showSuperuserInstructions() {
    console.log('\n' + '='.repeat(60))
    console.log('👤 CREAR SUPERUSUARIO')
    console.log('='.repeat(60))
    console.log(`
OPCIÓN A: Desde Supabase Dashboard
1. Ir a Authentication > Users
2. Crear usuario: super@cpce.org.ar
3. En SQL Editor ejecutar:

UPDATE users SET 
    is_superuser = TRUE, 
    role = 'superuser' 
WHERE email = 'super@cpce.org.ar';

OPCIÓN B: Promover un usuario existente
En SQL Editor:

UPDATE users SET 
    is_superuser = TRUE, 
    role = 'superuser' 
WHERE email = '[EMAIL_DEL_USUARIO]';
`)
    console.log('='.repeat(60))
}

async function main() {
    try {
        await checkCurrentState()
        showMigrationSQL()
        showSuperuserInstructions()

        console.log('\n✅ Listo! Ejecuta el SQL en https://supabase.com/dashboard')
    } catch (err) {
        console.error('❌ Error:', err)
        process.exit(1)
    }
}

main()
