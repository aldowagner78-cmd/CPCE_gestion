'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Upload, FileText, CheckCircle, X, Check, Pencil, Trash2, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

interface AIParsedData {
    affiliate?: string;
    doctor?: string;
    practices?: string[] | Array<{ name: string; code?: string | null; quantity?: number }>;
    diagnosis?: string;
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
    accepted: boolean;
    editing: boolean;
    deleted: boolean;
    editValue: string;
}

interface AIUploadModalProps {
    onDataParsed: (data: AIParsedData, file: File) => void;
}

function buildFields(data: AIParsedData): FieldState[] {
    const fields: FieldState[] = [];
    const add = (label: string, val: string | null | undefined) => {
        if (val && val.trim()) fields.push({ label, value: val.trim(), accepted: false, editing: false, deleted: false, editValue: val.trim() });
    };
    add('N° Afiliado / DNI', data.affiliate);
    add('Nombre paciente', data.affiliateName);
    add('Médico prescriptor', data.doctor);
    add('Matrícula médico', data.doctorRegistration);
    add('Fecha prescripción', data.prescriptionDate);
    const diagText = data.diagnosisText || data.diagnosis;
    const diagFull = diagText ? (data.diagnosisCIE ? `${diagText} (${data.diagnosisCIE})` : diagText) : null;
    add('Diagnóstico', diagFull);
    const practices = data.practices || [];
    if (practices.length > 0) {
        const practiceStr = practices.map(p => typeof p === 'string' ? p : `${p.name}${p.code ? ` [${p.code}]` : ''}${p.quantity && p.quantity > 1 ? ` x${p.quantity}` : ''}`).join(', ');
        add('Prácticas solicitadas', practiceStr);
    }
    add('Notas adicionales', data.notes);
    return fields;
}

export function AIUploadModal({ onDataParsed }: AIUploadModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<AIParsedData | null>(null);
    const [processedFile, setProcessedFile] = useState<File | null>(null);
    const [fields, setFields] = useState<FieldState[]>([]);
    const [showReview, setShowReview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isPdf = useMemo(() => processedFile?.type === 'application/pdf', [processedFile]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Mostrar preview de imagen inmediatamente
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
                const { file: compressedFile } = await compressImage(file);
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

            const result: AIParsedData = await res.json();
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

    const acceptAll = () => {
        setFields(prev => prev.map(f => f.deleted ? f : { ...f, accepted: true, editing: false }));
    };

    const toggleAccept = (i: number) => {
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, accepted: !f.accepted, editing: false } : f));
    };

    const toggleEdit = (i: number) => {
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, editing: !f.editing, editValue: f.value } : f));
    };

    const saveEdit = (i: number) => {
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, value: f.editValue, editing: false, accepted: true } : f));
    };

    const deleteField = (i: number) => {
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, deleted: true, accepted: false } : f));
    };

    const confirmAndSend = () => {
        if (!parsedData || !processedFile) return;
        // Reconstruir data con los campos aceptados/editados
        const accepted = fields.filter(f => f.accepted && !f.deleted);
        const get = (label: string) => accepted.find(f => f.label === label)?.value;

        const finalData: AIParsedData = { ...parsedData };
        const affVal = get('N° Afiliado / DNI');
        if (affVal !== undefined) finalData.affiliate = affVal;
        else delete finalData.affiliate;

        const nameVal = get('Nombre paciente');
        finalData.affiliateName = nameVal || null;

        const docVal = get('Médico prescriptor');
        if (docVal !== undefined) finalData.doctor = docVal;
        else delete finalData.doctor;

        const matVal = get('Matrícula médico');
        finalData.doctorRegistration = matVal || null;

        const dateVal = get('Fecha prescripción');
        finalData.prescriptionDate = dateVal || null;

        const notesVal = get('Notas adicionales');
        finalData.notes = notesVal || null;

        onDataParsed(finalData, processedFile);
        // Limpiar estado
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

    const activeFields = fields.filter(f => !f.deleted);
    const acceptedCount = activeFields.filter(f => f.accepted).length;
    const allAccepted = activeFields.length > 0 && acceptedCount === activeFields.length;

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

                {/* Error sin review abierto */}
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

            {/* Panel de revisión: imagen + campos extraídos */}
            {showReview && (
                <div className="border-2 border-blue-300 rounded-xl overflow-hidden bg-white shadow-lg">
                    {/* Header */}
                    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold text-sm">Revisión de datos extraídos por IA</span>
                        </div>
                        <button onClick={cancelReview} className="text-white/80 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-blue-100">
                        {/* Columna izquierda: Preview de imagen */}
                        <div className="p-4 bg-gray-50 min-h-[300px] flex flex-col">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5" /> Documento subido
                            </p>
                            {imagePreview ? (
                                <div className="flex-1 flex items-center justify-center rounded-lg overflow-hidden border bg-white">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imagePreview}
                                        alt="Orden médica subida"
                                        className="max-w-full max-h-[500px] object-contain"
                                    />
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

                        {/* Columna derecha: Campos extraídos */}
                        <div className="p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> Campos detectados
                                    {activeFields.length > 0 && (
                                        <span className="ml-1 text-[10px] font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                            {acceptedCount}/{activeFields.length}
                                        </span>
                                    )}
                                </p>
                                {activeFields.length > 0 && !allAccepted && (
                                    <button onClick={acceptAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Aceptar todos
                                    </button>
                                )}
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
                                    {fields.map((field, i) => field.deleted ? null : (
                                        <div key={i} className={`rounded-lg border p-2.5 transition-all ${field.accepted ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white'}`}>
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{field.label}</p>
                                                    {field.editing ? (
                                                        <div className="mt-1 flex gap-1.5">
                                                            <input
                                                                value={field.editValue}
                                                                onChange={e => setFields(prev => prev.map((f, idx) => idx === i ? { ...f, editValue: e.target.value } : f))}
                                                                className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => saveEdit(i)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Guardar">
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                            <button onClick={() => toggleEdit(i)} className="p-1 text-gray-400 hover:bg-gray-50 rounded" title="Cancelar">
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-medium truncate mt-0.5">{field.value}</p>
                                                    )}
                                                </div>
                                                {!field.editing && (
                                                    <div className="flex items-center gap-0.5 shrink-0 mt-1">
                                                        <button onClick={() => toggleAccept(i)}
                                                            className={`p-1 rounded transition-colors ${field.accepted ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                                            title={field.accepted ? 'Aceptado' : 'Aceptar'}>
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => toggleEdit(i)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Editar">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => deleteField(i)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
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
                                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={cancelReview}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                                        onClick={confirmAndSend}
                                        disabled={acceptedCount === 0}
                                    >
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        {allAccepted ? 'Confirmar todos' : `Confirmar ${acceptedCount} campo${acceptedCount !== 1 ? 's' : ''}`}
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
