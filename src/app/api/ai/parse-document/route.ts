import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vercel: permitir hasta 60s para que Gemini procese la imagen
export const maxDuration = 60;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export async function POST(req: Request) {
    try {
        if (!genAI) {
            return NextResponse.json(
                { error: 'La API Key de Gemini no está configurada.' },
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

        // Choose the model: User specified gemini-2.5-flash
        // Optimized for speed: low temperature = fewer inference steps, limited tokens = faster completion
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
            },
        });

        const prompt = `
Eres un asistente experto en auditoría médica argentina, especializado en interpretar órdenes médicas, recetas y prescripciones manuscritas o escaneadas.

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
- Si la fecha dice "5/3/26", interpretar como "05/03/2026".
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
- Ejemplos:
  * "Caligrafía de difícil lectura en zona superior del documento"
  * "Imagen con baja resolución, algunos campos pueden ser imprecisos"
  * "Sello médico parcialmente cortado"
  * "Fecha posiblemente incorrecta — verificar"
  * "No se detectó diagnóstico en el documento"
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

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            }
        ]);

        // Extraer texto de forma segura
        let responseText: string;
        try {
            responseText = result.response.text();
        } catch (textError) {
            const textMsg = textError instanceof Error ? textError.message : String(textError);
            return NextResponse.json({
                error: `Gemini devolvió una respuesta inválida: ${textMsg}`,
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
        try {
            parsedContent = JSON.parse(jsonMatch[0]);
        } catch {
            // Limpiar caracteres problemáticos e intentar de nuevo
            const cleaned = jsonMatch[0]
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/[\u201C\u201D]/g, '"')
                .replace(/[\u2018\u2019]/g, "'");
            try {
                parsedContent = JSON.parse(cleaned);
            } catch (e2) {
                const errMsg = e2 instanceof Error ? e2.message : String(e2);
                return NextResponse.json({
                    error: `La IA devolvió JSON malformado: ${errMsg}`,
                    details: cleaned.substring(0, 500),
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

        return NextResponse.json(normalized);

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
