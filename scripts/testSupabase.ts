/**
 * Script para verificar la conexión a Supabase y las tablas creadas
 * Ejecutar: npx tsx scripts/testSupabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const EXPECTED_TABLES = [
    'jurisdictions',
    'plans',
    'affiliates',
    'practice_types',
    'unit_values',
    'practices',
    'users',
    'audits',
    'alerts',
    'alert_rules',
    'events',
    'conversations',
    'conversation_members',
    'messages'
]

async function testConnection() {
    console.log('🔌 Probando conexión a Supabase...\n')
    console.log(`   URL: ${supabaseUrl}`)
    console.log('')

    let successCount = 0
    let errorCount = 0

    for (const table of EXPECTED_TABLES) {
        try {
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })

            if (error) {
                console.log(`   ❌ ${table}: ${error.message}`)
                errorCount++
            } else {
                console.log(`   ✅ ${table}: OK (${count ?? 0} registros)`)
                successCount++
            }
        } catch (e) {
            console.log(`   ❌ ${table}: Error de conexión`)
            errorCount++
        }
    }

    console.log('\n' + '─'.repeat(50))
    console.log(`\n📊 Resultado: ${successCount}/${EXPECTED_TABLES.length} tablas verificadas`)

    if (errorCount === 0) {
        console.log('✅ ¡Todas las tablas están creadas correctamente!\n')
    } else {
        console.log(`⚠️  ${errorCount} tablas tienen errores. Verifica el schema.sql en Supabase.\n`)
    }
}

testConnection()
