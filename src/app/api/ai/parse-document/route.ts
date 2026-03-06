import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vercel: permitir hasta 60s para que Gemini procese la imagen
export const maxDuration = 60;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

type ProviderName = 'gemini' | 'openai' | 'anthropic' | 'xai' | 'groq';

const GEMINI_MODELS = (process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-2.5-pro,gemini-2.0-flash').split(',').map(m => m.trim());

async function generateWithGemini(prompt: string, base64Data: string, mimeType: string): Promise<string> {
    if (!genAI) throw new Error('GEMINI_API_KEY no configurada');

    const errors: string[] = [];
    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 65536,
                },
            });

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType,
                    },
                },
            ]);

            return result.response.text();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`Gemini modelo ${modelName} falló: ${msg.substring(0, 120)}`);
            errors.push(`${modelName}: ${msg.substring(0, 120)}`);
        }
    }

    throw new Error(`Todos los modelos Gemini fallaron: ${errors.join(' | ')}`);
}

async function generateWithOpenAI(prompt: string, base64Data: string, mimeType: string): Promise<string> {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no configurada');

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`OpenAI ${response.status}: ${detail.substring(0, 200)}`);
    }

    const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
    };

    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI devolvió respuesta vacía');
    return text;
}

async function generateWithAnthropic(prompt: string, base64Data: string, mimeType: string): Promise<string> {
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');

    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: 0.1,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt,
                        },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mimeType,
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Anthropic ${response.status}: ${detail.substring(0, 200)}`);
    }

    const payload = await response.json() as {
        content?: Array<{ type?: string; text?: string }>;
    };

    const textBlock = payload.content?.find(c => c.type === 'text' && !!c.text)?.text;
    if (!textBlock) throw new Error('Anthropic devolvió respuesta vacía');
    return textBlock;
}

async function generateWithXai(prompt: string, base64Data: string, mimeType: string): Promise<string> {
    if (!XAI_API_KEY) throw new Error('XAI_API_KEY no configurada');

    const model = process.env.XAI_MODEL || 'grok-2-vision-latest';
    const baseUrl = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`XAI ${response.status}: ${detail.substring(0, 200)}`);
    }

    const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
    };

    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error('XAI devolvió respuesta vacía');
    return text;
}

async function generateWithGroq(prompt: string, base64Data: string, mimeType: string): Promise<string> {
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY no configurada');

    const model = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: 8192,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Groq ${response.status}: ${detail.substring(0, 200)}`);
    }

    const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
    };

    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq devolvió respuesta vacía');
    return text;
}

async function generateWithFallbacks(prompt: string, base64Data: string, mimeType: string): Promise<{ provider: ProviderName; text: string }> {
    const errors: string[] = [];

    const providers: Array<{ name: ProviderName; enabled: boolean; run: () => Promise<string> }> = [
        { name: 'gemini', enabled: !!genAI, run: () => generateWithGemini(prompt, base64Data, mimeType) },
        { name: 'groq', enabled: !!GROQ_API_KEY, run: () => generateWithGroq(prompt, base64Data, mimeType) },
        { name: 'openai', enabled: !!OPENAI_API_KEY, run: () => generateWithOpenAI(prompt, base64Data, mimeType) },
        { name: 'anthropic', enabled: !!ANTHROPIC_API_KEY, run: () => generateWithAnthropic(prompt, base64Data, mimeType) },
        { name: 'xai', enabled: !!XAI_API_KEY, run: () => generateWithXai(prompt, base64Data, mimeType) },
    ];

    for (const provider of providers) {
        if (!provider.enabled) continue;
        try {
            const text = await provider.run();
            return { provider: provider.name, text };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${provider.name}: ${message.substring(0, 180)}`);
        }
    }

    throw new Error(errors.length > 0
        ? `Todos los proveedores fallaron. ${errors.join(' | ')}`
        : 'No hay proveedores de IA configurados (Gemini/OpenAI/Anthropic/XAI/Groq).');
}

export async function POST(req: Request) {
    try {
        if (!genAI && !OPENAI_API_KEY && !ANTHROPIC_API_KEY && !XAI_API_KEY && !GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'No hay proveedores IA configurados (Gemini/OpenAI/Anthropic/XAI/Groq).' },
                { status: 500 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se ha enviado ningún archivo.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert to base64
        const base64Data = buffer.toString('base64');

        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

        const prompt = `
Eres un asistente experto en auditoría médica argentina, especializado en interpretar órdenes médicas, recetas y prescripciones manuscritas o escaneadas.

LA FECHA DE HOY ES: ${todayStr}. Estamos en el año ${today.getFullYear()}. Usa esta referencia para interpretar fechas correctamente.

Tu tarea es extraer la información clave del documento y devolver ÚNICAMENTE un objeto JSON válido (sin texto adicional, sin bloques markdown, sin comentarios).

## CLASIFICACIÓN DEL DOCUMENTO

### "document_type"
- Identifica el tipo de documento: "orden_medica" | "receta" | "laboratorio" | "estudio" | "historia_clinica" | "factura" | "otro"
- Valor: string.

## CAMPOS REQUERIDOS:

Cada campo principal debe incluir un nivel de confianza (confidence: 0-100) que refleje cuán seguro estás de la lectura.
- 90-100: Lectura clara y segura
- 70-89: Bastante seguro, texto legible con alguna ambigüedad
- 50-69: Lectura incierta, caligrafía difícil
- 0-49: Muy incierto, casi ilegible

Cuando la confianza sea menor a 70, incluye un campo "alternatives" con hasta 3 lecturas alternativas posibles.

### "affiliate"
- Número de afiliado, credencial, o DNI del paciente.
- Busca: número de credencial, N° socio, DNI, CUIL, número de afiliado.
- Si no puedes leerlo con certeza, haz tu mejor deducción y agrégalo igual.
- Valor: { "value": string, "confidence": number, "alternatives"?: string[] }

### "affiliateName"
- Nombre completo del paciente/afiliado si está visible.
- Valor: { "value": string, "confidence": number, "alternatives"?: string[] } o null.

### "doctor"
- Nombre completo del médico prescriptor.
- NO incluir matrícula aquí, solo nombre.
- Valor: { "value": string, "confidence": number, "alternatives"?: string[] }

### "doctorRegistration"
- Número de matrícula del médico (MP, MN, etc.) incluyendo prefijo si es visible.
- Formato: "MN 12345" o "MP 67890" o solo "12345" si no hay prefijo.
- Valor: { "value": string, "confidence": number, "alternatives"?: string[] } o null.

### "practices"
- Array de objetos con las prácticas médicas solicitadas.
- Cada práctica tiene: { "name": string, "code": string|null, "quantity": number, "confidence": number }
- Interpreta abreviaturas comunes:
  * "eco abd" → "Ecografía Abdominal"
  * "hemo c/c" → "Hemograma con Recuento Diferencial"
  * "rx tórax" → "Radiografía de Tórax"
  * "RM cerebro" → "Resonancia Magnética de Cerebro"
  * "TAC" → "Tomografía Axial Computada"
  * "RMN/RMI" → "Resonancia Magnética"
  * coagulación, eritrosedimentación, glucemia, orina completa, etc.
- Si hay un código de nomenclador (ej: "30101", "43-01-01"), inclúyelo en "code".
- Valor: array de objetos (puede ser vacío si no hay prácticas visibles).

### "diagnosisText"
- Diagnóstico clínico literal tal como aparece en la receta/orden.
- Interpreta caligrafía médica: "DM2" → "Diabetes Mellitus tipo 2", "IRC" → "Insuficiencia Renal Crónica".
- NUNCA dejes este campo vacío si hay texto médico en el documento.
- Valor: { "value": string, "confidence": number, "alternatives"?: string[] }

### "diagnosisCIE"
- Código CIE-10 más probable para el diagnóstico detectado (ej: "E11", "I10", "J45.0").
- Usa tu conocimiento de CIE-10 para asignarlo aunque no esté escrito en la receta.
- Valor: string o null.

### "diagnosisSearchTerms"
- Array de 2-4 términos de búsqueda alternativos para encontrar el diagnóstico en una base de datos.
- Incluye sinónimos, nombre oficial en español, abreviatura oficial.
- Valor: string[] (al menos 1 término siempre).

### "prescriptionDate"
- Fecha de la prescripción si es visible. Formato: "DD/MM/AAAA" siempre.
- Estamos en el año ${today.getFullYear()}. Los años abreviados a 2 dígitos (ej: "26") se interpretan como 20XX del siglo actual.
- Si la fecha dice "5/3/26", interpretar como "05/03/2026". Si dice "26/2/26", interpretar como "26/02/2026".
- Fechas del año ${today.getFullYear()} o cercanas NO son futuras, son completamente normales. NO generes warnings sobre fechas futuras si están dentro del año actual.
- Si está en formato YYYY-MM-DD, convertir a DD/MM/AAAA.
- Valor: { "value": string, "confidence": number, "alternatives"?: string[] } o null.

### "notes"
- Cualquier información clínica adicional relevante.
- Valor: string o null.

### "missing_fields"
- Lista de campos que NO pudiste encontrar o leer en el documento.
- Valores posibles: "affiliate", "affiliateName", "doctor", "doctorRegistration", "practices", "diagnosis", "prescriptionDate"
- Solo incluir campos que deberían estar presentes pero no fueron encontrados.
- Valor: string[]

### "warnings"
- Advertencias sobre la calidad del procesamiento.
- Ejemplos válidos:
  * "Caligrafía de difícil lectura en zona superior del documento"
  * "Imagen con baja resolución, algunos campos pueden ser imprecisos"
  * "Sello médico parcialmente cortado"
  * "No se detectó diagnóstico en el documento"
- NUNCA generes warnings sobre fechas "futuras" si la fecha extraída es del año ${today.getFullYear()} o anterior. Hoy es ${todayStr}.
- Solo genera warning de fecha si la fecha es claramente ilegible o imposible (ej: día 32, mes 13).
- Valor: string[]

## REGLAS CRÍTICAS:
1. Devuelve ÚNICAMENTE JSON válido, sin ningún texto antes o después.
2. Nunca uses caracteres de control ni saltos de línea dentro de strings.
3. Si la caligrafía es difícil de leer, intenta inferir. Incluye tu mejor interpretación con confidence bajo y alternatives.
4. Para prácticas, aunque no puedas leer el nombre exacto, incluye lo que puedas inferir con su confidence.
5. El campo "diagnosisText" es el MÁS IMPORTANTE — nunca lo dejes vacío si hay texto médico visible.
6. Siempre incluye "missing_fields" (array vacío si no falta nada) y "warnings" (array vacío si todo está bien).
7. Las fechas SIEMPRE en formato DD/MM/AAAA.
`;

        const generation = await generateWithFallbacks(prompt, base64Data, file.type);

        // Extraer texto de forma segura
        let responseText: string;
        try {
            responseText = generation.text;
        } catch (textError) {
            const textMsg = textError instanceof Error ? textError.message : String(textError);
            return NextResponse.json({
                error: `El proveedor IA devolvió una respuesta inválida: ${textMsg}`,
                details: textMsg,
            }, { status: 500 });
        }

        // Extract JSON from response text in case the AI wraps it in markdown
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('No se pudo extraer JSON de la respuesta de Gemini:', responseText.substring(0, 500));
            return NextResponse.json({ error: 'La IA no devolvió un formato válido.', details: responseText.substring(0, 300) }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsedContent: any;
        // Limpiar SIEMPRE antes de parsear: Gemini mete saltos de línea literales dentro de strings
        const jsonStr = jsonMatch[0]
            .replace(/\r?\n/g, ' ')                    // newlines → espacios
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // chars de control
            .replace(/,\s*([}\]])/g, '$1')             // trailing commas
            .replace(/[\u201C\u201D]/g, '"')           // comillas tipográficas
            .replace(/[\u2018\u2019]/g, "'");          // apóstrofes tipográficos
        try {
            parsedContent = JSON.parse(jsonStr);
        } catch (e2) {
            const errMsg = e2 instanceof Error ? e2.message : String(e2);
            return NextResponse.json({
                error: `La IA devolvió JSON malformado: ${errMsg}`,
                details: jsonStr.substring(0, 500),
            }, { status: 500 });
        }

        // Normalize: handle both old format (string) and new format ({ value, confidence })
        const normalize = (field: unknown): { value: string; confidence: number; alternatives?: string[] } | null => {
            if (!field) return null;
            if (typeof field === 'string') return { value: field, confidence: 85 };
            if (typeof field === 'object' && field !== null && 'value' in field) return field as { value: string; confidence: number; alternatives?: string[] };
            return null;
        };

        const normalized = {
            ...parsedContent,
            affiliate: normalize(parsedContent.affiliate),
            affiliateName: normalize(parsedContent.affiliateName),
            doctor: normalize(parsedContent.doctor),
            doctorRegistration: normalize(parsedContent.doctorRegistration),
            diagnosisText: normalize(parsedContent.diagnosisText),
            prescriptionDate: normalize(parsedContent.prescriptionDate),
            document_type: parsedContent.document_type || 'orden_medica',
            missing_fields: parsedContent.missing_fields || [],
            warnings: parsedContent.warnings || [],
            practices: (parsedContent.practices || []).map((p: Record<string, unknown>) => ({
                name: p.name || '',
                code: p.code || null,
                quantity: p.quantity || 1,
                confidence: typeof p.confidence === 'number' ? p.confidence : 85,
            })),
        };

        return NextResponse.json({
            ...normalized,
            _provider: generation.provider,
        });

    } catch (error: unknown) {
        console.error('Error procesando imagen con Gemini:', error);
        const message = error instanceof Error ? error.message : String(error);

        let errorMsg: string;
        let status = 500;

        if (message.includes('API_KEY') || message.includes('API key') || message.includes('401') || message.includes('403')) {
            errorMsg = 'GEMINI_API_KEY inválida o no configurada.';
            status = 401;
        } else if (message.includes('SAFETY') || message.includes('blocked') || message.includes('RECITATION')) {
            errorMsg = 'Gemini bloqueó el contenido por políticas de seguridad. Intente con otra imagen.';
            status = 422;
        } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
            errorMsg = 'Límite de uso de Gemini alcanzado. Espere unos minutos e intente de nuevo.';
            status = 429;
        } else {
            errorMsg = `Error procesando la imagen: ${message.substring(0, 150)}`;
        }

        return NextResponse.json(
            { error: errorMsg, details: message },
            { status }
        );
    }
}
