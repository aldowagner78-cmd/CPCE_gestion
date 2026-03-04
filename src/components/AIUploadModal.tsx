'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Upload, FileText, CheckCircle, X } from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

interface AIParsedData {
    // Campos originales (compatibilidad hacia atrás)
    affiliate?: string;
    doctor?: string;
    practices?: string[] | Array<{ name: string; code?: string | null; quantity?: number }>;
    diagnosis?: string; // alias de diagnosisText para compatibilidad
    // Campos nuevos (prompt enriquecido)
    affiliateName?: string | null;
    doctorRegistration?: string | null;
    diagnosisText?: string;
    diagnosisCIE?: string | null;
    diagnosisSearchTerms?: string[];
    prescriptionDate?: string | null;
    notes?: string | null;
}

interface AIUploadModalProps {
    onDataParsed: (data: AIParsedData, file: File) => void;
}

export function AIUploadModal({ onDataParsed }: AIUploadModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setIsOpen(true);

        try {
            // Compress the image before sending to save bandwidth and API limits
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
                const data = await res.json();
                throw new Error(data.error || 'Error procesando la imagen con IA');
            }

            const parsedData: AIParsedData = await res.json();
            onDataParsed(parsedData, fileToProcess);
            setIsOpen(false);
        } catch (err: any) {
            console.error('Error from AI:', err);
            setError(err.message || 'Error desconocido');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="h-32 w-32 text-blue-600" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900">
                        <Sparkles className="h-6 w-6 text-blue-600" />
                        Carga Asistida con IA (Gemini 2.5 Flash)
                    </h2>
                    <p className="text-sm text-blue-700/80 mt-1 max-w-2xl">
                        Ahorre tiempo. Suba una foto de la orden médica manuscrita o receta y la IA extraerá automáticamente el afiliado, médico, prácticas y diagnóstico.
                    </p>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <Button
                        size="lg"
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold text-base py-6 px-8 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Analizando documento...
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5 mr-2" />
                                Subir Receta / Orden Médica
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {isProcessing && (
                <div className="mt-4 p-4 bg-white/60 backdrop-blur border border-blue-100 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full animate-pulse">
                        <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-blue-900">Procesando con Gemini 2.5 Flash...</p>
                        <p className="text-xs text-blue-700">Digitalizando letra manuscrita y estructurando datos.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <X className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">No se pudo procesar la imagen</p>
                        <p className="text-xs text-red-600">{error}</p>
                        <p className="text-xs text-red-600 mt-1">Verifique que su GEMINI_API_KEY esté configurada en `.env.local`.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
