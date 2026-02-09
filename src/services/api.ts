
import { MOCK_AFFILIATES, MOCK_PRACTICES, MOCK_PLANS } from '@/lib/mockData'
import { Practice, Affiliate, Plan } from '@/types/database'

// Set this to false when you are ready to connect to real Supabase
const USE_MOCK_DATA = true

// --- Service Definition ---

export const DataService = {

    async searchPractices(query: string, jurisdictionId: number): Promise<Practice[]> {
        if (USE_MOCK_DATA) {
            await new Promise(resolve => setTimeout(resolve, 300)) // Simulate network latency
            const lowerQuery = query.toLowerCase()
            return MOCK_PRACTICES.filter(p =>
                p.jurisdiction_id === jurisdictionId &&
                (p.code.includes(lowerQuery) || p.description.toLowerCase().includes(lowerQuery))
            )
        }
        // TODO: Implement real Supabase call here
        return []
    },

    async getAffiliateByDNI(dni: string, jurisdictionId: number): Promise<Affiliate | null> {
        if (USE_MOCK_DATA) {
            await new Promise(resolve => setTimeout(resolve, 300))
            return MOCK_AFFILIATES.find(a =>
                a.document_number === dni && a.jurisdiction_id === jurisdictionId
            ) || null
        }
        // TODO: Implement real Supabase call here
        return null
    },

    async getPlan(planId: number): Promise<Plan | null> {
        if (USE_MOCK_DATA) {
            return MOCK_PLANS.find(p => p.id === planId) || null
        }
        return null
    }
}
