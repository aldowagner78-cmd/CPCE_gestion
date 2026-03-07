/**
 * Utilidades de formateo de texto
 */

/**
 * Convierte un string a Sentence case (primera letra mayúscula, resto minúscula).
 * Útil para nombres de prácticas que vienen en MAYÚSCULAS desde el nomenclador.
 */
export function toSentenceCase(str: string): string {
    if (!str) return '';
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Convierte un string a Title Case (primera letra de cada palabra en mayúscula).
 * Respeta artículos/preposiciones comunes en español.
 */
const LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'o', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre']);

export function toTitleCase(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index === 0 || !LOWERCASE_WORDS.has(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        })
        .join(' ');
}

/**
 * Trunca un string a maxLength caracteres, añadiendo "…" si se trunca.
 */
export function truncate(str: string, maxLength: number): string {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 1) + '…';
}

/**
 * Formatea un número como moneda argentina (ARS).
 */
export function formatARS(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
