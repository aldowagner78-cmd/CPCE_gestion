/**
 * Servicio de Chat con Supabase
 * Lee y escribe mensajes, conversaciones y usuarios desde Supabase
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const getSupabaseClient = () => {
    return createClient(supabaseUrl, supabaseKey)
}

// ── Types ──

export type ConversationType = 'direct' | 'channel'
export type MessageType = 'text' | 'file' | 'system'

export interface User {
    id: string
    email: string
    full_name: string
    avatar_url?: string
    role: 'admin' | 'auditor' | 'supervisor'
    jurisdiction_id?: number
    is_active?: boolean
    last_login?: string
    created_at?: string
}

export interface Conversation {
    id: string
    name?: string
    type: ConversationType
    description?: string
    is_private: boolean
    jurisdiction_id?: number
    created_by?: string
    created_at: string
}

export interface Message {
    id: string
    conversation_id: string
    sender_id?: string
    content: string
    type: MessageType
    attachment_url?: string
    reply_to_id?: string
    is_edited: boolean
    is_deleted: boolean
    created_at: string
    // Joined fields
    sender_name?: string
    sender_avatar?: string
}

// ── Listeners for reactivity ──

type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
    listeners.forEach((fn) => fn())
}

// ── Service ──

export const SupabaseChatService = {
    // ── Users ──

    async getAllUsers(): Promise<User[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('full_name')

        if (error) {
            console.error('Error fetching users:', error.message)
            return []
        }

        return data as User[]
    },

    async getUserById(id: string): Promise<User | null> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching user:', error.message)
            return null
        }

        return data as User
    },

    // ── Conversations ──

    async getConversations(): Promise<Conversation[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching conversations:', error.message)
            return []
        }

        return data as Conversation[]
    },

    async getConversationById(id: string): Promise<Conversation | null> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching conversation:', error.message)
            return null
        }

        return data as Conversation
    },

    // ── Messages ──

    async getMessages(conversationId: string): Promise<Message[]> {
        const supabase = getSupabaseClient()

        // Get messages with sender info
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                users!sender_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('conversation_id', conversationId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching messages:', error.message)
            return []
        }

        // Transform to include sender info
        return (messages || []).map((msg: { users?: { full_name?: string; avatar_url?: string } }) => ({
            ...msg,
            sender_name: msg.users?.full_name || 'Usuario',
            sender_avatar: msg.users?.avatar_url,
        })) as Message[]
    },

    async sendMessage(conversationId: string, senderId: string, content: string, type: MessageType = 'text'): Promise<Message | null> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content,
                type,
                is_edited: false,
                is_deleted: false,
            })
            .select()
            .single()

        if (error) {
            console.error('Error sending message:', error.message)
            return null
        }

        notifyListeners()
        return data as Message
    },

    async editMessage(messageId: string, newContent: string): Promise<Message | null> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('messages')
            .update({ content: newContent, is_edited: true })
            .eq('id', messageId)
            .select()
            .single()

        if (error) {
            console.error('Error editing message:', error.message)
            return null
        }

        notifyListeners()
        return data as Message
    },

    async deleteMessage(messageId: string): Promise<boolean> {
        const supabase = getSupabaseClient()

        const { error } = await supabase
            .from('messages')
            .update({ is_deleted: true })
            .eq('id', messageId)

        if (error) {
            console.error('Error deleting message:', error.message)
            return false
        }

        notifyListeners()
        return true
    },

    // ── Subscriptions ──

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },
}
