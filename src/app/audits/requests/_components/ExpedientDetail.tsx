'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ExpedientService } from '@/services/expedientService';
import { generateExpedientPDF } from '@/lib/expedientPDF';
import {
    Eye, AlertTriangle, ArrowLeft, Stethoscope, Paperclip, MessageSquare, History,
    Loader2, Printer, Gavel, Upload, ShieldCheck, XOctagon, CheckCircle, XCircle, RotateCcw,
} from 'lucide-react';
import { TYPE_CONFIG, STATUS_CONFIG, formatDate } from './configUI';
import { PracticesTab } from './PracticesTab';
import { AttachmentsTab } from './AttachmentsTab';
import { CommunicationTab } from './CommunicationTab';
import { TimelineTab } from './TimelineTab';
import type {
    Expedient,
    ExpedientNote,
    ExpedientAttachment,
    ExpedientLog,
    ExpedientStatus,
} from '@/types/database';

interface ExpedientDetailProps {
    expedient: Expedient;
    onAction: () => void;
    onBack: () => void;
}

export function ExpedientDetail({ expedient: initialExpedient, onAction: _onAction, onBack }: ExpedientDetailProps) {
    void _onAction;
    const { user } = useAuth();
    const [expedient, setExpedient] = useState(initialExpedient);
    const [tab, setTab] = useState<'practicas' | 'adjuntos' | 'notas' | 'historial'>('practicas');
    const [notes, setNotes] = useState<ExpedientNote[]>([]);
    const [attachments, setAttachments] = useState<ExpedientAttachment[]>([]);
    const [log, setLog] = useState<ExpedientLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [showExpedientAction, setShowExpedientAction] = useState<'observar' | 'anular' | null>(null);

    const tc = TYPE_CONFIG[expedient.type];
    const sc = STATUS_CONFIG[expedient.status];
    const TypeIcon = tc.icon;
    const practices = expedient.practices || [];
    const resolvedCount = practices.filter(p => ['autorizada', 'denegada', 'autorizada_parcial'].includes(p.status)).length;

    const canResolve = ['pendiente', 'en_revision', 'parcialmente_resuelto', 'observada'].includes(expedient.status);
    const isMine = expedient.assigned_to === user?.id;
    const isAdmin = user?.role === 'administrativo' || user?.role === 'admin' || user?.is_superuser;
    const isSupervisor = user?.role === 'supervisor' || user?.is_superuser;
    const isResolved = expedient.status === 'resuelto' || expedient.status === 'parcialmente_resuelto';
    const hasAuthorizedPractices = practices.some(p => ['autorizada', 'autorizada_parcial'].includes(p.status));
    const hasDeniedPractices = practices.some(p => p.status === 'denegada');
    const isObserved = expedient.status === 'observada';

    const loadFullData = useCallback(async () => {
        setLoading(true);
        try {
            const [full, n, a, l] = await Promise.all([
                ExpedientService.fetchById(expedient.id),
                ExpedientService.fetchNotes(expedient.id),
                ExpedientService.fetchAttachments(expedient.id),
                ExpedientService.fetchLog(expedient.id),
            ]);
            if (full) setExpedient(full);
            setNotes(n);
            setAttachments(a);
            setLog(l);
        } catch { /* error */ }
        setLoading(false);
    }, [expedient.id]);

    useEffect(() => { loadFullData(); }, [loadFullData]);

    const handleTake = async () => {
        if (!user) return;
        setResolving(true);
        try { await ExpedientService.takeForReview(expedient.id, user.id); await loadFullData(); } catch { /* */ }
        setResolving(false);
    };

    const checkExpedientCompletion = async () => {
        const full = await ExpedientService.fetchById(expedient.id);
        if (!full || !full.practices) return;
        const allResolved = full.practices.every(p => ['autorizada', 'denegada', 'autorizada_parcial'].includes(p.status));
        const someResolved = full.practices.some(p => ['autorizada', 'denegada', 'autorizada_parcial'].includes(p.status));
        const someObserved = full.practices.some(p => p.status === 'observada');
        const supabase = (await import('@/lib/supabase')).createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (table: string): any => supabase.from(table as any);
        if (allResolved && user) {
            await db('expedients').update({ status: 'resuelto', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', expedient.id);
        } else if (someObserved) {
            await db('expedients').update({ status: 'observada' }).eq('id', expedient.id);
        } else if (someResolved) {
            await db('expedients').update({ status: 'parcialmente_resuelto' }).eq('id', expedient.id);
        }
    };

    const handleObserveExpedient = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try { await ExpedientService.observe(expedient.id, user.id, resolutionNotes); setResolutionNotes(''); await loadFullData(); } catch { /* */ }
        setResolving(false);
    };

    const handleResubmit = async () => {
        if (!user) return;
        setResolving(true);
        try { await ExpedientService.resubmitObserved(expedient.id, user.id, resolutionNotes || undefined); setResolutionNotes(''); await loadFullData(); } catch { /* */ }
        setResolving(false);
    };

    const handleAppeal = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try { await ExpedientService.appeal(expedient.id, user.id, resolutionNotes); setResolutionNotes(''); await loadFullData(); } catch { /* */ }
        setResolving(false);
    };

    const handleCancel = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try { await ExpedientService.cancel(expedient.id, user.id, resolutionNotes); setResolutionNotes(''); await loadFullData(); } catch { /* */ }
        setResolving(false);
    };

    const handleControlDeskApprove = async () => {
        if (!user) return;
        setResolving(true);
        try { await ExpedientService.approveControlDesk(expedient.id, user.id); await loadFullData(); } catch { /* */ }
        setResolving(false);
    };

    const handleControlDeskReject = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try { await ExpedientService.rejectControlDesk(expedient.id, user.id, resolutionNotes); setResolutionNotes(''); await loadFullData(); } catch { /* */ }
        setResolving(false);
    };

    const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files?.[0]) return;
        try {
            await ExpedientService.uploadAttachment(expedient.id, e.target.files[0], 'otro', user.id);
            const a = await ExpedientService.fetchAttachments(expedient.id);
            setAttachments(a);
        } catch { /* */ }
    };

    const reloadNotes = useCallback(async () => {
        const n = await ExpedientService.fetchNotes(expedient.id);
        setNotes(n);
    }, [expedient.id]);

    const TABS = [
        { id: 'practicas' as const, label: `Prácticas (${practices.length})`, icon: Stethoscope },
        { id: 'adjuntos' as const, label: `Adjuntos (${attachments.length})`, icon: Paperclip },
        { id: 'notas' as const, label: `Comunicación (${notes.length})`, icon: MessageSquare },
        { id: 'historial' as const, label: 'Timeline', icon: History },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* ══ HEADER PERSISTENTE — Ficha clínica ══ */}
            <div className="bg-white dark:bg-background border-b shadow-sm">
                {/* Barra superior: back + número + badge */}
                <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                    <button onClick={onBack} className="md:hidden p-1.5 hover:bg-muted rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className={`p-1.5 rounded-lg ${tc.color}`}>
                        <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{expedient.expedient_number}</span>
                            {expedient.priority === 'urgente' && (
                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">Urgente</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {tc.label} • Creado {formatDate(expedient.created_at)}
                        </p>
                    </div>
                    <Badge className={`${sc.color} text-xs`}>{sc.label}</Badge>
                </div>

                {/* Datos clave del afiliado — siempre visibles */}
                <div className="px-4 pb-2 flex items-center gap-4 text-xs border-t border-dashed border-border/50 pt-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Afiliado:</span>
                        <span className="font-semibold">{expedient.affiliate?.full_name || '—'}</span>
                    </div>
                    {expedient.affiliate?.document_number && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">DNI:</span>
                            <span className="font-mono">{expedient.affiliate.document_number}</span>
                        </div>
                    )}
                    {expedient.affiliate?.affiliate_number && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">N°:</span>
                            <span className="font-mono">{expedient.affiliate.affiliate_number}</span>
                        </div>
                    )}
                    {expedient.affiliate_plan_id && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Plan:</span>
                            <span>#{expedient.affiliate_plan_id}</span>
                        </div>
                    )}
                </div>

                {/* Barra de progreso */}
                {practices.length > 0 && (
                    <div className="px-4 pb-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{resolvedCount}/{practices.length} prácticas resueltas</span>
                            <span>{Math.round((resolvedCount / practices.length) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${(resolvedCount / practices.length) * 100}%` }} />
                        </div>
                    </div>
                )}

                {/* Acciones principales */}
                <div className="px-4 pb-3 flex gap-2 flex-wrap">
                    {canResolve && !isMine && expedient.status === 'pendiente' && (
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm" onClick={handleTake} disabled={resolving}>
                            {resolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                            Tomar para revisión
                        </Button>
                    )}
                    {hasAuthorizedPractices && (
                        <Button variant="outline" size="sm" onClick={() => generateExpedientPDF(expedient)} title="Imprimir constancia">
                            <Printer className="h-4 w-4 mr-1" /> Constancia
                        </Button>
                    )}
                    {isObserved && isAdmin && (
                        <Button className="flex-1 bg-orange-600 hover:bg-orange-700" size="sm" onClick={handleResubmit} disabled={resolving}>
                            {resolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                            Reenviar a Auditoría
                        </Button>
                    )}
                    {canResolve && isMine && (
                        <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => setShowExpedientAction(showExpedientAction === 'observar' ? null : 'observar')} title="Observar solicitud">
                            <AlertTriangle className="h-4 w-4 mr-1" /> Observar
                        </Button>
                    )}
                    {isResolved && hasDeniedPractices && (isAdmin || isSupervisor) && expedient.status !== 'en_apelacion' && (
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" title="Apelar">
                            <Gavel className="h-4 w-4 mr-1" /> Apelar
                        </Button>
                    )}
                    {canResolve && (isMine || isAdmin || isSupervisor) && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowExpedientAction(showExpedientAction === 'anular' ? null : 'anular')} title="Anular solicitud">
                            <XOctagon className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Paneles de acción expandibles */}
                {expedient.requires_control_desk && expedient.control_desk_status === 'pendiente' && isSupervisor && (
                    <div className="mx-4 mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2"><ShieldCheck className="h-3.5 w-3.5 inline mr-1" />Mesa de Control</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">Este expediente requiere aprobación de mesa de control.</p>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleControlDeskApprove} disabled={resolving}><CheckCircle className="h-4 w-4 mr-1" /> Aprobar</Button>
                            <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={handleControlDeskReject} disabled={resolving || !resolutionNotes.trim()}><XCircle className="h-4 w-4 mr-1" /> Rechazar</Button>
                        </div>
                        <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Motivo de rechazo..." rows={2} className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none mt-2" />
                    </div>
                )}

                {showExpedientAction === 'observar' && (
                    <div className="mx-4 mb-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider"><AlertTriangle className="h-3.5 w-3.5 inline mr-1" />Observar Solicitud</p>
                        <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Detalle las observaciones (obligatorio)..." rows={3} className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs bg-background resize-none" />
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleObserveExpedient} disabled={resolving || !resolutionNotes.trim()}><AlertTriangle className="h-4 w-4 mr-1" /> Confirmar Observación</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowExpedientAction(null)}>Cancelar</Button>
                        </div>
                    </div>
                )}

                {showExpedientAction === 'anular' && (
                    <div className="mx-4 mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider"><XOctagon className="h-3.5 w-3.5 inline mr-1" />Anular Solicitud</p>
                        <p className="text-xs text-red-700 dark:text-red-400">Esta acción es irreversible.</p>
                        <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Motivo de anulación (obligatorio)..." rows={2} className="w-full border border-red-200 rounded-lg px-3 py-2 text-xs bg-background resize-none" />
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleCancel} disabled={resolving || !resolutionNotes.trim()}><XOctagon className="h-4 w-4 mr-1" /> Confirmar Anulación</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowExpedientAction(null)}>Cancelar</Button>
                        </div>
                    </div>
                )}

                {isObserved && isAdmin && showExpedientAction !== 'anular' && (
                    <div className="mx-4 mb-3 p-3 border border-orange-200 dark:border-orange-800 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 space-y-2">
                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">⚠ Solicitud observada por el auditor</p>
                        <p className="text-xs text-muted-foreground">Adjunte documentación adicional y reenvíe a auditoría.</p>
                        <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            <Upload className="h-4 w-4" />Adjuntar documentación
                            <input type="file" className="hidden" onChange={handleUploadAttachment} accept="image/*,.pdf" />
                        </label>
                        <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Notas adicionales para el auditor..." rows={2} className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none" />
                    </div>
                )}

                {isResolved && hasDeniedPractices && expedient.status !== 'en_apelacion' && (isAdmin || isSupervisor) && (
                    <div className="mx-4 mb-3 p-3 border border-red-200 dark:border-red-800 rounded-xl bg-red-50/50 dark:bg-red-950/20 space-y-2">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">⚖️ Apelación</p>
                        <p className="text-xs text-muted-foreground">Presente documentación adicional y fundamentos.</p>
                        <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Fundamentos de la apelación (obligatorio)..." rows={2} className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none" />
                        <Button size="sm" className="w-full bg-red-600 hover:bg-red-700" onClick={handleAppeal} disabled={resolving || !resolutionNotes.trim()}>
                            <Gavel className="h-4 w-4 mr-2" /> Presentar Apelación
                        </Button>
                    </div>
                )}
            </div>

            {/* ══ TABS ══ */}
            <div className="flex border-b bg-muted/10">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ══ CONTENIDO ══ */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-30" />
                        <p className="text-sm">Cargando solicitud...</p>
                    </div>
                ) : (
                    <>
                        {tab === 'practicas' && (
                            <PracticesTab
                                expedient={expedient}
                                practices={practices}
                                canResolve={canResolve}
                                isMine={isMine}
                                userId={user?.id}
                                onReload={loadFullData}
                                onCheckCompletion={checkExpedientCompletion}
                            />
                        )}
                        {tab === 'adjuntos' && <AttachmentsTab attachments={attachments} />}
                        {tab === 'notas' && (
                            <CommunicationTab
                                expedientId={expedient.id}
                                notes={notes}
                                practices={practices}
                                expedientStatus={expedient.status}
                                createdAt={expedient.created_at}
                                expedientNumber={expedient.expedient_number}
                                userId={user?.id}
                                onNotesReload={reloadNotes}
                            />
                        )}
                        {tab === 'historial' && <TimelineTab log={log} />}
                    </>
                )}
            </div>
        </div>
    );
}
