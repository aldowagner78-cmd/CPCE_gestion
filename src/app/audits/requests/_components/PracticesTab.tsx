'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle, XCircle, Eye, AlertTriangle, ChevronDown,
    Pause, Loader2, Printer,
} from 'lucide-react';
import { PRACTICE_STATUS_CONFIG, RULE_COLORS, CLASSIFICATION_CONFIG, formatShortDate } from './configUI';
import type { ExpedientPractice, Expedient, RulesResult, PracticeClassification } from '@/types/database';
import type { PracticeResolutionStatus } from '@/services/expedientService';
import { ExpedientService } from '@/services/expedientService';
import { generatePracticePDF } from '@/lib/expedientPDF';
import { HelpTooltip } from '@/components/HelpTooltip';

interface PracticesTabProps {
    expedient: Expedient;
    practices: ExpedientPractice[];
    canResolve: boolean;
    isMine: boolean;
    userId?: string;
    onReload: () => Promise<void>;
    onCheckCompletion: () => Promise<void>;
}

export function PracticesTab({ expedient, practices, canResolve, isMine, userId, onReload, onCheckCompletion }: PracticesTabProps) {
    const [selectedPractice, setSelectedPractice] = useState<ExpedientPractice | null>(null);
    const [resolutionAction, setResolutionAction] = useState<'autorizar' | 'denegar' | 'observar' | 'parcial' | 'diferir' | null>(null);
    const [diagnosisCode, setDiagnosisCode] = useState('');
    const [diagnosisDesc, setDiagnosisDesc] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [reviewDate, setReviewDate] = useState('');
    const [coveragePercent, setCoveragePercent] = useState(80);
    const [adjustedQuantity, setAdjustedQuantity] = useState(1);
    const [resolving, setResolving] = useState(false);
    const [filterClassification, setFilterClassification] = useState<PracticeClassification | 'todas'>('todas');
    const [batchMode, setBatchMode] = useState(false);
    const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
    const [batchAction, setBatchAction] = useState<'autorizar' | 'denegar' | null>(null);
    const [batchNotes, setBatchNotes] = useState('');

    // Filter practices by classification
    const filteredPractices = filterClassification === 'todas'
        ? practices
        : practices.filter(p => p.rule_classification === filterClassification);

    // Get unique classifications present
    const presentClassifications = [...new Set(practices.map(p => p.rule_classification).filter(Boolean))] as PracticeClassification[];

    // Batch resolve
    const handleBatchResolve = async () => {
        if (!userId || !batchAction || batchSelected.size === 0) return;
        setResolving(true);
        try {
            for (const practiceId of batchSelected) {
                const p = practices.find(pr => pr.id === practiceId);
                if (!p || !['pendiente', 'en_revision', 'observada'].includes(p.status)) continue;
                if (batchAction === 'autorizar') {
                    await ExpedientService.authorizePractice(expedient.id, practiceId, userId, {
                        resolution_notes: batchNotes || undefined,
                        coverage_percent: 80,
                        covered_amount: (p.practice_value || 0) * 0.8,
                        copay_amount: (p.practice_value || 0) * 0.2,
                    });
                } else {
                    await ExpedientService.denyPractice(expedient.id, practiceId, userId, {
                        resolution_notes: batchNotes,
                    });
                }
            }
            setBatchMode(false);
            setBatchSelected(new Set());
            setBatchAction(null);
            setBatchNotes('');
            await onCheckCompletion();
            await onReload();
        } catch { /* error */ }
        setResolving(false);
    };

    const handleResolvePractice = async () => {
        if (!userId || !selectedPractice || !resolutionAction) return;
        setResolving(true);
        try {
            switch (resolutionAction) {
                case 'autorizar':
                    await ExpedientService.authorizePractice(expedient.id, selectedPractice.id, userId, {
                        diagnosis_code: diagnosisCode || undefined,
                        diagnosis_description: diagnosisDesc || undefined,
                        resolution_notes: resolutionNotes || undefined,
                        coverage_percent: coveragePercent,
                        covered_amount: (selectedPractice.practice_value || 0) * (coveragePercent / 100),
                        copay_amount: (selectedPractice.practice_value || 0) * ((100 - coveragePercent) / 100),
                    });
                    break;
                case 'parcial':
                    await ExpedientService.authorizePartialPractice(expedient.id, selectedPractice.id, userId, {
                        diagnosis_code: diagnosisCode || undefined,
                        diagnosis_description: diagnosisDesc || undefined,
                        resolution_notes: resolutionNotes,
                        coverage_percent: coveragePercent,
                        covered_amount: (selectedPractice.practice_value || 0) * (coveragePercent / 100),
                        copay_amount: (selectedPractice.practice_value || 0) * ((100 - coveragePercent) / 100),
                        adjusted_quantity: adjustedQuantity,
                    });
                    break;
                case 'denegar':
                    await ExpedientService.denyPractice(expedient.id, selectedPractice.id, userId, {
                        resolution_notes: resolutionNotes,
                        diagnosis_code: diagnosisCode || undefined,
                        diagnosis_description: diagnosisDesc || undefined,
                    });
                    break;
                case 'observar':
                    await ExpedientService.observePractice(expedient.id, selectedPractice.id, userId, resolutionNotes);
                    break;
                case 'diferir':
                    await ExpedientService.deferPractice(expedient.id, selectedPractice.id, userId, reviewDate, resolutionNotes);
                    break;
            }
            setSelectedPractice(null);
            setResolutionAction(null);
            setDiagnosisCode('');
            setDiagnosisDesc('');
            setResolutionNotes('');
            setReviewDate('');
            setCoveragePercent(80);
            setAdjustedQuantity(1);
            await onCheckCompletion();
            await onReload();
        } catch { /* error */ }
        setResolving(false);
    };

    return (
        <>
            {/* Info del afiliado */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Afiliado</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p><span className="text-muted-foreground">Nombre:</span> {expedient.affiliate?.full_name || '—'}</p>
                    <p><span className="text-muted-foreground">DNI:</span> {expedient.affiliate?.document_number || String(expedient.affiliate_id).slice(0, 12)}</p>
                    {expedient.affiliate?.affiliate_number && (
                        <p><span className="text-muted-foreground">N° Afiliado:</span> {expedient.affiliate.affiliate_number}</p>
                    )}
                    {expedient.family_member_relation && (
                        <p><span className="text-muted-foreground">Parentesco:</span> {expedient.family_member_relation}</p>
                    )}
                </div>
                {expedient.request_notes && (
                    <p className="italic text-muted-foreground mt-1 text-xs">&quot;{expedient.request_notes}&quot;</p>
                )}
            </div>

            {/* Motor de reglas global */}
            {expedient.rules_result && (
                <div className={`rounded-xl p-3 text-sm border ${expedient.rules_result === 'verde' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' :
                    expedient.rules_result === 'amarillo' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' :
                        'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                    }`}>
                    <p className="font-bold text-[10px] uppercase tracking-widest mb-1">Motor de Reglas</p>
                    <p className="font-semibold">
                        Resultado global: <span className="uppercase">{expedient.rules_result}</span>
                    </p>
                </div>
            )}

            {/* Lista de prácticas */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        Prácticas solicitadas
                        <HelpTooltip text="Cada práctica tiene un semáforo de clasificación automática. Usá 'Resolución en lote' para autorizar o denegar varias a la vez." position="right" size={12} />
                    </p>
                    {canResolve && practices.length > 1 && (
                        <button
                            onClick={() => { setBatchMode(!batchMode); setBatchSelected(new Set()); setBatchAction(null); }}
                            className={`text-[10px] px-2 py-1 rounded-full font-semibold transition-colors ${batchMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                            {batchMode ? '✕ Cancelar lote' : '☰ Resolución en lote'}
                        </button>
                    )}
                </div>

                {/* Filtro por clasificación */}
                {presentClassifications.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                        <button
                            onClick={() => setFilterClassification('todas')}
                            className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${filterClassification === 'todas' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                            Todas ({practices.length})
                        </button>
                        {presentClassifications.map(cls => {
                            const cfg = CLASSIFICATION_CONFIG[cls];
                            const count = practices.filter(p => p.rule_classification === cls).length;
                            return (
                                <button
                                    key={cls}
                                    onClick={() => setFilterClassification(cls)}
                                    className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${filterClassification === cls ? `${cfg.bg} ${cfg.color} ring-1 ring-current` : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                >
                                    {cfg.emoji} {cfg.short} ({count})
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Panel de acción en lote */}
                {batchMode && batchSelected.size > 0 && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                        <p className="text-xs font-semibold">{batchSelected.size} práctica{batchSelected.size > 1 ? 's' : ''} seleccionada{batchSelected.size > 1 ? 's' : ''}</p>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-xs" onClick={() => setBatchAction('autorizar')} disabled={resolving}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Autorizar todas
                            </Button>
                            <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-xs" onClick={() => setBatchAction('denegar')} disabled={resolving}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Denegar todas
                            </Button>
                        </div>
                        {batchAction && (
                            <div className="space-y-2">
                                <textarea
                                    value={batchNotes}
                                    onChange={e => setBatchNotes(e.target.value)}
                                    placeholder={batchAction === 'denegar' ? 'Motivo de denegación (obligatorio)...' : 'Observaciones (opcional)...'}
                                    rows={2}
                                    className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none"
                                />
                                <Button
                                    size="sm"
                                    onClick={handleBatchResolve}
                                    disabled={resolving || (batchAction === 'denegar' && !batchNotes.trim())}
                                    className={`w-full ${batchAction === 'autorizar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {resolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Confirmar {batchAction === 'autorizar' ? 'autorización' : 'denegación'} en lote
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {filteredPractices.map((p, idx) => {
                    const ps = PRACTICE_STATUS_CONFIG[p.status as PracticeResolutionStatus];
                    const PStatusIcon = ps.icon;
                    const isSelected = selectedPractice?.id === p.id;
                    const canResolvePractice = canResolve && (isMine || expedient.status === 'pendiente') &&
                        ['pendiente', 'en_revision', 'observada'].includes(p.status);

                    return (
                        <div key={p.id} className={`border rounded-xl overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border/50'}`}>
                            {/* Cabecera */}
                            <div
                                className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors ${canResolvePractice ? '' : 'opacity-70'}`}
                                onClick={() => {
                                    if (batchMode && canResolvePractice) {
                                        const next = new Set(batchSelected);
                                        next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                                        setBatchSelected(next);
                                    } else if (canResolvePractice) {
                                        setSelectedPractice(isSelected ? null : p);
                                        setResolutionAction(null);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {batchMode && canResolvePractice ? (
                                        <input type="checkbox" checked={batchSelected.has(p.id)} readOnly className="h-4 w-4 rounded accent-primary" />
                                    ) : (
                                        <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">Práctica #{p.practice_id}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                            <span>Cant: {p.quantity}</span>
                                            {p.practice_value != null && <span>• ${p.practice_value.toLocaleString()}</span>}
                                            {p.rule_result && (
                                                <span className={`px-1 py-0.5 rounded text-[10px] font-bold uppercase ${RULE_COLORS[p.rule_result as RulesResult]}`}>
                                                    {p.rule_result}
                                                </span>
                                            )}
                                            {p.rule_classification && (() => {
                                                const clsCfg = CLASSIFICATION_CONFIG[p.rule_classification];
                                                return (
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${clsCfg.bg} ${clsCfg.color}`}>
                                                        {clsCfg.emoji} {clsCfg.short}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge className={`${ps.color} text-[10px] gap-1`}>
                                        <PStatusIcon className="h-3 w-3" />
                                        {ps.label}
                                    </Badge>
                                    {canResolvePractice && (
                                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                                    )}
                                </div>
                            </div>

                            {/* Código de autorización */}
                            {p.authorization_code && (
                                <div className="px-3 pb-2 border-t bg-green-50/50 dark:bg-green-950/20">
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <p className="text-xs text-green-700 dark:text-green-400 font-semibold">Autorización</p>
                                            <p className="font-mono font-bold text-green-800 dark:text-green-300">{p.authorization_code}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {p.authorization_expiry && (
                                                <p className="text-xs text-green-600">Vence: {formatShortDate(p.authorization_expiry)}</p>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); generatePracticePDF(expedient, p); }}
                                                className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                                title="Imprimir constancia"
                                            >
                                                <Printer className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Alertas motor de reglas */}
                            {p.rule_messages && p.rule_messages.length > 0 && isSelected && (
                                <div className="px-3 py-2 border-t bg-muted/20">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Alertas del motor</p>
                                    {p.rule_messages.map((msg, i) => (
                                        <p key={i} className="text-xs text-muted-foreground">• {msg}</p>
                                    ))}
                                </div>
                            )}

                            {/* Notas de resolución */}
                            {p.resolution_notes && !isSelected && (
                                <div className="px-3 py-2 border-t bg-muted/10">
                                    <p className="text-xs italic text-muted-foreground">{p.resolution_notes}</p>
                                </div>
                            )}

                            {/* Panel de resolución */}
                            {isSelected && canResolvePractice && (
                                <div className="border-t p-3 bg-muted/10 space-y-3">
                                    {!resolutionAction && (
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {([
                                                { action: 'autorizar' as const, icon: CheckCircle, label: 'Autorizar', colors: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400' },
                                                { action: 'parcial' as const, icon: AlertTriangle, label: 'Parcial', colors: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
                                                { action: 'observar' as const, icon: Eye, label: 'Observar', colors: 'hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
                                                { action: 'diferir' as const, icon: Pause, label: 'Diferir', colors: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400' },
                                                { action: 'denegar' as const, icon: XCircle, label: 'Denegar', colors: 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400' },
                                            ]).map(({ action, icon: Icon, label, colors }) => (
                                                <button key={action} onClick={() => setResolutionAction(action)} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${colors}`}>
                                                    <Icon className="h-5 w-5" />
                                                    <span className="text-[10px] font-semibold">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {resolutionAction && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    {resolutionAction === 'autorizar' && '✅ Autorizar'}
                                                    {resolutionAction === 'parcial' && '🔄 Autorización Parcial'}
                                                    {resolutionAction === 'observar' && '👁️ Observar'}
                                                    {resolutionAction === 'diferir' && '⏰ Diferir'}
                                                    {resolutionAction === 'denegar' && '❌ Denegar'}
                                                </p>
                                                <button onClick={() => setResolutionAction(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                                            </div>

                                            {['autorizar', 'parcial', 'denegar'].includes(resolutionAction) && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input placeholder="CIE-10" value={diagnosisCode} onChange={e => setDiagnosisCode(e.target.value)} className="h-8 text-xs" />
                                                    <Input placeholder="Descripción diagnóstico" value={diagnosisDesc} onChange={e => setDiagnosisDesc(e.target.value)} className="h-8 text-xs" />
                                                </div>
                                            )}

                                            {['autorizar', 'parcial'].includes(resolutionAction) && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-muted-foreground whitespace-nowrap">Cobertura:</label>
                                                    <Input type="number" min={0} max={100} value={coveragePercent} onChange={e => setCoveragePercent(Number(e.target.value))} className="h-8 text-xs w-20" />
                                                    <span className="text-xs text-muted-foreground">%</span>
                                                    {p.practice_value != null && (
                                                        <span className="text-xs text-muted-foreground ml-2">= ${((p.practice_value * coveragePercent) / 100).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            )}

                                            {resolutionAction === 'parcial' && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-muted-foreground whitespace-nowrap">Cantidad:</label>
                                                    <Input type="number" min={1} max={p.quantity} value={adjustedQuantity} onChange={e => setAdjustedQuantity(Number(e.target.value))} className="h-8 text-xs w-20" />
                                                    <span className="text-xs text-muted-foreground">de {p.quantity} solicitadas</span>
                                                </div>
                                            )}

                                            {resolutionAction === 'diferir' && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-muted-foreground whitespace-nowrap">Revisar el:</label>
                                                    <Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className="h-8 text-xs" />
                                                </div>
                                            )}

                                            <textarea
                                                value={resolutionNotes}
                                                onChange={e => setResolutionNotes(e.target.value)}
                                                placeholder={
                                                    resolutionAction === 'denegar' ? 'Motivo de denegación (obligatorio)...' :
                                                        resolutionAction === 'observar' ? 'Qué falta o debe corregirse...' :
                                                            'Observaciones...'
                                                }
                                                rows={2}
                                                className="w-full border rounded-lg px-3 py-2 text-xs bg-background resize-none"
                                            />

                                            <Button
                                                size="sm"
                                                onClick={handleResolvePractice}
                                                disabled={
                                                    resolving ||
                                                    (resolutionAction === 'denegar' && !resolutionNotes) ||
                                                    (resolutionAction === 'observar' && !resolutionNotes) ||
                                                    (resolutionAction === 'diferir' && !reviewDate)
                                                }
                                                className={`w-full ${resolutionAction === 'autorizar' ? 'bg-green-600 hover:bg-green-700' :
                                                    resolutionAction === 'parcial' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                                        resolutionAction === 'denegar' ? 'bg-red-600 hover:bg-red-700' :
                                                            resolutionAction === 'observar' ? 'bg-orange-600 hover:bg-orange-700' :
                                                                'bg-slate-600 hover:bg-slate-700'
                                                    }`}
                                            >
                                                {resolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                Confirmar{' '}
                                                {resolutionAction === 'autorizar' && 'autorización'}
                                                {resolutionAction === 'parcial' && 'autorización parcial'}
                                                {resolutionAction === 'denegar' && 'denegación'}
                                                {resolutionAction === 'observar' && 'observación'}
                                                {resolutionAction === 'diferir' && 'diferimiento'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
