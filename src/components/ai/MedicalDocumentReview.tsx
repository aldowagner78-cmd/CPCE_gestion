'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sparkles, Upload, Loader2, CheckCircle2, AlertCircle,
    User, Stethoscope, Calendar, FileText, ClipboardList,
    Hash, Brain, StickyNote, ChevronRight, PenLine
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';
import { ImagePreview } from './ImagePreview';
import { FieldReviewCard, type FieldStatus } from './FieldReviewCard';

// ── Tipos ──

export interface AIParsedData {
    affiliate?: string;
    affiliateName?: string | null;
    doctor?: string;
    doctorRegistration?: string | null;
    practices?: string[] | Array<{ name: string; code?: string | null; quantity?: number }>;
    diagnosis?: string;
    diagnosisText?: string;
    diagnosisCIE?: string | null;
    diagnosisSearchTerms?: string[];
    prescriptionDate?: string | null;
    notes?: string | null;
}

export interface ValidatedField {
    key: string;
    label: string;
    value: string;
    accepted: boolean;
}

export interface ReviewCompletedData {
    fields: ValidatedField[];
    file: File;
    rawAIData: AIParsedData;
}

interface MedicalDocumentReviewProps {
    onComplete: (data: ReviewCompletedData) => void;
    onSkip: () => void;
}

// ── Field config ──

interface FieldConfig {
    key: string;
    label: string;
    icon: React.ReactNode;
    multiline?: boolean;
    extract: (data: AIParsedData) => string;
}

const FIELD_CONFIG: FieldConfig[] = [
    {
        key: 'affiliateName',
        label: 'Paciente',
        icon: <User className="h-3.5 w-3.5" />,
        extract: d => d.affiliateName || '',
    },
    {
        key: 'affiliate',
        label: 'Nro. Afiliado / DNI',
        icon: <Hash className="h-3.5 w-3.5" />,
        extract: d => d.affiliate || '',
    },
    {
        key: 'doctor',
        label: 'Médico Prescriptor',
        icon: <Stethoscope className="h-3.5 w-3.5" />,
        extract: d => d.doctor || '',
    },
    {
        key: 'doctorRegistration',
        label: 'Matrícula',
        icon: <ClipboardList className="h-3.5 w-3.5" />,
        extract: d => d.doctorRegistration || '',
    },
    {
        key: 'prescriptionDate',
        label: 'Fecha de Prescripción',
        icon: <Calendar className="h-3.5 w-3.5" />,
        extract: d => d.prescriptionDate || '',
    },
    {
        key: 'diagnosisText',
        label: 'Diagnóstico',
        icon: <Brain className="h-3.5 w-3.5" />,
        extract: d => d.diagnosisText || d.diagnosis || '',
    },
    {
        key: 'diagnosisCIE',
        label: 'Código CIE',
        icon: <FileText className="h-3.5 w-3.5" />,
        extract: d => d.diagnosisCIE || '',
    },
    {
        key: 'practices',
        label: 'Prácticas Solicitadas',
        icon: <ClipboardList className="h-3.5 w-3.5" />,
        multiline: true,
        extract: d => {
            if (!d.practices || d.practices.length === 0) return '';
            return d.practices.map(p => {
                if (typeof p === 'string') return p;
                const qty = p.quantity && p.quantity > 1 ? ` (x${p.quantity})` : '';
                const code = p.code ? ` [${p.code}]` : '';
                return `${p.name}${code}${qty}`;
            }).join('\n');
        },
    },
    {
        key: 'notes',
        label: 'Observaciones',
        icon: <StickyNote className="h-3.5 w-3.5" />,
        multiline: true,
        extract: d => d.notes || '',
    },
];

// ── Processing states ──
type ProcessingState = 'idle' | 'uploading' | 'processing' | 'reviewing' | 'error';

// ════════════════════════════════════════════════════
// ═  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════

export function MedicalDocumentReview({ onComplete, onSkip }: MedicalDocumentReviewProps) {
    const [state, setState] = useState<ProcessingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<AIParsedData | null>(null);
    const [fieldStatuses, setFieldStatuses] = useState<Record<string, FieldStatus>>({});
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [elapsedMs, setElapsedMs] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Timer for showing elapsed processing time ──
    const startTimer = useCallback(() => {
        setElapsedMs(0);
        timerRef.current = setInterval(() => {
            setElapsedMs(prev => prev + 100);
        }, 100);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ── Upload and process ──
    const handleFileSelect = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        setState('uploading');
        startTimer();

        try {
            // Compress if image
            let fileToProcess = selectedFile;
            if (selectedFile.type.startsWith('image/')) {
                setState('uploading');
                const { file: compressed } = await compressImage(selectedFile);
                fileToProcess = compressed;
            }

            setState('processing');

            const formData = new FormData();
            formData.append('file', fileToProcess);

            const res = await fetch('/api/ai/parse-document', {
                method: 'POST',
                body: formData,
            });

            stopTimer();

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: 'Error del servidor' }));
                throw new Error(errData.error || 'Error procesando el documento con IA');
            }

            const parsedData: AIParsedData = await res.json();
            setRawData(parsedData);

            // Initialize field statuses and values
            const statuses: Record<string, FieldStatus> = {};
            const values: Record<string, string> = {};
            for (const cfg of FIELD_CONFIG) {
                const val = cfg.extract(parsedData);
                values[cfg.key] = val;
                statuses[cfg.key] = val ? 'pending' : 'deleted'; // Auto-delete empty fields
            }
            setFieldStatuses(statuses);
            setFieldValues(values);
            setState('reviewing');

        } catch (err: unknown) {
            stopTimer();
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            setError(msg);
            setState('error');
        }
    }, [startTimer, stopTimer]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleFileSelect(f);
        if (e.target) e.target.value = '';
    }, [handleFileSelect]);

    // ── Field actions ──
    const handleFieldAccept = useCallback((key: string, value: string) => {
        setFieldStatuses(prev => ({ ...prev, [key]: 'accepted' }));
        setFieldValues(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleFieldDelete = useCallback((key: string) => {
        setFieldStatuses(prev => ({ ...prev, [key]: 'deleted' }));
    }, []);

    const handleFieldEdit = useCallback((key: string, value: string) => {
        // Restore a deleted field or update value
        setFieldStatuses(prev => ({ ...prev, [key]: 'pending' }));
        setFieldValues(prev => ({ ...prev, [key]: value }));
    }, []);

    // ── Accept all ──
    const handleAcceptAll = useCallback(() => {
        setFieldStatuses(prev => {
            const next = { ...prev };
            for (const key in next) {
                if (next[key] === 'pending') next[key] = 'accepted';
            }
            return next;
        });
    }, []);

    // ── Check if all non-deleted fields are accepted ──
    const allReviewed = Object.entries(fieldStatuses).every(
        ([, status]) => status === 'accepted' || status === 'deleted'
    );
    const acceptedCount = Object.values(fieldStatuses).filter(s => s === 'accepted').length;
    const pendingCount = Object.values(fieldStatuses).filter(s => s === 'pending').length;
    const totalFields = Object.keys(fieldStatuses).length;

    // ── Complete review ──
    const handleComplete = useCallback(() => {
        if (!file || !rawData) return;

        const fields: ValidatedField[] = FIELD_CONFIG
            .filter(cfg => fieldStatuses[cfg.key] !== 'deleted')
            .map(cfg => ({
                key: cfg.key,
                label: cfg.label,
                value: fieldValues[cfg.key] || '',
                accepted: fieldStatuses[cfg.key] === 'accepted',
            }));

        onComplete({ fields, file, rawAIData: rawData });
    }, [file, rawData, fieldStatuses, fieldValues, onComplete]);

    // ════════════════════════════════════════
    // ═  VISTA: IDLE — Upload prompt
    // ════════════════════════════════════════

    if (state === 'idle') {
        return (
            <div className="border-2 border-dashed border-blue-200 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-8 relative overflow-hidden">
                {/* Background sparkle */}
                <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                    <Sparkles className="h-40 w-40 text-blue-600" />
                </div>

                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                    <div className="p-4 bg-blue-100 rounded-2xl">
                        <Sparkles className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-blue-900">
                            Carga Inteligente de Pedido Médico
                        </h2>
                        <p className="text-sm text-blue-700/70 mt-1 max-w-md">
                            Suba una foto de la receta u orden médica. La IA Gemini 2.5 extraerá automáticamente todos los datos en segundos.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            capture="environment"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <Button
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg font-semibold text-base py-6 px-8 rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-5 w-5 mr-2" />
                            Subir Pedido Médico
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="text-muted-foreground border-muted-foreground/30 py-6 px-6 rounded-full"
                            onClick={onSkip}
                        >
                            <PenLine className="h-4 w-4 mr-2" />
                            Carga Manual
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════
    // ═  VISTA: UPLOADING / PROCESSING
    // ════════════════════════════════════════

    if (state === 'uploading' || state === 'processing') {
        const seconds = (elapsedMs / 1000).toFixed(1);
        return (
            <div className="border rounded-2xl bg-gradient-to-br from-blue-50/30 to-indigo-50/30 p-8">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="relative">
                        <div className="p-4 bg-blue-100 rounded-2xl animate-pulse">
                            <Sparkles className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-900">
                            {state === 'uploading' ? 'Preparando imagen...' : 'Analizando con Gemini 2.5 Flash...'}
                        </h3>
                        <p className="text-sm text-blue-700/60 mt-1">
                            {state === 'uploading'
                                ? 'Comprimiendo y enviando el documento'
                                : 'Extrayendo datos del pedido médico. Esto toma pocos segundos.'
                            }
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs">
                        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{
                                    width: state === 'uploading' ? '30%' : `${Math.min(30 + (elapsedMs / 100), 95)}%`,
                                }}
                            />
                        </div>
                        <p className="text-xs text-blue-600/60 mt-1 font-mono">{seconds}s</p>
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════
    // ═  VISTA: ERROR
    // ════════════════════════════════════════

    if (state === 'error') {
        return (
            <div className="border-2 border-red-200 rounded-2xl bg-red-50/30 p-8">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-3 bg-red-100 rounded-xl">
                        <AlertCircle className="h-7 w-7 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-800">No se pudo procesar el documento</h3>
                        <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => { setState('idle'); setError(null); setFile(null); }}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                            Reintentar
                        </Button>
                        <Button onClick={onSkip}>
                            <PenLine className="h-4 w-4 mr-1" />
                            Carga Manual
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════
    // ═  VISTA: REVIEWING — Side by side
    // ════════════════════════════════════════

    const seconds = (elapsedMs / 1000).toFixed(1);

    return (
        <div className="space-y-4">
            {/* Header with stats */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        Revisión del Pedido Médico
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Procesado en {seconds}s · Revise y confirme cada dato extraído
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        {acceptedCount}/{totalFields} aceptados
                        {pendingCount > 0 && ` · ${pendingCount} pendientes`}
                    </span>
                    {pendingCount > 0 && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                            onClick={handleAcceptAll}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Aceptar todo
                        </Button>
                    )}
                </div>
            </div>

            {/* Side-by-side layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
                {/* Left: Original document */}
                <div className="lg:sticky lg:top-4 lg:self-start h-[400px] lg:h-[600px]">
                    <ImagePreview file={file} />
                </div>

                {/* Right: Extracted data fields */}
                <div className="space-y-2.5">
                    {FIELD_CONFIG.map(cfg => {
                        const value = fieldValues[cfg.key] || '';
                        const status = fieldStatuses[cfg.key] || 'pending';

                        // Skip if field has no value and was auto-deleted
                        if (!value && status === 'deleted') return null;

                        return (
                            <FieldReviewCard
                                key={cfg.key}
                                label={cfg.label}
                                value={value}
                                fieldKey={cfg.key}
                                status={status}
                                icon={cfg.icon}
                                multiline={cfg.multiline}
                                onAccept={handleFieldAccept}
                                onDelete={handleFieldDelete}
                                onEdit={handleFieldEdit}
                            />
                        );
                    })}

                    {/* Continue button */}
                    <div className="pt-4 border-t flex items-center justify-between gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => { setState('idle'); setFile(null); setRawData(null); }}
                        >
                            Subir otro documento
                        </Button>
                        <Button
                            size="lg"
                            className={`
                                font-semibold rounded-full px-8 transition-all
                                ${allReviewed
                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }
                            `}
                            onClick={allReviewed ? handleComplete : handleAcceptAll}
                        >
                            {allReviewed ? (
                                <>
                                    Continuar con la Solicitud
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Aceptar Todo y Continuar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
