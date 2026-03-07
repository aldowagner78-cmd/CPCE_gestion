import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface NotifyPayload {
    expedientId: string;
    expedientNumber: string;
    affiliateEmail?: string;
    affiliateName?: string;
    authorizedPractices: string[];
    userId: string;
}

export async function POST(request: Request) {
    let body: NotifyPayload;
    try {
        body = await request.json() as NotifyPayload;
    } catch {
        return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
    }

    const { expedientId, expedientNumber, affiliateEmail, affiliateName, authorizedPractices, userId } = body;

    if (!expedientId || !userId) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Registrar el intento de notificación como nota interna en el expediente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Configuración Supabase no disponible' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Armar texto de la nota de auditoría
    const practiceList = authorizedPractices.length > 0
        ? authorizedPractices.map(p => `  - ${p}`).join('\n')
        : '  (sin prácticas especificadas)';

    const noteText = [
        `[NOTIFICACIÓN] Solicitud de envío de constancia al afiliado`,
        affiliateName ? `Afiliado: ${affiliateName}` : null,
        affiliateEmail ? `Correo: ${affiliateEmail}` : 'Correo: no registrado',
        `Expediente: ${expedientNumber}`,
        `Prácticas autorizadas:\n${practiceList}`,
        affiliateEmail ? '→ Notificación enviada (pendiente servicio de correo)' : '→ Sin correo registrado — solo se registra en historial',
    ].filter(Boolean).join('\n');

    // Insertar como nota de tipo 'interna' con marca especial
    const { error: insertError } = await supabase
        .from('expedient_notes')
        .insert({
            expedient_id: expedientId,
            note_type: 'interna',
            content: noteText,
            author_id: userId,
            created_at: new Date().toISOString(),
        });

    if (insertError) {
        console.error('[notify-affiliate] Error al registrar nota:', insertError.message);
        // No fallamos: el registro es best-effort
    }

    // Aquí se puede conectar un proveedor de email (Resend, SendGrid, Nodemailer)
    // Ejemplo con Resend:
    // if (affiliateEmail && process.env.RESEND_API_KEY) {
    //   await resend.emails.send({ from: 'noreply@cpce.org', to: affiliateEmail, subject: `Constancia expediente ${expedientNumber}`, html: ... });
    // }

    return NextResponse.json({
        ok: true,
        emailSent: !!affiliateEmail,
        loggedNote: !insertError,
    });
}
