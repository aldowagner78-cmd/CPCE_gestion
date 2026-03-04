'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthUser, UserRole, Permission, ROLE_PERMISSIONS } from '@/types/auth'
import { getUserPermissions } from '@/services/roleService'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    permissions: Permission[]
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    hasPermission: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [permissions, setPermissions] = useState<Permission[]>([])
    // Create supabase client ONCE, not on every render
    const supabase = useMemo(() => createClient(), [])

    const fetchUserProfile = async (authUser: SupabaseUser): Promise<AuthUser | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .single()

            // Fallback de desarrollo explícito (solo si se habilita por env var)
            if (error || !data || !data.role) {
                if (DEV_AUTH_BYPASS) {
                    console.warn('⚠️ DEV AUTH BYPASS habilitado: perfil temporal de superusuario')
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

                console.error('Perfil de usuario no encontrado o sin rol. Acceso denegado.')
                return null
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
                    if (profile) {
                        loadPermissions(profile)
                    }
                } else {
                    setUser(null)
                    setPermissions([])
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
                    if (profile) {
                        loadPermissions(profile)
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setPermissions([])
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

    // Carga permisos desde DB (con fallback local)
    const loadPermissions = async (profile: AuthUser) => {
        if (profile.is_superuser) {
            // Superuser tiene todos los permisos
            setPermissions(Object.values(ROLE_PERMISSIONS).flat().filter((v, i, a) => a.indexOf(v) === i))
            return
        }
        try {
            const perms = await getUserPermissions(profile.id, profile.role)
            setPermissions(perms.length > 0 ? perms : ROLE_PERMISSIONS[profile.role] || [])
        } catch {
            setPermissions(ROLE_PERMISSIONS[profile.role] || [])
        }
    }

    const signOut = async () => {
        // Limpiar estado local inmediatamente (sin esperar red)
        setUser(null)
        setPermissions([])
        // Invalidar sesión en el servidor en segundo plano (no bloquea la UI)
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    }

    const hasPermissionFn = (permission: Permission): boolean => {
        if (!user) return false
        if (user.is_superuser) return true
        return permissions.includes(permission)
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            permissions,
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
