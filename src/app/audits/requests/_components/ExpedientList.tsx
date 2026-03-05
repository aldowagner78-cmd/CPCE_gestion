'use client';

import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, Star } from 'lucide-react';
import { TYPE_CONFIG, STATUS_CONFIG, RULE_COLORS, formatShortDate } from './configUI';
import { computeSLA } from '@/services/slaService';
import type { Expedient, ExpedientStatus } from '@/types/database';

interface ExpedientListProps {
    expedients: Expedient[];
    onSelect: (e: Expedient) => void;
    selectedId?: string;
}

export function ExpedientList({ expedients, onSelect, selectedId }: ExpedientListProps) {
    if (expedients.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay solicitudes con estos filtros</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border/50">
            {expedients.map(exp => {
                const tc = TYPE_CONFIG[exp.type];
                const sc = STATUS_CONFIG[exp.status];
                const TypeIcon = tc.icon;
                const StatusIcon = sc.icon;
                const isSelected = selectedId === exp.id;
                const slaInfo = (['pendiente', 'en_revision', 'observada'] as ExpedientStatus[]).includes(exp.status)
                    ? computeSLA(exp.created_at)
                    : null;
                const hasPriority = (exp.clinical_priority_score ?? 0) >= 3;

                return (
                    <button
                        key={exp.id}
                        onClick={() => onSelect(exp)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-all duration-150 ${isSelected ? 'bg-primary/5 border-l-3 border-primary' : 'border-l-3 border-transparent'}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={`p-1.5 rounded-lg ${tc.color}`}>
                                    <TypeIcon className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-mono text-xs text-muted-foreground font-medium">
                                    {exp.expedient_number}
                                </span>
                                {exp.priority === 'urgente' && (
                                    <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        Urgente
                                    </span>
                                )}
                                {hasPriority && (
                                    <span title="Prioridad clínica alta (IA)" className="inline-flex">
                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {slaInfo && (
                                    <span
                                        className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${slaInfo.status === 'verde' ? 'bg-green-500'
                                            : slaInfo.status === 'amarillo' ? 'bg-yellow-400'
                                                : 'bg-red-500 animate-pulse'
                                            }`}
                                        title={`SLA: ${slaInfo.hoursElapsed.toFixed(1)}h hábiles`}
                                    />
                                )}
                                <Badge className={`${sc.color} text-[10px] gap-1`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {sc.label}
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-1.5">
                            <p className="font-medium truncate text-sm">
                                {exp.affiliate?.full_name || `Afiliado #${String(exp.affiliate_id).slice(0, 8)}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {exp.affiliate?.affiliate_number && (
                                    <span className="text-[10px] font-mono text-muted-foreground">N° {exp.affiliate.affiliate_number}</span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exp.affiliate?.titular_id ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                    {exp.affiliate?.titular_id ? 'Adherente' : 'Titular'}
                                </span>
                                {exp.family_member_relation && (
                                    <span className="text-[10px] text-muted-foreground">({exp.family_member_relation})</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatShortDate(exp.created_at)}
                            </span>
                            {exp.rules_result && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${RULE_COLORS[exp.rules_result]}`}>
                                    {exp.rules_result}
                                </span>
                            )}
                            {exp.assigned_to && (
                                <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Asignado
                                </span>
                            )}
                            {slaInfo && (
                                <span className={`text-[10px] font-medium ${slaInfo.status === 'rojo' ? 'text-red-600' :
                                    slaInfo.status === 'amarillo' ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                    {slaInfo.hoursElapsed.toFixed(1)}h
                                </span>
                            )}
                        </div>

                        {exp.request_notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 truncate italic opacity-70">
                                &quot;{exp.request_notes}&quot;
                            </p>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
