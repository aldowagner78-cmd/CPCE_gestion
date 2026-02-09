'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Permission } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
    children: ReactNode
    /** Permiso requerido para acceder */
    permission?: Permission
    /** Roles permitidos (alternativa a permission) */
    allowedRoles?: string[]
    /** Ruta de redirección si no tiene acceso */
    redirectTo?: string
}

/**
 * Componente para proteger rutas que requieren autenticación
 * y/o permisos específicos.
 * 
 * Uso:
 * <ProtectedRoute permission="users.manage">
 *   <UsersPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
    children,
    permission,
    allowedRoles,
    redirectTo = '/login'
}: ProtectedRouteProps) {
    const { user, loading, hasPermission } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading) {
            // No autenticado
            if (!user) {
                router.push(redirectTo)
                return
            }

            // Usuario inactivo
            if (!user.is_active) {
                router.push('/login?error=inactive')
                return
            }

            // Verificar permiso específico
            if (permission && !hasPermission(permission)) {
                router.push('/unauthorized')
                return
            }

            // Verificar roles permitidos
            if (allowedRoles && !allowedRoles.includes(user.role) && !user.is_superuser) {
                router.push('/unauthorized')
                return
            }
        }
    }, [user, loading, permission, allowedRoles, router, redirectTo, hasPermission])

    // Mostrar loading mientras verifica
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Verificando acceso...</p>
                </div>
            </div>
        )
    }

    // No mostrar contenido si no tiene acceso
    if (!user) {
        return null
    }

    if (permission && !hasPermission(permission)) {
        return null
    }

    if (allowedRoles && !allowedRoles.includes(user.role) && !user.is_superuser) {
        return null
    }

    return <>{children}</>
}

/**
 * Componente para mostrar contenido solo si tiene permiso
 */
export function RequirePermission({
    permission,
    children,
    fallback = null
}: {
    permission: Permission
    children: ReactNode
    fallback?: ReactNode
}) {
    const { hasPermission, loading } = useAuth()

    if (loading) return null

    if (!hasPermission(permission)) {
        return <>{fallback}</>
    }

    return <>{children}</>
}
