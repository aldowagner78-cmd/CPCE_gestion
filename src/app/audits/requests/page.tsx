'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { AuditRequestService } from '@/services/auditRequestService';
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
} from 'lucide-react';
import Link from 'next/link';
import type {
    AuditRequest,
    AuditRequestType,
    AuditRequestStatus,
    AuditRequestNote,
    AuditRequestAttachment,
    AuditRequestLog,
} from '@/types/database';

// ── Helpers de UI ──

const TYPE_CONFIG: Record<AuditRequestType, { label: string; icon: React.ElementType; color: string }> = {
    ambulatoria: { label: 'Ambulatoria', icon: Stethoscope, color: 'bg-blue-100 text-blue-700' },
    bioquimica: { label: 'Bioquímica', icon: FlaskConical, color: 'bg-emerald-100 text-emerald-700' },
    internacion: { label: 'Internación', icon: Building2, color: 'bg-purple-100 text-purple-700' },
};

const STATUS_CONFIG: Record<AuditRequestStatus, { label: string; color: string; icon: React.ElementType }> = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    en_revision: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800', icon: Eye },
    autorizada: { label: 'Autorizada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    denegada: { label: 'Denegada', color: 'bg-red-100 text-red-800', icon: XCircle },
    observada: { label: 'Observada', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    anulada: { label: 'Anulada', color: 'bg-gray-100 text-gray-600', icon: Ban },
    vencida: { label: 'Vencida', color: 'bg-gray-100 text-gray-500', icon: Clock },
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Componente: Lista de solicitudes ──

function RequestList({
    requests,
    onSelect,
    selectedId,
}: {
    requests: AuditRequest[];
    onSelect: (r: AuditRequest) => void;
    selectedId?: string;
}) {
    if (requests.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay solicitudes con estos filtros</p>
            </div>
        );
    }

    return (
        <div className="divide-y">
            {requests.map(r => {
                const tc = TYPE_CONFIG[r.type];
                const sc = STATUS_CONFIG[r.status];
                const TypeIcon = tc.icon;
                const StatusIcon = sc.icon;
                const isSelected = selectedId === r.id;

                return (
                    <button
                        key={r.id}
                        onClick={() => onSelect(r)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                            isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <TypeIcon className="h-4 w-4 shrink-0" />
                                <span className="font-mono text-xs text-muted-foreground">{r.request_number}</span>
                                {r.priority === 'urgente' && (
                                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">URGENTE</span>
                                )}
                            </div>
                            <Badge className={`${sc.color} text-xs shrink-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {sc.label}
                            </Badge>
                        </div>
                        <p className="font-medium mt-1 truncate">Afiliado #{String(r.affiliate_id).slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Práctica #{r.practice_id} • {formatDate(r.created_at)}
                        </p>
                        {r.request_notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate italic">
                                &quot;{r.request_notes}&quot;
                            </p>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ── Componente: Detalle de solicitud ──

function RequestDetail({
    request,
    onAction,
}: {
    request: AuditRequest;
    onAction: () => void;
}) {
    const { user } = useAuth();
    const [tab, setTab] = useState<'detalle' | 'adjuntos' | 'notas' | 'historial'>('detalle');
    const [notes, setNotes] = useState<AuditRequestNote[]>([]);
    const [attachments, setAttachments] = useState<AuditRequestAttachment[]>([]);
    const [log, setLog] = useState<AuditRequestLog[]>([]);

    // Resolución
    const [diagnosisCode, setDiagnosisCode] = useState(request.diagnosis_code || '');
    const [diagnosisDesc, setDiagnosisDesc] = useState(request.diagnosis_description || '');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [newNote, setNewNote] = useState('');
    const [resolving, setResolving] = useState(false);

    const tc = TYPE_CONFIG[request.type];
    const sc = STATUS_CONFIG[request.status];
    const TypeIcon = tc.icon;
    const isPending = ['pendiente', 'en_revision', 'observada'].includes(request.status);

    // Cargar datos del detalle
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            AuditRequestService.fetchNotes(request.id),
            AuditRequestService.fetchAttachments(request.id),
            AuditRequestService.fetchLog(request.id),
        ]).then(([n, a, l]) => {
            if (!cancelled) {
                setNotes(n);
                setAttachments(a);
                setLog(l);
            }
        });
        return () => { cancelled = true; };
    }, [request.id]);

    const reloadDetails = async () => {
        const [n, a, l] = await Promise.all([
            AuditRequestService.fetchNotes(request.id),
            AuditRequestService.fetchAttachments(request.id),
            AuditRequestService.fetchLog(request.id),
        ]);
        setNotes(n);
        setAttachments(a);
        setLog(l);
    };

    // Tomar para revisión
    const handleTake = async () => {
        if (!user) return;
        setResolving(true);
        try {
            await AuditRequestService.takeForReview(request.id, user.id);
            onAction();
        } catch {
            // Handle error
        }
        setResolving(false);
    };

    // Autorizar
    const handleAuthorize = async () => {
        if (!user || !diagnosisCode) return;
        setResolving(true);
        try {
            await AuditRequestService.authorize(request.id, user.id, {
                diagnosis_code: diagnosisCode,
                diagnosis_description: diagnosisDesc,
                resolution_notes: resolutionNotes,
                coverage_percent: request.coverage_percent || 80,
                covered_amount: request.covered_amount || (request.practice_value || 0) * 0.8,
                copay_amount: request.copay_amount || (request.practice_value || 0) * 0.2,
                practice_value: request.practice_value || 0,
            });
            onAction();
        } catch {
            // Handle error
        }
        setResolving(false);
    };

    // Denegar
    const handleDeny = async () => {
        if (!user || !resolutionNotes) return;
        setResolving(true);
        try {
            await AuditRequestService.deny(request.id, user.id, {
                resolution_notes: resolutionNotes,
                diagnosis_code: diagnosisCode || undefined,
                diagnosis_description: diagnosisDesc || undefined,
            });
            onAction();
        } catch {
            // Handle error
        }
        setResolving(false);
    };

    // Observar
    const handleObserve = async () => {
        if (!user || !resolutionNotes) return;
        setResolving(true);
        try {
            await AuditRequestService.observe(request.id, user.id, resolutionNotes);
            onAction();
        } catch {
            // Handle error
        }
        setResolving(false);
    };

    // Agregar nota
    const handleAddNote = async () => {
        if (!user || !newNote.trim()) return;
        try {
            await AuditRequestService.addNote({
                request_id: request.id,
                author_id: user.id,
                content: newNote,
                note_type: 'interna',
            });
            setNewNote('');
            reloadDetails();
        } catch {
            // Handle error
        }
    };

    const TABS = [
        { id: 'detalle' as const, label: 'Detalle', icon: FileText },
        { id: 'adjuntos' as const, label: `Adjuntos (${attachments.length})`, icon: Paperclip },
        { id: 'notas' as const, label: `Notas (${notes.length})`, icon: MessageSquare },
        { id: 'historial' as const, label: 'Historial', icon: History },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Header del detalle */}
            <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <TypeIcon className="h-5 w-5" />
                        <span className="font-mono font-bold">{request.request_number}</span>
                        {request.priority === 'urgente' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">URGENTE</span>
                        )}
                    </div>
                    <Badge className={sc.color}>{sc.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    Creada: {formatDate(request.created_at)}
                    {request.resolved_at && ` | Resuelta: ${formatDate(request.resolved_at)}`}
                </p>
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

            {/* Contenido del tab */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {tab === 'detalle' && (
                    <>
                        {/* Datos del afiliado */}
                        <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                            <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-2">Afiliado</p>
                            <p><span className="text-muted-foreground">ID:</span> {String(request.affiliate_id).slice(0, 8)}...</p>
                            {request.family_member_relation && (
                                <p><span className="text-muted-foreground">Parentesco:</span> {request.family_member_relation}</p>
                            )}
                            <p><span className="text-muted-foreground">Plan:</span> #{request.affiliate_plan_id}</p>
                        </div>

                        {/* Práctica */}
                        <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                            <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-2">Práctica Solicitada</p>
                            <p><span className="text-muted-foreground">ID:</span> #{request.practice_id}</p>
                            <p><span className="text-muted-foreground">Cantidad:</span> {request.practice_quantity}</p>
                            {request.practice_value && (
                                <p><span className="text-muted-foreground">Valor:</span> ${request.practice_value.toLocaleString()}</p>
                            )}
                            {request.coverage_percent != null && (
                                <p><span className="text-muted-foreground">Cobertura:</span> {request.coverage_percent}%</p>
                            )}
                            {request.copay_amount != null && (
                                <p><span className="text-muted-foreground">Coseguro:</span> ${request.copay_amount.toLocaleString()}</p>
                            )}
                        </div>

                        {/* Autorización (si existe) */}
                        {request.authorization_code && (
                            <div className="bg-green-50 rounded-lg p-3 space-y-1.5 text-sm border border-green-200">
                                <p className="font-bold text-xs text-green-700 uppercase tracking-widest mb-2">Autorización</p>
                                <p className="font-mono font-bold text-lg text-green-800">{request.authorization_code}</p>
                                {request.authorization_expiry && (
                                    <p className="text-green-600 text-xs">Vence: {request.authorization_expiry}</p>
                                )}
                            </div>
                        )}

                        {/* Notas del administrativo */}
                        {request.request_notes && (
                            <div className="bg-muted/30 rounded-lg p-3 text-sm">
                                <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-2">Observaciones del Administrativo</p>
                                <p className="italic">{request.request_notes}</p>
                            </div>
                        )}

                        {/* Resolución */}
                        {request.resolution_notes && (
                            <div className="bg-muted/30 rounded-lg p-3 text-sm">
                                <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-2">Resolución del Auditor</p>
                                <p>{request.resolution_notes}</p>
                                {request.diagnosis_code && (
                                    <p className="mt-1"><span className="text-muted-foreground">Diagnóstico:</span> {request.diagnosis_code} — {request.diagnosis_description}</p>
                                )}
                            </div>
                        )}
                    </>
                )}

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
                                    <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                                            const url = await AuditRequestService.getAttachmentUrl(a.storage_path);
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

                {tab === 'notas' && (
                    <>
                        <div className="space-y-3">
                            {notes.map(n => (
                                <div key={n.id} className={`p-3 rounded-lg text-sm ${
                                    n.note_type === 'sistema' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    n.note_type === 'resolucion' ? 'bg-green-50 text-green-700 border border-green-200' :
                                    n.note_type === 'para_afiliado' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                    'bg-muted/30'
                                }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-xs uppercase">{n.note_type.replace('_', ' ')}</span>
                                        <span className="text-xs opacity-70">{formatDate(n.created_at)}</span>
                                    </div>
                                    <p>{n.content}</p>
                                    {n.status_from && n.status_to && (
                                        <p className="text-xs mt-1 opacity-70">{n.status_from} → {n.status_to}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Agregar nota */}
                        <div className="flex gap-2 mt-4">
                            <Input
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                placeholder="Escribir nota interna..."
                                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                            />
                            <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                )}

                {tab === 'historial' && (
                    <div className="space-y-2">
                        {log.map(l => (
                            <div key={l.id} className="flex items-start gap-3 text-sm p-2">
                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                <div>
                                    <p className="font-medium">{l.action.replace('_', ' ')}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(l.performed_at)}</p>
                                    {Object.keys(l.details).length > 0 && (
                                        <pre className="text-xs bg-muted/30 rounded p-1 mt-1">
                                            {JSON.stringify(l.details, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Panel de resolución (solo si pendiente) */}
            {isPending && (
                <div className="border-t p-4 space-y-3 bg-muted/10">
                    <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Resolución</p>

                    {/* Diagnóstico (obligatorio para autorizar) */}
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            placeholder="Código CIE-10"
                            value={diagnosisCode}
                            onChange={e => setDiagnosisCode(e.target.value)}
                        />
                        <Input
                            placeholder="Descripción diagnóstico"
                            value={diagnosisDesc}
                            onChange={e => setDiagnosisDesc(e.target.value)}
                        />
                    </div>

                    <textarea
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        placeholder="Observaciones de la resolución..."
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
                    />

                    <div className="flex gap-2">
                        {request.status === 'pendiente' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleTake}
                                disabled={resolving}
                                className="text-blue-600"
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                Tomar
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleAuthorize}
                            disabled={resolving || !diagnosisCode}
                            className="bg-green-600 hover:bg-green-700 flex-1"
                        >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Autorizar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleObserve}
                            disabled={resolving || !resolutionNotes}
                            className="text-orange-600"
                        >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Observar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeny}
                            disabled={resolving || !resolutionNotes}
                            className="text-red-600"
                        >
                            <XCircle className="h-4 w-4 mr-1" />
                            Denegar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Página principal: Bandeja de Auditoría ──

export default function AuditRequestsPage() {
    const { activeJurisdiction } = useJurisdiction();
    const [requests, setRequests] = useState<AuditRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<AuditRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<AuditRequestType | 'todas'>('todas');
    const [filterStatus, setFilterStatus] = useState<AuditRequestStatus | 'pendientes'>('pendientes');
    const [reloadKey, setReloadKey] = useState(0);
    const [counts, setCounts] = useState<Record<AuditRequestStatus, number>>({
        pendiente: 0, en_revision: 0, autorizada: 0, denegada: 0, observada: 0, anulada: 0, vencida: 0,
    });

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!activeJurisdiction) return;
            setLoading(true);
            try {
                let result: AuditRequest[];

                if (filterStatus === 'pendientes') {
                    result = await AuditRequestService.fetchPending(
                        activeJurisdiction.id,
                        filterType !== 'todas' ? filterType : undefined,
                    );
                } else {
                    const { data } = await AuditRequestService.fetchAll({
                        jurisdiction_id: activeJurisdiction.id,
                        type: filterType !== 'todas' ? filterType : undefined,
                        status: filterStatus,
                        limit: 100,
                    });
                    result = data;
                }

                if (!cancelled) {
                    setRequests(result);
                }

                // Refresh counts
                const c = await AuditRequestService.getCounts(activeJurisdiction.id);
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

    const handleAction = () => {
        setSelectedRequest(null);
        setReloadKey(k => k + 1);
    };

    // Filtrar por búsqueda local
    const filtered = requests.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            r.request_number?.toLowerCase().includes(q) ||
            String(r.affiliate_id).toLowerCase().includes(q) ||
            r.request_notes?.toLowerCase().includes(q)
        );
    });

    const pendingTotal = counts.pendiente + counts.en_revision + counts.observada;

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
                            <h1 className="text-xl font-bold">Pendientes de Auditoría</h1>
                            <p className="text-sm text-muted-foreground">
                                {pendingTotal} pendiente{pendingTotal !== 1 ? 's' : ''} de resolución
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

                {/* Contadores */}
                <div className="flex gap-2 mb-3 overflow-x-auto">
                    <button
                        onClick={() => setFilterStatus('pendientes')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                            filterStatus === 'pendientes' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        Pendientes ({pendingTotal})
                    </button>
                    {Object.entries(STATUS_CONFIG).filter(([k]) => !['pendiente', 'en_revision', 'observada'].includes(k)).map(([key, cfg]) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key as AuditRequestStatus)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                filterStatus === key ? `${cfg.color} ring-1` : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {cfg.label} ({counts[key as AuditRequestStatus]})
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
                        onChange={e => setFilterType(e.target.value as AuditRequestType | 'todas')}
                        className="border rounded-md px-3 py-1 text-sm bg-background h-9"
                    >
                        <option value="todas">Todas</option>
                        <option value="ambulatoria">Ambulatorias</option>
                        <option value="bioquimica">Bioquímicas</option>
                        <option value="internacion">Internación</option>
                    </select>
                </div>
            </div>

            {/* Body: Split list + detail */}
            <div className="flex-1 flex overflow-hidden">
                {/* Lista */}
                <div className={`${selectedRequest ? 'w-2/5 border-r hidden md:block' : 'w-full'} overflow-y-auto`}>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Cargando solicitudes...</div>
                    ) : (
                        <RequestList
                            requests={filtered}
                            onSelect={setSelectedRequest}
                            selectedId={selectedRequest?.id}
                        />
                    )}
                </div>

                {/* Detalle */}
                {selectedRequest && (
                    <div className="flex-1 overflow-hidden md:block">
                        <RequestDetail
                            request={selectedRequest}
                            onAction={handleAction}
                        />
                    </div>
                )}

                {/* Empty state cuando no hay selección en desktop */}
                {!selectedRequest && (
                    <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <FileText className="h-16 w-16 mx-auto mb-3 opacity-20" />
                            <p className="text-lg">Seleccione una solicitud</p>
                            <p className="text-sm">para ver el detalle y tomar acciones</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
