import {
    Stethoscope,
    FlaskConical,
    Building2,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    AlertTriangle,
    FileText,
    Ban,
    Shield,
    Sparkles,
    Pill,
    DollarSign,
    Pause,
    RotateCcw,
} from 'lucide-react';
import type {
    ExpedientType,
    ExpedientStatus,
    RulesResult,
    PracticeClassification,
} from '@/types/database';
import type { PracticeResolutionStatus } from '@/services/expedientService';

export const TYPE_CONFIG: Record<ExpedientType, { label: string; icon: React.ElementType; color: string }> = {
    ambulatoria: { label: 'Ambulatoria', icon: Stethoscope, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    bioquimica: { label: 'Bioquímica', icon: FlaskConical, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    internacion: { label: 'Internación', icon: Building2, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    odontologica: { label: 'Odontológica', icon: Sparkles, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
    programas_especiales: { label: 'Prog. Especial', icon: Shield, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    elementos: { label: 'Elementos', icon: Pill, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
    reintegros: { label: 'Reintegro', icon: DollarSign, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
};

export const STATUS_CONFIG: Record<ExpedientStatus, { label: string; color: string; icon: React.ElementType }> = {
    borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icon: FileText },
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: Clock },
    en_revision: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', icon: Eye },
    parcialmente_resuelto: { label: 'Parcial', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300', icon: AlertTriangle },
    resuelto: { label: 'Resuelto', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle },
    observada: { label: 'Observada', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: AlertTriangle },
    en_apelacion: { label: 'En Apelación', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: RotateCcw },
    anulada: { label: 'Anulada', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Ban },
};

export const PRACTICE_STATUS_CONFIG: Record<PracticeResolutionStatus, { label: string; color: string; icon: React.ElementType }> = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    en_revision: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800', icon: Eye },
    autorizada: { label: 'Autorizada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    denegada: { label: 'Denegada', color: 'bg-red-100 text-red-700', icon: XCircle },
    observada: { label: 'Observada', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    autorizada_parcial: { label: 'Parcial', color: 'bg-indigo-100 text-indigo-800', icon: AlertTriangle },
    diferida: { label: 'Diferida', color: 'bg-slate-100 text-slate-700', icon: Pause },
};

export const RULE_COLORS: Record<RulesResult, string> = {
    verde: 'text-green-600 bg-green-100',
    amarillo: 'text-yellow-700 bg-yellow-100',
    rojo: 'text-red-600 bg-red-100',
};

/** Semáforo extendido: 7 clasificaciones de práctica */
export const CLASSIFICATION_CONFIG: Record<PracticeClassification, { label: string; short: string; color: string; bg: string; emoji: string }> = {
    auto_aprobable:        { label: 'Auto-aprobable',        short: 'Aprobable',  color: 'text-green-700',  bg: 'bg-green-100 dark:bg-green-900/30',    emoji: '🟢' },
    requiere_revision:     { label: 'Requiere revisión',     short: 'Revisión',   color: 'text-yellow-700', bg: 'bg-yellow-100 dark:bg-yellow-900/30',   emoji: '🟡' },
    sin_cobertura:         { label: 'Sin cobertura',          short: 'Sin cob.',   color: 'text-red-700',    bg: 'bg-red-100 dark:bg-red-900/30',        emoji: '🔴' },
    limite_excedido:       { label: 'Límite excedido',        short: 'Límite',    color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30',   emoji: '🟠' },
    requiere_mesa_control: { label: 'Mesa de control',         short: 'Mesa ctrl.', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/30',   emoji: '🟣' },
    duplicada_reciente:    { label: 'Posible duplicado',       short: 'Duplicado',  color: 'text-gray-700',   bg: 'bg-gray-100 dark:bg-gray-800',         emoji: '⚫' },
    carencia:              { label: 'Período de carencia',     short: 'Carencia',   color: 'text-blue-700',   bg: 'bg-blue-100 dark:bg-blue-900/30',      emoji: '🔵' },
};

export function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatShortDate(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatAction(action: string): string {
    const map: Record<string, string> = {
        created: '📥 Solicitud creada',
        taken_for_review: '👁️ Tomada para revisión',
        practice_authorized: '✅ Práctica autorizada',
        practice_authorized_partial: '🔄 Práctica autorizada parcialmente',
        practice_denied: '❌ Práctica denegada',
        practice_observed: '⏸️ Práctica observada',
        practice_deferred: '⏰ Práctica diferida',
        auto_approved: '🤖 Auto-aprobación por motor de reglas',
        observed: '👁️ Solicitud observada',
        resubmitted: '🔁 Reenviada tras observación',
        appealed: '📣 Apelación presentada',
        cancelled: '🚫 Solicitud anulada',
        reassigned: '🔄 Reasignada',
        attachment_added: '📎 Adjunto agregado',
        control_desk_approved: '✅ Mesa de control: aprobada',
        control_desk_rejected: '❌ Mesa de control: rechazada',
    };
    return map[action] || action.replace(/_/g, ' ');
}
