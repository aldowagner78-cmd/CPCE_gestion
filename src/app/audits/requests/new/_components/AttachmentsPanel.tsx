'use client';

import { Upload, X, Paperclip, Plus, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/imageCompressor';
import type { PendingFile, ExpedientDocumentType } from './types';

const DOC_TYPES: { value: ExpedientDocumentType; label: string }[] = [
    { value: 'orden_medica', label: 'Orden médica' },
    { value: 'receta', label: 'Receta' },
    { value: 'estudio', label: 'Estudio previo' },
    { value: 'informe', label: 'Informe médico' },
    { value: 'consentimiento', label: 'Consentimiento' },
    { value: 'historia_clinica', label: 'Historia clínica' },
    { value: 'factura', label: 'Factura' },
    { value: 'otro', label: 'Otro' },
];

interface AttachmentsPanelProps {
    files: PendingFile[];
    compressing: boolean;
    onAddFiles: (docType: ExpedientDocumentType) => void;
    onRemoveFile: (index: number) => void;
}

export function AttachmentsPanel({ files, compressing, onAddFiles, onRemoveFile }: AttachmentsPanelProps) {
    return (
        <div className="space-y-2 mt-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Documentación adjunta
            </label>
            <div className="flex flex-wrap gap-1.5">
                {DOC_TYPES.map(d => {
                    const isOrden = d.value === 'orden_medica';
                    const hasThis = files.some(f => f.documentType === d.value);
                    return (
                        <button key={d.value} type="button"
                            onClick={() => onAddFiles(d.value)}
                            disabled={compressing}
                            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                                ${hasThis
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-300'
                                    : 'bg-background hover:bg-muted/50 text-foreground border-border'
                                }
                                ${compressing ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:shadow-sm'}
                            `}
                            title={isOrden && !hasThis ? 'Documento obligatorio' : hasThis ? `Añadir más ${d.label}` : `Adjuntar ${d.label}`}
                        >
                            {isOrden && !hasThis && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold">!</span>
                            )}
                            <Upload className="h-3 w-3" />
                            {d.label}
                            {hasThis && <Plus className="h-3 w-3 text-blue-600" />}
                        </button>
                    );
                })}
            </div>
            {compressing && (
                <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Comprimiendo...
                </span>
            )}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {files.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                            <span className="text-muted-foreground">[{DOC_TYPES.find(d => d.value === f.documentType)?.label}]</span>
                            {f.file.name.length > 20 ? f.file.name.slice(0, 18) + '…' : f.file.name}
                            <span className="text-muted-foreground/60">{formatBytes(f.file.size)}</span>
                            {f.wasCompressed && (
                                <span className="text-green-600 font-medium" title={`Original: ${formatBytes(f.originalSize)}`}>-{f.savingsPercent}%</span>
                            )}
                            <button type="button" onClick={() => onRemoveFile(i)}>
                                <X className="h-3 w-3 cursor-pointer hover:text-red-500" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
