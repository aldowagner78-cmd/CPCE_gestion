import type { Expedient, ExpedientPractice, ExpedientType } from '@/types/database';

/**
 * Genera constancia de autorización del expediente completo.
 * Abre una ventana de impresión con HTML profesional.
 */

const TYPE_LABELS: Record<ExpedientType, string> = {
    ambulatoria: 'Ambulatoria',
    bioquimica: 'Bioquímica',
    internacion: 'Internación',
    odontologica: 'Odontológica',
    programas_especiales: 'Programas Especiales',
    elementos: 'Elementos / Prótesis',
    reintegros: 'Reintegro',
};

const fmtCurrency = (v: number) =>
    v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Constancia del Expediente Completo ──

export function generateExpedientPDF(expedient: Expedient) {
    const practices = expedient.practices || [];
    const authorized = practices.filter(p => ['autorizada', 'autorizada_parcial'].includes(p.status));
    const denied = practices.filter(p => p.status === 'denegada');

    const totalCovered = authorized.reduce((s, p) => s + (p.covered_amount || 0), 0);
    const totalCopay = authorized.reduce((s, p) => s + (p.copay_amount || 0), 0);

    const jurisdictionLabel = expedient.jurisdiction_id === 1 ? 'Cámara I — Santa Fe' : 'Cámara II — Rosario';

    const practiceRows = practices.map((p, i) => {
        const statusLabel = p.status === 'autorizada' ? '✅ Autorizada' :
            p.status === 'autorizada_parcial' ? '⚠️ Parcial' :
            p.status === 'denegada' ? '❌ Denegada' :
            p.status === 'observada' ? '👁️ Observada' :
            p.status === 'diferida' ? '⏰ Diferida' : '🕐 Pendiente';

        const statusColor = p.status === 'autorizada' ? '#16a34a' :
            p.status === 'autorizada_parcial' ? '#4f46e5' :
            p.status === 'denegada' ? '#dc2626' : '#6b7280';

        return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;">${i + 1}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">#${p.practice_id}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${p.practice_value ? fmtCurrency(p.practice_value) : '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.coverage_percent ?? '—'}%</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${p.covered_amount ? fmtCurrency(p.covered_amount) : '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:${statusColor};font-weight:600;font-size:10pt;">${statusLabel}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-weight:700;color:#1e40af;">${p.authorization_code || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:9pt;color:#6b7280;">${p.authorization_expiry ? fmtDate(p.authorization_expiry) : '—'}</td>
        </tr>`;
    }).join('');

    const deniedSection = denied.length > 0 ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
            <h3 style="font-size:10pt;color:#991b1b;margin-bottom:8px;font-weight:700;">Prácticas Denegadas</h3>
            ${denied.map(p => `
                <div style="padding:4px 0;font-size:10pt;">
                    <span style="color:#dc2626;font-weight:600;">Práctica #${p.practice_id}:</span>
                    <span style="color:#7f1d1d;">${p.resolution_notes || 'Sin motivo especificado'}</span>
                </div>
            `).join('')}
        </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Constancia - ${expedient.expedient_number}</title>
    <style>
        @page { size: A4; margin: 18mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10pt; color: #1f2937; line-height: 1.5; background: white; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:20px;">
        <div>
            <h1 style="font-size:18pt;color:#1e40af;font-weight:700;">CPCE Salud</h1>
            <p style="font-size:8pt;color:#6b7280;">Consejo Profesional de Ciencias Económicas · Auditoría Médica</p>
        </div>
        <div style="text-align:right;">
            <div style="font-size:13pt;font-weight:700;color:#1e40af;">CONSTANCIA DE EXPEDIENTE</div>
            <div style="font-size:12pt;font-weight:700;color:#374151;margin-top:2px;">${expedient.expedient_number}</div>
            <div style="font-size:8pt;color:#6b7280;">${fmtDateTime(expedient.created_at)}</div>
        </div>
    </div>

    <!-- Datos generales -->
    <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <div style="background:#f3f4f6;padding:6px 12px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Datos del Afiliado</div>
            <div style="padding:10px 12px;font-size:10pt;">
                <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#6b7280;">ID Afiliado</span><span style="font-weight:600;">${String(expedient.affiliate_id).slice(0, 12)}...</span></div>
                ${expedient.affiliate_plan_id ? `<div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#6b7280;">Plan</span><span style="font-weight:600;">#${expedient.affiliate_plan_id}</span></div>` : ''}
                ${expedient.family_member_relation ? `<div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#6b7280;">Parentesco</span><span style="font-weight:600;">${expedient.family_member_relation}</span></div>` : ''}
            </div>
        </div>
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <div style="background:#f3f4f6;padding:6px 12px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Datos del Expediente</div>
            <div style="padding:10px 12px;font-size:10pt;">
                <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#6b7280;">Tipo</span><span style="font-weight:600;">${TYPE_LABELS[expedient.type]}</span></div>
                <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#6b7280;">Prioridad</span><span style="font-weight:600;">${expedient.priority === 'urgente' ? '⚡ URGENTE' : 'Normal'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#6b7280;">Jurisdicción</span><span style="font-weight:600;">${jurisdictionLabel}</span></div>
                <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#6b7280;">Estado</span><span style="font-weight:700;color:${expedient.status === 'resuelto' ? '#16a34a' : '#2563eb'};">${expedient.status.toUpperCase()}</span></div>
            </div>
        </div>
    </div>

    <!-- Resumen económico -->
    <div style="display:flex;gap:12px;margin-bottom:16px;">
        <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;text-align:center;">
            <div style="font-size:8pt;color:#166534;text-transform:uppercase;font-weight:600;">Autorizadas</div>
            <div style="font-size:18pt;font-weight:700;color:#16a34a;">${authorized.length}</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;text-align:center;">
            <div style="font-size:8pt;color:#166534;text-transform:uppercase;font-weight:600;">Monto Cubierto</div>
            <div style="font-size:14pt;font-weight:700;color:#16a34a;">${fmtCurrency(totalCovered)}</div>
        </div>
        <div style="flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px;text-align:center;">
            <div style="font-size:8pt;color:#92400e;text-transform:uppercase;font-weight:600;">Coseguro</div>
            <div style="font-size:14pt;font-weight:700;color:#d97706;">${fmtCurrency(totalCopay)}</div>
        </div>
        ${denied.length > 0 ? `
        <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;text-align:center;">
            <div style="font-size:8pt;color:#991b1b;text-transform:uppercase;font-weight:600;">Denegadas</div>
            <div style="font-size:18pt;font-weight:700;color:#dc2626;">${denied.length}</div>
        </div>` : ''}
    </div>

    <!-- Tabla de prácticas -->
    <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:16px;">
        <div style="background:#f3f4f6;padding:6px 12px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Detalle de Prácticas</div>
        <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <thead>
                <tr style="background:#f9fafb;">
                    <th style="padding:6px 12px;text-align:center;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">#</th>
                    <th style="padding:6px 12px;text-align:left;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Práctica</th>
                    <th style="padding:6px 12px;text-align:center;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Cant.</th>
                    <th style="padding:6px 12px;text-align:right;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Valor</th>
                    <th style="padding:6px 12px;text-align:center;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Cob.%</th>
                    <th style="padding:6px 12px;text-align:right;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Cubierto</th>
                    <th style="padding:6px 12px;text-align:center;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Estado</th>
                    <th style="padding:6px 12px;text-align:left;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Código Aut.</th>
                    <th style="padding:6px 12px;text-align:left;font-size:8pt;color:#6b7280;border-bottom:2px solid #e5e7eb;">Vence</th>
                </tr>
            </thead>
            <tbody>
                ${practiceRows}
            </tbody>
        </table>
    </div>

    ${deniedSection}

    ${expedient.request_notes ? `
    <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:16px;">
        <div style="background:#f3f4f6;padding:6px 12px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Observaciones</div>
        <div style="padding:10px 12px;font-size:10pt;font-style:italic;color:#6b7280;">${expedient.request_notes}</div>
    </div>` : ''}

    <!-- Footer -->
    <div style="margin-top:30px;display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid #e5e7eb;padding-top:16px;">
        <div style="font-size:8pt;color:#6b7280;">
            <p>Documento generado por CPCE Salud — Sistema de Auditoría Médica</p>
            <p>Esta constancia es válida como comprobante de autorización.</p>
            <p>${jurisdictionLabel}</p>
        </div>
        <div style="text-align:center;padding-top:32px;border-top:1px solid #374151;min-width:180px;">
            <p style="font-size:9pt;color:#6b7280;">Firma del Auditor</p>
        </div>
    </div>

    <div style="text-align:center;font-size:7pt;color:#d1d5db;margin-top:16px;">
        CPCE Salud · ${expedient.expedient_number} · Generado el ${fmtDateTime(new Date().toISOString())}
    </div>

    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}

// ── Constancia de Práctica Individual ──

export function generatePracticePDF(expedient: Expedient, practice: ExpedientPractice) {
    const jurisdictionLabel = expedient.jurisdiction_id === 1 ? 'Cámara I — Santa Fe' : 'Cámara II — Rosario';

    const statusLabel = practice.status === 'autorizada' ? 'AUTORIZADA' :
        practice.status === 'autorizada_parcial' ? 'AUTORIZADA PARCIAL' :
        practice.status === 'denegada' ? 'DENEGADA' : practice.status.toUpperCase();

    const statusColor = practice.status === 'autorizada' ? '#16a34a' :
        practice.status === 'autorizada_parcial' ? '#4f46e5' :
        practice.status === 'denegada' ? '#dc2626' : '#2563eb';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Autorización ${practice.authorization_code || expedient.expedient_number}</title>
    <style>
        @page { size: A4; margin: 20mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.5; background: white; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:24px;">
        <div>
            <h1 style="font-size:20pt;color:#1e40af;font-weight:700;">CPCE Salud</h1>
            <p style="font-size:9pt;color:#6b7280;">Consejo Profesional de Ciencias Económicas</p>
        </div>
        <div style="text-align:right;">
            <div style="font-size:14pt;font-weight:700;color:#1e40af;">CONSTANCIA DE AUTORIZACIÓN</div>
            ${practice.authorization_code ? `<div style="font-size:16pt;font-weight:700;color:#374151;margin-top:4px;font-family:monospace;letter-spacing:1px;">${practice.authorization_code}</div>` : ''}
            <div style="font-size:8pt;color:#6b7280;margin-top:2px;">Expediente: ${expedient.expedient_number}</div>
        </div>
    </div>

    <!-- Estado grande -->
    <div style="background:${statusColor}10;border:2px solid ${statusColor}40;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:20pt;font-weight:700;color:${statusColor};">${statusLabel}</div>
        ${practice.authorization_expiry ? `<div style="font-size:10pt;color:#6b7280;margin-top:4px;">Válida hasta: ${fmtDate(practice.authorization_expiry)}</div>` : ''}
    </div>

    <!-- Dos columnas: afiliado + práctica -->
    <div style="display:flex;gap:16px;margin-bottom:20px;">
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <div style="background:#f3f4f6;padding:8px 16px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Afiliado</div>
            <div style="padding:12px 16px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280;font-size:10pt;">ID</span><span style="font-weight:600;">${String(expedient.affiliate_id).slice(0, 12)}...</span></div>
                ${expedient.affiliate_plan_id ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280;font-size:10pt;">Plan</span><span style="font-weight:600;">#${expedient.affiliate_plan_id}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280;font-size:10pt;">Tipo</span><span style="font-weight:600;">${TYPE_LABELS[expedient.type]}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#6b7280;font-size:10pt;">Jurisdicción</span><span style="font-weight:600;">${jurisdictionLabel}</span></div>
            </div>
        </div>
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <div style="background:#f3f4f6;padding:8px 16px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Práctica</div>
            <div style="padding:12px 16px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280;font-size:10pt;">ID Práctica</span><span style="font-weight:600;">#${practice.practice_id}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280;font-size:10pt;">Cantidad</span><span style="font-weight:600;">${practice.quantity}</span></div>
                ${practice.practice_value ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280;font-size:10pt;">Valor</span><span style="font-weight:600;">${fmtCurrency(practice.practice_value)}</span></div>` : ''}
                ${practice.diagnosis_code ? `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#6b7280;font-size:10pt;">Diagnóstico</span><span style="font-weight:600;">${practice.diagnosis_code} ${practice.diagnosis_description || ''}</span></div>` : ''}
            </div>
        </div>
    </div>

    <!-- Desglose económico -->
    <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#f3f4f6;padding:8px 16px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Desglose Económico</div>
        <div style="padding:12px 16px;">
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;">
                <span style="color:#6b7280;">Cobertura</span>
                <span style="font-weight:700;font-size:14pt;color:#1e40af;">${practice.coverage_percent ?? 0}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;">
                <span style="color:#6b7280;">Monto Cubierto</span>
                <span style="font-weight:700;font-size:14pt;color:#16a34a;">${fmtCurrency(practice.covered_amount || 0)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;">
                <span style="color:#6b7280;">Coseguro (a cargo del afiliado)</span>
                <span style="font-weight:700;font-size:14pt;color:#d97706;">${fmtCurrency(practice.copay_amount || 0)}</span>
            </div>
        </div>
    </div>

    ${practice.resolution_notes ? `
    <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#f3f4f6;padding:8px 16px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Observaciones del Auditor</div>
        <div style="padding:12px 16px;font-size:10pt;">${practice.resolution_notes}</div>
    </div>` : ''}

    <!-- Footer -->
    <div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid #e5e7eb;padding-top:20px;">
        <div style="font-size:8pt;color:#6b7280;">
            <p>Documento generado por CPCE Salud</p>
            <p>Esta constancia es válida como comprobante de autorización.</p>
            <p>${jurisdictionLabel}</p>
        </div>
        <div style="text-align:center;padding-top:40px;border-top:1px solid #374151;min-width:180px;">
            <p style="font-size:9pt;color:#6b7280;">Firma del Auditor</p>
        </div>
    </div>

    <div style="text-align:center;font-size:7pt;color:#d1d5db;margin-top:16px;">
        CPCE Salud · ${practice.authorization_code || expedient.expedient_number} · Generado el ${fmtDateTime(new Date().toISOString())}
    </div>

    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
