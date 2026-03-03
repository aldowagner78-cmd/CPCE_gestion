'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { PostAuditService } from '@/services/postAuditService';
import type {
    PostAudit,
    PostAuditItem,
    PostAuditLog,
    DebitNote,
    PostAuditStatus,
    PostAuditItemAction,
} from '@/types/database';
import {
    Search,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Eye,
    FileText,
    History,
    ArrowLeft,
    Loader2,
    ChevronDown,
    DollarSign,
    Play,
    Ban,
    Receipt,
    Send,
    Gavel,
    Building2,
    Calendar,
    TrendingDown,
    BarChart3,
    Printer,
} from 'lucide-react';

// ── Config visuales ──

const STATUS_CONFIG: Record<PostAuditStatus, { label: string; color: string; icon: typeof Clock }> = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    en_revision: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800', icon: Eye },
    aprobada: { label: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    con_debitos: { label: 'Con Débitos', color: 'bg-red-100 text-red-800', icon: TrendingDown },
    en_disputa: { label: 'En Disputa', color: 'bg-purple-100 text-purple-800', icon: Gavel },
    cerrada: { label: 'Cerrada', color: 'bg-gray-100 text-gray-600', icon: Ban },
};

const MATCH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    ok: { label: 'OK', color: 'bg-green-100 text-green-800' },
    cantidad_excedida: { label: 'Cantidad excedida', color: 'bg-red-100 text-red-800' },
    precio_excedido: { label: 'Precio excedido', color: 'bg-orange-100 text-orange-800' },
    sin_autorizacion: { label: 'Sin autorización', color: 'bg-red-200 text-red-900' },
    autorizacion_vencida: { label: 'Autoriz. vencida', color: 'bg-red-100 text-red-700' },
    duplicada: { label: 'Duplicada', color: 'bg-purple-100 text-purple-800' },
    aprobado_manual: { label: 'Aprobado', color: 'bg-green-100 text-green-700' },
    debitado: { label: 'Debitado', color: 'bg-red-200 text-red-900' },
};

function formatDate(d: string): string {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function formatCurrency(n?: number): string {
    if (n === undefined || n === null) return '-';
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ═══════════════════════════════════════════
// COMPONENTE: Lista de auditorías posteriores
// ═══════════════════════════════════════════

function PostAuditList({
    audits,
    selected,
    onSelect,
}: {
    audits: PostAudit[];
    selected?: string;
    onSelect: (a: PostAudit) => void;
}) {
    return (
        <div className="divide-y">
            {audits.map(a => {
                const sc = STATUS_CONFIG[a.status];
                const isSelected = a.id === selected;
                return (
                    <button
                        key={a.id}
                        onClick={() => onSelect(a)}
                        className={`w-full p-3 text-left transition-colors hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold">{a.audit_number || 'Sin Nro.'}</span>
                            <Badge className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {a.provider?.name || `Prestador #${a.provider_id}`}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                                {a.period_month}/{a.period_year}
                            </span>
                            <span className="text-xs font-semibold">
                                {formatCurrency(a.invoiced_total)}
                            </span>
                        </div>
                        {a.debit_total > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-600 font-semibold">
                                    Débito: {formatCurrency(a.debit_total)}
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}
            {audits.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    No hay auditorías posteriores
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// COMPONENTE: Detalle de auditoría posterior
// ═══════════════════════════════════════════

function PostAuditDetail({
    postAudit: initialPA,
    onBack,
    onRefresh,
}: {
    postAudit: PostAudit;
    onBack: () => void;
    onRefresh: () => void;
}) {
    const { user } = useAuth();
    const [pa, setPa] = useState(initialPA);
    const [items, setItems] = useState<PostAuditItem[]>([]);
    const [log, setLog] = useState<PostAuditLog[]>([]);
    const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
    const [tab, setTab] = useState<'items' | 'debitos' | 'historial'>('items');
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [notes, setNotes] = useState('');
    const [selectedItem, setSelectedItem] = useState<PostAuditItem | null>(null);
    const [itemAction, setItemAction] = useState<PostAuditItemAction | null>(null);
    const [adjustedDebit, setAdjustedDebit] = useState('');

    const sc = STATUS_CONFIG[pa.status];
    const canReview = ['pendiente', 'en_revision'].includes(pa.status);
    const isMine = pa.assigned_to === user?.id;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [full, i, l, dn] = await Promise.all([
                PostAuditService.fetchById(pa.id),
                PostAuditService.fetchItems(pa.id),
                PostAuditService.fetchLog(pa.id),
                PostAuditService.fetchDebitNotes(pa.id),
            ]);
            if (full) setPa(full);
            setItems(i);
            setLog(l);
            setDebitNotes(dn);
        } catch {
            // Error
        }
        setLoading(false);
    }, [pa.id]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            await loadData();
            if (cancelled) return;
        };
        run();
        return () => { cancelled = true; };
    }, [loadData]);

    // ── Tomar para revisión ──
    const handleTake = async () => {
        if (!user) return;
        setRunning(true);
        try {
            await PostAuditService.takeForReview(pa.id, user.id);
            await loadData();
        } catch { /* */ }
        setRunning(false);
    };

    // ── Ejecutar cruce automático ──
    const handleRunCheck = async () => {
        if (!user) return;
        setRunning(true);
        try {
            await PostAuditService.runAutoCrossCheck(pa.id, user.id);
            await loadData();
        } catch { /* */ }
        setRunning(false);
    };

    // ── Resolver item individual ──
    const handleResolveItem = async () => {
        if (!user || !selectedItem || !itemAction) return;
        setRunning(true);
        try {
            await PostAuditService.resolveItem(
                selectedItem.id,
                itemAction,
                user.id,
                notes || undefined,
                adjustedDebit ? parseFloat(adjustedDebit) : undefined,
            );
            setSelectedItem(null);
            setItemAction(null);
            setNotes('');
            setAdjustedDebit('');
            await loadData();
        } catch { /* */ }
        setRunning(false);
    };

    // ── Aprobar todo ──
    const handleApproveAll = async () => {
        if (!user) return;
        setRunning(true);
        try {
            await PostAuditService.approve(pa.id, user.id, notes || undefined);
            setNotes('');
            await loadData();
            onRefresh();
        } catch { /* */ }
        setRunning(false);
    };

    // ── Cerrar con débitos ──
    const handleCloseWithDebits = async () => {
        if (!user) return;
        setRunning(true);
        try {
            await PostAuditService.closeWithDebits(pa.id, user.id, notes || undefined);
            setNotes('');
            await loadData();
            onRefresh();
        } catch { /* */ }
        setRunning(false);
    };

    // ── Emitir nota de débito ──
    const handleEmitDebitNote = async (dnId: string) => {
        if (!user) return;
        setRunning(true);
        try {
            await PostAuditService.emitDebitNote(dnId, user.id);
            await loadData();
        } catch { /* */ }
        setRunning(false);
    };

    // Estadísticas de items
    const itemStats = {
        total: items.length,
        ok: items.filter(i => ['ok', 'aprobado_manual'].includes(i.match_status)).length,
        issues: items.filter(i => !['ok', 'aprobado_manual', 'pendiente'].includes(i.match_status)).length,
        pending: items.filter(i => i.match_status === 'pendiente').length,
        totalDebit: items.reduce((s, i) => s + (i.debit_amount || 0), 0),
    };

    const TABS = [
        { id: 'items' as const, label: `Ítems (${items.length})`, icon: Receipt },
        { id: 'debitos' as const, label: `Débitos (${debitNotes.length})`, icon: TrendingDown },
        { id: 'historial' as const, label: 'Timeline', icon: History },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={onBack} className="md:hidden p-1 hover:bg-muted rounded">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <Receipt className="h-4 w-4 text-blue-600" />
                    <span className="font-mono font-bold text-sm">{pa.audit_number || 'Sin Nro.'}</span>
                    <div className="ml-auto">
                        <Badge className={sc.color}>{sc.label}</Badge>
                    </div>
                </div>

                {/* Info del prestador / factura */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="font-medium">{pa.provider?.name || `Prestador #${pa.provider_id}`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Fact. {pa.invoice?.invoice_number || `#${pa.invoice_id}`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Período: {pa.period_month}/{pa.period_year}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Creado: {formatDate(pa.created_at)}</span>
                    </div>
                </div>

                {/* Resumen económico */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-blue-600 uppercase font-bold">Facturado</p>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">{formatCurrency(pa.invoiced_total)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-green-600 uppercase font-bold">Autorizado</p>
                        <p className="text-sm font-bold text-green-800 dark:text-green-300">{formatCurrency(pa.authorized_total)}</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${pa.debit_total > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-gray-50 dark:bg-gray-900/30'}`}>
                        <p className={`text-[10px] uppercase font-bold ${pa.debit_total > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            Débito
                        </p>
                        <p className={`text-sm font-bold ${pa.debit_total > 0 ? 'text-red-800 dark:text-red-300' : 'text-gray-500'}`}>
                            {formatCurrency(pa.debit_total)}
                        </p>
                    </div>
                </div>

                {/* Resultado del cruce automático */}
                {pa.auto_check_result && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                        pa.auto_check_result === 'ok' ? 'bg-green-50 text-green-700' :
                        pa.auto_check_result === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                    }`}>
                        {pa.auto_check_result === 'ok' ? <CheckCircle className="h-3.5 w-3.5" /> :
                         pa.auto_check_result === 'warning' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                         <XCircle className="h-3.5 w-3.5" />}
                        <span className="font-medium">
                            Cruce: {pa.auto_check_result === 'ok' ? 'Sin inconsistencias' :
                                    pa.auto_check_result === 'warning' ? 'Advertencias encontradas' :
                                    'Inconsistencias detectadas'}
                        </span>
                        <span className="ml-auto text-[10px]">
                            {itemStats.ok} OK / {itemStats.issues} con issues / {itemStats.pending} pendientes
                        </span>
                    </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2 mt-3 flex-wrap">
                    {/* Tomar para revisión */}
                    {canReview && !isMine && pa.status === 'pendiente' && (
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm" onClick={handleTake} disabled={running}>
                            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                            Tomar para revisión
                        </Button>
                    )}

                    {/* Ejecutar cruce automático */}
                    {canReview && isMine && (
                        <Button className="bg-purple-600 hover:bg-purple-700" size="sm" onClick={handleRunCheck} disabled={running}>
                            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                            Cruce Automático
                        </Button>
                    )}

                    {/* Aprobar todo */}
                    {canReview && isMine && itemStats.issues === 0 && itemStats.pending === 0 && (
                        <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={handleApproveAll} disabled={running}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Aprobar Todo
                        </Button>
                    )}

                    {/* Cerrar con débitos */}
                    {canReview && isMine && itemStats.issues > 0 && (
                        <Button className="bg-red-600 hover:bg-red-700" size="sm" onClick={handleCloseWithDebits} disabled={running}>
                            <TrendingDown className="h-4 w-4 mr-2" /> Cerrar con Débitos
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                            tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : tab === 'items' ? (
                    <>
                        {/* Lista de items del cruce */}
                        {items.map(item => {
                            const ms = MATCH_STATUS_CONFIG[item.match_status] || MATCH_STATUS_CONFIG.pendiente;
                            const isExpanded = selectedItem?.id === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className={`border rounded-xl overflow-hidden transition-all ${
                                        isExpanded ? 'ring-2 ring-primary/30' : 'hover:border-primary/30'
                                    }`}
                                >
                                    {/* Cabecera del item */}
                                    <button
                                        onClick={() => setSelectedItem(isExpanded ? null : item)}
                                        className="w-full p-3 text-left flex items-center gap-3 hover:bg-muted/30"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold truncate">
                                                    {item.practice_description || `Práctica #${item.practice_id}`}
                                                </span>
                                                <Badge className={`text-[9px] shrink-0 ${ms.color}`}>{ms.label}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                                <span>Cant: {item.invoiced_quantity}</span>
                                                <span>P.Unit: {formatCurrency(item.invoiced_unit_price)}</span>
                                                <span className="font-semibold text-foreground">
                                                    Total: {formatCurrency(item.invoiced_total)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {item.authorized_total !== undefined && item.authorized_total !== null ? (
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground">Autorizado</p>
                                                    <p className="text-xs font-bold text-green-700">{formatCurrency(item.authorized_total)}</p>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-muted-foreground">Sin match</p>
                                            )}
                                            {item.debit_amount > 0 && (
                                                <p className="text-[10px] font-bold text-red-600">
                                                    Débito: {formatCurrency(item.debit_amount)}
                                                </p>
                                            )}
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Detalle expandido */}
                                    {isExpanded && (
                                        <div className="border-t p-3 bg-muted/10 space-y-3">
                                            {/* Comparación factura vs autorización */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Facturado</p>
                                                    <div className="space-y-0.5 text-xs">
                                                        <p>Cantidad: <strong>{item.invoiced_quantity}</strong></p>
                                                        <p>P.Unitario: <strong>{formatCurrency(item.invoiced_unit_price)}</strong></p>
                                                        <p>Total: <strong>{formatCurrency(item.invoiced_total)}</strong></p>
                                                    </div>
                                                </div>
                                                <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Autorizado</p>
                                                    {item.authorized_total !== undefined && item.authorized_total !== null ? (
                                                        <div className="space-y-0.5 text-xs">
                                                            <p>Cantidad: <strong>{item.authorized_quantity ?? '-'}</strong></p>
                                                            <p>P.Unitario: <strong>{formatCurrency(item.authorized_unit_price)}</strong></p>
                                                            <p>Total: <strong>{formatCurrency(item.authorized_total)}</strong></p>
                                                            {item.authorization?.authorization_number && (
                                                                <p className="text-[10px] text-green-600">Auth: {item.authorization.authorization_number}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground">No encontrada</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Issues detectados */}
                                            {item.issues && item.issues.length > 0 && (
                                                <div className="space-y-1">
                                                    {item.issues.map((issue, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`text-xs p-2 rounded-lg flex items-start gap-2 ${
                                                                issue.severity === 'error' ? 'bg-red-50 text-red-700' :
                                                                issue.severity === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                                                                'bg-blue-50 text-blue-700'
                                                            }`}
                                                        >
                                                            {issue.severity === 'error' ? <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> :
                                                             issue.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> :
                                                             <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                                                            <span>{issue.message}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Panel de resolución del item (si auditor) */}
                                            {canReview && isMine && !item.auditor_action && (
                                                <div className="border rounded-lg p-3 bg-background space-y-2">
                                                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Resolución</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[
                                                            { key: 'aprobar' as const, label: 'Aprobar', icon: CheckCircle, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                                                            { key: 'debitar' as const, label: 'Debitar', icon: TrendingDown, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                                                            { key: 'ajustar' as const, label: 'Ajustar', icon: DollarSign, color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                                                            { key: 'rechazar' as const, label: 'Rechazar', icon: XCircle, color: 'bg-red-200 text-red-800 hover:bg-red-300' },
                                                        ].map(act => (
                                                            <button
                                                                key={act.key}
                                                                onClick={() => setItemAction(itemAction === act.key ? null : act.key)}
                                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                                                    itemAction === act.key ? 'ring-2 ring-primary ' + act.color : act.color
                                                                }`}
                                                            >
                                                                <act.icon className="h-3 w-3" />
                                                                {act.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {itemAction && (
                                                        <div className="space-y-2 mt-2">
                                                            {(itemAction === 'debitar' || itemAction === 'ajustar') && (
                                                                <div>
                                                                    <label className="text-[10px] text-muted-foreground">Monto débito/ajuste</label>
                                                                    <Input
                                                                        type="number"
                                                                        value={adjustedDebit}
                                                                        onChange={e => setAdjustedDebit(e.target.value)}
                                                                        placeholder={item.debit_amount > 0 ? item.debit_amount.toString() : '0'}
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </div>
                                                            )}
                                                            <textarea
                                                                value={notes}
                                                                onChange={e => setNotes(e.target.value)}
                                                                placeholder="Notas del auditor..."
                                                                rows={2}
                                                                className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                className="w-full"
                                                                onClick={handleResolveItem}
                                                                disabled={running}
                                                            >
                                                                {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                                                Confirmar {itemAction}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Resolución previa (si ya fue resuelto) */}
                                            {item.auditor_action && (
                                                <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg text-xs">
                                                    <p className="font-semibold text-green-700">
                                                        Resuelto: {item.auditor_action}
                                                    </p>
                                                    {item.auditor_notes && <p className="text-muted-foreground mt-1">{item.auditor_notes}</p>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {items.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                No hay ítems. Ejecute el cruce automático para generar los ítems.
                            </div>
                        )}
                    </>
                ) : tab === 'debitos' ? (
                    <>
                        {/* Notas de débito */}
                        {debitNotes.map(dn => (
                            <div key={dn.id} className="border rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-mono font-bold text-sm">{dn.debit_number || 'Borrador'}</span>
                                        <Badge className={`ml-2 text-[10px] ${
                                            dn.status === 'emitida' ? 'bg-blue-100 text-blue-800' :
                                            dn.status === 'aceptada' ? 'bg-green-100 text-green-800' :
                                            dn.status === 'disputada' ? 'bg-purple-100 text-purple-800' :
                                            dn.status === 'anulada' ? 'bg-gray-100 text-gray-600' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {dn.status}
                                        </Badge>
                                    </div>
                                    <span className="text-sm font-bold text-red-600">{formatCurrency(dn.total_amount)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{dn.reason}</p>
                                <p className="text-xs text-muted-foreground">{dn.detail_count} ítems debitados</p>

                                {/* Items de la nota de débito */}
                                {dn.items && dn.items.length > 0 && (
                                    <div className="space-y-1.5">
                                        {dn.items.map(di => (
                                            <div key={di.id} className="flex items-center justify-between text-xs p-2 bg-red-50/50 dark:bg-red-950/10 rounded-lg">
                                                <span className="truncate flex-1">{di.practice_description || `#${di.practice_id}`}</span>
                                                <div className="flex gap-3 ml-2 shrink-0">
                                                    <span className="text-muted-foreground">Fact: {formatCurrency(di.invoiced_amount)}</span>
                                                    <span className="text-muted-foreground">Auth: {formatCurrency(di.authorized_amount)}</span>
                                                    <span className="font-bold text-red-600">-{formatCurrency(di.debit_amount)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Acciones */}
                                <div className="flex gap-2">
                                    {dn.status === 'borrador' && (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleEmitDebitNote(dn.id)} disabled={running}>
                                            <Printer className="h-3.5 w-3.5 mr-1" /> Emitir
                                        </Button>
                                    )}
                                    {dn.dispute_reason && (
                                        <div className="flex-1 text-xs p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                            <p className="font-bold text-purple-700">Disputa: {dn.dispute_reason}</p>
                                            {dn.dispute_resolution && (
                                                <p className="text-purple-600 mt-1">Resolución: {dn.dispute_resolution}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {debitNotes.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                No hay notas de débito
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Timeline */}
                        <div className="space-y-2">
                            {log.map(entry => (
                                <div key={entry.id} className="flex gap-3 text-xs">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-medium">{formatAction(entry.action)}</p>
                                        <p className="text-muted-foreground">
                                            {entry.user?.full_name || 'Sistema'} — {formatDate(entry.created_at)}
                                        </p>
                                        {entry.details && Object.keys(entry.details).length > 0 && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                {JSON.stringify(entry.details).slice(0, 100)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {log.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-4">Sin actividad</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function formatAction(action: string): string {
    const map: Record<string, string> = {
        creada: '📋 Auditoría creada',
        tomada_revision: '👁️ Tomada para revisión',
        cruce_automatico: '🔄 Cruce automático ejecutado',
        item_aprobar: '✅ Ítem aprobado',
        item_debitar: '💸 Ítem debitado',
        item_rechazar: '❌ Ítem rechazado',
        item_ajustar: '✏️ Ítem ajustado',
        aprobada: '✅ Auditoría aprobada',
        cerrada_con_debitos: '💰 Cerrada con débitos',
        nota_debito_emitida: '📤 Nota de débito emitida',
        nota_debito_disputada: '⚖️ Débito disputado',
        disputa_resuelta: '✅ Disputa resuelta',
        cerrada: '🔒 Auditoría cerrada',
        reasignada: '🔄 Reasignada',
    };
    return map[action] || action;
}

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL: Bandeja
// ═══════════════════════════════════════════

export default function PostAuditPage() {
    const { user } = useAuth();
    const { activeJurisdiction } = useJurisdiction();
    const [audits, setAudits] = useState<PostAudit[]>([]);
    const [selected, setSelected] = useState<PostAudit | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [counts, setCounts] = useState<Record<string, number>>({});

    // Crear nueva auditoría posterior (desde factura)
    const [showCreate, setShowCreate] = useState(false);
    const [invoiceId, setInvoiceId] = useState('');
    const [creating, setCreating] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [a, c] = await Promise.all([
                PostAuditService.fetchAll({
                    jurisdictionId: activeJurisdiction?.id,
                    status: statusFilter || undefined,
                }),
                PostAuditService.getCounts(activeJurisdiction?.id),
            ]);
            setAudits(a);
            setCounts(c);
        } catch {
            // Error
        }
        setLoading(false);
    }, [activeJurisdiction, statusFilter]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            await loadData();
            if (cancelled) return;
        };
        run();
        return () => { cancelled = true; };
    }, [loadData]);

    const handleCreate = async () => {
        if (!user || !invoiceId || !activeJurisdiction) return;
        setCreating(true);
        try {
            const pa = await PostAuditService.createFromInvoice(
                parseInt(invoiceId),
                user.id,
                activeJurisdiction.id,
            );
            setInvoiceId('');
            setShowCreate(false);
            await loadData();
            setSelected(pa);
        } catch {
            // Error
        }
        setCreating(false);
    };

    // Filtrar por búsqueda
    const filtered = audits.filter(a => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            a.audit_number?.toLowerCase().includes(s) ||
            a.provider?.name?.toLowerCase().includes(s) ||
            a.invoice?.invoice_number?.toLowerCase().includes(s)
        );
    });

    // Contadores visuales
    const counterItems = [
        { key: '', label: 'Todas', count: counts.total || 0 },
        { key: 'pendiente', label: 'Pendientes', count: counts.pendiente || 0, color: 'text-yellow-600' },
        { key: 'en_revision', label: 'En Revisión', count: counts.en_revision || 0, color: 'text-blue-600' },
        { key: 'con_debitos', label: 'Con Débitos', count: counts.con_debitos || 0, color: 'text-red-600' },
        { key: 'en_disputa', label: 'En Disputa', count: counts.en_disputa || 0, color: 'text-purple-600' },
    ];

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-background">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <h1 className="text-lg font-bold">Auditoría Posterior</h1>
                    </div>
                    <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
                        <Receipt className="h-4 w-4 mr-1" /> Nueva Auditoría
                    </Button>
                </div>

                {/* Formulario crear */}
                {showCreate && (
                    <div className="mb-3 p-3 border rounded-xl bg-muted/20 space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Crear desde factura</p>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={invoiceId}
                                onChange={e => setInvoiceId(e.target.value)}
                                placeholder="ID de la factura"
                                className="h-8 text-xs flex-1"
                            />
                            <Button size="sm" onClick={handleCreate} disabled={creating || !invoiceId}>
                                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Contadores */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {counterItems.map(c => (
                        <button
                            key={c.key}
                            onClick={() => setStatusFilter(c.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                statusFilter === c.key
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                            }`}
                        >
                            <span className={c.color}>{c.count}</span> {c.label}
                        </button>
                    ))}
                </div>

                {/* Búsqueda */}
                <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nro, prestador, factura..."
                        className="pl-8 h-8 text-xs"
                    />
                </div>
            </div>

            {/* Split: lista + detalle */}
            <div className="flex-1 flex overflow-hidden">
                {/* Lista */}
                <div className={`border-r overflow-y-auto ${selected ? 'hidden md:block md:w-[360px]' : 'w-full md:w-[360px]'}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <PostAuditList
                            audits={filtered}
                            selected={selected?.id}
                            onSelect={setSelected}
                        />
                    )}
                </div>

                {/* Detalle */}
                <div className={`flex-1 ${selected ? 'block' : 'hidden md:flex md:items-center md:justify-center'}`}>
                    {selected ? (
                        <PostAuditDetail
                            key={selected.id}
                            postAudit={selected}
                            onBack={() => setSelected(null)}
                            onRefresh={loadData}
                        />
                    ) : (
                        <div className="text-center text-muted-foreground hidden md:block">
                            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Seleccione una auditoría posterior</p>
                            <p className="text-xs mt-1">Cruce de facturas vs autorizaciones</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
