'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Upload, FileText, CheckCircle, X, Image as ImageIcon, AlertTriangle, ChevronDown, Info } from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

// Formato enriquecido que viene del API
interface AIFieldValue {
    value: string;
    confidence: number;
    alternatives?: string[];
}

interface AIPractice {
    name: string;
    code?: string | null;
    quantity?: number;
    confidence: number;
}

interface AIRichResponse {
    affiliate?: AIFieldValue | null;
    affiliateName?: AIFieldValue | null;
    doctor?: AIFieldValue | null;
    doctorRegistration?: AIFieldValue | null;
    diagnosisText?: AIFieldValue | null;
    diagnosisCIE?: string | null;
    diagnosisSearchTerms?: string[];
    prescriptionDate?: AIFieldValue | null;
    notes?: string | null;
    practices?: AIPractice[];
    document_type?: string;
    missing_fields?: string[];
    warnings?: string[];
}

// Formato plano para el callback (compatible con page.tsx)
interface AIParsedDataFlat {
    affiliate?: string;
    doctor?: string;
    practices?: Array<{ name: string; code?: string | null; quantity?: number }>;
    affiliateName?: string | null;
    doctorRegistration?: string | null;
    diagnosisText?: string;
    diagnosisCIE?: string | null;
    diagnosisSearchTerms?: string[];
    prescriptionDate?: string | null;
    notes?: string | null;
}

interface FieldState {
    label: string;
    value: string;
    selected: boolean;
    editing: boolean;
    editValue: string;
    confidence: number;
    alternatives: string[];
}

interface AIUploadModalProps {
    onDataParsed: (data: AIParsedDataFlat, file: File) => void;
}

function getConfidenceColor(c: number): string {
    if (c >= 90) return 'bg-green-500';
    if (c >= 70) return 'bg-yellow-500';
    if (c >= 50) return 'bg-orange-500';
    return 'bg-red-500';
}

function getConfidenceLabel(c: number): string {
    if (c >= 90) return 'Alta';
    if (c >= 70) return 'Media';
    if (c >= 50) return 'Baja';
    return 'Muy baja';
}

function buildFields(data: AIRichResponse): FieldState[] {
    const fields: FieldState[] = [];
    const add = (label: string, field: AIFieldValue | null | undefined) => {
        if (!field || !field.value?.trim()) return;
        fields.push({
            label,
            value: field.value.trim(),
            selected: true,
            editing: false,
            editValue: field.value.trim(),
            confidence: field.confidence ?? 85,
            alternatives: field.alternatives || [],
        });
    };
    add('N° Afiliado / DNI', data.affiliate);
    add('Nombre paciente', data.affiliateName);
    add('Médico prescriptor', data.doctor);
    add('Matrícula médico', data.doctorRegistration);
    add('Fecha prescripción', data.prescriptionDate);

    const diagField = data.diagnosisText;
    if (diagField?.value?.trim()) {
        const diagFull = data.diagnosisCIE ? `${diagField.value.trim()} (${data.diagnosisCIE})` : diagField.value.trim();
        fields.push({
            label: 'Diagnóstico',
            value: diagFull,
            selected: true,
            editing: false,
            editValue: diagFull,
            confidence: diagField.confidence ?? 85,
            alternatives: diagField.alternatives || [],
        });
    }

    const practices = data.practices || [];
    if (practices.length > 0) {
        const avgConf = Math.round(practices.reduce((s, p) => s + (p.confidence ?? 85), 0) / practices.length);
        const practiceStr = practices.map(p => `${p.name}${p.code ? ` [${p.code}]` : ''}${p.quantity && p.quantity > 1 ? ` x${p.quantity}` : ''}`).join(', ');
        fields.push({
            label: 'Prácticas solicitadas',
            value: practiceStr,
            selected: true,
            editing: false,
            editValue: practiceStr,
            confidence: avgConf,
            alternatives: [],
        });
    }

    if (data.notes?.trim()) {
        fields.push({
            label: 'Notas adicionales',
            value: data.notes.trim(),
            selected: true,
            editing: false,
            editValue: data.notes.trim(),
            confidence: 85,
            alternatives: [],
        });
    }

    return fields;
}

export function AIUploadModal({ onDataParsed }: AIUploadModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<AIRichResponse | null>(null);
    const [processedFile, setProcessedFile] = useState<File | null>(null);
    const [fields, setFields] = useState<FieldState[]>([]);
    const [showReview, setShowReview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isPdf = useMemo(() => processedFile?.type === 'application/pdf', [processedFile]);

    const warnings = parsedData?.warnings || [];
    const missingFields = parsedData?.missing_fields || [];
    const documentType = parsedData?.document_type;

    const docTypeLabels: Record<string, string> = {
        orden_medica: 'Orden Médica',
        receta: 'Receta',
        laboratorio: 'Laboratorio',
        estudio: 'Estudio',
        historia_clinica: 'Historia Clínica',
        factura: 'Factura',
        otro: 'Otro',
    };

    const missingLabels: Record<string, string> = {
        affiliate: 'N° Afiliado',
        affiliateName: 'Nombre paciente',
        doctor: 'Médico',
        doctorRegistration: 'Matrícula',
        practices: 'Prácticas',
        diagnosis: 'Diagnóstico',
        prescriptionDate: 'Fecha',
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }

        setIsProcessing(true);
        setError(null);
        setParsedData(null);
        setFields([]);
        setShowReview(true);

        try {
            let fileToProcess = file;
            if (file.type.startsWith('image/')) {
                const { file: compressedFile } = await compressImage(file, { maxDimension: 1200, quality: 0.6 });
                fileToProcess = compressedFile;
            }

            const formData = new FormData();
            formData.append('file', fileToProcess);

            const res = await fetch('/api/ai/parse-document', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const details = data.details || '';
                if (data.error?.includes('API Key') || details.includes('API_KEY')) {
                    throw new Error('GEMINI_API_KEY no configurada. Agregue la variable en el panel de Vercel (Settings → Environment Variables) y en su archivo .env.local');
                }
                throw new Error(data.error || 'Error procesando la imagen con IA');
            }

            const result: AIRichResponse = await res.json();
            setParsedData(result);
            setProcessedFile(fileToProcess);
            setFields(buildFields(result));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error('Error from AI:', err);
            setError(msg);
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleEdit = (i: number) => {
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, editing: !f.editing, editValue: f.value } : f));
    };

    const saveEdit = (i: number) => {
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, value: f.editValue, editing: false, selected: true } : f));
    };

    const toggleSelected = (i: number) => {
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, selected: !f.selected } : f));
    };

    const selectAlternative = (fieldIdx: number, alt: string) => {
        setFields(prev => prev.map((f, idx) => idx === fieldIdx ? { ...f, value: alt, editValue: alt, selected: true } : f));
    };

    const confirmAndSend = () => {
        if (!parsedData || !processedFile) return;
        const selected = fields.filter(f => f.selected);
        const get = (label: string) => selected.find(f => f.label === label)?.value;

        const finalData: AIParsedDataFlat = {};
        const affVal = get('N° Afiliado / DNI');
        if (affVal) finalData.affiliate = affVal;

        finalData.affiliateName = get('Nombre paciente') || null;
        if (get('Médico prescriptor')) finalData.doctor = get('Médico prescriptor');
        finalData.doctorRegistration = get('Matrícula médico') || null;
        finalData.prescriptionDate = get('Fecha prescripción') || null;
        finalData.notes = get('Notas adicionales') || null;

        // Diagnosis: split back from "Text (CIE)" format
        const diagVal = get('Diagnóstico');
        if (diagVal) {
            const match = diagVal.match(/^(.+?)\s*\(([A-Z]\d[\d.]*)\)$/);
            if (match) {
                finalData.diagnosisText = match[1].trim();
                finalData.diagnosisCIE = match[2];
            } else {
                finalData.diagnosisText = diagVal;
                finalData.diagnosisCIE = parsedData.diagnosisCIE || null;
            }
        }
        finalData.diagnosisSearchTerms = parsedData.diagnosisSearchTerms || [];
        finalData.practices = parsedData.practices?.map(p => ({ name: p.name, code: p.code, quantity: p.quantity })) || [];

        onDataParsed(finalData, processedFile);
        setShowReview(false);
        setParsedData(null);
        setFields([]);
        setImagePreview(null);
        setProcessedFile(null);
    };

    const cancelReview = () => {
        setShowReview(false);
        setParsedData(null);
        setFields([]);
        setImagePreview(null);
        setProcessedFile(null);
        setError(null);
    };

    const selectedCount = fields.filter(f => f.selected).length;

    return (
        <>
            {/* Botón principal de carga */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Sparkles className="h-32 w-32 text-blue-600" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            Carga Asistida con IA
                        </h2>
                        <p className="text-xs text-blue-700/80 mt-1 max-w-2xl">
                            Suba una foto de la orden médica o receta. La IA extraerá los datos y podrá revisarlos campo por campo antes de aceptar.
                        </p>
                    </div>
                    <div className="shrink-0 w-full md:w-auto">
                        <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        <Button
                            size="lg"
                            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold text-sm py-5 px-6 rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando...</>
                            ) : (
                                <><Upload className="h-4 w-4 mr-2" /> Subir Orden Médica</>
                            )}
                        </Button>
                    </div>
                </div>

                {error && !showReview && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Error al procesar</p>
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Panel de revisión */}
            {showReview && (
                <div className="border-2 border-blue-300 rounded-xl overflow-hidden bg-white shadow-lg">
                    {/* Header */}
                    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold text-sm">Revisión de datos extraídos por IA</span>
                            {documentType && (
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                                    {docTypeLabels[documentType] || documentType}
                                </span>
                            )}
                        </div>
                        <button onClick={cancelReview} className="text-white/80 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Warnings banner */}
                    {(warnings.length > 0 || missingFields.length > 0) && !isProcessing && (
                        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 space-y-1">
                            {warnings.map((w, i) => (
                                <div key={`w-${i}`} className="flex items-start gap-2 text-xs text-amber-800">
                                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                                    <span>{w}</span>
                                </div>
                            ))}
                            {missingFields.length > 0 && (
                                <div className="flex items-start gap-2 text-xs text-amber-800">
                                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                                    <span>
                                        No detectado: {missingFields.map(f => missingLabels[f] || f).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-blue-100">
                        {/* Columna izquierda: Preview */}
                        <div className="p-4 bg-gray-50 min-h-[300px] flex flex-col">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5" /> Documento subido
                            </p>
                            {imagePreview ? (
                                <div className="flex-1 flex items-center justify-center rounded-lg overflow-hidden border bg-white">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imagePreview} alt="Orden médica subida" className="max-w-full max-h-[500px] object-contain" />
                                </div>
                            ) : isPdf ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-white rounded-lg border p-8">
                                    <FileText className="h-16 w-16 mb-3 text-red-400" />
                                    <p className="text-sm font-medium">Documento PDF</p>
                                    <p className="text-xs text-muted-foreground mt-1">La previsualización no está disponible para PDFs</p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-white rounded-lg border p-8">
                                    <Loader2 className="h-10 w-10 animate-spin mb-3 text-blue-400" />
                                    <p className="text-sm">Cargando imagen...</p>
                                </div>
                            )}
                        </div>

                        {/* Columna derecha: Campos */}
                        <div className="p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> Campos detectados
                                    {fields.length > 0 && (
                                        <span className="ml-1 text-[10px] font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                            {selectedCount}/{fields.length}
                                        </span>
                                    )}
                                </p>
                            </div>

                            {isProcessing && (
                                <div className="flex-1 flex flex-col items-center justify-center py-12">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
                                        <div className="relative p-4 bg-blue-100 rounded-full">
                                            <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-blue-900 mt-4">Analizando con Gemini 2.5 Flash...</p>
                                    <p className="text-xs text-blue-600 mt-1">Extrayendo datos del documento</p>
                                    <div className="mt-4 flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && showReview && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-medium text-red-800 flex items-center gap-1.5">
                                        <X className="h-4 w-4" /> Error al procesar
                                    </p>
                                    <p className="text-xs text-red-600 mt-1">{error}</p>
                                    <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => fileInputRef.current?.click()}>
                                        Reintentar con otro archivo
                                    </Button>
                                </div>
                            )}

                            {!isProcessing && !error && fields.length > 0 && (
                                <div className="space-y-2 flex-1">
                                    {fields.map((field, i) => (
                                        <div key={i} className={`rounded-lg border p-2.5 transition-all ${field.selected ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
                                            <div className="flex items-start gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={field.selected}
                                                    onChange={() => toggleSelected(i)}
                                                    className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{field.label}</p>
                                                        {/* Confidence indicator */}
                                                        <div className="flex items-center gap-1" title={`Confianza: ${field.confidence}% — ${getConfidenceLabel(field.confidence)}`}>
                                                            <div className="h-1.5 w-8 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${getConfidenceColor(field.confidence)}`}
                                                                    style={{ width: `${field.confidence}%` }}
                                                                />
                                                            </div>
                                                            {field.confidence < 70 && (
                                                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {field.editing ? (
                                                        <input
                                                            value={field.editValue}
                                                            onChange={e => setFields(prev => prev.map((f, idx) => idx === i ? { ...f, editValue: e.target.value } : f))}
                                                            onBlur={() => saveEdit(i)}
                                                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(i); if (e.key === 'Escape') toggleEdit(i); }}
                                                            className="w-full text-sm border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <p
                                                            className="text-sm font-medium mt-0.5 cursor-text hover:bg-white/80 rounded px-1 -mx-1 py-0.5 transition-colors"
                                                            onClick={() => { toggleEdit(i); if (!field.selected) toggleSelected(i); }}
                                                            title="Clic para editar"
                                                        >
                                                            {field.value}
                                                        </p>
                                                    )}

                                                    {/* Alternatives for low-confidence fields */}
                                                    {field.alternatives.length > 0 && field.confidence < 70 && !field.editing && (
                                                        <div className="mt-1">
                                                            <details className="group">
                                                                <summary className="text-[10px] text-amber-700 cursor-pointer flex items-center gap-1 hover:text-amber-900">
                                                                    <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                                                    {field.alternatives.length} alternativa{field.alternatives.length > 1 ? 's' : ''}
                                                                </summary>
                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                    {field.alternatives.map((alt, ai) => (
                                                                        <button
                                                                            key={ai}
                                                                            onClick={() => selectAlternative(i, alt)}
                                                                            className="text-[11px] px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-200 transition-colors"
                                                                        >
                                                                            {alt}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isProcessing && !error && fields.length === 0 && parsedData && (
                                <div className="flex-1 flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <FileText className="h-10 w-10 mb-2" />
                                    <p className="text-sm">No se detectaron campos legibles</p>
                                    <p className="text-xs mt-1">Intente con una imagen más clara</p>
                                </div>
                            )}

                            {/* Botones de acción */}
                            {!isProcessing && !error && fields.length > 0 && (
                                <div className="mt-3 pt-3 border-t flex gap-2">
                                    <Button size="sm" variant="outline" className="text-xs" onClick={cancelReview}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={confirmAndSend}
                                        disabled={selectedCount === 0}
                                    >
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        Agregar datos ({selectedCount}/{fields.length})
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
