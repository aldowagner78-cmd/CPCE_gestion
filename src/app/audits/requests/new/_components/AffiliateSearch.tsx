'use client';

import { Input } from '@/components/ui/input';
import {
    Search, X, User, Calendar, FileText, Phone, Mail, MapPin, AlertTriangle, Star
} from 'lucide-react';
import type { Affiliate } from '@/types/database';
import type { ClinicalPriorityResult } from '@/services/aiService';
import { FamilyMemberSelector } from '@/components/FamilyMemberSelector';

import { History } from 'lucide-react';

function calcAge(birthDate: string | null | undefined): number | null {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
    return age;
}

function calcCarencia(startDate: string | null | undefined, waitingMonths: number): { ok: boolean; months: number } {
    if (!startDate || waitingMonths <= 0) return { ok: true, months: 0 };
    const start = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return { ok: months >= waitingMonths, months };
}

function formatSpecialConditions(sc: unknown): string[] {
    if (!sc) return [];
    if (Array.isArray(sc)) return sc.filter(Boolean).map(String);
    if (typeof sc === 'object') return Object.entries(sc as Record<string, unknown>).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '));
    return [];
}

interface AffiliateSearchProps {
    affiliateNumberInput: string;
    onAffiliateNumberChange: (v: string) => void;
    affSearch: string;
    affResults: Affiliate[];
    affiliate: Affiliate | null;
    searchingAff: boolean;
    planName: string;
    selectedFamilyMember: Affiliate | null;
    aiPriorityResult: ClinicalPriorityResult | null;
    onAffSearchChange: (v: string) => void;
    onSelectAffiliate: (a: Affiliate) => void;
    onClearAffiliate: () => void;
    onSelectFamilyMember: (m: Affiliate | null) => void;
    onViewAttachments: (expedientId: string, expedientNumber: string) => void;
    onViewFullHistory?: () => void;
    waitingPeriodMonths?: number;
}

export function AffiliateSearch({
    affiliateNumberInput, onAffiliateNumberChange,
    affSearch, affResults, affiliate, searchingAff, planName,
    selectedFamilyMember, aiPriorityResult,
    onAffSearchChange, onSelectAffiliate, onClearAffiliate, onSelectFamilyMember,
    onViewAttachments, onViewFullHistory,
    waitingPeriodMonths = 0,
}: AffiliateSearchProps) {
    const age = affiliate ? calcAge(affiliate.birth_date) : null;
    const specialConds = affiliate ? formatSpecialConditions(affiliate.special_conditions) : [];
    const isAffiliateActive = affiliate?.status === 'activo';
    const isAffiliateBlocked = affiliate && !isAffiliateActive;
    const carencia = affiliate ? calcCarencia(affiliate.start_date, waitingPeriodMonths) : null;

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Afiliado *</label>

            {!affiliate ? (
                <div className="space-y-2">
                    {/* Campo principal: número de afiliado */}
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground select-none">#</span>
                        <Input
                            placeholder="Nro. de afiliado (carga automática)"
                            value={affiliateNumberInput}
                            onChange={e => onAffiliateNumberChange(e.target.value.replace(/\D/g, ''))}
                            className="pl-7 font-mono"
                            inputMode="numeric"
                        />
                    </div>
                    <div className="relative text-xs text-muted-foreground text-center">— o buscar por —</div>
                    {/* Campo secundario: nombre / DNI */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Nombre o DNI..."
                            value={affSearch}
                            onChange={e => onAffSearchChange(e.target.value)}
                            className="pl-9"
                        />
                        {affResults.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {affResults.map(a => {
                                    const aAge = calcAge(a.birth_date);
                                    return (
                                        <button key={String(a.id)} onClick={() => onSelectAffiliate(a)}
                                            className="w-full px-3 py-2.5 text-left hover:bg-muted/50 text-sm border-b last:border-0 flex items-center gap-3">
                                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold truncate">{a.full_name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    DNI {a.document_number}
                                                    {a.affiliate_number && ` · Nro ${a.affiliate_number}`}
                                                    {aAge !== null && ` · ${aAge} años`}
                                                    {a.relationship && ` · ${a.relationship}`}
                                                    {a.certificate_number && ` · GF ${a.certificate_number}`}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${a.status === 'activo' ? 'bg-green-100 text-green-700' : a.status === 'suspendido' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {a.status}
                                                </span>
                                                {a.certificate_number && (
                                                    <span className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">👪 Grupo</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {searchingAff && <p className="text-xs text-muted-foreground animate-pulse">Buscando afiliados...</p>}
                    {(affSearch.length >= 2 || affiliateNumberInput.length >= 3) && !searchingAff && affResults.length === 0 && (
                        <p className="text-xs text-muted-foreground">No se encontraron afiliados</p>
                    )}
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden">
                    <div className="bg-primary/5 border-b px-4 py-3 flex items-start justify-between">
                        <div>
                            <h3 className="font-bold text-base">{affiliate.full_name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                DNI {affiliate.document_number}
                                {affiliate.affiliate_number && ` · Afiliado Nro. ${affiliate.affiliate_number}`}
                                {affiliate.certificate_number && ` · Cert. ${affiliate.certificate_number}`}
                                {affiliate.cuit && ` · CUIT ${affiliate.cuit}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {onViewFullHistory && (
                                <button
                                    onClick={onViewFullHistory}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition-colors"
                                    title="Ver historial completo del afiliado"
                                >
                                    <History className="h-3.5 w-3.5" />
                                    Historial
                                </button>
                            )}
                            <button onClick={onClearAffiliate} className="text-muted-foreground hover:text-foreground p-1">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{age !== null ? `${age} años` : 'Edad N/D'}</span>
                            {affiliate.gender && <span className="text-muted-foreground">({affiliate.gender === 'M' ? 'Masc.' : affiliate.gender === 'F' ? 'Fem.' : 'Otro'})</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{planName || 'Sin plan'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={affiliate.relationship === 'Titular' ? 'font-semibold text-blue-700' : ''}>{affiliate.relationship || 'Titular'}</span>
                        </div>
                        <div>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${affiliate.status === 'activo' ? 'bg-green-100 text-green-700' : affiliate.status === 'suspendido' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                ● {affiliate.status === 'activo' ? 'Activo' : affiliate.status === 'suspendido' ? 'Suspendido' : 'Baja'}
                            </span>
                        </div>
                    {affiliate.start_date && <div className="text-xs text-muted-foreground">Alta: {new Date(affiliate.start_date).toLocaleDateString('es-AR')}</div>}
                        {affiliate.end_date && (
                            <div className="text-xs font-medium text-red-600">Baja: {new Date(affiliate.end_date).toLocaleDateString('es-AR')}</div>
                        )}
                        {carencia && waitingPeriodMonths > 0 && (
                            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${
                                carencia.ok
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                            }`}>
                                {carencia.ok
                                    ? `✓ Carencia: Ok`
                                    : `✗ Carencia: ${carencia.months}/${waitingPeriodMonths} meses`}
                            </div>
                        )}
                        {affiliate.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span className="text-xs">{affiliate.phone}</span></div>}
                        {affiliate.email && <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="text-xs truncate">{affiliate.email}</span></div>}
                        {(affiliate.city || affiliate.address) && (
                            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 sm:col-span-3">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-xs truncate">{[affiliate.address, affiliate.city, affiliate.province].filter(Boolean).join(', ')}</span>
                            </div>
                        )}
                    </div>

                    {(specialConds.length > 0 || affiliate.special_pharmacy || Number(affiliate.copay_debt) > 0 || Number(affiliate.quota_debt) > 0) && (
                        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                            {specialConds.map(sc => <span key={sc} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">⚠️ {sc}</span>)}
                            {affiliate.special_pharmacy && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">💊 Farmacia especial</span>}
                            {Number(affiliate.quota_debt) > 0 && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold border border-red-300">💸 Deuda cuota: ${affiliate.quota_debt!.toLocaleString()}</span>}
                            {Number(affiliate.copay_debt) > 0 && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">💰 Deuda coseguro: ${affiliate.copay_debt!.toLocaleString()}</span>}
                            {affiliate.frozen_quota && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">❄️ Cuota congelada</span>}
                            {affiliate.has_life_insurance && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">🛡️ Seguro de vida</span>}
                        </div>
                    )}

                    {isAffiliateBlocked && (
                        <div className="mx-4 mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            Afiliado {affiliate.status} — No se puede crear el expediente.
                        </div>
                    )}

    {affiliate.observations && <div className="px-4 pb-3 text-xs text-muted-foreground">📝 {affiliate.observations}</div>}

                    {/* Panel Cuota / Padrón — OCULTO para administrativos/auditores.
                        Reservado para vista gerencial cuando se definan roles de usuario.
                        Ver: /memories/repo/roles_y_funciones_pendientes.md
                        Para habilitar: reemplazar "null" por el JSX del panel. */}
                    {null /* panel cuota/padron */}

                    {isAffiliateActive && (
                        <div className="px-4 pb-3">
                            <FamilyMemberSelector
                                affiliate={affiliate}
                                selectedMemberId={selectedFamilyMember ? String(selectedFamilyMember.id) : null}
                                onSelectMember={onSelectFamilyMember}
                            />
                        </div>
                    )}

                    {aiPriorityResult?.hasStarPriority && (
                        <div className="mx-4 mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2">
                            <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 fill-amber-400" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">Prioridad clínica alta detectada (IA)</p>
                                <p className="text-xs text-amber-700 mt-0.5">{aiPriorityResult.reasons.join(' · ')}</p>
                            </div>
                        </div>
                    )}


                </div>
            )}
        </div>
    );
}
