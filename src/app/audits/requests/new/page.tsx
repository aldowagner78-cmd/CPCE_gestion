'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { AuditRequestService } from '@/services/auditRequestService';
import { createClient } from '@/lib/supabase';
import {
    Search, Upload, AlertCircle, CheckCircle,
    Stethoscope, FlaskConical, Building2,
    ArrowLeft, Paperclip, X, Send, Trash2,
    ChevronDown, ChevronUp, User,
    ShieldCheck, Package, DollarSign, Lock,
    BarChart3, Smile, Calendar, Phone, Mail,
    MapPin, FileText, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import type { AuditRequestType, Affiliate, Practice, AuditRequestAttachment } from '@/types/database';

const supabase = createClient();

// ── Helpers ──

function calcAge(birthDate: string | null | undefined): number | null {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
    return age;
}

function formatSpecialConditions(sc: unknown): string[] {
    if (!sc) return [];
    if (Array.isArray(sc)) return sc.filter(Boolean).map(String);
    if (typeof sc === 'object') return Object.entries(sc as Record<string, unknown>)
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/_/g, ' '));
    return [];
}

// ── Types locales ──

type ExtendedRequestType = AuditRequestType | 'odontologica' | 'programas_especiales' | 'elementos' | 'reintegros';

interface PracticeItem {
    practice: Practice;
    quantity: number;
}

interface ConsumptionItem {
    practiceCode: string;
    practiceName: string;
    count: number;
    lastDate: string;
}

interface PendingFile {
    file: File;
    documentType: AuditRequestAttachment['document_type'];
}

// ── Configuración de tipos de solicitud ──

const REQUEST_TYPES: {
    value: ExtendedRequestType;
    label: string;
    short: string;
    icon: React.ElementType;
    cls: string;
    enabled: boolean;
}[] = [
    { value: 'ambulatoria',          label: 'Ambulatoria',       short: 'Amb',  icon: Stethoscope, cls: 'text-blue-700 bg-blue-50 border-blue-300',       enabled: true },
    { value: 'bioquimica',           label: 'Bioquímica',        short: 'Bio',  icon: FlaskConical, cls: 'text-emerald-700 bg-emerald-50 border-emerald-300', enabled: true },
    { value: 'internacion',          label: 'Internación',       short: 'Int',  icon: Building2,    cls: 'text-purple-700 bg-purple-50 border-purple-300',   enabled: true },
    { value: 'odontologica',         label: 'Odontológica',      short: 'Odo',  icon: Smile,        cls: 'text-pink-700 bg-pink-50 border-pink-300',         enabled: false },
    { value: 'programas_especiales', label: 'Prog. Especiales',  short: 'Prog', icon: ShieldCheck,  cls: 'text-amber-700 bg-amber-50 border-amber-300',      enabled: false },
    { value: 'elementos',            label: 'Elementos',         short: 'Elem', icon: Package,      cls: 'text-cyan-700 bg-cyan-50 border-cyan-300',         enabled: false },
    { value: 'reintegros',           label: 'Reintegros',        short: 'Rein', icon: DollarSign,   cls: 'text-orange-700 bg-orange-50 border-orange-300',    enabled: false },
];

const DOC_TYPES: { value: AuditRequestAttachment['document_type']; label: string }[] = [
    { value: 'orden_medica',   label: 'Orden médica' },
    { value: 'receta',         label: 'Receta' },
    { value: 'estudio',        label: 'Estudio previo' },
    { value: 'informe',        label: 'Informe médico' },
    { value: 'consentimiento', label: 'Consentimiento' },
    { value: 'otro',           label: 'Otro' },
];

// ════════════════════════════════════════════════════════
// ═  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════

export default function NewRequestPage() {
    const { user } = useAuth();
    const { activeJurisdiction } = useJurisdiction();

    // ── Estado: Tipo ──
    const [requestType, setRequestType] = useState<ExtendedRequestType>('ambulatoria');

    // ── Estado: Afiliado ──
    const [affSearch, setAffSearch] = useState('');
    const [affResults, setAffResults] = useState<Affiliate[]>([]);
    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [searchingAff, setSearchingAff] = useState(false);
    const [planName, setPlanName] = useState('');

    // ── Estado: Consumos del afiliado ──
    const [consumptions, setConsumptions] = useState<ConsumptionItem[]>([]);
    const [showConsumptions, setShowConsumptions] = useState(false);
    const [loadingConsumptions, setLoadingConsumptions] = useState(false);

    // ── Estado: Prácticas (múltiples) ──
    const [pracSearch, setPracSearch] = useState('');
    const [pracResults, setPracResults] = useState<Practice[]>([]);
    const [searchingPrac, setSearchingPrac] = useState(false);
    const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);

    // ── Estado: Extras ──
    const [priority, setPriority] = useState<'normal' | 'urgente'>('normal');
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [docType, setDocType] = useState<AuditRequestAttachment['document_type']>('orden_medica');

    // ── Estado: Submit ──
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedNumbers, setSubmittedNumbers] = useState<string[]>([]);
    const [error, setError] = useState('');

    // ═══════════════════════════════════════════
    // ═  BÚSQUEDAS
    // ═══════════════════════════════════════════

    /** Búsqueda inteligente de afiliados: nombre, DNI o nro. afiliado */
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

    /** Búsqueda en nomenclador: código o descripción de práctica */
    const searchPracs = useCallback(async (q: string) => {
        if (q.length < 2) { setPracResults([]); return; }
        setSearchingPrac(true);
        try {
            const { data } = await supabase
                .from('practices')
                .select('*')
                .or(`name.ilike.%${q}%,code.ilike.%${q}%,description.ilike.%${q}%`)
                .eq('jurisdiction_id', activeJurisdiction?.id || 1)
                .eq('is_active', true)
                .order('code')
                .limit(15);
            setPracResults((data || []).map((p: Record<string, unknown>) => ({
                ...p,
                description: (p.description as string) || (p.name as string),
                financial_value: (p.fixed_value as number) || 0,
            })) as Practice[]);
        } catch { setPracResults([]); }
        setSearchingPrac(false);
    }, [activeJurisdiction]);

    // Debounce afiliados
    useEffect(() => {
        const t = setTimeout(() => { if (affSearch) searchAffs(affSearch); }, 300);
        return () => clearTimeout(t);
    }, [affSearch, searchAffs]);

    // Debounce prácticas
    useEffect(() => {
        const t = setTimeout(() => { if (pracSearch) searchPracs(pracSearch); }, 300);
        return () => clearTimeout(t);
    }, [pracSearch, searchPracs]);

    // ── Seleccionar / deseleccionar afiliado ──

    const selectAffiliate = useCallback(async (a: Affiliate) => {
        setAffiliate(a);
        setAffResults([]);
        setAffSearch('');
        if (a.plan_id) {
            const { data } = await supabase.from('plans').select('name').eq('id', a.plan_id).single();
            setPlanName((data as Record<string, unknown> | null)?.name as string || `Plan #${a.plan_id}`);
        } else {
            setPlanName('Sin plan');
        }
    }, []);

    const clearAffiliate = useCallback(() => {
        setAffiliate(null);
        setAffSearch('');
        setShowConsumptions(false);
        setConsumptions([]);
        setPlanName('');
    }, []);

    // ═══════════════════════════════════════════
    // ═  CONSUMOS DEL AFILIADO
    // ═══════════════════════════════════════════

    const fetchConsumptions = useCallback(async () => {
        if (!affiliate) return;
        setLoadingConsumptions(true);
        try {
            // Consultar audits y audit_requests en paralelo
            const [auditsRes, requestsRes] = await Promise.all([
                supabase
                    .from('audits')
                    .select('practice_id, created_at')
                    .eq('affiliate_id', String(affiliate.id))
                    .order('created_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('audit_requests')
                    .select('practice_id, created_at, practice_quantity')
                    .eq('affiliate_id', String(affiliate.id))
                    .order('created_at', { ascending: false })
                    .limit(200),
            ]);

            const allRecords = [...(auditsRes.data || []), ...(requestsRes.data || [])];
            const practiceIds = [...new Set(
                allRecords.map((r: Record<string, unknown>) => r.practice_id).filter(Boolean)
            )];

            if (practiceIds.length === 0) {
                setConsumptions([]);
                setShowConsumptions(true);
                setLoadingConsumptions(false);
                return;
            }

            // Obtener info de prácticas
            const { data: practices } = await supabase
                .from('practices')
                .select('id, code, name')
                .in('id', practiceIds);

            const practiceMap = new Map(
                (practices || []).map((p: Record<string, unknown>) => [p.id, p])
            );

            // Agrupar por práctica
            const grouped: Record<number, ConsumptionItem> = {};
            for (const r of allRecords) {
                const rec = r as Record<string, unknown>;
                const pid = rec.practice_id as number;
                if (!pid) continue;
                if (!grouped[pid]) {
                    const pInfo = practiceMap.get(pid) as Record<string, unknown> | undefined;
                    grouped[pid] = {
                        practiceCode: (pInfo?.code as string) || String(pid),
                        practiceName: (pInfo?.name as string) || 'Práctica',
                        count: 0,
                        lastDate: '',
                    };
                }
                grouped[pid].count += ((rec.practice_quantity as number) || 1);
                const date = rec.created_at as string;
                if (!grouped[pid].lastDate || date > grouped[pid].lastDate) {
                    grouped[pid].lastDate = date;
                }
            }

            setConsumptions(Object.values(grouped).sort((a, b) => b.count - a.count));
            setShowConsumptions(true);
        } catch {
            setConsumptions([]);
        }
        setLoadingConsumptions(false);
    }, [affiliate]);

    // ═══════════════════════════════════════════
    // ═  GESTIÓN DE PRÁCTICAS (MÚLTIPLES)
    // ═══════════════════════════════════════════

    const addPractice = (practice: Practice) => {
        if (practiceItems.some(pi => pi.practice.id === practice.id)) return;
        setPracticeItems(prev => [...prev, { practice, quantity: 1 }]);
        setPracSearch('');
        setPracResults([]);
    };

    const removePractice = (index: number) => {
        setPracticeItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, qty: number) => {
        setPracticeItems(prev =>
            prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, qty) } : item)
        );
    };

    // ═══════════════════════════════════════════
    // ═  ARCHIVOS
    // ═══════════════════════════════════════════

    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setFiles(prev => [
            ...prev,
            ...Array.from(e.target.files!).map(f => ({ file: f, documentType: docType })),
        ]);
        e.target.value = '';
    };

    // ═══════════════════════════════════════════
    // ═  ENVÍO
    // ═══════════════════════════════════════════

    const isTypeEnabled = REQUEST_TYPES.find(t => t.value === requestType)?.enabled ?? false;
    const canSubmit = !!affiliate && practiceItems.length > 0 && !submitting && isTypeEnabled;

    const handleSubmit = async () => {
        if (!canSubmit || !user || !activeJurisdiction) return;
        setSubmitting(true);
        setError('');
        try {
            const numbers: string[] = [];
            let firstRequestId = '';

            for (const item of practiceItems) {
                const req = await AuditRequestService.create({
                    type: requestType as AuditRequestType,
                    affiliate_id: String(affiliate!.id),
                    affiliate_plan_id: affiliate!.plan_id,
                    family_member_relation: affiliate!.relationship,
                    practice_id: item.practice.id,
                    practice_quantity: item.quantity,
                    practice_value: item.practice.financial_value,
                    request_notes: practiceItems.length > 1
                        ? `[Grupo de ${practiceItems.length} prácticas] ${notes}`.trim()
                        : (notes || undefined),
                    priority,
                    created_by: user.id,
                    jurisdiction_id: activeJurisdiction.id,
                });
                numbers.push(req.request_number || req.id);
                if (!firstRequestId) firstRequestId = req.id;
            }

            // Adjuntos al primer registro
            if (firstRequestId && files.length > 0) {
                for (const pf of files) {
                    await AuditRequestService.uploadAttachment(firstRequestId, pf.file, pf.documentType, user.id);
                }
            }

            setSubmittedNumbers(numbers);
            setSubmitted(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al crear solicitud');
        }
        setSubmitting(false);
    };

    const resetForm = () => {
        setAffiliate(null); setPracticeItems([]); setFiles([]); setNotes('');
        setPriority('normal'); setSubmitted(false); setSubmittedNumbers([]);
        setAffSearch(''); setPracSearch(''); setShowConsumptions(false);
        setConsumptions([]); setPlanName('');
    };

    // ═══════════════════════════════════════════
    // ═  VISTA DE ÉXITO
    // ═══════════════════════════════════════════

    if (submitted) {
        return (
            <div className="max-w-lg mx-auto p-6 mt-8">
                <div className="border border-green-200 bg-green-50/50 rounded-xl p-8 text-center">
                    <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-green-800 mb-1">
                        {submittedNumbers.length === 1 ? 'Solicitud Enviada' : `${submittedNumbers.length} Solicitudes Enviadas`}
                    </h2>
                    <div className="my-3 space-y-1">
                        {submittedNumbers.map(n => (
                            <p key={n} className="text-2xl font-mono font-bold text-green-900">{n}</p>
                        ))}
                    </div>
                    <p className="text-sm text-green-600 mb-5">Derivada(s) a auditoría para revisión.</p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={resetForm}>Nueva Solicitud</Button>
                        <Link href="/audits/requests"><Button variant="outline">Ver Bandeja</Button></Link>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // ═  FORMULARIO PRINCIPAL
    // ═══════════════════════════════════════════

    const age = affiliate ? calcAge(affiliate.birth_date) : null;
    const specialConds = affiliate ? formatSpecialConditions(affiliate.special_conditions) : [];
    const totalValue = practiceItems.reduce((sum, pi) => sum + (pi.practice.financial_value || 0) * pi.quantity, 0);

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <Link href="/audits/requests">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <h1 className="text-xl font-bold">Nueva Solicitud de Auditoría</h1>
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  TIPO DE SOLICITUD                 ═ */}
            {/* ══════════════════════════════════════ */}
            <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Tipo de solicitud
                </label>
                <div className="flex gap-1.5 flex-wrap">
                    {REQUEST_TYPES.map(t => {
                        const Icon = t.icon;
                        const active = requestType === t.value;
                        return (
                            <button
                                key={t.value}
                                onClick={() => t.enabled && setRequestType(t.value)}
                                disabled={!t.enabled}
                                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                    !t.enabled
                                        ? 'border-dashed border-muted-foreground/20 text-muted-foreground/40 cursor-not-allowed'
                                        : active
                                            ? `${t.cls} ring-1 ring-current/20`
                                            : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                                }`}
                            >
                                {!t.enabled && <Lock className="h-3 w-3" />}
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t.label}</span>
                                <span className="sm:hidden">{t.short}</span>
                                {!t.enabled && <span className="text-[10px] opacity-60">próx.</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  AFILIADO                           ═ */}
            {/* ══════════════════════════════════════ */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Afiliado *
                </label>

                {!affiliate ? (
                    /* ── Buscador de afiliados ── */
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, DNI o nro. de afiliado..."
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
                                                    {a.relationship && ` · ${a.relationship}`}
                                                </div>
                                            </div>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                a.status === 'activo'
                                                    ? 'bg-green-100 text-green-700'
                                                    : a.status === 'suspendido'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700'
                                            }`}>
                                                {a.status}
                                            </span>
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
                    /* ── Ficha completa del afiliado ── */
                    <div className="border rounded-xl overflow-hidden">
                        {/* Cabecera */}
                        <div className="bg-primary/5 border-b px-4 py-3 flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-base">{affiliate.full_name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    DNI {affiliate.document_number}
                                    {affiliate.affiliate_number && ` · Afiliado Nro. ${affiliate.affiliate_number}`}
                                    {affiliate.certificate_number && ` · Cert. ${affiliate.certificate_number}`}
                                    {affiliate.cuit && ` · CUIT ${affiliate.cuit}`}
                                </p>
                            </div>
                            <button
                                onClick={clearAffiliate}
                                className="text-muted-foreground hover:text-foreground p-1"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Grid de datos del afiliado */}
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                            {/* Edad + género */}
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{age !== null ? `${age} años` : 'Edad N/D'}</span>
                                {affiliate.gender && (
                                    <span className="text-muted-foreground">
                                        ({affiliate.gender === 'M' ? 'Masc.' : affiliate.gender === 'F' ? 'Fem.' : 'Otro'})
                                    </span>
                                )}
                            </div>

                            {/* Plan */}
                            <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">
                                    {planName || (affiliate.plan_id ? `Plan #${affiliate.plan_id}` : 'Sin plan')}
                                </span>
                            </div>

                            {/* Relación / Titular */}
                            <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className={affiliate.relationship === 'Titular' ? 'font-semibold text-blue-700' : ''}>
                                    {affiliate.relationship || 'Titular'}
                                </span>
                            </div>

                            {/* Estado */}
                            <div>
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                    affiliate.status === 'activo' ? 'bg-green-100 text-green-700' :
                                    affiliate.status === 'suspendido' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    ● {affiliate.status === 'activo' ? 'Activo' : affiliate.status === 'suspendido' ? 'Suspendido' : 'Baja'}
                                </span>
                            </div>

                            {/* Antigüedad */}
                            {affiliate.start_date && (
                                <div className="text-xs text-muted-foreground">
                                    Alta: {new Date(affiliate.start_date).toLocaleDateString('es-AR')}
                                </div>
                            )}

                            {/* Convenio */}
                            {affiliate.agreement && (
                                <div className="text-xs text-muted-foreground truncate">
                                    Convenio: {affiliate.agreement}
                                </div>
                            )}

                            {/* Teléfono */}
                            {affiliate.phone && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span className="text-xs">{affiliate.phone}</span>
                                </div>
                            )}

                            {/* Email */}
                            {affiliate.email && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span className="text-xs truncate">{affiliate.email}</span>
                                </div>
                            )}

                            {/* Dirección */}
                            {(affiliate.city || affiliate.address) && (
                                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 sm:col-span-3">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-xs truncate">
                                        {[affiliate.address, affiliate.city, affiliate.province].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Condiciones especiales / badges */}
                        {(specialConds.length > 0 || affiliate.special_pharmacy || (affiliate.copay_debt && affiliate.copay_debt > 0)) && (
                            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                                {specialConds.map(sc => (
                                    <span key={sc} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                        ⚠️ {sc}
                                    </span>
                                ))}
                                {affiliate.special_pharmacy && (
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                                        💊 Farmacia especial
                                    </span>
                                )}
                                {affiliate.copay_debt && affiliate.copay_debt > 0 && (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                                        💰 Deuda coseguro: ${affiliate.copay_debt.toLocaleString()}
                                    </span>
                                )}
                                {affiliate.frozen_quota && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                        ❄️ Cuota congelada
                                    </span>
                                )}
                                {affiliate.has_life_insurance && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                                        🛡️ Seguro de vida
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Alerta si no está activo */}
                        {affiliate.status !== 'activo' && (
                            <div className="mx-4 mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                ¡Afiliado {affiliate.status}! Verificar cobertura antes de continuar.
                            </div>
                        )}

                        {/* Observaciones */}
                        {affiliate.observations && (
                            <div className="px-4 pb-3 text-xs text-muted-foreground">
                                📝 {affiliate.observations}
                            </div>
                        )}

                        {/* ── Panel de consumos ── */}
                        <div className="border-t">
                            <button
                                onClick={() => {
                                    if (!showConsumptions && consumptions.length === 0) fetchConsumptions();
                                    else setShowConsumptions(prev => !prev);
                                }}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <BarChart3 className="h-4 w-4" />
                                    Consumos del afiliado
                                </span>
                                {loadingConsumptions ? (
                                    <span className="text-xs text-muted-foreground animate-pulse">Cargando...</span>
                                ) : (
                                    showConsumptions
                                        ? <ChevronUp className="h-4 w-4" />
                                        : <ChevronDown className="h-4 w-4" />
                                )}
                            </button>

                            {showConsumptions && (
                                <div className="px-4 pb-3">
                                    {consumptions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2">
                                            Sin consumos registrados para este afiliado.
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                            {consumptions.map(c => (
                                                <div key={c.practiceCode}
                                                    className="flex items-center justify-between text-xs bg-muted/30 rounded px-2.5 py-1.5"
                                                >
                                                    <span>
                                                        <span className="font-mono font-medium">{c.practiceCode}</span>
                                                        <span className="ml-1.5">{c.practiceName}</span>
                                                    </span>
                                                    <span className="text-muted-foreground ml-2 shrink-0">
                                                        ×{c.count}
                                                        {c.lastDate && ` · últ. ${new Date(c.lastDate).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  PRÁCTICAS (MÚLTIPLES)             ═ */}
            {/* ══════════════════════════════════════ */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Prácticas * <span className="normal-case text-muted-foreground/60">(buscar en nomenclador)</span>
                </label>

                {/* Buscador de prácticas */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o descripción (ej: RMN, consulta, 420101)..."
                        value={pracSearch}
                        onChange={e => setPracSearch(e.target.value)}
                        className="pl-9"
                    />
                    {searchingPrac && (
                        <p className="text-xs text-muted-foreground mt-1 animate-pulse">Buscando en nomenclador...</p>
                    )}
                    {pracResults.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                            {pracResults.map(p => {
                                const alreadyAdded = practiceItems.some(pi => pi.practice.id === p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => !alreadyAdded && addPractice(p)}
                                        disabled={alreadyAdded}
                                        className={`w-full px-3 py-2.5 text-left text-sm border-b last:border-0 flex justify-between items-center gap-2 ${
                                            alreadyAdded ? 'bg-muted/30 text-muted-foreground' : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <span className="font-mono font-semibold">{p.code}</span>
                                            <span className="ml-2">{p.description}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-mono text-muted-foreground">
                                                ${p.financial_value?.toLocaleString()}
                                            </span>
                                            {alreadyAdded && (
                                                <span className="text-xs text-green-600">✓ agregada</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {pracSearch.length >= 2 && !searchingPrac && pracResults.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            No se encontraron prácticas para &quot;{pracSearch}&quot;
                        </p>
                    )}
                </div>

                {/* Lista de prácticas agregadas */}
                {practiceItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        {practiceItems.map((pi, idx) => (
                            <div key={pi.practice.id}
                                className="flex items-center gap-3 px-3 py-2 border-b last:border-0 hover:bg-muted/30"
                            >
                                <div className="flex-1 min-w-0 text-sm">
                                    <span className="font-mono font-semibold">{pi.practice.code}</span>
                                    <span className="ml-1.5">{pi.practice.description}</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-mono shrink-0">
                                    ${((pi.practice.financial_value || 0) * pi.quantity).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">×</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={99}
                                        value={pi.quantity}
                                        onChange={e => updateQuantity(idx, parseInt(e.target.value) || 1)}
                                        className="w-14 h-7 text-center text-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => removePractice(idx)}
                                    className="text-muted-foreground hover:text-red-500 p-1"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                        {/* Fila de totales */}
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-sm font-semibold">
                            <span>{practiceItems.length} práctica(s)</span>
                            <span className="font-mono">Total: ${totalValue.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  PRIORIDAD + NOTAS + ADJUNTOS      ═ */}
            {/* ══════════════════════════════════════ */}
            <div className="space-y-3">
                {/* Prioridad */}
                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground">Prioridad:</label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPriority('normal')}
                            className={`px-3 py-1.5 rounded text-sm font-medium border ${
                                priority === 'normal' ? 'bg-slate-100 border-slate-300' : 'border-transparent text-muted-foreground'
                            }`}
                        >
                            Normal
                        </button>
                        <button
                            onClick={() => setPriority('urgente')}
                            className={`px-3 py-1.5 rounded text-sm font-medium border ${
                                priority === 'urgente' ? 'bg-red-100 border-red-300 text-red-700' : 'border-transparent text-muted-foreground'
                            }`}
                        >
                            🔴 Urgente
                        </button>
                    </div>
                </div>

                {/* Observaciones */}
                <Input
                    placeholder="Observaciones para el auditor (opcional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />

                {/* Adjuntos */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <select
                            value={docType}
                            onChange={e => setDocType(e.target.value as AuditRequestAttachment['document_type'])}
                            className="border rounded px-2 py-1.5 text-sm bg-background"
                        >
                            {DOC_TYPES.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                        <label className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg cursor-pointer hover:bg-muted/50 text-sm">
                            <Upload className="h-3.5 w-3.5" />
                            Adjuntar
                            <input type="file" className="hidden" onChange={handleFileAdd}
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
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
                                <span key={i}
                                    className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
                                >
                                    {f.file.name.length > 25 ? f.file.name.slice(0, 23) + '…' : f.file.name}
                                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Botón enviar ── */}
            <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-green-600 hover:bg-green-700 h-11 text-base"
            >
                <Send className="h-4 w-4 mr-2" />
                {submitting
                    ? 'Enviando...'
                    : practiceItems.length > 1
                        ? `Enviar ${practiceItems.length} Solicitudes`
                        : 'Enviar Solicitud'}
            </Button>
        </div>
    );
}
