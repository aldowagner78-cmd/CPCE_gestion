/**
 * normativaParser.ts — Motor de estructuración de texto normativo
 * 
 * Toma texto libre (copiado de PDFs, resoluciones, etc.) y lo estructura
 * en secciones: INCLUYE, EXCLUYE, REQUISITOS, OBSERVACIONES.
 * 
 * Funciona sin IA (parsing por patrones) con hook para IA futura.
 */

export interface NormativaStructured {
    incluye: string[]
    excluye: string[]
    requisitos: string[]
    observaciones: string[]
    coseguro: string | null
    raw: string
}

/**
 * Patterns that indicate the start of a section.
 * Order matters — we scan top-down.
 */
const SECTION_PATTERNS: { key: keyof Omit<NormativaStructured, 'raw' | 'coseguro'>; patterns: RegExp[] }[] = [
    {
        key: 'incluye',
        patterns: [
            /\bINCLUYE\s*:/i,
            /\bINCLUYE\b/i,
            /\bCOMPRENDE\s*:/i,
            /\bCOBERTURA\s*:/i,
        ],
    },
    {
        key: 'excluye',
        patterns: [
            /\bEXCLUYE\s*:/i,
            /\bEXCLUYE\b/i,
            /\bNO INCLUYE\s*:/i,
            /\bNO CUBRE\s*:/i,
        ],
    },
    {
        key: 'requisitos',
        patterns: [
            /\bREQUISITOS?\s*:/i,
            /\bREQUISITOS?\b/i,
            /\bCONDICIONES\s*:/i,
            /\bDOCUMENTACIÓN REQUERIDA\s*:/i,
            /\bDOCUMENTACION REQUERIDA\s*:/i,
        ],
    },
    {
        key: 'observaciones',
        patterns: [
            /\bOBSERVACION(?:ES)?\s*:/i,
            /\bNOTA(?:S)?\s*:/i,
            /\bACLARACION(?:ES)?\s*:/i,
        ],
    },
]

const COSEGURO_PATTERNS = [
    /\bCOSEGURO\s*:\s*(.+?)(?:\n|$)/i,
    /\bCO-?SEGURO\s*:\s*(.+?)(?:\n|$)/i,
    /\bCOPAGO\s*:\s*(.+?)(?:\n|$)/i,
]

/**
 * Split text that may contain multiple items separated by:
 * - Bullet points (-, •, ▪, *)
 * - Numbered items (1., 2., a), b))
 * - Pipes (|)
 * - Semicolons
 */
function splitItems(text: string): string[] {
    // First try splitting by common delimiters
    const lines = text
        .split(/(?:\n|(?:\s*[|]\s*)|(?:\s*;\s*))/)
        .map(l => l.replace(/^[\s\-•▪*·]+/, '').trim())
        .filter(l => l.length > 2)

    // If we got only 1 item but it's very long, try splitting by periods followed by uppercase
    if (lines.length === 1 && lines[0].length > 200) {
        const periodSplit = lines[0]
            .split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)
            .map(s => s.trim())
            .filter(s => s.length > 2)
        if (periodSplit.length > 1) return periodSplit
    }

    return lines
}

/**
 * Parse free text into structured normativa sections.
 * Zero-cost, pattern-based extraction.
 */
export function parseNormativa(rawText: string): NormativaStructured {
    const result: NormativaStructured = {
        incluye: [],
        excluye: [],
        requisitos: [],
        observaciones: [],
        coseguro: null,
        raw: rawText.trim(),
    }

    if (!rawText.trim()) return result

    // Extract coseguro first (often inline)
    for (const pat of COSEGURO_PATTERNS) {
        const m = rawText.match(pat)
        if (m) {
            result.coseguro = m[1].trim()
            break
        }
    }

    // Build a list of section markers with their positions
    type Marker = { key: keyof Omit<NormativaStructured, 'raw' | 'coseguro'>; start: number; contentStart: number }
    const markers: Marker[] = []

    for (const section of SECTION_PATTERNS) {
        for (const pat of section.patterns) {
            const m = rawText.match(pat)
            if (m && m.index !== undefined) {
                markers.push({
                    key: section.key,
                    start: m.index,
                    contentStart: m.index + m[0].length,
                })
                break // Only first match per section
            }
        }
    }

    // Sort by position
    markers.sort((a, b) => a.start - b.start)

    if (markers.length === 0) {
        // No section markers found — put everything in incluye
        result.incluye = splitItems(rawText)
        return result
    }

    // Extract text between markers
    for (let i = 0; i < markers.length; i++) {
        const startPos = markers[i].contentStart
        const endPos = i + 1 < markers.length ? markers[i + 1].start : rawText.length
        const sectionText = rawText.slice(startPos, endPos).trim()
        const items = splitItems(sectionText)
        result[markers[i].key] = items
    }

    // If there's text BEFORE the first marker, prepend to incluye
    const beforeFirst = rawText.slice(0, markers[0].start).trim()
    if (beforeFirst.length > 5) {
        result.incluye = [...splitItems(beforeFirst), ...result.incluye]
    }

    return result
}

/**
 * Convert structured normativa back to formatted text for storage.
 */
export function formatNormativa(structured: NormativaStructured): string {
    const parts: string[] = []

    if (structured.incluye.length > 0) {
        parts.push('INCLUYE: ' + structured.incluye.join('; '))
    }
    if (structured.excluye.length > 0) {
        parts.push('EXCLUYE: ' + structured.excluye.join('; '))
    }
    if (structured.requisitos.length > 0) {
        parts.push('REQUISITOS: ' + structured.requisitos.join('; '))
    }
    if (structured.observaciones.length > 0) {
        parts.push('OBSERVACIONES: ' + structured.observaciones.join('; '))
    }
    if (structured.coseguro) {
        parts.push('COSEGURO: ' + structured.coseguro)
    }

    return parts.join('\n')
}

/**
 * AI structuring hook — placeholder for future AI integration.
 * When an AI API key is configured, this function can call an LLM
 * to better parse unstructured text.
 * 
 * @param rawText — The raw text to structure
 * @param aiApiKey — Optional API key. If not provided, falls back to parseNormativa()
 * @returns Structured normativa
 */
export async function structureWithAI(
    rawText: string,
    aiApiKey?: string | null
): Promise<NormativaStructured> {
    // If no AI key configured, use pattern-based parser
    if (!aiApiKey) {
        return parseNormativa(rawText)
    }

    // ── Future AI Integration ──
    // When aiApiKey is available, call the AI endpoint:
    //
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${aiApiKey}`,
    //     },
    //     body: JSON.stringify({
    //         model: 'gpt-4o-mini',     // cheapest option
    //         temperature: 0,
    //         messages: [{
    //             role: 'system',
    //             content: 'Eres un asistente médico. Estructura el siguiente texto normativo en JSON con estos campos: incluye (array), excluye (array), requisitos (array), observaciones (array), coseguro (string|null). Responde SOLO JSON válido.'
    //         }, {
    //             role: 'user',
    //             content: rawText
    //         }],
    //     }),
    // })
    // const data = await response.json()
    // return JSON.parse(data.choices[0].message.content)
    //
    // Cost estimate: ~$0.0001 per card (gpt-4o-mini @ 150 input + 200 output tokens)
    // 1000 cards ≈ $0.10

    // For now, fall back to pattern-based
    return parseNormativa(rawText)
}
