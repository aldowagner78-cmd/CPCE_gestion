import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
    const keyExists = !!process.env.GEMINI_API_KEY;
    const keyPrefix = process.env.GEMINI_API_KEY?.substring(0, 8) || 'N/A';

    if (!keyExists) {
        return NextResponse.json({
            status: 'error',
            message: 'GEMINI_API_KEY no está configurada en las variables de entorno.',
            keyExists: false,
        }, { status: 500 });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Responde solo "OK"');
        const text = result.response.text().trim();

        return NextResponse.json({
            status: 'ok',
            message: 'Conexión con Gemini exitosa.',
            keyExists: true,
            keyPrefix: keyPrefix + '...',
            geminiResponse: text,
            nodeVersion: process.version,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            status: 'error',
            message: `API key presente pero fallo al conectar con Gemini: ${message}`,
            keyExists: true,
            keyPrefix: keyPrefix + '...',
            nodeVersion: process.version,
        }, { status: 500 });
    }
}
