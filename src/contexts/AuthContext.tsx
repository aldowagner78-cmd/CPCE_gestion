'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { isSupabaseEnabled } from '@/lib/supabase/client'
import { AuthUser, UserRole, Permission, userHasPermission } from '@/types/auth'

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    hasPermission: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user for development without Supabase
const MOCK_USER: AuthUser = {
    id: 'mock-user-id',
    email: 'admin@cpce.local',
    full_name: 'Admin Sistema',
    role: 'superuser',
    is_superuser: true,
    jurisdiction_id: 1,
    is_active: true,
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Si Supabase NO está habilitado, usar mock user
        if (!isSupabaseEnabled()) {
            setUser(MOCK_USER)
            setLoading(false)
            return
        }

        // Si Supabase SÍ está habilitado, inicializar autenticación real
        const initAuth = async () => {
            try {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    const profile = await fetchUserProfile(session.user, supabase)
                    setUser(profile)
                }

                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                    if (session?.user) {
                        const profile = await fetchUserProfile(session.user, supabase)
                        setUser(profile)
                    } else {
                        setUser(null)
                    }
                })

                setLoading(false)
                return () => subscription.unsubscribe()
            } catch (error) {
                console.error('Auth init error:', error)
                setUser(MOCK_USER)
                setLoading(false)
            }
        }

        initAuth()
    }, [])

    const fetchUserProfile = async (authUser: any, supabase: any): Promise<AuthUser | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .single()

            if (error || !data || !data.role) {
                console.warn('⚠️ DEV MODE: Usando perfil temporal de Superusuario (Bypass)')
                return {
                    id: authUser.id,
                    email: authUser.email!,
                    full_name: authUser.user_metadata.full_name || 'Usuario (Dev)',
                    role: 'superuser',
                    is_superuser: true,
                    jurisdiction_id: 1,
                    is_active: true,
                    avatar_url: authUser.user_metadata.avatar_url
                }
            }

            return {
                id: data.id,
                email: data.email,
                full_name: data.full_name,
                role: data.role as UserRole,
                is_superuser: data.is_superuser ?? false,
                jurisdiction_id: data.jurisdiction_id,
                avatar_url: data.avatar_url,
                is_active: data.is_active ?? true,
            }
        } catch (e) {
            console.error('Error in fetchUserProfile:', e)
            return null
        }
    }

    const signIn = async (email: string, password: string) => {
        if (!isSupabaseEnabled()) {
            setUser(MOCK_USER)
            return { error: null }
        }

        try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                return { error: new Error(error.message) }
            }

            return { error: null }
        } catch (error) {
            return { error: error as Error }
        }
    }

    const signOut = async () => {
        if (!isSupabaseEnabled()) {
            setUser(null)
            return
        }

        try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            await supabase.auth.signOut()
        } catch (error) {
            console.error('Sign out error:', error)
        }
        setUser(null)
    }

    const hasPermissionFn = (permission: Permission): boolean => {
        return userHasPermission(user, permission)
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signOut,
            hasPermission: hasPermissionFn,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// Hook para verificar permisos en componentes
export function usePermission(permission: Permission): boolean {
    const { hasPermission } = useAuth()
    return hasPermission(permission)
}
