import { Affiliate, Plan, Practice } from "@/types/database";

export interface CoverageResult {
  covered: boolean;
  percentage: number;
  coveredAmount: number;
  copay: number;
  authorizationRequired: boolean;
  messages: string[];
}

/**
 * Calcula la diferencia en meses completos entre dos fechas.
 * Un mes se considera completo solo si el día del mes actual >= día de inicio.
 * Maneja correctamente edge cases (fin de mes, años bisiestos).
 */
export function getMonthsDifference(startDate: Date, endDate: Date): number {
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  if (endDate < startDate) return 0;

  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  months += endDate.getMonth() - startDate.getMonth();

  // Si el día del mes de fin es menor al día del mes de inicio,
  // no se completó el mes, restar 1.
  if (endDate.getDate() < startDate.getDate()) {
    months--;
  }

  return Math.max(0, months);
}

// Categorías que siempre requieren autorización por defecto
const DEFAULT_AUTH_CATEGORIES = ['Cirugía', 'Alta Complejidad'];

export function calculateCoverage(
  affiliate: Affiliate,
  plan: Plan,
  practice: Practice
): CoverageResult {
  const result: CoverageResult = {
    covered: false,
    percentage: 0,
    coveredAmount: 0,
    copay: 0,
    authorizationRequired: false,
    messages: [],
  };

  // 0. Validate Affiliate Status
  if (affiliate.status && affiliate.status !== 'activo') {
    const statusLabels: Record<string, string> = {
      suspendido: 'suspendido',
      baja: 'dado de baja',
    };
    result.messages.push(
      `Afiliado ${statusLabels[affiliate.status] || affiliate.status}. No se puede procesar la cobertura.`
    );
    return result;
  }

  // 1. Validate Jurisdiction Match
  if (affiliate.jurisdiction_id !== practice.jurisdiction_id) {
    result.messages.push("Jurisdicción del afiliado no coincide con la práctica.");
    return result;
  }

  // 2. Check Waiting Period (Carencia) — Cálculo robusto
  const waitingPeriodMonths = plan.rules.waiting_period_months ?? 0;
  if (waitingPeriodMonths > 0) {
    const startDate = new Date(affiliate.start_date);
    const today = new Date();
    const months = getMonthsDifference(startDate, today);

    if (months < waitingPeriodMonths) {
      result.messages.push(
        `Período de carencia no cumplido. Requiere ${waitingPeriodMonths} meses, tiene ${months}.`
      );
      return result;
    }
  }

  // 3. Calculate Coverage — Con soporte para excepciones por categoría
  const baseCoveragePercent = plan.rules.coverage_percent ?? 0;
  const categoryOverrides = plan.rules.category_overrides;
  const categoryPercent = categoryOverrides?.[practice.category];

  // Si existe un override para esta categoría, usarlo; sino, el base
  const effectivePercent = categoryPercent !== undefined ? categoryPercent : baseCoveragePercent;

  result.percentage = effectivePercent;
  result.covered = true;
  result.coveredAmount = practice.financial_value * (result.percentage / 100);
  result.copay = practice.financial_value - result.coveredAmount;

  if (categoryPercent !== undefined && categoryPercent !== baseCoveragePercent) {
    result.messages.push(
      `Cobertura especial para categoría "${practice.category}": ${categoryPercent}% (base del plan: ${baseCoveragePercent}%).`
    );
  }

  // 4. Check Authorization Rules
  // Primero verificar reglas personalizadas del plan, si no, usar las por defecto
  const authCategories = plan.rules.authorization_required_categories ?? DEFAULT_AUTH_CATEGORIES;
  if (authCategories.includes(practice.category)) {
    result.authorizationRequired = true;
    result.messages.push("Requiere autorización previa por ser práctica compleja.");
  }

  // 5. Copay warning
  if (result.copay > 0) {
    result.messages.push(`El afiliado debe abonar un copago de $${result.copay.toFixed(2)}.`);
  }

  return result;
}
