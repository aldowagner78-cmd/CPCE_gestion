/**
 * Script para verificar conteo de registros en Supabase
 * Ejecutar: npx tsx scripts/checkCounts.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCounts() {
    const tables = ['practices', 'affiliates', 'alerts', 'events']

    console.log('\n📊 Conteo de registros:\n')

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        console.log(`   ${table}: ${error ? 'ERROR - ' + error.message : count + ' registros'}`)
    }

    console.log('')
}

checkCounts()
