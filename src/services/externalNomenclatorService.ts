import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface ExternalNomenclator {
    id: number
    code: string
    name: string
    description: string
    is_active: boolean
    created_at: string
}

export interface ExternalPractice {
    id: string
    nomenclator_id: number
    code: string
    description: string
    value: number | null
    unit: string | null
    internal_practice_id: number | null
    match_confidence: number | null
    match_type: 'manual' | 'automatic' | 'suggestion' | null
    created_at: string
    updated_at: string

    // Joined fields
    internal_practice?: {
        code: string
        name: string
    }
}

export const externalNomenclatorService = {
    /**
     * Obtener todos los nomencladores activos
     */
    async getNomenclators() {
        const { data, error } = await supabase
            .from('external_nomenclators')
            .select('*')
            .order('name')

        if (error) throw error
        return data as ExternalNomenclator[]
    },

    /**
     * Obtener prácticas de un nomenclador con paginación y filtros
     */
    async getPractices(
        nomenclatorId: number,
        page = 1,
        pageSize = 20,
        search = '',
        mappingStatus: 'all' | 'mapped' | 'unmapped' = 'all'
    ) {
        let query = supabase
            .from('external_practices')
            .select(`
                *,
                internal_practice:practices(code, name)
            `, { count: 'exact' })
            .eq('nomenclator_id', nomenclatorId)

        // Filtro de búsqueda
        if (search) {
            query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`)
        }

        // Filtro de estado de mapeo
        if (mappingStatus === 'mapped') {
            query = query.not('internal_practice_id', 'is', null)
        } else if (mappingStatus === 'unmapped') {
            query = query.is('internal_practice_id', null)
        }

        // Paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, error, count } = await query
            .order('code')
            .range(from, to)

        if (error) throw error
        return { data: data as ExternalPractice[], count }
    },

    /**
     * Mapear una práctica externa a una interna
     */
    async mapPractice(externalPracticeId: string, internalPracticeId: number | null) {
        const { data, error } = await supabase
            .from('external_practices')
            .update({
                internal_practice_id: internalPracticeId,
                match_type: internalPracticeId ? 'manual' : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', externalPracticeId)
            .select()
            .single()

        if (error) throw error
        return data as ExternalPractice
    },

    /**
     * Importar prácticas masivamente (usado por el importador CSV)
     */
    async bulkUpsertPractices(practices: Partial<ExternalPractice>[]) {
        const { data, error } = await supabase
            .from('external_practices')
            .upsert(practices, { onConflict: 'nomenclator_id, code' })
            .select()

        if (error) throw error
        return data
    }
}
