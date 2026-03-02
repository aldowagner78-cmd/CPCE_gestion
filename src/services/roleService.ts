/**
 * Servicio de Roles y Permisos — CPCE Salud
 * Gestiona roles, permisos y asignaciones desde Supabase.
 * Fallback local si las tablas aún no existen.
 */

import { createClient } from '@/lib/supabase/client'
import { Role, UserRoleAssignment } from '@/types/database'
import { ROLE_PERMISSIONS, Permission, UserRole } from '@/types/auth'

const supabase = createClient()

// ─── Roles ──────────────────────────────────────────

export async function getRoles(): Promise<Role[]> {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('id')

    if (error) {
        console.warn('⚠️ roles table not available, using fallback')
        return []
    }
    return data || []
}

// ─── User Role Assignments ──────────────────────────

export async function getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
    const { data, error } = await supabase
        .from('user_roles')
        .select(`
            *,
            role:roles(*)
        `)
        .eq('user_id', userId)

    if (error) {
        console.warn('⚠️ user_roles table not available')
        return []
    }
    return data || []
}

export async function assignRole(userId: string, roleId: number, assignedBy?: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_roles')
        .upsert({
            user_id: userId,
            role_id: roleId,
            assigned_by: assignedBy
        }, { onConflict: 'user_id,role_id' })

    if (error) {
        console.error('Error assigning role:', error)
        return false
    }
    return true
}

export async function removeRole(userId: string, roleId: number): Promise<boolean> {
    const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)

    if (error) {
        console.error('Error removing role:', error)
        return false
    }
    return true
}

// ─── Permisos desde DB ──────────────────────────────

/**
 * Carga los permisos de un rol desde Supabase (role_permissions + permissions).
 * Si falla, usa el fallback local de ROLE_PERMISSIONS.
 */
export async function getPermissionsForRole(roleName: string): Promise<Permission[]> {
    try {
        const { data, error } = await supabase
            .from('role_permissions')
            .select(`
                permission:permissions(module, action)
            `)
            .eq('role_id', (
                await supabase.from('roles').select('id').eq('name', roleName).single()
            ).data?.id)

        if (error || !data) {
            return ROLE_PERMISSIONS[roleName as UserRole] || []
        }

        return data.flatMap((rp: Record<string, unknown>) => {
            const perms = rp.permission
            if (!perms) return []
            // Supabase puede devolver un objeto o un array según la relación
            const permList = Array.isArray(perms) ? perms : [perms]
            return permList.map((p: { module: string; action: string }) =>
                `${p.module}.${p.action}` as Permission
            )
        })
    } catch {
        // Fallback to local permissions
        return ROLE_PERMISSIONS[roleName as UserRole] || []
    }
}

/**
 * Carga todos los permisos efectivos de un usuario (unión de todos sus roles).
 * Si user_roles no existe, usa el rol del campo `users.role` como fallback.
 */
export async function getUserPermissions(userId: string, fallbackRole?: UserRole): Promise<Permission[]> {
    try {
        const assignments = await getUserRoles(userId)

        if (assignments.length > 0) {
            // Unir permisos de todos los roles asignados
            const allPerms = new Set<Permission>()
            for (const assignment of assignments) {
                const roleName = assignment.role?.name
                if (roleName) {
                    const perms = await getPermissionsForRole(roleName)
                    perms.forEach((p) => allPerms.add(p))
                }
            }
            return Array.from(allPerms)
        }

        // Fallback: si no hay registros en user_roles, usar el campo role de la tabla users  
        if (fallbackRole) {
            return ROLE_PERMISSIONS[fallbackRole] || []
        }

        return []
    } catch {
        // Double fallback: solo permisos locales
        if (fallbackRole) {
            return ROLE_PERMISSIONS[fallbackRole] || []
        }
        return []
    }
}
