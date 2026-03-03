/**
 * aiService.ts — Servicio de IA de costo cero
 *
 * Implementa análisis de texto por keywords clínicos para:
 *  1. Calcular clinical_priority_score (estrella de prioridad)
 *  2. Detectar incoherencia diagnóstico-práctica
 *  3. Detectar solicitudes duplicadas recientes
 *
 * ARQUITECTURA: Keyword-based (0 costo, 0 APIs externas).
 * Si en el futuro se conecta OpenAI/Anthropic, solo hay que
 * cambiar la función `analyzeTextWithLLM()` aquí.
 */

'use client';

// ── Tipos ────────────────────────────────────────────────────

export interface ClinicalPriorityResult {
    score: number;          // 0-100 (>50 = Estrella)
    hasStarPriority: boolean;
    reasons: string[];      // Motivos detectados
    keywords: string[];     // Keywords encontradas
}

export interface CoherenceCheckResult {
    isCoherent: boolean;
    warning: string | null;
    suggestions: string[];
}

export interface DuplicateCheckResult {
    hasDuplicate: boolean;
    duplicateExpedientNumbers: string[];
    message: string | null;
}

export interface IASuggestion {
    type: 'priority' | 'coherence' | 'duplicate';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    data?: Record<string, unknown>;
}

// ── Diccionario de keywords clínicos de urgencia ─────────────

const URGENCY_KEYWORDS: { keyword: string; score: number; reason: string }[] = [
    // Oncológico
    { keyword: 'oncológico',    score: 40, reason: 'Diagnóstico oncológico' },
    { keyword: 'oncologico',    score: 40, reason: 'Diagnóstico oncológico' },
    { keyword: 'oncología',     score: 40, reason: 'Diagnóstico oncológico' },
    { keyword: 'oncologia',     score: 40, reason: 'Diagnóstico oncológico' },
    { keyword: 'cáncer',        score: 40, reason: 'Diagnóstico de cáncer' },
    { keyword: 'cancer',        score: 40, reason: 'Diagnóstico de cáncer' },
    { keyword: 'tumor',         score: 35, reason: 'Presencia de tumor' },
    { keyword: 'neoplasia',     score: 35, reason: 'Neoplasia diagnosticada' },
    { keyword: 'metástasis',    score: 45, reason: 'Metástasis confirmada' },
    { keyword: 'metastasis',    score: 45, reason: 'Metástasis confirmada' },
    { keyword: 'quimio',        score: 40, reason: 'Tratamiento quimioterápico' },
    { keyword: 'radioterapia',  score: 38, reason: 'Tratamiento radioterápico' },
    // Urgente / Agudo
    { keyword: 'urgente',       score: 50, reason: 'Marcado como urgente' },
    { keyword: 'urgencia',      score: 45, reason: 'Estado de urgencia' },
    { keyword: 'agudo',         score: 35, reason: 'Cuadro agudo' },
    { keyword: 'aguda',         score: 35, reason: 'Cuadro agudo' },
    { keyword: 'emergencia',    score: 50, reason: 'Emergencia médica' },
    { keyword: 'inmediato',     score: 30, reason: 'Requiere atención inmediata' },
    { keyword: 'inmediata',     score: 30, reason: 'Requiere atención inmediata' },
    { keyword: 'crítico',       score: 45, reason: 'Estado crítico' },
    { keyword: 'critico',       score: 45, reason: 'Estado crítico' },
    { keyword: 'crítica',       score: 45, reason: 'Estado crítico' },
    { keyword: 'critica',       score: 45, reason: 'Estado crítico' },
    // Cirugía urgente
    { keyword: 'cirugía',       score: 20, reason: 'Intervención quirúrgica' },
    { keyword: 'cirugia',       score: 20, reason: 'Intervención quirúrgica' },
    { keyword: 'quirúrgico',    score: 20, reason: 'Procedimiento quirúrgico' },
    { keyword: 'quirurgico',    score: 20, reason: 'Procedimiento quirúrgico' },
    // Cardio / Neuro urgente
    { keyword: 'infarto',       score: 50, reason: 'Infarto agudo' },
    { keyword: 'iam',           score: 50, reason: 'IAM confirmado' },
    { keyword: 'avc',           score: 45, reason: 'AVC/ACV cerebrovascular' },
    { keyword: 'acv',           score: 45, reason: 'ACV cerebrovascular' },
    { keyword: 'stroke',        score: 45, reason: 'Stroke cerebral' },
    { keyword: 'tep',           score: 40, reason: 'Tromboembolismo pulmonar' },
    { keyword: 'trombosis',     score: 38, reason: 'Trombosis' },
    { keyword: 'sepsis',        score: 45, reason: 'Sepsis' },
    { keyword: 'séptico',       score: 45, reason: 'Cuadro séptico' },
    { keyword: 'septico',       score: 45, reason: 'Cuadro séptico' },
    // Programas especiales / Discapacidad
    { keyword: 'discapacidad',  score: 25, reason: 'Discapacidad certificada' },
    { keyword: 'hipoacusia',    score: 20, reason: 'Hipoacusia' },
    { keyword: 'diálisis',      score: 40, reason: 'Paciente en diálisis' },
    { keyword: 'dialisis',      score: 40, reason: 'Paciente en diálisis' },
    { keyword: 'transplante',   score: 40, reason: 'Post-trasplante' },
    { keyword: 'trasplante',    score: 40, reason: 'Post-trasplante' },
    { keyword: 'insuficiencia', score: 30, reason: 'Insuficiencia orgánica' },
    // Perinatal
    { keyword: 'embarazo',      score: 20, reason: 'Embarazo' },
    { keyword: 'gestación',     score: 20, reason: 'Gestación' },
    { keyword: 'gestacion',     score: 20, reason: 'Gestación' },
    { keyword: 'neonato',       score: 30, reason: 'Neonato' },
    { keyword: 'prematuro',     score: 35, reason: 'Prematuro' },
];

// ── Diccionario de coherencia práctica-diagnóstico ───────────
// Grupos de prácticas y sus diagnósticos plausibles

const COHERENCE_RULES: {
    practiceKeywords: string[];
    validDiagnosisPatterns: string[];
    warning: string;
}[] = [
    {
        practiceKeywords: ['laboratorio', 'hemograma', 'análisis', 'analisis', 'bioquímico', 'bioquimico'],
        validDiagnosisPatterns: ['chequeo', 'seguimiento', 'control', 'monitoreo', 'anemia', 'infección', 'infeccion', 'diabetes', 'hipertensión', 'hipertension', 'renal', 'hepático', 'hepatico', 'lipídico', 'lipidico'],
        warning: 'Verificar que el diagnóstico justifique los estudios de laboratorio solicitados.',
    },
    {
        practiceKeywords: ['traumatología', 'traumatologia', 'ortopedia', 'fractura', 'articulación', 'articulacion'],
        validDiagnosisPatterns: ['fractura', 'esguince', 'luxación', 'luxacion', 'artritis', 'artrosis', 'traumatismo', 'lesión', 'lesion', 'dolor'],
        warning: 'La práctica de traumatología debería corresponder a un diagnóstico músculo-esquelético.',
    },
    {
        practiceKeywords: ['cardiología', 'cardiologia', 'ecocardiograma', 'holter', 'ergometría', 'ergometria'],
        validDiagnosisPatterns: ['cardiaco', 'cardíaco', 'cardiaco', 'arritmia', 'hipertensión', 'hipertension', 'dolor torácico', 'dolor toracico', 'infarto', 'isquemia', 'insuficiencia'],
        warning: 'La práctica cardiológica no coincide con el diagnóstico registrado. Verificar.',
    },
    {
        practiceKeywords: ['neurológico', 'neurologico', 'neurología', 'neurologia', 'resonancia', 'eeg'],
        validDiagnosisPatterns: ['epilepsia', 'cefalea', 'migraña', 'migrana', 'parkison', 'alzheimer', 'esclerosis', 'stroke', 'acv', 'neuropatía', 'neuropatia', 'neurologico', 'neurológico'],
        warning: 'La práctica neurológica podría no coincidir con el diagnóstico ingresado.',
    },
    {
        practiceKeywords: ['quimioterapia', 'quimio', 'oncológico', 'oncologico', 'radioterapia'],
        validDiagnosisPatterns: ['cáncer', 'cancer', 'tumor', 'neoplasia', 'leucemia', 'linfoma', 'oncológico', 'oncologico', 'metástasis', 'metastasis'],
        warning: 'Tratamiento oncológico sin diagnóstico oncológico asociado. Verificar urgentemente.',
    },
];

// ── Función principal: analizar prioridad clínica ─────────────

export function analyzeClinicalPriority(
    text: string,
    practiceDescription?: string,
    diagnosisDescription?: string,
): ClinicalPriorityResult {
    const fullText = [text, practiceDescription, diagnosisDescription]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    let totalScore = 0;
    const reasons: string[] = [];
    const foundKeywords: string[] = [];

    const seen = new Set<string>();

    for (const entry of URGENCY_KEYWORDS) {
        if (fullText.includes(entry.keyword) && !seen.has(entry.reason)) {
            totalScore += entry.score;
            reasons.push(entry.reason);
            foundKeywords.push(entry.keyword);
            seen.add(entry.reason);
        }
    }

    // Clamp a 100
    const score = Math.min(totalScore, 100);
    const hasStarPriority = score >= 30;

    return { score, hasStarPriority, reasons, keywords: foundKeywords };
}

// ── Función: verificar coherencia práctica-diagnóstico ────────

export function checkCoherence(
    practiceDescription: string,
    diagnosisDescription: string,
    diagnosisCode?: string,
): CoherenceCheckResult {
    if (!practiceDescription || !diagnosisDescription) {
        return { isCoherent: true, warning: null, suggestions: [] };
    }

    const pracLower = practiceDescription.toLowerCase();
    const diagLower = (diagnosisDescription + ' ' + (diagnosisCode || '')).toLowerCase();

    for (const rule of COHERENCE_RULES) {
        const practicMatch = rule.practiceKeywords.some(kw => pracLower.includes(kw));
        if (!practicMatch) continue;

        const diagMatch = rule.validDiagnosisPatterns.some(pattern => diagLower.includes(pattern));
        if (!diagMatch) {
            return {
                isCoherent: false,
                warning: rule.warning,
                suggestions: rule.validDiagnosisPatterns.slice(0, 4),
            };
        }
    }

    return { isCoherent: true, warning: null, suggestions: [] };
}

// ── Función: detectar duplicados ──────────────────────────────

export function checkForDuplicates(params: {
    practiceId: number;
    affiliateId: string;
    recentExpedients: { id: string; number: string; practice_ids: number[]; created_at: string }[];
    windowDays?: number; // días a considerar como "reciente", default 30
}): DuplicateCheckResult {
    const { practiceId, affiliateId: _affiliateId, recentExpedients, windowDays = 30 } = params;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    const duplicates = recentExpedients.filter(exp => {
        const expDate = new Date(exp.created_at);
        if (expDate < cutoff) return false;
        return exp.practice_ids.includes(practiceId);
    });

    if (duplicates.length === 0) {
        return { hasDuplicate: false, duplicateExpedientNumbers: [], message: null };
    }

    const numbers = duplicates.map(d => d.number);
    return {
        hasDuplicate: true,
        duplicateExpedientNumbers: numbers,
        message: `Esta práctica ya aparece en expediente(s) reciente(s): ${numbers.join(', ')}. ¿Desea continuar?`,
    };
}

// ── Función: generar array ia_suggestions para Supabase ───────

export function buildIASuggestions(
    priorityResult: ClinicalPriorityResult,
    coherenceResult: CoherenceCheckResult,
    duplicateResult: DuplicateCheckResult,
): IASuggestion[] {
    const suggestions: IASuggestion[] = [];

    if (priorityResult.hasStarPriority) {
        suggestions.push({
            type: 'priority',
            severity: 'warning',
            message: `Prioridad clínica alta detectada (score: ${priorityResult.score}): ${priorityResult.reasons.join(', ')}`,
            data: { score: priorityResult.score, keywords: priorityResult.keywords },
        });
    }

    if (!coherenceResult.isCoherent && coherenceResult.warning) {
        suggestions.push({
            type: 'coherence',
            severity: 'warning',
            message: coherenceResult.warning,
        });
    }

    if (duplicateResult.hasDuplicate) {
        suggestions.push({
            type: 'duplicate',
            severity: 'critical',
            message: duplicateResult.message || 'Posible duplicado detectado',
            data: { expedients: duplicateResult.duplicateExpedientNumbers },
        });
    }

    return suggestions;
}
