
import { NextResponse } from 'next/server'
import { MOCK_PRACTICES } from '@/lib/mockData'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase()
    // Support 'jurisdiction_id' as per spec, fallback to 'jurisdiction' just in case
    const jurisdictionStr = searchParams.get('jurisdiction_id') || searchParams.get('jurisdiction')

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    let filtered = MOCK_PRACTICES

    if (query) {
        filtered = filtered.filter(p =>
            p.code.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)
        )
    }

    if (jurisdictionStr) {
        const jurisdictionId = parseInt(jurisdictionStr)
        if (!isNaN(jurisdictionId)) {
            filtered = filtered.filter(p => p.jurisdiction_id === jurisdictionId)
        }
    }

    return NextResponse.json(filtered)
}
