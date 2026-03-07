/**
 * Servicio de cálculo de coseguro.
 *
 * Jerarquía de prioridades (de mayor a menor):
 *  1. Código exacto de práctica    (practice_code)
 *  2. Condición especial           (special_condition del afiliado)
 *  3. Categoría + Plan             (practice_category + plan_id)
 *  4. Plan global                  (solo plan_id)
 *  5. Regla global                 (sin filtros)
 *
 * Si no hay ninguna regla activa se devuelve 0 (sin coseguro).
 */

import { createClient } from '@/lib/supabase';
import type { CoseguroRule } from '@/types/database';

export interface CoseguroContext {
    jurisdictionId: number;
    planId: number;
    practiceCode: string;
    practiceCategory?: string;
    specialConditions?: string[];   // condiciones especiales del afiliado
    referenceDate?: string;         // YYYY-MM-DD (default: hoy)
}

/**
 * Retorna el porcentaje de coseguro aplicable según contexto.
 * Hace una sola consulta a Supabase y resuelve la prioridad en el cliente.
 */
export async function getCoseguroPercent(ctx: CoseguroContext): Promise<number> {
    const supabase = createClient();
    const today = ctx.referenceDate ?? new Date().toISOString().slice(0, 10);

    // Traer todas las reglas activas y vigentes de la jurisdicción
    const { data, error } = await supabase
        .from('coseguro_rules' as never)
        .select('*')
        .eq('jurisdiction_id', ctx.jurisdictionId)
        .eq('is_active', true)
        .lte('valid_from', today)
        .or(`valid_to.is.null,valid_to.gte.${today}`)
        .returns<CoseguroRule[]>();

    if (error || !data || data.length === 0) return 0;

    // --- Nivel 1: código exacto de práctica ---
    const byCode = data.find(r => r.practice_code === ctx.practiceCode);
    if (byCode) return byCode.coseguro_percent;

    // --- Nivel 2: condición especial del afiliado ---
    if (ctx.specialConditions && ctx.specialConditions.length > 0) {
        const byCondition = data.find(
            r => r.special_condition && ctx.specialConditions!.includes(r.special_condition)
        );
        if (byCondition) return byCondition.coseguro_percent;
    }

    // --- Nivel 3: categoría + plan ---
    if (ctx.practiceCategory) {
        const byCatPlan = data.find(
            r =>
                r.practice_category === ctx.practiceCategory &&
                r.plan_id === ctx.planId &&
                !r.practice_code &&
                !r.special_condition
        );
        if (byCatPlan) return byCatPlan.coseguro_percent;
    }

    // --- Nivel 4: plan global ---
    const byPlan = data.find(
        r =>
            r.plan_id === ctx.planId &&
            !r.practice_category &&
            !r.practice_code &&
            !r.special_condition
    );
    if (byPlan) return byPlan.coseguro_percent;

    // --- Nivel 5: regla global (sin filtros) ---
    const global = data.find(
        r =>
            r.plan_id === null &&
            r.practice_category === null &&
            r.practice_code === null &&
            r.special_condition === null
    );
    if (global) return global.coseguro_percent;

    return 0;
}

/**
 * Calcula el monto de coseguro para un total dado.
 */
export function calculateCoseguroAmount(total: number, percent: number): number {
    return Math.round((total * percent) / 100 * 100) / 100;
}
