/**
 * Script para cargar datos de prueba en Supabase
 * Ejecutar: npx tsx scripts/seedTestData.ts
 * 
 * ⚠️ DATOS DE PRUEBA - Eliminar después de las pruebas
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ── Datos de Prueba (ajustados al schema.sql) ──

const TEST_PRACTICES = [
    { code: '420101', name: 'Consulta médica general', unit_quantity: 10, category: 'Consultas', practice_type_id: 1, jurisdiction_id: 1 },
    { code: '420102', name: 'Consulta médica especializada', unit_quantity: 15, category: 'Consultas', practice_type_id: 1, jurisdiction_id: 1 },
    { code: '420201', name: 'Electrocardiograma', unit_quantity: 8, category: 'Diagnóstico', practice_type_id: 2, jurisdiction_id: 1 },
    { code: '420301', name: 'Hemograma completo', unit_quantity: 6, category: 'Laboratorio', practice_type_id: 2, jurisdiction_id: 1 },
    { code: '420302', name: 'Glucemia', unit_quantity: 4, category: 'Laboratorio', practice_type_id: 2, jurisdiction_id: 1 },
    { code: '420303', name: 'Perfil lipídico', unit_quantity: 8, category: 'Laboratorio', practice_type_id: 2, jurisdiction_id: 1 },
    { code: '420401', name: 'Radiografía de tórax', unit_quantity: 12, category: 'Imágenes', practice_type_id: 1, jurisdiction_id: 1 },
    { code: '420402', name: 'Ecografía abdominal', unit_quantity: 20, category: 'Imágenes', practice_type_id: 1, jurisdiction_id: 1 },
    { code: '420403', name: 'Tomografía computada', unit_quantity: 50, category: 'Imágenes', practice_type_id: 1, jurisdiction_id: 1, requires_authorization: true },
    { code: '420501', name: 'Cirugía menor ambulatoria', unit_quantity: 30, category: 'Cirugía', practice_type_id: 1, jurisdiction_id: 1, requires_authorization: true },
]

const TEST_AFFILIATES = [
    { affiliate_number: 'AF-001', full_name: 'Juan Pérez', document_number: '30123456', plan_id: 1, jurisdiction_id: 1, gender: 'M' },
    { affiliate_number: 'AF-002', full_name: 'María García', document_number: '28654321', plan_id: 2, jurisdiction_id: 1, gender: 'F' },
    { affiliate_number: 'AF-003', full_name: 'Carlos López', document_number: '35789012', plan_id: 1, jurisdiction_id: 1, gender: 'M' },
    { affiliate_number: 'AF-004', full_name: 'Ana Rodríguez', document_number: '32456789', plan_id: 3, jurisdiction_id: 2, gender: 'F' },
    { affiliate_number: 'AF-005', full_name: 'Pedro Martínez', document_number: '29876543', plan_id: 4, jurisdiction_id: 2, gender: 'M' },
]

// type debe ser: 'threshold', 'frequency', 'deadline', 'anomaly', 'compliance'
// severity debe ser: 'low', 'medium', 'high', 'critical'
// status debe ser: 'active', 'acknowledged', 'resolved', 'dismissed'
const TEST_ALERTS = [
    { title: 'Práctica duplicada detectada', description: 'Se detectó una práctica duplicada para el afiliado AF-001', severity: 'high', type: 'anomaly', status: 'active', jurisdiction_id: 1 },
    { title: 'Valor fuera de rango', description: 'El valor de la práctica 420403 supera el límite permitido', severity: 'medium', type: 'threshold', status: 'active', jurisdiction_id: 1 },
    { title: 'Actualización de nomenclador', description: 'Nuevos valores disponibles para el nomenclador PMO', severity: 'low', type: 'compliance', status: 'resolved', jurisdiction_id: 1 },
]

// type debe ser: 'reunion', 'capacitacion', 'vencimiento', 'recordatorio', 'otro'
// priority debe ser: 'normal', 'alta', 'urgente'
// status debe ser: 'pendiente', 'confirmado', 'completado', 'cancelado'
const TEST_EVENTS = [
    { title: 'Reunión de equipo', description: 'Revisión mensual de indicadores', start_datetime: new Date(Date.now() + 86400000).toISOString(), end_datetime: new Date(Date.now() + 90000000).toISOString(), type: 'reunion', priority: 'alta', jurisdiction_id: 1 },
    { title: 'Capacitación', description: 'Taller de uso del nuevo sistema', start_datetime: new Date(Date.now() + 172800000).toISOString(), end_datetime: new Date(Date.now() + 180000000).toISOString(), type: 'capacitacion', priority: 'normal', jurisdiction_id: 1 },
    { title: 'Auditoría trimestral', description: 'Revisión de expedientes Q1', start_datetime: new Date(Date.now() + 604800000).toISOString(), end_datetime: new Date(Date.now() + 612000000).toISOString(), type: 'otro', priority: 'alta', jurisdiction_id: 1 },
]

async function seedData() {
    console.log('🌱 Cargando datos de prueba en Supabase...\n')

    // 1. Prácticas
    console.log('📋 Insertando prácticas...')
    const { data: practices, error: practicesError } = await supabase.from('practices').insert(TEST_PRACTICES).select()
    if (practicesError) {
        console.log(`   ❌ Error: ${practicesError.message}`)
    } else {
        console.log(`   ✅ ${practices?.length || 0} prácticas insertadas`)
    }

    // 2. Afiliados
    console.log('👥 Insertando afiliados...')
    const { data: affiliates, error: affiliatesError } = await supabase.from('affiliates').insert(TEST_AFFILIATES).select()
    if (affiliatesError) {
        console.log(`   ❌ Error: ${affiliatesError.message}`)
    } else {
        console.log(`   ✅ ${affiliates?.length || 0} afiliados insertados`)
    }

    // 3. Alertas
    console.log('🔔 Insertando alertas...')
    const { data: alerts, error: alertsError } = await supabase.from('alerts').insert(TEST_ALERTS).select()
    if (alertsError) {
        console.log(`   ❌ Error: ${alertsError.message}`)
    } else {
        console.log(`   ✅ ${alerts?.length || 0} alertas insertadas`)
    }

    // 4. Eventos
    console.log('📅 Insertando eventos...')
    const { data: events, error: eventsError } = await supabase.from('events').insert(TEST_EVENTS).select()
    if (eventsError) {
        console.log(`   ❌ Error: ${eventsError.message}`)
    } else {
        console.log(`   ✅ ${events?.length || 0} eventos insertados`)
    }

    console.log('\n' + '─'.repeat(50))
    console.log('✅ Datos de prueba cargados\n')
    console.log('⚠️  RECUERDA: Ejecutar cleanTestData.ts para eliminar estos datos\n')
}

seedData()
