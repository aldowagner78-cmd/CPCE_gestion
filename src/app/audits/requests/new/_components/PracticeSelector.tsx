'use client';

import { Input } from '@/components/ui/input';
import { Search, Trash2, Clock, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { PracticeItem } from './types';
import type { Practice } from '@/types/database';
import type { PracticeRuleResult } from '@/services/rulesEngine';

const RULE_COLORS: Record<string, { bg: string; border: string; text: string; icon: React.ElementType; label: string }> = {
    verde: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', icon: CheckCircle, label: 'Auto-aprobable' },
    amarillo: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', icon: AlertTriangle, label: 'Requiere auditor' },
    rojo: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: ShieldAlert, label: 'Requiere auditor' },
};

interface PracticeSelectorProps {
    pracSearch: string;
    pracResults: Practice[];
    searchingPrac: boolean;
    practiceItems: PracticeItem[];
    rulesEvaluated: boolean;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    totalValue: number;
    onPracSearchChange: (v: string) => void;
    onAddPractice: (p: Practice) => void;
    onRemovePractice: (idx: number) => void;
    onUpdateQuantity: (idx: number, qty: number) => void;
    onViewHistory: (id: number, name: string) => void;
}

export function PracticeSelector({
    pracSearch, pracResults, searchingPrac, practiceItems,
    rulesEvaluated, greenCount, yellowCount, redCount, totalValue,
    onPracSearchChange, onAddPractice, onRemovePractice, onUpdateQuantity, onViewHistory,
}: PracticeSelectorProps) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Prácticas * <span className="normal-case text-muted-foreground/60">(buscar en nomenclador)</span>
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por código o descripción (ej: RMN, consulta, 420101)..."
                    value={pracSearch}
                    onChange={e => onPracSearchChange(e.target.value)}
                    className="pl-9"
                />
                {searchingPrac && <p className="text-xs text-muted-foreground mt-1 animate-pulse">Buscando en nomenclador...</p>}
                {pracResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {pracResults.map(p => {
                            const alreadyAdded = practiceItems.some(pi => pi.practice.id === p.id);
                            return (
                                <button key={p.id} onClick={() => !alreadyAdded && onAddPractice(p)} disabled={alreadyAdded}
                                    className={`w-full px-3 py-2.5 text-left text-sm border-b last:border-0 flex justify-between items-center gap-2 ${alreadyAdded ? 'bg-muted/30 text-muted-foreground' : 'hover:bg-muted/50'}`}>
                                    <div className="min-w-0">
                                        <span className="font-mono font-semibold">{p.code}</span>
                                        <span className="ml-2">{p.description}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-mono text-muted-foreground">${p.financial_value?.toLocaleString()}</span>
                                        {alreadyAdded && <span className="text-xs text-green-600">✓ agregada</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                {pracSearch.length >= 2 && !searchingPrac && pracResults.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No se encontraron prácticas para &quot;{pracSearch}&quot;</p>
                )}
            </div>

            {practiceItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    {practiceItems.map((pi, idx) => {
                        const rc = pi.ruleResult as PracticeRuleResult | undefined;
                        const color = rc ? RULE_COLORS[rc.result] : null;
                        const RuleIcon = color?.icon;
                        return (
                            <div key={pi.practice.id} className={`border-b last:border-0 transition-colors ${color ? color.bg : 'hover:bg-muted/30'}`}>
                                <div className="flex items-center gap-3 px-3 py-2">
                                    {rc && RuleIcon && (
                                        <div className={`shrink-0 ${color!.text}`} title={color!.label}>
                                            <RuleIcon className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 text-sm">
                                        <span className="font-mono font-semibold">{pi.practice.code}</span>
                                        <span className="ml-1.5">{pi.practice.description}</span>
                                    </div>
                                    {rc && (
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className={`text-xs font-medium ${color!.text}`}>{rc.coverage_percent.toFixed(0)}% cob.</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Cubre ${(rc.covered_amount || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })} · Coseg {(rc.copay_amount || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                                        ${((pi.practice.financial_value || 0) * pi.quantity).toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">×</span>
                                        <Input type="number" min={1} max={99} value={pi.quantity}
                                            onChange={e => onUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                                            className="w-14 h-7 text-center text-sm" />
                                    </div>
                                    <button onClick={() => onViewHistory(pi.practice.id, pi.practice.description)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ver consumos previos">
                                        <Clock className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => onRemovePractice(idx)} className="text-muted-foreground hover:text-red-500 p-1">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                {rc && rc.messages.length > 0 && (
                                    <div className="px-3 pb-2 pl-10">
                                        {rc.messages.map((msg, mi) => (
                                            <p key={mi} className={`text-xs ${color!.text} opacity-80`}>• {msg}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-sm font-semibold">
                        <div className="flex items-center gap-3">
                            <span>{practiceItems.length} práctica(s)</span>
                            {rulesEvaluated && (
                                <div className="flex items-center gap-2 text-xs font-medium">
                                    {greenCount > 0 && <span className="text-green-700">● {greenCount} auto</span>}
                                    {yellowCount > 0 && <span className="text-yellow-700">● {yellowCount} auditor</span>}
                                    {redCount > 0 && <span className="text-red-700">● {redCount} auditor</span>}
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="font-mono">Total: ${totalValue.toLocaleString()}</span>
                            {rulesEvaluated && (() => {
                                const totalCovered = practiceItems.reduce((s, pi) => s + ((pi.ruleResult as PracticeRuleResult)?.covered_amount || 0), 0);
                                const totalCopay = practiceItems.reduce((s, pi) => s + ((pi.ruleResult as PracticeRuleResult)?.copay_amount || 0), 0);
                                return totalCovered > 0 ? (
                                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                        Cubierto: {totalCovered.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })} · Coseguro: {totalCopay.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                                    </p>
                                ) : null;
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
