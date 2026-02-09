'use client'

import { useState, useEffect, useCallback } from 'react'
import { SupabaseChatService, Conversation, Message, User } from '@/services/chatService.supabase'

/**
 * Hook reactivo para consumir datos del Chat desde Supabase.
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

        const unsubscribe = SupabaseChatService.subscribe(() => {
            fetchInitialData()
        })

        return unsubscribe
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
 * Hook para cargar mensajes de una conversación específica.
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

        const unsubscribe = SupabaseChatService.subscribe(fetchMessages)
        return unsubscribe
    }, [fetchMessages])

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
