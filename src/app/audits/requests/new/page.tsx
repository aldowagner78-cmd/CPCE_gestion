'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { ExpedientService } from '@/services/expedientService';
import { RulesEngine } from '@/services/rulesEngine';
import type { ExpedientRuleResult } from '@/services/rulesEngine';
import { createClient } from '@/lib/supabase';
import {
    analyzeClinicalPriority, checkCoherence, buildIASuggestions,
    type ClinicalPriorityResult, type CoherenceCheckResult,
} from '@/services/aiService';
import { AIUploadModal } from '@/components/AIUploadModal';
import { OCRUpload, type OCRResult } from '@/components/OCRUpload';
import {
    AlertCircle, ArrowLeft, Check, ChevronDown, Sparkles, PenLine,
    Stethoscope, FlaskConical, Building2, Smile,
    ShieldCheck, Package, DollarSign, User,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ExpedientType, ExpedientDocumentType, ExpedientPriority, Affiliate, Practice, Plan } from '@/types/database';
import { compressImage, validateFileSize } from '@/lib/imageCompressor';
import type { CompressResult } from '@/lib/imageCompressor';
import { DiseaseAutocomplete, type DiseaseSelection } from '@/components/practices/DiseaseAutocomplete';

import { AffiliateSearch } from './_components/AffiliateSearch';
import { PracticeSelector } from './_components/PracticeSelector';
import { PrescriptionForm } from './_components/PrescriptionForm';
import { CommunicationPanel } from './_components/CommunicationPanel';
import { AttachmentsPanel } from './_components/AttachmentsPanel';
import { SubmitPreview } from './_components/SubmitPreview';
import { SuccessView } from './_components/SuccessView';
import { PracticeHistoryModal, AttachmentsModal } from './_components/HistoryModals';
import { GuidedTour } from '@/components/GuidedTour';
import { HelpTooltip } from '@/components/HelpTooltip';
import type { PracticeItem, PendingFile, ChatMessage, DetailedConsumption } from './_components/types';

const supabase = createClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

const EXPEDIENT_TYPES: { value: ExpedientType; label: string; short: string; icon: React.ElementType; cls: string }[] = [
    { value: 'ambulatoria', label: 'Ambulatoria', short: 'Amb', icon: Stethoscope, cls: 'text-blue-700 bg-blue-50 border-blue-300' },
    { value: 'bioquimica', label: 'Bioquimica', short: 'Bio', icon: FlaskConical, cls: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
    { value: 'internacion', label: 'Internacion', short: 'Int', icon: Building2, cls: 'text-purple-700 bg-purple-50 border-purple-300' },
    { value: 'odontologica', label: 'Odontologica', short: 'Odo', icon: Smile, cls: 'text-pink-700 bg-pink-50 border-pink-300' },
    { value: 'programas_especiales', label: 'Prog. Especiales', short: 'Prog', icon: ShieldCheck, cls: 'text-amber-700 bg-amber-50 border-amber-300' },
    { value: 'elementos', label: 'Elementos', short: 'Elem', icon: Package, cls: 'text-cyan-700 bg-cyan-50 border-cyan-300' },
    { value: 'reintegros', label: 'Reintegros', short: 'Rein', icon: DollarSign, cls: 'text-orange-700 bg-orange-50 border-orange-300' },
];

export default function NewExpedientPage() {
    const { user } = useAuth();
    const { activeJurisdiction } = useJurisdiction();

    const [expedientType, setExpedientType] = useState<ExpedientType>('ambulatoria');
    const [affSearch, setAffSearch] = useState('');
    const [affResults, setAffResults] = useState<Affiliate[]>([]);
    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [searchingAff, setSearchingAff] = useState(false);
    const [planName, setPlanName] = useState('');
    const [affiliatePlan, setAffiliatePlan] = useState<Plan | null>(null);
    const [consumptions, setConsumptions] = useState<{ practiceCode: string; practiceName: string; count: number; lastDate: string }[]>([]);
    const [detailedConsumptions, setDetailedConsumptions] = useState<DetailedConsumption[]>([]);
    const [showConsumptions, setShowConsumptions] = useState(false);
    const [loadingConsumptions, setLoadingConsumptions] = useState(false);
    const [consumptionDateFrom, setConsumptionDateFrom] = useState('');
    const [consumptionDateTo, setConsumptionDateTo] = useState('');
    const [consumptionPracticeFilter, setConsumptionPracticeFilter] = useState('');
    const [showConsumptionFilters, setShowConsumptionFilters] = useState(false);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<{ id: number; name: string } | null>(null);
    const [pracSearch, setPracSearch] = useState('');
    const [pracResults, setPracResults] = useState<Practice[]>([]);
    const [searchingPrac, setSearchingPrac] = useState(false);
    const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
    const [priority, setPriority] = useState<ExpedientPriority>('normal');
    const [diagnosis, setDiagnosis] = useState('');
    const [diagnosisCode, setDiagnosisCode] = useState('');
    const [diagInitialSearch, setDiagInitialSearch] = useState('');
    const [notes, setNotes] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [compressing, setCompressing] = useState(false);
    const [doctorName, setDoctorName] = useState('');
    const [doctorRegistration, setDoctorRegistration] = useState('');
    const [doctorSpecialty, setDoctorSpecialty] = useState('');
    const [providerName, setProviderName] = useState('');
    const [prescriptionDate, setPrescriptionDate] = useState('');
    const [prescriptionNumber, setPrescriptionNumber] = useState('');
    const [orderExpiryDate, setOrderExpiryDate] = useState('');
    const [assignedAuditorId, setAssignedAuditorId] = useState('');
    const [auditorsList, setAuditorsList] = useState<{ id: string; full_name: string; role: string }[]>([]);
    const [rulesEvaluated, setRulesEvaluated] = useState(false);
    const [rulesResult, setRulesResult] = useState<ExpedientRuleResult | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [viewingAttachmentsFor, setViewingAttachmentsFor] = useState<{ expedientId: string; expedientNumber: string } | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const [aiPriorityResult, setAiPriorityResult] = useState<ClinicalPriorityResult | null>(null);
    const [coherenceResult, setCoherenceResult] = useState<CoherenceCheckResult | null>(null);
    const [selectedFamilyMember, setSelectedFamilyMember] = useState<Affiliate | null>(null);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
    const [aiDocumentFile, setAiDocumentFile] = useState<File | null>(null);
    const [commChannel, setCommChannel] = useState<'interna' | 'para_afiliado'>('interna');
    const [aiLoading, setAiLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedExpNumber, setSubmittedExpNumber] = useState('');
    const [autoApprovedCodes, setAutoApprovedCodes] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loadMode, setLoadMode] = useState<'ia' | 'manual'>('ia');
    const [activeSection, setActiveSection] = useState(1);
    const [aiAffName, setAiAffName] = useState<string | null>(null);
    const [aiDiagTerms, setAiDiagTerms] = useState<string[]>([]);

    const handleAIParsed = useCallback((
        data: {
            affiliate?: string; affiliateName?: string | null;
            doctor?: string; doctorRegistration?: string | null;
            practices?: string[] | Array<{ name: string; code?: string | null; quantity?: number }>;
            diagnosis?: string;
            diagnosisText?: string;
            diagnosisCIE?: string | null;
            diagnosisSearchTerms?: string[];
            prescriptionDate?: string | null;
            notes?: string | null;
        },
        file: File
    ) => {
        if (data.affiliate?.trim()) setAffSearch(data.affiliate.trim());
        if (data.affiliateName?.trim()) setAiAffName(data.affiliateName.trim());
        const diagText = data.diagnosisText || data.diagnosis || '';
        const diagCIE = data.diagnosisCIE || '';
        const diagTerms = data.diagnosisSearchTerms || [];
        if (diagText || diagCIE) {
            setDiagInitialSearch(diagCIE || diagTerms[0] || diagText.substring(0, 40));
        }
        // Store all fallback terms for DiseaseAutocomplete
        const allTerms = [...diagTerms, diagText.substring(0, 40)].filter(Boolean);
        if (allTerms.length > 0) setAiDiagTerms(allTerms);
        if (data.doctor) setDoctorName(data.doctor);
        if (data.doctorRegistration) setDoctorRegistration(data.doctorRegistration);
        if (data.prescriptionDate) {
            const d = data.prescriptionDate;
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                const [y, m, dd] = d.split('-');
                setPrescriptionDate(`${dd}/${m}/${y}`);
            } else {
                setPrescriptionDate(d);
            }
        }
        setAiDocumentFile(file);
        const practicesRaw = data.practices || [];
        const practiceNames = practicesRaw.map(p => typeof p === 'string' ? p : p.name);
        const noteLines = ['[IA] --- Datos extraidos del documento cargado:'];
        if (data.doctor) noteLines.push('Medico prescriptor: ' + data.doctor);
        if (data.affiliateName) noteLines.push('Paciente detectado: ' + data.affiliateName);
        if (data.prescriptionDate) noteLines.push('Fecha prescripcion: ' + data.prescriptionDate);
        if (diagText) noteLines.push('Diagnostico detectado: ' + diagText + (diagCIE ? ' (' + diagCIE + ')' : ''));
        if (practiceNames.length > 0) { noteLines.push('Practicas solicitadas:'); practiceNames.forEach(pn => noteLines.push('  - ' + pn)); }
        if (data.notes) noteLines.push('Info adicional: ' + data.notes);
        if (noteLines.length > 1) setNotes(prev => prev ? prev + '\n\n' + noteLines.join('\n') : noteLines.join('\n'));
    }, []);

    useEffect(() => {
        if (!aiDocumentFile) return;
        (async () => {
            const compressed = aiDocumentFile.type.startsWith('image/')
                ? await compressImage(aiDocumentFile).catch(() => ({ file: aiDocumentFile, originalSize: aiDocumentFile.size, wasCompressed: false, savingsPercent: 0 }))
                : { file: aiDocumentFile, originalSize: aiDocumentFile.size, wasCompressed: false, savingsPercent: 0 };
            setFiles(prev => [...prev, { file: compressed.file, documentType: 'orden_medica' as ExpedientDocumentType, originalSize: compressed.originalSize, wasCompressed: compressed.wasCompressed, savingsPercent: compressed.savingsPercent }]);
            setAiDocumentFile(null);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiDocumentFile]);

    const searchAffs = useCallback(async (q: string) => {
        if (q.length < 2) { setAffResults([]); return; }
        setSearchingAff(true);
        const jId = activeJurisdiction?.id || 1;
        try {
            // Strategy 1: exact/substring match on number, DNI, name
            const { data: exact } = await supabase.from('affiliates').select('*')
                .or('full_name.ilike.%' + q + '%,document_number.ilike.%' + q + '%,affiliate_number.ilike.%' + q + '%')
                .eq('jurisdiction_id', jId).order('full_name').limit(10);
            const results = (exact || []) as Affiliate[];

            // Strategy 2: if no results and query has multiple words, try each word separately
            if (results.length === 0 && q.includes(' ')) {
                const words = q.split(/\s+/).filter(w => w.length >= 3);
                if (words.length > 0) {
                    const orFilter = words.map(w => 'full_name.ilike.%' + w + '%').join(',');
                    const { data: fuzzy } = await supabase.from('affiliates').select('*')
                        .or(orFilter)
                        .eq('jurisdiction_id', jId).order('full_name').limit(10);
                    results.push(...((fuzzy || []) as Affiliate[]).filter(f => !results.some(r => r.id === f.id)));
                }
            }

            // Strategy 3: if IA provided name and we searched by number, also try name
            if (results.length === 0 && aiAffName && aiAffName !== q) {
                const nameWords = aiAffName.split(/\s+/).filter(w => w.length >= 3);
                if (nameWords.length > 0) {
                    const orFilter = nameWords.map(w => 'full_name.ilike.%' + w + '%').join(',');
                    const { data: byName } = await supabase.from('affiliates').select('*')
                        .or(orFilter)
                        .eq('jurisdiction_id', jId).order('full_name').limit(10);
                    results.push(...((byName || []) as Affiliate[]).filter(f => !results.some(r => r.id === f.id)));
                }
            }

            setAffResults(results);
        } catch { setAffResults([]); }
        setSearchingAff(false);
    }, [activeJurisdiction, aiAffName]);

    const searchPracs = useCallback(async (q: string) => {
        if (q.length < 2) { setPracResults([]); return; }
        setSearchingPrac(true);
        try {
            const { data } = await supabase.from('practices').select('*')
                .or('name.ilike.%' + q + '%,code.ilike.%' + q + '%,description.ilike.%' + q + '%')
                .eq('jurisdiction_id', activeJurisdiction?.id || 1).eq('is_active', true).order('code').limit(15);
            setPracResults((data || []).map((p: Record<string, unknown>) => ({
                ...p, description: (p.description as string) || (p.name as string), financial_value: (p.fixed_value as number) || 0,
            })) as Practice[]);
        } catch { setPracResults([]); }
        setSearchingPrac(false);
    }, [activeJurisdiction]);

    useEffect(() => { const t = setTimeout(() => { if (affSearch) searchAffs(affSearch); }, 300); return () => clearTimeout(t); }, [affSearch, searchAffs]);
    useEffect(() => { const t = setTimeout(() => { if (pracSearch) searchPracs(pracSearch); }, 300); return () => clearTimeout(t); }, [pracSearch, searchPracs]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('users').select('id, full_name, role').in('role', ['auditor', 'supervisor']).eq('is_active', true).order('full_name');
            if (data) setAuditorsList(data);
        })();
    }, []);

    useEffect(() => {
        if (practiceItems.length === 0 || !diagnosis) { setCoherenceResult(null); return; }
        const practiceDesc = practiceItems.map(pi => pi.practice.description).join(', ');
        setCoherenceResult(checkCoherence(practiceDesc, diagnosis, diagnosisCode));
        setAiPriorityResult(analyzeClinicalPriority([notes, ocrResult?.text || '', diagnosis, practiceDesc].join(' '), practiceDesc, diagnosis));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [practiceItems, diagnosis, diagnosisCode]);

    // Auto-evaluate rules for real-time coseguro display
    const practiceKey = practiceItems.map(pi => `${pi.practice.id}:${pi.quantity}`).join(',');
    useEffect(() => {
        if (practiceItems.length === 0 || !affiliate || !affiliatePlan || !activeJurisdiction) {
            if (rulesEvaluated) { setRulesResult(null); setRulesEvaluated(false); }
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const result = await RulesEngine.evaluate({
                    type: expedientType, affiliate, plan: affiliatePlan,
                    practices: practiceItems.map(pi => ({
                        practice_id: pi.practice.id, practice: pi.practice, quantity: pi.quantity,
                    })),
                    jurisdiction_id: activeJurisdiction.id,
                });
                if (!cancelled) {
                    setRulesResult(result); setRulesEvaluated(true);
                    setPracticeItems(prev => prev.map((pi, idx) => ({
                        ...pi, ruleResult: result.practices[idx],
                    })));
                }
            } catch { /* silently fail */ }
        }, 500);
        return () => { cancelled = true; clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [practiceKey, affiliate?.id, affiliatePlan?.id, expedientType, activeJurisdiction?.id]);

    const selectAffiliate = useCallback(async (a: Affiliate) => {
        setAffiliate(a); setAffResults([]); setAffSearch('');
        setRulesEvaluated(false); setRulesResult(null);
        setSelectedFamilyMember(null); setAiPriorityResult(null);
        setCoherenceResult(null); setOcrResult(null);
        if (a.plan_id) {
            const { data } = await db('plans').select('*').eq('id', a.plan_id).single();
            if (data) { const plan = data as Plan; setPlanName(plan.name || 'Plan #' + a.plan_id); setAffiliatePlan(plan); }
            else { setPlanName('Plan #' + a.plan_id); setAffiliatePlan(null); }
        } else { setPlanName('Sin plan'); setAffiliatePlan(null); }
    }, []);

    // Auto-select affiliate when IA finds exactly 1 result
    useEffect(() => {
        if (affResults.length === 1 && !affiliate && aiAffName) {
            selectAffiliate(affResults[0]);
        }
    }, [affResults, affiliate, aiAffName, selectAffiliate]);

    const clearAffiliate = useCallback(() => {
        setAffiliate(null); setAffSearch(''); setShowConsumptions(false);
        setConsumptions([]); setDetailedConsumptions([]); setPlanName('');
        setAffiliatePlan(null); setRulesResult(null); setAiAffName(null);
        setConsumptionDateFrom(''); setConsumptionDateTo(''); setConsumptionPracticeFilter('');
    }, []);

    const addPractice = (practice: Practice) => {
        if (practiceItems.some(pi => pi.practice.id === practice.id)) return;
        setPracticeItems(prev => [...prev, { practice, quantity: 1 }]);
        setPracSearch(''); setPracResults([]);
        setRulesEvaluated(false); setRulesResult(null);
    };
    const removePractice = (index: number) => { setPracticeItems(prev => prev.filter((_, i) => i !== index)); setRulesEvaluated(false); setRulesResult(null); };
    const updateQuantity = (index: number, qty: number) => { setPracticeItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, qty) } : item)); setRulesEvaluated(false); setRulesResult(null); };

    const triggerFileUpload = (targetDocType: ExpedientDocumentType) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
        input.multiple = true;
        input.onchange = async (ev) => {
            const rawFiles = Array.from((ev.target as HTMLInputElement).files || []);
            if (rawFiles.length === 0) return;
            for (const f of rawFiles) {
                const check = validateFileSize(f);
                if (!check.valid) { setError(check.message || 'Archivo demasiado grande'); return; }
            }
            setCompressing(true); setError('');
            try {
                const results: CompressResult[] = await Promise.all(rawFiles.map(f => compressImage(f)));
                setFiles(prev => [...prev, ...results.map(r => ({ file: r.file, documentType: targetDocType, originalSize: r.originalSize, wasCompressed: r.wasCompressed, savingsPercent: r.savingsPercent }))]);
            } catch { setError('Error procesando archivos'); }
            setCompressing(false);
        };
        input.click();
    };

    const viewAttachments = async (expedientId: string, expedientNumber: string) => {
        setViewingAttachmentsFor({ expedientId, expedientNumber });
        setLoadingAttachments(true);
        try {
            const { data } = await db('audit_request_attachments').select('*').eq('request_id', expedientId).order('created_at', { ascending: false });
            setAttachments(data || []);
        } catch { setAttachments([]); }
        setLoadingAttachments(false);
    };

    const fetchConsumptions = useCallback(async () => {
        if (!affiliate) return;
        setLoadingConsumptions(true);
        try {
            const { data: exps } = await db('expedients').select('id, expedient_number, created_at, status, resolved_by, diagnosis_code, diagnosis_description').eq('affiliate_id', String(affiliate.id)).order('created_at', { ascending: false }).limit(100);
            const expList = (exps || []) as Record<string, unknown>[];
            const expIds = expList.map(e => e.id as string);
            let expPractices: Record<string, unknown>[] = [];
            if (expIds.length > 0) {
                const { data } = await db('expedient_practices').select('id, expedient_id, practice_id, quantity, status, covered_amount, copay_amount, created_at').in('expedient_id', expIds);
                expPractices = (data || []) as Record<string, unknown>[];
            }
            const allPracticeIds = [...new Set(expPractices.map(ep => ep.practice_id).filter(Boolean))];
            let practiceMap = new Map<unknown, Record<string, unknown>>();
            if (allPracticeIds.length > 0) {
                const { data: practices } = await supabase.from('practices').select('*').in('id', allPracticeIds);
                practiceMap = new Map((practices || []).map((p: Record<string, unknown>) => [p.id, p]));
            }
            const auditorIds = [...new Set(expList.map(e => e.resolved_by).filter(Boolean))];
            let auditorMap = new Map<unknown, string>();
            if (auditorIds.length > 0) {
                const { data: users } = await db('users').select('id, full_name').in('id', auditorIds);
                auditorMap = new Map((users || []).map((u: Record<string, unknown>) => [u.id, u.full_name as string]));
            }
            const expMap = new Map(expList.map(e => [e.id, e]));
            const detailed: DetailedConsumption[] = expPractices.map(ep => {
                const exp = expMap.get(ep.expedient_id) || {} as Record<string, unknown>;
                const prac = practiceMap.get(ep.practice_id) || {} as Record<string, unknown>;
                return {
                    id: (ep.id as string) || String(Math.random()),
                    date: (ep.created_at || (exp as Record<string, unknown>).created_at || '') as string,
                    practiceCode: (prac.code as string) || '',
                    practiceName: (prac.name as string) || 'Practica',
                    practiceId: (ep.practice_id as number) || 0,
                    status: (ep.status as string) || (exp as Record<string, unknown>).status as string || 'pendiente',
                    coveredAmount: (ep.covered_amount as number) || 0,
                    copayAmount: (ep.copay_amount as number) || 0,
                    expedientNumber: ((exp as Record<string, unknown>).expedient_number as string) || '',
                    expedientId: (ep.expedient_id as string) || '',
                    auditorName: auditorMap.get((exp as Record<string, unknown>).resolved_by) || '',
                    providerName: '',
                    quantity: (ep.quantity as number) || 1,
                    source: 'expedient' as const,
                    diagnosisCode: (exp as Record<string, unknown>).diagnosis_code as string || '',
                    diagnosisName: (exp as Record<string, unknown>).diagnosis_description as string || '',
                    fullPractice: prac,
                };
            });
            setDetailedConsumptions(detailed.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
            const grouped: Record<number, { practiceCode: string; practiceName: string; count: number; lastDate: string }> = {};
            for (const d of detailed) {
                if (!grouped[d.practiceId]) grouped[d.practiceId] = { practiceCode: d.practiceCode, practiceName: d.practiceName, count: 0, lastDate: '' };
                grouped[d.practiceId].count += d.quantity;
                if (!grouped[d.practiceId].lastDate || d.date > grouped[d.practiceId].lastDate) grouped[d.practiceId].lastDate = d.date;
            }
            setConsumptions(Object.values(grouped).sort((a, b) => b.count - a.count));
            setShowConsumptions(true);
        } catch { setConsumptions([]); setDetailedConsumptions([]); }
        setLoadingConsumptions(false);
    }, [affiliate]);

    const handleNotesChange = (channel: 'interna' | 'para_afiliado', text: string) => {
        setCommChannel(channel);
        setNotes(text);
    };

    const handleSendMessage = (channel: 'interna' | 'para_afiliado') => {
        if (!notes.trim()) return;
        setChatMessages(prev => [...prev, { from: 'self', text: notes.trim(), date: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), channel }]);
        setNotes('');
    };

    const handlePolishText = (channel: 'interna' | 'para_afiliado') => {
        if (!notes.trim()) return;
        setCommChannel(channel);
        setAiLoading(true);
        const raw = notes.trim();
        let polished: string;
        if (channel === 'para_afiliado') {
            const lower = raw.toLowerCase();
            const isRequest = /falta|adjunt|requiere|neces|enviar|present|remit|debe/.test(lower);
            const isDenial = /deneg|rechaz|no se aprueba|no corresponde/.test(lower);
            const isApproval = /aprob|autoriz|puede coordinar/.test(lower);
            const cleanSentence = raw.charAt(0).toUpperCase() + raw.slice(1);
            const withPeriod = /[.!?]$/.test(cleanSentence) ? cleanSentence : cleanSentence + '.';
            if (isDenial) polished = 'Estimado/a afiliado/a, lamentamos informarle que ' + withPeriod.charAt(0).toLowerCase() + withPeriod.slice(1) + ' En caso de desacuerdo, puede presentar una apelacion formal.';
            else if (isApproval) polished = 'Estimado/a afiliado/a, nos complace informarle que ' + withPeriod.charAt(0).toLowerCase() + withPeriod.slice(1) + ' Quedamos a su disposicion ante cualquier consulta.';
            else if (isRequest) polished = 'Estimado/a afiliado/a, para continuar con el tramite de su solicitud, le informamos que ' + withPeriod.charAt(0).toLowerCase() + withPeriod.slice(1) + ' Agradecemos su colaboracion.';
            else polished = 'Estimado/a afiliado/a, le comunicamos que ' + withPeriod.charAt(0).toLowerCase() + withPeriod.slice(1) + ' Quedamos a su disposicion.';
        } else {
            const sentence = raw.charAt(0).toUpperCase() + raw.slice(1);
            polished = /[.!?]$/.test(sentence) ? sentence : sentence + '.';
        }
        setNotes(polished);
        setAiLoading(false);
    };

    const handleDiseaseSelect = useCallback((sel: DiseaseSelection) => { setDiagnosisCode(sel.code); setDiagnosis(sel.name); }, []);
    const handleDiseaseClear = useCallback(() => { setDiagnosis(''); setDiagnosisCode(''); setDiagInitialSearch(''); }, []);

    // Auto-advance sections
    useEffect(() => {
        if (affiliate && activeSection === 1) {
            const timer = setTimeout(() => setActiveSection(2), 400);
            return () => clearTimeout(timer);
        }
    }, [affiliate, activeSection]);

    useEffect(() => {
        if (diagnosisCode && practiceItems.length > 0 && activeSection === 2) {
            const timer = setTimeout(() => setActiveSection(3), 400);
            return () => clearTimeout(timer);
        }
    }, [diagnosisCode, practiceItems.length, activeSection]);

    const section1Complete = !!affiliate;
    const section2Complete = practiceItems.length > 0;

    const hasOrdenMedica = files.some(f => f.documentType === 'orden_medica');
    const isAffiliateActive = affiliate?.status === 'activo';
    const isAffiliateBlocked = affiliate && !isAffiliateActive;

    const validationErrors: string[] = [];
    if (!affiliate) validationErrors.push('Selecciona un afiliado');
    if (isAffiliateBlocked) validationErrors.push('Afiliado ' + affiliate?.status + ' - no se puede procesar');
    if (practiceItems.length === 0) validationErrors.push('Agrega al menos una practica');
    if (!hasOrdenMedica) validationErrors.push('Orden medica obligatoria - adjunta el archivo');

    const canSubmit = !!affiliate && isAffiliateActive && practiceItems.length > 0 && hasOrdenMedica && !submitting;

    const greenCount = practiceItems.filter(pi => pi.ruleResult?.result === 'verde').length;
    const yellowCount = practiceItems.filter(pi => pi.ruleResult?.result === 'amarillo').length;
    const redCount = practiceItems.filter(pi => pi.ruleResult?.result === 'rojo').length;
    const totalValue = practiceItems.reduce((sum, pi) => sum + (pi.practice.financial_value || 0) * pi.quantity, 0);

    const handleSubmit = async () => {
        if (!canSubmit || !user || !activeJurisdiction || !affiliate) return;
        setSubmitting(true); setError('');
        let finalRulesResult = rulesResult;
        if (!rulesEvaluated && affiliatePlan) {
            try {
                const result = await RulesEngine.evaluate({ type: expedientType, affiliate, plan: affiliatePlan, practices: practiceItems.map(pi => ({ practice_id: pi.practice.id, practice: pi.practice, quantity: pi.quantity })), jurisdiction_id: activeJurisdiction.id });
                finalRulesResult = result; setRulesResult(result); setRulesEvaluated(true);
            } catch { /* enviar sin auto-aprobacion */ }
        }
        try {
            const practiceDesc = practiceItems.map(pi => pi.practice.description).join(', ');
            const allTextForIA = [...chatMessages.map(m => m.text), notes.trim(), ocrResult?.text || '', diagnosis, practiceDesc].join(' ');
            const finalIAPriority = aiPriorityResult ?? analyzeClinicalPriority(allTextForIA, practiceDesc, diagnosis);
            const iaCoherence = coherenceResult ?? { isCoherent: true, warning: null, suggestions: [] };
            const iaSuggestions = buildIASuggestions(finalIAPriority, iaCoherence, { hasDuplicate: false, duplicateExpedientNumbers: [], message: null });
            const beneficiaryId = selectedFamilyMember ? String(selectedFamilyMember.id) : String(affiliate.id);
            const beneficiaryRelation = selectedFamilyMember?.relationship ?? affiliate.relationship;
            const toISO = (d: string) => {
                if (!d || d.length < 10) return undefined;
                if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
                const parts = d.split('/');
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                return undefined;
            };
            const expedient = await ExpedientService.create({
                type: expedientType, priority, affiliate_id: beneficiaryId, affiliate_plan_id: affiliate.plan_id,
                family_member_relation: beneficiaryRelation,
                requesting_doctor_name: doctorName.trim() || undefined,
                requesting_doctor_registration: doctorRegistration.trim() || undefined,
                requesting_doctor_specialty: doctorSpecialty.trim() || undefined,
                provider_name: providerName.trim() || undefined,
                prescription_date: toISO(prescriptionDate),
                prescription_number: prescriptionNumber.trim() || undefined,
                order_expiry_date: toISO(orderExpiryDate),
                diagnosis_code: diagnosisCode || undefined,
                diagnosis_description: diagnosis || undefined,
                assigned_to: assignedAuditorId || undefined,
                request_notes: notes.trim() || undefined,
                requires_control_desk: finalRulesResult?.requires_control_desk || false,
                rules_result: finalRulesResult?.overall,
                created_by: user.id, jurisdiction_id: activeJurisdiction.id,
                clinical_priority_score: finalIAPriority.score,
                ia_suggestions: iaSuggestions, ocr_text: ocrResult?.text || undefined,
                practices: practiceItems.map((pi, idx) => ({
                    practice_id: pi.practice.id, quantity: pi.quantity, practice_value: pi.practice.financial_value,
                    coverage_percent: pi.ruleResult?.coverage_percent ?? finalRulesResult?.practices[idx]?.coverage_percent,
                    covered_amount: pi.ruleResult?.covered_amount ?? finalRulesResult?.practices[idx]?.covered_amount,
                    copay_amount: pi.ruleResult?.copay_amount ?? finalRulesResult?.practices[idx]?.copay_amount,
                    copay_percent: pi.ruleResult?.copay_percent ?? finalRulesResult?.practices[idx]?.copay_percent,
                    rule_result: pi.ruleResult?.result ?? finalRulesResult?.practices[idx]?.result,
                    rule_classification: pi.ruleResult?.classification ?? finalRulesResult?.practices[idx]?.classification,
                    rule_messages: pi.ruleResult?.messages ?? finalRulesResult?.practices[idx]?.messages,
                    sort_order: idx,
                })),
            });
            if (chatMessages.length > 0) {
                for (const msg of chatMessages) {
                    await ExpedientService.addNote({ expedient_id: expedient.id, author_id: user.id, content: msg.text, note_type: msg.channel || 'interna' });
                }
            }
            if (files.length > 0) {
                for (const pf of files) await ExpedientService.uploadAttachment(expedient.id, pf.file, pf.documentType, user.id);
            }
            const codes: string[] = [];
            const gCount = finalRulesResult?.practices.filter(p => p.result === 'verde').length || 0;
            if (gCount > 0 && finalRulesResult?.overall !== 'rojo') {
                const autoResult = await ExpedientService.autoApprovePractices(expedient.id, user.id);
                codes.push(...autoResult.authorized.map((a: { authorization_code: string }) => a.authorization_code));
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
        setAffiliate(null); setPracticeItems([]); setFiles([]); setNotes(''); setDiagnosis('');
        setDiagnosisCode(''); setDiagInitialSearch(''); setPriority('normal');
        setSubmitted(false); setSubmittedExpNumber(''); setAutoApprovedCodes([]);
        setAffSearch(''); setPracSearch(''); setShowConsumptions(false);
        setConsumptions([]); setPlanName(''); setAffiliatePlan(null);
        setRulesEvaluated(false); setRulesResult(null); setExpedientType('ambulatoria');
        setShowPreview(false); setChatMessages([]);
        setDoctorName(''); setDoctorRegistration(''); setDoctorSpecialty('');
        setProviderName(''); setPrescriptionDate(''); setPrescriptionNumber('');
        setOrderExpiryDate(''); setAssignedAuditorId('');
        setLoadMode('ia'); setActiveSection(1); setAiAffName(null); setAiDiagTerms([]);
    };

    if (submitted) {
        return (
            <SuccessView
                submittedExpNumber={submittedExpNumber}
                autoApprovedCodes={autoApprovedCodes}
                practiceItems={practiceItems}
                onReset={resetForm}
            />
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-4">
            <GuidedTour tourId="creation" />
            <div className="flex items-center gap-3">
                <Link href="/audits/requests">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">Solicitud Nueva</h1>
                    <p className="text-xs text-muted-foreground">Apertura de expediente digital de auditoría</p>
                </div>
            </div>

            {/* Tabs IA / Manual */}
            <div data-tour="mode-tabs" className="flex rounded-lg border bg-muted/30 p-0.5">
                <button onClick={() => setLoadMode('ia')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${loadMode === 'ia' ? 'bg-white shadow-sm text-blue-700' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Sparkles className="h-4 w-4" /> Carga con IA
                </button>
                <button onClick={() => setLoadMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${loadMode === 'manual' ? 'bg-white shadow-sm text-blue-700' : 'text-muted-foreground hover:text-foreground'}`}>
                    <PenLine className="h-4 w-4" /> Carga Manual
                </button>
            </div>

            {loadMode === 'ia' && <AIUploadModal onDataParsed={handleAIParsed} />}

            {/* Sección 1: Tipo y Afiliado */}
            <div data-tour="section-1" className="border rounded-xl">
                <button onClick={() => setActiveSection(activeSection === 1 ? 0 : 1)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-t-xl">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${section1Complete ? 'bg-green-100 text-green-700' : activeSection === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {section1Complete ? <Check className="h-4 w-4" /> : '1'}
                    </div>
                    <span className="font-semibold text-sm flex-1 text-left">Tipo y Afiliado</span>
                    <HelpTooltip text="Seleccioná el tipo de solicitud (ambulatoria, internación, etc.) y buscá al afiliado por número, DNI o nombre." position="bottom" />
                    {section1Complete && affiliate && <span className="text-xs text-muted-foreground mr-2 truncate max-w-[200px]">{affiliate.full_name}</span>}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 1 ? 'rotate-180' : ''}`} />
                </button>
                {activeSection === 1 && (
                <div className="p-4 space-y-4 border-t">
            <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Tipo de expediente</label>
                <div className="flex gap-1.5 flex-wrap">
                    {EXPEDIENT_TYPES.map(t => {
                        const Icon = t.icon;
                        const active = expedientType === t.value;
                        return (
                            <button key={t.value} onClick={() => { setExpedientType(t.value); setRulesEvaluated(false); setRulesResult(null); }}
                                className={'flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ' + (active ? t.cls + ' ring-1 ring-current/20' : 'border-border text-muted-foreground hover:border-muted-foreground/40')}>
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t.label}</span>
                                <span className="sm:hidden">{t.short}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <AffiliateSearch
                affSearch={affSearch}
                affResults={affResults}
                affiliate={affiliate}
                searchingAff={searchingAff}
                planName={planName}
                selectedFamilyMember={selectedFamilyMember}
                aiPriorityResult={aiPriorityResult}
                showConsumptions={showConsumptions}
                loadingConsumptions={loadingConsumptions}
                consumptions={consumptions}
                detailedConsumptions={detailedConsumptions}
                practiceItems={practiceItems}
                consumptionDateFrom={consumptionDateFrom}
                consumptionDateTo={consumptionDateTo}
                consumptionPracticeFilter={consumptionPracticeFilter}
                showConsumptionFilters={showConsumptionFilters}
                onAffSearchChange={setAffSearch}
                onSelectAffiliate={selectAffiliate}
                onClearAffiliate={clearAffiliate}
                onSelectFamilyMember={setSelectedFamilyMember}
                onToggleConsumptions={() => {
                    if (!showConsumptions && consumptions.length === 0) fetchConsumptions();
                    else setShowConsumptions(prev => !prev);
                }}
                onFilterChange={(key, value) => {
                    if (key === 'from') setConsumptionDateFrom(value);
                    else if (key === 'to') setConsumptionDateTo(value);
                    else setConsumptionPracticeFilter(value);
                }}
                onClearFilters={() => { setConsumptionDateFrom(''); setConsumptionDateTo(''); setConsumptionPracticeFilter(''); }}
                onToggleFilters={() => setShowConsumptionFilters(prev => !prev)}
                onViewAttachments={viewAttachments}
                onAddPractice={addPractice}
            />
                </div>
                )}
            </div>

            {/* Sección 2: Prácticas y Prescripción */}
            <div data-tour="section-2" className="border rounded-xl">
                <button onClick={() => setActiveSection(activeSection === 2 ? 0 : 2)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-t-xl">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${section2Complete ? 'bg-green-100 text-green-700' : activeSection === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {section2Complete ? <Check className="h-4 w-4" /> : '2'}
                    </div>
                    <span className="font-semibold text-sm flex-1 text-left">Prácticas y Prescripción</span>
                    <HelpTooltip text="Agregá las prácticas médicas, el prescriptor y diagnóstico. El semáforo indica si es auto-aprobable." position="bottom" />
                    {section2Complete && <span className="text-xs text-muted-foreground mr-2">{practiceItems.length} práctica{practiceItems.length !== 1 ? 's' : ''}</span>}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 2 ? 'rotate-180' : ''}`} />
                </button>
                {activeSection === 2 && (
                <div className="p-4 space-y-4 border-t">

            <PracticeSelector
                pracSearch={pracSearch}
                pracResults={pracResults}
                searchingPrac={searchingPrac}
                practiceItems={practiceItems}
                rulesEvaluated={rulesEvaluated}
                greenCount={greenCount}
                yellowCount={yellowCount}
                redCount={redCount}
                totalValue={totalValue}
                onPracSearchChange={setPracSearch}
                onAddPractice={addPractice}
                onRemovePractice={removePractice}
                onUpdateQuantity={updateQuantity}
                onViewHistory={(id, name) => setViewingHistoryFor({ id, name })}
            />

            <PrescriptionForm
                doctorName={doctorName}
                doctorRegistration={doctorRegistration}
                doctorSpecialty={doctorSpecialty}
                providerName={providerName}
                prescriptionDate={prescriptionDate}
                prescriptionNumber={prescriptionNumber}
                orderExpiryDate={orderExpiryDate}
                onDoctorNameChange={setDoctorName}
                onDoctorRegistrationChange={setDoctorRegistration}
                onDoctorSpecialtyChange={setDoctorSpecialty}
                onProviderNameChange={setProviderName}
                onPrescriptionDateChange={setPrescriptionDate}
                onPrescriptionNumberChange={setPrescriptionNumber}
                onOrderExpiryDateChange={setOrderExpiryDate}
            />

            {auditorsList.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" /> Asignar auditor
                        </p>
                    </div>
                    <div className="p-4">
                        <select value={assignedAuditorId} onChange={e => setAssignedAuditorId(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <option value="">- Sin asignar (se asignara despues) -</option>
                            {auditorsList.map(a => (
                                <option key={a.id} value={a.id}>{a.full_name} ({a.role === 'supervisor' ? 'Supervisor' : 'Auditor'})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground mt-1.5">Opcional. Si no se asigna, quedara pendiente para asignacion posterior.</p>
                    </div>
                </div>
            )}

                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground">Prioridad:</label>
                    <div className="flex gap-1">
                        <button onClick={() => setPriority('normal')} className={'px-3 py-1.5 rounded text-sm font-medium border ' + (priority === 'normal' ? 'bg-slate-100 border-slate-300' : 'border-transparent text-muted-foreground')}>Normal</button>
                        <button onClick={() => setPriority('urgente')} className={'px-3 py-1.5 rounded text-sm font-medium border ' + (priority === 'urgente' ? 'bg-red-100 border-red-300 text-red-700' : 'border-transparent text-muted-foreground')}>Urgente</button>
                    </div>
                </div>

                <DiseaseAutocomplete
                    value={diagnosis}
                    code={diagnosisCode}
                    onSelect={handleDiseaseSelect}
                    onClear={handleDiseaseClear}
                    initialSearch={diagInitialSearch}
                    fallbackSearchTerms={aiDiagTerms}
                    autoSelectOnExactCode={!!diagInitialSearch}
                />
                </div>
                )}
            </div>

            {/* Sección 3: Documentos y Envío */}
            <div data-tour="section-3" className="border rounded-xl">
                <button onClick={() => setActiveSection(activeSection === 3 ? 0 : 3)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-t-xl">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${activeSection === 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        3
                    </div>
                    <span className="font-semibold text-sm flex-1 text-left">Documentos y Envío</span>
                    <HelpTooltip text="Adjuntá la orden médica (obligatoria) y documentación adicional. Dejá notas internas antes de enviar." position="bottom" />
                    {files.length > 0 && <span className="text-xs text-muted-foreground mr-2">{files.length} archivo{files.length !== 1 ? 's' : ''}</span>}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 3 ? 'rotate-180' : ''}`} />
                </button>
                {activeSection === 3 && (
                <div className="p-4 space-y-4 border-t">

                <AttachmentsPanel
                    files={files}
                    compressing={compressing}
                    onAddFiles={triggerFileUpload}
                    onRemoveFile={(i) => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                />

                <CommunicationPanel
                    chatMessages={chatMessages}
                    notes={notes}
                    commChannel={commChannel}
                    aiLoading={aiLoading}
                    onNotesChange={handleNotesChange}
                    onSendMessage={handleSendMessage}
                    onPolishText={handlePolishText}
                />

            {validationErrors.length > 0 && affiliate && (
                <div className="space-y-1">
                    {validationErrors.map((ve, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {ve}
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
            )}

            <SubmitPreview
                showPreview={showPreview}
                canSubmit={canSubmit}
                submitting={submitting}
                expedientType={expedientType}
                priority={priority}
                affiliate={affiliate}
                planName={planName}
                diagnosisCode={diagnosisCode}
                diagnosis={diagnosis}
                doctorName={doctorName}
                doctorRegistration={doctorRegistration}
                doctorSpecialty={doctorSpecialty}
                providerName={providerName}
                prescriptionDate={prescriptionDate}
                prescriptionNumber={prescriptionNumber}
                orderExpiryDate={orderExpiryDate}
                assignedAuditorId={assignedAuditorId}
                auditorsList={auditorsList}
                practiceItems={practiceItems}
                totalValue={totalValue}
                files={files}
                chatMessages={chatMessages}
                onShowPreview={() => setShowPreview(true)}
                onHidePreview={() => setShowPreview(false)}
                onSubmit={handleSubmit}
            />

                </div>
                )}
            </div>

            <PracticeHistoryModal
                viewingHistoryFor={viewingHistoryFor}
                detailedConsumptions={detailedConsumptions}
                practiceItems={practiceItems}
                showConsumptions={showConsumptions}
                loadingConsumptions={loadingConsumptions}
                onClose={() => setViewingHistoryFor(null)}
                onLoadConsumptions={fetchConsumptions}
                onViewAttachments={viewAttachments}
            />

            <AttachmentsModal
                viewingAttachmentsFor={viewingAttachmentsFor}
                attachments={attachments}
                loadingAttachments={loadingAttachments}
                onClose={() => setViewingAttachmentsFor(null)}
            />
        </div>
    );
}
