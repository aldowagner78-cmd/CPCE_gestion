import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
    const providers = {
        gemini: !!process.env.GEMINI_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        xai: !!process.env.XAI_API_KEY,
    };

    const keyExists = providers.gemini;
    const keyPrefix = process.env.GEMINI_API_KEY?.substring(0, 8) || 'N/A';

    if (!providers.gemini && !providers.openai && !providers.anthropic && !providers.xai) {
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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Responde solo "OK"');
        const text = result.response.text().trim();

        return NextResponse.json({
            status: 'ok',
            message: 'Conexión con Gemini exitosa.',
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
