/**
 * slaService.ts — Motor de cálculo de horas hábiles y semáforo SLA
 *
 * Lógica:
 *  - Horas hábiles = Lun-Vie, 08:00-18:00 (excluye sábados, domingos y feriados nacionales argentinos)
 *  - Semáforo:
 *      Verde    → < 24 horas hábiles transcurridas
 *      Amarillo → 24-48 horas hábiles
 *      Rojo     → > 48 horas hábiles
 *
 * Costo: CERO — cálculo 100% local, sin APIs externas.
 */

'use client';

export type SLAStatus = 'verde' | 'amarillo' | 'rojo';

export interface SLAResult {
    status: SLAStatus;
    hoursElapsed: number;       // horas hábiles transcurridas
    displayLabel: string;       // ej: "32h hábiles"
    colorClass: string;         // clases Tailwind
    bgColorClass: string;
    textColorClass: string;
    borderColorClass: string;
    emoji: string;
}

// ── Feriados nacionales Argentina 2025-2026 ──────────────────
// Formato: 'MM-DD' (independiente del año)
const FIXED_HOLIDAYS_AR: Set<string> = new Set([
    '01-01', // Año Nuevo
    '03-24', // Día de la Memoria
    '04-02', // Día del Veterano (Malvinas)
    '05-01', // Día del Trabajador
    '05-25', // Día de la Revolución de Mayo
    '06-20', // Día de la Bandera
    '07-09', // Día de la Independencia
    '08-17', // Paso a la Inmortalidad de San Martín
    '10-12', // Día del Respeto a la Diversidad Cultural
    '11-20', // Día de la Soberanía Nacional
    '12-08', // Inmaculada Concepción
    '12-25', // Navidad
]);

// ── Constantes ───────────────────────────────────────────────

const BUSINESS_HOUR_START = 8;  // 08:00
const BUSINESS_HOUR_END = 18; // 18:00

// ── Helpers ──────────────────────────────────────────────────

function isHoliday(date: Date): boolean {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return FIXED_HOLIDAYS_AR.has(`${month}-${day}`);
}

function isBusinessDay(date: Date): boolean {
    const dow = date.getDay(); // 0=Dom, 6=Sab
    return dow !== 0 && dow !== 6 && !isHoliday(date);
}

function isBusinessHour(date: Date): boolean {
    const h = date.getHours();
    return h >= BUSINESS_HOUR_START && h < BUSINESS_HOUR_END;
}

// ── Función principal ─────────────────────────────────────────

/**
 * Calcula cuántas horas hábiles han pasado desde `createdAt`.
 * @param createdAt ISO string de creación del expediente
 * @returns horas hábiles como número con 1 decimal
 */
export function calcBusinessHours(createdAt: string | Date): number {
    const start = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const now = new Date();

    if (now <= start) return 0;

    let cursor = new Date(start);
    let businessMinutes = 0;

    // Avanzar minuto a minuto — eficiente para rangos < 30 días
    // Para optimizar: avanzamos en bloques de 1 hora si no es día hábil
    while (cursor < now) {
        if (isBusinessDay(cursor) && isBusinessHour(cursor)) {
            const nextMinute = new Date(cursor.getTime() + 60_000);
            const end = nextMinute <= now ? nextMinute : now;
            businessMinutes += (end.getTime() - cursor.getTime()) / 60_000;
            cursor = nextMinute;
        } else {
            // Saltar al próximo día hábil en bloque para mayor eficiencia
            const next = new Date(cursor);
            if (cursor.getHours() >= BUSINESS_HOUR_END || !isBusinessDay(cursor)) {
                // Avanzar al día siguiente a las 08:00
                next.setDate(next.getDate() + 1);
                next.setHours(BUSINESS_HOUR_START, 0, 0, 0);
            } else {
                // Estamos en día hábil pero antes de las 08:00
                next.setHours(BUSINESS_HOUR_START, 0, 0, 0);
            }
            cursor = next;
        }
    }

    return Math.round((businessMinutes / 60) * 10) / 10;
}

/**
 * Dado cuántas horas hábiles transcurridas, retorna el estado del semáforo.
 */
export function getSLAStatus(hoursElapsed: number): SLAStatus {
    if (hoursElapsed < 24) return 'verde';
    if (hoursElapsed <= 48) return 'amarillo';
    return 'rojo';
}

/**
 * Retorna el resultado completo de SLA con clases de color listas para usar en UI.
 */
export function computeSLA(createdAt: string | Date, lastActivityAt?: string | Date): SLAResult {
    // Si hay actividad reciente, recalcular desde ahí (práctica: contar desde último movimiento)
    const reference = lastActivityAt ?? createdAt;
    const hoursElapsed = calcBusinessHours(reference);
    const status = getSLAStatus(hoursElapsed);

    const displayHours = hoursElapsed.toFixed(1);
    const displayLabel = `${displayHours}h hábiles`;

    const config: Record<SLAStatus, { emoji: string; color: string; bg: string; text: string; border: string }> = {
        verde: {
            emoji: '🟢',
            color: 'bg-green-100 text-green-800 border-green-200',
            bg: 'bg-green-100',
            text: 'text-green-800',
            border: 'border-green-200',
        },
        amarillo: {
            emoji: '🟡',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            bg: 'bg-yellow-100',
            text: 'text-yellow-800',
            border: 'border-yellow-200',
        },
        rojo: {
            emoji: '🔴',
            color: 'bg-red-100 text-red-800 border-red-200',
            bg: 'bg-red-100',
            text: 'text-red-800',
            border: 'border-red-200',
        },
    };

    const c = config[status];

    return {
        status,
        hoursElapsed,
        displayLabel,
        colorClass: c.color,
        bgColorClass: c.bg,
        textColorClass: c.text,
        borderColorClass: c.border,
        emoji: c.emoji,
    };
}

/**
 * Ordena una lista de expedientes por prioridad de bandeja del auditor:
 *  1° Estrella IA (clinical_priority_score >= 30)
 *  2° Rojo (SLA > 48h)
 *  3° Amarillo (SLA 24-48h)
 *  4° Verde (SLA < 24h)
 *
 * Dentro de cada grupo, por score descendente o por fecha ascendente.
 */
export function sortExpedientsByPriority<T extends {
    created_at: string;
    last_activity_at?: string;
    clinical_priority_score?: number;
}>(expedients: T[]): T[] {
    return [...expedients].sort((a, b) => {
        const scoreA = a.clinical_priority_score ?? 0;
        const scoreB = b.clinical_priority_score ?? 0;
        const hasStarA = scoreA >= 30;
        const hasStarB = scoreB >= 30;

        const slaA = computeSLA(a.created_at, a.last_activity_at).status;
        const slaB = computeSLA(b.created_at, b.last_activity_at).status;

        const rankSLA = { rojo: 0, amarillo: 1, verde: 2 };

        // Primero: estrella IA
        if (hasStarA !== hasStarB) return hasStarA ? -1 : 1;

        // Segundo: semáforo (rojo primero)
        const slaRankDiff = rankSLA[slaA] - rankSLA[slaB];
        if (slaRankDiff !== 0) return slaRankDiff;

        // Tercero: mayor score IA
        if (scoreA !== scoreB) return scoreB - scoreA;

        // Cuarto: más antiguo primero
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

/**
 * Verifica si un expediente lleva más de 48h sin actividad.
 * Devuelve true si se debe registrar evento de alerta para notificar al afiliado.
 */
export function shouldTriggerDelayAlert(
    createdAt: string,
    lastActivityAt?: string,
    alreadyAlerted?: boolean,
): boolean {
    if (alreadyAlerted) return false;
    const hours = calcBusinessHours(lastActivityAt ?? createdAt);
    return hours >= 48;
}
