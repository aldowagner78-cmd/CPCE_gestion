import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface PracticeType {
    id: number
    code: string
    name: string
    description: string | null
    unit_name: string | null
    created_at: string
}

export interface Practice {
    id: number
    code: string
    name: string
    description: string | null
    category: string | null
    practice_type_id: number | null
    unit_quantity: number
    financial_value: number
    jurisdiction_id: number
    is_active: boolean
    created_at: string
    updated_at: string
    
    // Relaciones
    practice_type?: PracticeType
}

export interface PracticeTypeStats {
    type_id: number
    type_code: string
    type_name: string
    total_practices: number
    active_practices: number
}

export const practiceTypeService = {
    /**
     * Obtener todos los tipos de nomencladores
     */
    async getPracticeTypes(): Promise<PracticeType[]> {
        const { data, error } = await supabase
            .from('practice_types')
            .select('*')
            .order('code')

        if (error) throw error
        return data || []
    },

    /**
     * Obtener estadísticas por tipo de nomenclador
     */
    async getPracticeTypeStats(jurisdictionId?: number): Promise<PracticeTypeStats[]> {
        let query = supabase
            .from('practices')
            .select(`
                practice_type_id,
                practice_type:practice_types(id, code, name),
                is_active
            `)

        if (jurisdictionId) {
            query = query.eq('jurisdiction_id', jurisdictionId)
        }

        const { data, error } = await query

        if (error) throw error

        // Agrupar por tipo
        const statsMap = new Map<number, PracticeTypeStats>()

        if (!data) return []

        for (const practice of data) {
            const typeId = practice.practice_type_id
            const practiceType = practice.practice_type as unknown
            
            if (!typeId || !practiceType || !Array.isArray(practiceType) || practiceType.length === 0) continue
            
            const typeData = practiceType[0] as PracticeType

            if (!statsMap.has(typeId)) {
                statsMap.set(typeId, {
                    type_id: typeId,
                    type_code: typeData.code,
                    type_name: typeData.name,
                    total_practices: 0,
                    active_practices: 0
                })
            }

            const stats = statsMap.get(typeId)!
            stats.total_practices++
            if (practice.is_active) {
                stats.active_practices++
            }
        }

        return Array.from(statsMap.values())
    },

    /**
     * Obtener prácticas por tipo con paginación y filtros
     */
    async getPracticesByType(
        typeId: number,
        page = 1,
        pageSize = 50,
        search = '',
        jurisdictionId?: number
    ): Promise<{ data: Practice[]; count: number }> {
        let query = supabase
            .from('practices')
            .select(`
                *,
                practice_type:practice_types(*)
            `, { count: 'exact' })
            .eq('practice_type_id', typeId)

        // Filtro por jurisdicción
        if (jurisdictionId) {
            query = query.eq('jurisdiction_id', jurisdictionId)
        }

        // Filtro de búsqueda
        if (search) {
            query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        // Paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, error, count } = await query
            .order('code')
            .range(from, to)

        if (error) throw error
        return { data: data as Practice[], count: count || 0 }
    },

    /**
     * Obtener todas las prácticas con filtros
     */
    async getAllPractices(
        page = 1,
        pageSize = 50,
        search = '',
        jurisdictionId?: number,
        typeId?: number
    ): Promise<{ data: Practice[]; count: number }> {
        let query = supabase
            .from('practices')
            .select(`
                *,
                practice_type:practice_types(*)
            `, { count: 'exact' })

        if (jurisdictionId) {
            query = query.eq('jurisdiction_id', jurisdictionId)
        }

        if (typeId) {
            query = query.eq('practice_type_id', typeId)
        }

        if (search) {
            query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, error, count } = await query
            .order('code')
            .range(from, to)

        if (error) throw error
        return { data: data as Practice[], count: count || 0 }
    },

    /**
     * Crear nueva práctica
     */
    async createPractice(practice: Omit<Practice, 'id' | 'created_at' | 'updated_at' | 'practice_type'>): Promise<Practice> {
        const { data, error } = await supabase
            .from('practices')
            .insert({
                ...practice,
                updated_at: new Date().toISOString()
            })
            .select(`
                *,
                practice_type:practice_types(*)
            `)
            .single()

        if (error) throw error
        return data as Practice
    },

    /**
     * Actualizar práctica
     */
    async updatePractice(id: number, updates: Partial<Practice>): Promise<Practice> {
        const { data, error } = await supabase
            .from('practices')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                practice_type:practice_types(*)
            `)
            .single()

        if (error) throw error
        return data as Practice
    },

    /**
     * Eliminar práctica
     */
    async deletePractice(id: number): Promise<void> {
        const { error } = await supabase
            .from('practices')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    /**
     * Buscar prácticas (usado para autocomplete en homologador)
     */
    async searchPractices(query: string, limit = 20, jurisdictionId?: number): Promise<Practice[]> {
        let supabaseQuery = supabase
            .from('practices')
            .select(`
                *,
                practice_type:practice_types(*)
            `)
            .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
            .limit(limit)

        if (jurisdictionId) {
            supabaseQuery = supabaseQuery.eq('jurisdiction_id', jurisdictionId)
        }

        const { data, error } = await supabaseQuery

        if (error) throw error
        return data as Practice[]
    }
}
