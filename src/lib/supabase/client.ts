import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
    return createBrowserClient(supabaseUrl, supabaseKey)
}

// Singleton instance for client-side usage
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
    if (!browserClient) {
        browserClient = createClient()
    }
    return browserClient
}
