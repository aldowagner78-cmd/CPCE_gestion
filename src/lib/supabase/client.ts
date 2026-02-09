import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const SUPABASE_ENABLED = supabaseUrl && supabaseKey

export function createClient() {
    if (!SUPABASE_ENABLED) {
        throw new Error('Supabase credentials not configured. Running in mock mode.')
    }
    return createBrowserClient(supabaseUrl, supabaseKey)
}

// Singleton instance for client-side usage
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
    if (!SUPABASE_ENABLED) {
        throw new Error('Supabase credentials not configured. Running in mock mode.')
    }
    if (!browserClient) {
        browserClient = createClient()
    }
    return browserClient
}

export function isSupabaseEnabled() {
    return SUPABASE_ENABLED
}
