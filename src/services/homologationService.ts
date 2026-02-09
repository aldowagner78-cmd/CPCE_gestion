import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Homologation {
    id: string
    internal_practice_id: number
    external_nomenclator_id: number
    external_code: string
    external_description: string | null
    ratio: number
    mapping_type: 'manual' | 'automatic' | 'suggested'
    confidence_score: number | null
    notes: string | null
    created_by: number | null
    updated_by: number | null
    created_at: string
    updated_at: string
    
    // Relaciones joined
    internal_practice?: {
        id: number
        code: string
        name: string
        practice_type_id: number
    }
    external_nomenclator?: {
        id: number
        code: string
        name: string
    }
}

export interface HomologationSuggestion {
    internal_practice_id: number
    internal_code: string
    internal_name: string
    external_code: string
    external_description: string
    similarity_score: number
    reason: string
}

export const homologationService = {
    /**
     * Obtener todas las homologaciones de un nomenclador externo
     */
    async getHomologationsByNomenclator(
        nomenclatorId: number,
        page = 1,
        pageSize = 50,
        search = '',
        filterType: 'all' | 'manual' | 'automatic' | 'suggested' = 'all'
    ): Promise<{ data: Homologation[]; count: number }> {
        let query = supabase
            .from('homologations')
            .select(`
                *,
                internal_practice:practices(id, code, name, practice_type_id),
                external_nomenclator:external_nomenclators(id, code, name)
            `, { count: 'exact' })
            .eq('external_nomenclator_id', nomenclatorId)

        // Filtro de búsqueda
        if (search) {
            query = query.or(`external_code.ilike.%${search}%,external_description.ilike.%${search}%`)
        }

        // Filtro por tipo
        if (filterType !== 'all') {
            query = query.eq('mapping_type', filterType)
        }

        // Paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, error, count } = await query
            .order('external_code')
            .range(from, to)

        if (error) throw error
        return { data: data as Homologation[], count: count || 0 }
    },

    /**
     * Crear una nueva homologación manual
     */
    async createHomologation(
        internalPracticeId: number,
        externalNomenclatorId: number,
        externalCode: string,
        externalDescription?: string,
        ratio = 1.0,
        notes?: string,
        userId?: number
    ): Promise<Homologation> {
        const { data, error } = await supabase
            .from('homologations')
            .insert({
                internal_practice_id: internalPracticeId,
                external_nomenclator_id: externalNomenclatorId,
                external_code: externalCode,
                external_description: externalDescription,
                ratio: ratio,
                mapping_type: 'manual',
                notes: notes,
                created_by: userId,
                updated_by: userId,
                updated_at: new Date().toISOString()
            })
            .select(`
                *,
                internal_practice:practices(id, code, name, practice_type_id),
                external_nomenclator:external_nomenclators(id, code, name)
            `)
            .single()

        if (error) throw error
        return data as Homologation
    },

    /**
     * Actualizar una homologación existente
     */
    async updateHomologation(
        id: string,
        updates: {
            internal_practice_id?: number
            ratio?: number
            notes?: string
        },
        userId?: number
    ): Promise<Homologation> {
        const { data, error } = await supabase
            .from('homologations')
            .update({
                ...updates,
                updated_by: userId,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                internal_practice:practices(id, code, name, practice_type_id),
                external_nomenclator:external_nomenclators(id, code, name)
            `)
            .single()

        if (error) throw error
        return data as Homologation
    },

    /**
     * Eliminar una homologación
     */
    async deleteHomologation(id: string): Promise<void> {
        const { error } = await supabase
            .from('homologations')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    /**
     * Buscar prácticas internas similares a un código/descripción externa
     * Usa fuzzy matching simple basado en similitud de texto
     */
    async suggestHomologations(
        externalCode: string,
        externalDescription: string,
        nomenclatorId: number,
        limit = 10
    ): Promise<HomologationSuggestion[]> {
        // Buscar por código similar
        const { data: byCode, error: errorCode } = await supabase
            .from('practices')
            .select('id, code, name, practice_type_id')
            .ilike('code', `%${externalCode}%`)
            .limit(5)

        if (errorCode) throw errorCode

        // Buscar por descripción similar (palabras clave)
        const keywords = externalDescription
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3) // Solo palabras > 3 letras
            .slice(0, 3) // Máximo 3 palabras

        let suggestionsByDescription: any[] = []
        if (keywords.length > 0) {
            const searchPattern = keywords.join('|')
            const { data: byDesc, error: errorDesc } = await supabase
                .from('practices')
                .select('id, code, name, practice_type_id')
                .or(keywords.map(kw => `name.ilike.%${kw}%`).join(','))
                .limit(10)

            if (!errorDesc) {
                suggestionsByDescription = byDesc || []
            }
        }

        // Combinar resultados y calcular score
        const allSuggestions = [...(byCode || []), ...suggestionsByDescription]
        const uniqueSuggestions = Array.from(
            new Map(allSuggestions.map(item => [item.id, item])).values()
        )

        // Calcular similarity score (simple)
        const suggestions: HomologationSuggestion[] = uniqueSuggestions.map(practice => {
            let score = 0
            let reason = ''

            // Score por coincidencia de código
            if (practice.code.toLowerCase().includes(externalCode.toLowerCase())) {
                score += 0.5
                reason = 'Código similar'
            }

            // Score por coincidencia de palabras clave en nombre
            const matchedKeywords = keywords.filter(kw => 
                practice.name.toLowerCase().includes(kw)
            )
            if (matchedKeywords.length > 0) {
                score += (matchedKeywords.length / keywords.length) * 0.5
                reason = reason ? `${reason}, descripción coincide` : 'Descripción similar'
            }

            return {
                internal_practice_id: practice.id,
                internal_code: practice.code,
                internal_name: practice.name,
                external_code: externalCode,
                external_description: externalDescription,
                similarity_score: Math.min(score, 1.0),
                reason: reason || 'Coincidencia parcial'
            }
        })

        // Ordenar por score descendente
        return suggestions
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
    },

    /**
     * Obtener estadísticas de homologación de un nomenclador
     */
    async getHomologationStats(nomenclatorId: number): Promise<{
        total_external: number
        homologated: number
        pending: number
        automatic: number
        manual: number
    }> {
        // Total de prácticas externas
        const { count: totalExternal } = await supabase
            .from('external_practices')
            .select('*', { count: 'exact', head: true })
            .eq('nomenclator_id', nomenclatorId)

        // Total homologadas
        const { count: homologated } = await supabase
            .from('homologations')
            .select('*', { count: 'exact', head: true })
            .eq('external_nomenclator_id', nomenclatorId)

        // Por tipo
        const { count: automatic } = await supabase
            .from('homologations')
            .select('*', { count: 'exact', head: true })
            .eq('external_nomenclator_id', nomenclatorId)
            .eq('mapping_type', 'automatic')

        const { count: manual } = await supabase
            .from('homologations')
            .select('*', { count: 'exact', head: true })
            .eq('external_nomenclator_id', nomenclatorId)
            .eq('mapping_type', 'manual')

        return {
            total_external: totalExternal || 0,
            homologated: homologated || 0,
            pending: (totalExternal || 0) - (homologated || 0),
            automatic: automatic || 0,
            manual: manual || 0
        }
    },

    /**
     * Importar múltiples homologaciones en batch
     */
    async bulkCreateHomologations(
        homologations: Array<{
            internal_practice_id: number
            external_nomenclator_id: number
            external_code: string
            external_description?: string
            ratio?: number
            mapping_type?: 'manual' | 'automatic'
        }>,
        userId?: number
    ): Promise<number> {
        const rows = homologations.map(h => ({
            ...h,
            ratio: h.ratio || 1.0,
            mapping_type: h.mapping_type || 'manual',
            created_by: userId,
            updated_by: userId,
            updated_at: new Date().toISOString()
        }))

        const { data, error } = await supabase
            .from('homologations')
            .upsert(rows, { 
                onConflict: 'external_nomenclator_id,external_code',
                ignoreDuplicates: false 
            })
            .select()

        if (error) throw error
        return data?.length || 0
    }
}
