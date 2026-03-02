'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Permission, UserRole } from '@/types/auth'
import { ReactNode } from 'react'

interface RequireRoleProps {
    /** Roles permitidos (OR — basta con tener uno) */
    roles?: UserRole[]
    /** Permisos requeridos (OR — basta con tener uno) */
    permissions?: Permission[]
    /** Contenido a mostrar si no tiene acceso (por defecto: nada) */
    fallback?: ReactNode
    children: ReactNode
}

/**
 * Wrapper que oculta contenido si el usuario no tiene el rol o permiso requerido.
 * Si no se especifica nada, muestra siempre.
 * Superusuarios pasan siempre.
 * 
 * Uso:
 *   <RequireRole roles={['admin', 'auditor']}>
 *     <SensitiveComponent />
 *   </RequireRole>
 * 
 *   <RequireRole permissions={['audits.approve']}>
 *     <ApproveButton />
 *   </RequireRole>
 */
export function RequireRole({ roles, permissions, fallback = null, children }: RequireRoleProps) {
    const { user, hasPermission } = useAuth()

    if (!user) return <>{fallback}</>

    // Superusuarios pasan siempre
    if (user.is_superuser) return <>{children}</>

    // Verificar por rol
    if (roles && roles.length > 0) {
        if (roles.includes(user.role)) return <>{children}</>
    }

    // Verificar por permiso
    if (permissions && permissions.length > 0) {
        const hasAny = permissions.some((p) => hasPermission(p))
        if (hasAny) return <>{children}</>
    }

    // Si no se especificaron ni roles ni permisos, mostrar siempre
    if (!roles && !permissions) return <>{children}</>

    return <>{fallback}</>
}
