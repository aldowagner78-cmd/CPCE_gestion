'use client';

import { Filter, Clock, Stethoscope, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import type { DetailedConsumption, PracticeItem } from './types';

interface AffiliateConsumptionsProps {
    showConsumptions: boolean;
    loadingConsumptions: boolean;
    consumptions: { practiceCode: string; practiceName: string; count: number; lastDate: string }[];
    detailedConsumptions: DetailedConsumption[];
    practiceItems: PracticeItem[];
    consumptionDateFrom: string;
    consumptionDateTo: string;
    consumptionPracticeFilter: string;
    showConsumptionFilters: boolean;
    onToggle: () => void;
    onFilterChange: (key: 'from' | 'to' | 'practice', value: string) => void;
    onClearFilters: () => void;
    onToggleFilters: () => void;
    onViewAttachments: (expedientId: string, expedientNumber: string) => void;
    onAddPractice: (practice: PracticeItem['practice']) => void;
}

const STATUS_COLORS: Record<string, string> = {
    autorizada: 'bg-green-100 text-green-700',
    autorizada_parcial: 'bg-yellow-100 text-yellow-700',
    denegada: 'bg-red-100 text-red-700',
    pendiente: 'bg-blue-100 text-blue-700',
    en_revision: 'bg-purple-100 text-purple-700',
};

export function AffiliateConsumptions({
    showConsumptions, loadingConsumptions, detailedConsumptions, practiceItems,
    consumptionDateFrom, consumptionDateTo, consumptionPracticeFilter,
    showConsumptionFilters, onToggle, onFilterChange, onClearFilters, onToggleFilters,
    onAddPractice,
}: AffiliateConsumptionsProps) {
    return (
        <div className="border-t">
            <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2 font-medium">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Consumos del afiliado
                    {detailedConsumptions.length > 0 && (
                        <span className="text-xs text-muted-foreground font-normal">({detailedConsumptions.length} registros)</span>
                    )}
                </span>
                {loadingConsumptions ? (
                    <span className="text-xs text-muted-foreground animate-pulse">Cargando...</span>
                ) : showConsumptions ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                )}
            </button>

            {showConsumptions && (
                <div className="px-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial completo</span>
                        <button onClick={onToggleFilters}
                            className={`p-1.5 rounded-md border text-xs ${showConsumptionFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                            <Filter className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {showConsumptionFilters && (
                        <div className="flex gap-2 items-center flex-wrap bg-muted/20 rounded-lg p-2">
                            <label className="text-xs text-muted-foreground">Práctica:</label>
                            <input type="text" placeholder="Código o nombre..." value={consumptionPracticeFilter}
                                onChange={e => onFilterChange('practice', e.target.value)}
                                className="border rounded px-2 py-1 text-xs bg-background min-w-[120px]" />
                            <label className="text-xs text-muted-foreground ml-2">Desde:</label>
                            <input type="date" value={consumptionDateFrom} onChange={e => onFilterChange('from', e.target.value)}
                                className="border rounded px-2 py-1 text-xs bg-background" />
                            <label className="text-xs text-muted-foreground">Hasta:</label>
                            <input type="date" value={consumptionDateTo} onChange={e => onFilterChange('to', e.target.value)}
                                className="border rounded px-2 py-1 text-xs bg-background" />
                            {(consumptionDateFrom || consumptionDateTo || consumptionPracticeFilter) && (
                                <button onClick={onClearFilters} className="text-xs text-red-500 hover:text-red-700 ml-1">Limpiar</button>
                            )}
                        </div>
                    )}

                    {(() => {
                        let filtered = detailedConsumptions;
                        if (consumptionDateFrom) filtered = filtered.filter(d => d.date >= consumptionDateFrom);
                        if (consumptionDateTo) filtered = filtered.filter(d => d.date <= consumptionDateTo + 'T23:59:59');
                        if (consumptionPracticeFilter) {
                            const lf = consumptionPracticeFilter.toLowerCase();
                            filtered = filtered.filter(d => d.practiceCode.toLowerCase().includes(lf) || d.practiceName.toLowerCase().includes(lf));
                        }
                        if (filtered.length === 0) return <p className="text-xs text-muted-foreground py-2">Sin consumos registrados.</p>;

                        const currentYear = new Date().getFullYear().toString();
                        const grouped = filtered.reduce((acc, c) => {
                            const diag = c.diagnosisName ? `${c.diagnosisCode} - ${c.diagnosisName}` : 'Sin diagnóstico / Varios';
                            if (!acc[diag]) acc[diag] = [];
                            acc[diag].push(c);
                            return acc;
                        }, {} as Record<string, DetailedConsumption[]>);

                        return (
                            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                                {Object.entries(grouped).map(([diag, items]) => (
                                    <div key={diag} className="space-y-1.5 border border-border/50 bg-background rounded-lg p-2.5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border/50">
                                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                            <h4 className="text-xs font-semibold text-foreground">{diag}</h4>
                                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">{items.length} consumos</span>
                                        </div>
                                        <div className="space-y-1.5 pl-1">
                                            {items.map(c => {
                                                const consumedThisYear = filtered.filter(d => d.practiceId === c.practiceId && d.date.startsWith(currentYear)).reduce((s, d) => s + d.quantity, 0);
                                                const alreadyInCart = practiceItems.some(pi => pi.practice.id === c.practiceId);
                                                return (
                                                    <div key={c.id} className="flex flex-col gap-1 text-xs bg-muted/20 border border-muted rounded px-2.5 py-2 hover:bg-muted/40 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1 text-muted-foreground shrink-0 w-20">
                                                                <Clock className="h-3 w-3" />
                                                                {c.date ? new Date(c.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'S/F'}
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                                                <span className="font-mono font-medium text-primary">{c.practiceCode}</span>
                                                                <span className="truncate flex-1" title={c.practiceName}>{c.practiceName}</span>
                                                                {c.quantity > 1 && <span className="text-muted-foreground bg-muted px-1 rounded-sm text-[10px]">×{c.quantity}</span>}
                                                            </div>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                                                                {c.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/30 text-muted-foreground">
                                                            <div className="flex items-center gap-3">
                                                                {consumedThisYear > 0 && (
                                                                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-sm">Límite: {consumedThisYear} / año</span>
                                                                )}
                                                                {c.coveredAmount > 0 && <span className="text-green-700 font-mono">${c.coveredAmount.toLocaleString()}</span>}
                                                                {c.copayAmount > 0 && <span className="text-orange-600 font-mono">cos.${c.copayAmount.toLocaleString()}</span>}
                                                                {c.auditorName && <span className="truncate max-w-[120px]">👤 {c.auditorName}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {c.expedientNumber && (
                                                                    <div className="flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border shadow-sm">
                                                                        <span className="font-mono text-[10px]">#{c.expedientNumber}</span>
                                                                        {c.expedientId && (
                                                                            <Link href={`/audits/requests/${c.expedientId}`} target="_blank"
                                                                                className="text-primary hover:text-primary/80 transition-colors p-[1px]">
                                                                                <ExternalLink className="h-3 w-3" />
                                                                            </Link>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {c.fullPractice && (
                                                                    <button type="button" disabled={alreadyInCart}
                                                                        onClick={() => !alreadyInCart && onAddPractice(c.fullPractice)}
                                                                        className={`flex items-center gap-1 ${alreadyInCart ? 'text-green-600 bg-green-50' : 'text-primary bg-primary/10 hover:bg-primary/20'} px-2 py-0.5 rounded transition-colors text-[10px] font-medium`}>
                                                                        <Plus className="h-3 w-3" /> {alreadyInCart ? 'Agregada' : 'Re-solicitar'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t px-1">
                                    <span>{filtered.length} registro(s)</span>
                                    <span>Cob. total: ${filtered.reduce((s, c) => s + c.coveredAmount, 0).toLocaleString()} · Coseg. total: ${filtered.reduce((s, c) => s + c.copayAmount, 0).toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
