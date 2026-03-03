'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { AuditRequestService } from '@/services/auditRequestService';
import { createClient } from '@/lib/supabase';
import {
    Search,
    Upload,
    AlertCircle,
    CheckCircle,
    Stethoscope,
    FlaskConical,
    Building2,
    ArrowLeft,
    Paperclip,
    X,
    Send,
} from 'lucide-react';
import Link from 'next/link';
import type { AuditRequestType, Affiliate, Practice, AuditRequestAttachment } from '@/types/database';

const supabase = createClient();

const TYPES: { value: AuditRequestType; label: string; icon: React.ElementType; cls: string }[] = [
    { value: 'ambulatoria', label: 'Ambulatoria', icon: Stethoscope, cls: 'text-blue-600 bg-blue-50 border-blue-300' },
    { value: 'bioquimica', label: 'Bioquímica', icon: FlaskConical, cls: 'text-emerald-600 bg-emerald-50 border-emerald-300' },
    { value: 'internacion', label: 'Internación', icon: Building2, cls: 'text-purple-600 bg-purple-50 border-purple-300' },
];

const DOC_TYPES: { value: AuditRequestAttachment['document_type']; label: string }[] = [
    { value: 'orden_medica', label: 'Orden médica' },
    { value: 'receta', label: 'Receta' },
    { value: 'estudio', label: 'Estudio previo' },
    { value: 'informe', label: 'Informe médico' },
    { value: 'consentimiento', label: 'Consentimiento' },
    { value: 'otro', label: 'Otro' },
];

interface PendingFile {
    file: File;
    documentType: AuditRequestAttachment['document_type'];
}

export default function NewRequestPage() {
    const { user } = useAuth();
    const { activeJurisdiction } = useJurisdiction();

    // Tipo
    const [requestType, setRequestType] = useState<AuditRequestType>('ambulatoria');

    // Afiliado
    const [affSearch, setAffSearch] = useState('');
    const [affResults, setAffResults] = useState<Affiliate[]>([]);
    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [searchingAff, setSearchingAff] = useState(false);

    // Práctica
    const [pracSearch, setPracSearch] = useState('');
    const [pracResults, setPracResults] = useState<Practice[]>([]);
    const [practice, setPractice] = useState<Practice | null>(null);
    const [searchingPrac, setSearchingPrac] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [estDays, setEstDays] = useState(1);

    // Extras
    const [priority, setPriority] = useState<'normal' | 'urgente'>('normal');
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [docType, setDocType] = useState<AuditRequestAttachment['document_type']>('orden_medica');

    // Estado
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedNumber, setSubmittedNumber] = useState('');
    const [error, setError] = useState('');

    // ── Búsquedas con debounce ──
    const searchAffs = useCallback(async (q: string) => {
        if (q.length < 2) { setAffResults([]); return; }
        setSearchingAff(true);
        try {
            const { data } = await supabase
                .from('affiliates')
                .select('*')
                .or(`full_name.ilike.%${q}%,document_number.ilike.%${q}%,affiliate_number.ilike.%${q}%`)
                .eq('jurisdiction_id', activeJurisdiction?.id || 1)
                .eq('status', 'activo')
                .limit(8);
            setAffResults((data || []) as Affiliate[]);
        } catch { setAffResults([]); }
        setSearchingAff(false);
    }, [activeJurisdiction]);

    const searchPracs = useCallback(async (q: string) => {
        if (q.length < 2) { setPracResults([]); return; }
        setSearchingPrac(true);
        try {
            const { data } = await supabase
                .from('practices')
                .select('*')
                .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
                .eq('jurisdiction_id', activeJurisdiction?.id || 1)
                .eq('is_active', true)
                .limit(10);
            setPracResults((data || []).map((p: Record<string, unknown>) => ({
                ...p,
                description: p.name as string,
                financial_value: (p.fixed_value as number) || 0,
            })) as Practice[]);
        } catch { setPracResults([]); }
        setSearchingPrac(false);
    }, [activeJurisdiction]);

    useEffect(() => {
        const t = setTimeout(() => { if (affSearch) searchAffs(affSearch); }, 300);
        return () => clearTimeout(t);
    }, [affSearch, searchAffs]);

    useEffect(() => {
        const t = setTimeout(() => { if (pracSearch) searchPracs(pracSearch); }, 300);
        return () => clearTimeout(t);
    }, [pracSearch, searchPracs]);

    // ── Archivos ──
    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setFiles(prev => [...prev, ...Array.from(e.target.files!).map(f => ({ file: f, documentType: docType }))]);
        e.target.value = '';
    };

    // ── Enviar ──
    const canSubmit = !!affiliate && !!practice && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit || !user || !activeJurisdiction) return;
        setSubmitting(true);
        setError('');
        try {
            const req = await AuditRequestService.create({
                type: requestType,
                affiliate_id: String(affiliate.id),
                affiliate_plan_id: affiliate.plan_id,
                family_member_relation: affiliate.relationship,
                practice_id: practice.id,
                practice_quantity: quantity,
                practice_value: practice.financial_value,
                request_notes: notes || undefined,
                priority,
                estimated_days: requestType === 'internacion' ? estDays : undefined,
                created_by: user.id,
                jurisdiction_id: activeJurisdiction.id,
            });
            for (const pf of files) {
                await AuditRequestService.uploadAttachment(req.id, pf.file, pf.documentType, user.id);
            }
            setSubmittedNumber(req.request_number || req.id);
            setSubmitted(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al crear solicitud');
        }
        setSubmitting(false);
    };

    // ── Éxito ──
    if (submitted) {
        return (
            <div className="max-w-lg mx-auto p-6 mt-8">
                <div className="border border-green-200 bg-green-50/50 rounded-xl p-8 text-center">
                    <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-green-800 mb-1">Solicitud Enviada</h2>
                    <p className="text-3xl font-mono font-bold text-green-900 my-3">{submittedNumber}</p>
                    <p className="text-sm text-green-600 mb-5">Derivada a auditoría para revisión.</p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={() => {
                            setAffiliate(null); setPractice(null); setFiles([]); setNotes('');
                            setPriority('normal'); setQuantity(1); setEstDays(1); setSubmitted(false);
                            setAffSearch(''); setPracSearch('');
                        }}>
                            Nueva Solicitud
                        </Button>
                        <Link href="/audits/requests">
                            <Button variant="outline">Ver Bandeja</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Formulario único — todo en una pantalla ──
    return (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/audits/requests">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <h1 className="text-xl font-bold">Nueva Solicitud</h1>
            </div>

            {/* Tipo — 3 botones inline, default ambulatoria */}
            <div className="flex gap-2">
                {TYPES.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.value}
                            onClick={() => setRequestType(t.value)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all flex-1 justify-center ${
                                requestType === t.value ? `${t.cls} ring-1 ring-current/20` : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Afiliado */}
            <div className="space-y-2">
                <label className="text-sm font-semibold">Afiliado *</label>
                {!affiliate ? (
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Nombre, DNI o nro. afiliado..."
                            value={affSearch}
                            onChange={e => setAffSearch(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                        {searchingAff && <p className="text-xs text-muted-foreground mt-1">Buscando...</p>}
                        {affResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {affResults.map(a => (
                                    <button
                                        key={String(a.id)}
                                        onClick={() => { setAffiliate(a); setAffResults([]); setAffSearch(''); }}
                                        className="w-full px-3 py-2 text-left hover:bg-muted/50 text-sm border-b last:border-0"
                                    >
                                        <span className="font-medium">{a.full_name}</span>
                                        <span className="text-muted-foreground ml-2">DNI {a.document_number}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                        <div className="text-sm">
                            <span className="font-bold">{affiliate.full_name}</span>
                            <span className="text-muted-foreground ml-2">DNI {affiliate.document_number} • {affiliate.relationship || 'Titular'}</span>
                        </div>
                        <button onClick={() => { setAffiliate(null); setAffSearch(''); }} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Práctica */}
            <div className="space-y-2">
                <label className="text-sm font-semibold">Práctica *</label>
                {!practice ? (
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Código o nombre de práctica..."
                            value={pracSearch}
                            onChange={e => setPracSearch(e.target.value)}
                            className="pl-9"
                        />
                        {searchingPrac && <p className="text-xs text-muted-foreground mt-1">Buscando...</p>}
                        {pracResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {pracResults.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setPractice(p); setPracResults([]); setPracSearch(''); }}
                                        className="w-full px-3 py-2 text-left hover:bg-muted/50 text-sm border-b last:border-0 flex justify-between"
                                    >
                                        <span><span className="font-medium">{p.code}</span> — {p.description}</span>
                                        <span className="font-mono text-muted-foreground ml-2">${p.financial_value?.toLocaleString()}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                        <div className="text-sm">
                            <span className="font-bold">{practice.code}</span>
                            <span className="ml-1">{practice.description}</span>
                            <span className="text-muted-foreground ml-2">${practice.financial_value?.toLocaleString()}</span>
                        </div>
                        <button onClick={() => { setPractice(null); setPracSearch(''); }} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Fila: Cantidad + Prioridad + Días (si internación) */}
            <div className="flex gap-3 flex-wrap">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                    <Input type="number" min={1} max={100} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="w-20" />
                </div>

                {requestType === 'internacion' && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Días est.</label>
                        <Input type="number" min={1} max={365} value={estDays} onChange={e => setEstDays(parseInt(e.target.value) || 1)} className="w-20" />
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPriority('normal')}
                            className={`px-3 py-1.5 rounded text-sm font-medium border ${priority === 'normal' ? 'bg-slate-100 border-slate-300' : 'border-transparent text-muted-foreground'}`}
                        >Normal</button>
                        <button
                            onClick={() => setPriority('urgente')}
                            className={`px-3 py-1.5 rounded text-sm font-medium border ${priority === 'urgente' ? 'bg-red-100 border-red-300 text-red-700' : 'border-transparent text-muted-foreground'}`}
                        >🔴 Urgente</button>
                    </div>
                </div>
            </div>

            {/* Observaciones — una línea */}
            <div>
                <Input
                    placeholder="Observaciones para el auditor (opcional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />
            </div>

            {/* Adjuntos — compacto */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <select
                        value={docType}
                        onChange={e => setDocType(e.target.value as AuditRequestAttachment['document_type'])}
                        className="border rounded px-2 py-1.5 text-sm bg-background"
                    >
                        {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg cursor-pointer hover:bg-muted/50 text-sm">
                        <Upload className="h-3.5 w-3.5" />
                        Adjuntar
                        <input type="file" className="hidden" onChange={handleFileAdd} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
                    </label>
                    {files.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3 inline mr-0.5" />{files.length} archivo(s)
                        </span>
                    )}
                </div>
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {files.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                                {f.file.name.length > 20 ? f.file.name.slice(0, 18) + '…' : f.file.name}
                                <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Botón enviar */}
            <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-green-600 hover:bg-green-700 h-11 text-base"
            >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
        </div>
    );
}
