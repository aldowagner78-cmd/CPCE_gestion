'use client';

import { createClient } from '@/lib/supabase';
import type {
    Affiliate,
    Plan,
    Practice,
    AuditRuleConfig,
    RulesResult,
    ExpedientType,
} from '@/types/database';
import { getMonthsDifference } from '@/lib/coverageEngine';

const supabase = createClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ── Resultado de evaluación por práctica ──

export interface PracticeRuleResult {
    practice_id: number;
    result: RulesResult;
    messages: string[];
    coverage_percent: number;
    covered_amount: number;
    copay_amount: number;
    copay_percent: number;
    can_auto_approve: boolean;
    requires_control_desk: boolean;
}

// ── Resultado global del expediente ──

export interface ExpedientRuleResult {
    overall: RulesResult;
    requires_control_desk: boolean;
    practices: PracticeRuleResult[];
    messages: string[];
}

// ── Categorías que siempre requieren autorización manual ──
const DEFAULT_AUTH_CATEGORIES = ['Cirugía', 'Alta Complejidad'];

// ── Tipos que requieren mesa de control por defecto ──
const CONTROL_DESK_TYPES: ExpedientType[] = ['internacion'];

// ── Motor de reglas ──

export const RulesEngine = {

    /**
     * Evalúa un expediente completo antes de enviarlo.
     * Retorna resultado VERDE/AMARILLO/ROJO por cada práctica y global.
     */
    async evaluate(input: {
        type: ExpedientType;
        affiliate: Affiliate;
        plan: Plan;
        practices: Array<{
            practice_id: number;
            practice: Practice;
            quantity: number;
        }>;
        jurisdiction_id: number;
    }): Promise<ExpedientRuleResult> {

        // 1) Cargar reglas configuradas para esta jurisdicción
        const rules = await RulesEngine.fetchRules(input.jurisdiction_id);

        // 2) Validaciones globales del afiliado
        const globalMessages: string[] = [];
        let globalBlock = false;

        // ── Afiliado activo ──
        if (input.affiliate.status && input.affiliate.status !== 'activo') {
            globalMessages.push(`Afiliado ${input.affiliate.status}. No se puede procesar.`);
            globalBlock = true;
        }

        // ── Período de carencia ──
        const waitingPeriod = input.plan.rules.waiting_period_months ?? 0;
        if (waitingPeriod > 0 && !globalBlock) {
            const startDate = new Date(input.affiliate.start_date);
            const today = new Date();
            const months = getMonthsDifference(startDate, today);
            if (months < waitingPeriod) {
                globalMessages.push(
                    `Período de carencia no cumplido. Requiere ${waitingPeriod} meses, tiene ${months}.`,
                );
                globalBlock = true;
            }
        }

        // ── Mesa de control por tipo ──
        let needsControlDesk = CONTROL_DESK_TYPES.includes(input.type);

        // Verificar regla de mesa de control configurada
        const controlDeskRule = rules.find(
            (r) => r.rule_type === 'control_desk' && r.requires_control_desk,
        );
        if (controlDeskRule) {
            needsControlDesk = true;
        }

        // 3) Evaluar cada práctica
        const practiceResults: PracticeRuleResult[] = [];

        for (const item of input.practices) {
            if (globalBlock) {
                // Si hay bloqueo global, todas las prácticas son ROJO
                practiceResults.push({
                    practice_id: item.practice_id,
                    result: 'rojo',
                    messages: globalMessages,
                    coverage_percent: 0,
                    covered_amount: 0,
                    copay_amount: 0,
                    copay_percent: 0,
                    can_auto_approve: false,
                    requires_control_desk: needsControlDesk,
                });
                continue;
            }

            const pr = await RulesEngine.evaluatePractice(
                input.affiliate,
                input.plan,
                item.practice,
                item.quantity,
                rules,
            );
            pr.requires_control_desk = needsControlDesk || pr.requires_control_desk;
            practiceResults.push(pr);
        }

        // 4) Determinar resultado global
        let overall: RulesResult = 'verde';
        if (practiceResults.some((p) => p.result === 'rojo')) {
            overall = 'rojo';
        } else if (practiceResults.some((p) => p.result === 'amarillo')) {
            overall = 'amarillo';
        }

        if (globalBlock) overall = 'rojo';

        return {
            overall,
            requires_control_desk: needsControlDesk,
            practices: practiceResults,
            messages: globalMessages,
        };
    },

    /**
     * Evalúa una práctica individual contra las reglas
     */
    async evaluatePractice(
        affiliate: Affiliate,
        plan: Plan,
        practice: Practice,
        quantity: number,
        rules: AuditRuleConfig[],
    ): Promise<PracticeRuleResult> {
        const messages: string[] = [];
        let result: RulesResult = 'verde';
        let canAutoApprove = true;
        let requiresControlDesk = false;

        // ── 1. Jurisdicción ──
        if (affiliate.jurisdiction_id !== practice.jurisdiction_id) {
            messages.push('Jurisdicción del afiliado no coincide con la práctica.');
            result = 'rojo';
            canAutoApprove = false;
        }

        // ── 2. Cobertura base del plan ──
        const baseCoverage = plan.rules.coverage_percent ?? 0;
        const categoryOverrides = plan.rules.category_overrides;
        const categoryPercent = categoryOverrides?.[practice.category];
        let effectivePercent = categoryPercent !== undefined ? categoryPercent : baseCoverage;

        // ── 3. Verificar regla de coseguro override ──
        const copayRule = findMatchingRule(rules, 'copay_override', practice);
        if (copayRule?.copay_percent !== undefined && copayRule.copay_percent !== null) {
            // El coseguro override define el % que paga el afiliado
            effectivePercent = 100 - copayRule.copay_percent;
            messages.push(`Coseguro especial: ${copayRule.copay_percent}% (regla ${copayRule.description || copayRule.id})`);
        }

        const practiceTotal = (practice.financial_value || 0) * quantity;
        const coveredAmount = practiceTotal * (effectivePercent / 100);
        const copayAmount = practiceTotal - coveredAmount;
        const copayPercent = 100 - effectivePercent;

        // ── 4. Autorización requerida por categoría/práctica ──
        const authCategories = plan.rules.authorization_required_categories ?? DEFAULT_AUTH_CATEGORIES;
        if (authCategories.includes(practice.category)) {
            messages.push(`Requiere autorización: categoría "${practice.category}"`);
            result = escalate(result, 'rojo');
            canAutoApprove = false;
        }

        // ── 5. Autorización requerida por regla configurada ──
        const authRule = findMatchingRule(rules, 'requires_authorization', practice);
        if (authRule) {
            messages.push(`Requiere autorización manual (regla configurada)`);
            result = escalate(result, 'rojo');
            canAutoApprove = false;
        }

        // ── 6. Límite de monto para auto-aprobación ──
        const autoRule = findMatchingRule(rules, 'auto_approve', practice);
        if (autoRule) {
            if (autoRule.auto_approve && autoRule.max_amount_auto) {
                if (practiceTotal > autoRule.max_amount_auto) {
                    messages.push(
                        `Monto ($${practiceTotal.toFixed(2)}) supera el tope de auto-aprobación ($${autoRule.max_amount_auto.toFixed(2)})`,
                    );
                    result = escalate(result, 'amarillo');
                    canAutoApprove = false;
                }
            } else if (!autoRule.auto_approve) {
                canAutoApprove = false;
            }
        } else {
            // Sin regla de auto-approve → no se auto-aprueba
            canAutoApprove = false;
        }

        // ── 7. Frecuencia mínima (días entre prácticas iguales) ──
        const freqRule = findMatchingRule(rules, 'frequency_limit', practice);
        const minDays = freqRule?.min_days_between ?? practice.min_days_between;
        if (minDays && minDays > 0) {
            const lastUsage = await RulesEngine.getLastPracticeDate(
                affiliate.id as string,
                practice.id,
            );
            if (lastUsage) {
                const daysSinceLast = Math.floor(
                    (Date.now() - new Date(lastUsage).getTime()) / (1000 * 60 * 60 * 24),
                );
                if (daysSinceLast < minDays) {
                    messages.push(
                        `Frecuencia: última autorización hace ${daysSinceLast} días (mínimo ${minDays} días)`,
                    );
                    result = escalate(result, 'amarillo');
                    canAutoApprove = false;
                }
            }
        }

        // ── 8. Tope mensual ──
        const monthlyLimit = freqRule?.max_per_month;
        if (monthlyLimit && monthlyLimit > 0) {
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const usage = await RulesEngine.getPracticeUsageCount(
                affiliate.id as string,
                practice.id,
                monthStart.toISOString(),
            );
            if (usage + quantity > monthlyLimit) {
                messages.push(
                    `Tope mensual: ${usage} usos + ${quantity} solicitados > límite de ${monthlyLimit}`,
                );
                result = escalate(result, 'amarillo');
                canAutoApprove = false;
            }
        }

        // ── 9. Tope anual ──
        const yearlyLimit = freqRule?.max_per_year ?? getYearlyLimitFromPlan(plan, practice);
        if (yearlyLimit && yearlyLimit > 0) {
            const yearStart = new Date();
            yearStart.setMonth(0, 1);
            yearStart.setHours(0, 0, 0, 0);
            const usage = await RulesEngine.getPracticeUsageCount(
                affiliate.id as string,
                practice.id,
                yearStart.toISOString(),
            );
            if (usage + quantity > yearlyLimit) {
                messages.push(
                    `Tope anual: ${usage} usos + ${quantity} solicitados > límite de ${yearlyLimit}`,
                );
                result = escalate(result, 'rojo');
                canAutoApprove = false;
            }
        }

        // ── 10. Mesa de control por regla ──
        const deskRule = findMatchingRule(rules, 'control_desk', practice);
        if (deskRule?.requires_control_desk) {
            requiresControlDesk = true;
        }

        // ── 11. Copago alto → warning ──
        if (copayAmount > 0) {
            messages.push(`Coseguro del afiliado: $${copayAmount.toFixed(2)} (${copayPercent.toFixed(1)}%)`);
        }

        return {
            practice_id: practice.id,
            result,
            messages,
            coverage_percent: effectivePercent,
            covered_amount: coveredAmount,
            copay_amount: copayAmount,
            copay_percent: copayPercent,
            can_auto_approve: canAutoApprove,
            requires_control_desk: requiresControlDesk,
        };
    },

    // ────────────────────────────────────────────────────
    // CONSULTAS AUXILIARES
    // ────────────────────────────────────────────────────

    /** Cargar reglas activas de una jurisdicción */
    async fetchRules(jurisdictionId: number): Promise<AuditRuleConfig[]> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await db('audit_rules_config')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .eq('is_active', true)
            .or(`valid_to.is.null,valid_to.gte.${today}`);

        if (error) throw new Error(`Error cargando reglas: ${error.message}`);
        return (data || []) as AuditRuleConfig[];
    },

    /** Última fecha de autorización de una práctica para un afiliado */
    async getLastPracticeDate(
        affiliateId: string,
        practiceId: number,
    ): Promise<string | null> {
        // Buscar en expedient_practices (autorizadas)
        const { data } = await db('expedient_practices')
            .select('resolved_at, expedient_id')
            .eq('practice_id', practiceId)
            .in('status', ['autorizada', 'autorizada_parcial'])
            .order('resolved_at', { ascending: false })
            .limit(10);

        if (!data || data.length === 0) {
            // Fallback: buscar en audit_requests (sistema viejo)
            const { data: legacyData } = await db('audit_requests')
                .select('resolved_at')
                .eq('affiliate_id', affiliateId)
                .eq('practice_id', practiceId)
                .eq('status', 'autorizada')
                .order('resolved_at', { ascending: false })
                .limit(1);

            if (legacyData && legacyData.length > 0) {
                return (legacyData[0] as Record<string, string>).resolved_at;
            }
            return null;
        }

        // Filtrar por afiliado (necesita join por expedient_id)
        for (const record of data as Array<Record<string, string>>) {
            const { data: exp } = await db('expedients')
                .select('affiliate_id')
                .eq('id', record.expedient_id)
                .single();

            if (exp && (exp as Record<string, string>).affiliate_id === affiliateId) {
                return record.resolved_at;
            }
        }

        return null;
    },

    /** Contar uso total de una práctica para un afiliado desde una fecha */
    async getPracticeUsageCount(
        affiliateId: string,
        practiceId: number,
        sinceDate: string,
    ): Promise<number> {
        // Buscar expedientes del afiliado desde la fecha
        const { data: expedients } = await db('expedients')
            .select('id')
            .eq('affiliate_id', affiliateId)
            .gte('created_at', sinceDate);

        if (!expedients || expedients.length === 0) return 0;

        const expIds = (expedients as Array<{ id: string }>).map((e) => e.id);

        // Sumar cantidades autorizadas
        const { data: practices } = await db('expedient_practices')
            .select('quantity')
            .in('expedient_id', expIds)
            .eq('practice_id', practiceId)
            .in('status', ['autorizada', 'autorizada_parcial', 'pendiente', 'en_revision']);

        if (!practices) return 0;

        return (practices as Array<{ quantity: number }>).reduce(
            (sum, p) => sum + (p.quantity || 0),
            0,
        );
    },
};

// ── Funciones auxiliares internas ──

/**
 * Busca la regla más específica que coincida con una práctica.
 * Prioridad: práctica específica > tipo de práctica > genérica (null)
 */
function findMatchingRule(
    rules: AuditRuleConfig[],
    ruleType: AuditRuleConfig['rule_type'],
    practice: Practice,
): AuditRuleConfig | undefined {
    const typeRules = rules.filter((r) => r.rule_type === ruleType);
    if (typeRules.length === 0) return undefined;

    // 1) Regla para esta práctica específica
    const specific = typeRules.find((r) => r.practice_id === practice.id);
    if (specific) return specific;

    // 2) Regla para el tipo de práctica (nomenclator_type → practice_type_id)
    // Nota: practice no tiene practice_type_id directamente, se busca por lo que haya
    const byType = typeRules.find((r) => r.practice_type_id !== null && r.practice_id === null);
    if (byType) return byType;

    // 3) Regla genérica (practice_type_id = null, practice_id = null)
    const generic = typeRules.find((r) => r.practice_type_id === null && r.practice_id === null);
    return generic;
}

/**
 * Escalar resultado: solo se puede subir de verde → amarillo → rojo
 */
function escalate(current: RulesResult, target: RulesResult): RulesResult {
    const levels: Record<RulesResult, number> = { verde: 0, amarillo: 1, rojo: 2 };
    return levels[target] > levels[current] ? target : current;
}

/**
 * Obtener tope anual del plan para una práctica (si existe en max_sessions_per_year)
 */
function getYearlyLimitFromPlan(plan: Plan, practice: Practice): number | undefined {
    if (!plan.rules.max_sessions_per_year) return undefined;
    // Buscar por categoría de práctica
    return plan.rules.max_sessions_per_year[practice.category];
}
