'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { ExpedientService } from '@/services/expedientService';
import {
    Search,
    FileText,
    ArrowLeft,
    Plus,
    Loader2,
    Download,
} from 'lucide-react';
import Link from 'next/link';
import type {
    Expedient,
    ExpedientType,
    ExpedientStatus,
} from '@/types/database';

import { TYPE_CONFIG, STATUS_CONFIG } from './_components/configUI';
import { ExpedientList } from './_components/ExpedientList';
import { ExpedientDetail } from './_components/ExpedientDetail';
import { GuidedTour } from '@/components/GuidedTour';

export default function AuditRequestsPage() {
    const { activeJurisdiction } = useJurisdiction();
    const { user } = useAuth();
    const [expedients, setExpedients] = useState<Expedient[]>([]);
    const [selectedExpedient, setSelectedExpedient] = useState<Expedient | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<ExpedientType | 'todas'>('todas');
    const [filterStatus, setFilterStatus] = useState<ExpedientStatus | 'todas'>('todas');
    const [filterPeriod, setFilterPeriod] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [counts, setCounts] = useState<Record<ExpedientStatus, number>>({
        borrador: 0,
        pendiente: 0,
        en_revision: 0,
        parcialmente_resuelto: 0,
        resuelto: 0,
        observada: 0,
        en_apelacion: 0,
        anulada: 0,
    });

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!activeJurisdiction) return;
            setLoading(true);
            try {
                let result: Expedient[];

                if (filterStatus === 'todas') {
                    // Mostrar todos los estados (pendientes + resueltos)
                    const { data } = await ExpedientService.fetchAll({
                        jurisdiction_id: activeJurisdiction.id,
                        type: filterType !== 'todas' ? filterType : undefined,
                        limit: 100,
                    });
                    result = data;
                } else {
                    const { data } = await ExpedientService.fetchAll({
                        jurisdiction_id: activeJurisdiction.id,
                        type: filterType !== 'todas' ? filterType : undefined,
                        status: filterStatus,
                        limit: 100,
                    });
                    result = data;
                }

                if (!cancelled) setExpedients(result);

                const c = await ExpedientService.getCounts(activeJurisdiction.id);
                if (!cancelled) setCounts(c);
            } catch {
                // Handle error
            }
            if (!cancelled) setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [activeJurisdiction, filterType, filterStatus, reloadKey]);

    const handleAction = useCallback(() => {
        setSelectedExpedient(null);
        setReloadKey(k => k + 1);
    }, []);

    const filtered = expedients.filter(e => {
        if (search) {
            const q = search.toLowerCase();
            const matchSearch = (
                e.expedient_number?.toLowerCase().includes(q) ||
                String(e.affiliate_id).toLowerCase().includes(q) ||
                e.request_notes?.toLowerCase().includes(q) ||
                e.affiliate?.full_name?.toLowerCase().includes(q) ||
                e.affiliate?.document_number?.toLowerCase().includes(q)
            );
            if (!matchSearch) return false;
        }
        if (filterPeriod) {
            const created = e.created_at?.slice(0, 7); // "YYYY-MM"
            if (created !== filterPeriod) return false;
        }
        return true;
    });

    const handleExportCSV = () => {
        const rows = [
            ['Número', 'Tipo', 'Estado', 'Afiliado', 'DNI', 'Prestador', 'Fecha', 'Prácticas', 'Resuelto por'],
            ...filtered.map(e => [
                e.expedient_number ?? '',
                e.type,
                e.status,
                e.affiliate?.full_name ?? String(e.affiliate_id),
                e.affiliate?.document_number ?? '',
                e.provider_name ?? '',
                e.created_at?.slice(0, 10) ?? '',
                String(e.practices?.length ?? 0),
                e.resolver?.full_name ?? '',
            ]),
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expedientes_${filterPeriod || new Date().toISOString().slice(0, 7)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const pendingTotal = counts.pendiente + counts.en_revision + counts.observada + counts.parcialmente_resuelto;

    const statusTabs: Array<{ key: ExpedientStatus | 'todas'; label: string; count: number; color: string }> = [
        { key: 'todas', label: 'Todas', count: pendingTotal + counts.resuelto + counts.en_apelacion + counts.anulada, color: 'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700' },
        { key: 'pendiente', label: 'Pendientes', count: counts.pendiente, color: 'bg-yellow-100 text-yellow-800 ring-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-700' },
        { key: 'en_revision', label: 'En Revisión', count: counts.en_revision, color: 'bg-blue-100 text-blue-800 ring-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-700' },
        { key: 'parcialmente_resuelto', label: 'Parciales', count: counts.parcialmente_resuelto, color: 'bg-indigo-100 text-indigo-800 ring-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:ring-indigo-700' },
        { key: 'resuelto', label: 'Resueltos', count: counts.resuelto, color: 'bg-green-100 text-green-800 ring-green-300 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-700' },
        { key: 'observada', label: 'Observadas', count: counts.observada, color: 'bg-orange-100 text-orange-800 ring-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-700' },
        { key: 'en_apelacion', label: 'Apelaciones', count: counts.en_apelacion, color: 'bg-red-100 text-red-700 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700' },
        { key: 'anulada', label: 'Anuladas', count: counts.anulada, color: 'bg-gray-100 text-gray-600 ring-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700' },
    ];

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            <GuidedTour tourId="review" />
            {/* Header */}
            <div className="p-4 border-b bg-background">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Link href="/audits">
                            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Solicitudes de Auditoría</h1>
                            <p className="text-sm text-muted-foreground">
                                {pendingTotal} pendiente{pendingTotal !== 1 ? 's' : ''} de resolución
                                {user && <span className="ml-1">• {user.full_name}</span>}
                            </p>
                        </div>
                    </div>
                    <Link href="/audits/requests/new">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm font-semibold">
                            <Plus className="h-4 w-4 mr-1" />
                            Nueva Solicitud
                        </Button>
                    </Link>
                </div>

                {/* Contadores de estado */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1" data-tour="status-tabs">
                    {statusTabs.map(st => (
                        <button
                            key={st.key}
                            onClick={() => setFilterStatus(st.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${filterStatus === st.key ? `${st.color} ring-1 shadow-sm` : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            {st.label} ({st.count})
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por número, afiliado, DNI..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as ExpedientType | 'todas')}
                        className="border rounded-lg px-3 py-1 text-sm bg-background h-9 cursor-pointer"
                    >
                        <option value="todas">Todos los tipos</option>
                        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>
                    <input
                        type="month"
                        value={filterPeriod}
                        onChange={e => setFilterPeriod(e.target.value)}
                        className="border rounded-lg px-3 py-1 text-sm bg-background h-9 cursor-pointer"
                        title="Filtrar por período"
                    />
                    {filterPeriod && (
                        <button
                            onClick={() => setFilterPeriod('')}
                            className="text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2 h-9"
                            title="Limpiar filtro de período"
                        >✕</button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        disabled={filtered.length === 0}
                        className="h-9 gap-1.5"
                        title="Exportar lista filtrada a CSV"
                    >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                    </Button>
                </div>
            </div>

            {/* Body: Split list + detail */}
            <div className="flex-1 flex overflow-hidden">
                {/* Lista */}
                <div data-tour="expedient-list" className={`${selectedExpedient ? 'w-2/5 border-r hidden md:block' : 'w-full'} overflow-y-auto`}>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-30" />
                            <p className="text-sm">Cargando solicitudes...</p>
                        </div>
                    ) : (
                        <ExpedientList
                            expedients={filtered}
                            onSelect={setSelectedExpedient}
                            selectedId={selectedExpedient?.id}
                        />
                    )}
                </div>

                {/* Detalle */}
                {selectedExpedient && (
                    <div data-tour="expedient-detail" className="flex-1 overflow-hidden md:block">
                        <ExpedientDetail
                            expedient={selectedExpedient}
                            onAction={handleAction}
                            onBack={() => setSelectedExpedient(null)}
                        />
                    </div>
                )}

                {/* Empty state */}
                {!selectedExpedient && (
                    <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <FileText className="h-16 w-16 mx-auto mb-3 opacity-20" />
                            <p className="text-lg">Seleccione una solicitud</p>
                            <p className="text-sm">para ver el detalle y resolver prácticas</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
