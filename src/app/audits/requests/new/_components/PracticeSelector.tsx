'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Clock, CheckCircle, AlertTriangle, ShieldAlert, Plus, X, History } from 'lucide-react';
import type { PracticeItem } from './types';
import type { Practice } from '@/types/database';
import type { PracticeRuleResult } from '@/services/rulesEngine';
import { NomenclatorSearchModal } from './NomenclatorSearchModal';

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
    jurisdictionId?: number;
    onPracSearchChange: (v: string) => void;
    onAddPractice: (p: Practice) => void;
    onRemovePractice: (idx: number) => void;
    onUpdateQuantity: (idx: number, qty: number) => void;
    onViewHistory: (id: number, name: string) => void;
    onViewFullHistory?: () => void;
    affiliateSelected?: boolean;
}

export function PracticeSelector({
    pracSearch, pracResults, searchingPrac, practiceItems,
    rulesEvaluated, greenCount, yellowCount, redCount, totalValue,
    jurisdictionId = 1,
    affiliateSelected = false,
    onPracSearchChange, onAddPractice, onRemovePractice, onUpdateQuantity, onViewHistory,
    onViewFullHistory,
}: PracticeSelectorProps) {

    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [newlyAddedId, setNewlyAddedId] = useState<number | null>(null);
    const [dupWarning, setDupWarning] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Foco automático al abrir el buscador
    useEffect(() => {
        if (showSearch) searchInputRef.current?.focus();
    }, [showSearch]);

    // Limpiar aviso de duplicado tras 2.5s
    useEffect(() => {
        if (!dupWarning) return;
        const t = setTimeout(() => setDupWarning(''), 2500);
        return () => clearTimeout(t);
    }, [dupWarning]);

    const openSearch = () => setShowSearch(true);

    const closeSearch = () => {
        setShowSearch(false);
        onPracSearchChange('');
    };

    const handleAddPractice = (p: Practice) => {
        if (practiceItems.some(pi => pi.practice.id === p.id)) {
            setDupWarning(`"${p.code}" ya está en la lista`);
            return;
        }
        onAddPractice(p);
        setNewlyAddedId(p.id);
        setTimeout(() => setNewlyAddedId(null), 1500);
        closeSearch();
    };

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

            {/* Buscador colapsable — se abre con el botón "Agregar práctica" */}
            {showSearch && (
                <div className="relative">
                    <div className="flex gap-2 mb-1">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Buscar por código o descripción (ej: RMN, consulta, 420101)..."
                                value={pracSearch}
                                onChange={e => onPracSearchChange(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }}
                                className="pl-9"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setSearchModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border rounded-lg text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
                            title="Buscar con filtros por nomenclador"
                        >
                            <Search className="h-3.5 w-3.5" />
                            Avanzado
                        </button>
                        <button
                            type="button"
                            onClick={closeSearch}
                            className="flex items-center justify-center p-2 border rounded-lg text-muted-foreground hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors shrink-0"
                            title="Cerrar buscador (Esc)"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {searchingPrac && (
                        <p className="text-xs text-muted-foreground mt-1 animate-pulse">Buscando en nomenclador...</p>
                    )}
                    {dupWarning && (
                        <p className="text-xs text-amber-600 font-medium mt-1">⚠ {dupWarning}</p>
                    )}
                    {pracResults.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                            {pracResults.map(p => {
                                const abbr = NOMENCLATOR_ABBR[p.nomenclator_type ?? ''] ?? 'N/N';
                                const alreadyAdded = practiceItems.some(pi => pi.practice.id === p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => handleAddPractice(p)}
                                        className={`w-full px-3 py-2.5 text-left text-sm border-b last:border-0 flex justify-between items-center gap-2 ${alreadyAdded ? 'bg-amber-50/60 text-amber-700' : 'hover:bg-muted/50'}`}
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
                                        {alreadyAdded && <span className="text-[10px] text-amber-600 font-semibold">ya agregada</span>}
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                    )}
                    {pracSearch.length >= 2 && !searchingPrac && pracResults.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            No se encontraron prácticas para &quot;{pracSearch}&quot;
                        </p>
                    )}
                </div>
            )}

            {/* Estado vacío — sin prácticas y buscador cerrado */}
            {!showSearch && practiceItems.length === 0 && (
                <button
                    type="button"
                    onClick={openSearch}
                    className="w-full flex items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Agregar práctica
                </button>
            )}

            {/* Tabla de practicas seleccionadas */}
            {practiceItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    {/* Encabezado */}
                    <div className="hidden sm:grid grid-cols-[1.5rem_6rem_1fr_3.5rem_5rem_5rem_3rem_5rem_2rem_2rem] gap-1 px-3 py-1.5 bg-muted/40 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        <span></span>
                        <span>Codigo</span>
                        <span>Denominacion</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-right">Unitario</span>
                        <span className="text-right">Total</span>
                        <span className="text-right">%COS</span>
                        <span className="flex items-center justify-end gap-1">
                            Coseg.
                            {affiliateSelected && onViewFullHistory && (
                                <button
                                    type="button"
                                    onClick={onViewFullHistory}
                                    title="Ver historial completo del afiliado"
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded p-0.5 transition-colors"
                                >
                                    <History className="h-3 w-3" />
                                </button>
                            )}
                        </span>
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
                        const isNew = pi.practice.id === newlyAddedId;

                        return (
                            <div key={pi.practice.id} className={`border-b last:border-0 transition-colors duration-700 ${isNew ? 'bg-green-50 ring-1 ring-inset ring-green-200' : color ? color.bg : ''}`}>
                                <div className="grid grid-cols-[1.5rem_6rem_1fr_3.5rem_5rem_5rem_3rem_5rem_2rem_2rem] gap-1 items-center px-3 py-2 text-sm">
                                    {/* Semáforo — siempre en su propia columna */}
                                    <div className="flex justify-center">
                                        {rc && RuleIcon ? (
                                            <RuleIcon className={`h-3.5 w-3.5 ${color!.text}`} title={color!.label} />
                                        ) : (
                                            <span className="text-muted-foreground/20 text-[10px]">●</span>
                                        )}
                                    </div>

                                    {/* Badge tipo + Código — siempre visibles */}
                                    <div className="flex items-center gap-1 min-w-0">
                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${NOMENCLATOR_COLORS[abbr]}`}>
                                            {abbr}
                                        </span>
                                        <span className="font-mono font-semibold text-xs">{pi.practice.code}</span>
                                    </div>

                                    {/* Denominacion — sin truncate para que se lea completa */}
                                    <span className="text-xs leading-tight" title={pi.practice.description}>
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
                            type="button"
                            onClick={openSearch}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar práctica
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
        <NomenclatorSearchModal
            isOpen={searchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            onSelectPractice={p => {
                if (!practiceItems.some(pi => pi.practice.id === p.id)) {
                    onAddPractice(p);
                    setNewlyAddedId(p.id);
                    setTimeout(() => setNewlyAddedId(null), 1500);
                } else {
                    setDupWarning(`"${p.code}" ya está en la lista`);
                }
                setSearchModalOpen(false);
            }}
            jurisdictionId={jurisdictionId}
        />
        </div>
    );
}
