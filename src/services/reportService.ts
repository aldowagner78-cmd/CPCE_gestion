'use client';

import { createClient } from '@/lib/supabase';

const supabase = createClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ═══════════════════════════════════════════════════════
// REPORT SERVICE — Métricas y estadísticas de auditoría
// ═══════════════════════════════════════════════════════

export interface ExpedientCountsByStatus {
    pendiente: number;
    en_revision: number;
    parcialmente_resuelto: number;
    resuelto: number;
    observada: number;
    en_apelacion: number;
    anulada: number;
    borrador: number;
}

export interface PracticeCountsByResolution {
    autorizada: number;
    denegada: number;
    observada: number;
    autorizada_parcial: number;
    diferida: number;
    pendiente: number;
    en_revision: number;
}

export interface MonthlyTrend {
    month: string;       // "Ene", "Feb", etc.
    monthNum: number;    // 1..12
    year: number;
    aprobadas: number;
    denegadas: number;
    observadas: number;
    total: number;
}

export interface ExpedientsByType {
    type: string;
    label: string;
    count: number;
}

export interface AuditorProductivity {
    auditor_id: string;
    auditor_name: string;
    resueltos: number;
    autorizados: number;
    denegados: number;
    tiempo_promedio_horas: number;
}

export interface TopPractice {
    practice_id: number;
    practice_code: string;
    practice_description: string;
    count: number;
    authorized: number;
    denied: number;
}

export interface PostAuditSummary {
    total: number;
    pendientes: number;
    en_revision: number;
    aprobadas: number;
    con_debitos: number;
    total_facturado: number;
    total_autorizado: number;
    total_debitos: number;
}

export interface DashboardMetrics {
    expedientsByStatus: ExpedientCountsByStatus;
    practicesByResolution: PracticeCountsByResolution;
    monthlyTrends: MonthlyTrend[];
    expedientsByType: ExpedientsByType[];
    auditorProductivity: AuditorProductivity[];
    topPractices: TopPractice[];
    postAuditSummary: PostAuditSummary;
    avgResolutionHours: number;
    totalExpedients: number;
    approvalRate: number;
    denialRate: number;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TYPE_LABELS: Record<string, string> = {
    ambulatoria: 'Ambulatoria',
    bioquimica: 'Bioquímica',
    internacion: 'Internación',
    odontologica: 'Odontológica',
    programas_especiales: 'Prog. Especiales',
    elementos: 'Elementos',
    reintegros: 'Reintegros',
};

export const ReportService = {

    // ── Métricas principales del dashboard ──
    async getDashboardMetrics(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
        year?: number;
    }): Promise<DashboardMetrics> {
        const [
            expedientsByStatus,
            practicesByResolution,
            monthlyTrends,
            expedientsByType,
            auditorProductivity,
            topPractices,
            postAuditSummary,
            resolutionTimes,
        ] = await Promise.all([
            this.getExpedientsByStatus(filters),
            this.getPracticesByResolution(filters),
            this.getMonthlyTrends(filters),
            this.getExpedientsByType(filters),
            this.getAuditorProductivity(filters),
            this.getTopPractices(filters),
            this.getPostAuditSummary(filters),
            this.getAvgResolutionTime(filters),
        ]);

        const totalExpedients = Object.values(expedientsByStatus).reduce((a, b) => a + b, 0);
        const totalResolved = practicesByResolution.autorizada + practicesByResolution.autorizada_parcial +
            practicesByResolution.denegada;
        const approvalRate = totalResolved > 0
            ? ((practicesByResolution.autorizada + practicesByResolution.autorizada_parcial) / totalResolved) * 100
            : 0;
        const denialRate = totalResolved > 0
            ? (practicesByResolution.denegada / totalResolved) * 100
            : 0;

        return {
            expedientsByStatus,
            practicesByResolution,
            monthlyTrends,
            expedientsByType,
            auditorProductivity,
            topPractices,
            postAuditSummary,
            avgResolutionHours: resolutionTimes,
            totalExpedients,
            approvalRate,
            denialRate,
        };
    },

    // ── Expedientes agrupados por estado ──
    async getExpedientsByStatus(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<ExpedientCountsByStatus> {
        let query = db('expedients').select('status');
        if (filters.jurisdictionId) query = query.eq('jurisdiction_id', filters.jurisdictionId);
        if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

        const { data, error } = await query;
        if (error) console.error('getExpedientsByStatus error:', error);

        const counts: ExpedientCountsByStatus = {
            pendiente: 0, en_revision: 0, parcialmente_resuelto: 0,
            resuelto: 0, observada: 0, en_apelacion: 0, anulada: 0, borrador: 0,
        };

        (data || []).forEach((row: { status: string }) => {
            if (row.status in counts) {
                counts[row.status as keyof ExpedientCountsByStatus]++;
            }
        });

        return counts;
    },

    // ── Prácticas agrupadas por resolución ──
    async getPracticesByResolution(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<PracticeCountsByResolution> {
        let query = db('expedient_practices')
            .select('status, expedient:expedients!inner(jurisdiction_id, created_at)');

        if (filters.jurisdictionId) {
            query = query.eq('expedient.jurisdiction_id', filters.jurisdictionId);
        }
        if (filters.dateFrom) query = query.gte('expedient.created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('expedient.created_at', filters.dateTo);

        const { data, error } = await query;
        if (error) console.error('getPracticesByResolution error:', error);

        const counts: PracticeCountsByResolution = {
            autorizada: 0, denegada: 0, observada: 0,
            autorizada_parcial: 0, diferida: 0, pendiente: 0, en_revision: 0,
        };

        (data || []).forEach((row: { status: string }) => {
            if (row.status in counts) {
                counts[row.status as keyof PracticeCountsByResolution]++;
            }
        });

        return counts;
    },

    // ── Tendencias mensuales (últimos 12 meses) ──
    async getMonthlyTrends(filters: {
        jurisdictionId?: number;
        year?: number;
    }): Promise<MonthlyTrend[]> {
        const year = filters.year || new Date().getFullYear();
        const startDate = `${year}-01-01T00:00:00`;
        const endDate = `${year}-12-31T23:59:59`;

        let query = db('expedient_practices')
            .select('status, resolved_at, expedient:expedients!inner(jurisdiction_id, created_at)')
            .gte('expedient.created_at', startDate)
            .lte('expedient.created_at', endDate);

        if (filters.jurisdictionId) {
            query = query.eq('expedient.jurisdiction_id', filters.jurisdictionId);
        }

        const { data, error } = await query;
        if (error) console.error('getMonthlyTrends error:', error);

        // Agrupar por mes
        const months: MonthlyTrend[] = Array.from({ length: 12 }, (_, i) => ({
            month: MONTH_NAMES[i],
            monthNum: i + 1,
            year,
            aprobadas: 0,
            denegadas: 0,
            observadas: 0,
            total: 0,
        }));

        (data || []).forEach((row: { status: string; expedient: { created_at: string } }) => {
            const createdAt = row.expedient?.created_at;
            if (!createdAt) return;
            const m = new Date(createdAt).getMonth(); // 0-based
            months[m].total++;
            if (row.status === 'autorizada' || row.status === 'autorizada_parcial') {
                months[m].aprobadas++;
            } else if (row.status === 'denegada') {
                months[m].denegadas++;
            } else if (row.status === 'observada') {
                months[m].observadas++;
            }
        });

        return months;
    },

    // ── Expedientes agrupados por tipo ──
    async getExpedientsByType(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<ExpedientsByType[]> {
        let query = db('expedients').select('type');
        if (filters.jurisdictionId) query = query.eq('jurisdiction_id', filters.jurisdictionId);
        if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

        const { data, error } = await query;
        if (error) console.error('getExpedientsByType error:', error);

        const map: Record<string, number> = {};
        (data || []).forEach((row: { type: string }) => {
            map[row.type] = (map[row.type] || 0) + 1;
        });

        return Object.entries(map).map(([type, count]) => ({
            type,
            label: TYPE_LABELS[type] || type,
            count,
        })).sort((a, b) => b.count - a.count);
    },

    // ── Productividad por auditor ──
    async getAuditorProductivity(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<AuditorProductivity[]> {
        let query = db('expedients')
            .select('resolved_by, resolved_at, created_at, status, resolver:users!expedients_resolved_by_fkey(full_name)')
            .not('resolved_by', 'is', null);

        if (filters.jurisdictionId) query = query.eq('jurisdiction_id', filters.jurisdictionId);
        if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

        const { data, error } = await query;
        if (error) console.error('getAuditorProductivity error:', error);

        const auditorMap: Record<string, {
            name: string;
            resueltos: number;
            totalHours: number;
        }> = {};

        (data || []).forEach((row: {
            resolved_by: string;
            resolved_at: string;
            created_at: string;
            status: string;
            resolver?: { full_name: string };
        }) => {
            if (!row.resolved_by) return;
            if (!auditorMap[row.resolved_by]) {
                auditorMap[row.resolved_by] = {
                    name: row.resolver?.full_name || 'Sin nombre',
                    resueltos: 0,
                    totalHours: 0,
                };
            }
            auditorMap[row.resolved_by].resueltos++;

            if (row.resolved_at && row.created_at) {
                const hours = (new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
                auditorMap[row.resolved_by].totalHours += hours;
            }
        });

        // Get practice-level stats per auditor
        const auditorIds = Object.keys(auditorMap);
        const practiceStats: Record<string, { autorizados: number; denegados: number }> = {};

        if (auditorIds.length > 0) {
            const { data: pData } = await db('expedient_practices')
                .select('resolved_by, status')
                .in('resolved_by', auditorIds)
                .in('status', ['autorizada', 'autorizada_parcial', 'denegada']);

            (pData || []).forEach((row: { resolved_by: string; status: string }) => {
                if (!practiceStats[row.resolved_by]) {
                    practiceStats[row.resolved_by] = { autorizados: 0, denegados: 0 };
                }
                if (row.status === 'denegada') {
                    practiceStats[row.resolved_by].denegados++;
                } else {
                    practiceStats[row.resolved_by].autorizados++;
                }
            });
        }

        return Object.entries(auditorMap).map(([id, info]) => ({
            auditor_id: id,
            auditor_name: info.name,
            resueltos: info.resueltos,
            autorizados: practiceStats[id]?.autorizados || 0,
            denegados: practiceStats[id]?.denegados || 0,
            tiempo_promedio_horas: info.resueltos > 0
                ? Math.round((info.totalHours / info.resueltos) * 10) / 10
                : 0,
        })).sort((a, b) => b.resueltos - a.resueltos);
    },

    // ── Top prácticas más solicitadas ──
    async getTopPractices(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
    }, limit = 10): Promise<TopPractice[]> {
        let query = db('expedient_practices')
            .select('practice_id, status, practice:practices!inner(code, name), expedient:expedients!inner(jurisdiction_id, created_at)');

        if (filters.jurisdictionId) {
            query = query.eq('expedient.jurisdiction_id', filters.jurisdictionId);
        }
        if (filters.dateFrom) query = query.gte('expedient.created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('expedient.created_at', filters.dateTo);

        const { data, error } = await query;
        if (error) console.error('getTopPractices error:', error);

        const map: Record<number, {
            code: string;
            description: string;
            count: number;
            authorized: number;
            denied: number;
        }> = {};

        (data || []).forEach((row: {
            practice_id: number;
            status: string;
            practice?: { code: string; name: string };
        }) => {
            if (!map[row.practice_id]) {
                map[row.practice_id] = {
                    code: row.practice?.code || '',
                    description: row.practice?.name || `Práctica #${row.practice_id}`,
                    count: 0,
                    authorized: 0,
                    denied: 0,
                };
            }
            map[row.practice_id].count++;
            if (row.status === 'autorizada' || row.status === 'autorizada_parcial') {
                map[row.practice_id].authorized++;
            } else if (row.status === 'denegada') {
                map[row.practice_id].denied++;
            }
        });

        return Object.entries(map)
            .map(([id, info]) => ({
                practice_id: Number(id),
                practice_code: info.code,
                practice_description: info.description,
                count: info.count,
                authorized: info.authorized,
                denied: info.denied,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    },

    // ── Resumen de auditoría posterior ──
    async getPostAuditSummary(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<PostAuditSummary> {
        let query = db('post_audits').select('status, invoiced_total, authorized_total, debit_total');
        if (filters.jurisdictionId) query = query.eq('jurisdiction_id', filters.jurisdictionId);
        if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

        const { data, error } = await query;
        if (error) console.error('getPostAuditSummary error:', error);

        const summary: PostAuditSummary = {
            total: 0, pendientes: 0, en_revision: 0, aprobadas: 0, con_debitos: 0,
            total_facturado: 0, total_autorizado: 0, total_debitos: 0,
        };

        (data || []).forEach((row: {
            status: string;
            invoiced_total: number;
            authorized_total: number;
            debit_total: number;
        }) => {
            summary.total++;
            if (row.status === 'pendiente') summary.pendientes++;
            else if (row.status === 'en_revision') summary.en_revision++;
            else if (row.status === 'aprobada') summary.aprobadas++;
            else if (row.status === 'con_debitos') summary.con_debitos++;
            summary.total_facturado += Number(row.invoiced_total) || 0;
            summary.total_autorizado += Number(row.authorized_total) || 0;
            summary.total_debitos += Number(row.debit_total) || 0;
        });

        return summary;
    },

    // ── Tiempo promedio de resolución (horas) ──
    async getAvgResolutionTime(filters: {
        jurisdictionId?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<number> {
        let query = db('expedients')
            .select('created_at, resolved_at')
            .not('resolved_at', 'is', null)
            .in('status', ['resuelto', 'parcialmente_resuelto']);

        if (filters.jurisdictionId) query = query.eq('jurisdiction_id', filters.jurisdictionId);
        if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

        const { data, error } = await query;
        if (error) console.error('getAvgResolutionTime error:', error);

        if (!data || data.length === 0) return 0;

        let totalHours = 0;
        let count = 0;

        data.forEach((row: { created_at: string; resolved_at: string }) => {
            const hours = (new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
            if (hours >= 0 && hours < 10000) { // filter unreasonable values
                totalHours += hours;
                count++;
            }
        });

        return count > 0 ? Math.round((totalHours / count) * 10) / 10 : 0;
    },

    // ── Datos para reporte exportable: expedientes por período ──
    async getExpedientsForExport(filters: {
        jurisdictionId?: number;
        dateFrom: string;
        dateTo: string;
        status?: string;
        type?: string;
    }): Promise<Array<Record<string, unknown>>> {
        let query = db('expedients')
            .select(`
                expedient_number, type, priority, status,
                request_notes, resolution_notes, rules_result,
                created_at, resolved_at,
                affiliate:affiliates(full_name, document_number, affiliate_number),
                provider:providers(name, cuit),
                creator:users!expedients_created_by_fkey(full_name),
                resolver:users!expedients_resolved_by_fkey(full_name),
                practices:expedient_practices(
                    practice_id, quantity, status, coverage_percent, covered_amount,
                    copay_amount, authorization_code, resolution_notes,
                    practice:practices(code, name)
                )
            `)
            .gte('created_at', filters.dateFrom)
            .lte('created_at', filters.dateTo)
            .order('created_at', { ascending: false });

        if (filters.jurisdictionId) query = query.eq('jurisdiction_id', filters.jurisdictionId);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.type) query = query.eq('type', filters.type);

        const { data, error } = await query;
        if (error) console.error('getExpedientsForExport error:', error);
        return data || [];
    },

    // ── Datos para reporte de autorizaciones emitidas ──
    async getAuthorizationsForExport(filters: {
        jurisdictionId?: number;
        dateFrom: string;
        dateTo: string;
    }): Promise<Array<Record<string, unknown>>> {
        let query = db('expedient_practices')
            .select(`
                authorization_code, authorization_expiry, status,
                practice_id, quantity, coverage_percent, covered_amount, copay_amount,
                resolved_at, resolution_notes,
                practice:practices(code, name),
                expedient:expedients!inner(
                    expedient_number, type,
                    affiliate:affiliates(full_name, document_number),
                    provider:providers(name),
                    jurisdiction_id, created_at
                )
            `)
            .in('status', ['autorizada', 'autorizada_parcial'])
            .not('authorization_code', 'is', null)
            .gte('expedient.created_at', filters.dateFrom)
            .lte('expedient.created_at', filters.dateTo);

        if (filters.jurisdictionId) {
            query = query.eq('expedient.jurisdiction_id', filters.jurisdictionId);
        }

        const { data, error } = await query;
        if (error) console.error('getAuthorizationsForExport error:', error);
        return data || [];
    },

    // ── Datos para reporte de débitos ──
    async getDebitsForExport(filters: {
        jurisdictionId?: number;
        dateFrom: string;
        dateTo: string;
    }): Promise<Array<Record<string, unknown>>> {
        let query = db('debit_notes')
            .select(`
                debit_number, status, total_amount, reason,
                created_at, emitted_at,
                provider:providers(name, cuit),
                post_audit:post_audits(audit_number, invoiced_total, authorized_total),
                items:debit_note_items(practice_description, debit_amount, debit_type, reason)
            `)
            .gte('created_at', filters.dateFrom)
            .lte('created_at', filters.dateTo)
            .order('created_at', { ascending: false });

        if (filters.jurisdictionId) query = query.eq('jurisdiction_id', filters.jurisdictionId);

        const { data, error } = await query;
        if (error) console.error('getDebitsForExport error:', error);
        return data || [];
    },
};
