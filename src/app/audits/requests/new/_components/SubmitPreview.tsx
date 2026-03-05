'use client';

import { Button } from '@/components/ui/button';
import { Eye, Send, Loader2 } from 'lucide-react';
import type { PracticeItem, PendingFile, ChatMessage, ExpedientType } from './types';

const DOC_TYPE_LABELS: Record<string, string> = {
    orden_medica: 'Orden médica', receta: 'Receta', estudio: 'Estudio previo',
    informe: 'Informe médico', consentimiento: 'Consentimiento',
    historia_clinica: 'Historia clínica', factura: 'Factura', otro: 'Otro',
};

const EXP_TYPE_LABELS: Record<string, string> = {
    ambulatoria: 'Ambulatoria', bioquimica: 'Bioquímica', internacion: 'Internación',
    odontologica: 'Odontológica', programas_especiales: 'Prog. Especiales',
    elementos: 'Elementos', reintegros: 'Reintegros',
};

interface SubmitPreviewProps {
    showPreview: boolean;
    canSubmit: boolean;
    submitting: boolean;
    expedientType: ExpedientType;
    priority: string;
    affiliate: { full_name: string; document_number: string } | null;
    planName: string;
    diagnosisCode: string;
    diagnosis: string;
    doctorName: string;
    doctorRegistration: string;
    doctorSpecialty: string;
    providerName: string;
    prescriptionDate: string;
    prescriptionNumber: string;
    orderExpiryDate: string;
    assignedAuditorId: string;
    auditorsList: { id: string; full_name: string; role: string }[];
    practiceItems: PracticeItem[];
    totalValue: number;
    files: PendingFile[];
    chatMessages: ChatMessage[];
    onShowPreview: () => void;
    onHidePreview: () => void;
    onSubmit: () => void;
}

export function SubmitPreview({
    showPreview, canSubmit, submitting, expedientType, priority,
    affiliate, planName, diagnosisCode, diagnosis,
    doctorName, doctorRegistration, doctorSpecialty, providerName,
    prescriptionDate, prescriptionNumber, orderExpiryDate,
    assignedAuditorId, auditorsList, practiceItems, totalValue,
    files, chatMessages, onShowPreview, onHidePreview, onSubmit,
}: SubmitPreviewProps) {
    return (
        <div className="space-y-2">
            {!showPreview && (
                <div className="flex gap-2">
                    <Button onClick={onShowPreview} disabled={!canSubmit} variant="outline" className="flex-1 h-11 text-base border-2">
                        <Eye className="h-4 w-4 mr-2" /> Previsualizar
                    </Button>
                    <Button onClick={onSubmit} disabled={!canSubmit} className="flex-1 h-11 text-base bg-primary hover:bg-primary/90 font-semibold shadow-md">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4 mr-2" /> Enviar directo</>}
                    </Button>
                </div>
            )}

            {showPreview && affiliate && (
                <>
                    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Eye className="h-4 w-4" /> Previsualización de la solicitud
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                            <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{EXP_TYPE_LABELS[expedientType] || expedientType}</span></div>
                            <div><span className="text-muted-foreground">Prioridad:</span> <span className={`font-medium ${priority === 'urgente' ? 'text-red-600' : ''}`}>{priority === 'urgente' ? '🔴 Urgente' : 'Normal'}</span></div>
                            <div className="col-span-2"><span className="text-muted-foreground">Afiliado:</span> <span className="font-medium">{affiliate.full_name}</span> <span className="text-muted-foreground">· DNI {affiliate.document_number}</span></div>
                            <div><span className="text-muted-foreground">Plan:</span> <span className="font-medium">{planName}</span></div>
                            {diagnosis && (
                                <div className="col-span-2"><span className="text-muted-foreground">Diagnóstico:</span> <span className="font-mono font-medium">{diagnosisCode}</span> <span className="font-medium">{diagnosis}</span></div>
                            )}
                        </div>

                        {(doctorName || providerName || prescriptionDate) && (
                            <div className="border-t pt-2">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Prescripción</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    {doctorName && <div><span className="text-muted-foreground">Médico:</span> <span className="font-medium">{doctorName}</span></div>}
                                    {doctorRegistration && <div><span className="text-muted-foreground">Matrícula:</span> <span className="font-mono font-medium">{doctorRegistration}</span></div>}
                                    {doctorSpecialty && <div><span className="text-muted-foreground">Especialidad:</span> <span className="font-medium">{doctorSpecialty}</span></div>}
                                    {providerName && <div><span className="text-muted-foreground">Prestador:</span> <span className="font-medium">{providerName}</span></div>}
                                    {prescriptionDate && <div><span className="text-muted-foreground">Fecha prescripción:</span> <span className="font-medium">{prescriptionDate}</span></div>}
                                    {prescriptionNumber && <div><span className="text-muted-foreground">Nro. receta:</span> <span className="font-mono font-medium">{prescriptionNumber}</span></div>}
                                    {orderExpiryDate && <div><span className="text-muted-foreground">Vencimiento orden:</span> <span className="font-medium">{orderExpiryDate}</span></div>}
                                </div>
                            </div>
                        )}

                        {assignedAuditorId && (
                            <div className="border-t pt-2">
                                <p className="text-xs"><span className="text-muted-foreground">Auditor asignado:</span> <span className="font-medium">{auditorsList.find(a => a.id === assignedAuditorId)?.full_name || '—'}</span></p>
                            </div>
                        )}

                        <div className="border-t pt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">{practiceItems.length} práctica(s) — Total: ${totalValue.toLocaleString()}</p>
                            {practiceItems.map(pi => (
                                <p key={pi.practice.id} className="text-xs">
                                    <span className="font-mono">{pi.practice.code}</span> {pi.practice.description} ×{pi.quantity}
                                </p>
                            ))}
                        </div>

                        {files.length > 0 && (
                            <div className="border-t pt-2">
                                <p className="text-xs font-semibold text-muted-foreground mb-0.5">{files.length} adjunto(s)</p>
                                {files.map((f, i) => (
                                    <p key={i} className="text-xs text-muted-foreground">[{DOC_TYPE_LABELS[f.documentType] || f.documentType}] {f.file.name}</p>
                                ))}
                            </div>
                        )}

                        {chatMessages.length > 0 && (
                            <div className="border-t pt-2 space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Mensajes ({chatMessages.length})</p>
                                {chatMessages.map((m, i) => {
                                    const isAffiliate = m.channel === 'para_afiliado';
                                    return (
                                        <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs ${isAffiliate ? 'bg-blue-50 border border-blue-200' : 'bg-muted/50 border border-border'}`}>
                                            <span className="shrink-0 mt-0.5">{isAffiliate ? '📢' : '🔒'}</span>
                                            <div className="flex-1 min-w-0">
                                                <span className={`font-semibold ${isAffiliate ? 'text-blue-700' : 'text-muted-foreground'}`}>
                                                    {isAffiliate ? 'Para Afiliado' : 'Interno'}:
                                                </span>{' '}
                                                <span className="text-foreground">{m.text}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <Button onClick={onSubmit} disabled={!canSubmit} className="w-full h-12 text-base bg-primary hover:bg-primary/90 font-semibold shadow-md">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando solicitud...</> : <><Send className="h-4 w-4 mr-2" /> Enviar para evaluación</>}
                    </Button>
                    <button onClick={onHidePreview} className="text-xs text-muted-foreground hover:text-foreground mx-auto block">
                        ← Volver a editar
                    </button>
                </>
            )}
        </div>
    );
}
