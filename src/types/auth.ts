/**
 * Tipos de autenticación y roles del sistema CPCE Salud
 */

// Roles disponibles en el sistema
export type UserRole = 'superuser' | 'admin' | 'supervisor' | 'auditor' | 'administrativo' | 'gerencia'

// Usuario autenticado
export interface AuthUser {
    id: string
    email: string
    full_name: string
    role: UserRole
    is_superuser: boolean
    jurisdiction_id: number | null
    avatar_url?: string
    is_active: boolean
}

// Permisos por funcionalidad
export type Permission =
    | 'dashboard.view'
    | 'calculator.use'
    | 'nomenclators.view'
    | 'nomenclators.manage'
    | 'audits.view'
    | 'audits.create'
    | 'audits.approve'
    | 'alerts.view'
    | 'alerts.resolve'
    | 'chat.all_channels'
    | 'chat.direct_only'
    | 'agenda.view'
    | 'agenda.create'
    | 'patients.view'
    | 'patients.manage'
    | 'config.values'
    | 'config.view'
    | 'users.manage'
    | 'backup.export'
    | 'matcher.use'
    | 'pending.view'
    | 'protocols.view'
    | 'stats.view'
    | 'revenue.view'
    | 'revenue.manage'

// Matriz de permisos por rol (fallback local — la fuente de verdad está en Supabase)
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    superuser: [
        'dashboard.view', 'calculator.use', 'nomenclators.view', 'nomenclators.manage',
        'audits.view', 'audits.create', 'audits.approve',
        'alerts.view', 'alerts.resolve',
        'chat.all_channels',
        'agenda.view', 'agenda.create',
        'patients.view', 'patients.manage',
        'config.values', 'config.view', 'users.manage', 'backup.export',
        'matcher.use', 'pending.view', 'protocols.view',
        'stats.view', 'revenue.view', 'revenue.manage'
    ],
    admin: [
        'dashboard.view', 'calculator.use', 'nomenclators.view', 'nomenclators.manage',
        'audits.view', 'audits.create', 'audits.approve',
        'alerts.view', 'alerts.resolve',
        'chat.all_channels',
        'agenda.view', 'agenda.create',
        'patients.view', 'patients.manage',
        'config.values', 'config.view', 'users.manage', 'backup.export',
        'matcher.use', 'pending.view', 'protocols.view',
        'stats.view', 'revenue.view', 'revenue.manage'
    ],
    supervisor: [
        'dashboard.view', 'calculator.use', 'nomenclators.view',
        'audits.view', 'audits.create', 'audits.approve',
        'alerts.view', 'alerts.resolve',
        'chat.all_channels',
        'agenda.view', 'agenda.create',
        'patients.view',
        'config.values', 'backup.export',
        'matcher.use', 'pending.view', 'protocols.view',
        'stats.view', 'revenue.view'
    ],
    auditor: [
        'dashboard.view', 'calculator.use', 'nomenclators.view',
        'audits.view', 'audits.create',
        'alerts.view',
        'chat.direct_only',
        'agenda.view',
        'patients.view',
        'matcher.use', 'pending.view', 'protocols.view'
    ],
    administrativo: [
        'dashboard.view', 'calculator.use', 'nomenclators.view',
        'chat.direct_only',
        'agenda.view', 'agenda.create',
        'patients.view', 'patients.manage',
        'pending.view'
    ],
    gerencia: [
        'dashboard.view',
        'stats.view', 'revenue.view',
        'alerts.view',
        'audits.view',
        'nomenclators.view',
        'patients.view'
    ]
}

// Verificar si un rol tiene un permiso
export function hasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Verificar si un usuario tiene un permiso
export function userHasPermission(user: AuthUser | null, permission: Permission): boolean {
    if (!user) return false
    if (user.is_superuser) return true // Superusuario tiene todos los permisos
    return hasPermission(user.role, permission)
}

// Labels para mostrar en UI
export const ROLE_LABELS: Record<UserRole, string> = {
    superuser: 'Superusuario',
    admin: 'Administrador',
    supervisor: 'Supervisor',
    auditor: 'Auditor Médico',
    administrativo: 'Administrativo',
    gerencia: 'Gerencia'
}

// Colores por rol (para badges)
export const ROLE_COLORS: Record<UserRole, string> = {
    superuser: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    supervisor: 'bg-emerald-100 text-emerald-800',
    auditor: 'bg-amber-100 text-amber-800',
    administrativo: 'bg-slate-100 text-slate-800',
    gerencia: 'bg-indigo-100 text-indigo-800'
}
