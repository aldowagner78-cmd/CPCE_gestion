import { createClient } from '@/lib/supabase/client'
import type { AuthUser, UserRole } from '@/types/auth'

const supabase = createClient()

export interface CreateUserData {
    email: string
    full_name: string
    role: UserRole
    jurisdiction_id?: number
}

export interface UpdateUserData {
    full_name?: string
    role?: UserRole
    jurisdiction_id?: number
    is_active?: boolean
}

/**
 * Servicio para gestión de usuarios (CRUD)
 */
export const userService = {
    /**
     * Listar todos los usuarios
     */
    async listAll(): Promise<AuthUser[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        return data.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role as UserRole,
            is_superuser: u.is_superuser ?? false,
            jurisdiction_id: u.jurisdiction_id,
            avatar_url: u.avatar_url,
            is_active: u.is_active ?? true,
        }))
    },

    /**
     * Obtener usuario por ID
     */
    async getById(id: string): Promise<AuthUser | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !data) return null

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
    },

    /**
     * Crear nuevo usuario
     * NOTA: Primero debe crearse en Supabase Auth
     */
    async create(userData: CreateUserData): Promise<AuthUser> {
        const { data, error } = await supabase
            .from('users')
            .insert({
                email: userData.email,
                full_name: userData.full_name,
                role: userData.role,
                jurisdiction_id: userData.jurisdiction_id ?? 1,
                is_active: true,
                is_superuser: false,
            })
            .select()
            .single()

        if (error) throw new Error(error.message)

        return {
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role as UserRole,
            is_superuser: false,
            jurisdiction_id: data.jurisdiction_id,
            is_active: true,
        }
    },

    /**
     * Actualizar usuario existente
     */
    async update(id: string, updates: UpdateUserData): Promise<AuthUser> {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw new Error(error.message)

        return {
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role as UserRole,
            is_superuser: data.is_superuser ?? false,
            jurisdiction_id: data.jurisdiction_id,
            is_active: data.is_active ?? true,
        }
    },

    /**
     * Desactivar usuario (soft delete)
     */
    async deactivate(id: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', id)

        if (error) throw new Error(error.message)
    },

    /**
     * Reactivar usuario
     */
    async activate(id: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ is_active: true })
            .eq('id', id)

        if (error) throw new Error(error.message)
    },

    /**
     * Eliminar usuario permanentemente
     * ⚠️ CUIDADO: Esto es irreversible
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)

        if (error) throw new Error(error.message)
    },

    /**
     * Invitar usuario (crea en Auth y envía email)
     */
    async invite(email: string, userData: Omit<CreateUserData, 'email'>): Promise<void> {
        // Por seguridad, las invitaciones deben hacerse desde el servidor
        // Este es un placeholder que debe implementarse con Server Actions
        throw new Error('Invite debe implementarse con Server Actions para seguridad')
    }
}
