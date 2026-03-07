'use client';

import { useEffect, useState } from 'react';
import { X, Clock, Loader2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

type RangeMonths = 3 | 6 | 12 | 24;
type TabKey = 'autorizaciones' | 'reintegros' | 'reposiciones';

interface AuthRecord {
    id: string;
    date: string;
    expedientNumber: string;
    status: string;
    coveredAmount: number;
    copayAmount: number;
    quantity: number;
}

interface RepoRecord {
    id: string;
    requestDate: string;
    status: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    diagnosisCode: string | null;
    surgeonName: string | null;
}

interface ReimbRecord {
    id: string;
    requestDate: string | null;
    status: string;
    totalAmount: number;
    type: string | null;
}

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

export interface ConsumptionHistoryModalProps {
    practiceId: number | null;
    practiceName: string;
    affiliateId: string | null;
    onClose: () => void;
}

export function ConsumptionHistoryModal({
    practiceId,
    practiceName,
    affiliateId,
    onClose,
}: ConsumptionHistoryModalProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('autorizaciones');
    const [months, setMonths] = useState<RangeMonths>(12);
    const [loading, setLoading] = useState(false);
    const [authItems, setAuthItems] = useState<AuthRecord[]>([]);
    const [reposItems, setReposItems] = useState<RepoRecord[]>([]);
    const [reimItems, setReimItems] = useState<ReimbRecord[]>([]);

    useEffect(() => {
        if (!practiceId || !affiliateId) return;
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [practiceId, affiliateId, months]);

    async function loadData() {
        setLoading(true);
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - months);
        const fromStr = fromDate.toISOString().split('T')[0];

        try {
            // ── Autorizaciones ──
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: exps } = await (supabase as any)
                .from('expedients')
                .select('id, expedient_number, status, created_at')
                .eq('affiliate_id', affiliateId)
                .gte('created_at', fromStr);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const expList = (exps || []) as any[];
            const expIds = expList.map((e: { id: string }) => e.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const expMap = new Map(expList.map((e: any) => [e.id, e]));

            let authData: AuthRecord[] = [];
            if (expIds.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: eps } = await (supabase as any)
                    .from('expedient_practices')
                    .select('id, expedient_id, quantity, status, covered_amount, copay_amount, created_at')
                    .in('expedient_id', expIds)
                    .eq('practice_id', practiceId);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                authData = ((eps || []) as any[]).map((ep: any) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const exp = expMap.get(ep.expedient_id) as any;
                    return {
                        id: ep.id,
                        date: ep.created_at || exp?.created_at || '',
                        expedientNumber: exp?.expedient_number || '',
                        status: ep.status || exp?.status || 'pendiente',
                        coveredAmount: ep.covered_amount || 0,
                        copayAmount: ep.copay_amount || 0,
                        quantity: ep.quantity || 1,
                    } as AuthRecord;
                });
            }
            setAuthItems(authData.sort((a, b) => b.date.localeCompare(a.date)));

            // ── Reposiciones ──
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: repos } = await (supabase as any)
                .from('repositions')
                .select('id, request_date, status, quantity, unit_price, total_amount, diagnosis_code, surgeon_name')
                .eq('affiliate_id', affiliateId)
                .eq('practice_id', practiceId)
                .gte('request_date', fromStr);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setReposItems(((repos || []) as any[]).map((r: any) => ({
                id: r.id,
                requestDate: r.request_date || '',
                status: r.status || 'pendiente',
                quantity: r.quantity || 1,
                unitPrice: r.unit_price || 0,
                totalAmount: r.total_amount || 0,
                diagnosisCode: r.diagnosis_code || null,
                surgeonName: r.surgeon_name || null,
            })));

            // ── Reintegros (sin FK a práctica específica) ──
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: reims } = await (supabase as any)
                .from('reimbursements')
                .select('id, request_date, status, total_amount, type')
                .eq('affiliate_id', affiliateId)
                .gte('created_at', fromStr);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setReimItems(((reims || []) as any[]).map((r: any) => ({
                id: String(r.id),
                requestDate: r.request_date || null,
                status: r.status || 'pendiente',
                totalAmount: r.total_amount || 0,
                type: r.type || null,
            })));
        } catch {
            // silent — no mostrar error al usuario
        }

        setLoading(false);
    }

    if (!practiceId) return null;

    const tabs = [
        { key: 'autorizaciones' as TabKey, label: 'Autorizaciones', count: authItems.length },
        { key: 'reintegros' as TabKey, label: 'Reintegros', count: reimItems.length },
        { key: 'reposiciones' as TabKey, label: 'Reposiciones', count: reposItems.length },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl w-full max-w-4xl shadow-xl flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2 min-w-0">
                        <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                        <span>Historial:&nbsp;</span>
                        <span className="text-muted-foreground font-normal text-base truncate">{practiceName}</span>
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors shrink-0 ml-2">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs + rango */}
                <div className="px-5 pt-3 flex items-center justify-between gap-4 border-b">
                    <div className="flex gap-0">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                                    activeTab === t.key
                                        ? 'border-blue-600 text-blue-700'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t.label}
                                {t.count > 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 pb-2">
                        <span className="text-xs text-muted-foreground mr-1">Últimos:</span>
                        {([3, 6, 12, 24] as RangeMonths[]).map(m => (
                            <button
                                key={m}
                                onClick={() => setMonths(m)}
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                    months === m
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                                        : 'border-muted-foreground/30 text-muted-foreground hover:border-blue-400'
                                }`}
                            >
                                {m}m
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Cargando historial...</span>
                        </div>

                    ) : activeTab === 'autorizaciones' ? (
                        authItems.length === 0 ? (
                            <EmptyState message={`Sin autorizaciones en los últimos ${months} meses`} />
                        ) : (
                            <div>
                                <div className="grid grid-cols-[1fr_4rem_5.5rem_5.5rem_6.5rem] gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b mb-1">
                                    <span>Expediente / Fecha</span>
                                    <span className="text-center">Cant.</span>
                                    <span className="text-right">Cubierto</span>
                                    <span className="text-right">Coseg.</span>
                                    <span className="text-center">Estado</span>
                                </div>
                                {authItems.map(a => (
                                    <div key={a.id} className="grid grid-cols-[1fr_4rem_5.5rem_5.5rem_6.5rem] gap-2 items-center px-2 py-2 border-b last:border-0 hover:bg-muted/30 rounded text-sm">
                                        <div>
                                            <div className="font-mono font-semibold text-xs">{a.expedientNumber || '—'}</div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {a.date ? new Date(a.date).toLocaleDateString('es-AR') : '—'}
                                            </div>
                                        </div>
                                        <div className="text-center font-mono text-sm">×{a.quantity}</div>
                                        <div className="text-right font-mono text-xs">${a.coveredAmount.toLocaleString('es-AR')}</div>
                                        <div className="text-right font-mono text-xs text-orange-600">${a.copayAmount.toLocaleString('es-AR')}</div>
                                        <div className="flex justify-center">
                                            <StatusBadge status={a.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )

                    ) : activeTab === 'reposiciones' ? (
                        reposItems.length === 0 ? (
                            <EmptyState message={`Sin reposiciones en los últimos ${months} meses`} />
                        ) : (
                            <div>
                                <div className="grid grid-cols-[1fr_4rem_5.5rem_5.5rem_6.5rem] gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b mb-1">
                                    <span>Diagnóstico / Cirujano</span>
                                    <span className="text-center">Cant.</span>
                                    <span className="text-right">P. Unit.</span>
                                    <span className="text-right">Total</span>
                                    <span className="text-center">Estado</span>
                                </div>
                                {reposItems.map(r => (
                                    <div key={r.id} className="grid grid-cols-[1fr_4rem_5.5rem_5.5rem_6.5rem] gap-2 items-center px-2 py-2 border-b last:border-0 hover:bg-muted/30 rounded text-sm">
                                        <div>
                                            <div className="text-xs font-medium">{r.diagnosisCode || '—'}</div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {r.surgeonName || (r.requestDate ? new Date(r.requestDate).toLocaleDateString('es-AR') : '—')}
                                            </div>
                                        </div>
                                        <div className="text-center font-mono text-sm">×{r.quantity}</div>
                                        <div className="text-right font-mono text-xs">${r.unitPrice.toLocaleString('es-AR')}</div>
                                        <div className="text-right font-mono text-xs font-semibold">${r.totalAmount.toLocaleString('es-AR')}</div>
                                        <div className="flex justify-center">
                                            <StatusBadge status={r.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )

                    ) : (
                        // Reintegros
                        reimItems.length === 0 ? (
                            <EmptyState message={`Sin reintegros en los últimos ${months} meses`} />
                        ) : (
                            <div>
                                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
                                    Se muestran todos los reintegros del afiliado (sin filtro por práctica específica)
                                </p>
                                <div className="grid grid-cols-[1fr_6rem_6.5rem_6.5rem] gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b mb-1">
                                    <span>Tipo / Fecha</span>
                                    <span className="text-right">Monto</span>
                                    <span className="text-center">Estado</span>
                                    <span></span>
                                </div>
                                {reimItems.map(r => (
                                    <div key={r.id} className="grid grid-cols-[1fr_6rem_6.5rem_6.5rem] gap-2 items-center px-2 py-2 border-b last:border-0 hover:bg-muted/30 rounded text-sm">
                                        <div>
                                            <div className="text-xs font-medium capitalize">{r.type || 'Reintegro'}</div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {r.requestDate ? new Date(r.requestDate).toLocaleDateString('es-AR') : '—'}
                                            </div>
                                        </div>
                                        <div className="text-right font-mono text-xs">${r.totalAmount.toLocaleString('es-AR')}</div>
                                        <div className="flex justify-center">
                                            <StatusBadge status={r.status} />
                                        </div>
                                        <div></div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                        Total: {authItems.length + reposItems.length + reimItems.length} registro(s) en {months} meses
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-muted hover:bg-muted/70 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">{message}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${cls}`}>
            {status}
        </span>
    );
}
