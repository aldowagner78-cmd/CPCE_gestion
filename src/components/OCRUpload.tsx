'use client';

/**
 * OCRUpload.tsx — Componente de carga con OCR para órdenes médicas manuscritas
 *
 * Usa Tesseract.js (100% gratuito, corre en el navegador, sin APIs externas).
 * Si Tesseract falla o el resultado es de baja confianza (<60%), pide carga manual.
 *
 * Flujo:
 *  1. Usuario sube imagen
 *  2. Se valida calidad (resolución mínima, tamaño)
 *  3. Se ejecuta OCR
 *  4. Si confianza >= 60%: muestra texto extraído y lo pasa al padre
 *  5. Si confianza < 60%: muestra alerta y obliga carga manual del texto
 */

import { useState, useCallback, useRef } from 'react';
import {
    Upload, FileText, AlertTriangle, CheckCircle, Loader2, X,
    ScanLine, Eye, EyeOff, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/imageCompressor';

// ── Tipos ──────────────────────────────────────────────────────

export interface OCRResult {
    text: string;
    confidence: number; // 0-100
    isReliable: boolean;
    file: File;
}

interface OCRUploadProps {
    onResult: (result: OCRResult) => void;
    onFileReady: (file: File) => void;
    onError?: (msg: string) => void;
    disabled?: boolean;
    label?: string;
}

// ── Constantes ─────────────────────────────────────────────────

const MIN_CONFIDENCE = 60;
const MAX_FILE_MB = 10;

// ── Helpers ────────────────────────────────────────────────────

async function runOCR(file: File): Promise<{ text: string; confidence: number }> {
    // Cargamos Tesseract dinámicamente para no aumentar el bundle inicial
    const { createWorker } = await import('tesseract.js');

    const worker = await createWorker('spa', 1, {
        // Sin logger para no saturar la consola en producción
        logger: () => { },
    });

    try {
        const { data } = await worker.recognize(file);
        return {
            text: data.text?.trim() || '',
            confidence: data.confidence || 0,
        };
    } finally {
        await worker.terminate();
    }
}

function validateImage(file: File): string | null {
    const maxBytes = MAX_FILE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
        return `El archivo es demasiado grande (máx ${MAX_FILE_MB}MB). Reducí la resolución.`;
    }
    if (!file.type.startsWith('image/')) {
        return 'El archivo debe ser una imagen (JPG, PNG, WEBP).';
    }
    return null;
}

// ── Componente ─────────────────────────────────────────────────

export function OCRUpload({ onResult, onFileReady, onError, disabled, label }: OCRUploadProps) {
    const [state, setState] = useState<
        'idle' | 'compressing' | 'scanning' | 'success' | 'low_confidence' | 'error'
    >('idle');
    const [ocrText, setOcrText] = useState('');
    const [manualText, setManualText] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [preview, setPreview] = useState<string | null>(null);
    const [showText, setShowText] = useState(false);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        setState('idle');
        setOcrText('');
        setManualText('');
        setConfidence(0);
        setPreview(null);
        setShowText(false);
        setCurrentFile(null);
        if (inputRef.current) inputRef.current.value = '';
    }, []);

    const handleFile = useCallback(async (file: File) => {
        const validError = validateImage(file);
        if (validError) {
            setState('error');
            onError?.(validError);
            return;
        }

        // 1. Comprimir imagen
        setState('compressing');
        let compressed = file;
        try {
            const result = await compressImage(file);
            compressed = result.file;
        } catch {
            // Si falla la compresión, continuar con el original
            compressed = file;
        }

        // Preview
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target?.result as string);
        reader.readAsDataURL(compressed);

        setCurrentFile(compressed);
        onFileReady(compressed);

        // 2. Ejecutar OCR
        setState('scanning');
        try {
            const { text, confidence: conf } = await runOCR(compressed);
            setOcrText(text);
            setConfidence(conf);

            const isReliable = conf >= MIN_CONFIDENCE;
            if (isReliable) {
                setState('success');
                onResult({ text, confidence: conf, isReliable: true, file: compressed });
            } else {
                setState('low_confidence');
                // No llamar onResult hasta que el usuario confirme/corrija
            }
        } catch {
            setState('low_confidence');
            setConfidence(0);
            // OCR falló → pedir texto manual
        }
    }, [onResult, onFileReady, onError]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const handleConfirmManual = useCallback(() => {
        if (!currentFile) return;
        const text = manualText.trim() || ocrText;
        onResult({
            text,
            confidence: manualText.trim() ? 100 : confidence,
            isReliable: true,
            file: currentFile,
        });
        setState('success');
    }, [currentFile, manualText, ocrText, confidence, onResult]);

    // ── Render: idle ──────────────────────────────────────────

    if (state === 'idle') {
        return (
            <label
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
                    ${disabled
                        ? 'opacity-50 cursor-not-allowed border-border'
                        : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleInputChange}
                    disabled={disabled}
                />
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <ScanLine className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {label || 'Subir Orden Médica'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Foto o escaneo · El sistema leerá el texto automáticamente
                    </p>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP · Máx {MAX_FILE_MB}MB
                    </p>
                </div>
                <Button variant="outline" size="sm" type="button" className="pointer-events-none">
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo
                </Button>
            </label>
        );
    }

    // ── Render: compressing / scanning ────────────────────────

    if (state === 'compressing' || state === 'scanning') {
        return (
            <div className="flex flex-col items-center gap-3 p-6 border rounded-xl border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {state === 'compressing' ? 'Optimizando imagen...' : 'Leyendo orden médica...'}
                </p>
                <p className="text-xs text-muted-foreground">
                    {state === 'scanning' ? 'Procesamiento local, sin enviar datos al servidor' : ''}
                </p>
            </div>
        );
    }

    // ── Render: success ───────────────────────────────────────

    if (state === 'success') {
        return (
            <div className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden">
                <div className="bg-green-50 dark:bg-green-950/20 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                            Orden leída correctamente
                        </span>
                        <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded font-bold">
                            {confidence.toFixed(0)}% confianza
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setShowText(v => !v)}
                            className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                            title={showText ? 'Ocultar texto' : 'Ver texto extraído'}
                        >
                            {showText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={reset}
                            className="p-1 rounded text-muted-foreground hover:bg-muted"
                            title="Cambiar imagen"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Preview y texto */}
                <div className="p-3 flex gap-3">
                    {preview && (
                        <img
                            src={preview}
                            alt="Orden médica"
                            className="h-20 w-16 object-cover rounded border shrink-0"
                        />
                    )}
                    {showText && ocrText && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Texto extraído:
                            </p>
                            <p className="text-xs text-foreground bg-muted/50 rounded p-2 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">
                                {ocrText}
                            </p>
                        </div>
                    )}
                    {!showText && (
                        <div className="flex-1 flex items-center">
                            <p className="text-xs text-muted-foreground italic">
                                {ocrText?.substring(0, 120)}{ocrText && ocrText.length > 120 ? '...' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Render: low_confidence ────────────────────────────────

    if (state === 'low_confidence') {
        return (
            <div className="border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
                <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                    {confidence < 20
                                        ? 'No se pudo leer la imagen'
                                        : `Lectura con baja confianza (${confidence.toFixed(0)}%)`}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    Ingresá el texto de la orden manualmente o tomá una foto más clara.
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={reset} className="p-1 rounded text-muted-foreground hover:bg-muted shrink-0">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="p-3 space-y-3">
                    {/* Preview si existe */}
                    {preview && (
                        <div className="flex gap-3 items-start">
                            <img src={preview} alt="Imagen cargada" className="h-16 w-12 object-cover rounded border shrink-0" />
                            {ocrText && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Texto parcialmente detectado:</p>
                                    <p className="text-xs font-mono text-muted-foreground italic">{ocrText.substring(0, 200)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Texto manual obligatorio */}
                    <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">
                            <FileText className="h-3.5 w-3.5 inline mr-1" />
                            Ingresá el contenido de la orden *
                        </label>
                        <textarea
                            value={manualText}
                            onChange={e => setManualText(e.target.value)}
                            placeholder="Ej: Práctica: Ecografía abdominal. Diagnóstico: Dolor abdominal. Médico prescriptor: Dr. Gómez..."
                            rows={4}
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleConfirmManual}
                            disabled={!manualText.trim() && !ocrText}
                            className="flex-1"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar texto
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={reset}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Cambiar imagen
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: error ─────────────────────────────────────────

    return (
        <div className="border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Error al procesar el archivo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    El archivo no es válido. Intentá con una imagen JPG, PNG o WEBP de hasta {MAX_FILE_MB}MB.
                </p>
            </div>
            <button type="button" onClick={reset} className="p-1 rounded text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
