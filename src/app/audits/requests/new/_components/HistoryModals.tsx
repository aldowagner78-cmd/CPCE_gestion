'use client';

import { X, Clock, Paperclip, FileText, Loader2 } from 'lucide-react';
import type { DetailedConsumption, PracticeItem } from './types';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

interface HistoryModalProps {
    viewingHistoryFor: { id: number; name: string } | null;
    detailedConsumptions: DetailedConsumption[];
    practiceItems: PracticeItem[];
    showConsumptions: boolean;
    loadingConsumptions: boolean;
    onClose: () => void;
    onLoadConsumptions: () => void;
    onViewAttachments: (expedientId: string, expedientNumber: string) => void;
}

interface AttachmentsModalProps {
    viewingAttachmentsFor: { expedientId: string; expedientNumber: string } | null;
    attachments: Record<string, unknown>[];
    loadingAttachments: boolean;
    onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
    autorizada: 'bg-green-100 text-green-700',
    autorizada_parcial: 'bg-yellow-100 text-yellow-700',
    denegada: 'bg-red-100 text-red-700',
    pendiente: 'bg-blue-100 text-blue-700',
    en_revision: 'bg-purple-100 text-purple-700',
};

export function PracticeHistoryModal({
    viewingHistoryFor, detailedConsumptions, showConsumptions,
    loadingConsumptions, onClose, onLoadConsumptions, onViewAttachments,
}: HistoryModalProps) {
    if (!viewingHistoryFor) return null;

    const filtered = detailedConsumptions.filter(d => d.practiceId === viewingHistoryFor.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl p-5 w-full max-w-2xl shadow-xl flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Historial: <span className="text-muted-foreground">{viewingHistoryFor.name}</span>
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {detailedConsumptions.length === 0 && !showConsumptions ? (
                        <div className="text-center py-6">
                            <p className="text-sm text-muted-foreground mb-3">Los consumos aún no han sido cargados.</p>
                            <button
                                onClick={onLoadConsumptions}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
                                disabled={loadingConsumptions}
                            >
                                {loadingConsumptions ? 'Cargando consumos...' : 'Cargar consumos previos'}
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-base text-center text-muted-foreground my-8">
                            El afiliado no tiene registros previos para esta práctica.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(c => (
                                <div key={c.id} className="flex items-center gap-3 text-sm bg-muted/30 border border-border/50 rounded-lg px-3 py-2.5">
                                    <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 w-24">
                                        <Clock className="h-3.5 w-3.5" />
                                        {c.date ? new Date(c.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'S/F'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-mono font-medium">{c.practiceCode}</span>
                                        {c.quantity > 1 && <span className="text-muted-foreground ml-2 rounded bg-muted px-1">×{c.quantity}</span>}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 uppercase tracking-wide ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {c.status.replace(/_/g, ' ')}
                                    </span>
                                    {c.coveredAmount > 0 && (
                                        <span className="text-green-700 font-mono shrink-0">${c.coveredAmount.toLocaleString()}</span>
                                    )}
                                    {c.copayAmount > 0 && (
                                        <span className="text-orange-600 font-mono text-xs shrink-0">(Cos: ${c.copayAmount.toLocaleString()})</span>
                                    )}
                                    {c.expedientNumber && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-muted-foreground font-mono text-xs bg-background px-1.5 py-0.5 rounded border">
                                                #{c.expedientNumber}
                                            </span>
                                            <button
                                                onClick={() => onViewAttachments(c.expedientId, c.expedientNumber)}
                                                title="Ver adjuntos históricos"
                                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                            >
                                                <Paperclip className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 mt-2 border-t">
                                <span className="font-medium text-foreground">{filtered.length} registro(s) encontrado(s)</span>
                                <span>Total cubierto: ${filtered.reduce((s, c) => s + c.coveredAmount, 0).toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AttachmentsModal({ viewingAttachmentsFor, attachments, loadingAttachments, onClose }: AttachmentsModalProps) {
    if (!viewingAttachmentsFor) return null;

    const resolveAttachmentUrl = (attachment: Record<string, unknown>): string => {
        const fileUrl = attachment.file_url;
        if (typeof fileUrl === 'string' && fileUrl.length > 0) return fileUrl;

        const storagePath = attachment.storage_path;
        if (typeof storagePath !== 'string' || storagePath.length === 0) return '';

        const { data } = supabase.storage.from('audit-attachments').getPublicUrl(storagePath);
        return data.publicUrl || '';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl p-5 w-full max-w-2xl shadow-xl flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-blue-600" />
                        Adjuntos del Expediente: <span className="text-muted-foreground">#{viewingAttachmentsFor.expedientNumber}</span>
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-1">
                    {loadingAttachments ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            <span className="text-sm text-muted-foreground">Cargando adjuntos...</span>
                        </div>
                    ) : attachments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sin adjuntos</p>
                            <p className="text-xs">No se encontraron archivos en este expediente histórico.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attachments.map((att) => {
                                const a = att as Record<string, unknown>;
                                const fileUrl = resolveAttachmentUrl(a);
                                const fileName = typeof a.file_name === 'string' ? a.file_name : 'archivo';
                                const fileType = typeof a.file_type === 'string' ? a.file_type : 'Archivo';
                                const uploader = typeof a.attached_by_name === 'string'
                                    ? a.attached_by_name
                                    : typeof a.uploaded_by === 'string'
                                        ? a.uploaded_by
                                        : 'Sistema';
                                const createdAt = typeof a.created_at === 'string' ? a.created_at : '';
                                const attachmentId = typeof a.id === 'string' ? a.id : `${fileName}-${createdAt}`;
                                return (
                                    <div key={attachmentId} className="border rounded-lg overflow-hidden group bg-card flex flex-col">
                                        <div className="p-3 bg-muted/40 border-b flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold truncate" title={fileName}>{fileName}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{fileType}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 flex items-center justify-center flex-1 bg-muted/10">
                                            {fileType.toLowerCase().includes('pdf') ? (
                                                <div className="text-center">
                                                    <FileText className="h-8 w-8 mx-auto text-red-500 mb-2 opacity-80" />
                                                    {fileUrl ? (
                                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Abrir PDF</a>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">URL no disponible</span>
                                                    )}
                                                </div>
                                            ) : fileType.toLowerCase().includes('image') ? (
                                                <a href={fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="block w-full text-center">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={fileUrl || ''} alt={fileName} className="max-h-32 mx-auto object-contain rounded border bg-background" />
                                                    <span className="text-xs text-blue-600 hover:underline mt-2 inline-block">Ampliar imagen</span>
                                                </a>
                                            ) : (
                                                <div className="text-center">
                                                    <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                                                    {fileUrl ? (
                                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Descargar</a>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">URL no disponible</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between">
                                            <span className="truncate">Por: {uploader}</span>
                                            <span className="shrink-0">{createdAt ? new Date(createdAt).toLocaleDateString('es-AR') : 'S/F'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
