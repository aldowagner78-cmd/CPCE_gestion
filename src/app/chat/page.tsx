'use client'

import { useState, useRef, useEffect } from 'react'
import { useSupabaseChat, useSupabaseMessages } from '@/lib/useSupabaseChat'
import { Conversation, Message, User } from '@/services/chatService.supabase'
import {
    MessageCircle, Send, Hash, Lock, Users, Search,
    Smile, Loader2, Database
} from 'lucide-react'

// ── Helpers ──

function formatMessageTime(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `${date.getDate()}/${date.getMonth() + 1}`
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

function getAvatarColor(id: string): string {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
}

// ── Components ──

function ConversationListItem({
    conversation,
    isActive,
    onClick,
}: {
    conversation: Conversation
    isActive: boolean
    onClick: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${conversation.is_private ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                {conversation.is_private ? <Lock size={18} className="text-amber-600" /> : <Hash size={18} className="text-slate-500" />}
            </div>
            <div className="flex-1 min-w-0">
                <span className="font-medium text-sm dark:text-white truncate block">{conversation.name || 'Sala'}</span>
                {conversation.description && (
                    <p className="text-xs text-slate-500 truncate">{conversation.description}</p>
                )}
            </div>
        </div>
    )
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isOwn && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${getAvatarColor(message.sender_id || '')}`}>
                        {getInitials(message.sender_name || 'U')}
                    </div>
                )}
                <div>
                    {!isOwn && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                            {message.sender_name}
                        </span>
                    )}
                    <div
                        className={`px-4 py-2 rounded-2xl ${isOwn
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-md'
                            }`}
                    >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 text-xs text-slate-400 ${isOwn ? 'justify-end' : ''}`}>
                        {formatMessageTime(message.created_at)}
                        {message.is_edited && <span>(editado)</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}

function UserListItem({ user, onClick }: { user: User; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(user.id)}`}>
                {getInitials(user.full_name)}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium dark:text-white">{user.full_name}</span>
                <span className="text-xs text-slate-500 block">{user.role}</span>
            </div>
        </div>
    )
}

// ── Main Page ──

export default function ChatPage() {
    const { users, conversations, currentUser, loading, error } = useSupabaseChat()
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
    const [messageInput, setMessageInput] = useState('')
    const [showUserList, setShowUserList] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const { messages, sendMessage, loading: messagesLoading } = useSupabaseMessages(activeConversation?.id || null)

    // Set first conversation as active when loaded
    useEffect(() => {
        if (conversations.length > 0 && !activeConversation) {
            setActiveConversation(conversations[0])
        }
    }, [conversations, activeConversation])

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    const handleSendMessage = async () => {
        if (!activeConversation || !currentUser || !messageInput.trim()) return
        await sendMessage(currentUser.id, messageInput.trim())
        setMessageInput('')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const filteredConversations = conversations.filter(
        (c) => !searchTerm.trim() || c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredUsers = users.filter(
        (u) => u.id !== currentUser?.id && (!searchTerm.trim() || u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Loading state
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando mensajes desde Supabase...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center p-6 bg-red-50 rounded-xl">
                    <MessageCircle className="h-12 w-12 mx-auto text-red-500" />
                    <p className="mt-4 text-red-700">Error: {error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-900">
            {/* Sidebar */}
            <div className="w-72 bg-white dark:bg-slate-800 border-r dark:border-slate-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-6 w-6 text-blue-500" />
                        <h1 className="font-bold text-lg dark:text-white">Chat CPCE</h1>
                        <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                            <Database size={12} /> Supabase
                        </span>
                    </div>
                    {currentUser && (
                        <p className="text-xs text-slate-500 mt-1">
                            Conectado como: {currentUser.full_name}
                        </p>
                    )}
                </div>

                {/* Search */}
                <div className="p-3 border-b dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b dark:border-slate-700">
                    <button
                        onClick={() => setShowUserList(false)}
                        className={`flex-1 py-2 text-sm font-medium ${!showUserList ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
                    >
                        <Hash size={14} className="inline mr-1" /> Canales
                    </button>
                    <button
                        onClick={() => setShowUserList(true)}
                        className={`flex-1 py-2 text-sm font-medium ${showUserList ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
                    >
                        <Users size={14} className="inline mr-1" /> Usuarios
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {!showUserList ? (
                        filteredConversations.length === 0 ? (
                            <p className="p-4 text-center text-slate-500 text-sm">Sin canales</p>
                        ) : (
                            filteredConversations.map((conv) => (
                                <ConversationListItem
                                    key={conv.id}
                                    conversation={conv}
                                    isActive={activeConversation?.id === conv.id}
                                    onClick={() => setActiveConversation(conv)}
                                />
                            ))
                        )
                    ) : (
                        filteredUsers.length === 0 ? (
                            <p className="p-4 text-center text-slate-500 text-sm">Sin usuarios</p>
                        ) : (
                            filteredUsers.map((user) => (
                                <UserListItem key={user.id} user={user} onClick={() => { }} />
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Main Chat */}
            <div className="flex-1 flex flex-col">
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b dark:border-slate-700 bg-white dark:bg-slate-800 px-6 flex items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeConversation.is_private ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                    {activeConversation.is_private ? <Lock size={18} className="text-amber-600" /> : <Hash size={18} className="text-slate-500" />}
                                </div>
                                <div>
                                    <h2 className="font-bold dark:text-white">{activeConversation.name}</h2>
                                    <p className="text-xs text-slate-500">{activeConversation.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
                            {messagesLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Sin mensajes aún</p>
                                    <p className="text-sm">Sé el primero en escribir</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isOwn={msg.sender_id === currentUser?.id}
                                    />
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <button className="text-slate-400 hover:text-slate-600">
                                    <Smile size={22} />
                                </button>
                                <input
                                    type="text"
                                    placeholder="Escribe un mensaje..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 px-4 py-2 border rounded-full text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim()}
                                    className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center text-white"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-slate-500">
                            <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg">Selecciona una conversación</p>
                            <p className="text-sm">O inicia un nuevo chat</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
