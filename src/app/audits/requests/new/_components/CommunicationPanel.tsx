'use client';

import { useState } from 'react';
import { Send, MessageSquare, X, ChevronDown, ChevronUp, Lock, Megaphone } from 'lucide-react';
import type { ChatMessage } from './types';

const QUICK_REPLIES = [
    { emoji: '📎', label: 'Orden médica', text: 'Se requiere adjuntar orden médica original firmada por el médico tratante.' },
    { emoji: '📋', label: 'Hria. clínica', text: 'Se necesita adjuntar historia clínica completa y actualizada.' },
    { emoji: '🧪', label: 'Laboratorio', text: 'Se requiere adjuntar últimos resultados de laboratorio.' },
    { emoji: '🔬', label: 'Imágenes', text: 'Se requiere adjuntar estudios por imágenes (radiografías, ecografías, resonancias, etc.).' },
    { emoji: '📄', label: 'Estudios', text: 'Se requiere adjuntar estudios complementarios recientes.' },
    { emoji: '✅', label: 'Aprobada', text: 'Su solicitud ha sido aprobada. Puede coordinar el turno con el prestador.', color: 'text-green-700 border-green-200 hover:bg-green-50' },
    { emoji: '⚠️', label: 'Parcial', text: 'Su solicitud ha sido aprobada parcialmente. Algunas prácticas requieren documentación adicional.', color: 'text-amber-700 border-amber-200 hover:bg-amber-50' },
    { emoji: '⏳', label: 'Evaluación', text: 'Su solicitud se encuentra en proceso de evaluación.', color: 'text-blue-700 border-blue-200 hover:bg-blue-50' },
    { emoji: '❌', label: 'Falta doc.', text: 'Su solicitud ha sido denegada por falta de documentación respaldatoria.', color: 'text-red-700 border-red-200 hover:bg-red-50' },
    { emoji: '❌', label: 'Presc. vencida', text: 'Su solicitud ha sido denegada por prescripción médica vencida.', color: 'text-red-700 border-red-200 hover:bg-red-50' },
    { emoji: '❌', label: 'Sin cobertura', text: 'Su solicitud ha sido denegada por no encontrarse dentro de las coberturas del plan.', color: 'text-red-700 border-red-200 hover:bg-red-50' },
];

interface CommunicationPanelProps {
    chatMessages: ChatMessage[];
    notes: string;
    commChannel: 'interna' | 'para_afiliado';
    aiLoading: boolean;
    onNotesChange: (channel: 'interna' | 'para_afiliado', text: string) => void;
    onSendMessage: (channel: 'interna' | 'para_afiliado') => void;
    onPolishText: (channel: 'interna' | 'para_afiliado') => void;
}

export function CommunicationPanel({
    chatMessages, notes, commChannel, aiLoading,
    onNotesChange, onSendMessage, onPolishText,
}: CommunicationPanelProps) {
    const [showQuickReplies, setShowQuickReplies] = useState(false);

    return (
        <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comunicación
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* ── Columna AFILIADO ── */}
                <div className="relative h-full flex flex-col">
                    {showQuickReplies && (
                        <div className="absolute z-[100] bg-background border shadow-xl rounded-xl p-2.5 
                            top-full left-0 mt-2 w-full 
                            lg:-left-[170px] lg:top-0 lg:mt-0 lg:w-[160px] 
                            flex flex-col gap-1.5">
                            <div className="flex justify-between items-center mb-1 px-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Predefinidos</span>
                                <button onClick={() => setShowQuickReplies(false)} className="text-muted-foreground hover:text-foreground">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] pr-1">
                                {QUICK_REPLIES.map((qr, qi) => (
                                    <button key={qi} type="button"
                                        onClick={() => { onNotesChange('para_afiliado', qr.text); setShowQuickReplies(false); }}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium border rounded-md transition-all shadow-sm ${qr.color || 'bg-background text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                                        title={qr.text}
                                    >
                                        <span>{qr.emoji}</span>
                                        <span className="truncate">{qr.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border rounded-xl overflow-hidden flex flex-col h-full flex-1">
                        <div className="bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 border-b flex items-center gap-1.5">
                            <Megaphone className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Para Afiliado</span>
                        </div>
                        <div className="min-h-[120px] max-h-[180px] overflow-y-auto bg-blue-50/30 dark:bg-blue-950/10 p-2 space-y-1.5 flex-1">
                            {chatMessages.filter(m => m.channel === 'para_afiliado').length === 0 ? (
                                <p className="text-[10px] text-muted-foreground text-center py-6 opacity-50">Sin mensajes para el afiliado</p>
                            ) : chatMessages.filter(m => m.channel === 'para_afiliado').map((msg, i) => (
                                <div key={i} className="flex justify-end">
                                    <div className="max-w-[90%] px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-2xl rounded-tr-sm">
                                        <p>{msg.text}</p>
                                        <p className="text-[9px] mt-0.5 text-right text-primary-foreground/60">{msg.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-2 py-1.5 bg-blue-50/50 dark:bg-blue-950/20 border-t border-b">
                            <button onClick={() => setShowQuickReplies(!showQuickReplies)} className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium hover:underline">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Mensajes predefinidos
                                {showQuickReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                        </div>
                        <div className="flex items-end gap-1.5 p-2 bg-background">
                            <textarea
                                placeholder="Mensaje para el afiliado..."
                                value={commChannel === 'para_afiliado' ? notes : ''}
                                onFocus={() => onNotesChange('para_afiliado', commChannel === 'para_afiliado' ? notes : '')}
                                onChange={e => onNotesChange('para_afiliado', e.target.value)}
                                rows={2}
                                className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <div className="flex flex-col gap-1">
                                <button onClick={() => onPolishText('para_afiliado')} disabled={commChannel !== 'para_afiliado' || !notes.trim() || aiLoading}
                                    className="p-1.5 rounded-full border hover:bg-amber-50 transition-colors disabled:opacity-30" title="Pulir con IA ✨">
                                    <span className="text-xs">✨</span>
                                </button>
                                <button onClick={() => onSendMessage('para_afiliado')} disabled={commChannel !== 'para_afiliado' || !notes.trim()}
                                    className="p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors" title="Enviar al afiliado">
                                    <Send className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Columna AUDITOR (interna) ── */}
                <div className="border rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 border-b flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Nota Interna</span>
                    </div>
                    <div className="min-h-[120px] max-h-[180px] overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10 p-2 space-y-1.5 flex-1">
                        {chatMessages.filter(m => m.channel === 'interna').length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-6 opacity-50">Sin notas internas</p>
                        ) : chatMessages.filter(m => m.channel === 'interna').map((msg, i) => (
                            <div key={i} className="flex justify-end">
                                <div className="max-w-[90%] px-3 py-1.5 text-xs bg-muted text-foreground border border-border rounded-2xl rounded-tr-sm">
                                    <p>{msg.text}</p>
                                    <p className="text-[9px] mt-0.5 text-right text-muted-foreground">{msg.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-end gap-1.5 p-2 bg-background border-t">
                        <textarea
                            placeholder="Nota interna para auditoría..."
                            value={commChannel === 'interna' ? notes : ''}
                            onFocus={() => onNotesChange('interna', commChannel === 'interna' ? notes : '')}
                            onChange={e => onNotesChange('interna', e.target.value)}
                            rows={2}
                            className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <div className="flex flex-col gap-1">
                            <button onClick={() => onPolishText('interna')} disabled={commChannel !== 'interna' || !notes.trim() || aiLoading}
                                className="p-1.5 rounded-full border hover:bg-amber-50 transition-colors disabled:opacity-30" title="Pulir con IA ✨">
                                <span className="text-xs">✨</span>
                            </button>
                            <button onClick={() => onSendMessage('interna')} disabled={commChannel !== 'interna' || !notes.trim()}
                                className="p-1.5 rounded-full bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-30 transition-colors" title="Agregar nota interna">
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
