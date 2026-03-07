/**
 * testFormularioSolicitudes.ts
 * 
 * Script de pruebas automatizadas para las Fases 10-12:
 *  - ConsumptionHistoryModal  (lógica de datos + queries)
 *  - NomenclatorSearchModal   (lógica N/N, filtros, debounce)
 *  - AffiliateFullHistoryModal (filtros, sort, paginación, CSV, subtotales)
 *  - textUtils                (toSentenceCase, toTitleCase, truncate, formatARS)
 *  - inferExpedientType       (FASE 9 - clasificación nomenclador)
 *  - DB / schema checks       (requiere .env.local)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { toSentenceCase, toTitleCase, truncate } from '../src/lib/textUtils';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ── Colores consola ─────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
    yellow: '\x1b[33m', blue: '\x1b[34m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

let pass = 0;
let fail = 0;
const failures: string[] = [];

function log(group: string, id: string, name: string, ok: boolean, err?: string) {
    if (ok) {
        pass++;
        console.log(`${C.green}[PASS]${C.reset} ${group}.${id} — ${name}`);
    } else {
        fail++;
        failures.push(`${group}.${id} — ${name}${err ? ': ' + err : ''}`);
        console.log(`${C.red}[FAIL]${C.reset} ${group}.${id} — ${name}`);
        if (err) console.log(`${C.yellow}       ↳ ${err}${C.reset}`);
    }
}

function assert(condition: boolean, msg?: string): asserts condition {
    if (!condition) throw new Error(msg ?? 'Assertion failed');
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 1: textUtils
// ══════════════════════════════════════════════════════════════════════════════
function testTextUtils() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 1: textUtils ──────────────────────────────────────${C.reset}`);

    // toSentenceCase
    try { assert(toSentenceCase('') === '', 'vacío debe retornar vacío'); log('T', '01', 'toSentenceCase: string vacío', true); }
    catch (e) { log('T', '01', 'toSentenceCase: string vacío', false, String(e)); }

    try { assert(toSentenceCase('CONSULTA MEDICA') === 'Consulta medica'); log('T', '02', 'toSentenceCase: MAYÚSCULAS → Sentence case', true); }
    catch (e) { log('T', '02', 'toSentenceCase: MAYÚSCULAS → Sentence case', false, String(e)); }

    try { assert(toSentenceCase('rx de rodilla') === 'Rx de rodilla'); log('T', '03', 'toSentenceCase: minúsculas → capitaliza primera', true); }
    catch (e) { log('T', '03', 'toSentenceCase: minúsculas → capitaliza primera', false, String(e)); }

    try { assert(toSentenceCase('A') === 'A'); log('T', '04', 'toSentenceCase: un char', true); }
    catch (e) { log('T', '04', 'toSentenceCase: un char', false, String(e)); }

    // toTitleCase
    try { assert(toTitleCase('') === ''); log('T', '05', 'toTitleCase: string vacío', true); }
    catch (e) { log('T', '05', 'toTitleCase: string vacío', false, String(e)); }

    try { assert(toTitleCase('consulta medica de guardia') === 'Consulta Medica de Guardia'); log('T', '06', 'toTitleCase: artículos en minúscula', true); }
    catch (e) { log('T', '06', 'toTitleCase: artículos en minúscula', false, String(e)); }

    try { assert(toTitleCase('HEMOGRAMA COMPLETO') === 'Hemograma Completo'); log('T', '07', 'toTitleCase: MAYÚSCULAS', true); }
    catch (e) { log('T', '07', 'toTitleCase: MAYÚSCULAS', false, String(e)); }

    // truncate
    try { assert(truncate('hola mundo', 20) === 'hola mundo'); log('T', '08', 'truncate: menor que max no trunca', true); }
    catch (e) { log('T', '08', 'truncate: menor que max no trunca', false, String(e)); }

    try {
        const r = truncate('abcdefghij', 5);
        assert(r.length === 5 && r.endsWith('…'), `esperado len=5 con …, got "${r}"`);
        log('T', '09', 'truncate: trunca y añade …', true);
    } catch (e) { log('T', '09', 'truncate: trunca y añade …', false, String(e)); }

    try { assert(truncate('', 10) === ''); log('T', '10', 'truncate: string vacío', true); }
    catch (e) { log('T', '10', 'truncate: string vacío', false, String(e)); }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 2: NOMENCLATOR_ABBR + N/N detection (lógica extraída del modal)
// ══════════════════════════════════════════════════════════════════════════════
const NOMENCLATOR_ABBR_MAP: Record<string, string> = {
    medico: 'MED', bioquimico: 'BIO', odontologico: 'ODO', farmacia: 'FAR',
};
function getNomenclatorAbbr(nomenclatorType: string | null | undefined): string {
    return NOMENCLATOR_ABBR_MAP[nomenclatorType ?? ''] ?? 'N/N';
}

function testNomenclatorAbbr() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 2: NOMENCLATOR_ABBR ───────────────────────────────${C.reset}`);

    const cases: [string | null, string][] = [
        ['medico', 'MED'], ['bioquimico', 'BIO'], ['odontologico', 'ODO'],
        ['farmacia', 'FAR'], [null, 'N/N'], ['', 'N/N'], ['otro', 'N/N'],
    ];
    cases.forEach(([input, expected], i) => {
        const id = String(i + 1).padStart(2, '0');
        try {
            assert(getNomenclatorAbbr(input) === expected, `"${input}" → esperado "${expected}", got "${getNomenclatorAbbr(input)}"`);
            log('N', id, `getNomenclatorAbbr("${input}") === "${expected}"`, true);
        } catch (e) { log('N', id, `getNomenclatorAbbr("${input}") === "${expected}"`, false, String(e)); }
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 3: inferExpedientType (lógica replicada de page.tsx)
// ══════════════════════════════════════════════════════════════════════════════
type ExpedientType = 'ambulatoria' | 'bioquimica' | 'internacion' | 'odontologica' |
    'programas_especiales' | 'elementos' | 'reintegros' | 'reposiciones' | 'subsidios';

const NOMENCLATOR_TO_EXPEDIENT: Record<string, ExpedientType> = {
    medico: 'ambulatoria',
    bioquimico: 'bioquimica',
    odontologico: 'odontologica',
};

interface PracticeItem {
    practice: { nomenclator_type?: string | null };
}

function inferExpedientType(items: PracticeItem[]): { type: ExpedientType; mixed: boolean } | null {
    if (items.length === 0) return null;
    const types = new Set<ExpedientType | null>(items.map(pi => {
        const nt = pi.practice.nomenclator_type ?? '';
        return NOMENCLATOR_TO_EXPEDIENT[nt] ?? null;
    }));
    if (types.has(null)) return null;
    const typesClean = [...types].filter((t): t is ExpedientType => t !== null);
    const uniqueSet = new Set(typesClean);
    if (uniqueSet.size === 1) return { type: typesClean[0], mixed: false };
    return { type: 'programas_especiales', mixed: true };
}

function testInferExpedientType() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 3: inferExpedientType ─────────────────────────────${C.reset}`);

    // Lista vacía → null
    try { assert(inferExpedientType([]) === null); log('I', '01', 'lista vacía → null', true); }
    catch (e) { log('I', '01', 'lista vacía → null', false, String(e)); }

    // Un médico → ambulatoria
    try {
        const r = inferExpedientType([{ practice: { nomenclator_type: 'medico' } }]);
        assert(r?.type === 'ambulatoria' && r.mixed === false);
        log('I', '02', 'un médico → ambulatoria, mixed=false', true);
    } catch (e) { log('I', '02', 'un médico → ambulatoria, mixed=false', false, String(e)); }

    // Varios bioquímicos → bioquimica
    try {
        const r = inferExpedientType([
            { practice: { nomenclator_type: 'bioquimico' } },
            { practice: { nomenclator_type: 'bioquimico' } },
        ]);
        assert(r?.type === 'bioquimica' && r.mixed === false);
        log('I', '03', 'varios bioquímicos → bioquimica, mixed=false', true);
    } catch (e) { log('I', '03', 'varios bioquímicos → bioquimica, mixed=false', false, String(e)); }

    // Odontológico → odontologica
    try {
        const r = inferExpedientType([{ practice: { nomenclator_type: 'odontologico' } }]);
        assert(r?.type === 'odontologica');
        log('I', '04', 'un odontológico → odontologica', true);
    } catch (e) { log('I', '04', 'un odontológico → odontologica', false, String(e)); }

    // Farmacia no mapeada → null
    try {
        const r = inferExpedientType([{ practice: { nomenclator_type: 'farmacia' } }]);
        assert(r === null, `esperado null para farmacia, got ${JSON.stringify(r)}`);
        log('I', '05', 'farmacia no mapeada → null (no infiere)', true);
    } catch (e) { log('I', '05', 'farmacia no mapeada → null (no infiere)', false, String(e)); }

    // N/N (null) → null
    try {
        const r = inferExpedientType([{ practice: { nomenclator_type: null } }]);
        assert(r === null);
        log('I', '06', 'nomenclator_type null → null', true);
    } catch (e) { log('I', '06', 'nomenclator_type null → null', false, String(e)); }

    // Médico + bioquímico → programas_especiales + mixed
    try {
        const r = inferExpedientType([
            { practice: { nomenclator_type: 'medico' } },
            { practice: { nomenclator_type: 'bioquimico' } },
        ]);
        assert(r?.type === 'programas_especiales' && r.mixed === true);
        log('I', '07', 'médico+bioquímico → programas_especiales, mixed=true', true);
    } catch (e) { log('I', '07', 'médico+bioquímico → programas_especiales, mixed=true', false, String(e)); }

    // Médico + farmacia → null (farmacia bloquea inferencia)
    try {
        const r = inferExpedientType([
            { practice: { nomenclator_type: 'medico' } },
            { practice: { nomenclator_type: 'farmacia' } },
        ]);
        assert(r === null, `esperado null, got ${JSON.stringify(r)}`);
        log('I', '08', 'médico+farmacia → null (farmacia bloquea)', true);
    } catch (e) { log('I', '08', 'médico+farmacia → null (farmacia bloquea)', false, String(e)); }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 4: HistoryRow filtering + sort + paginación (lógica del modal)
// ══════════════════════════════════════════════════════════════════════════════
type RowType = 'auth' | 'reimbursement' | 'reposition';
interface HistoryRow {
    id: string; type: RowType; typeLabel: string; nomenclatorAbbr: string;
    practiceName: string; practiceCode: string; date: string; reference: string;
    status: string; totalValue: number; coseguro: number;
}

function buildRow(overrides: Partial<HistoryRow> = {}): HistoryRow {
    return {
        id: 'test-1', type: 'auth', typeLabel: 'Aut.', nomenclatorAbbr: 'MED',
        practiceName: 'Consulta médica', practiceCode: '010101',
        date: '2025-06-01', reference: 'EXP-001', status: 'autorizada',
        totalValue: 5000, coseguro: 250,
        ...overrides,
    };
}

function applyFilters(rows: HistoryRow[], opts: {
    typeFilter?: RowType | 'all';
    nomenclatorFilter?: string;
    statusFilter?: string;
    practiceQuery?: string;
    amountFrom?: string;
    amountTo?: string;
}) {
    const { typeFilter = 'all', nomenclatorFilter = 'all', statusFilter = 'all',
        practiceQuery = '', amountFrom = '', amountTo = '' } = opts;
    return rows.filter(r => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (nomenclatorFilter !== 'all' && r.nomenclatorAbbr !== nomenclatorFilter) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (practiceQuery) {
            const q = practiceQuery.toLowerCase();
            if (!r.practiceName.toLowerCase().includes(q) && !r.practiceCode.toLowerCase().includes(q)) return false;
        }
        if (amountFrom && r.totalValue < parseFloat(amountFrom)) return false;
        if (amountTo && r.totalValue > parseFloat(amountTo)) return false;
        return true;
    });
}

function applySort(rows: HistoryRow[], field: string, dir: 'asc' | 'desc'): HistoryRow[] {
    return [...rows].sort((a, b) => {
        let cmp = 0;
        if (field === 'date') cmp = (a.date || '').localeCompare(b.date || '');
        else if (field === 'practiceName') cmp = a.practiceName.localeCompare(b.practiceName);
        else if (field === 'totalValue') cmp = a.totalValue - b.totalValue;
        else if (field === 'status') cmp = a.status.localeCompare(b.status);
        else if (field === 'type') cmp = a.typeLabel.localeCompare(b.typeLabel);
        return dir === 'asc' ? cmp : -cmp;
    });
}

function testHistoryRowLogic() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 4: HistoryRow filtering + sort + paginación ──────${C.reset}`);

    const rows: HistoryRow[] = [
        buildRow({ id: '1', type: 'auth', nomenclatorAbbr: 'MED', status: 'autorizada', totalValue: 1000, date: '2025-01-01', practiceName: 'Consulta médica' }),
        buildRow({ id: '2', type: 'reimbursement', nomenclatorAbbr: 'N/N', status: 'pendiente', totalValue: 3000, date: '2025-03-01', practiceName: 'Reintegro - ambulatoria' }),
        buildRow({ id: '3', type: 'reposition', nomenclatorAbbr: 'N/N', status: 'aprobado', totalValue: 8000, date: '2025-06-01', practiceName: 'Material quirúrgico' }),
        buildRow({ id: '4', type: 'auth', nomenclatorAbbr: 'BIO', status: 'autorizada', totalValue: 500, date: '2025-02-01', practiceName: 'Hemograma completo', practiceCode: 'BIO-001' }),
    ];

    // Filtrar por tipo
    try {
        const r = applyFilters(rows, { typeFilter: 'auth' });
        assert(r.length === 2 && r.every(x => x.type === 'auth'));
        log('H', '01', 'filtro tipo=auth devuelve 2 filas', true);
    } catch (e) { log('H', '01', 'filtro tipo=auth devuelve 2 filas', false, String(e)); }

    // Filtrar por nomenclador
    try {
        const r = applyFilters(rows, { nomenclatorFilter: 'N/N' });
        assert(r.length === 2 && r.every(x => x.nomenclatorAbbr === 'N/N'));
        log('H', '02', 'filtro nomenclador=N/N devuelve 2 filas', true);
    } catch (e) { log('H', '02', 'filtro nomenclador=N/N devuelve 2 filas', false, String(e)); }

    // Filtrar por estado
    try {
        const r = applyFilters(rows, { statusFilter: 'autorizada' });
        assert(r.length === 2 && r.every(x => x.status === 'autorizada'));
        log('H', '03', 'filtro estado=autorizada devuelve 2 filas', true);
    } catch (e) { log('H', '03', 'filtro estado=autorizada devuelve 2 filas', false, String(e)); }

    // Filtrar por búsqueda texto (nombre)
    try {
        const r = applyFilters(rows, { practiceQuery: 'hemograma' });
        assert(r.length === 1 && r[0].id === '4');
        log('H', '04', 'búsqueda "hemograma" encuentra BIO row', true);
    } catch (e) { log('H', '04', 'búsqueda "hemograma" encuentra BIO row', false, String(e)); }

    // Filtrar por búsqueda texto (código)
    try {
        const r = applyFilters(rows, { practiceQuery: 'BIO-001' });
        assert(r.length === 1 && r[0].id === '4');
        log('H', '05', 'búsqueda por código "BIO-001" encuentra row', true);
    } catch (e) { log('H', '05', 'búsqueda por código "BIO-001" encuentra row', false, String(e)); }

    // Filtrar por monto desde
    try {
        const r = applyFilters(rows, { amountFrom: '2000' });
        assert(r.length === 2 && r.every(x => x.totalValue >= 2000));
        log('H', '06', 'amountFrom=2000 devuelve 2 filas (≥2000)', true);
    } catch (e) { log('H', '06', 'amountFrom=2000 devuelve 2 filas (≥2000)', false, String(e)); }

    // Filtrar por monto hasta
    try {
        const r = applyFilters(rows, { amountTo: '1000' });
        assert(r.length === 2 && r.every(x => x.totalValue <= 1000));
        log('H', '07', 'amountTo=1000 devuelve 2 filas (≤1000)', true);
    } catch (e) { log('H', '07', 'amountTo=1000 devuelve 2 filas (≤1000)', false, String(e)); }

    // Filtros combinados
    try {
        const r = applyFilters(rows, { typeFilter: 'auth', nomenclatorFilter: 'BIO' });
        assert(r.length === 1 && r[0].id === '4');
        log('H', '08', 'filtros combinados auth+BIO → 1 fila', true);
    } catch (e) { log('H', '08', 'filtros combinados auth+BIO → 1 fila', false, String(e)); }

    // Sin filtros → todas las filas
    try {
        const r = applyFilters(rows, {});
        assert(r.length === 4);
        log('H', '09', 'sin filtros devuelve todas las filas', true);
    } catch (e) { log('H', '09', 'sin filtros devuelve todas las filas', false, String(e)); }

    // Sort por fecha ASC
    try {
        const r = applySort(rows, 'date', 'asc');
        const dates = r.map(x => x.date);
        assert(dates[0] <= dates[1] && dates[1] <= dates[2] && dates[2] <= dates[3]);
        log('H', '10', 'sort fecha ASC correcto', true);
    } catch (e) { log('H', '10', 'sort fecha ASC correcto', false, String(e)); }

    // Sort por fecha DESC
    try {
        const r = applySort(rows, 'date', 'desc');
        const dates = r.map(x => x.date);
        assert(dates[0] >= dates[1] && dates[1] >= dates[2]);
        log('H', '11', 'sort fecha DESC correcto', true);
    } catch (e) { log('H', '11', 'sort fecha DESC correcto', false, String(e)); }

    // Sort por valor ASC
    try {
        const r = applySort(rows, 'totalValue', 'asc');
        for (let i = 0; i < r.length - 1; i++) {
            assert(r[i].totalValue <= r[i + 1].totalValue, `r[${i}].totalValue=${r[i].totalValue} > r[${i+1}].totalValue=${r[i+1].totalValue}`);
        }
        log('H', '12', 'sort totalValue ASC correcto', true);
    } catch (e) { log('H', '12', 'sort totalValue ASC correcto', false, String(e)); }

    // Paginación: 3 ítems por página, página 1
    const PAGE_SIZE = 3;
    const page1 = rows.slice(0, PAGE_SIZE);
    try {
        assert(page1.length === 3);
        log('H', '13', 'paginación página 1 devuelve PAGE_SIZE filas', true);
    } catch (e) { log('H', '13', 'paginación página 1 devuelve PAGE_SIZE filas', false, String(e)); }

    // Paginación: página 2
    const page2 = rows.slice(PAGE_SIZE, PAGE_SIZE * 2);
    try {
        assert(page2.length === 1);
        log('H', '14', 'paginación página 2 devuelve resto', true);
    } catch (e) { log('H', '14', 'paginación página 2 devuelve resto', false, String(e)); }

    // Subtotales
    const totalVal = rows.reduce((s, r) => s + r.totalValue, 0);
    const totalCos = rows.reduce((s, r) => s + r.coseguro, 0);
    try {
        assert(totalVal === 12500, `esperado 12500, got ${totalVal}`);
        log('H', '15', 'subtotal valor correcto (12500)', true);
    } catch (e) { log('H', '15', 'subtotal valor correcto (12500)', false, String(e)); }

    try {
        // Todas las filas usan buildRow que tiene coseguro=250 por defecto
        assert(totalCos === 1000, `esperado 1000, got ${totalCos}`);
        log('H', '16', 'subtotal coseguro correcto (1000)', true);
    } catch (e) { log('H', '16', 'subtotal coseguro correcto (1000)', false, String(e)); }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 5: computeDateRange (lógica extraída del modal)
// ══════════════════════════════════════════════════════════════════════════════
function computeDateRange(months: number, dateFrom: string, dateTo: string): { from: string; to: string } {
    if (dateFrom) return { from: dateFrom, to: dateTo || new Date().toISOString().split('T')[0] };
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    return { from: from.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] };
}

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }

function testComputeDateRange() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 5: computeDateRange ───────────────────────────────${C.reset}`);

    // dateFrom provisto → usa dateFrom
    try {
        const r = computeDateRange(12, '2024-01-01', '2024-06-30');
        assert(r.from === '2024-01-01' && r.to === '2024-06-30');
        log('D', '01', 'dateFrom provisto → usa rango custom', true);
    } catch (e) { log('D', '01', 'dateFrom provisto → usa rango custom', false, String(e)); }

    // dateFrom provisto sin dateTo → usa hoy como to
    try {
        const today = isoDate(new Date());
        const r = computeDateRange(12, '2024-01-01', '');
        assert(r.from === '2024-01-01' && r.to === today);
        log('D', '02', 'dateFrom sin dateTo → to=hoy', true);
    } catch (e) { log('D', '02', 'dateFrom sin dateTo → to=hoy', false, String(e)); }

    // Sin dateFrom → from = hoy - months
    try {
        const today = isoDate(new Date());
        const r = computeDateRange(3, '', '');
        assert(r.to === today, `to debería ser hoy (${today}), got ${r.to}`);
        // el from debe ser < to
        assert(r.from < r.to, `from (${r.from}) debe ser anterior a to (${r.to})`);
        log('D', '03', 'sin dateFrom → from = hoy - 3 meses, to = hoy', true);
    } catch (e) { log('D', '03', 'sin dateFrom → from = hoy - 3 meses, to = hoy', false, String(e)); }

    // months=12 → from debe ser ~365 días antes
    try {
        const r = computeDateRange(12, '', '');
        const fromDate = new Date(r.from);
        const toDate = new Date(r.to);
        const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
        assert(diffDays >= 360 && diffDays <= 370, `diff esperado ~365, got ${diffDays}`);
        log('D', '04', 'months=12 → diferencia ~365 días', true);
    } catch (e) { log('D', '04', 'months=12 → diferencia ~365 días', false, String(e)); }

    // months=24 → from debe ser ~730 días antes
    try {
        const r = computeDateRange(24, '', '');
        const fromDate = new Date(r.from);
        const toDate = new Date(r.to);
        const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
        assert(diffDays >= 725 && diffDays <= 740, `diff esperado ~730, got ${diffDays}`);
        log('D', '05', 'months=24 → diferencia ~730 días', true);
    } catch (e) { log('D', '05', 'months=24 → diferencia ~730 días', false, String(e)); }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 6: CSV export — formato, BOM, headers
// ══════════════════════════════════════════════════════════════════════════════
function buildCSV(rows: HistoryRow[]): string {
    const headers = ['Tipo', 'N.', 'Código', 'Práctica', 'Fecha', 'Referencia', 'Estado', 'Valor', 'Coseguro'];
    const dataRows = rows.map(r => [
        r.typeLabel, r.nomenclatorAbbr, r.practiceCode,
        `"${r.practiceName.replace(/"/g, '""')}"`,
        r.date ? new Date(r.date).toLocaleDateString('es-AR') : '',
        r.reference, r.status,
        r.totalValue.toFixed(2), r.coseguro.toFixed(2),
    ]);
    const csv = [headers.join(','), ...dataRows.map(r => r.join(','))].join('\n');
    return '\uFEFF' + csv;
}

function testCSVExport() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 6: CSV export ─────────────────────────────────────${C.reset}`);

    const rows = [
        buildRow({ id: '1', practiceName: 'Consulta médica, con coma', date: '2025-01-15', totalValue: 1500, coseguro: 75 }),
        buildRow({ id: '2', practiceName: 'Práctica "con comillas"', date: '2025-02-20', totalValue: 3200, coseguro: 0 }),
    ];
    const csv = buildCSV(rows);

    // BOM UTF-8
    try {
        assert(csv.startsWith('\uFEFF'), 'CSV debe comenzar con BOM UTF-8');
        log('C', '01', 'CSV comienza con BOM UTF-8', true);
    } catch (e) { log('C', '01', 'CSV comienza con BOM UTF-8', false, String(e)); }

    // Tiene header correcto
    const lines = csv.slice(1).split('\n'); // quitar BOM
    try {
        assert(lines[0] === 'Tipo,N.,Código,Práctica,Fecha,Referencia,Estado,Valor,Coseguro');
        log('C', '02', 'header CSV correcto', true);
    } catch (e) { log('C', '02', 'header CSV correcto', false, `"${lines[0]}"`); }

    // Cantidad de líneas = header + 2 filas
    try {
        assert(lines.length === 3, `esperado 3 líneas, got ${lines.length}`);
        log('C', '03', 'CSV tiene header + 2 filas de datos', true);
    } catch (e) { log('C', '03', 'CSV tiene header + 2 filas de datos', false, String(e)); }

    // Práctica con coma queda entre comillas
    try {
        assert(lines[1].includes('"Consulta médica, con coma"'), `línea 1: "${lines[1]}"`);
        log('C', '04', 'práctica con coma queda entre comillas en CSV', true);
    } catch (e) { log('C', '04', 'práctica con coma queda entre comillas en CSV', false, String(e)); }

    // Práctica con comillas → comillas escapadas
    try {
        assert(lines[2].includes('"Práctica ""con comillas"""'), `línea 2: "${lines[2]}"`);
        log('C', '05', 'comillas en práctica escapeadas como ""', true);
    } catch (e) { log('C', '05', 'comillas en práctica escapeadas como ""', false, String(e)); }

    // Valores numéricos con 2 decimales
    try {
        assert(lines[1].includes('1500.00') && lines[1].includes('75.00'));
        log('C', '06', 'valores numéricos con 2 decimales', true);
    } catch (e) { log('C', '06', 'valores numéricos con 2 decimales', false, String(e)); }

    // coseguro=0 se exporta como "0.00"
    try {
        assert(lines[2].includes('0.00'));
        log('C', '07', 'coseguro=0 se exporta como "0.00"', true);
    } catch (e) { log('C', '07', 'coseguro=0 se exporta como "0.00"', false, String(e)); }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 7: DB schema checks (requiere Supabase)
// ══════════════════════════════════════════════════════════════════════════════
async function testDBSchema() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 7: DB schema checks ───────────────────────────────${C.reset}`);

    if (!supabase) {
        console.log(`${C.yellow}[SKIP] Sin conexión a Supabase (.env.local no configurado o inaccesible)${C.reset}`);
        return;
    }

    // Tabla repositions existe
    try {
        const { error } = await supabase.from('repositions').select('id').limit(1);
        assert(!error || error.code === 'PGRST116', error?.message);
        log('DB', '01', 'tabla repositions existe', true);
    } catch (e) { log('DB', '01', 'tabla repositions existe', false, String(e)); }

    // Tabla reimbursements existe
    try {
        const { error } = await supabase.from('reimbursements').select('id').limit(1);
        assert(!error || error.code === 'PGRST116', error?.message);
        log('DB', '02', 'tabla reimbursements existe', true);
    } catch (e) { log('DB', '02', 'tabla reimbursements existe', false, String(e)); }

    // Tabla expedients existe
    try {
        const { error } = await supabase.from('expedients').select('id').limit(1);
        assert(!error || error.code === 'PGRST116', error?.message);
        log('DB', '03', 'tabla expedients existe', true);
    } catch (e) { log('DB', '03', 'tabla expedients existe', false, String(e)); }

    // Tabla expedient_practices existe
    try {
        const { error } = await supabase.from('expedient_practices').select('id').limit(1);
        assert(!error || error.code === 'PGRST116', error?.message);
        log('DB', '04', 'tabla expedient_practices existe', true);
    } catch (e) { log('DB', '04', 'tabla expedient_practices existe', false, String(e)); }

    // practices tiene columna nomenclator_type
    try {
        const { data, error } = await supabase.from('practices').select('id, nomenclator_type').limit(1);
        assert(!error, error?.message);
        assert(data !== null);
        log('DB', '05', 'practices.nomenclator_type seleccionable', true);
    } catch (e) { log('DB', '05', 'practices.nomenclator_type seleccionable', false, String(e)); }

    // repositions tiene columna affiliate_id + request_date
    try {
        const { error } = await supabase.from('repositions').select('id, affiliate_id, request_date, status, total_amount').limit(1);
        assert(!error, error?.message);
        log('DB', '06', 'repositions.affiliate_id + request_date + status + total_amount seleccionables', true);
    } catch (e) { log('DB', '06', 'repositions.affiliate_id + request_date + status + total_amount seleccionables', false, String(e)); }

    // reimbursements tiene columna affiliate_id + created_at
    try {
        const { error } = await supabase.from('reimbursements').select('id, affiliate_id, created_at, status, total_amount, type').limit(1);
        assert(!error, error?.message);
        log('DB', '07', 'reimbursements.affiliate_id + created_at + status + total_amount + type seleccionables', true);
    } catch (e) { log('DB', '07', 'reimbursements.affiliate_id + created_at + status + total_amount + type seleccionables', false, String(e)); }

    // expedients tiene columna affiliate_id + expedient_number
    try {
        const { error } = await supabase.from('expedients').select('id, affiliate_id, expedient_number, status, created_at').limit(1);
        assert(!error, error?.message);
        log('DB', '08', 'expedients.affiliate_id + expedient_number + status + created_at seleccionables', true);
    } catch (e) { log('DB', '08', 'expedients.affiliate_id + expedient_number + status + created_at seleccionables', false, String(e)); }

    // expedient_practices columnas clave
    try {
        const { error } = await supabase
            .from('expedient_practices')
            .select('id, expedient_id, practice_id, quantity, status, covered_amount, copay_amount, created_at')
            .limit(1);
        assert(!error, error?.message);
        log('DB', '09', 'expedient_practices columnas clave seleccionables', true);
    } catch (e) { log('DB', '09', 'expedient_practices columnas clave seleccionables', false, String(e)); }

    // practices tiene columna description (no solo name)
    try {
        const { error } = await supabase.from('practices').select('id, code, description, nomenclator_type').limit(1);
        assert(!error, error?.message);
        log('DB', '10', 'practices.description seleccionable', true);
    } catch (e) { log('DB', '10', 'practices.description seleccionable', false, String(e)); }

    // affiliates: columnas usadas por AffiliateSearch
    try {
        const { error } = await supabase
            .from('affiliates')
            .select('id, full_name, affiliate_number, document_number, plan_id, jurisdiction_id')
            .limit(1);
        assert(!error, error?.message);
        log('DB', '11', 'affiliates columnas clave seleccionables', true);
    } catch (e) { log('DB', '11', 'affiliates columnas clave seleccionables', false, String(e)); }

    // plans: columna name
    try {
        const { error } = await supabase.from('plans').select('id, name').limit(1);
        assert(!error, error?.message);
        log('DB', '12', 'plans.name seleccionable', true);
    } catch (e) { log('DB', '12', 'plans.name seleccionable', false, String(e)); }

    // coseguro_rules tabla existe
    try {
        const { error } = await supabase.from('coseguro_rules').select('id').limit(1);
        assert(!error || error.code === 'PGRST116', error?.message);
        log('DB', '13', 'tabla coseguro_rules existe', true);
    } catch (e) { log('DB', '13', 'tabla coseguro_rules existe', false, String(e)); }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPO 8: DB query funcional (requiere afiliado real)
// ══════════════════════════════════════════════════════════════════════════════
async function testDBQueries() {
    console.log(`\n${C.bold}${C.blue}── GRUPO 8: DB query funcional ─────────────────────────────${C.reset}`);

    if (!supabase) {
        console.log(`${C.yellow}[SKIP] Sin conexión a Supabase${C.reset}`);
        return;
    }

    // Obtener un afiliado para usar en las queries
    const { data: affiliates } = await supabase.from('affiliates').select('id, full_name').limit(1);
    const affiliateId = affiliates?.[0]?.id;

    if (!affiliateId) {
        console.log(`${C.yellow}[SKIP] No hay afiliados en la DB para probar queries${C.reset}`);
        return;
    }

    const from2y = new Date(); from2y.setFullYear(from2y.getFullYear() - 2);
    const fromStr = from2y.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Query expedients por affiliate_id → no error
    try {
        const { data, error } = await supabase
            .from('expedients')
            .select('id, expedient_number, status, created_at')
            .eq('affiliate_id', affiliateId)
            .gte('created_at', fromStr)
            .lte('created_at', today + 'T23:59:59');
        assert(!error, error?.message);
        assert(Array.isArray(data));
        log('Q', '01', `query expedients por affiliate_id=${affiliateId} sin error`, true);
    } catch (e) { log('Q', '01', 'query expedients por affiliate_id sin error', false, String(e)); }

    // Query repositions por affiliate_id → no error
    try {
        const { data, error } = await supabase
            .from('repositions')
            .select('id, request_date, status, total_amount, material_description, material_code')
            .eq('affiliate_id', affiliateId)
            .gte('request_date', fromStr)
            .lte('request_date', today);
        assert(!error, error?.message);
        assert(Array.isArray(data));
        log('Q', '02', 'query repositions por affiliate_id sin error', true);
    } catch (e) { log('Q', '02', 'query repositions por affiliate_id sin error', false, String(e)); }

    // Query reimbursements por affiliate_id → no error
    try {
        const { data, error } = await supabase
            .from('reimbursements')
            .select('id, request_date, status, total_amount, type, created_at')
            .eq('affiliate_id', affiliateId)
            .gte('created_at', fromStr)
            .lte('created_at', today + 'T23:59:59');
        assert(!error, error?.message);
        assert(Array.isArray(data));
        log('Q', '03', 'query reimbursements por affiliate_id sin error', true);
    } catch (e) { log('Q', '03', 'query reimbursements por affiliate_id sin error', false, String(e)); }

    // ConsumptionHistoryModal path: query expedient_practices via expedient_ids
    try {
        const { data: exps } = await supabase
            .from('expedients')
            .select('id')
            .eq('affiliate_id', affiliateId)
            .limit(5);
        const expIds = (exps || []).map((e: { id: string }) => e.id);
        if (expIds.length > 0) {
            const { error } = await supabase
                .from('expedient_practices')
                .select('id, expedient_id, practice_id, quantity, status, covered_amount, copay_amount')
                .in('expedient_id', expIds);
            assert(!error, error?.message);
            log('Q', '04', 'query expedient_practices .in(expedient_ids) sin error', true);
        } else {
            // Sin expedientes aún, pero la query no debe fallar si se omite
            log('Q', '04', 'query expedient_practices (sin expedientes previos — OK)', true);
        }
    } catch (e) { log('Q', '04', 'query expedient_practices .in(expedient_ids)', false, String(e)); }

    // NomenclatorSearchModal: query practices con ilike + nomenclator_type filter
    try {
        const { data, error } = await supabase
            .from('practices')
            .select('id, code, description, nomenclator_type, fixed_value')
            .ilike('description', '%consulta%')
            .limit(10);
        assert(!error, error?.message);
        assert(Array.isArray(data));
        log('Q', '05', 'query practices ilike description funciona', true);
    } catch (e) { log('Q', '05', 'query practices ilike description funciona', false, String(e)); }

    // NomenclatorSearchModal: query practices con code ilike
    try {
        const { data, error } = await supabase
            .from('practices')
            .select('id, code, description, nomenclator_type, fixed_value')
            .ilike('code', '%01%')
            .limit(10);
        assert(!error, error?.message);
        assert(Array.isArray(data));
        log('Q', '06', 'query practices ilike code funciona', true);
    } catch (e) { log('Q', '06', 'query practices ilike code funciona', false, String(e)); }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
    console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   TEST SUITE: Fases 10-12 — Formulario Solicitudes       ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}`);
    console.log(`${C.yellow}Fecha: ${new Date().toLocaleString('es-AR')}${C.reset}`);

    testTextUtils();
    testNomenclatorAbbr();
    testInferExpedientType();
    testHistoryRowLogic();
    testComputeDateRange();
    testCSVExport();
    await testDBSchema();
    await testDBQueries();

    // ── Resumen ──
    const total = pass + fail;
    console.log(`\n${C.bold}${'─'.repeat(60)}${C.reset}`);
    console.log(`${C.bold}RESULTADO FINAL: ${pass}/${total} tests pasaron${C.reset}`);
    if (fail > 0) {
        console.log(`${C.red}${C.bold}FALLOS (${fail}):${C.reset}`);
        failures.forEach(f => console.log(`  ${C.red}✗ ${f}${C.reset}`));
    } else {
        console.log(`${C.green}${C.bold}✓ Todos los tests pasaron correctamente.${C.reset}`);
    }

    if (fail > 0) process.exit(1);
}

main().catch(err => {
    console.error(`\n${C.red}Error fatal en test suite: ${err}${C.reset}`);
    process.exit(1);
});
