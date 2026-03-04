'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { ExpedientService } from '@/services/expedientService';
import type { PracticeResolutionStatus } from '@/services/expedientService';
import { generateExpedientPDF, generatePracticePDF } from '@/lib/expedientPDF';
import { computeSLA } from '@/services/slaService';
import {
    Stethoscope,
    FlaskConical,
    Building2,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    AlertTriangle,
    Search,
    FileText,
    Paperclip,
    MessageSquare,
    History,
    ArrowLeft,
    Send,
    Ban,
    Plus,
    ChevronDown,
    User,
    Calendar,
    Shield,
    Pill,
    Sparkles,
    DollarSign,
    Pause,
    RotateCcw,
    Loader2,
    Printer,
    Gavel,
    Upload,
    ShieldCheck,
    XOctagon,
    Star,
} from 'lucide-react';
import Link from 'next/link';
import type {
    Expedient,
    ExpedientType,
    ExpedientStatus,
    ExpedientPractice,
    ExpedientNote,
    ExpedientAttachment,
    ExpedientLog,
    RulesResult,
} from '@/types/database';

// ── Helpers de UI ──

const TYPE_CONFIG: Record<ExpedientType, { label: string; icon: React.ElementType; color: string }> = {
    ambulatoria: { label: 'Ambulatoria', icon: Stethoscope, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    bioquimica: { label: 'Bioquímica', icon: FlaskConical, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    internacion: { label: 'Internación', icon: Building2, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    odontologica: { label: 'Odontológica', icon: Sparkles, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
    programas_especiales: { label: 'Prog. Especial', icon: Shield, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    elementos: { label: 'Elementos', icon: Pill, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
    reintegros: { label: 'Reintegro', icon: DollarSign, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
};

const STATUS_CONFIG: Record<ExpedientStatus, { label: string; color: string; icon: React.ElementType }> = {
    borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icon: FileText },
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: Clock },
    en_revision: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', icon: Eye },
    parcialmente_resuelto: { label: 'Parcial', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300', icon: AlertTriangle },
    resuelto: { label: 'Resuelto', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle },
    observada: { label: 'Observada', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: AlertTriangle },
    en_apelacion: { label: 'En Apelación', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: RotateCcw },
    anulada: { label: 'Anulada', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Ban },
};

const PRACTICE_STATUS_CONFIG: Record<PracticeResolutionStatus, { label: string; color: string; icon: React.ElementType }> = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    en_revision: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800', icon: Eye },
    autorizada: { label: 'Autorizada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    denegada: { label: 'Denegada', color: 'bg-red-100 text-red-700', icon: XCircle },
    observada: { label: 'Observada', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    autorizada_parcial: { label: 'Parcial', color: 'bg-indigo-100 text-indigo-800', icon: AlertTriangle },
    diferida: { label: 'Diferida', color: 'bg-slate-100 text-slate-700', icon: Pause },
};

const RULE_COLORS: Record<RulesResult, string> = {
    verde: 'text-green-600 bg-green-100',
    amarillo: 'text-yellow-700 bg-yellow-100',
    rojo: 'text-red-600 bg-red-100',
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── Componente: Lista de expedientes ──

function ExpedientList({
    expedients,
    onSelect,
    selectedId,
}: {
    expedients: Expedient[];
    onSelect: (e: Expedient) => void;
    selectedId?: string;
}) {
    if (expedients.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay solicitudes con estos filtros</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border/50">
            {expedients.map(exp => {
                const tc = TYPE_CONFIG[exp.type];
                const sc = STATUS_CONFIG[exp.status];
                const TypeIcon = tc.icon;
                const StatusIcon = sc.icon;
                const isSelected = selectedId === exp.id;
                // ── SLA + IA (Etapa 1) ──
                const slaInfo = (['pendiente', 'en_revision', 'observada'] as ExpedientStatus[]).includes(exp.status)
                    ? computeSLA(exp.created_at)
                    : null;
                const hasPriority = (exp.clinical_priority_score ?? 0) >= 3;

                return (
                    <button
                        key={exp.id}
                        onClick={() => onSelect(exp)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-all duration-150 ${isSelected ? 'bg-primary/5 border-l-3 border-primary' : 'border-l-3 border-transparent'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={`p-1.5 rounded-lg ${tc.color}`}>
                                    <TypeIcon className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-mono text-xs text-muted-foreground font-medium">
                                    {exp.expedient_number}
                                </span>
                                {exp.priority === 'urgente' && (
                                    <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        Urgente
                                    </span>
                                )}
                                {/* ── Estrella de prioridad IA ── */}
                                {hasPriority && (
                                    <span title="Prioridad clínica alta (IA)" className="inline-flex">
                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* ── Semáforo SLA ── */}
                                {slaInfo && (
                                    <span
                                        className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${slaInfo.status === 'verde' ? 'bg-green-500'
                                            : slaInfo.status === 'amarillo' ? 'bg-yellow-400'
                                                : 'bg-red-500 animate-pulse'
                                            }`}
                                        title={`SLA: ${slaInfo.hoursElapsed.toFixed(1)}h hábiles`}
                                    />
                                )}
                                <Badge className={`${sc.color} text-[10px] gap-1`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {sc.label}
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-1.5">
                            <p className="font-medium truncate text-sm">
                                {exp.affiliate?.full_name || `Afiliado #${String(exp.affiliate_id).slice(0, 8)}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {exp.affiliate?.affiliate_number && (
                                    <span className="text-[10px] font-mono text-muted-foreground">N° {exp.affiliate.affiliate_number}</span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exp.affiliate?.titular_id ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                    {exp.affiliate?.titular_id ? 'Adherente' : 'Titular'}
                                </span>
                                {exp.family_member_relation && (
                                    <span className="text-[10px] text-muted-foreground">({exp.family_member_relation})</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatShortDate(exp.created_at)}
                            </span>
                            {exp.rules_result && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${RULE_COLORS[exp.rules_result]}`}>
                                    {exp.rules_result}
                                </span>
                            )}
                            {exp.assigned_to && (
                                <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Asignado
                                </span>
                            )}
                            {/* Horas hábiles SLA */}
                            {slaInfo && (
                                <span className={`text-[10px] font-medium ${slaInfo.status === 'rojo' ? 'text-red-600' :
                                    slaInfo.status === 'amarillo' ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                    {slaInfo.hoursElapsed.toFixed(1)}h
                                </span>
                            )}
                        </div>

                        {exp.request_notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 truncate italic opacity-70">
                                &quot;{exp.request_notes}&quot;
                            </p>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ── Componente: Detalle del expediente ──

function ExpedientDetail({
    expedient: initialExpedient,
    onAction: _onAction,
    onBack,
}: {
    expedient: Expedient;
    onAction: () => void;
    onBack: () => void;
}) {
    void _onAction; // Called indirectly via reload
    const { user } = useAuth();
    const [expedient, setExpedient] = useState(initialExpedient);
    const [tab, setTab] = useState<'practicas' | 'adjuntos' | 'notas' | 'historial'>('practicas');
    const [notes, setNotes] = useState<ExpedientNote[]>([]);
    const [attachments, setAttachments] = useState<ExpedientAttachment[]>([]);
    const [log, setLog] = useState<ExpedientLog[]>([]);
    const [newNote, setNewNote] = useState('');
    const [commChannel, setCommChannel] = useState<'interna' | 'para_afiliado'>('interna');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);

    // Práctica seleccionada para resolución
    const [selectedPractice, setSelectedPractice] = useState<ExpedientPractice | null>(null);
    const [resolutionAction, setResolutionAction] = useState<'autorizar' | 'denegar' | 'observar' | 'parcial' | 'diferir' | null>(null);
    const [diagnosisCode, setDiagnosisCode] = useState('');
    const [diagnosisDesc, setDiagnosisDesc] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [reviewDate, setReviewDate] = useState('');
    const [coveragePercent, setCoveragePercent] = useState(80);
    const [adjustedQuantity, setAdjustedQuantity] = useState(1);
    const [showExpedientAction, setShowExpedientAction] = useState<'observar' | 'anular' | null>(null);

    const tc = TYPE_CONFIG[expedient.type];
    const sc = STATUS_CONFIG[expedient.status];
    const TypeIcon = tc.icon;
    const canResolve = ['pendiente', 'en_revision', 'parcialmente_resuelto', 'observada'].includes(expedient.status);
    const isMine = expedient.assigned_to === user?.id;
    const isAdmin = user?.role === 'administrativo' || user?.role === 'admin' || user?.is_superuser;
    const isSupervisor = user?.role === 'supervisor' || user?.is_superuser;
    const isResolved = expedient.status === 'resuelto' || expedient.status === 'parcialmente_resuelto';
    const hasAuthorizedPractices = (expedient.practices || []).some(p => ['autorizada', 'autorizada_parcial'].includes(p.status));
    const hasDeniedPractices = (expedient.practices || []).some(p => p.status === 'denegada');
    const isObserved = expedient.status === 'observada';

    // Cargar datos completos del expediente
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
        } catch {
            // Error loading data
        }
        setLoading(false);
    }, [expedient.id]);

    useEffect(() => {
        loadFullData();
    }, [loadFullData]);

    // Tomar para revisión
    const handleTake = async () => {
        if (!user) return;
        setResolving(true);
        try {
            await ExpedientService.takeForReview(expedient.id, user.id);
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Resolver práctica
    const handleResolvePractice = async () => {
        if (!user || !selectedPractice || !resolutionAction) return;
        setResolving(true);
        try {
            switch (resolutionAction) {
                case 'autorizar':
                    await ExpedientService.authorizePractice(
                        expedient.id,
                        selectedPractice.id,
                        user.id,
                        {
                            diagnosis_code: diagnosisCode || undefined,
                            diagnosis_description: diagnosisDesc || undefined,
                            resolution_notes: resolutionNotes || undefined,
                            coverage_percent: coveragePercent,
                            covered_amount: (selectedPractice.practice_value || 0) * (coveragePercent / 100),
                            copay_amount: (selectedPractice.practice_value || 0) * ((100 - coveragePercent) / 100),
                        },
                    );
                    break;
                case 'parcial':
                    await ExpedientService.authorizePartialPractice(
                        expedient.id,
                        selectedPractice.id,
                        user.id,
                        {
                            diagnosis_code: diagnosisCode || undefined,
                            diagnosis_description: diagnosisDesc || undefined,
                            resolution_notes: resolutionNotes,
                            coverage_percent: coveragePercent,
                            covered_amount: (selectedPractice.practice_value || 0) * (coveragePercent / 100),
                            copay_amount: (selectedPractice.practice_value || 0) * ((100 - coveragePercent) / 100),
                            adjusted_quantity: adjustedQuantity,
                        },
                    );
                    break;
                case 'denegar':
                    await ExpedientService.denyPractice(
                        expedient.id,
                        selectedPractice.id,
                        user.id,
                        {
                            resolution_notes: resolutionNotes,
                            diagnosis_code: diagnosisCode || undefined,
                            diagnosis_description: diagnosisDesc || undefined,
                        },
                    );
                    break;
                case 'observar':
                    await ExpedientService.observePractice(
                        expedient.id,
                        selectedPractice.id,
                        user.id,
                        resolutionNotes,
                    );
                    break;
                case 'diferir':
                    await ExpedientService.deferPractice(
                        expedient.id,
                        selectedPractice.id,
                        user.id,
                        reviewDate,
                        resolutionNotes,
                    );
                    break;
            }

            // Reset form
            setSelectedPractice(null);
            setResolutionAction(null);
            setDiagnosisCode('');
            setDiagnosisDesc('');
            setResolutionNotes('');
            setReviewDate('');
            setCoveragePercent(80);
            setAdjustedQuantity(1);

            // Check if all practices are resolved → update expedient status
            await checkExpedientCompletion();
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Verificar si el expediente está completamente resuelto
    const checkExpedientCompletion = async () => {
        const full = await ExpedientService.fetchById(expedient.id);
        if (!full || !full.practices) return;

        const allResolved = full.practices.every(p =>
            ['autorizada', 'denegada', 'autorizada_parcial'].includes(p.status),
        );
        const someResolved = full.practices.some(p =>
            ['autorizada', 'denegada', 'autorizada_parcial'].includes(p.status),
        );
        const someObserved = full.practices.some(p => p.status === 'observada');

        if (allResolved && user) {
            // Marcar como resuelto
            const supabase = (await import('@/lib/supabase')).createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = (table: string): any => supabase.from(table as any);
            await db('expedients')
                .update({
                    status: 'resuelto',
                    resolved_by: user.id,
                    resolved_at: new Date().toISOString(),
                })
                .eq('id', expedient.id);
        } else if (someObserved) {
            const supabase = (await import('@/lib/supabase')).createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = (table: string): any => supabase.from(table as any);
            await db('expedients')
                .update({ status: 'observada' })
                .eq('id', expedient.id);
        } else if (someResolved) {
            const supabase = (await import('@/lib/supabase')).createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = (table: string): any => supabase.from(table as any);
            await db('expedients')
                .update({ status: 'parcialmente_resuelto' })
                .eq('id', expedient.id);
        }
    };

    // Observar expediente completo (auditor)
    const handleObserveExpedient = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try {
            await ExpedientService.observe(expedient.id, user.id, resolutionNotes);
            setResolutionNotes('');
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Reenviar observada (admin completa y reenvía)
    const handleResubmit = async () => {
        if (!user) return;
        setResolving(true);
        try {
            await ExpedientService.resubmitObserved(expedient.id, user.id, resolutionNotes || undefined);
            setResolutionNotes('');
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Apelar (ante denegación)
    const handleAppeal = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try {
            await ExpedientService.appeal(expedient.id, user.id, resolutionNotes);
            setResolutionNotes('');
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Anular expediente
    const handleCancel = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try {
            await ExpedientService.cancel(expedient.id, user.id, resolutionNotes);
            setResolutionNotes('');
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Mesa de control — aprobar
    const handleControlDeskApprove = async () => {
        if (!user) return;
        setResolving(true);
        try {
            await ExpedientService.approveControlDesk(expedient.id, user.id);
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Mesa de control — rechazar
    const handleControlDeskReject = async () => {
        if (!user || !resolutionNotes.trim()) return;
        setResolving(true);
        try {
            await ExpedientService.rejectControlDesk(expedient.id, user.id, resolutionNotes);
            setResolutionNotes('');
            await loadFullData();
        } catch {
            // Error
        }
        setResolving(false);
    };

    // Subir adjunto adicional (admin, observadas)
    const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files?.[0]) return;
        try {
            await ExpedientService.uploadAttachment(
                expedient.id,
                e.target.files[0],
                'otro',
                user.id,
            );
            const a = await ExpedientService.fetchAttachments(expedient.id);
            setAttachments(a);
        } catch {
            // Error
        }
    };

    // Imprimir constancia del expediente
    const handlePrintExpedient = () => {
        generateExpedientPDF(expedient);
    };

    // Imprimir constancia de práctica individual
    const handlePrintPractice = (practice: ExpedientPractice) => {
        generatePracticePDF(expedient, practice);
    };

    // Agregar nota (usa el canal activo como note_type)
    const handleAddNote = async () => {
        if (!user || !newNote.trim()) return;
        try {
            await ExpedientService.addNote({
                expedient_id: expedient.id,
                author_id: user.id,
                content: newNote,
                note_type: commChannel,
            });
            setNewNote('');
            const n = await ExpedientService.fetchNotes(expedient.id);
            setNotes(n);
        } catch {
            // Error
        }
    };

    const practices = expedient.practices || [];
    const resolvedCount = practices.filter(p =>
        ['autorizada', 'denegada', 'autorizada_parcial'].includes(p.status),
    ).length;

    const TABS = [
        { id: 'practicas' as const, label: `Prácticas (${practices.length})`, icon: Stethoscope },
        { id: 'adjuntos' as const, label: `Adjuntos (${attachments.length})`, icon: Paperclip },
        { id: 'notas' as const, label: `Comunicación (${notes.length})`, icon: MessageSquare },
        { id: 'historial' as const, label: 'Timeline', icon: History },
    ];

    // ── Asistente IA local (costo cero, sin API externa) ──────────────
    const handlePolishText = () => {
        if (!newNote.trim()) return;
        setAiLoading(true);
        const raw = newNote.trim();
        const sentence = raw.charAt(0).toUpperCase() + raw.slice(1);
        const withPeriod = sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?')
            ? sentence : sentence + '.';

        let polished: string;
        if (commChannel === 'para_afiliado') {
            const openers = [
                'Estimado/a afiliado/a, le informamos que ',
                'Nos comunicamos para informarle que ',
                'En relación con su solicitud, le comunicamos que ',
                'A fin de brindarle la mejor atención, le indicamos que ',
            ];
            const opener = openers[raw.length % openers.length];
            polished = opener + withPeriod.charAt(0).toLowerCase() + withPeriod.slice(1)
                + ' Quedamos a su disposición ante cualquier consulta.';
        } else {
            const openers = [
                'Nota interna: ',
                'Para consideración del auditor: ',
                'Observación: ',
            ];
            const opener = openers[raw.length % openers.length];
            polished = opener + withPeriod;
        }
        setNewNote(polished);
        setAiLoading(false);
    };

    const handleGenerateSummary = () => {
        const practiceList = practices.map(p => `${p.practice_id} (${p.status})`).join(', ');
        const noteCount = notes.length;
        const lastNote = notes.length > 0 ? notes[notes.length - 1].content : 'Sin comunicaciones previas';
        const slaNote = (() => {
            const { calcBusinessHours } = require('@/services/slaService');
            const h = calcBusinessHours(expedient.created_at) as number;
            if (h < 24) return 'dentro del plazo verde';
            if (h <= 48) return 'en plazo amarillo';
            return 'con demora crítica (rojo)';
        })();
        const summary = `Solicitud ${expedient.expedient_number}: prácticas solicitadas: ${practiceList || 'sin prácticas'}. Estado actual: ${expedient.status}. ${noteCount} mensaje(s) registrado(s). Último mensaje: "${lastNote}". Tiempo de gestión: ${slaNote}.`;
        setAiSummary(summary);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header del expediente */}
            <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={onBack} className="md:hidden p-1 hover:bg-muted rounded">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className={`p-1.5 rounded-lg ${tc.color}`}>
                        <TypeIcon className="h-4 w-4" />
                    </div>
                    <span className="font-mono font-bold text-sm">{expedient.expedient_number}</span>
                    {expedient.priority === 'urgente' && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">Urgente</span>
                    )}
                    <div className="ml-auto">
                        <Badge className={sc.color}>{sc.label}</Badge>
                    </div>
                </div>

                {/* Barra de progreso */}
                {practices.length > 0 && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{resolvedCount}/{practices.length} prácticas resueltas</span>
                            <span>{Math.round((resolvedCount / practices.length) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 rounded-full"
                                style={{ width: `${(resolvedCount / practices.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Creado: {formatDate(expedient.created_at)}</span>
                    {expedient.assigned_to && <span>• Asignado</span>}
                    {expedient.resolved_at && <span>• Resuelto: {formatDate(expedient.resolved_at)}</span>}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 mt-3 flex-wrap">
                    {/* Tomar para revisión */}
                    {canResolve && !isMine && expedient.status === 'pendiente' && (
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            size="sm"
                            onClick={handleTake}
                            disabled={resolving}
                        >
                            {resolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                            Tomar para revisión
                        </Button>
                    )}

                    {/* Imprimir constancia (si hay prácticas autorizadas) */}
                    {hasAuthorizedPractices && (
                        <Button variant="outline" size="sm" onClick={handlePrintExpedient} title="Imprimir constancia">
                            <Printer className="h-4 w-4 mr-1" /> Constancia
                        </Button>
                    )}

                    {/* Reenviar observada (admin) */}
                    {isObserved && isAdmin && (
                        <Button
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                            size="sm"
                            onClick={handleResubmit}
                            disabled={resolving}
                        >
                            {resolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                            Reenviar a Auditoría
                        </Button>
                    )}

                    {/* Observar expediente (auditor → devuelve a admin) */}
                    {canResolve && isMine && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => setShowExpedientAction(showExpedientAction === 'observar' ? null : 'observar')}
                            title="Observar solicitud"
                        >
                            <AlertTriangle className="h-4 w-4 mr-1" /> Observar
                        </Button>
                    )}

                    {/* Apelar (ante denegación — admin o supervisor) */}
                    {isResolved && hasDeniedPractices && (isAdmin || isSupervisor) && expedient.status !== 'en_apelacion' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            title="Presenta apelación"
                        >
                            <Gavel className="h-4 w-4 mr-1" /> Apelar
                        </Button>
                    )}

                    {/* Anular expediente */}
                    {canResolve && (isMine || isAdmin || isSupervisor) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowExpedientAction(showExpedientAction === 'anular' ? null : 'anular')}
                            title="Anular solicitud"
                        >
                            <XOctagon className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Mesa de control (supervisor, si aplica) */}
                {expedient.requires_control_desk && expedient.control_desk_status === 'pendiente' && isSupervisor && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2">
                            <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                            Mesa de Control
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                            Este expediente requiere aprobación de mesa de control antes de pasar a auditoría.
                        </p>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleControlDeskApprove} disabled={resolving}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={handleControlDeskReject} disabled={resolving || !resolutionNotes.trim()}>
                                <XCircle className="h-4 w-4 mr-1" /> Rechazar
                            </Button>
                        </div>
                        <textarea
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Motivo de rechazo (solo si rechaza)..."
                            rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none mt-2"
                        />
                    </div>
                )}

                {/* Panel: Observar expediente (auditor) */}
                {showExpedientAction === 'observar' && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">
                            <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                            Observar Solicitud
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-400">
                            Devolver al administrativo con observaciones. Deberá completar documentación.
                        </p>
                        <textarea
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Detalle las observaciones (obligatorio)..."
                            rows={3}
                            className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs bg-background resize-none"
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-orange-600 hover:bg-orange-700"
                                onClick={handleObserveExpedient}
                                disabled={resolving || !resolutionNotes.trim()}
                            >
                                <AlertTriangle className="h-4 w-4 mr-1" /> Confirmar Observación
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowExpedientAction(null)}>Cancelar</Button>
                        </div>
                    </div>
                )}

                {/* Panel: Anular expediente */}
                {showExpedientAction === 'anular' && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">
                            <XOctagon className="h-3.5 w-3.5 inline mr-1" />
                            Anular Solicitud
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400">
                            Esta acción es irreversible. La solicitud quedará anulada permanentemente.
                        </p>
                        <textarea
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Motivo de anulación (obligatorio)..."
                            rows={2}
                            className="w-full border border-red-200 rounded-lg px-3 py-2 text-xs bg-background resize-none"
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-red-600 hover:bg-red-700"
                                onClick={handleCancel}
                                disabled={resolving || !resolutionNotes.trim()}
                            >
                                <XOctagon className="h-4 w-4 mr-1" /> Confirmar Anulación
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowExpedientAction(null)}>Cancelar</Button>
                        </div>
                    </div>
                )}

                {/* Panel: Expediente observado — Admin puede reenviar */}
                {isObserved && isAdmin && showExpedientAction !== 'anular' && (
                    <div className="mt-3 p-3 border border-orange-200 dark:border-orange-800 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 space-y-2">
                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">
                            ⚠ Solicitud observada por el auditor
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Adjunte documentación adicional y reenvíe a auditoría.
                        </p>
                        <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            <Upload className="h-4 w-4" />
                            Adjuntar documentación
                            <input type="file" className="hidden" onChange={handleUploadAttachment} accept="image/*,.pdf" />
                        </label>
                        <textarea
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Notas adicionales para el auditor..."
                            rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none"
                        />
                    </div>
                )}

                {/* Panel: Apelación (admin/supervisor ante denegación) */}
                {isResolved && hasDeniedPractices && expedient.status !== 'en_apelacion' && (isAdmin || isSupervisor) && (
                    <div className="mt-3 p-3 border border-red-200 dark:border-red-800 rounded-xl bg-red-50/50 dark:bg-red-950/20 space-y-2">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
                            ⚖️ Apelación
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Presente documentación adicional y fundamentos para revertir la denegación.
                        </p>
                        <textarea
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Fundamentos de la apelación (obligatorio)..."
                            rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none"
                        />
                        <Button
                            size="sm"
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={handleAppeal}
                            disabled={resolving || !resolutionNotes.trim()}
                        >
                            <Gavel className="h-4 w-4 mr-2" /> Presentar Apelación
                        </Button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido del tab */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-30" />
                        <p className="text-sm">Cargando solicitud...</p>
                    </div>
                ) : (
                    <>
                        {/* ── TAB: Prácticas ── */}
                        {tab === 'practicas' && (
                            <>
                                {/* Datos del afiliado */}
                                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                                    <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Afiliado</p>
                                    <p><span className="text-muted-foreground">ID:</span> {String(expedient.affiliate_id).slice(0, 12)}...</p>
                                    {expedient.family_member_relation && (
                                        <p><span className="text-muted-foreground">Parentesco:</span> {expedient.family_member_relation}</p>
                                    )}
                                    {expedient.affiliate_plan_id && (
                                        <p><span className="text-muted-foreground">Plan:</span> #{expedient.affiliate_plan_id}</p>
                                    )}
                                    {expedient.request_notes && (
                                        <p className="italic text-muted-foreground mt-1">&quot;{expedient.request_notes}&quot;</p>
                                    )}
                                </div>

                                {/* Motor de reglas global */}
                                {expedient.rules_result && (
                                    <div className={`rounded-xl p-3 text-sm border ${expedient.rules_result === 'verde' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' :
                                        expedient.rules_result === 'amarillo' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' :
                                            'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                                        }`}>
                                        <p className="font-bold text-[10px] uppercase tracking-widest mb-1">Motor de Reglas</p>
                                        <p className="font-semibold">
                                            Resultado global: <span className="uppercase">{expedient.rules_result}</span>
                                        </p>
                                    </div>
                                )}

                                {/* Lista de prácticas */}
                                <div className="space-y-2">
                                    <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
                                        Prácticas solicitadas
                                    </p>
                                    {practices.map((p, idx) => {
                                        const ps = PRACTICE_STATUS_CONFIG[p.status];
                                        const PStatusIcon = ps.icon;
                                        const isSelected = selectedPractice?.id === p.id;
                                        const canResolvePractice = canResolve && (isMine || expedient.status === 'pendiente') &&
                                            ['pendiente', 'en_revision', 'observada'].includes(p.status);

                                        return (
                                            <div key={p.id} className={`border rounded-xl overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border/50'
                                                }`}>
                                                {/* Cabecera de la práctica */}
                                                <div
                                                    className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors ${canResolvePractice ? '' : 'opacity-70'
                                                        }`}
                                                    onClick={() => {
                                                        if (canResolvePractice) {
                                                            setSelectedPractice(isSelected ? null : p);
                                                            setResolutionAction(null);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                Práctica #{p.practice_id}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                                <span>Cant: {p.quantity}</span>
                                                                {p.practice_value != null && (
                                                                    <span>• ${p.practice_value.toLocaleString()}</span>
                                                                )}
                                                                {p.rule_result && (
                                                                    <span className={`px-1 py-0.5 rounded text-[10px] font-bold uppercase ${RULE_COLORS[p.rule_result]}`}>
                                                                        {p.rule_result}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Badge className={`${ps.color} text-[10px] gap-1`}>
                                                            <PStatusIcon className="h-3 w-3" />
                                                            {ps.label}
                                                        </Badge>
                                                        {canResolvePractice && (
                                                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Autorización (si ya fue resuelta) */}
                                                {p.authorization_code && (
                                                    <div className="px-3 pb-2 border-t bg-green-50/50 dark:bg-green-950/20">
                                                        <div className="flex items-center justify-between py-2">
                                                            <div>
                                                                <p className="text-xs text-green-700 dark:text-green-400 font-semibold">Autorización</p>
                                                                <p className="font-mono font-bold text-green-800 dark:text-green-300">{p.authorization_code}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {p.authorization_expiry && (
                                                                    <p className="text-xs text-green-600">Vence: {formatShortDate(p.authorization_expiry)}</p>
                                                                )}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handlePrintPractice(p); }}
                                                                    className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                                                    title="Imprimir constancia de esta práctica"
                                                                >
                                                                    <Printer className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Mensajes del motor de reglas */}
                                                {p.rule_messages && p.rule_messages.length > 0 && isSelected && (
                                                    <div className="px-3 py-2 border-t bg-muted/20">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Alertas del motor</p>
                                                        {p.rule_messages.map((msg, i) => (
                                                            <p key={i} className="text-xs text-muted-foreground">• {msg}</p>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Resolución (si fue denegada o tiene notas) */}
                                                {p.resolution_notes && !isSelected && (
                                                    <div className="px-3 py-2 border-t bg-muted/10">
                                                        <p className="text-xs italic text-muted-foreground">{p.resolution_notes}</p>
                                                    </div>
                                                )}

                                                {/* Panel de resolución expandido */}
                                                {isSelected && canResolvePractice && (
                                                    <div className="border-t p-3 bg-muted/10 space-y-3">
                                                        {/* Acciones de resolución */}
                                                        {!resolutionAction && (
                                                            <div className="grid grid-cols-5 gap-1.5">
                                                                <button
                                                                    onClick={() => setResolutionAction('autorizar')}
                                                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-700 dark:text-green-400"
                                                                >
                                                                    <CheckCircle className="h-5 w-5" />
                                                                    <span className="text-[10px] font-semibold">Autorizar</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => setResolutionAction('parcial')}
                                                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-indigo-700 dark:text-indigo-400"
                                                                >
                                                                    <AlertTriangle className="h-5 w-5" />
                                                                    <span className="text-[10px] font-semibold">Parcial</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => setResolutionAction('observar')}
                                                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-orange-700 dark:text-orange-400"
                                                                >
                                                                    <Eye className="h-5 w-5" />
                                                                    <span className="text-[10px] font-semibold">Observar</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => setResolutionAction('diferir')}
                                                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-400"
                                                                >
                                                                    <Pause className="h-5 w-5" />
                                                                    <span className="text-[10px] font-semibold">Diferir</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => setResolutionAction('denegar')}
                                                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-700 dark:text-red-400"
                                                                >
                                                                    <XCircle className="h-5 w-5" />
                                                                    <span className="text-[10px] font-semibold">Denegar</span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Formulario de resolución */}
                                                        {resolutionAction && (
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                                        {resolutionAction === 'autorizar' && '✅ Autorizar'}
                                                                        {resolutionAction === 'parcial' && '🔄 Autorización Parcial'}
                                                                        {resolutionAction === 'observar' && '👁️ Observar'}
                                                                        {resolutionAction === 'diferir' && '⏰ Diferir'}
                                                                        {resolutionAction === 'denegar' && '❌ Denegar'}
                                                                    </p>
                                                                    <button
                                                                        onClick={() => setResolutionAction(null)}
                                                                        className="text-xs text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>

                                                                {/* Diagnóstico (autorizar/parcial/denegar) */}
                                                                {['autorizar', 'parcial', 'denegar'].includes(resolutionAction) && (
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <Input
                                                                            placeholder="CIE-10"
                                                                            value={diagnosisCode}
                                                                            onChange={e => setDiagnosisCode(e.target.value)}
                                                                            className="h-8 text-xs"
                                                                        />
                                                                        <Input
                                                                            placeholder="Descripción diagnóstico"
                                                                            value={diagnosisDesc}
                                                                            onChange={e => setDiagnosisDesc(e.target.value)}
                                                                            className="h-8 text-xs"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Cobertura (autorizar/parcial) */}
                                                                {['autorizar', 'parcial'].includes(resolutionAction) && (
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-xs text-muted-foreground whitespace-nowrap">Cobertura:</label>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            max={100}
                                                                            value={coveragePercent}
                                                                            onChange={e => setCoveragePercent(Number(e.target.value))}
                                                                            className="h-8 text-xs w-20"
                                                                        />
                                                                        <span className="text-xs text-muted-foreground">%</span>
                                                                        {p.practice_value != null && (
                                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                                = ${((p.practice_value * coveragePercent) / 100).toLocaleString()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Cantidad ajustada (parcial) */}
                                                                {resolutionAction === 'parcial' && (
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-xs text-muted-foreground whitespace-nowrap">Cantidad:</label>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={p.quantity}
                                                                            value={adjustedQuantity}
                                                                            onChange={e => setAdjustedQuantity(Number(e.target.value))}
                                                                            className="h-8 text-xs w-20"
                                                                        />
                                                                        <span className="text-xs text-muted-foreground">de {p.quantity} solicitadas</span>
                                                                    </div>
                                                                )}

                                                                {/* Fecha de revisión (diferir) */}
                                                                {resolutionAction === 'diferir' && (
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-xs text-muted-foreground whitespace-nowrap">Revisar el:</label>
                                                                        <Input
                                                                            type="date"
                                                                            value={reviewDate}
                                                                            onChange={e => setReviewDate(e.target.value)}
                                                                            className="h-8 text-xs"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Notas */}
                                                                <textarea
                                                                    value={resolutionNotes}
                                                                    onChange={e => setResolutionNotes(e.target.value)}
                                                                    placeholder={
                                                                        resolutionAction === 'denegar' ? 'Motivo de denegación (obligatorio)...' :
                                                                            resolutionAction === 'observar' ? 'Qué falta o debe corregirse...' :
                                                                                'Observaciones...'
                                                                    }
                                                                    rows={2}
                                                                    className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none"
                                                                />

                                                                {/* Botón enviar */}
                                                                <Button
                                                                    size="sm"
                                                                    onClick={handleResolvePractice}
                                                                    disabled={
                                                                        resolving ||
                                                                        (resolutionAction === 'denegar' && !resolutionNotes) ||
                                                                        (resolutionAction === 'observar' && !resolutionNotes) ||
                                                                        (resolutionAction === 'diferir' && !reviewDate)
                                                                    }
                                                                    className={`w-full ${resolutionAction === 'autorizar' ? 'bg-green-600 hover:bg-green-700' :
                                                                        resolutionAction === 'parcial' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                                                            resolutionAction === 'denegar' ? 'bg-red-600 hover:bg-red-700' :
                                                                                resolutionAction === 'observar' ? 'bg-orange-600 hover:bg-orange-700' :
                                                                                    'bg-slate-600 hover:bg-slate-700'
                                                                        }`}
                                                                >
                                                                    {resolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                                    Confirmar{' '}
                                                                    {resolutionAction === 'autorizar' && 'autorización'}
                                                                    {resolutionAction === 'parcial' && 'autorización parcial'}
                                                                    {resolutionAction === 'denegar' && 'denegación'}
                                                                    {resolutionAction === 'observar' && 'observación'}
                                                                    {resolutionAction === 'diferir' && 'diferimiento'}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* ── TAB: Adjuntos ── */}
                        {tab === 'adjuntos' && (
                            <>
                                {attachments.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Sin documentos adjuntos</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {attachments.map(a => (
                                            <div key={a.id} className="flex items-center justify-between p-3 border rounded-xl">
                                                <div className="flex items-center gap-2">
                                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium">{a.file_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {a.document_type.replace('_', ' ')} • {a.file_size ? `${(a.file_size / 1024).toFixed(0)} KB` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={async () => {
                                                    const url = await ExpedientService.getAttachmentUrl(a.storage_path);
                                                    window.open(url, '_blank');
                                                }}>
                                                    Ver
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── TAB: Comunicación ── */}
                        {tab === 'notas' && (
                            <>
                                {/* Selector de canal */}
                                <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-3">
                                    <button
                                        onClick={() => { setCommChannel('interna'); setAiSummary(null); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${commChannel === 'interna' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        🔒 Interno
                                    </button>
                                    <button
                                        onClick={() => { setCommChannel('para_afiliado'); setAiSummary(null); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${commChannel === 'para_afiliado' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        📢 Afiliado
                                    </button>
                                </div>

                                {/* Botones de resumen IA */}
                                <button
                                    onClick={handleGenerateSummary}
                                    className="w-full mb-3 flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-dashed rounded-lg hover:border-primary/50 transition-colors"
                                >
                                    ✨ Generar resumen de esta solicitud
                                </button>
                                {aiSummary && (
                                    <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                                        <p className="font-bold text-[10px] uppercase tracking-wider mb-1">📋 Resumen IA</p>
                                        <p>{aiSummary}</p>
                                    </div>
                                )}

                                {/* Lista de mensajes filtrada por canal */}
                                <div className="space-y-3">
                                    {notes.filter(n => {
                                        if (commChannel === 'para_afiliado') return n.note_type === 'para_afiliado';
                                        return n.note_type === 'interna' || n.note_type === 'sistema' || n.note_type === 'resolucion';
                                    }).length === 0 && (
                                            <p className="text-center text-sm text-muted-foreground py-4">Sin mensajes en este canal</p>
                                        )}
                                    {notes.filter(n => {
                                        if (commChannel === 'para_afiliado') return n.note_type === 'para_afiliado';
                                        return n.note_type === 'interna' || n.note_type === 'sistema' || n.note_type === 'resolucion';
                                    }).map(n => (
                                        <div key={n.id} className={`p-3 rounded-xl text-sm ${n.note_type === 'sistema' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800' :
                                            n.note_type === 'resolucion' ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800' :
                                                n.note_type === 'para_afiliado' ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800' :
                                                    'bg-muted/30'
                                            }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-[10px] uppercase tracking-wider">{n.note_type.replace('_', ' ')}</span>
                                                <span className="text-[10px] opacity-70">{formatDate(n.created_at)}</span>
                                            </div>
                                            <p>{n.content}</p>
                                            {n.status_from && n.status_to && (
                                                <p className="text-[10px] mt-1 opacity-70">{n.status_from} → {n.status_to}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Respuestas Rápidas según canal */}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {commChannel === 'para_afiliado' ? (
                                        <>
                                            {(['📎 Adjuntar pedido médico', '📋 Adjuntar Historia Clínica', '🔬 Adjuntar estudios complementarios'] as const).map(txt => (
                                                <button
                                                    key={txt}
                                                    onClick={() => setNewNote(txt)}
                                                    className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors"
                                                >
                                                    {txt}
                                                </button>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {(['⭐ Consultar prioridad clínica', '👥 Pedir segunda opinión médica'] as const).map(txt => (
                                                <button
                                                    key={txt}
                                                    onClick={() => setNewNote(txt)}
                                                    className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    {txt}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>

                                {/* Input de mensaje */}
                                <div className="flex gap-2 mt-3">
                                    <Input
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        placeholder={commChannel === 'para_afiliado' ? 'Mensaje para el afiliado...' : 'Nota interna del equipo...'}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                                        className="h-9"
                                    />
                                    {/* Botón IA: pulir texto */}
                                    <button
                                        onClick={handlePolishText}
                                        disabled={!newNote.trim() || aiLoading}
                                        title="Pulir texto con IA"
                                        className="h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                                    >
                                        <span className="text-sm">✨</span>
                                    </button>
                                    <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim()} className="h-9 w-9 shrink-0">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}


                        {/* ── TAB: Timeline ── */}
                        {tab === 'historial' && (
                            <div className="relative">
                                <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                                <div className="space-y-4">
                                    {log.length === 0 && (
                                        <p className="text-center text-sm text-muted-foreground py-4">Sin historial</p>
                                    )}
                                    {log.map(l => (
                                        <div key={l.id} className="flex items-start gap-4 relative">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shrink-0 z-10">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            </div>
                                            <div className="flex-1 pb-2">
                                                <p className="text-sm font-medium">{formatAction(l.action)}</p>
                                                <p className="text-[10px] text-muted-foreground">{formatDate(l.performed_at)}</p>
                                                {Object.keys(l.details).length > 0 && (
                                                    <pre className="text-[10px] bg-muted/30 rounded-lg p-2 mt-1 overflow-x-auto">
                                                        {JSON.stringify(l.details, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Helper para formatear acciones del log
function formatAction(action: string): string {
    const map: Record<string, string> = {
        created: '📥 Solicitud creada',
        taken_for_review: '👁️ Tomada para revisión',
        practice_authorized: '✅ Práctica autorizada',
        practice_authorized_partial: '🔄 Práctica autorizada parcialmente',
        practice_denied: '❌ Práctica denegada',
        practice_observed: '⏸️ Práctica observada',
        practice_deferred: '⏰ Práctica diferida',
        auto_approved: '🤖 Auto-aprobación por motor de reglas',
        observed: '👁️ Solicitud observada',
        resubmitted: '🔁 Reenviada tras observación',
        appealed: '📣 Apelación presentada',
        cancelled: '🚫 Solicitud anulada',
        reassigned: '🔄 Reasignada',
        attachment_added: '📎 Adjunto agregado',
        control_desk_approved: '✅ Mesa de control: aprobada',
        control_desk_rejected: '❌ Mesa de control: rechazada',
    };
    return map[action] || action.replace(/_/g, ' ');
}

// ── Página principal: Bandeja de Auditoría ──

export default function AuditRequestsPage() {
    const { activeJurisdiction } = useJurisdiction();
    const { user } = useAuth();
    const [expedients, setExpedients] = useState<Expedient[]>([]);
    const [selectedExpedient, setSelectedExpedient] = useState<Expedient | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<ExpedientType | 'todas'>('todas');
    const [filterStatus, setFilterStatus] = useState<'pendientes' | ExpedientStatus>('pendientes');
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

                if (filterStatus === 'pendientes') {
                    result = await ExpedientService.fetchPending(
                        activeJurisdiction.id,
                        filterType !== 'todas' ? filterType : undefined,
                    );
                } else {
                    const { data } = await ExpedientService.fetchAll({
                        jurisdiction_id: activeJurisdiction.id,
                        type: filterType !== 'todas' ? filterType : undefined,
                        status: filterStatus,
                        limit: 100,
                    });
                    result = data;
                }

                if (!cancelled) {
                    setExpedients(result);
                }

                // Cargar contadores
                const c = await ExpedientService.getCounts(activeJurisdiction.id);
                if (!cancelled) {
                    setCounts(c);
                }
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

    // Filtrar por búsqueda local
    const filtered = expedients.filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            e.expedient_number?.toLowerCase().includes(q) ||
            String(e.affiliate_id).toLowerCase().includes(q) ||
            e.request_notes?.toLowerCase().includes(q)
        );
    });

    const pendingTotal = counts.pendiente + counts.en_revision + counts.observada + counts.parcialmente_resuelto;

    // Tabs de estado para la bandeja
    const statusTabs: Array<{ key: 'pendientes' | ExpedientStatus; label: string; count: number; color: string }> = [
        { key: 'pendientes', label: 'Pendientes', count: pendingTotal, color: 'bg-yellow-100 text-yellow-800 ring-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-700' },
        { key: 'resuelto', label: 'Resueltos', count: counts.resuelto, color: 'bg-green-100 text-green-800 ring-green-300 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-700' },
        { key: 'en_apelacion', label: 'Apelaciones', count: counts.en_apelacion, color: 'bg-red-100 text-red-700 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700' },
        { key: 'anulada', label: 'Anuladas', count: counts.anulada, color: 'bg-gray-100 text-gray-600 ring-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700' },
    ];

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
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
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
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
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por número, afiliado..."
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
                </div>
            </div>

            {/* Body: Split list + detail */}
            <div className="flex-1 flex overflow-hidden">
                {/* Lista */}
                <div className={`${selectedExpedient ? 'w-2/5 border-r hidden md:block' : 'w-full'} overflow-y-auto`}>
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
                    <div className="flex-1 overflow-hidden md:block">
                        <ExpedientDetail
                            expedient={selectedExpedient}
                            onAction={handleAction}
                            onBack={() => setSelectedExpedient(null)}
                        />
                    </div>
                )}

                {/* Empty state cuando no hay selección en desktop */}
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
