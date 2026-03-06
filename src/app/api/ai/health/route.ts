import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
    const providers = {
        gemini: !!process.env.GEMINI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        xai: !!process.env.XAI_API_KEY,
    };

    const geminiModel = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').split(',')[0].trim();
    const keyPrefix = process.env.GEMINI_API_KEY?.substring(0, 8) || 'N/A';

    if (!providers.gemini && !providers.openai && !providers.anthropic && !providers.xai && !providers.groq) {
        return NextResponse.json({
            status: 'error',
            message: 'No hay providers IA configurados.',
            providers,
        }, { status: 500 });
    }

    if (!providers.gemini) {
        return NextResponse.json({
            status: 'ok',
            message: 'Gemini no configurado, pero hay proveedores alternativos disponibles.',
            providers,
            nodeVersion: process.version,
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const result = await model.generateContent('Responde solo "OK"');
        const text = result.response.text().trim();

        return NextResponse.json({
            status: 'ok',
            message: `Conexión con Gemini (${geminiModel}) exitosa.`,
            keyExists: true,
            keyPrefix: keyPrefix + '...',
            providers,
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
            providers,
            nodeVersion: process.version,
        }, { status: 500 });
    }
}
