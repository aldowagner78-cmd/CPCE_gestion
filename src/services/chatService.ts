import { v4 as uuidv4 } from 'uuid'

/**
 * Servicio de Mensajería Interna en memoria.
 * Soporta chat P2P (directo) y salas/canales grupales.
 * En producción: Supabase Realtime para actualizaciones instantáneas.
 */

export type ConversationType = 'direct' | 'channel'
export type MessageType = 'text' | 'file' | 'system'
export type MemberRole = 'admin' | 'member'

export interface User {
    id: string
    name: string
    email: string
    avatar?: string
    role: 'admin' | 'auditor' | 'supervisor'
    online?: boolean
}

export interface Conversation {
    id: string
    name?: string // NULL for direct messages
    type: ConversationType
    description?: string
    is_private: boolean
    jurisdiction_id?: number
    created_by: string
    created_at: string
    last_message?: Message
    unread_count?: number
}

export interface ConversationMember {
    id: string
    conversation_id: string
    user_id: string
    role: MemberRole
    last_read_at?: string
    joined_at: string
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    sender_name?: string
    sender_avatar?: string
    content: string
    type: MessageType
    attachment_url?: string
    reply_to_id?: string
    is_edited: boolean
    is_deleted: boolean
    created_at: string
}

// ── Mock Data ──

const MOCK_USERS: User[] = [
    { id: 'user-1', name: 'Admin Sistema', email: 'admin@cpce.org.ar', role: 'admin', online: true },
    { id: 'user-2', name: 'Juan Auditor', email: 'juan@cpce.org.ar', role: 'auditor', online: true },
    { id: 'user-3', name: 'María Supervisora', email: 'maria@cpce.org.ar', role: 'supervisor', online: false },
    { id: 'user-4', name: 'Carlos Auditor', email: 'carlos@cpce.org.ar', role: 'auditor', online: true },
]

const conversationsStore: Conversation[] = [
    {
        id: 'conv-general',
        name: 'Sala General',
        type: 'channel',
        description: 'Canal para anuncios y comunicación general',
        is_private: false,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
    },
    {
        id: 'conv-auditores',
        name: 'Auditores',
        type: 'channel',
        description: 'Canal exclusivo para el equipo de auditoría',
        is_private: true,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
    },
]

const membersStore: ConversationMember[] = [
    { id: 'm1', conversation_id: 'conv-general', user_id: 'user-1', role: 'admin', joined_at: new Date().toISOString() },
    { id: 'm2', conversation_id: 'conv-general', user_id: 'user-2', role: 'member', joined_at: new Date().toISOString() },
    { id: 'm3', conversation_id: 'conv-general', user_id: 'user-3', role: 'member', joined_at: new Date().toISOString() },
    { id: 'm4', conversation_id: 'conv-general', user_id: 'user-4', role: 'member', joined_at: new Date().toISOString() },
    { id: 'm5', conversation_id: 'conv-auditores', user_id: 'user-1', role: 'admin', joined_at: new Date().toISOString() },
    { id: 'm6', conversation_id: 'conv-auditores', user_id: 'user-2', role: 'member', joined_at: new Date().toISOString() },
    { id: 'm7', conversation_id: 'conv-auditores', user_id: 'user-4', role: 'member', joined_at: new Date().toISOString() },
]

const messagesStore: Message[] = [
    {
        id: 'msg-1',
        conversation_id: 'conv-general',
        sender_id: 'user-1',
        content: 'Bienvenidos al sistema de comunicación interna del CPCE.',
        type: 'text',
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 'msg-2',
        conversation_id: 'conv-general',
        sender_id: 'user-2',
        content: '¡Excelente! Ya estoy conectado.',
        type: 'text',
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 3000000).toISOString(),
    },
    {
        id: 'msg-3',
        conversation_id: 'conv-auditores',
        sender_id: 'user-1',
        content: 'Recordatorio: Reunión de equipo mañana a las 10hs.',
        type: 'text',
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 1800000).toISOString(),
    },
]

// ── Listeners ──

type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
    listeners.forEach((fn) => fn())
}

// ── Service ──

export const ChatService = {
    // ── Users ──

    getCurrentUser(): User {
        return MOCK_USERS[0] // Simulated logged-in user
    },

    getAllUsers(): User[] {
        return [...MOCK_USERS]
    },

    getUserById(id: string): User | undefined {
        return MOCK_USERS.find((u) => u.id === id)
    },

    // ── Conversations ──

    getConversations(userId: string): Conversation[] {
        const userMemberships = membersStore.filter((m) => m.user_id === userId)
        const convIds = userMemberships.map((m) => m.conversation_id)

        return conversationsStore
            .filter((c) => convIds.includes(c.id))
            .map((c) => {
                const messages = this.getMessages(c.id)
                const lastMessage = messages[messages.length - 1]
                return { ...c, last_message: lastMessage }
            })
            .sort((a, b) => {
                const aTime = a.last_message?.created_at || a.created_at
                const bTime = b.last_message?.created_at || b.created_at
                return new Date(bTime).getTime() - new Date(aTime).getTime()
            })
    },

    getConversationById(id: string): Conversation | undefined {
        return conversationsStore.find((c) => c.id === id)
    },

    getOrCreateDirectConversation(userId1: string, userId2: string): Conversation {
        // Check if direct conversation exists
        const existing = conversationsStore.find((c) => {
            if (c.type !== 'direct') return false
            const members = membersStore.filter((m) => m.conversation_id === c.id)
            const memberIds = members.map((m) => m.user_id)
            return memberIds.includes(userId1) && memberIds.includes(userId2) && memberIds.length === 2
        })

        if (existing) return existing

        // Create new direct conversation
        const conv: Conversation = {
            id: uuidv4(),
            type: 'direct',
            is_private: true,
            created_by: userId1,
            created_at: new Date().toISOString(),
        }

        conversationsStore.push(conv)

        // Add both users as members
        membersStore.push(
            { id: uuidv4(), conversation_id: conv.id, user_id: userId1, role: 'member', joined_at: new Date().toISOString() },
            { id: uuidv4(), conversation_id: conv.id, user_id: userId2, role: 'member', joined_at: new Date().toISOString() }
        )

        notifyListeners()
        return conv
    },

    createChannel(data: { name: string; description?: string; is_private: boolean; created_by: string }): Conversation {
        const conv: Conversation = {
            id: uuidv4(),
            name: data.name,
            type: 'channel',
            description: data.description,
            is_private: data.is_private,
            created_by: data.created_by,
            created_at: new Date().toISOString(),
        }

        conversationsStore.push(conv)

        // Add creator as admin
        membersStore.push({
            id: uuidv4(),
            conversation_id: conv.id,
            user_id: data.created_by,
            role: 'admin',
            joined_at: new Date().toISOString(),
        })

        notifyListeners()
        return conv
    },

    // ── Members ──

    getConversationMembers(conversationId: string): (ConversationMember & { user: User })[] {
        return membersStore
            .filter((m) => m.conversation_id === conversationId)
            .map((m) => ({
                ...m,
                user: MOCK_USERS.find((u) => u.id === m.user_id)!,
            }))
            .filter((m) => m.user)
    },

    addMember(conversationId: string, userId: string): void {
        const exists = membersStore.some((m) => m.conversation_id === conversationId && m.user_id === userId)
        if (exists) return

        membersStore.push({
            id: uuidv4(),
            conversation_id: conversationId,
            user_id: userId,
            role: 'member',
            joined_at: new Date().toISOString(),
        })

        notifyListeners()
    },

    // ── Messages ──

    getMessages(conversationId: string): Message[] {
        return messagesStore
            .filter((m) => m.conversation_id === conversationId && !m.is_deleted)
            .map((m) => {
                const sender = MOCK_USERS.find((u) => u.id === m.sender_id)
                return {
                    ...m,
                    sender_name: sender?.name,
                    sender_avatar: sender?.avatar,
                }
            })
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    },

    sendMessage(conversationId: string, senderId: string, content: string, type: MessageType = 'text'): Message {
        const message: Message = {
            id: uuidv4(),
            conversation_id: conversationId,
            sender_id: senderId,
            content,
            type,
            is_edited: false,
            is_deleted: false,
            created_at: new Date().toISOString(),
        }

        messagesStore.push(message)
        notifyListeners()

        return message
    },

    editMessage(messageId: string, newContent: string): Message | null {
        const message = messagesStore.find((m) => m.id === messageId)
        if (!message) return null

        message.content = newContent
        message.is_edited = true
        notifyListeners()

        return message
    },

    deleteMessage(messageId: string): boolean {
        const message = messagesStore.find((m) => m.id === messageId)
        if (!message) return false

        message.is_deleted = true
        message.content = 'Mensaje eliminado'
        notifyListeners()

        return true
    },

    // ── Realtime simulation ──

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    getSnapshot() {
        return { conversations: conversationsStore, messages: messagesStore }
    },
}
