import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Practice {
    id: number
    code: string
    name: string
    description: string
    category: string
    is_active: boolean
    jurisdiction_id: number
}

export const practiceService = {
    /**
     * Buscar prácticas por código o nombre
     */
    async searchPractices(query: string, jurisdictionId?: number) {
        let dbQuery = supabase
            .from('practices')
            .select('*')
            .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
            .limit(20)

        if (jurisdictionId) {
            dbQuery = dbQuery.eq('jurisdiction_id', jurisdictionId)
        }

        const { data, error } = await dbQuery
        if (error) throw error
        return data as Practice[]
    },

    /**
     * Obtener una práctica por ID
     */
    async getPracticeById(id: number) {
        const { data, error } = await supabase
            .from('practices')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data as Practice
    }
}
