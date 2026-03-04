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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Eres un asistente experto en auditoría médica. Tu tarea es extraer la información clave de esta orden médica manuscrita o receta escaneada y devolverla estrictamente en formato JSON válido, sin caracteres adicionales ni bloques de código markdown, solo el JSON raw. 

Los campos requeridos en el JSON son:
- "affiliate": El número de afiliado, credencial o DNI del paciente (string).
- "doctor": El nombre del médico prescriptor y/o su matrícula (string).
- "practices": Un array de strings con los nombres o códigos de las prácticas médicas solicitadas (string[]).
- "diagnosis": El diagnóstico clínico o motivo de la orden (string).

Si no puedes detectar un campo con certeza, déjalo vacío o usa una frase corta. Presta mucha atención a la caligrafía médica, infiriendo términos comunes (ej. "eco abd" -> "Ecografía Abdominal").
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

    } catch (error: any) {
        console.error('Error procesando imagen con Gemini:', error);
        return NextResponse.json(
            { error: 'Error interno procesando la imagen.', details: error.message },
            { status: 500 }
        );
    }
}
