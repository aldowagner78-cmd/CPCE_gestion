'use client';

/**
 * FamilyMemberSelector.tsx
 *
 * Muestra los integrantes del grupo familiar de un afiliado titular
 * y permite seleccionar al beneficiario real de la solicitud.
 *
 * - Si el afiliado tiene `titular_id`, se buscan sus familiares
 * - Si es titular, se buscan sus dependientes
 * - Mantiene el tipo Affiliate sin modificaciones
 */

import { useState, useEffect } from 'react';
import { User, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { Affiliate } from '@/types/database';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

interface FamilyMemberSelectorProps {
    affiliate: Affiliate;
    onSelectMember: (member: Affiliate | null) => void; // null = el titular mismo
    selectedMemberId?: string | number | null;
}

function calcAge(birthDate?: string | null): number | null {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    if (
        now.getMonth() < b.getMonth() ||
        (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
    ) age--;
    return age;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
    titular: 'Titular',
    conyuge: 'Cónyuge',
    hijo: 'Hijo/a',
    hija: 'Hijo/a',
    padre: 'Padre/Madre',
    madre: 'Padre/Madre',
    hermano: 'Hermano/a',
    hermana: 'Hermano/a',
    concubino: 'Concubino/a',
    concubina: 'Concubino/a',
};

function getRelLabel(rel?: string | null): string {
    if (!rel) return 'Familiar';
    const lower = rel.toLowerCase();
    for (const [key, label] of Object.entries(RELATIONSHIP_LABELS)) {
        if (lower.includes(key)) return label;
    }
    return rel;
}

export function FamilyMemberSelector({
    affiliate,
    onSelectMember,
    selectedMemberId,
}: FamilyMemberSelectorProps) {
    const [members, setMembers] = useState<Affiliate[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadFamilyGroup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [affiliate.id]);

    async function loadFamilyGroup() {
        setLoading(true);
        try {
            // El titular busca sus dependientes; un dependiente busca
            // al titular y sus hermanos de grupo usando certificate_number
            const certNumber = affiliate.certificate_number;
            if (certNumber) {
                // Buscar todos los del mismo grupo familiar
                const { data } = await supabase
                    .from('affiliates')
                    .select('*')
                    .eq('certificate_number', certNumber)
                    .neq('id', String(affiliate.id))
                    .order('relationship')
                    .limit(20);
                setMembers((data || []) as Affiliate[]);
            } else {
                // Fallback: buscar por titular_id
                const titularId = affiliate.titular_id ?? affiliate.id;
                const { data } = await supabase
                    .from('affiliates')
                    .select('*')
                    .or(`id.eq.${titularId},titular_id.eq.${titularId}`)
                    .neq('id', String(affiliate.id))
                    .order('relationship')
                    .limit(20);
                setMembers((data || []) as Affiliate[]);
            }
        } catch {
            setMembers([]);
        }
        setLoading(false);
    }

    // Si no hay familiares, no renderizar nada
    if (!loading && members.length === 0) return null;

    const currentSelected = selectedMemberId
        ? members.find(m => String(m.id) === String(selectedMemberId))
        : null;

    return (
        <div className="border rounded-xl overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 text-left"
            >
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        Grupo Familiar
                    </span>
                    {affiliate.certificate_number && (
                        <span className="text-xs text-blue-500 dark:text-blue-400 font-mono">
                            #{affiliate.certificate_number}
                        </span>
                    )}
                    {loading && (
                        <span className="text-xs text-muted-foreground animate-pulse">cargando...</span>
                    )}
                    {!loading && members.length > 0 && (
                        <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full font-bold">
                            {members.length}
                        </span>
                    )}
                    {currentSelected && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium ml-1">
                            · {currentSelected.full_name}
                        </span>
                    )}
                </div>
                {expanded
                    ? <ChevronUp className="h-4 w-4 text-blue-500" />
                    : <ChevronDown className="h-4 w-4 text-blue-500" />}
            </button>

            {/* Lista de miembros */}
            {expanded && (
                <div className="divide-y divide-border/50">
                    {/* Opción: el titular mismo */}
                    <button
                        type="button"
                        onClick={() => onSelectMember(null)}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-muted/40 transition-colors ${!selectedMemberId ? 'bg-primary/5' : ''
                            }`}
                    >
                        <div className="p-1.5 rounded-full bg-primary/10">
                            <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                                {affiliate.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Titular · DNI {affiliate.document_number}
                                {calcAge(affiliate.birth_date) !== null && ` · ${calcAge(affiliate.birth_date)} años`}
                            </div>
                        </div>
                        {!selectedMemberId && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                Seleccionado
                            </span>
                        )}
                    </button>

                    {/* Familiares */}
                    {members.map(member => {
                        const isSelected = String(selectedMemberId) === String(member.id);
                        const age = calcAge(member.birth_date);
                        const relLabel = getRelLabel(member.relationship);
                        const isActive = member.status === 'activo';

                        return (
                            <button
                                type="button"
                                key={String(member.id)}
                                onClick={() => isActive ? onSelectMember(member) : undefined}
                                disabled={!isActive}
                                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${!isActive
                                        ? 'opacity-40 cursor-not-allowed'
                                        : isSelected
                                            ? 'bg-primary/5 hover:bg-primary/10'
                                            : 'hover:bg-muted/40'
                                    }`}
                            >
                                <div className="p-1.5 rounded-full bg-muted">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{member.full_name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {relLabel} · DNI {member.document_number}
                                        {age !== null && ` · ${age} años`}
                                        {!isActive && ` · ${member.status}`}
                                    </div>
                                </div>
                                {isSelected && (
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                        Seleccionado
                                    </span>
                                )}
                                {!isActive && (
                                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                        Inactivo
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
