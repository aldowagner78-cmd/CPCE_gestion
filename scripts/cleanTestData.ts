/**
 * Script para eliminar datos de prueba de Supabase
 * Ejecutar: npx tsx scripts/cleanTestData.ts
 * 
 * ⚠️ Esto elimina TODOS los datos de las tablas
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TABLES_TO_CLEAN = [
    'messages',
    'conversation_members',
    'conversations',
    'events',
    'alert_rules',
    'alerts',
    'audits',
    'practices',
    'affiliates',
]

async function cleanData() {
    console.log('🧹 Limpiando datos de prueba de Supabase...\n')

    for (const table of TABLES_TO_CLEAN) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')

        if (error) {
            console.log(`   ⚠️  ${table}: ${error.message}`)
        } else {
            console.log(`   ✅ ${table}: limpiado`)
        }
    }

    console.log('\n' + '─'.repeat(50))
    console.log('✅ Datos de prueba eliminados\n')
}

cleanData()
