'use client'

import { useState, useEffect, useCallback } from 'react'
import { SupabaseChatService, Conversation, Message, User } from '@/services/chatService.supabase'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook reactivo para consumir datos del Chat desde Supabase CON REALTIME.
 * Los usuarios ven nuevas conversaciones al instante.
 */
export function useSupabaseChat() {
    const [users, setUsers] = useState<User[]>([])
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Use first user as current (mock - in production would come from auth)
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    const fetchInitialData = useCallback(async () => {
        setLoading(true)
        try {
            const [usersData, convsData] = await Promise.all([
                SupabaseChatService.getAllUsers(),
                SupabaseChatService.getConversations(),
            ])
            setUsers(usersData)
            setConversations(convsData)
            // Set first user as current (mock auth)
            if (usersData.length > 0) {
                setCurrentUser(usersData[0])
            }
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchInitialData()

        const supabase = createClient()
        
        // REALTIME: Suscripción a conversaciones y usuarios
        const conversationsChannel = supabase
            .channel('conversations-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                },
                (payload) => {
                    console.log('[Realtime] Conversation cambió:', payload)
                    fetchInitialData()
                }
            )
            .subscribe()

        const usersChannel = supabase
            .channel('users-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users',
                },
                (payload) => {
                    console.log('[Realtime] User cambió:', payload)
                    fetchInitialData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(conversationsChannel)
            supabase.removeChannel(usersChannel)
        }
    }, [fetchInitialData])

    return {
        users,
        conversations,
        currentUser,
        loading,
        error,
        refetch: fetchInitialData,
    }
}

/**
 * Hook para cargar mensajes de una conversación específica CON REALTIME.
 * Los mensajes nuevos aparecen automáticamente sin recargar.
 */
export function useSupabaseMessages(conversationId: string | null) {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)

    const fetchMessages = useCallback(async () => {
        if (!conversationId) {
            setMessages([])
            return
        }

        setLoading(true)
        try {
            const data = await SupabaseChatService.getMessages(conversationId)
            setMessages(data)
        } catch (err) {
            console.error('Error fetching messages:', err)
        } finally {
            setLoading(false)
        }
    }, [conversationId])

    useEffect(() => {
        fetchMessages()

        if (!conversationId) return

        const supabase = createClient()
        
        // REALTIME: Suscripción a mensajes de esta conversación
        const channel = supabase
            .channel(`messages-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    console.log('[Realtime] Message cambió:', payload)
                    fetchMessages()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchMessages, conversationId])

    const sendMessage = async (senderId: string, content: string) => {
        if (!conversationId) return null
        const msg = await SupabaseChatService.sendMessage(conversationId, senderId, content)
        await fetchMessages()
        return msg
    }

    return {
        messages,
        loading,
        sendMessage,
        refetch: fetchMessages,
    }
}
