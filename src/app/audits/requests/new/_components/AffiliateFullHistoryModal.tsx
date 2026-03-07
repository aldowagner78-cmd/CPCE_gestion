'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Clock, ChevronUp, ChevronDown, Download, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Input } from '@/components/ui/input';

const supabase = createClient();

// ── Types ──────────────────────────────────────────────────────────────────

type RowType = 'auth' | 'reimbursement' | 'reposition';

const NOMENCLATOR_ABBR: Record<string, string> = {
    medico: 'MED', bioquimico: 'BIO', odontologico: 'ODO', farmacia: 'FAR',
};

const NOMENCLATOR_COLORS: Record<string, string> = {
    MED: 'bg-blue-100 text-blue-700',
    BIO: 'bg-emerald-100 text-emerald-700',
    ODO: 'bg-pink-100 text-pink-700',
    FAR: 'bg-amber-100 text-amber-700',
    'N/N': 'bg-slate-100 text-slate-600',
};

const STATUS_COLORS: Record<string, string> = {
    autorizada: 'bg-green-100 text-green-700',
    autorizada_parcial: 'bg-yellow-100 text-yellow-700',
    denegada: 'bg-red-100 text-red-700',
    rechazada: 'bg-red-100 text-red-700',
    pendiente: 'bg-blue-100 text-blue-700',
    en_revision: 'bg-purple-100 text-purple-700',
    aprobada: 'bg-green-100 text-green-700',
    aprobado: 'bg-green-100 text-green-700',
    pagada: 'bg-teal-100 text-teal-700',
    pagado: 'bg-teal-100 text-teal-700',
    anulado: 'bg-gray-100 text-gray-500',
    anulada: 'bg-gray-100 text-gray-500',
};

interface HistoryRow {
    id: string;
    type: RowType;
    typeLabel: string;
    nomenclatorAbbr: string;
    practiceName: string;
    practiceCode: string;
    date: string;
    reference: string;
    status: string;
    totalValue: number;
    coseguro: number;
}

type SortField = 'date' | 'practiceName' | 'totalValue' | 'status' | 'type';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

const RANGE_OPTIONS = [
    { label: '3 meses', months: 3 },
    { label: '6 meses', months: 6 },
    { label: '12 meses', months: 12 },
    { label: '24 meses', months: 24 },
];

type TypeFilter = 'all' | RowType;
const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'auth', label: 'Autorizaciones' },
    { key: 'reimbursement', label: 'Reintegros' },
    { key: 'reposition', label: 'Reposiciones' },
];

export interface AffiliateFullHistoryModalProps {
    affiliateId: string | null;
    affiliateName: string;
    affiliateNumber?: string;
    planName?: string;
    onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function AffiliateFullHistoryModal({
    affiliateId,
    affiliateName,
    affiliateNumber,
    planName,
    onClose,
}: AffiliateFullHistoryModalProps) {
    const [loading, setLoading] = useState(false);
    const [allRows, setAllRows] = useState<HistoryRow[]>([]);

    // Filters
    const [months, setMonths] = useState(12);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [nomenclatorFilter, setNomenclatorFilter] = useState<string>('all');
    const [practiceQuery, setPracticeQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [amountFrom, setAmountFrom] = useState('');
    const [amountTo, setAmountTo] = useState('');

    // Sort + pagination
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const computeDateRange = useCallback(() => {
        if (dateFrom) return { from: dateFrom, to: dateTo || new Date().toISOString().split('T')[0] };
        const from = new Date();
        from.setMonth(from.getMonth() - months);
        return { from: from.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] };
    }, [dateFrom, dateTo, months]);

    const loadData = useCallback(async () => {
        if (!affiliateId) return;
        setLoading(true);
        const { from, to } = computeDateRange();

        try {
            // ── Autorizaciones (expedient_practices) ──
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: exps } = await (supabase as any)
                .from('expedients')
                .select('id, expedient_number, status, created_at')
                .eq('affiliate_id', affiliateId)
                .gte('created_at', from)
                .lte('created_at', to + 'T23:59:59');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const expList = (exps || []) as any[];
            const expIds = expList.map((e: { id: string }) => e.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const expMap = new Map(expList.map((e: any) => [e.id, e]));

            let authRows: HistoryRow[] = [];
            if (expIds.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: eps } = await (supabase as any)
                    .from('expedient_practices')
                    .select('id, expedient_id, practice_id, quantity, status, covered_amount, copay_amount, created_at')
                    .in('expedient_id', expIds);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const practiceIds = [...new Set(((eps || []) as any[]).map((ep: any) => ep.practice_id).filter(Boolean))];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let practiceMap = new Map<number, any>();
                if (practiceIds.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data: pracs } = await (supabase as any)
                        .from('practices')
                        .select('id, code, description, nomenclator_type')
                        .in('id', practiceIds);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    practiceMap = new Map(((pracs || []) as any[]).map((p: any) => [p.id, p]));
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                authRows = ((eps || []) as any[]).map((ep: any) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const exp = expMap.get(ep.expedient_id) as any;
                    const prac = practiceMap.get(ep.practice_id) || {};
                    const abbr = NOMENCLATOR_ABBR[prac.nomenclator_type ?? ''] ?? 'N/N';
                    return {
                        id: 'auth-' + ep.id,
                        type: 'auth' as RowType,
                        typeLabel: 'Aut.',
                        nomenclatorAbbr: abbr,
                        practiceName: prac.description || 'Práctica',
                        practiceCode: prac.code || '',
                        date: ep.created_at || exp?.created_at || '',
                        reference: exp?.expedient_number || '',
                        status: ep.status || exp?.status || 'pendiente',
                        totalValue: (ep.covered_amount || 0) + (ep.copay_amount || 0),
                        coseguro: ep.copay_amount || 0,
                    } as HistoryRow;
                });
            }

            // ── Reposiciones ──
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: repos } = await (supabase as any)
                .from('repositions')
                .select('id, request_date, status, quantity, total_amount, material_description, material_code, practice_id')
                .eq('affiliate_id', affiliateId)
                .gte('request_date', from)
                .lte('request_date', to);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const repoRows: HistoryRow[] = ((repos || []) as any[]).map((r: any) => ({
                id: 'repo-' + r.id,
                type: 'reposition' as RowType,
                typeLabel: 'Repo.',
                nomenclatorAbbr: 'N/N',
                practiceName: r.material_description || 'Material quirúrgico',
                practiceCode: r.material_code || '',
                date: r.request_date || '',
                reference: String(r.id).slice(0, 8).toUpperCase(),
                status: r.status || 'pendiente',
                totalValue: r.total_amount || 0,
                coseguro: 0,
            }));

            // ── Reintegros ──
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: reims } = await (supabase as any)
                .from('reimbursements')
                .select('id, request_date, status, total_amount, type, created_at')
                .eq('affiliate_id', affiliateId)
                .gte('created_at', from)
                .lte('created_at', to + 'T23:59:59');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reimRows: HistoryRow[] = ((reims || []) as any[]).map((r: any) => ({
                id: 'reim-' + r.id,
                type: 'reimbursement' as RowType,
                typeLabel: 'Rein.',
                nomenclatorAbbr: 'N/N',
                practiceName: r.type ? ('Reintegro - ' + r.type) : 'Reintegro',
                practiceCode: '',
                date: r.request_date || r.created_at || '',
                reference: String(r.id),
                status: r.status || 'pendiente',
                totalValue: r.total_amount || 0,
                coseguro: 0,
            }));

            setAllRows([...authRows, ...repoRows, ...reimRows]);
        } catch {
            setAllRows([]);
        }
        setLoading(false);
    }, [affiliateId, computeDateRange]);

    useEffect(() => {
        if (!affiliateId) return;
        setTimeout(loadData, 0);
    }, [affiliateId, loadData]);

    // ── Debounced re-fetch when range changes ──
    useEffect(() => {
        if (!affiliateId) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(loadData, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [months, dateFrom, dateTo, affiliateId, loadData]);

    // ── Unique statuses for filter dropdown ──
    const uniqueStatuses = [...new Set(allRows.map(r => r.status))].sort();

    // ── Client-side filtering ──
    const filtered = allRows.filter(r => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (nomenclatorFilter !== 'all' && r.nomenclatorAbbr !== nomenclatorFilter) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (practiceQuery) {
            const q = practiceQuery.toLowerCase();
            if (!r.practiceName.toLowerCase().includes(q) && !r.practiceCode.toLowerCase().includes(q)) return false;
        }
        if (amountFrom && r.totalValue < parseFloat(amountFrom)) return false;
        if (amountTo && r.totalValue > parseFloat(amountTo)) return false;
        return true;
    });

    // ── Sort ──
    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '');
        else if (sortField === 'practiceName') cmp = a.practiceName.localeCompare(b.practiceName);
        else if (sortField === 'totalValue') cmp = a.totalValue - b.totalValue;
        else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
        else if (sortField === 'type') cmp = a.typeLabel.localeCompare(b.typeLabel);
        return sortDir === 'asc' ? cmp : -cmp;
    });

    // ── Pagination ──
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // ── Subtotals ──
    const subtotalValue = filtered.reduce((s, r) => s + r.totalValue, 0);
    const subtotalCos = filtered.reduce((s, r) => s + r.coseguro, 0);

    function toggleSort(field: SortField) {
        if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('desc'); }
        setPage(1);
    }

    function clearFilters() {
        setNomenclatorFilter('all');
        setPracticeQuery('');
        setTypeFilter('all');
        setStatusFilter('all');
        setAmountFrom('');
        setAmountTo('');
        setDateFrom('');
        setDateTo('');
        setMonths(12);
        setPage(1);
    }

    function exportCSV() {
        const headers = ['Tipo', 'N.', 'Código', 'Práctica', 'Fecha', 'Referencia', 'Estado', 'Valor', 'Coseguro'];
        const rows = sorted.map(r => [
            r.typeLabel, r.nomenclatorAbbr, r.practiceCode,
            `"${r.practiceName.replace(/"/g, '""')}"`,
            r.date ? new Date(r.date).toLocaleDateString('es-AR') : '',
            r.reference, r.status,
            r.totalValue.toFixed(2), r.coseguro.toFixed(2),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_${affiliateName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (!affiliateId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
            <div className="bg-background rounded-xl w-full max-w-5xl shadow-2xl flex flex-col" style={{ maxHeight: '95vh' }}>

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b">
                    <div className="min-w-0">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                            <span className="truncate">Historial completo: {affiliateName}</span>
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {affiliateNumber && `Nº ${affiliateNumber}`}
                            {planName && ` · ${planName}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            title="Exportar CSV"
                        >
                            <Download className="h-3.5 w-3.5" />
                            CSV
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* ── Filters ── */}
                <div className="px-5 py-3 border-b bg-muted/20 space-y-2">
                    {/* Row 1: range + tipo + nomenclador + estado */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Período:</span>
                        {RANGE_OPTIONS.map(opt => (
                            <button
                                key={opt.months}
                                onClick={() => { setMonths(opt.months); setDateFrom(''); setDateTo(''); setPage(1); }}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    months === opt.months && !dateFrom
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                                        : 'border-muted-foreground/30 text-muted-foreground hover:border-blue-400'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-7 w-32 text-xs" placeholder="Desde" />
                        <span className="text-xs text-muted-foreground">—</span>
                        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-7 w-32 text-xs" placeholder="Hasta" />
                    </div>

                    {/* Row 2: tipo + nomenclador + estado + montos */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={typeFilter}
                            onChange={e => { setTypeFilter(e.target.value as TypeFilter); setPage(1); }}
                            className="h-7 text-xs border rounded-md px-2 bg-background"
                        >
                            {TYPE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>
                        <select
                            value={nomenclatorFilter}
                            onChange={e => { setNomenclatorFilter(e.target.value); setPage(1); }}
                            className="h-7 text-xs border rounded-md px-2 bg-background"
                        >
                            <option value="all">Todos (N.)</option>
                            {['MED', 'BIO', 'ODO', 'FAR', 'N/N'].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="h-7 text-xs border rounded-md px-2 bg-background"
                        >
                            <option value="all">Todos (Estado)</option>
                            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Input
                            placeholder="Buscar práctica..."
                            value={practiceQuery}
                            onChange={e => { setPracticeQuery(e.target.value); setPage(1); }}
                            className="h-7 text-xs w-40"
                        />
                        <span className="text-xs text-muted-foreground">$</span>
                        <Input placeholder="Desde" type="number" value={amountFrom} onChange={e => { setAmountFrom(e.target.value); setPage(1); }} className="h-7 text-xs w-20" />
                        <span className="text-xs text-muted-foreground">—</span>
                        <Input placeholder="Hasta" type="number" value={amountTo} onChange={e => { setAmountTo(e.target.value); setPage(1); }} className="h-7 text-xs w-20" />
                        <button
                            onClick={clearFilters}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Cargando historial...</span>
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                            <FileText className="h-12 w-12 opacity-25" />
                            <p className="text-sm">Sin registros para los filtros seleccionados</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 bg-muted/50 z-10">
                                <tr className="border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                    <SortTh field="type" active={sortField} dir={sortDir} onSort={toggleSort}>Tipo</SortTh>
                                    <th className="px-3 py-2 text-left">N.</th>
                                    <th className="px-3 py-2 text-left">Código</th>
                                    <SortTh field="practiceName" active={sortField} dir={sortDir} onSort={toggleSort}>Práctica</SortTh>
                                    <SortTh field="date" active={sortField} dir={sortDir} onSort={toggleSort}>Fecha</SortTh>
                                    <th className="px-3 py-2 text-left">Referencia</th>
                                    <SortTh field="status" active={sortField} dir={sortDir} onSort={toggleSort}>Estado</SortTh>
                                    <SortTh field="totalValue" active={sortField} dir={sortDir} onSort={toggleSort}>Valor</SortTh>
                                    <th className="px-3 py-2 text-right">Coseg.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(r => (
                                    <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                                        <td className="px-3 py-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                r.type === 'auth' ? 'bg-blue-50 text-blue-700' :
                                                r.type === 'reimbursement' ? 'bg-orange-50 text-orange-700' :
                                                'bg-purple-50 text-purple-700'
                                            }`}>{r.typeLabel}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${NOMENCLATOR_COLORS[r.nomenclatorAbbr] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {r.nomenclatorAbbr}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs">{r.practiceCode || '—'}</td>
                                        <td className="px-3 py-2 max-w-[200px] truncate text-xs" title={r.practiceName}>{r.practiceName}</td>
                                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                                            {r.date ? new Date(r.date).toLocaleDateString('es-AR') : '—'}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.reference || '—'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                                            ${r.totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-xs text-orange-600">
                                            {r.coseguro > 0 ? `$${r.coseguro.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Footer: subtotals + pagination ── */}
                {!loading && sorted.length > 0 && (
                    <div className="px-5 py-3 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                        {/* Subtotals */}
                        <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                                {filtered.length} registro(s) filtrado(s) de {allRows.length}
                            </span>
                            <span className="font-semibold">
                                Total: <span className="text-foreground">${subtotalValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </span>
                            {subtotalCos > 0 && (
                                <span className="text-orange-600 font-semibold">
                                    Coseg.: ${subtotalCos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1 text-xs">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-muted transition-colors"
                                >
                                    ‹
                                </button>
                                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                    const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-7 h-7 rounded border text-center transition-colors ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-muted transition-colors"
                                >
                                    ›
                                </button>
                                <span className="ml-1 text-muted-foreground">Pág. {page}/{totalPages}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── SortTh helper ──────────────────────────────────────────────────────────

function SortTh({ field, active, dir, onSort, children }: {
    field: SortField;
    active: SortField;
    dir: SortDir;
    onSort: (f: SortField) => void;
    children: React.ReactNode;
}) {
    const isActive = active === field;
    return (
        <th
            className="px-3 py-2 text-left cursor-pointer hover:text-foreground select-none whitespace-nowrap"
            onClick={() => onSort(field)}
        >
            <span className="flex items-center gap-0.5">
                {children}
                {isActive
                    ? dir === 'desc'
                        ? <ChevronDown className="h-3 w-3 text-blue-600" />
                        : <ChevronUp className="h-3 w-3 text-blue-600" />
                    : <ChevronDown className="h-3 w-3 opacity-30" />}
            </span>
        </th>
    );
}
