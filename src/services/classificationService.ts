/**
 * classificationService.ts
 * 
 * Servicio local (sin API) que clasifica automáticamente el tipo de expediente
 * basándose en las prácticas agregadas y el diagnóstico.
 */

import type { Practice } from '@/types/database';

type ExpedientType = 'ambulatoria' | 'bioquimica' | 'internacion' | 'odontologica' | 'programas_especiales' | 'elementos' | 'reintegros';

interface ClassificationResult {
    suggestedType: ExpedientType;
    confidence: number; // 0-100
    reason: string;
}

// Keyword sets for classification
const INTERNACION_KEYWORDS = [
    'cirugía', 'cirugia', 'quirúrgico', 'quirurgico', 'internación', 'internacion',
    'hospitalización', 'hospitalizacion', 'operación', 'operacion', 'transplante',
    'trasplante', 'bypass', 'prótesis', 'protesis', 'laparoscop', 'artroscop',
    'endoscop', 'cateterismo', 'angioplast', 'cesárea', 'cesarea', 'biopsia',
    'mastectom', 'histerectom', 'colecistectom', 'apendicectom', 'hernioplast',
];

const ONCOLOGIA_KEYWORDS = [
    'oncolog', 'quimioterap', 'radioterap', 'tumor', 'cáncer', 'cancer',
    'neoplasi', 'maligno', 'metástas', 'metastas', 'linfoma', 'leucemia',
    'mieloma', 'carcinoma', 'sarcoma', 'melanoma',
];

const CUD_KEYWORDS = [
    'discapacidad', 'CUD', 'certificado único', 'certificado unico',
    'rehabilitación', 'rehabilitacion', 'kinesiolog', 'fonaudiol',
    'psicopedagog', 'terapia ocupacional', 'estimulación temprana',
];

const ELEMENTOS_KEYWORDS = [
    'silla de ruedas', 'muleta', 'andador', 'bastón', 'baston',
    'ortesis', 'férula', 'ferula', 'corset', 'plantilla',
    'audifonos', 'audífono', 'marcapasos', 'oxígeno', 'oxigeno',
    'nebulizador', 'colchón', 'colchon', 'pañal', 'panal',
];

/**
 * Clasifica el tipo de expediente según las prácticas y diagnóstico.
 */
export function classifyExpedientType(
    practices: Practice[],
    diagnosisText: string
): ClassificationResult {
    if (practices.length === 0 && !diagnosisText) {
        return { suggestedType: 'ambulatoria', confidence: 30, reason: 'Sin datos suficientes para clasificar' };
    }

    const allText = [
        ...practices.map(p => `${p.description || ''} ${p.code || ''}`),
        diagnosisText,
    ].join(' ').toLowerCase();

    // Check nomenclator_type based classification
    const nomenclatorCounts: Record<string, number> = {};
    for (const p of practices) {
        const nType = p.nomenclator_type || '';
        nomenclatorCounts[nType] = (nomenclatorCounts[nType] || 0) + 1;
    }

    // Direct practice type mapping via code prefix or description keywords
    const hasBio = practices.some(p => {
        const code = String(p.code || '').toUpperCase();
        return code.startsWith('BIO') || code.startsWith('LAB') ||
            p.nomenclator_type === 'bioquimico' ||
            (p.description || '').toLowerCase().match(/hemograma|glucemia|orina|urocultivo|hepatograma|colesterol|triglicér|creatinina|urea|coagulograma|eritrosedimentación|cultivo|serolog/);
    });

    const hasOdonto = practices.some(p => {
        const code = String(p.code || '').toUpperCase();
        return code.startsWith('ODO') || code.startsWith('UO') ||
            p.nomenclator_type === 'odontologico' ||
            (p.description || '').toLowerCase().match(/dental|odontol|extracc.*dent|endodoncia|periodoncia|implante dental|ortodoncia|carie/);
    });

    // Keyword-based classification
    const matchCount = (keywords: string[]) =>
        keywords.filter(kw => allText.includes(kw)).length;

    const internacionScore = matchCount(INTERNACION_KEYWORDS);
    const oncologiaScore = matchCount(ONCOLOGIA_KEYWORDS);
    const cudScore = matchCount(CUD_KEYWORDS);
    const elementosScore = matchCount(ELEMENTOS_KEYWORDS);

    // Decision tree
    if (internacionScore >= 2) {
        return {
            suggestedType: 'internacion',
            confidence: Math.min(60 + internacionScore * 10, 95),
            reason: `Detectadas ${internacionScore} referencias a procedimientos quirúrgicos/internación`,
        };
    }

    if (oncologiaScore >= 2 || cudScore >= 2) {
        return {
            suggestedType: 'programas_especiales',
            confidence: Math.min(60 + Math.max(oncologiaScore, cudScore) * 10, 95),
            reason: oncologiaScore >= cudScore
                ? `Detectadas ${oncologiaScore} referencias oncológicas`
                : `Detectadas ${cudScore} referencias a discapacidad/rehabilitación`,
        };
    }

    if (elementosScore >= 1) {
        return {
            suggestedType: 'elementos',
            confidence: Math.min(50 + elementosScore * 15, 90),
            reason: `Detectadas ${elementosScore} referencias a elementos/insumos médicos`,
        };
    }

    if (hasOdonto && !hasBio) {
        return {
            suggestedType: 'odontologica',
            confidence: 85,
            reason: 'Prácticas odontológicas detectadas',
        };
    }

    if (hasBio && !hasOdonto) {
        return {
            suggestedType: 'bioquimica',
            confidence: 85,
            reason: 'Prácticas bioquímicas/laboratorio detectadas',
        };
    }

    // Default: ambulatoria
    return {
        suggestedType: 'ambulatoria',
        confidence: hasBio || hasOdonto ? 50 : 70,
        reason: hasBio || hasOdonto
            ? 'Prácticas mixtas, clasificado como ambulatoria por defecto'
            : 'Clasificado como consulta ambulatoria',
    };
}

/**
 * Genera un número de coseguro/orden automáticamente.
 * Formato: COS-YYYY-NNNNN (ej: COS-2026-00042)
 */
export function generateCoseguroNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99999) + 1;
    return `COS-${year}-${String(random).padStart(5, '0')}`;
}
