'use client';

import { useState } from 'react';
import { Send, MessageSquare, Lock, Megaphone } from 'lucide-react';
import type { ChatMessage } from './types';

const QUICK_REPLIES = [
    { emoji: '📎', label: 'Orden', text: 'Se requiere adjuntar orden médica original firmada por el médico tratante.' },
    { emoji: '📋', label: 'HC', text: 'Se necesita adjuntar historia clínica completa y actualizada.' },
    { emoji: '🧪', label: 'Lab', text: 'Se requiere adjuntar últimos resultados de laboratorio.' },
    { emoji: '🔬', label: 'Imágenes', text: 'Se requiere adjuntar estudios por imágenes.' },
    { emoji: '✅', label: 'Aprobada', text: 'Su solicitud ha sido aprobada. Puede coordinar el turno con el prestador.' },
    { emoji: '⏳', label: 'En eval.', text: 'Su solicitud se encuentra en proceso de evaluación.' },
    { emoji: '❌', label: 'Falta doc.', text: 'Su solicitud ha sido denegada por falta de documentación respaldatoria.' },
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
    const [expanded, setExpanded] = useState(false);
    const affCount = chatMessages.filter(m => m.channel === 'para_afiliado').length;
    const intCount = chatMessages.filter(m => m.channel === 'interna').length;
    const activeMessages = chatMessages.filter(m => m.channel === commChannel);

    if (!expanded) {
        return (
            <button onClick={() => setExpanded(true)}
                className="w-full border rounded-xl px-4 py-3 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Comunicación</span>
                <span className="text-xs text-muted-foreground ml-auto">
                    {affCount + intCount > 0 ? `${affCount + intCount} mensaje(s)` : 'Opcional — clic para expandir'}
                </span>
            </button>
        );
    }

    return (
        <div className="border rounded-xl overflow-hidden">
            {/* Toggle tabs */}
            <div className="flex border-b">
                <button onClick={() => onNotesChange('para_afiliado', commChannel === 'para_afiliado' ? notes : '')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${commChannel === 'para_afiliado' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-muted-foreground hover:bg-muted/30'}`}>
                    <Megaphone className="h-3 w-3" /> Afiliado {affCount > 0 && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 rounded-full">{affCount}</span>}
                </button>
                <button onClick={() => onNotesChange('interna', commChannel === 'interna' ? notes : '')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${commChannel === 'interna' ? 'bg-slate-100 text-slate-700 border-b-2 border-slate-500' : 'text-muted-foreground hover:bg-muted/30'}`}>
                    <Lock className="h-3 w-3" /> Interna {intCount > 0 && <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 rounded-full">{intCount}</span>}
                </button>
            </div>

            {/* Messages */}
            {activeMessages.length > 0 && (
                <div className="max-h-[120px] overflow-y-auto p-2 space-y-1.5 bg-muted/10">
                    {activeMessages.map((msg, i) => (
                        <div key={i} className="flex justify-end">
                            <div className={`max-w-[85%] px-3 py-1.5 text-xs rounded-2xl rounded-tr-sm ${commChannel === 'para_afiliado' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground border'}`}>
                                <p>{msg.text}</p>
                                <p className="text-[9px] mt-0.5 text-right opacity-60">{msg.date}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick replies (afiliado only) */}
            {commChannel === 'para_afiliado' && (
                <div className="flex flex-wrap gap-1 px-2 py-1.5 border-t bg-blue-50/30">
                    {QUICK_REPLIES.map((qr, qi) => (
                        <button key={qi} onClick={() => onNotesChange('para_afiliado', qr.text)}
                            className="px-2 py-1 text-[10px] font-medium border rounded-md bg-white hover:bg-blue-50 transition-colors" title={qr.text}>
                            {qr.emoji} {qr.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-1.5 p-2 border-t">
                <textarea
                    placeholder={commChannel === 'para_afiliado' ? 'Mensaje para el afiliado...' : 'Nota interna para auditoría...'}
                    value={notes}
                    onChange={e => onNotesChange(commChannel, e.target.value)}
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex flex-col gap-1">
                    <button onClick={() => onPolishText(commChannel)} disabled={!notes.trim() || aiLoading}
                        className="p-1.5 rounded-full border hover:bg-amber-50 transition-colors disabled:opacity-30" title="Pulir con IA ✨">
                        <span className="text-xs">✨</span>
                    </button>
                    <button onClick={() => onSendMessage(commChannel)} disabled={!notes.trim()}
                        className={`p-1.5 rounded-full text-white disabled:opacity-30 transition-colors ${commChannel === 'para_afiliado' ? 'bg-primary hover:bg-primary/90' : 'bg-slate-600 hover:bg-slate-700'}`}>
                        <Send className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
