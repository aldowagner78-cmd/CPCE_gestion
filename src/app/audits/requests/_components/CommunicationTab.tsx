'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { formatDate } from './configUI';
import type { ExpedientNote, ExpedientPractice } from '@/types/database';
import { ExpedientService } from '@/services/expedientService';

interface CommunicationTabProps {
    expedientId: string;
    notes: ExpedientNote[];
    practices: ExpedientPractice[];
    expedientStatus: string;
    createdAt: string;
    expedientNumber: string;
    userId?: string;
    onNotesReload: () => Promise<void>;
}

export function CommunicationTab({
    expedientId,
    notes,
    practices,
    expedientStatus,
    createdAt,
    expedientNumber,
    userId,
    onNotesReload,
}: CommunicationTabProps) {
    const [commChannel, setCommChannel] = useState<'interna' | 'para_afiliado'>('interna');
    const [newNoteInterna, setNewNoteInterna] = useState('');
    const [newNoteAfiliado, setNewNoteAfiliado] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);

    const handleAddNote = async () => {
        const draft = commChannel === 'para_afiliado' ? newNoteAfiliado : newNoteInterna;
        if (!userId || !draft.trim()) return;
        try {
            await ExpedientService.addNote({
                expedient_id: expedientId,
                author_id: userId,
                content: draft,
                note_type: commChannel,
            });
            if (commChannel === 'para_afiliado') setNewNoteAfiliado('');
            else setNewNoteInterna('');
            await onNotesReload();
        } catch { /* error */ }
    };

    const handlePolishText = () => {
        const draft = commChannel === 'para_afiliado' ? newNoteAfiliado : newNoteInterna;
        if (!draft.trim()) return;
        setAiLoading(true);
        const raw = draft.trim();
        const sentence = raw.charAt(0).toUpperCase() + raw.slice(1);
        const withPeriod = sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?')
            ? sentence : sentence + '.';

        if (commChannel === 'para_afiliado') {
            const openers = [
                'Estimado/a afiliado/a, le informamos que ',
                'Nos comunicamos para informarle que ',
                'En relación con su solicitud, le comunicamos que ',
                'A fin de brindarle la mejor atención, le indicamos que ',
            ];
            const opener = openers[raw.length % openers.length];
            const polished = opener + withPeriod.charAt(0).toLowerCase() + withPeriod.slice(1)
                + ' Quedamos a su disposición ante cualquier consulta.';
            setNewNoteAfiliado(polished);
        } else {
            const openers = ['Nota interna: ', 'Para consideración del auditor: ', 'Observación: '];
            const opener = openers[raw.length % openers.length];
            setNewNoteInterna(opener + withPeriod);
        }
        setAiLoading(false);
    };

    const handleGenerateSummary = () => {
        const practiceList = practices.map(p => `${p.practice_id} (${p.status})`).join(', ');
        const noteCount = notes.length;
        const lastNote = notes.length > 0 ? notes[notes.length - 1].content : 'Sin comunicaciones previas';
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { calcBusinessHours } = require('@/services/slaService');
        const h = calcBusinessHours(createdAt) as number;
        const slaNote = h < 24 ? 'dentro del plazo verde' : h <= 48 ? 'en plazo amarillo' : 'con demora crítica (rojo)';
        const summary = `Solicitud ${expedientNumber}: prácticas solicitadas: ${practiceList || 'sin prácticas'}. Estado actual: ${expedientStatus}. ${noteCount} mensaje(s) registrado(s). Último mensaje: "${lastNote}". Tiempo de gestión: ${slaNote}.`;
        setAiSummary(summary);
    };

    const filteredNotes = notes.filter(n => {
        if (commChannel === 'para_afiliado') return n.note_type === 'para_afiliado';
        return n.note_type === 'interna' || n.note_type === 'sistema' || n.note_type === 'resolucion';
    });

    return (
        <>
            {/* Canal */}
            <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-3">
                <button
                    onClick={() => { setCommChannel('interna'); setAiSummary(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${commChannel === 'interna' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    🔒 Interno
                </button>
                <button
                    onClick={() => { setCommChannel('para_afiliado'); setAiSummary(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${commChannel === 'para_afiliado' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    📢 Afiliado
                </button>
            </div>

            {/* Resumen IA */}
            <button
                onClick={handleGenerateSummary}
                className="w-full mb-3 flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-dashed rounded-lg hover:border-primary/50 transition-colors"
            >
                ✨ Generar resumen de esta solicitud
            </button>
            {aiSummary && (
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-bold text-[10px] uppercase tracking-wider mb-1">📋 Resumen IA</p>
                    <p>{aiSummary}</p>
                </div>
            )}

            {/* Mensajes */}
            <div className="space-y-3">
                {filteredNotes.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">Sin mensajes en este canal</p>
                )}
                {filteredNotes.map(n => (
                    <div key={n.id} className={`p-3 rounded-xl text-sm ${n.note_type === 'sistema' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800' :
                        n.note_type === 'resolucion' ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800' :
                            n.note_type === 'para_afiliado' ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800' :
                                'bg-muted/30'
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[10px] uppercase tracking-wider">{n.note_type.replace('_', ' ')}</span>
                            <span className="text-[10px] opacity-70">{formatDate(n.created_at)}</span>
                        </div>
                        <p>{n.content}</p>
                        {n.status_from && n.status_to && (
                            <p className="text-[10px] mt-1 opacity-70">{n.status_from} → {n.status_to}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Respuestas rápidas */}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {commChannel === 'para_afiliado' ? (
                    <>
                        {(['📎 Adjuntar pedido médico', '📋 Adjuntar Historia Clínica', '🔬 Adjuntar estudios complementarios'] as const).map(txt => (
                            <button key={txt} onClick={() => setNewNoteAfiliado(txt)} className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors">{txt}</button>
                        ))}
                    </>
                ) : (
                    <>
                        {(['⭐ Consultar prioridad clínica', '👥 Pedir segunda opinión médica'] as const).map(txt => (
                            <button key={txt} onClick={() => setNewNoteInterna(txt)} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{txt}</button>
                        ))}
                    </>
                )}
            </div>

            {/* Input */}
            <div className="flex gap-2 mt-3">
                {commChannel === 'para_afiliado' ? (
                    <Input
                        key="input-afiliado"
                        value={newNoteAfiliado}
                        onChange={e => setNewNoteAfiliado(e.target.value)}
                        placeholder="Mensaje para el afiliado..."
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                        className="h-9"
                    />
                ) : (
                    <Input
                        key="input-interna"
                        value={newNoteInterna}
                        onChange={e => setNewNoteInterna(e.target.value)}
                        placeholder="Nota interna del equipo..."
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                        className="h-9"
                    />
                )}
                <button
                    onClick={handlePolishText}
                    disabled={!(commChannel === 'para_afiliado' ? newNoteAfiliado : newNoteInterna).trim() || aiLoading}
                    title="Pulir texto con IA"
                    className="h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                    <span className="text-sm">✨</span>
                </button>
                <Button size="icon" onClick={handleAddNote} disabled={!(commChannel === 'para_afiliado' ? newNoteAfiliado : newNoteInterna).trim()} className="h-9 w-9 shrink-0">
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </>
    );
}
