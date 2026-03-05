import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
// Note: We instantiate it here but we'll check the key in the route handler
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

## CAMPOS REQUERIDOS:

### "affiliate"
- Número de afiliado, credencial, o DNI del paciente.
- Busca: número de credencial, N° socio, DNI, CUIL, número de afiliado.
- Si no puedes leerlo con certeza, haz tu mejor deducción y agrégalo igual.
- Valor: string (solo el número o texto identificatorio).

### "affiliateName"
- Nombre completo del paciente/afiliado si está visible.
- Valor: string o null.

### "doctor"
- Nombre completo del médico prescriptor Y su número de matrícula (MP, MN, etc.).
- Formato ideal: "Dr. Nombre Apellido / MN 12345" o "MN 98765 - Dr. Apellido".
- Si la matrícula es ilegible, incluye el nombre solo.
- Valor: string.

### "doctorRegistration"
- Solo el número de matrícula (sin letras) si fue claramente visible.
- Valor: string o null.

### "practices"
- Array de objetos con las prácticas médicas solicitadas.
- Cada práctica tiene: { "name": string, "code": string|null, "quantity": number }
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
- Puede ser un texto corto ("HTA", "Diabetes tipo 2", "Artritis reumatoide").
- Interpreta caligrafía médica: "DM2" → "Diabetes Mellitus tipo 2", "IRC" → "Insuficiencia Renal Crónica".
- NUNCA dejes este campo vacío si hay texto médico en el documento. Hace tu mejor interpretación.
- Valor: string (vacío "" solo si el documento no tiene absolutamente ningún diagnóstico).

### "diagnosisCIE"
- Código CIE-10 más probable para el diagnóstico detectado (ej: "E11", "I10", "J45.0").
- Usa tu conocimiento de CIE-10 para asignarlo aunque no esté escrito en la receta.
- Solo deja null si el diagnóstico es demasiado vago para asignar código.
- Valor: string o null.

### "diagnosisSearchTerms"
- Array de 2-4 términos de búsqueda alternativos para encontrar el diagnóstico en una base de datos.
- Incluye sinónimos, nombre oficial en español, abreviatura oficial.
- Ej para "HTA": ["hipertensión arterial", "hipertensión esencial", "I10", "presión arterial elevada"]
- Valor: string[] (al menos 1 término siempre).

### "prescriptionDate"
- Fecha de la prescripción si es visible (formato ISO "YYYY-MM-DD" o texto libre).
- Valor: string o null.

### "notes"
- Cualquier información clínica adicional relevante que no encaje en los campos anteriores.
- Ej: indicaciones de urgencia, especialidad del médico, estabelcimiento o sanatorio.
- Valor: string o null.

## REGLAS CRÍTICAS:
1. Devuelve ÚNICAMENTE JSON válido, sin ningún texto antes o después.
2. Nunca uses caracteres de control ni saltos de línea dentro de strings.
3. Si la caligrafía es difícil de leer, intenta inferir. Incluye tu mejor interpretación — es preferible una inferencia marcada como incierta a dejar el campo vacío.
4. Para prácticas, aunque no puedas leer el nombre exacto, incluye lo que puedas inferir.
5. El campo "diagnosisText" es el MÁS IMPORTANTE — nunca lo dejes vacío si hay texto médico visible.
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

        const responseText = result.response.text();

        // Extract JSON from response text in case the AI wraps it in markdown
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('No se pudo extraer JSON de la respuesta de Gemini:', responseText);
            return NextResponse.json({ error: 'La IA no devolvió un formato válido.' }, { status: 500 });
        }

        const parsedContent = JSON.parse(jsonMatch[0]);

        return NextResponse.json(parsedContent);

    } catch (error: unknown) {
        console.error('Error procesando imagen con Gemini:', error);
        return NextResponse.json(
            { error: 'Error interno procesando la imagen.', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
