/**
 * Script para ejecutar manualmente la migración de homologaciones
 * 
 * Uso:
 * 1. Asegúrate de tener las variables de entorno configuradas (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * 2. Ejecuta: npx ts-node scripts/runHomologationsMigration.ts
 * 
 * Alternativamente:
 * - Copia el contenido de supabase/migrations/003_homologations.sql
 * - Pégalo en el SQL Editor del dashboard de Supabase
 * - Ejecuta la query
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
    console.log('🚀 Iniciando migración de homologaciones...')
    
    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '../supabase/migrations/003_homologations.sql')
        const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
        
        console.log('📄 Migración cargada:', migrationPath)
        
        // Ejecutar SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        })
        
        if (error) {
            console.error('❌ Error ejecutando migración:', error)
            console.log('\n⚠️  SOLUCIÓN ALTERNATIVA:')
            console.log('1. Ve al dashboard de Supabase: https://supabase.com/dashboard')
            console.log('2. Abre el SQL Editor')
            console.log('3. Copia y pega el contenido de: supabase/migrations/003_homologations.sql')
            console.log('4. Ejecuta la query manualmente')
            process.exit(1)
        }
        
        console.log('✅ Migración ejecutada exitosamente')
        console.log('📊 Resultado:', data)
        
    } catch (error) {
        console.error('❌ Error:', error)
        console.log('\n⚠️  SOLUCIÓN ALTERNATIVA:')
        console.log('1. Ve al dashboard de Supabase: https://supabase.com/dashboard')
        console.log('2. Abre el SQL Editor')
        console.log('3. Copia y pega el contenido de: supabase/migrations/003_homologations.sql')
        console.log('4. Ejecuta la query manualmente')
        process.exit(1)
    }
}

runMigration()
