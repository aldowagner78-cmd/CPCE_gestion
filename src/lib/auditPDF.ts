import { AuditRecord } from '@/types/database'

/**
 * Genera un PDF profesional del informe de auditoría.
 * Usa una ventana emergente con HTML+CSS optimizado para impresión,
 * sin dependencias externas. El usuario puede guardar como PDF
 * desde el diálogo de impresión del navegador.
 */
export function generateAuditPDF(audit: AuditRecord) {
    const statusLabel: Record<string, string> = {
        approved: '✅ APROBADA',
        rejected: '❌ RECHAZADA',
        partial: '⚠️ PARCIAL',
        pending: '🕐 PENDIENTE',
        requires_auth: '🔒 REQUIERE AUTORIZACIÓN',
    }

    const statusColor: Record<string, string> = {
        approved: '#16a34a',
        rejected: '#dc2626',
        partial: '#ea580c',
        pending: '#2563eb',
        requires_auth: '#7c3aed',
    }

    const now = new Date(audit.created_at)
    const dateStr = now.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
    const timeStr = now.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
    })

    const reviewedDateStr = audit.reviewed_at
        ? new Date(audit.reviewed_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—'

    const formatCurrency = (value: number) =>
        value.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
        })

    const auditNumber = `${now.getFullYear()}-${String(audit.id).padStart(5, '0')}`

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe de Auditoría N° ${auditNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11pt;
            color: #1f2937;
            line-height: 1.5;
            background: white;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 12px;
            margin-bottom: 24px;
        }
        .header-left h1 {
            font-size: 18pt;
            color: #1e40af;
            font-weight: 700;
        }
        .header-left p {
            font-size: 9pt;
            color: #6b7280;
        }
        .header-right {
            text-align: right;
        }
        .header-right .doc-number {
            font-size: 14pt;
            font-weight: 700;
            color: #1e40af;
        }
        .header-right .doc-date {
            font-size: 9pt;
            color: #6b7280;
        }
        .section {
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
        }
        .section-title {
            background: #f3f4f6;
            padding: 8px 16px;
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
        }
        .section-body {
            padding: 16px;
        }
        .row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .row:last-child { border-bottom: none; }
        .row-label {
            color: #6b7280;
            font-size: 10pt;
        }
        .row-value {
            font-weight: 600;
            text-align: right;
        }
        .result-banner {
            padding: 16px;
            border-radius: 6px;
            text-align: center;
            margin-bottom: 20px;
        }
        .result-status {
            font-size: 16pt;
            font-weight: 700;
        }
        .result-meta {
            display: flex;
            justify-content: space-around;
            margin-top: 12px;
        }
        .result-meta-item {
            text-align: center;
        }
        .result-meta-item .value {
            font-size: 16pt;
            font-weight: 700;
        }
        .result-meta-item .label {
            font-size: 8pt;
            color: #6b7280;
            text-transform: uppercase;
        }
        .observations {
            background: #fffbeb;
            border: 1px solid #fde68a;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .observations h3 {
            font-size: 10pt;
            color: #92400e;
            margin-bottom: 6px;
        }
        .observations ul {
            padding-left: 20px;
            font-size: 10pt;
            color: #78350f;
        }
        .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
        }
        .footer-left { font-size: 9pt; color: #6b7280; }
        .footer-right {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #374151;
            min-width: 200px;
        }
        .footer-right p {
            font-size: 9pt;
            color: #6b7280;
        }
        .watermark {
            text-align: center;
            font-size: 7pt;
            color: #d1d5db;
            margin-top: 20px;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>CPCE Salud</h1>
            <p>Consejo Profesional de Ciencias Económicas · Sistema de Auditoría Médica</p>
        </div>
        <div class="header-right">
            <div class="doc-number">INFORME N° ${auditNumber}</div>
            <div class="doc-date">${dateStr} ${timeStr}hs</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Datos del Afiliado</div>
        <div class="section-body">
            <div class="row">
                <span class="row-label">Nombre Completo</span>
                <span class="row-value">${audit.affiliate_name}</span>
            </div>
            <div class="row">
                <span class="row-label">Documento</span>
                <span class="row-value">DNI ${audit.affiliate_document}</span>
            </div>
            <div class="row">
                <span class="row-label">Plan</span>
                <span class="row-value">${audit.plan_name}</span>
            </div>
            <div class="row">
                <span class="row-label">Jurisdicción</span>
                <span class="row-value">${audit.jurisdiction_id === 1 ? 'Cámara I — Santa Fe' : 'Cámara II — Rosario'}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Práctica Auditada</div>
        <div class="section-body">
            <div class="row">
                <span class="row-label">Código</span>
                <span class="row-value">${audit.practice_code}</span>
            </div>
            <div class="row">
                <span class="row-label">Descripción</span>
                <span class="row-value">${audit.practice_description}</span>
            </div>
            <div class="row">
                <span class="row-label">Categoría</span>
                <span class="row-value">${audit.practice_category}</span>
            </div>
            <div class="row">
                <span class="row-label">Valor Nomenclador</span>
                <span class="row-value">${formatCurrency(audit.practice_value)}</span>
            </div>
        </div>
    </div>

    <div class="result-banner" style="background: ${statusColor[audit.status]}15; border: 2px solid ${statusColor[audit.status]}40;">
        <div class="result-status" style="color: ${statusColor[audit.status]};">
            ${statusLabel[audit.status] ?? audit.status}
        </div>
        <div class="result-meta">
            <div class="result-meta-item">
                <div class="value" style="color: ${statusColor[audit.status]};">${audit.coverage_percent}%</div>
                <div class="label">Cobertura</div>
            </div>
            <div class="result-meta-item">
                <div class="value" style="color: #16a34a;">${formatCurrency(audit.covered_amount)}</div>
                <div class="label">Monto Cubierto</div>
            </div>
            <div class="result-meta-item">
                <div class="value" style="color: #ea580c;">${formatCurrency(audit.copay)}</div>
                <div class="label">Copago</div>
            </div>
        </div>
    </div>

    ${
        audit.messages.length > 0 || audit.authorization_required
            ? `<div class="observations">
        <h3>⚠️ Observaciones</h3>
        <ul>
            ${audit.authorization_required ? '<li>Requiere autorización previa de auditoría médica.</li>' : ''}
            ${audit.messages.map((m) => `<li>${m}</li>`).join('')}
        </ul>
    </div>`
            : ''
    }

    ${
        audit.notes
            ? `<div class="section">
        <div class="section-title">Notas del Auditor</div>
        <div class="section-body">
            <p>${audit.notes}</p>
        </div>
    </div>`
            : ''
    }

    <div class="section">
        <div class="section-title">Trazabilidad</div>
        <div class="section-body">
            <div class="row">
                <span class="row-label">Auditor</span>
                <span class="row-value">${audit.auditor_name}</span>
            </div>
            <div class="row">
                <span class="row-label">Fecha de Creación</span>
                <span class="row-value">${dateStr} ${timeStr}hs</span>
            </div>
            <div class="row">
                <span class="row-label">Fecha de Revisión</span>
                <span class="row-value">${reviewedDateStr}</span>
            </div>
            ${audit.authorization_code ? `<div class="row"><span class="row-label">Código de Autorización</span><span class="row-value">${audit.authorization_code}</span></div>` : ''}
        </div>
    </div>

    <div class="footer">
        <div class="footer-left">
            <p>Documento generado por CPCE Salud</p>
            <p>Este informe es un comprobante interno de auditoría.</p>
        </div>
        <div class="footer-right">
            <p><strong>${audit.auditor_name}</strong></p>
            <p>Firma del Auditor</p>
        </div>
    </div>

    <div class="watermark">
        CPCE Salud · Informe N° ${auditNumber} · Generado el ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
    </div>

    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=800,height=1100')
    if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
    }
}
