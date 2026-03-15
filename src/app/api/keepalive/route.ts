import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/keepalive
 * 
 * Endpoint ejecutado por el Vercel Cron Job diariamente.
 * Realiza una consulta mínima a Supabase para evitar que el proyecto
 * se pause automáticamente por inactividad (free tier: 7 días).
 */
export async function GET(request: Request) {
  // Verificar que la llamada viene del cron de Vercel (en producción)
  const authHeader = request.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient();

    // Consulta mínima: solo cuenta 1 fila de una tabla existente
    const { error } = await supabase
      .from('affiliates')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Supabase respondió con error',
          error: error.message,
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase activo ✓',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Error de red al contactar Supabase',
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
