/**
 * Seed Mock Data — CPCE Salud Fase 1
 * 
 * Genera datos realistas para demo del dashboard:
 * - 500 afiliados
 * - ~2000 auditorías con estados variados
 * - Alertas de ejemplo
 * - Eventos de agenda
 * - Recaudación por plan (12 meses)
 * 
 * Ejecutar: npx tsx scripts/seedMockData.ts
 * 
 * IMPORTANTE: Requiere las variables de entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Helpers ────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(startYear: number, endYear: number): string {
    const year = randomInt(startYear, endYear)
    const month = randomInt(1, 12)
    const day = randomInt(1, 28)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const NOMBRES = [
    'María', 'Juan', 'Ana', 'Carlos', 'Laura', 'José', 'Marta', 'Luis', 'Gabriela', 'Diego',
    'Fernanda', 'Alejandro', 'Valeria', 'Pablo', 'Sofía', 'Martín', 'Cecilia', 'Nicolás', 'Patricia', 'Ricardo',
    'Carolina', 'Federico', 'Andrea', 'Daniel', 'Florencia', 'Sebastián', 'Luciana', 'Hernán', 'Romina', 'Gustavo',
    'Silvia', 'Marcelo', 'Natalia', 'Hugo', 'Lorena', 'Ariel', 'Evangelina', 'Raúl', 'Claudia', 'Eduardo',
]

const APELLIDOS = [
    'González', 'Rodríguez', 'López', 'Martínez', 'García', 'Fernández', 'Pérez', 'Sánchez', 'Romero', 'Torres',
    'Díaz', 'Álvarez', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Medina', 'Benítez', 'Herrera', 'Suárez',
    'Castro', 'Giménez', 'Gutiérrez', 'Pereyra', 'Morales', 'Cabrera', 'Molina', 'Ortiz', 'Silva', 'Agüero',
    'Varela', 'Rojas', 'Cardozo', 'Arias', 'Villalba', 'Gómez', 'Domínguez', 'Ledesma', 'Figueroa', 'Ferreyra',
]

// ─── Main ───────────────────────────────────────────

async function main() {
    console.log('🚀 Iniciando seed de datos mock...\n')

    // 1. Obtener datos existentes necesarios
    const { data: plans } = await supabase.from('plans').select('id, jurisdiction_id')
    const { data: practices } = await supabase.from('practices').select('id, code, name, fixed_value, category')
    const { data: users } = await supabase.from('users').select('id')

    if (!plans || plans.length === 0) {
        console.error('❌ No hay planes en la DB. Ejecutá primero el schema.sql')
        process.exit(1)
    }

    console.log(`📋 Planes existentes: ${plans.length}`)
    console.log(`📋 Prácticas existentes: ${practices?.length || 0}`)
    console.log(`📋 Usuarios existentes: ${users?.length || 0}`)

    const auditorId = users?.[0]?.id || null

    // 2. Generar 500 afiliados
    console.log('\n👥 Generando 500 afiliados...')
    const affiliates = []
    for (let i = 0; i < 500; i++) {
        const nombre = randomFrom(NOMBRES)
        const apellido = randomFrom(APELLIDOS)
        const plan = randomFrom(plans)
        const status = Math.random() < 0.85 ? 'activo' : Math.random() < 0.5 ? 'suspendido' : 'baja'

        affiliates.push({
            affiliate_number: `AF-${String(i + 1).padStart(5, '0')}`,
            full_name: `${apellido}, ${nombre}`,
            document_number: String(randomInt(10000000, 45000000)),
            birth_date: randomDate(1950, 2010),
            gender: randomFrom(['M', 'F', 'X']),
            relationship: i % 4 === 0 ? randomFrom(['Cónyuge', 'Hijo', 'Hijo Estudiante']) : 'Titular',
            plan_id: plan.id,
            jurisdiction_id: plan.jurisdiction_id,
            status,
            start_date: randomDate(2020, 2025),
        })
    }

    // Insert en batches de 100
    for (let i = 0; i < affiliates.length; i += 100) {
        const batch = affiliates.slice(i, i + 100)
        const { error } = await supabase.from('affiliates').upsert(batch, { onConflict: 'affiliate_number' })
        if (error) {
            console.error(`  ❌ Error batch ${i / 100 + 1}:`, error.message)
        } else {
            console.log(`  ✅ Batch ${i / 100 + 1}/5 insertado`)
        }
    }

    // 3. Obtener IDs de afiliados insertados
    const { data: insertedAffiliates } = await supabase
        .from('affiliates')
        .select('id, plan_id, jurisdiction_id')
        .limit(500)

    if (!insertedAffiliates || insertedAffiliates.length === 0) {
        console.error('❌ No se pudieron obtener afiliados')
        process.exit(1)
    }

    console.log(`\n📊 Afiliados en DB: ${insertedAffiliates.length}`)

    // 4. Generar ~2000 auditorías
    console.log('\n📝 Generando ~2000 auditorías...')
    const statuses = ['pending', 'approved', 'rejected', 'partial', 'requires_auth']
    const statusWeights = [0.15, 0.45, 0.15, 0.15, 0.10] // 45% aprobadas ~ tasa realista

    const audits = []
    for (let i = 0; i < 2000; i++) {
        const affiliate = randomFrom(insertedAffiliates)
        const practice = practices && practices.length > 0 ? randomFrom(practices) : null

        // Weighted random status
        const rand = Math.random()
        let cumulative = 0
        let status = 'pending'
        for (let j = 0; j < statuses.length; j++) {
            cumulative += statusWeights[j]
            if (rand <= cumulative) {
                status = statuses[j]
                break
            }
        }

        const coveragePercent = status === 'approved' ? randomInt(70, 100) :
            status === 'rejected' ? 0 :
                status === 'partial' ? randomInt(30, 69) :
                    randomInt(50, 100)

        const practiceValue = practice?.fixed_value || randomInt(500, 50000)
        const coveredAmount = Math.round(practiceValue * coveragePercent / 100)

        audits.push({
            affiliate_id: affiliate.id,
            practice_id: practice?.id || null,
            plan_id: affiliate.plan_id,
            jurisdiction_id: affiliate.jurisdiction_id,
            coverage_result: {
                coverage_percent: coveragePercent,
                covered_amount: coveredAmount,
                copay: practiceValue - coveredAmount,
                messages: [],
            },
            status,
            auditor_id: auditorId,
            notes: status === 'rejected' ? 'Fuera de cobertura del plan' :
                status === 'partial' ? 'Cobertura parcial aplicada' : null,
            created_at: new Date(
                Date.now() - randomInt(0, 365) * 24 * 60 * 60 * 1000
            ).toISOString(),
        })
    }

    // Insert en batches de 200
    for (let i = 0; i < audits.length; i += 200) {
        const batch = audits.slice(i, i + 200)
        const { error } = await supabase.from('audits').insert(batch)
        if (error) {
            console.error(`  ❌ Error batch auditorías ${i / 200 + 1}:`, error.message)
        } else {
            console.log(`  ✅ Batch ${i / 200 + 1}/10 insertado`)
        }
    }

    // 5. Generar alertas
    console.log('\n🔔 Generando alertas...')
    const alertTypes = ['threshold', 'frequency', 'anomaly', 'compliance']
    const alertSeverities = ['low', 'medium', 'high', 'critical']
    const alertTitles = [
        'Gasto mensual excede presupuesto',
        'Afiliado con consumo anómalo',
        'Prestador con facturación atípica',
        'Práctica frecuente sin autorización previa',
        'Coseguro pendiente de cobro',
        'Auditoría sin resolver hace 30+ días',
        'Plan con siniestralidad alta',
        'Medicamento de alto costo repetido',
    ]

    const alerts = []
    for (let i = 0; i < 25; i++) {
        const affiliate = randomFrom(insertedAffiliates)
        alerts.push({
            title: randomFrom(alertTitles),
            description: `Detectado en afiliado ${affiliate.id.slice(0, 8)}... - Jurisdicción ${affiliate.jurisdiction_id}`,
            type: randomFrom(alertTypes),
            severity: randomFrom(alertSeverities),
            status: Math.random() < 0.7 ? 'active' : randomFrom(['acknowledged', 'resolved']),
            affiliate_id: affiliate.id,
            jurisdiction_id: affiliate.jurisdiction_id,
            created_at: new Date(Date.now() - randomInt(0, 90) * 24 * 60 * 60 * 1000).toISOString(),
        })
    }

    const { error: alertsError } = await supabase.from('alerts').insert(alerts)
    if (alertsError) {
        console.error('  ❌ Error alertas:', alertsError.message)
    } else {
        console.log(`  ✅ ${alerts.length} alertas creadas`)
    }

    // 6. Generar eventos de agenda
    console.log('\n📅 Generando eventos de agenda...')
    const eventTypes = ['reunion', 'capacitacion', 'vencimiento', 'recordatorio', 'otro']
    const eventTitles = [
        'Reunión de equipo auditor',
        'Capacitación nuevos protocolos',
        'Vencimiento convenio Lab. Central',
        'Revisión presupuesto mensual',
        'Comité de auditoría médica',
        'Presentación estadísticas trimestrales',
        'Actualización valores nomenclador',
        'Reunión con prestadores',
        'Cierre liquidación mensual',
        'Auditoría externa SSSALUD',
    ]

    const events = []
    for (let i = 0; i < 20; i++) {
        const daysFromNow = randomInt(-30, 60) // algunos pasados, mayoría futuros
        const startDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
        startDate.setHours(randomInt(8, 17), 0, 0, 0)

        events.push({
            title: randomFrom(eventTitles),
            description: 'Evento generado automáticamente para demo',
            start_datetime: startDate.toISOString(),
            end_datetime: new Date(startDate.getTime() + randomInt(1, 3) * 60 * 60 * 1000).toISOString(),
            type: randomFrom(eventTypes),
            priority: randomFrom(['normal', 'alta', 'urgente']),
            status: daysFromNow < 0 ? 'completado' : randomFrom(['pendiente', 'confirmado']),
            created_by: auditorId,
            jurisdiction_id: randomFrom([1, 2]),
        })
    }

    const { error: eventsError } = await supabase.from('events').insert(events)
    if (eventsError) {
        console.error('  ❌ Error eventos:', eventsError.message)
    } else {
        console.log(`  ✅ ${events.length} eventos creados`)
    }

    // 7. Generar recaudación por plan (12 meses)
    console.log('\n💰 Generando recaudación por plan (12 meses)...')
    const revenues = []
    for (const plan of plans) {
        for (let m = 0; m < 12; m++) {
            const date = new Date()
            date.setMonth(date.getMonth() - m)
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

            // Recaudación realista: entre 500K y 3M por plan/mes
            const baseAmount = plan.jurisdiction_id === 1 ? 1_500_000 : 1_200_000
            const variation = randomInt(-300_000, 300_000)

            revenues.push({
                plan_id: plan.id,
                period,
                amount: baseAmount + variation,
                affiliate_count: randomInt(80, 200),
                jurisdiction_id: plan.jurisdiction_id,
                notes: 'Dato generado para demo',
            })
        }
    }

    const { error: revenueError } = await supabase
        .from('plan_revenue')
        .upsert(revenues, { onConflict: 'plan_id,period,jurisdiction_id' })
    if (revenueError) {
        console.error('  ❌ Error recaudación:', revenueError.message)
    } else {
        console.log(`  ✅ ${revenues.length} registros de recaudación creados`)
    }

    // 8. Crear anuncio de ejemplo
    console.log('\n📢 Creando anuncio de ejemplo...')
    const { error: annError } = await supabase.from('announcements').insert({
        title: 'Bienvenidos a CPCE Salud v2.0',
        body: 'Se han implementado nuevas funcionalidades: dashboard con KPIs, sistema de roles y permisos, y menú dinámico por usuario. Contactar al administrador para consultas.',
        priority: 'high',
        is_active: true,
        target_roles: [],
        jurisdiction_id: null,
    })
    if (annError) {
        console.error('  ❌ Error anuncio:', annError.message)
    } else {
        console.log('  ✅ Anuncio creado')
    }

    // Resumen
    console.log('\n' + '═'.repeat(50))
    console.log('✅ SEED COMPLETADO')
    console.log('═'.repeat(50))
    console.log(`  👥 Afiliados: ${affiliates.length}`)
    console.log(`  📝 Auditorías: ${audits.length}`)
    console.log(`  🔔 Alertas: ${alerts.length}`)
    console.log(`  📅 Eventos: ${events.length}`)
    console.log(`  💰 Recaudación: ${revenues.length} registros`)
    console.log(`  📢 Anuncios: 1`)
    console.log('═'.repeat(50))
}

main().catch(console.error)
