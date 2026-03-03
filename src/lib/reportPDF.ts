/**
 * Generador de reportes PDF para auditoría médica.
 * Usa HTML + window.print() en popup (sin dependencias externas).
 */

const fmtCurrency = (v: number) =>
    v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface ReportOptions {
    title: string;
    dateFrom: string;
    dateTo: string;
    jurisdiction: string;
}

// ── Estilos compartidos ──

const BASE_STYLES = `
    @page { size: A4 landscape; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 9pt; color: #1f2937; line-height: 1.4; background: white; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 6px 8px; text-align: left; font-size: 8pt; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 8.5pt; }
    tr:hover { background: #f8fafc; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 15px; }
    .header h1 { font-size: 16pt; color: #1e40af; font-weight: 700; }
    .header .subtitle { font-size: 8pt; color: #6b7280; }
    .header .report-title { font-size: 12pt; font-weight: 700; color: #1e40af; text-align: right; }
    .header .report-info { font-size: 8pt; color: #6b7280; text-align: right; }
    .summary { display: flex; gap: 12px; margin-bottom: 15px; }
    .summary-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
    .summary-box .value { font-size: 16pt; font-weight: 700; color: #1e40af; }
    .summary-box .label { font-size: 7pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 9px; font-size: 7pt; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-gray { background: #f1f5f9; color: #475569; }
    .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7pt; color: #9ca3af; display: flex; justify-content: space-between; }
    .page-break { page-break-before: always; }
`;

function makeHeader(opts: ReportOptions): string {
    return `
        <div class="header">
            <div>
                <h1>CPCE Salud</h1>
                <p class="subtitle">Consejo Profesional de Ciencias Económicas · Auditoría Médica</p>
            </div>
            <div>
                <div class="report-title">${opts.title}</div>
                <div class="report-info">
                    Período: ${fmtDate(opts.dateFrom)} — ${fmtDate(opts.dateTo)}<br>
                    ${opts.jurisdiction ? `Jurisdicción: ${opts.jurisdiction}` : 'Todas las jurisdicciones'}<br>
                    Generado: ${fmtDateTime(new Date().toISOString())}
                </div>
            </div>
        </div>
    `;
}

function makeFooter(opts: ReportOptions, totalRecords: number): string {
    return `
        <div class="footer">
            <span>${opts.title} — ${opts.jurisdiction || 'Todas'}</span>
            <span>Total registros: ${totalRecords}</span>
            <span>Página 1 · Impreso ${fmtDateTime(new Date().toISOString())}</span>
        </div>
    `;
}

function openPrintWindow(html: string) {
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) { alert('Permita las ventanas emergentes para imprimir.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

// ── STATUS HELPERS ──

const STATUS_LABEL: Record<string, string> = {
    borrador: 'Borrador', pendiente: 'Pendiente', en_revision: 'En revisión',
    parcialmente_resuelto: 'Parcial', resuelto: 'Resuelto', observada: 'Observada',
    en_apelacion: 'Apelación', anulada: 'Anulada',
    autorizada: 'Autorizada', denegada: 'Denegada', autorizada_parcial: 'Parcial', diferida: 'Diferida',
    emitida: 'Emitida', aceptada: 'Aceptada', disputada: 'Disputada', resuelta: 'Resuelta',
};

const STATUS_BADGE: Record<string, string> = {
    resuelto: 'badge-green', autorizada: 'badge-green', autorizada_parcial: 'badge-purple',
    aprobada: 'badge-green', aceptada: 'badge-green',
    denegada: 'badge-red', anulada: 'badge-red',
    pendiente: 'badge-amber', borrador: 'badge-gray',
    en_revision: 'badge-blue', observada: 'badge-amber',
    en_apelacion: 'badge-purple', diferida: 'badge-blue',
    emitida: 'badge-blue', disputada: 'badge-red',
};

function statusBadge(s: string) {
    return `<span class="badge ${STATUS_BADGE[s] || 'badge-gray'}">${STATUS_LABEL[s] || s}</span>`;
}

const TYPE_LABELS: Record<string, string> = {
    ambulatoria: 'Ambulatoria', bioquimica: 'Bioquímica', internacion: 'Internación',
    odontologica: 'Odontológica', programas_especiales: 'Prog. Especiales',
    elementos: 'Elementos', reintegros: 'Reintegros',
};

// ═══════════════════════════════════════════════════════
// GENERADORES POR TIPO DE REPORTE
// ═══════════════════════════════════════════════════════

function generateExpedientesReport(data: Array<Record<string, unknown>>, opts: ReportOptions) {
    // Summary counts
    const total = data.length;
    const resueltos = data.filter(d => d.status === 'resuelto').length;
    const pendientes = data.filter(d => d.status === 'pendiente' || d.status === 'en_revision').length;
    const totalPracticas = data.reduce((s, d) => s + (Array.isArray(d.practices) ? d.practices.length : 0), 0);

    const rows = data.map(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const affiliate = d.affiliate as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = d.provider as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const practices = (d.practices as any[]) || [];
        const practicesSummary = practices.map(p => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pr = (p.practice as any);
            return `${pr?.code || '#' + p.practice_id}: ${statusBadge(p.status)}`;
        }).join('<br>');

        return `<tr>
            <td style="font-weight:600;font-family:monospace;font-size:8pt;">${d.expedient_number || ''}</td>
            <td>${TYPE_LABELS[d.type as string] || d.type || ''}</td>
            <td>${statusBadge(d.status as string)}</td>
            <td>${affiliate?.full_name || '—'}<br><span style="font-size:7pt;color:#6b7280;">DNI: ${affiliate?.document_number || ''}</span></td>
            <td>${provider?.name || '—'}</td>
            <td style="text-align:center;">${practices.length}</td>
            <td style="font-size:7.5pt;">${practicesSummary || '—'}</td>
            <td style="font-size:8pt;">${d.created_at ? fmtDate(d.created_at as string) : ''}</td>
            <td style="font-size:8pt;">${d.resolved_at ? fmtDate(d.resolved_at as string) : '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>${opts.title}</title><style>${BASE_STYLES}</style></head><body>
        ${makeHeader(opts)}
        <div class="summary">
            <div class="summary-box"><div class="value">${total}</div><div class="label">Expedientes</div></div>
            <div class="summary-box"><div class="value">${resueltos}</div><div class="label">Resueltos</div></div>
            <div class="summary-box"><div class="value">${pendientes}</div><div class="label">Pendientes</div></div>
            <div class="summary-box"><div class="value">${totalPracticas}</div><div class="label">Prácticas</div></div>
            <div class="summary-box"><div class="value">${total > 0 ? ((resueltos / total) * 100).toFixed(0) : 0}%</div><div class="label">Tasa Resolución</div></div>
        </div>
        <table>
            <thead><tr>
                <th>Expediente</th><th>Tipo</th><th>Estado</th>
                <th>Afiliado</th><th>Prestador</th><th style="text-align:center;">Prácticas</th>
                <th>Detalle</th><th>Creado</th><th>Resuelto</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${makeFooter(opts, total)}
    </body></html>`;

    openPrintWindow(html);
}

function generateAutorizacionesReport(data: Array<Record<string, unknown>>, opts: ReportOptions) {
    const total = data.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalCovered = data.reduce((s, d) => s + (Number((d as any).covered_amount) || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalCopay = data.reduce((s, d) => s + (Number((d as any).copay_amount) || 0), 0);

    const rows = data.map(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const practice = d.practice as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expedient = d.expedient as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const affiliate = expedient?.affiliate as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = expedient?.provider as any;

        return `<tr>
            <td style="font-family:monospace;font-weight:700;color:#1e40af;">${d.authorization_code || ''}</td>
            <td style="font-family:monospace;font-size:8pt;">${expedient?.expedient_number || ''}</td>
            <td>${practice?.code || '#' + (d.practice_id || '')}: ${practice?.name || ''}</td>
            <td style="text-align:center;">${d.quantity || 1}</td>
            <td>${affiliate?.full_name || '—'}<br><span style="font-size:7pt;color:#6b7280;">DNI: ${affiliate?.document_number || ''}</span></td>
            <td>${provider?.name || '—'}</td>
            <td style="text-align:center;">${d.coverage_percent ?? '—'}%</td>
            <td style="text-align:right;">${fmtCurrency(Number(d.covered_amount) || 0)}</td>
            <td style="text-align:right;">${fmtCurrency(Number(d.copay_amount) || 0)}</td>
            <td>${statusBadge(d.status as string)}</td>
            <td style="font-size:8pt;">${d.authorization_expiry ? fmtDate(d.authorization_expiry as string) : '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>${opts.title}</title><style>${BASE_STYLES}</style></head><body>
        ${makeHeader(opts)}
        <div class="summary">
            <div class="summary-box"><div class="value">${total}</div><div class="label">Autorizaciones</div></div>
            <div class="summary-box"><div class="value">${fmtCurrency(totalCovered)}</div><div class="label">Total Cubierto</div></div>
            <div class="summary-box"><div class="value">${fmtCurrency(totalCopay)}</div><div class="label">Total Coseguro</div></div>
            <div class="summary-box"><div class="value">${fmtCurrency(totalCovered + totalCopay)}</div><div class="label">Total General</div></div>
        </div>
        <table>
            <thead><tr>
                <th>Código</th><th>Expediente</th><th>Práctica</th><th style="text-align:center;">Cant.</th>
                <th>Afiliado</th><th>Prestador</th><th style="text-align:center;">Cobert.</th>
                <th style="text-align:right;">Cubierto</th><th style="text-align:right;">Coseguro</th>
                <th>Estado</th><th>Vence</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${makeFooter(opts, total)}
    </body></html>`;

    openPrintWindow(html);
}

function generateDebitosReport(data: Array<Record<string, unknown>>, opts: ReportOptions) {
    const total = data.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalAmount = data.reduce((s, d) => s + (Number((d as any).total_amount) || 0), 0);

    const rows = data.map(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = d.provider as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postAudit = d.post_audit as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (d.items as any[]) || [];

        const itemsDetail = items.map(it =>
            `<div style="font-size:7.5pt;color:#6b7280;padding:1px 0;">
                ○ ${it.practice_description || '—'}: ${fmtCurrency(Number(it.debit_amount) || 0)} (${it.debit_type || '—'})
            </div>`
        ).join('');

        return `<tr>
            <td style="font-family:monospace;font-weight:700;color:#dc2626;">${d.debit_number || ''}</td>
            <td style="font-family:monospace;font-size:8pt;">${postAudit?.audit_number || ''}</td>
            <td>${provider?.name || '—'}<br><span style="font-size:7pt;color:#6b7280;">CUIT: ${provider?.cuit || ''}</span></td>
            <td style="text-align:right;">${fmtCurrency(Number(postAudit?.invoiced_total) || 0)}</td>
            <td style="text-align:right;">${fmtCurrency(Number(postAudit?.authorized_total) || 0)}</td>
            <td style="text-align:right;font-weight:700;color:#dc2626;">${fmtCurrency(Number(d.total_amount) || 0)}</td>
            <td>${statusBadge(d.status as string)}</td>
            <td style="font-size:8pt;">${d.created_at ? fmtDate(d.created_at as string) : ''}</td>
            <td>${d.reason || '—'}</td>
            <td>${itemsDetail || '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>${opts.title}</title><style>${BASE_STYLES}</style></head><body>
        ${makeHeader(opts)}
        <div class="summary">
            <div class="summary-box"><div class="value">${total}</div><div class="label">Notas de Débito</div></div>
            <div class="summary-box"><div class="value">${fmtCurrency(totalAmount)}</div><div class="label">Total Debitado</div></div>
            <div class="summary-box"><div class="value">${data.filter(d => d.status === 'emitida').length}</div><div class="label">Emitidas</div></div>
            <div class="summary-box"><div class="value">${data.filter(d => d.status === 'disputada').length}</div><div class="label">Disputadas</div></div>
        </div>
        <table>
            <thead><tr>
                <th>Nro. Débito</th><th>Auditoría</th><th>Prestador</th>
                <th style="text-align:right;">Facturado</th><th style="text-align:right;">Autorizado</th>
                <th style="text-align:right;">Débito</th><th>Estado</th>
                <th>Fecha</th><th>Motivo</th><th>Detalle</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${makeFooter(opts, total)}
    </body></html>`;

    openPrintWindow(html);
}

// ═══════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════

export function generateReportPDF(
    type: 'expedientes' | 'autorizaciones' | 'debitos',
    data: Array<Record<string, unknown>>,
    opts: ReportOptions,
) {
    switch (type) {
        case 'expedientes':
            return generateExpedientesReport(data, opts);
        case 'autorizaciones':
            return generateAutorizacionesReport(data, opts);
        case 'debitos':
            return generateDebitosReport(data, opts);
    }
}
