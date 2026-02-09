import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface UnitValues {
    id: number
    jurisdiction_id: number
    medical_value: number      // Galeno
    biochemical_value: number  // NBU
    dental_value: number       // UO
    valid_from: string
}

export const valuesService = {
    /**
     * Obtener valores vigentes para una jurisdicción
     */
    async getCurrentValues(jurisdictionId: number): Promise<UnitValues | null> {
        const { data, error } = await supabase
            .from('unit_values')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .order('valid_from', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            console.error('Error fetching unit values:', error)
            return null
        }

        return data
    },

    /**
     * Obtener valores vigentes para todas las jurisdicciones
     */
    async getAllCurrentValues(): Promise<UnitValues[]> {
        // En una app real, esto sería una query más compleja o un view
        // Por ahora obtenemos todo y filtramos en cliente o hacemos multiples queries
        // Asumimos que hay pocas jurisdicciones (2)

        const jurisdictions = [1, 2] // Santa Fe, Rosario
        const results = await Promise.all(
            jurisdictions.map(id => valuesService.getCurrentValues(id))
        )

        return results.filter((v): v is UnitValues => v !== null)
    },

    /**
     * Actualizar valores (crea un nuevo registro con fecha actual)
     */
    async updateValues(
        jurisdictionId: number,
        values: { medical: number, biochemical: number, dental: number }
    ): Promise<UnitValues> {
        const { data, error } = await supabase
            .from('unit_values')
            .insert({
                jurisdiction_id: jurisdictionId,
                medical_value: values.medical,
                biochemical_value: values.biochemical,
                dental_value: values.dental,
                valid_from: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw new Error(error.message)

        return data
    }
}
