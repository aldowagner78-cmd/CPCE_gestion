'use client';

import { Input } from '@/components/ui/input';
import { Search, Trash2, Clock, CheckCircle, AlertTriangle, ShieldAlert, Plus } from 'lucide-react';
import type { PracticeItem } from './types';
import type { Practice } from '@/types/database';
import type { PracticeRuleResult } from '@/services/rulesEngine';

// Mapeo de tipo de nomenclador a abreviatura visible
const NOMENCLATOR_ABBR: Record<string, string> = {
    medico: 'MED',
    bioquimico: 'BIO',
    odontologico: 'ODO',
    farmacia: 'FAR',
};

const NOMENCLATOR_COLORS: Record<string, string> = {
    MED: 'bg-blue-100 text-blue-700',
    BIO: 'bg-emerald-100 text-emerald-700',
    ODO: 'bg-pink-100 text-pink-700',
    FAR: 'bg-amber-100 text-amber-700',
    'N/N': 'bg-slate-100 text-slate-600',
};

const RULE_COLORS: Record<string, { bg: string; border: string; text: string; icon: React.ElementType; label: string }> = {
    verde: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', icon: CheckCircle, label: 'Auto-aprobable' },
    amarillo: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', icon: AlertTriangle, label: 'Requiere auditor' },
    rojo: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: ShieldAlert, label: 'Sin cobertura / Auditor' },
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

    const totalCoseguro = practiceItems.reduce((sum, pi) => {
        const rr = pi.ruleResult as PracticeRuleResult | undefined;
        return sum + (rr?.copay_amount ?? 0);
    }, 0);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Solicita:
                </label>
                {practiceItems.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-medium">
                        {rulesEvaluated && (
                            <>
                                {greenCount > 0 && <span className="text-green-700">● {greenCount} auto</span>}
                                {yellowCount > 0 && <span className="text-yellow-700">● {yellowCount} auditor</span>}
                                {redCount > 0 && <span className="text-red-700">● {redCount} sin cob.</span>}
                            </>
                        )}
                        <span className="text-muted-foreground">{practiceItems.length} práctica(s)</span>
                    </div>
                )}
            </div>

            {/* Buscador de practicas — siempre visible */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por codigo o descripcion (ej: RMN, consulta, 420101)..."
                    value={pracSearch}
                    onChange={e => onPracSearchChange(e.target.value)}
                    className="pl-9"
                />
                {searchingPrac && (
                    <p className="text-xs text-muted-foreground mt-1 animate-pulse">Buscando en nomenclador...</p>
                )}
                {pracResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {pracResults.map(p => {
                            const abbr = NOMENCLATOR_ABBR[p.nomenclator_type ?? ''] ?? 'N/N';
                            const alreadyAdded = practiceItems.some(pi => pi.practice.id === p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => !alreadyAdded && onAddPractice(p)}
                                    disabled={alreadyAdded}
                                    className={`w-full px-3 py-2.5 text-left text-sm border-b last:border-0 flex justify-between items-center gap-2 ${alreadyAdded ? 'bg-muted/30 text-muted-foreground' : 'hover:bg-muted/50'}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${NOMENCLATOR_COLORS[abbr]}`}>
                                            {abbr}
                                        </span>
                                        <span className="font-mono font-semibold shrink-0">{p.code}</span>
                                        <span className="truncate">{p.description}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-mono text-muted-foreground text-xs">
                                            ${(p.financial_value ?? 0).toLocaleString()}
                                        </span>
                                        {alreadyAdded && <span className="text-xs text-green-600">checkmark</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                {pracSearch.length >= 2 && !searchingPrac && pracResults.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                        No se encontraron practicas para &quot;{pracSearch}&quot;
                    </p>
                )}
            </div>

            {/* Tabla de practicas seleccionadas */}
            {practiceItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    {/* Encabezado */}
                    <div className="hidden sm:grid grid-cols-[2rem_5rem_1fr_3.5rem_4.5rem_4.5rem_3rem_4.5rem_2rem_2rem] gap-1 px-3 py-1.5 bg-muted/40 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        <span></span>
                        <span>Codigo</span>
                        <span>Denominacion</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-right">Unitario</span>
                        <span className="text-right">Total</span>
                        <span className="text-right">%COS</span>
                        <span className="text-right">Coseg.</span>
                        <span></span>
                        <span></span>
                    </div>

                    {/* Filas */}
                    {practiceItems.map((pi, idx) => {
                        const rc = pi.ruleResult as PracticeRuleResult | undefined;
                        const color = rc ? RULE_COLORS[rc.result] : null;
                        const RuleIcon = color?.icon;

                        const abbr = NOMENCLATOR_ABBR[pi.practice.nomenclator_type ?? ''] ?? 'N/N';
                        const unitValue = pi.practice.financial_value ?? 0;
                        const rowTotal = unitValue * pi.quantity;
                        const coseguoPercent = rc ? (100 - rc.coverage_percent) : 0;
                        const coseguroAmount = rc?.copay_amount ?? 0;

                        return (
                            <div key={pi.practice.id} className={`border-b last:border-0 ${color ? color.bg : ''}`}>
                                <div className="grid grid-cols-[2rem_5rem_1fr_3.5rem_4.5rem_4.5rem_3rem_4.5rem_2rem_2rem] gap-1 items-center px-3 py-2 text-sm">
                                    {/* Semaforo o badge nomenclador */}
                                    <div className="flex justify-center">
                                        {rc && RuleIcon ? (
                                            <RuleIcon className={`h-3.5 w-3.5 ${color!.text}`} title={color!.label} />
                                        ) : (
                                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${NOMENCLATOR_COLORS[abbr]}`}>
                                                {abbr}
                                            </span>
                                        )}
                                    </div>

                                    {/* Codigo + badge nomenclador (cuando hay semaforo) */}
                                    <div className="flex items-center gap-1 min-w-0">
                                        {rc && (
                                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${NOMENCLATOR_COLORS[abbr]}`}>
                                                {abbr}
                                            </span>
                                        )}
                                        <span className="font-mono font-semibold text-xs truncate">{pi.practice.code}</span>
                                    </div>

                                    {/* Denominacion */}
                                    <span className="text-xs truncate" title={pi.practice.description}>
                                        {pi.practice.description}
                                    </span>

                                    {/* Cantidad */}
                                    <div className="flex justify-center">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={99}
                                            value={pi.quantity}
                                            onChange={e => onUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                                            className="w-12 h-7 text-center text-xs px-1"
                                        />
                                    </div>

                                    {/* Unitario */}
                                    <span className="font-mono text-xs text-right tabular-nums">
                                        ${unitValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>

                                    {/* Total */}
                                    <span className="font-mono text-xs text-right font-semibold tabular-nums">
                                        ${rowTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>

                                    {/* %COS */}
                                    <span className={`text-xs text-right tabular-nums ${coseguoPercent > 0 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                        {rc ? `${coseguoPercent.toFixed(0)}%` : '-'}
                                    </span>

                                    {/* Monto coseguro */}
                                    <span className={`font-mono text-xs text-right tabular-nums ${coseguroAmount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {rc ? `$${coseguroAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                    </span>

                                    {/* Historial */}
                                    <button
                                        onClick={() => onViewHistory(pi.practice.id, pi.practice.description)}
                                        className="flex justify-center p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                        title="Ver consumos previos"
                                    >
                                        <Clock className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Eliminar */}
                                    <button
                                        onClick={() => onRemovePractice(idx)}
                                        className="flex justify-center p-1 text-muted-foreground hover:text-red-500 rounded transition-colors"
                                        title="Quitar practica"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Mensajes del motor */}
                                {rc && rc.messages.length > 0 && (
                                    <div className="px-10 pb-1.5">
                                        {rc.messages.map((msg, mi) => (
                                            <p key={mi} className={`text-xs ${color!.text} opacity-80`}>- {msg}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Footer totales */}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t">
                        <button
                            onClick={() => { const el = document.querySelector('[placeholder*="nomenclador"]') as HTMLInputElement | null; el?.focus(); }}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar practica
                        </button>
                        <div className="flex items-center gap-4 text-xs tabular-nums">
                            <span className="text-muted-foreground">
                                Valor total: <span className="text-foreground font-semibold">${totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </span>
                            <span className="text-muted-foreground">
                                Total coseguro: <span className={totalCoseguro > 0 ? 'text-orange-600 font-semibold' : 'text-foreground font-semibold'}>${totalCoseguro.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
