'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { createClient } from '@/lib/supabase';
import {
    Search, User, Filter, Download,
    ChevronDown, ChevronUp, Clock,
    ArrowLeft, X, Loader2,
    CheckCircle, AlertCircle,
    History, Paperclip, FileText, FileImage
} from 'lucide-react';
import Link from 'next/link';
import type { Affiliate } from '@/types/database';

const supabase = createClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ── Tipos ──

interface HistoryRecord {
    id: string;
    date: string;
    practiceCode: string;
    practiceName: string;
    practiceId: number;
    status: string;
    coveredAmount: number;
    copayAmount: number;
    practiceValue: number;
    coveragePercent: number;
    expedientId: string;
    expedientNumber: string;
    expedientType: string;
    auditorName: string;
    quantity: number;
    diagnosisCode: string;
    diagnosisDescription: string;
    ruleResult: string;
    resolvedAt: string;
}

interface HistorySummary {
    totalRecords: number;
    totalCovered: number;
    totalCopay: number;
    totalValue: number;
    uniquePractices: number;
    authorized: number;
    denied: number;
    pending: number;
    avgCoverage: number;
}

function calcAge(birthDate: string | null | undefined): number | null {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
    return age;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    autorizada: { bg: 'bg-green-100', text: 'text-green-700', label: 'Autorizada' },
    autorizada_parcial: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aut. Parcial' },
    denegada: { bg: 'bg-red-100', text: 'text-red-700', label: 'Denegada' },
    pendiente: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pendiente' },
    en_revision: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En revisión' },
    desistida: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Desistida' },
};

// ════════════════════════════════════════════════════════
// ═  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════

export default function HistoryPage() {
    const { } = useAuth();
    const { activeJurisdiction } = useJurisdiction();

    // Estado: Búsqueda de afiliado
    const [affSearch, setAffSearch] = useState('');
    const [affResults, setAffResults] = useState<Affiliate[]>([]);
    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [searchingAff, setSearchingAff] = useState(false);
    const [planName, setPlanName] = useState('');

    // Estado: Historial
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Estado: Filtros
    const [showFilters, setShowFilters] = useState(false);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPractice, setFilterPractice] = useState('');
    const [filterType, setFilterType] = useState('');

    // Estado: Vista
    const [viewMode, setViewMode] = useState<'detail' | 'summary'>('detail');
    const [sortField, setSortField] = useState<'date' | 'practice' | 'amount'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Estado: Adjuntos (Linterna Auditor)
     
    const [viewingAttachmentsFor, setViewingAttachmentsFor] = useState<{ expedientId: string, expedientNumber: string } | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);


    // ═══════════════════════════════════════════
    // ═  BÚSQUEDA AFILIADOS
    // ═══════════════════════════════════════════

    const searchAffs = useCallback(async (q: string) => {
        if (q.length < 2) { setAffResults([]); return; }
        setSearchingAff(true);
        try {
            const { data } = await supabase
                .from('affiliates')
                .select('*')
                .or(`full_name.ilike.%${q}%,document_number.ilike.%${q}%,affiliate_number.ilike.%${q}%`)
                .eq('jurisdiction_id', activeJurisdiction?.id || 1)
                .order('full_name')
                .limit(10);
            setAffResults((data || []) as Affiliate[]);
        } catch { setAffResults([]); }
        setSearchingAff(false);
    }, [activeJurisdiction]);

    useEffect(() => {
        const t = setTimeout(() => { if (affSearch) searchAffs(affSearch); }, 300);
        return () => clearTimeout(t);
    }, [affSearch, searchAffs]);

    const selectAffiliate = useCallback(async (a: Affiliate) => {
        setAffiliate(a);
        setAffResults([]);
        setAffSearch('');
        setRecords([]);
        setLoaded(false);
        if (a.plan_id) {
            const { data } = await db('plans').select('name').eq('id', a.plan_id).single();
            setPlanName(data?.name || `Plan #${a.plan_id}`);
        } else {
            setPlanName('Sin plan');
        }
    }, []);

    const clearAffiliate = useCallback(() => {
        setAffiliate(null);
        setAffSearch('');
        setRecords([]);
        setLoaded(false);
        setPlanName('');
    }, []);

    // ═══════════════════════════════════════════
    // ═  CARGAR HISTORIAL COMPLETO
    // ═══════════════════════════════════════════

    const fetchHistory = useCallback(async () => {
        if (!affiliate) return;
        setLoading(true);
        try {
            // Obtener expedientes
            const { data: exps } = await db('expedients')
                .select('id, expedient_number, type, status, created_at, resolved_by, resolved_at, diagnosis_code, diagnosis_description, rules_result')
                .eq('affiliate_id', String(affiliate.id))
                .order('created_at', { ascending: false })
                .limit(500);

            const expList = (exps || []) as Record<string, unknown>[];
            const expIds = expList.map(e => e.id as string);

            // Obtener prácticas de expedientes
            let expPractices: Record<string, unknown>[] = [];
            if (expIds.length > 0) {
                const { data } = await db('expedient_practices')
                    .select('id, expedient_id, practice_id, quantity, status, covered_amount, copay_amount, practice_value, coverage_percent, rule_result, created_at')
                    .in('expedient_id', expIds);
                expPractices = (data || []) as Record<string, unknown>[];
            }

            // Obtener prácticas (nombres)
            const allPracticeIds = [...new Set(expPractices.map(ep => ep.practice_id).filter(Boolean))];
            let practiceMap = new Map<unknown, Record<string, unknown>>();
            if (allPracticeIds.length > 0) {
                const { data: practices } = await supabase.from('practices').select('id, code, name').in('id', allPracticeIds);
                practiceMap = new Map((practices || []).map((p: Record<string, unknown>) => [p.id, p]));
            }

            // Obtener auditores
            const auditorIds = [...new Set(expList.map(e => e.resolved_by).filter(Boolean))];
            let auditorMap = new Map<unknown, string>();
            if (auditorIds.length > 0) {
                const { data: users } = await db('users').select('id, full_name').in('id', auditorIds);
                auditorMap = new Map((users || []).map((u: Record<string, unknown>) => [u.id, u.full_name as string]));
            }

            const expMap = new Map(expList.map(e => [e.id, e]));

            const historyRecords: HistoryRecord[] = expPractices.map(ep => {
                const exp = (expMap.get(ep.expedient_id) || {}) as Record<string, unknown>;
                const prac = (practiceMap.get(ep.practice_id) || {}) as Record<string, unknown>;
                return {
                    id: (ep.id as string) || String(Math.random()),
                    date: (ep.created_at || exp.created_at || '') as string,
                    practiceCode: (prac.code as string) || '',
                    practiceName: (prac.name as string) || 'Práctica',
                    practiceId: (ep.practice_id as number) || 0,
                    status: (ep.status as string) || (exp.status as string) || 'pendiente',
                    coveredAmount: (ep.covered_amount as number) || 0,
                    copayAmount: (ep.copay_amount as number) || 0,
                    practiceValue: (ep.practice_value as number) || 0,
                    coveragePercent: (ep.coverage_percent as number) || 0,
                    expedientId: (ep.expedient_id as string) || '',
                    expedientNumber: (exp.expedient_number as string) || '',
                    expedientType: (exp.type as string) || '',
                    auditorName: auditorMap.get(exp.resolved_by) || '',
                    quantity: (ep.quantity as number) || 1,
                    diagnosisCode: (exp.diagnosis_code as string) || '',
                    diagnosisDescription: (exp.diagnosis_description as string) || '',
                    ruleResult: (ep.rule_result as string) || (exp.rules_result as string) || '',
                    resolvedAt: (exp.resolved_at as string) || '',
                };
            });

            setRecords(historyRecords.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
            setLoaded(true);
        } catch {
            setRecords([]);
        }
        setLoading(false);
    }, [affiliate]);

    // Auto-cargar al seleccionar afiliado
    useEffect(() => {
        let cancelled = false;
        if (affiliate && !loaded) {
            const run = async () => {
                await fetchHistory();
                if (cancelled) return;
            };
            run();
        }
        return () => { cancelled = true; };
    }, [affiliate, loaded, fetchHistory]);

    // ═══════════════════════════════════════════
    // ═  FILTRADO Y ORDENAMIENTO
    // ═══════════════════════════════════════════

    const filteredRecords = records.filter(r => {
        if (filterDateFrom && r.date < filterDateFrom) return false;
        if (filterDateTo && r.date > filterDateTo + 'T23:59:59') return false;
        if (filterStatus && r.status !== filterStatus) return false;
        if (filterPractice) {
            const term = filterPractice.toLowerCase();
            const matchPractice = r.practiceCode.toLowerCase().includes(term) || r.practiceName.toLowerCase().includes(term);
            const matchDiagnosis = (r.diagnosisCode || '').toLowerCase().includes(term) || (r.diagnosisDescription || '').toLowerCase().includes(term);
            if (!matchPractice && !matchDiagnosis) return false;
        }
        if (filterType && r.expedientType !== filterType) return false;
        return true;
    }).sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'date') return (a.date || '').localeCompare(b.date || '') * dir;
        if (sortField === 'practice') return a.practiceCode.localeCompare(b.practiceCode) * dir;
        if (sortField === 'amount') return (a.coveredAmount - b.coveredAmount) * dir;
        return 0;
    });

    // Resumen
    const summary: HistorySummary = {
        totalRecords: filteredRecords.length,
        totalCovered: filteredRecords.reduce((s, r) => s + r.coveredAmount, 0),
        totalCopay: filteredRecords.reduce((s, r) => s + r.copayAmount, 0),
        totalValue: filteredRecords.reduce((s, r) => s + r.practiceValue * r.quantity, 0),
        uniquePractices: new Set(filteredRecords.map(r => r.practiceId)).size,
        authorized: filteredRecords.filter(r => r.status === 'autorizada' || r.status === 'autorizada_parcial').length,
        denied: filteredRecords.filter(r => r.status === 'denegada').length,
        pending: filteredRecords.filter(r => r.status === 'pendiente' || r.status === 'en_revision').length,
        avgCoverage: filteredRecords.length > 0
            ? filteredRecords.reduce((s, r) => s + r.coveragePercent, 0) / filteredRecords.length
            : 0,
    };

    // Agrupar por práctica para vista resumen
    const practiceGroups = filteredRecords.reduce<Record<number, { code: string; name: string; count: number; totalCovered: number; totalCopay: number; statuses: Record<string, number> }>>((acc, r) => {
        if (!acc[r.practiceId]) {
            acc[r.practiceId] = { code: r.practiceCode, name: r.practiceName, count: 0, totalCovered: 0, totalCopay: 0, statuses: {} };
        }
        acc[r.practiceId].count += r.quantity;
        acc[r.practiceId].totalCovered += r.coveredAmount;
        acc[r.practiceId].totalCopay += r.copayAmount;
        acc[r.practiceId].statuses[r.status] = (acc[r.practiceId].statuses[r.status] || 0) + 1;
        return acc;
    }, {});

    // ═══════════════════════════════════════════
    // ═  EXPORTAR CSV
    // ═══════════════════════════════════════════

    const exportCSV = () => {
        const headers = ['Fecha', 'Código', 'Práctica', 'Cant.', 'Estado', 'Valor', 'Cobertura %', 'Monto Cubierto', 'Coseguro', 'Expediente', 'Tipo', 'Auditor', 'CIE-10', 'Diagnóstico', 'Resuelto'];
        const rows = filteredRecords.map(r => [
            r.date ? new Date(r.date).toLocaleDateString('es-AR') : '',
            r.practiceCode,
            `"${r.practiceName}"`,
            r.quantity,
            r.status,
            r.practiceValue,
            r.coveragePercent.toFixed(1),
            r.coveredAmount,
            r.copayAmount,
            r.expedientNumber,
            r.expedientType,
            `"${r.auditorName}"`,
            r.diagnosisCode,
            `"${r.diagnosisDescription}"`,
            r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString('es-AR') : '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_${affiliate?.document_number || 'aff'}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ═══════════════════════════════════════════
    // ═  ADJUNTOS (LINTERNA AUDITOR)
    // ═══════════════════════════════════════════

    const viewAttachments = async (expedientId: string, expedientNumber: string) => {
        setViewingAttachmentsFor({ expedientId, expedientNumber });
        setLoadingAttachments(true);
        try {
            const { data } = await db('audit_request_attachments')
                .select('*')
                .eq('request_id', expedientId)
                .order('created_at', { ascending: false });
            setAttachments(data || []);
        } catch {
            setAttachments([]);
        }
        setLoadingAttachments(false);
    };

    const closeAttachments = () => {
        setViewingAttachmentsFor(null);
        setAttachments([]);
    };

    // ═══════════════════════════════════════════
    // ═  RENDER
    // ═══════════════════════════════════════════

    const age = affiliate ? calcAge(affiliate.birth_date) : null;
    const hasActiveFilters = filterDateFrom || filterDateTo || filterStatus || filterPractice || filterType;

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-5">

            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <History className="h-5 w-5" /> Historial de Consumos
                    </h1>
                    <p className="text-xs text-muted-foreground">Consulta completa de consumos de afiliados para análisis y auditoría</p>
                </div>
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  BÚSQUEDA DE AFILIADO              ═ */}
            {/* ══════════════════════════════════════ */}
            <div className="space-y-2">
                {!affiliate ? (
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar afiliado por nombre, DNI o nro. de afiliado..."
                            value={affSearch}
                            onChange={e => setAffSearch(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                        {searchingAff && (
                            <p className="text-xs text-muted-foreground mt-1 animate-pulse">Buscando afiliados...</p>
                        )}
                        {affResults.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {affResults.map(a => {
                                    const aAge = calcAge(a.birth_date);
                                    return (
                                        <button
                                            key={String(a.id)}
                                            onClick={() => selectAffiliate(a)}
                                            className="w-full px-3 py-2.5 text-left hover:bg-muted/50 text-sm border-b last:border-0 flex items-center gap-3"
                                        >
                                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold truncate">{a.full_name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    DNI {a.document_number}
                                                    {a.affiliate_number && ` · Nro ${a.affiliate_number}`}
                                                    {aAge !== null && ` · ${aAge} años`}
                                                </div>
                                            </div>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                a.status === 'activo' ? 'bg-green-100 text-green-700' :
                                                a.status === 'suspendido' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>{a.status}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {affSearch.length >= 2 && !searchingAff && affResults.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-1">No se encontraron afiliados</p>
                        )}
                    </div>
                ) : (
                    /* Ficha del afiliado seleccionado */
                    <div className="border rounded-xl overflow-hidden">
                        <div className="bg-primary/5 border-b px-4 py-3 flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-base">{affiliate.full_name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    DNI {affiliate.document_number}
                                    {affiliate.affiliate_number && ` · Afiliado Nro. ${affiliate.affiliate_number}`}
                                    {age !== null && ` · ${age} años`}
                                    {affiliate.gender && ` · ${affiliate.gender === 'M' ? 'Masc.' : affiliate.gender === 'F' ? 'Fem.' : 'Otro'}`}
                                    {` · ${planName}`}
                                    {` · `}
                                    <span className={affiliate.status === 'activo' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                        {affiliate.status}
                                    </span>
                                </p>
                            </div>
                            <button onClick={clearAffiliate} className="text-muted-foreground hover:text-foreground p-1">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  CARGANDO                          ═ */}
            {/* ══════════════════════════════════════ */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Cargando historial completo...</span>
                </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* ═  RESULTADOS                        ═ */}
            {/* ══════════════════════════════════════ */}
            {affiliate && loaded && !loading && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="border rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold">{summary.totalRecords}</p>
                            <p className="text-xs text-muted-foreground">Registros</p>
                        </div>
                        <div className="border rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-700">${summary.totalCovered.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Total cubierto</p>
                        </div>
                        <div className="border rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-orange-600">${summary.totalCopay.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Total coseguro</p>
                        </div>
                        <div className="border rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold">{summary.uniquePractices}</p>
                            <p className="text-xs text-muted-foreground">Prácticas distintas</p>
                        </div>
                    </div>

                    {/* Status summary */}
                    <div className="flex gap-3 flex-wrap text-sm">
                        {summary.authorized > 0 && (
                            <span className="flex items-center gap-1 text-green-700"><CheckCircle className="h-3.5 w-3.5" /> {summary.authorized} autorizadas</span>
                        )}
                        {summary.denied > 0 && (
                            <span className="flex items-center gap-1 text-red-600"><AlertCircle className="h-3.5 w-3.5" /> {summary.denied} denegadas</span>
                        )}
                        {summary.pending > 0 && (
                            <span className="flex items-center gap-1 text-blue-600"><Clock className="h-3.5 w-3.5" /> {summary.pending} pendientes</span>
                        )}
                        {summary.avgCoverage > 0 && (
                            <span className="text-muted-foreground">· Cobertura prom: {summary.avgCoverage.toFixed(1)}%</span>
                        )}
                    </div>

                    {/* Toolbar: filtros + vista + exportar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('detail')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    viewMode === 'detail' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                                }`}
                            >Detalle</button>
                            <button
                                onClick={() => setViewMode('summary')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    viewMode === 'summary' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                                }`}
                            >Resumen x Práctica</button>
                        </div>

                        <button
                            onClick={() => setShowFilters(prev => !prev)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                                showFilters || hasActiveFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Filter className="h-3.5 w-3.5" /> Filtros
                            {hasActiveFilters && <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">!</span>}
                        </button>

                        <div className="flex-1" />

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            Ordenar:
                            <select value={sortField} onChange={e => setSortField(e.target.value as typeof sortField)}
                                className="border rounded px-1.5 py-1 text-xs bg-background">
                                <option value="date">Fecha</option>
                                <option value="practice">Práctica</option>
                                <option value="amount">Monto</option>
                            </select>
                            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                                className="p-1 hover:bg-muted rounded">
                                {sortDir === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                            </button>
                        </div>

                        <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
                            <Download className="h-3.5 w-3.5 mr-1" /> CSV
                        </Button>
                    </div>

                    {/* Filtros expandidos */}
                    {showFilters && (
                        <div className="flex gap-3 items-end flex-wrap bg-muted/20 rounded-lg p-3 border">
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">Desde</label>
                                <DatePicker value={filterDateFrom} onChange={setFilterDateFrom} placeholder="Desde" clearable />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">Hasta</label>
                                <DatePicker value={filterDateTo} onChange={setFilterDateTo} placeholder="Hasta" clearable />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">Estado</label>
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                    className="border rounded px-2 py-1.5 text-xs bg-background">
                                    <option value="">Todos</option>
                                    <option value="autorizada">Autorizada</option>
                                    <option value="autorizada_parcial">Aut. Parcial</option>
                                    <option value="denegada">Denegada</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en_revision">En revisión</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">Buscar (Práctica o CIE-10)</label>
                                <Input value={filterPractice} onChange={e => setFilterPractice(e.target.value)}
                                    placeholder="Palabras clave..." className="h-8 text-xs w-48" />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">Tipo</label>
                                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                    className="border rounded px-2 py-1.5 text-xs bg-background">
                                    <option value="">Todos</option>
                                    <option value="ambulatoria">Ambulatoria</option>
                                    <option value="bioquimica">Bioquímica</option>
                                    <option value="internacion">Internación</option>
                                    <option value="odontologica">Odontológica</option>
                                    <option value="programas_especiales">Prog. Especiales</option>
                                    <option value="elementos">Elementos</option>
                                    <option value="reintegros">Reintegros</option>
                                </select>
                            </div>
                            {hasActiveFilters && (
                                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterStatus(''); setFilterPractice(''); setFilterType(''); }}
                                    className="text-xs text-red-500 hover:text-red-700 pb-1">
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════ */}
                    {/* ═  VISTA DETALLE                     ═ */}
                    {/* ══════════════════════════════════════ */}
                    {viewMode === 'detail' && (
                        <div className="border rounded-lg overflow-hidden">
                            {filteredRecords.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-6 text-center">Sin registros{hasActiveFilters ? ' con los filtros aplicados' : ''}.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/50 text-left">
                                                <th className="px-3 py-2 font-medium">Fecha</th>
                                                <th className="px-3 py-2 font-medium">Práctica</th>
                                                <th className="px-3 py-2 font-medium text-center">Cant.</th>
                                                <th className="px-3 py-2 font-medium">Estado</th>
                                                <th className="px-3 py-2 font-medium text-right">Cob. %</th>
                                                <th className="px-3 py-2 font-medium text-right">Cubierto</th>
                                                <th className="px-3 py-2 font-medium text-right">Coseguro</th>
                                                <th className="px-3 py-2 font-medium">Expediente</th>
                                                <th className="px-3 py-2 font-medium">Tipo</th>
                                                <th className="px-3 py-2 font-medium">Auditor</th>
                                                <th className="px-3 py-2 font-medium">CIE-10</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRecords.map(r => {
                                                const st = STATUS_COLORS[r.status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: r.status };
                                                return (
                                                    <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                                                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                                            {r.date ? new Date(r.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className="font-mono font-medium">{r.practiceCode}</span>
                                                            <span className="ml-1 text-muted-foreground">{r.practiceName}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">{r.quantity}</td>
                                                        <td className="px-3 py-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${st.bg} ${st.text}`}>
                                                                {st.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-mono">{r.coveragePercent > 0 ? `${r.coveragePercent.toFixed(0)}%` : '-'}</td>
                                                        <td className="px-3 py-2 text-right font-mono text-green-700">{r.coveredAmount > 0 ? `$${r.coveredAmount.toLocaleString()}` : '-'}</td>
                                                        <td className="px-3 py-2 text-right font-mono text-orange-600">{r.copayAmount > 0 ? `$${r.copayAmount.toLocaleString()}` : '-'}</td>
                                                        <td className="px-3 py-2 font-mono text-muted-foreground">
                                                            <div className="flex items-center gap-2">
                                                                {r.expedientNumber || '-'}
                                                                {r.expedientNumber && (
                                                                    <button
                                                                        onClick={() => viewAttachments(r.expedientId, r.expedientNumber)}
                                                                        className="p-1 hover:bg-muted rounded text-blue-600 dark:text-blue-400"
                                                                        title="Ver documentos adjuntos de este expediente"
                                                                    >
                                                                        <Paperclip className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-muted-foreground capitalize">{r.expedientType || '-'}</td>
                                                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{r.auditorName || '-'}</td>
                                                        <td className="px-3 py-2 font-mono text-muted-foreground">{r.diagnosisCode || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════ */}
                    {/* ═  VISTA RESUMEN POR PRÁCTICA        ═ */}
                    {/* ══════════════════════════════════════ */}
                    {viewMode === 'summary' && (
                        <div className="border rounded-lg overflow-hidden">
                            {Object.keys(practiceGroups).length === 0 ? (
                                <p className="text-sm text-muted-foreground p-6 text-center">Sin registros.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/50 text-left">
                                                <th className="px-3 py-2 font-medium">Código</th>
                                                <th className="px-3 py-2 font-medium">Práctica</th>
                                                <th className="px-3 py-2 font-medium text-center">Total usos</th>
                                                <th className="px-3 py-2 font-medium text-right">Total cubierto</th>
                                                <th className="px-3 py-2 font-medium text-right">Total coseguro</th>
                                                <th className="px-3 py-2 font-medium">Distribución estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.values(practiceGroups)
                                                .sort((a, b) => b.count - a.count)
                                                .map(g => (
                                                    <tr key={g.code} className="border-t hover:bg-muted/30 transition-colors">
                                                        <td className="px-3 py-2 font-mono font-medium">{g.code}</td>
                                                        <td className="px-3 py-2">{g.name}</td>
                                                        <td className="px-3 py-2 text-center font-semibold">{g.count}</td>
                                                        <td className="px-3 py-2 text-right font-mono text-green-700">${g.totalCovered.toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-right font-mono text-orange-600">${g.totalCopay.toLocaleString()}</td>
                                                        <td className="px-3 py-2">
                                                            <div className="flex gap-1 flex-wrap">
                                                                {Object.entries(g.statuses).map(([status, count]) => {
                                                                    const st = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                                                                    return (
                                                                        <span key={status} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${st.bg} ${st.text}`}>
                                                                            {count}× {status.replace(/_/g, ' ')}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center text-xs text-muted-foreground py-2 border-t">
                        Mostrando {filteredRecords.length} de {records.length} registros
                        {hasActiveFilters && ' (filtrados)'}
                        {' · '}Datos fuente: expedientes digitales
                    </div>
                </>
            )}

            {/* Estado vacío */}
            {!affiliate && (
                <div className="text-center py-16 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Historial de Consumos</p>
                    <p className="text-sm mt-1">Buscá un afiliado para ver su historial completo de consumos</p>
                    <p className="text-xs mt-3 max-w-md mx-auto">
                        Este módulo muestra todos los consumos registrados con fechas, estados, montos cubiertos,
                        coseguros, auditores y diagnósticos — ideal para análisis y auditoría con IA.
                    </p>
                </div>
            )}

            {/* Modal de Adjuntos (Linterna Auditor) */}
            {viewingAttachmentsFor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-xl p-5 w-full max-w-2xl shadow-xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Paperclip className="h-5 w-5 text-blue-600" />
                                Adjuntos del Expediente: <span className="text-muted-foreground">#{viewingAttachmentsFor.expedientNumber}</span>
                            </h3>
                            <button onClick={closeAttachments} className="p-1 hover:bg-muted rounded transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-1">
                            {loadingAttachments ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                                    <span className="text-sm text-muted-foreground">Cargando adjuntos...</span>
                                </div>
                            ) : attachments.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-medium">Sin adjuntos</p>
                                    <p className="text-xs">No se encontraron archivos en este expediente.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {attachments.map(att => (
                                        <div key={att.id} className="border rounded-lg overflow-hidden group bg-card flex flex-col">
                                            <div className="p-3 bg-muted/40 border-b flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold truncate" title={att.file_name}>{att.file_name}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{att.file_type || 'Archivo'}</p>
                                                </div>
                                            </div>
                                            <div className="p-3 flex items-center justify-center flex-1 bg-muted/10">
                                                {att.file_type?.toLowerCase().includes('pdf') ? (
                                                    <div className="text-center">
                                                        <FileText className="h-8 w-8 mx-auto text-red-500 mb-2 opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Abrir PDF en pestaña</a>
                                                    </div>
                                                ) : att.file_type?.toLowerCase().includes('image') ? (
                                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="block w-full text-center">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={att.file_url} alt={att.file_name} className="max-h-32 mx-auto object-contain rounded border bg-background" />
                                                        <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">Ampliar imagen</span>
                                                    </a>
                                                ) : (
                                                    <div className="text-center">
                                                        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                                                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Descargar archivo</a>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between">
                                                <span className="truncate">Por: {att.attached_by_name || 'Sistema'}</span>
                                                <span className="shrink-0">{new Date(att.created_at).toLocaleDateString('es-AR')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
