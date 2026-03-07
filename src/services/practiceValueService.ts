/**
 * Servicio de cálculo de valor de prácticas.
 * Soporta tres métodos: fixed, nbu, custom.
 */

import type { Practice } from '@/types/database';

export type PracticeCalculationMethod = 'fixed' | 'nbu' | 'custom';

export interface NBUPeriod {
    period: string;   // YYYY-MM
    value: number;    // valor de la unidad NBU en pesos
}

/**
 * Calcula el valor unitario de una práctica según su método de cálculo.
 *
 * @param practice   - Práctica con campos calculation_method y financial_value/nbu_value
 * @param nbuPeriod  - Valor actual del NBU (requerido si method = 'nbu')
 */
export function calculatePracticeUnitValue(
    practice: Practice,
    nbuPeriod?: NBUPeriod
): number {
    const method = (practice.calculation_method ?? 'fixed') as PracticeCalculationMethod;

    switch (method) {
        case 'fixed':
            return practice.financial_value ?? 0;

        case 'nbu': {
            const units = practice.nbu_value ?? 0;
            const nbuVal = nbuPeriod?.value ?? 0;
            return units * nbuVal;
        }

        case 'custom': {
            // calculation_config puede traer { formula: "base * 1.2" } u otros campos
            // Por ahora devuelve financial_value como fallback seguro.
            return practice.financial_value ?? 0;
        }

        default:
            return practice.financial_value ?? 0;
    }
}

/**
 * Calcula el subtotal para una práctica con una cantidad dada.
 */
export function calculatePracticeTotal(
    practice: Practice,
    quantity: number,
    nbuPeriod?: NBUPeriod
): number {
    const unitValue = calculatePracticeUnitValue(practice, nbuPeriod);
    return unitValue * (quantity || 1);
}
