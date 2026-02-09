'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthUser, UserRole, Permission, userHasPermission } from '@/types/auth'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    hasPermission: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // BYPASS PARA DESARROLLO: Si falla fetch (porque no existe tabla/columna)
    // o si el usuario no tiene rol asignado, lo hacemos superuser temporalmente.
    const fetchUserProfile = async (authUser: SupabaseUser): Promise<AuthUser | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .single()

            // Si hay error (ej: columna no existe) o no hay data, 
            // creamos un perfil temporal de superusuario
            if (error || !data || !data.role) {
                console.warn('⚠️ DEV MODE: Usando perfil temporal de Superusuario (Bypass)')
                return {
                    id: authUser.id,
                    email: authUser.email!,
                    full_name: authUser.user_metadata.full_name || 'Usuario (Dev)',
                    role: 'superuser',          // Forzamos superuser
                    is_superuser: true,         // Forzamos superuser
                    jurisdiction_id: 1,
                    is_active: true,
                    avatar_url: authUser.user_metadata.avatar_url
                }
            }

            // Normal flow
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

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user) {
                    const profile = await fetchUserProfile(session.user)
                    setUser(profile)
                } else {
                    setUser(null)
                }
            } catch (error) {
                console.error('Auth init error:', error)
                setUser(null)
            } finally {
                setLoading(false)
            }
        }

        initAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    const profile = await fetchUserProfile(session.user)
                    setUser(profile)
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        try {
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
        await supabase.auth.signOut()
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
