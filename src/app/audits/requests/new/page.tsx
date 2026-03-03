'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { ExpedientService } from '@/services/expedientService';
import { RulesEngine } from '@/services/rulesEngine';
import type { PracticeRuleResult, ExpedientRuleResult } from '@/services/rulesEngine';
import { createClient } from '@/lib/supabase';
import {
    Search, Upload, AlertCircle, CheckCircle,
    Stethoscope, FlaskConical, Building2,
    ArrowLeft, Paperclip, X, Send, Trash2,
    ChevronDown, ChevronUp, User,
    ShieldCheck, Package, DollarSign,
    BarChart3, Smile, Calendar, Phone, Mail,
    MapPin, FileText, AlertTriangle,
    Zap, ShieldAlert, Eye, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type {
    ExpedientType, ExpedientDocumentType, ExpedientPriority,
    Affiliate, Practice, Plan,
} from '@/types/database';

const supabase = createClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

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

interface PracticeItem {
    practice: Practice;
    quantity: number;
    ruleResult?: PracticeRuleResult;
}

interface ConsumptionItem {
    practiceCode: string;
    practiceName: string;
    count: number;
    lastDate: string;
}

interface PendingFile {
    file: File;
    documentType: ExpedientDocumentType;
}

// ── Configuración de tipos de expediente ──

const EXPEDIENT_TYPES: {
    value: ExpedientType;
    label: string;
    short: string;
    icon: React.ElementType;
    cls: string;
}[] = [
    { value: 'ambulatoria',          label: 'Ambulatoria',       short: 'Amb',  icon: Stethoscope,  cls: 'text-blue-700 bg-blue-50 border-blue-300' },
    { value: 'bioquimica',           label: 'Bioquímica',        short: 'Bio',  icon: FlaskConical, cls: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
    { value: 'internacion',          label: 'Internación',       short: 'Int',  icon: Building2,    cls: 'text-purple-700 bg-purple-50 border-purple-300' },
    { value: 'odontologica',         label: 'Odontológica',      short: 'Odo',  icon: Smile,        cls: 'text-pink-700 bg-pink-50 border-pink-300' },
    { value: 'programas_especiales', label: 'Prog. Especiales',  short: 'Prog', icon: ShieldCheck,  cls: 'text-amber-700 bg-amber-50 border-amber-300' },
    { value: 'elementos',            label: 'Elementos',         short: 'Elem', icon: Package,      cls: 'text-cyan-700 bg-cyan-50 border-cyan-300' },
    { value: 'reintegros',           label: 'Reintegros',        short: 'Rein', icon: DollarSign,   cls: 'text-orange-700 bg-orange-50 border-orange-300' },
];

const DOC_TYPES: { value: ExpedientDocumentType; label: string }[] = [
    { value: 'orden_medica',     label: 'Orden médica' },
    { value: 'receta',           label: 'Receta' },
    { value: 'estudio',          label: 'Estudio previo' },
    { value: 'informe',          label: 'Informe médico' },
    { value: 'consentimiento',   label: 'Consentimiento' },
    { value: 'historia_clinica', label: 'Historia clínica' },
    { value: 'factura',          label: 'Factura' },
    { value: 'otro',             label: 'Otro' },
];

// Colores del semáforo
const RULE_COLORS: Record<string, { bg: string; border: string; text: string; icon: React.ElementType; label: string }> = {
    verde:    { bg: 'bg-green-50',  border: 'border-green-300', text: 'text-green-700', icon: CheckCircle,   label: 'Auto-aprobable' },
    amarillo: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', icon: AlertTriangle, label: 'Requiere auditor' },
    rojo:     { bg: 'bg-red-50',    border: 'border-red-300', text: 'text-red-700', icon: ShieldAlert, label: 'Requiere auditor' },
};

// ════════════════════════════════════════════════════════
// ═  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════

export default function NewExpedientPage() {
    const { user } = useAuth();
    const { activeJurisdiction } = useJurisdiction();

    // ── Estado: Tipo ──
    const [expedientType, setExpedientType] = useState<ExpedientType>('ambulatoria');

    // ── Estado: Afiliado ──
    const [affSearch, setAffSearch] = useState('');
    const [affResults, setAffResults] = useState<Affiliate[]>([]);
    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [searchingAff, setSearchingAff] = useState(false);
    const [planName, setPlanName] = useState('');
    const [affiliatePlan, setAffiliatePlan] = useState<Plan | null>(null);

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
    const [priority, setPriority] = useState<ExpedientPriority>('normal');
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [docType, setDocType] = useState<ExpedientDocumentType>('orden_medica');

    // ── Estado: Motor de reglas ──
    const [rulesEvaluated, setRulesEvaluated] = useState(false);
    const [rulesResult, setRulesResult] = useState<ExpedientRuleResult | null>(null);
    const [evaluating, setEvaluating] = useState(false);

    // ── Estado: Submit ──
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedExpNumber, setSubmittedExpNumber] = useState('');
    const [autoApprovedCodes, setAutoApprovedCodes] = useState<string[]>([]);
    const [error, setError] = useState('');

    // ═══════════════════════════════════════════
    // ═  BÚSQUEDAS
    // ═══════════════════════════════════════════

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
        setRulesEvaluated(false);
        setRulesResult(null);
        if (a.plan_id) {
            const { data } = await db('plans').select('*').eq('id', a.plan_id).single();
            if (data) {
                const plan = data as Plan;
                setPlanName(plan.name || `Plan #${a.plan_id}`);
                setAffiliatePlan(plan);
            } else {
                setPlanName(`Plan #${a.plan_id}`);
                setAffiliatePlan(null);
            }
        } else {
            setPlanName('Sin plan');
            setAffiliatePlan(null);
        }
    }, []);

    const clearAffiliate = useCallback(() => {
        setAffiliate(null);
        setAffSearch('');
        setShowConsumptions(false);
        setConsumptions([]);
        setPlanName('');
        setAffiliatePlan(null);
        setRulesEvaluated(false);
        setRulesResult(null);
    }, []);

    // ═══════════════════════════════════════════
    // ═  CONSUMOS DEL AFILIADO
    // ═══════════════════════════════════════════

    const fetchConsumptions = useCallback(async () => {
        if (!affiliate) return;
        setLoadingConsumptions(true);
        try {
            const [auditsRes, requestsRes, expRes] = await Promise.all([
                supabase.from('audits')
                    .select('practice_id, created_at')
                    .eq('affiliate_id', String(affiliate.id))
                    .order('created_at', { ascending: false }).limit(200),
                supabase.from('audit_requests')
                    .select('practice_id, created_at, practice_quantity')
                    .eq('affiliate_id', String(affiliate.id))
                    .order('created_at', { ascending: false }).limit(200),
                db('expedients')
                    .select('id, created_at')
                    .eq('affiliate_id', String(affiliate.id))
                    .order('created_at', { ascending: false }).limit(50),
            ]);

            // Buscar prácticas de expedientes
            const expIds = ((expRes.data || []) as Array<{ id: string }>).map(e => e.id);
            let expPractices: Record<string, unknown>[] = [];
            if (expIds.length > 0) {
                const { data } = await db('expedient_practices')
                    .select('practice_id, quantity, created_at')
                    .in('expedient_id', expIds)
                    .in('status', ['autorizada', 'autorizada_parcial', 'pendiente', 'en_revision']);
                expPractices = (data || []) as Record<string, unknown>[];
            }

            const allRecords = [
                ...(auditsRes.data || []),
                ...(requestsRes.data || []),
                ...expPractices,
            ];
            const practiceIds = [...new Set(
                allRecords.map((r: Record<string, unknown>) => r.practice_id).filter(Boolean)
            )];

            if (practiceIds.length === 0) {
                setConsumptions([]);
                setShowConsumptions(true);
                setLoadingConsumptions(false);
                return;
            }

            const { data: practices } = await supabase
                .from('practices').select('id, code, name').in('id', practiceIds);
            const practiceMap = new Map(
                (practices || []).map((p: Record<string, unknown>) => [p.id, p])
            );

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
                grouped[pid].count += ((rec.practice_quantity as number) || (rec.quantity as number) || 1);
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
    // ═  GESTIÓN DE PRÁCTICAS
    // ═══════════════════════════════════════════

    const addPractice = (practice: Practice) => {
        if (practiceItems.some(pi => pi.practice.id === practice.id)) return;
        setPracticeItems(prev => [...prev, { practice, quantity: 1 }]);
        setPracSearch('');
        setPracResults([]);
        setRulesEvaluated(false);
        setRulesResult(null);
    };

    const removePractice = (index: number) => {
        setPracticeItems(prev => prev.filter((_, i) => i !== index));
        setRulesEvaluated(false);
        setRulesResult(null);
    };

    const updateQuantity = (index: number, qty: number) => {
        setPracticeItems(prev =>
            prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, qty) } : item)
        );
        setRulesEvaluated(false);
        setRulesResult(null);
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
    // ═  MOTOR DE REGLAS — EVALUAR
    // ═══════════════════════════════════════════

    const handleEvaluate = async () => {
        if (!affiliate || !affiliatePlan || practiceItems.length === 0) return;
        setEvaluating(true);
        setError('');
        try {
            const result = await RulesEngine.evaluate({
                type: expedientType,
                affiliate,
                plan: affiliatePlan,
                practices: practiceItems.map(pi => ({
                    practice_id: pi.practice.id,
                    practice: pi.practice,
                    quantity: pi.quantity,
                })),
                jurisdiction_id: activeJurisdiction?.id || 1,
            });

            setPracticeItems(prev =>
                prev.map((item, idx) => ({
                    ...item,
                    ruleResult: result.practices[idx],
                }))
            );

            setRulesResult(result);
            setRulesEvaluated(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error evaluando reglas');
        }
        setEvaluating(false);
    };

    // ═══════════════════════════════════════════
    // ═  VALIDACIONES
    // ═══════════════════════════════════════════

    const hasOrdenMedica = files.some(f => f.documentType === 'orden_medica');
    const isAffiliateActive = affiliate?.status === 'activo';
    const isAffiliateBlocked = affiliate && !isAffiliateActive;

    const validationErrors: string[] = [];
    if (!affiliate) validationErrors.push('Seleccioná un afiliado');
    if (isAffiliateBlocked) validationErrors.push(`Afiliado ${affiliate?.status} — no se puede procesar`);
    if (practiceItems.length === 0) validationErrors.push('Agregá al menos una práctica');
    if (!hasOrdenMedica) validationErrors.push('Orden médica obligatoria — adjuntá el archivo');

    const canEvaluate = !!affiliate && isAffiliateActive && practiceItems.length > 0 && !!affiliatePlan && !evaluating;
    const canSubmit = canEvaluate && hasOrdenMedica && rulesEvaluated && !submitting;

    const greenCount = practiceItems.filter(pi => pi.ruleResult?.result === 'verde').length;
    const yellowCount = practiceItems.filter(pi => pi.ruleResult?.result === 'amarillo').length;
    const redCount = practiceItems.filter(pi => pi.ruleResult?.result === 'rojo').length;

    // ═══════════════════════════════════════════
    // ═  ENVÍO — CREAR EXPEDIENTE
    // ═══════════════════════════════════════════

    const handleSubmit = async () => {
        if (!canSubmit || !user || !activeJurisdiction || !affiliate) return;
        setSubmitting(true);
        setError('');
        try {
            const expedient = await ExpedientService.create({
                type: expedientType,
                priority,
                affiliate_id: String(affiliate.id),
                affiliate_plan_id: affiliate.plan_id,
                family_member_relation: affiliate.relationship,
                request_notes: notes || undefined,
                requires_control_desk: rulesResult?.requires_control_desk || false,
                rules_result: rulesResult?.overall,
                created_by: user.id,
                jurisdiction_id: activeJurisdiction.id,
                practices: practiceItems.map((pi, idx) => ({
                    practice_id: pi.practice.id,
                    quantity: pi.quantity,
                    practice_value: pi.practice.financial_value,
                    coverage_percent: pi.ruleResult?.coverage_percent,
                    covered_amount: pi.ruleResult?.covered_amount,
                    copay_amount: pi.ruleResult?.copay_amount,
                    copay_percent: pi.ruleResult?.copay_percent,
                    rule_result: pi.ruleResult?.result,
                    rule_messages: pi.ruleResult?.messages,
                    sort_order: idx,
                })),
            });

            // Adjuntos
            if (files.length > 0) {
                for (const pf of files) {
                    await ExpedientService.uploadAttachment(expedient.id, pf.file, pf.documentType, user.id);
                }
            }

            // Auto-aprobar prácticas VERDES si corresponde
            const codes: string[] = [];
            if (greenCount > 0 && rulesResult?.overall !== 'rojo') {
                const autoResult = await ExpedientService.autoApprovePractices(expedient.id, user.id);
                codes.push(...autoResult.authorized.map(a => a.authorization_code));
            }

            setSubmittedExpNumber(expedient.expedient_number || expedient.id);
            setAutoApprovedCodes(codes);
            setSubmitted(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al crear expediente');
        }
        setSubmitting(false);
    };

    const resetForm = () => {
        setAffiliate(null); setPracticeItems([]); setFiles([]); setNotes('');
        setPriority('normal'); setSubmitted(false); setSubmittedExpNumber('');
        setAutoApprovedCodes([]); setAffSearch(''); setPracSearch('');
        setShowConsumptions(false); setConsumptions([]); setPlanName('');
        setAffiliatePlan(null); setRulesEvaluated(false); setRulesResult(null);
        setExpedientType('ambulatoria');
    };

    // ═══════════════════════════════════════════
    // ═  VISTA DE ÉXITO
    // ═══════════════════════════════════════════

    if (submitted) {
        const allAutoApproved = autoApprovedCodes.length === practiceItems.length && practiceItems.length > 0;
        const someAutoApproved = autoApprovedCodes.length > 0 && !allAutoApproved;

        return (
            <div className="max-w-lg mx-auto p-6 mt-8">
                <div className="border border-green-200 bg-green-50/50 rounded-xl p-8 text-center space-y-4">
                    <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                    <h2 className="text-xl font-bold text-green-800">Expediente Creado</h2>
                    <p className="text-3xl font-mono font-bold text-green-900">{submittedExpNumber}</p>

                    {allAutoApproved && (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                            <p className="text-sm font-semibold text-green-800 flex items-center justify-center gap-1.5">
                                <Zap className="h-4 w-4" /> Todas las prácticas auto-aprobadas
                            </p>
                            <div className="mt-2 space-y-1">
                                {autoApprovedCodes.map(code => (
                                    <p key={code} className="text-sm font-mono text-green-800">{code}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {someAutoApproved && (
                        <div className="space-y-2">
                            <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                                <p className="text-sm font-semibold text-green-800">
                                    ✓ {autoApprovedCodes.length} práctica(s) auto-aprobada(s):
                                </p>
                                <div className="mt-1 space-y-0.5">
                                    {autoApprovedCodes.map(code => (
                                        <p key={code} className="text-sm font-mono text-green-800">{code}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    ⏳ {practiceItems.length - autoApprovedCodes.length} práctica(s) derivada(s) a auditoría
                                </p>
                            </div>
                        </div>
                    )}

                    {autoApprovedCodes.length === 0 && (
                        <p className="text-sm text-green-600">Derivado a auditoría para revisión.</p>
                    )}

                    <div className="flex gap-3 justify-center pt-2">
                        <Button onClick={resetForm}>Nuevo Expediente</Button>
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
                <div>
                    <h1 className="text-xl font-bold">Nuevo Expediente</h1>
                    <p className="text-xs text-muted-foreground">Apertura de expediente digital de auditoría</p>
                </div>
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  TIPO DE EXPEDIENTE                ═ */}
            {/* ══════════════════════════════════════ */}
            <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Tipo de expediente
                </label>
                <div className="flex gap-1.5 flex-wrap">
                    {EXPEDIENT_TYPES.map(t => {
                        const Icon = t.icon;
                        const active = expedientType === t.value;
                        return (
                            <button
                                key={t.value}
                                onClick={() => { setExpedientType(t.value); setRulesEvaluated(false); setRulesResult(null); }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                    active
                                        ? `${t.cls} ring-1 ring-current/20`
                                        : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t.label}</span>
                                <span className="sm:hidden">{t.short}</span>
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
                            <button onClick={clearAffiliate} className="text-muted-foreground hover:text-foreground p-1">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Grid de datos */}
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{age !== null ? `${age} años` : 'Edad N/D'}</span>
                                {affiliate.gender && (
                                    <span className="text-muted-foreground">
                                        ({affiliate.gender === 'M' ? 'Masc.' : affiliate.gender === 'F' ? 'Fem.' : 'Otro'})
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{planName || 'Sin plan'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className={affiliate.relationship === 'Titular' ? 'font-semibold text-blue-700' : ''}>
                                    {affiliate.relationship || 'Titular'}
                                </span>
                            </div>
                            <div>
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                    affiliate.status === 'activo' ? 'bg-green-100 text-green-700' :
                                    affiliate.status === 'suspendido' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    ● {affiliate.status === 'activo' ? 'Activo' : affiliate.status === 'suspendido' ? 'Suspendido' : 'Baja'}
                                </span>
                            </div>
                            {affiliate.start_date && (
                                <div className="text-xs text-muted-foreground">
                                    Alta: {new Date(affiliate.start_date).toLocaleDateString('es-AR')}
                                </div>
                            )}
                            {affiliate.agreement && (
                                <div className="text-xs text-muted-foreground truncate">Convenio: {affiliate.agreement}</div>
                            )}
                            {affiliate.phone && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5" /><span className="text-xs">{affiliate.phone}</span>
                                </div>
                            )}
                            {affiliate.email && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" /><span className="text-xs truncate">{affiliate.email}</span>
                                </div>
                            )}
                            {(affiliate.city || affiliate.address) && (
                                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 sm:col-span-3">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-xs truncate">
                                        {[affiliate.address, affiliate.city, affiliate.province].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Condiciones especiales */}
                        {(specialConds.length > 0 || affiliate.special_pharmacy || (affiliate.copay_debt && affiliate.copay_debt > 0)) && (
                            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                                {specialConds.map(sc => (
                                    <span key={sc} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">⚠️ {sc}</span>
                                ))}
                                {affiliate.special_pharmacy && (
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">💊 Farmacia especial</span>
                                )}
                                {affiliate.copay_debt && affiliate.copay_debt > 0 && (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">💰 Deuda coseguro: ${affiliate.copay_debt.toLocaleString()}</span>
                                )}
                                {affiliate.frozen_quota && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">❄️ Cuota congelada</span>
                                )}
                                {affiliate.has_life_insurance && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">🛡️ Seguro de vida</span>
                                )}
                            </div>
                        )}

                        {/* Alerta si no está activo */}
                        {isAffiliateBlocked && (
                            <div className="mx-4 mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm font-medium">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                Afiliado {affiliate.status} — No se puede crear el expediente.
                            </div>
                        )}

                        {affiliate.observations && (
                            <div className="px-4 pb-3 text-xs text-muted-foreground">📝 {affiliate.observations}</div>
                        )}

                        {/* Panel de consumos */}
                        <div className="border-t">
                            <button
                                onClick={() => {
                                    if (!showConsumptions && consumptions.length === 0) fetchConsumptions();
                                    else setShowConsumptions(prev => !prev);
                                }}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <BarChart3 className="h-4 w-4" /> Consumos del afiliado
                                </span>
                                {loadingConsumptions ? (
                                    <span className="text-xs text-muted-foreground animate-pulse">Cargando...</span>
                                ) : showConsumptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            {showConsumptions && (
                                <div className="px-4 pb-3">
                                    {consumptions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2">Sin consumos registrados.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                            {consumptions.map(c => (
                                                <div key={c.practiceCode} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2.5 py-1.5">
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
                                            <span className="font-mono text-muted-foreground">${p.financial_value?.toLocaleString()}</span>
                                            {alreadyAdded && <span className="text-xs text-green-600">✓ agregada</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {pracSearch.length >= 2 && !searchingPrac && pracResults.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">No se encontraron prácticas para &quot;{pracSearch}&quot;</p>
                    )}
                </div>

                {/* Lista de prácticas con semáforo */}
                {practiceItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        {practiceItems.map((pi, idx) => {
                            const rc = pi.ruleResult;
                            const color = rc ? RULE_COLORS[rc.result] : null;
                            const RuleIcon = color?.icon;
                            return (
                                <div key={pi.practice.id}
                                    className={`border-b last:border-0 transition-colors ${
                                        color ? `${color.bg}` : 'hover:bg-muted/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 px-3 py-2">
                                        {rc && RuleIcon && (
                                            <div className={`shrink-0 ${color!.text}`} title={color!.label}>
                                                <RuleIcon className="h-4 w-4" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 text-sm">
                                            <span className="font-mono font-semibold">{pi.practice.code}</span>
                                            <span className="ml-1.5">{pi.practice.description}</span>
                                        </div>
                                        {rc && (
                                            <span className={`text-xs font-medium shrink-0 ${color!.text}`}>
                                                {rc.coverage_percent.toFixed(0)}% cob.
                                            </span>
                                        )}
                                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                                            ${((pi.practice.financial_value || 0) * pi.quantity).toLocaleString()}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground">×</span>
                                            <Input
                                                type="number" min={1} max={99}
                                                value={pi.quantity}
                                                onChange={e => updateQuantity(idx, parseInt(e.target.value) || 1)}
                                                className="w-14 h-7 text-center text-sm"
                                            />
                                        </div>
                                        <button onClick={() => removePractice(idx)} className="text-muted-foreground hover:text-red-500 p-1">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {rc && rc.messages.length > 0 && (
                                        <div className="px-3 pb-2 pl-10">
                                            {rc.messages.map((msg, mi) => (
                                                <p key={mi} className={`text-xs ${color!.text} opacity-80`}>• {msg}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-sm font-semibold">
                            <div className="flex items-center gap-3">
                                <span>{practiceItems.length} práctica(s)</span>
                                {rulesEvaluated && (
                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        {greenCount > 0 && <span className="text-green-700">● {greenCount} auto</span>}
                                        {yellowCount > 0 && <span className="text-yellow-700">● {yellowCount} auditor</span>}
                                        {redCount > 0 && <span className="text-red-700">● {redCount} auditor</span>}
                                    </div>
                                )}
                            </div>
                            <span className="font-mono">Total: ${totalValue.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  PRIORIDAD + NOTAS + ADJUNTOS      ═ */}
            {/* ══════════════════════════════════════ */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground">Prioridad:</label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPriority('normal')}
                            className={`px-3 py-1.5 rounded text-sm font-medium border ${
                                priority === 'normal' ? 'bg-slate-100 border-slate-300' : 'border-transparent text-muted-foreground'
                            }`}
                        >Normal</button>
                        <button
                            onClick={() => setPriority('urgente')}
                            className={`px-3 py-1.5 rounded text-sm font-medium border ${
                                priority === 'urgente' ? 'bg-red-100 border-red-300 text-red-700' : 'border-transparent text-muted-foreground'
                            }`}
                        >🔴 Urgente</button>
                    </div>
                </div>

                <Input
                    placeholder="Observaciones para el auditor (opcional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />

                {/* Adjuntos */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={docType}
                            onChange={e => setDocType(e.target.value as ExpedientDocumentType)}
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

                    {/* Indicador de orden médica */}
                    <div className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
                        hasOrdenMedica
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                        {hasOrdenMedica
                            ? <><CheckCircle className="h-3.5 w-3.5" /> Orden médica adjunta</>
                            : <><AlertCircle className="h-3.5 w-3.5" /> Orden médica obligatoria — seleccioná &quot;Orden médica&quot; y adjuntá el archivo</>
                        }
                    </div>

                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {files.map((f, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                                    <span className="text-muted-foreground">[{DOC_TYPES.find(d => d.value === f.documentType)?.label}]</span>
                                    {f.file.name.length > 20 ? f.file.name.slice(0, 18) + '…' : f.file.name}
                                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ═  VALIDACIONES INLINE               ═ */}
            {/* ══════════════════════════════════════ */}
            {validationErrors.length > 0 && affiliate && (
                <div className="space-y-1">
                    {validationErrors.map((ve, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {ve}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* ═  RESUMEN DE EVALUACIÓN             ═ */}
            {/* ══════════════════════════════════════ */}
            {rulesEvaluated && rulesResult && (
                <div className={`rounded-lg border p-4 space-y-2 ${
                    rulesResult.overall === 'verde' ? 'bg-green-50 border-green-300' :
                    rulesResult.overall === 'amarillo' ? 'bg-yellow-50 border-yellow-300' :
                    'bg-red-50 border-red-300'
                }`}>
                    <div className="flex items-center gap-2">
                        {rulesResult.overall === 'verde' ? (
                            <>
                                <Zap className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-green-800">
                                    Todas las prácticas se auto-aprobarán al enviar
                                </span>
                            </>
                        ) : rulesResult.overall === 'amarillo' ? (
                            <>
                                <Eye className="h-5 w-5 text-yellow-600" />
                                <span className="font-semibold text-yellow-800">
                                    {greenCount > 0
                                        ? `${greenCount} auto-aprobable(s), ${yellowCount + redCount} requieren auditor`
                                        : 'Todas requieren revisión del auditor'}
                                </span>
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="h-5 w-5 text-red-600" />
                                <span className="font-semibold text-red-800">
                                    Requiere revisión del auditor
                                </span>
                            </>
                        )}
                    </div>

                    {rulesResult.requires_control_desk && (
                        <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Este expediente pasará por mesa de control antes del auditor
                        </p>
                    )}

                    {rulesResult.messages.length > 0 && (
                        <div className="text-xs space-y-0.5">
                            {rulesResult.messages.map((msg, i) => (
                                <p key={i} className="text-red-700">• {msg}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* ═  BOTONES: EVALUAR + ENVIAR         ═ */}
            {/* ══════════════════════════════════════ */}
            <div className="space-y-2">
                {!rulesEvaluated && (
                    <Button
                        onClick={handleEvaluate}
                        disabled={!canEvaluate}
                        variant="outline"
                        className="w-full h-11 text-base border-2"
                    >
                        {evaluating ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Evaluando reglas...</>
                        ) : (
                            <><Eye className="h-4 w-4 mr-2" /> Evaluar Expediente</>
                        )}
                    </Button>
                )}

                {rulesEvaluated && (
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`w-full h-11 text-base ${
                            rulesResult?.overall === 'verde'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {submitting ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando expediente...</>
                        ) : rulesResult?.overall === 'verde' ? (
                            <><Zap className="h-4 w-4 mr-2" /> Enviar y Auto-aprobar ({practiceItems.length} práctica{practiceItems.length > 1 ? 's' : ''})</>
                        ) : (
                            <><Send className="h-4 w-4 mr-2" /> Enviar a Auditoría ({practiceItems.length} práctica{practiceItems.length > 1 ? 's' : ''})</>
                        )}
                    </Button>
                )}

                {rulesEvaluated && (
                    <button
                        onClick={() => { setRulesEvaluated(false); setRulesResult(null); setPracticeItems(prev => prev.map(item => ({ ...item, ruleResult: undefined }))); }}
                        className="text-xs text-muted-foreground hover:text-foreground mx-auto block"
                    >
                        ↻ Re-evaluar
                    </button>
                )}
            </div>
        </div>
    );
}
