'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { AuditRequestService } from '@/services/auditRequestService';
import { createClient } from '@/lib/supabase';
import {
    FileText,
    Search,
    Upload,
    Send,
    AlertCircle,
    CheckCircle,
    Stethoscope,
    FlaskConical,
    Building2,
    ArrowLeft,
    Paperclip,
    X,
    User,
} from 'lucide-react';
import Link from 'next/link';
import type { AuditRequestType, Affiliate, Practice, AuditRequestAttachment } from '@/types/database';

const supabase = createClient();

const REQUEST_TYPES: { value: AuditRequestType; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'ambulatoria', label: 'Ambulatoria', icon: Stethoscope, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'bioquimica', label: 'Bioquímica', icon: FlaskConical, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'internacion', label: 'Internación', icon: Building2, color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

const DOCUMENT_TYPES: { value: AuditRequestAttachment['document_type']; label: string }[] = [
    { value: 'orden_medica', label: 'Orden médica' },
    { value: 'receta', label: 'Receta' },
    { value: 'estudio', label: 'Estudio previo' },
    { value: 'informe', label: 'Informe médico' },
    { value: 'consentimiento', label: 'Consentimiento' },
    { value: 'otro', label: 'Otro documento' },
];

type Step = 1 | 2 | 3 | 4 | 5;

interface PendingFile {
    file: File;
    documentType: AuditRequestAttachment['document_type'];
}

export default function NewRequestPage() {
    const { user } = useAuth();
    const { activeJurisdiction } = useJurisdiction();

    // Wizard steps
    const [step, setStep] = useState<Step>(1);

    // Step 1: Tipo
    const [requestType, setRequestType] = useState<AuditRequestType | null>(null);

    // Step 2: Afiliado
    const [affiliateSearch, setAffiliateSearch] = useState('');
    const [affiliateResults, setAffiliateResults] = useState<Affiliate[]>([]);
    const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
    const [searchingAffiliate, setSearchingAffiliate] = useState(false);

    // Step 3: Práctica
    const [practiceSearch, setPracticeSearch] = useState('');
    const [practiceResults, setPracticeResults] = useState<Practice[]>([]);
    const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
    const [searchingPractice, setSearchingPractice] = useState(false);
    const [practiceQuantity, setPracticeQuantity] = useState(1);

    // Step 4: Adjuntos
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [currentDocType, setCurrentDocType] = useState<AuditRequestAttachment['document_type']>('orden_medica');

    // Step 5: Observaciones y envío
    const [requestNotes, setRequestNotes] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgente'>('normal');
    const [estimatedDays, setEstimatedDays] = useState<number>(0);

    // General state
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedNumber, setSubmittedNumber] = useState('');
    const [error, setError] = useState('');

    // ── Búsqueda de afiliados ──
    const searchAffiliates = useCallback(async (query: string) => {
        if (query.length < 2) { setAffiliateResults([]); return; }
        setSearchingAffiliate(true);
        try {
            const { data } = await supabase
                .from('affiliates')
                .select('*')
                .or(`full_name.ilike.%${query}%,document_number.ilike.%${query}%,affiliate_number.ilike.%${query}%`)
                .eq('jurisdiction_id', activeJurisdiction?.id || 1)
                .eq('status', 'activo')
                .limit(10);
            setAffiliateResults((data || []) as Affiliate[]);
        } catch {
            setAffiliateResults([]);
        }
        setSearchingAffiliate(false);
    }, [activeJurisdiction]);

    useEffect(() => {
        const timer = setTimeout(() => { if (affiliateSearch) searchAffiliates(affiliateSearch); }, 300);
        return () => clearTimeout(timer);
    }, [affiliateSearch, searchAffiliates]);

    // ── Búsqueda de prácticas ──
    const searchPractices = useCallback(async (query: string) => {
        if (query.length < 2) { setPracticeResults([]); return; }
        setSearchingPractice(true);
        try {
            const { data } = await supabase
                .from('practices')
                .select('*')
                .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
                .eq('jurisdiction_id', activeJurisdiction?.id || 1)
                .eq('is_active', true)
                .limit(15);
            // Map Supabase fields to Practice type
            setPracticeResults((data || []).map((p: Record<string, unknown>) => ({
                ...p,
                description: p.name as string,
                financial_value: (p.fixed_value as number) || 0,
            })) as Practice[]);
        } catch {
            setPracticeResults([]);
        }
        setSearchingPractice(false);
    }, [activeJurisdiction]);

    useEffect(() => {
        const timer = setTimeout(() => { if (practiceSearch) searchPractices(practiceSearch); }, 300);
        return () => clearTimeout(timer);
    }, [practiceSearch, searchPractices]);

    // ── Agregar archivo ──
    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles: PendingFile[] = Array.from(files).map(f => ({
            file: f,
            documentType: currentDocType,
        }));
        setPendingFiles(prev => [...prev, ...newFiles]);
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    // ── Enviar solicitud ──
    const handleSubmit = async () => {
        if (!requestType || !selectedAffiliate || !selectedPractice || !user || !activeJurisdiction) return;

        setSubmitting(true);
        setError('');

        try {
            // 1. Crear la solicitud
            const request = await AuditRequestService.create({
                type: requestType,
                affiliate_id: String(selectedAffiliate.id),
                affiliate_plan_id: selectedAffiliate.plan_id,
                family_member_relation: selectedAffiliate.relationship,
                practice_id: selectedPractice.id,
                practice_quantity: practiceQuantity,
                practice_value: selectedPractice.financial_value,
                request_notes: requestNotes || undefined,
                priority,
                estimated_days: requestType === 'internacion' ? estimatedDays : undefined,
                created_by: user.id,
                jurisdiction_id: activeJurisdiction.id,
            });

            // 2. Subir adjuntos
            for (const pf of pendingFiles) {
                await AuditRequestService.uploadAttachment(
                    request.id,
                    pf.file,
                    pf.documentType,
                    user.id,
                );
            }

            setSubmittedNumber(request.request_number || request.id);
            setSubmitted(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            setError(message);
        }

        setSubmitting(false);
    };

    // ── Validación por paso ──
    const canProceed = (s: Step): boolean => {
        switch (s) {
            case 1: return !!requestType;
            case 2: return !!selectedAffiliate;
            case 3: return !!selectedPractice;
            case 4: return true; // Adjuntos son opcionales
            case 5: return true;
            default: return false;
        }
    };

    // ── Pantalla de éxito ──
    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-8 text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-green-800 mb-2">Solicitud Enviada</h2>
                        <p className="text-green-700 mb-1">
                            Número de solicitud:
                        </p>
                        <p className="text-3xl font-mono font-bold text-green-900 mb-6">
                            {submittedNumber}
                        </p>
                        <p className="text-sm text-green-600 mb-6">
                            La solicitud fue derivada a auditoría. El auditor la revisará a la brevedad.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={() => {
                                setStep(1); setRequestType(null); setSelectedAffiliate(null);
                                setSelectedPractice(null); setPendingFiles([]); setRequestNotes('');
                                setPriority('normal'); setEstimatedDays(0); setSubmitted(false);
                            }}>
                                Nueva Solicitud
                            </Button>
                            <Link href="/audits">
                                <Button variant="outline">Ver Solicitudes</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/audits">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Nueva Solicitud de Auditoría</h1>
                    <p className="text-sm text-muted-foreground">Complete los pasos para generar la solicitud</p>
                </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className="flex items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            s < step ? 'bg-primary text-primary-foreground' :
                            s === step ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            {s < step ? '✓' : s}
                        </div>
                        {s < 5 && <div className={`h-1 flex-1 mx-1 rounded ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
                    </div>
                ))}
            </div>

            {/* Step 1: Tipo */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Paso 1: Tipo de solicitud
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {REQUEST_TYPES.map(rt => (
                                <button
                                    key={rt.value}
                                    onClick={() => setRequestType(rt.value)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                                        requestType === rt.value
                                            ? `${rt.color} border-current ring-2 ring-current/20`
                                            : 'border-border hover:border-muted-foreground/30'
                                    }`}
                                >
                                    <rt.icon className="h-8 w-8 mb-2" />
                                    <p className="font-semibold">{rt.label}</p>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Afiliado */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Paso 2: Seleccionar afiliado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, DNI o nro. de afiliado..."
                                value={affiliateSearch}
                                onChange={e => { setAffiliateSearch(e.target.value); setSelectedAffiliate(null); }}
                                className="pl-10"
                            />
                        </div>

                        {searchingAffiliate && <p className="text-sm text-muted-foreground">Buscando...</p>}

                        {affiliateResults.length > 0 && !selectedAffiliate && (
                            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                                {affiliateResults.map(a => (
                                    <button
                                        key={String(a.id)}
                                        onClick={() => { setSelectedAffiliate(a); setAffiliateResults([]); }}
                                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                                    >
                                        <p className="font-medium">{a.full_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            DNI: {a.document_number} | Nro: {a.affiliate_number || '—'} | {a.relationship || 'Titular'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedAffiliate && (
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg">{selectedAffiliate.full_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            DNI: {selectedAffiliate.document_number} | Nro: {selectedAffiliate.affiliate_number || '—'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedAffiliate.relationship || 'Titular'} | Plan ID: {selectedAffiliate.plan_id}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedAffiliate(null); setAffiliateSearch(''); }}>
                                        Cambiar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Práctica */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Paso 3: Práctica solicitada
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código o nombre de práctica..."
                                value={practiceSearch}
                                onChange={e => { setPracticeSearch(e.target.value); setSelectedPractice(null); }}
                                className="pl-10"
                            />
                        </div>

                        {searchingPractice && <p className="text-sm text-muted-foreground">Buscando...</p>}

                        {practiceResults.length > 0 && !selectedPractice && (
                            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                                {practiceResults.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setSelectedPractice(p); setPracticeResults([]); }}
                                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex justify-between">
                                            <p className="font-medium">{p.code} — {p.description}</p>
                                            <span className="text-sm font-mono text-muted-foreground">
                                                ${p.financial_value?.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{p.category}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedPractice && (
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{selectedPractice.code} — {selectedPractice.description}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Categoría: {selectedPractice.category} | Valor: ${selectedPractice.financial_value?.toLocaleString()}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPractice(null); setPracticeSearch(''); }}>
                                        Cambiar
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium">Cantidad/Sesiones:</label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={practiceQuantity}
                                onChange={e => setPracticeQuantity(parseInt(e.target.value) || 1)}
                                className="w-24"
                            />
                        </div>

                        {requestType === 'internacion' && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium">Días estimados de internación:</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={estimatedDays}
                                    onChange={e => setEstimatedDays(parseInt(e.target.value) || 0)}
                                    className="w-24"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Adjuntos */}
            {step === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5" />
                            Paso 4: Documentos adjuntos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Adjunte los documentos necesarios (órdenes médicas, recetas, estudios, etc.)
                        </p>

                        <div className="flex items-center gap-3">
                            <select
                                value={currentDocType}
                                onChange={e => setCurrentDocType(e.target.value as AuditRequestAttachment['document_type'])}
                                className="border rounded-md px-3 py-2 text-sm bg-background"
                            >
                                {DOCUMENT_TYPES.map(dt => (
                                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                                ))}
                            </select>

                            <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                <Upload className="h-4 w-4" />
                                <span className="text-sm font-medium">Seleccionar archivo</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileAdd}
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    multiple
                                />
                            </label>
                        </div>

                        {pendingFiles.length > 0 ? (
                            <div className="border rounded-lg divide-y">
                                {pendingFiles.map((pf, i) => (
                                    <div key={i} className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-2">
                                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">{pf.file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {DOCUMENT_TYPES.find(d => d.value === pf.documentType)?.label} • {(pf.file.size / 1024).toFixed(0)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeFile(i)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay archivos adjuntos aún</p>
                                <p className="text-xs">Puede continuar sin adjuntos</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Confirmación */}
            {step === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5" />
                            Paso 5: Confirmar y enviar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Resumen */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tipo:</span>
                                <span className="font-semibold capitalize">{requestType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Afiliado:</span>
                                <span className="font-semibold">{selectedAffiliate?.full_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">DNI:</span>
                                <span>{selectedAffiliate?.document_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Práctica:</span>
                                <span className="font-semibold">{selectedPractice?.code} — {selectedPractice?.description}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Valor:</span>
                                <span className="font-mono">${selectedPractice?.financial_value?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cantidad:</span>
                                <span>{practiceQuantity}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Adjuntos:</span>
                                <span>{pendingFiles.length} archivo(s)</span>
                            </div>
                            {requestType === 'internacion' && estimatedDays > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Días estimados:</span>
                                    <span>{estimatedDays}</span>
                                </div>
                            )}
                        </div>

                        {/* Prioridad */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium">Prioridad:</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPriority('normal')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                                        priority === 'normal' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-transparent text-muted-foreground'
                                    }`}
                                >
                                    Normal
                                </button>
                                <button
                                    onClick={() => setPriority('urgente')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                                        priority === 'urgente' ? 'bg-red-100 border-red-300 text-red-700' : 'border-transparent text-muted-foreground'
                                    }`}
                                >
                                    🔴 Urgente
                                </button>
                            </div>
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Observaciones (opcional):</label>
                            <textarea
                                value={requestNotes}
                                onChange={e => setRequestNotes(e.target.value)}
                                placeholder="Información adicional para el auditor..."
                                rows={3}
                                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => setStep(s => Math.max(1, s - 1) as Step)}
                    disabled={step === 1}
                >
                    Anterior
                </Button>

                {step < 5 ? (
                    <Button
                        onClick={() => setStep(s => Math.min(5, s + 1) as Step)}
                        disabled={!canProceed(step)}
                    >
                        Siguiente
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                    </Button>
                )}
            </div>
        </div>
    );
}
