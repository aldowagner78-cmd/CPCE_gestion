/**
 * Script para cargar datos de prueba de Chat en Supabase
 * Ejecutar: npx tsx scripts/seedChatData.ts
 * 
 * ⚠️ DATOS DE PRUEBA - Eliminar después de las pruebas
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ── Datos de Prueba para Chat ──

const TEST_USERS = [
    { email: 'admin@cpce.org.ar', full_name: 'Admin Sistema', role: 'admin', jurisdiction_id: 1 },
    { email: 'maria.garcia@cpce.org.ar', full_name: 'María García', role: 'auditor', jurisdiction_id: 1 },
    { email: 'carlos.lopez@cpce.org.ar', full_name: 'Carlos López', role: 'supervisor', jurisdiction_id: 1 },
    { email: 'ana.rodriguez@cpce.org.ar', full_name: 'Ana Rodríguez', role: 'auditor', jurisdiction_id: 2 },
]

async function seedChatData() {
    console.log('💬 Cargando datos de prueba para Chat...\n')

    // 1. Usuarios
    console.log('👤 Insertando usuarios...')
    const { data: users, error: usersError } = await supabase
        .from('users')
        .insert(TEST_USERS)
        .select()

    if (usersError) {
        console.log(`   ❌ Error usuarios: ${usersError.message}`)
        return
    }
    console.log(`   ✅ ${users?.length || 0} usuarios insertados`)

    if (!users || users.length < 2) {
        console.log('   ❌ No hay suficientes usuarios para crear conversaciones')
        return
    }

    // 2. Conversaciones
    console.log('💬 Insertando conversaciones...')
    const TEST_CONVERSATIONS = [
        { name: 'General', type: 'channel', description: 'Canal general de comunicación', is_private: false, created_by: users[0].id, jurisdiction_id: 1 },
        { name: 'Auditores', type: 'channel', description: 'Canal exclusivo para auditores', is_private: true, created_by: users[0].id, jurisdiction_id: 1 },
    ]

    const { data: conversations, error: convsError } = await supabase
        .from('conversations')
        .insert(TEST_CONVERSATIONS)
        .select()

    if (convsError) {
        console.log(`   ❌ Error conversaciones: ${convsError.message}`)
        return
    }
    console.log(`   ✅ ${conversations?.length || 0} conversaciones insertadas`)

    if (!conversations || conversations.length === 0) {
        console.log('   ❌ No se crearon conversaciones')
        return
    }

    // 3. Miembros de conversaciones
    console.log('👥 Insertando miembros...')
    const TEST_MEMBERS = [
        // General - todos
        { conversation_id: conversations[0].id, user_id: users[0].id, role: 'admin' },
        { conversation_id: conversations[0].id, user_id: users[1].id, role: 'member' },
        { conversation_id: conversations[0].id, user_id: users[2].id, role: 'member' },
        { conversation_id: conversations[0].id, user_id: users[3].id, role: 'member' },
        // Auditores - solo algunos
        { conversation_id: conversations[1].id, user_id: users[0].id, role: 'admin' },
        { conversation_id: conversations[1].id, user_id: users[1].id, role: 'member' },
    ]

    const { error: membersError } = await supabase
        .from('conversation_members')
        .insert(TEST_MEMBERS)

    if (membersError) {
        console.log(`   ❌ Error miembros: ${membersError.message}`)
    } else {
        console.log(`   ✅ ${TEST_MEMBERS.length} miembros insertados`)
    }

    // 4. Mensajes
    console.log('📝 Insertando mensajes...')
    const TEST_MESSAGES = [
        { conversation_id: conversations[0].id, sender_id: users[0].id, content: 'Bienvenidos al sistema de comunicación interna del CPCE.', type: 'text' },
        { conversation_id: conversations[0].id, sender_id: users[1].id, content: '¡Hola a todos! Lista para colaborar.', type: 'text' },
        { conversation_id: conversations[0].id, sender_id: users[2].id, content: 'Recordatorio: Reunión de equipo mañana a las 10hs.', type: 'text' },
        { conversation_id: conversations[1].id, sender_id: users[0].id, content: 'Este es el canal privado para auditores.', type: 'text' },
        { conversation_id: conversations[1].id, sender_id: users[1].id, content: 'Tengo una consulta sobre el caso #1234.', type: 'text' },
    ]

    const { error: messagesError } = await supabase
        .from('messages')
        .insert(TEST_MESSAGES)

    if (messagesError) {
        console.log(`   ❌ Error mensajes: ${messagesError.message}`)
    } else {
        console.log(`   ✅ ${TEST_MESSAGES.length} mensajes insertados`)
    }

    console.log('\n' + '─'.repeat(50))
    console.log('✅ Datos de Chat cargados\n')
}

seedChatData()
