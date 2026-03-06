import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vercel: permitir hasta 60s para que Gemini procese la imagen
export const maxDuration = 60;

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

const PROMPT = `Eres un asistente experto en auditoría médica argentina. Extraé la información del documento y devolvé ÚNICAMENTE un JSON válido. NO uses bloques markdown. NO agregues texto antes ni después del JSON.

IMPORTANTE: Escapá correctamente comillas dobles dentro de strings con \\". No uses saltos de línea literales dentro de strings.

Campos (cada uno con "value", "confidence" 0-100, y "alternatives" si confidence<70):
- "document_type": "orden_medica"|"receta"|"laboratorio"|"estudio"|"historia_clinica"|"factura"|"otro"
- "affiliate": N° afiliado/credencial/DNI
- "affiliateName": nombre paciente o null
- "doctor": nombre médico (sin matrícula)
- "doctorRegistration": matrícula (MP/MN + número) o null
- "practices": array de {"name","code":string|null,"quantity":number,"confidence"}. Interpretá abreviaturas médicas.
- "diagnosisText": diagnóstico literal. NUNCA dejarlo vacío si hay texto médico.
- "diagnosisCIE": código CIE-10 probable o null
- "diagnosisSearchTerms": 2-4 términos de búsqueda alternativos
- "prescriptionDate": fecha DD/MM/AAAA o null
- "notes": info adicional o null
- "missing_fields": campos no encontrados
- "warnings": advertencias de calidad

Reglas: Solo JSON válido sin ningún wrapper. Fechas en DD/MM/AAAA. Si la caligrafía es difícil, inferí con confidence bajo.`;

export async function POST(req: Request) {
    const startTime = Date.now();

    try {
        if (!genAI) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY no está configurada en las variables de entorno del servidor.', details: 'Variable vacía o ausente' },
                { status: 500 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se ha enviado ningún archivo.' }, { status: 400 });
        }

        console.log(`[AI] Procesando: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Data = buffer.toString('base64');

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        });

        const result = await model.generateContent([
            PROMPT,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type || 'image/jpeg',
                }
            }
        ]);

        // Verificar si la respuesta fue bloqueada por filtros de seguridad
        const response = result.response;
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
            console.error(`[AI] Respuesta bloqueada: ${blockReason}`);
            return NextResponse.json({
                error: `Gemini bloqueó la imagen (razón: ${blockReason}). Intente con otra imagen.`,
                details: `blockReason: ${blockReason}`,
            }, { status: 422 });
        }

        // Verificar que hay candidatos en la respuesta
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            const finishReason = candidates?.[0]?.finishReason || 'UNKNOWN';
            console.error(`[AI] Sin candidatos. finishReason: ${finishReason}`);
            return NextResponse.json({
                error: `Gemini no generó respuesta (finishReason: ${finishReason}). Intente de nuevo.`,
                details: `No candidates. finishReason: ${finishReason}`,
            }, { status: 500 });
        }

        // Verificar finishReason del candidato
        const candidate = candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
            console.error(`[AI] finishReason inesperado: ${candidate.finishReason}`);
            return NextResponse.json({
                error: `Gemini detuvo la respuesta (razón: ${candidate.finishReason}). Intente con otra imagen.`,
                details: `finishReason: ${candidate.finishReason}`,
            }, { status: 422 });
        }

        // Extraer texto de forma segura
        let responseText: string;
        try {
            responseText = response.text();
        } catch (textError) {
            const textMsg = textError instanceof Error ? textError.message : String(textError);
            console.error(`[AI] Error al extraer texto de la respuesta:`, textMsg);
            return NextResponse.json({
                error: `Gemini devolvió una respuesta inválida: ${textMsg}`,
                details: textMsg,
            }, { status: 500 });
        }

        // Extraer JSON del texto
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AI] No se pudo extraer JSON:', responseText.substring(0, 500));
            return NextResponse.json({
                error: 'La IA no devolvió un formato JSON válido.',
                details: `Respuesta (primeros 200 chars): ${responseText.substring(0, 200)}`,
            }, { status: 500 });
        }

        // Limpiar el JSON antes de parsear
        let jsonStr = jsonMatch[0];
        // Eliminar caracteres de control dentro de strings (saltos de línea literales, tabs, etc.)
        jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, (ch) => {
            if (ch === '\n' || ch === '\r' || ch === '\t') return ' ';
            return '';
        });
        // Fix trailing commas before } or ]
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

        let parsedContent: Record<string, unknown>;
        try {
            parsedContent = JSON.parse(jsonStr);
        } catch (parseError) {
            // Segundo intento: reparar comillas problemáticas
            try {
                // A veces Gemini usa comillas tipográficas o apóstrofes dentro de valores
                const cleaned = jsonStr
                    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
                    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
                parsedContent = JSON.parse(cleaned);
            } catch {
                const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
                console.error('[AI] JSON inválido:', errMsg, 'Texto:', jsonStr.substring(0, 300));
                return NextResponse.json({
                    error: `La IA devolvió JSON malformado: ${errMsg}`,
                    details: `JSON (primeros 300 chars): ${jsonStr.substring(0, 300)}`,
                }, { status: 500 });
            }
        }

        // Normalize: handle both old format (string) and new format ({ value, confidence })
        const normalize = (field: unknown): { value: string; confidence: number; alternatives?: string[] } | null => {
            if (!field) return null;
            if (typeof field === 'string') return { value: field, confidence: 85 };
            if (typeof field === 'object' && field !== null && 'value' in field) return field as { value: string; confidence: number; alternatives?: string[] };
            return null;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pc = parsedContent as any;

        const normalized = {
            ...pc,
            affiliate: normalize(pc.affiliate),
            affiliateName: normalize(pc.affiliateName),
            doctor: normalize(pc.doctor),
            doctorRegistration: normalize(pc.doctorRegistration),
            diagnosisText: normalize(pc.diagnosisText),
            prescriptionDate: normalize(pc.prescriptionDate),
            document_type: pc.document_type || 'orden_medica',
            missing_fields: pc.missing_fields || [],
            warnings: pc.warnings || [],
            practices: (Array.isArray(pc.practices) ? pc.practices : []).map((p: Record<string, unknown>) => ({
                name: p.name || '',
                code: p.code || null,
                quantity: p.quantity || 1,
                confidence: typeof p.confidence === 'number' ? p.confidence : 85,
            })),
        };

        console.log(`[AI] OK en ${Date.now() - startTime}ms. Tipo: ${normalized.document_type}`);
        return NextResponse.json(normalized);

    } catch (error: unknown) {
        const elapsed = Date.now() - startTime;
        console.error(`[AI] Error tras ${elapsed}ms:`, error);

        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack?.substring(0, 300) : '';

        // Clasificar el error
        let errorMsg: string;
        let status = 500;

        if (message.includes('API_KEY') || message.includes('API key') || message.includes('401') || message.includes('403')) {
            errorMsg = 'GEMINI_API_KEY inválida o no configurada.';
            status = 401;
        } else if (message.includes('DEADLINE_EXCEEDED') || message.includes('timeout') || message.includes('ECONNRESET') || message.includes('ETIMEDOUT')) {
            errorMsg = `Gemini tardó demasiado (${(elapsed / 1000).toFixed(1)}s). Intente con una imagen más pequeña.`;
        } else if (message.includes('SAFETY') || message.includes('blocked') || message.includes('RECITATION')) {
            errorMsg = 'Gemini bloqueó el contenido por políticas de seguridad. Intente con otra imagen.';
            status = 422;
        } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
            errorMsg = 'Límite de uso de Gemini alcanzado. Espere unos minutos e intente de nuevo.';
            status = 429;
        } else if (message.includes('model') || message.includes('not found') || message.includes('404')) {
            errorMsg = `Modelo no disponible: ${message}`;
        } else {
            errorMsg = `Error procesando imagen (${(elapsed / 1000).toFixed(1)}s): ${message.substring(0, 150)}`;
        }

        return NextResponse.json(
            { error: errorMsg, details: message, stack },
            { status }
        );
    }
}
