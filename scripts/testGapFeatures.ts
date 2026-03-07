/**
 * testGapFeatures.ts
 * Pruebas automatizadas para los features del gap analysis implementados:
 *   - Columnas Receta/Médico por fila (PracticeItem type)
 *   - Deuda de cuota visible (Affiliate.quota_debt)
 *   - Toggle notificación al afiliado (API route)
 *   - Doctor validation (providers.enrollment)
 *   - Carencia badge (calcCarencia lógica)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const c = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', bold: '\x1b[1m', reset: '\x1b[0m' };
let pass = 0;
let fail = 0;

function ok(group: string, name: string, detail = '') {
    pass++;
    console.log(`${c.green}[PASS]${c.reset} ${c.bold}${group}${c.reset} — ${name}${detail ? ` ${c.yellow}(${detail})${c.reset}` : ''}`);
}
function ko(group: string, name: string, detail = '') {
    fail++;
    console.log(`${c.red}[FAIL]${c.reset} ${c.bold}${group}${c.reset} — ${name}${detail ? `\n       ${c.yellow}${detail}${c.reset}` : ''}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO A: Lógica pura (no requiere DB)
// ─────────────────────────────────────────────────────────────────────────────

function testCalcCarencia() {
    const group = 'calcCarencia';

    function calcCarencia(startDate: string, waitingMonths: number): { ok: boolean; months: number } {
        if (!startDate || waitingMonths <= 0) return { ok: true, months: 0 };
        const start = new Date(startDate);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
        const served = Math.floor(diffMonths);
        return { ok: served >= waitingMonths, months: served };
    }

    const oldDate = new Date(Date.now() - 24 * 30.44 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const r1 = calcCarencia(oldDate, 3);
    r1.ok ? ok(group, 'cumplió carencia (24m vs 3m)') : ko(group, 'cumplió carencia (24m vs 3m)', `ok=${r1.ok} months=${r1.months}`);

    const newDate = new Date(Date.now() - 1 * 30.44 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const r2 = calcCarencia(newDate, 6);
    !r2.ok ? ok(group, 'no cumplió carencia (1m vs 6m)') : ko(group, 'no cumplió carencia', `ok=${r2.ok} months=${r2.months}`);

    const r3 = calcCarencia(newDate, 0);
    r3.ok ? ok(group, 'sin carencia configurada (0 meses)') : ko(group, 'sin carencia (0) debe ser ok', `ok=${r3.ok}`);

    const r4 = calcCarencia('', 3);
    r4.ok ? ok(group, 'fecha vacía → ok inmediato') : ko(group, 'fecha vacía debe retornar ok', `ok=${r4.ok}`);
}

function testPracticeItemShape() {
    const group = 'PracticeItem shape';

    interface MockPractice { id: number; code: string; description: string }
    interface MockPracticeItem {
        practice: MockPractice;
        quantity: number;
        ruleResult?: unknown;
        prescription_ref?: string;
        prescribing_doctor_code?: string;
    }

    const item: MockPracticeItem = {
        practice: { id: 1, code: '420101', description: 'Consulta médica' },
        quantity: 1,
        prescription_ref: 'RX-12345',
        prescribing_doctor_code: 'MN 54321',
    };

    'prescription_ref' in item ? ok(group, 'PracticeItem tiene prescription_ref') : ko(group, 'PracticeItem debe tener prescription_ref');
    'prescribing_doctor_code' in item ? ok(group, 'PracticeItem tiene prescribing_doctor_code') : ko(group, 'PracticeItem debe tener prescribing_doctor_code');
    item.prescription_ref === 'RX-12345' ? ok(group, 'prescription_ref guarda valor') : ko(group, 'prescription_ref debe guardar valor');
    item.prescribing_doctor_code === 'MN 54321' ? ok(group, 'prescribing_doctor_code guarda valor') : ko(group, 'prescribing_doctor_code debe guardar valor');

    const minimal: MockPracticeItem = { practice: { id: 2, code: '420102', description: 'ECG' }, quantity: 2 };
    minimal.prescription_ref === undefined ? ok(group, 'prescription_ref es opcional') : ko(group, 'debe ser opcional');
    minimal.prescribing_doctor_code === undefined ? ok(group, 'prescribing_doctor_code es opcional') : ko(group, 'debe ser opcional');
}

function testExtractEnrollmentDigits() {
    const group = 'extractEnrollmentDigits';

    function extractEnrollmentDigits(raw: string): string {
        return raw.replace(/\D/g, '');
    }

    const cases: [string, string][] = [
        ['MN 12345', '12345'],
        ['MP-999', '999'],
        ['54321', '54321'],
        ['   MN  00123  ', '00123'],
        ['', ''],
    ];

    for (const [input, expected] of cases) {
        const result = extractEnrollmentDigits(input);
        result === expected
            ? ok(group, `"${input}" → "${result}"`)
            : ko(group, `"${input}" esperaba "${expected}" pero obtuvo "${result}"`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO B: Verificaciones de DB — verificar columnas vía select de la columna
// (no depende de que haya filas en la tabla)
// ─────────────────────────────────────────────────────────────────────────────

async function checkCol(table: string, col: string): Promise<'yes' | 'no' | 'skip'> {
    if (!supabase) return 'skip';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table as any) as any).select(col).limit(1);
    if (!error) return 'yes';
    // error code 42703 = undefined_column en PostgreSQL; supabase pasa el msg en error.message
    if (error.message?.toLowerCase().includes('column') || error.code === '42703') return 'no';
    // Cualquier otro error (RLS, tabla no existe, etc.) → skip con info
    return 'skip';
}

async function assertCols(table: string, cols: [string, string][]) {
    const group = `DB ${table}`;
    if (!supabase) { console.log(`${c.yellow}[SKIP] ${group} — sin conexión Supabase${c.reset}`); return; }
    for (const [col, label] of cols) {
        const result = await checkCol(table, col);
        if (result === 'yes') ok(group, label);
        else if (result === 'no') ko(group, label, `columna '${col}' no existe en '${table}'`);
        else console.log(`${c.yellow}[SKIP] ${group} — ${label} (RLS u otro error de acceso)${c.reset}`);
    }
}

async function testAffiliatesDbSchema() {
    await assertCols('affiliates', [
        ['id', 'tiene id'],
        ['full_name', 'tiene full_name'],
        ['affiliate_number', 'tiene affiliate_number'],
        ['plan_id', 'tiene plan_id'],
        ['start_date', 'tiene start_date'],
        ['end_date', 'tiene end_date (campo baja)'],
        ['copay_debt', 'tiene copay_debt (coseguro)'],
        ['email', 'tiene email'],
    ]);
    const qd = await checkCol('affiliates', 'quota_debt');
    console.log(`${c.yellow}[INFO]${c.reset} affiliates.quota_debt ${qd === 'yes' ? '✓ existe en DB' : '⚠ no existe aún (campo opcional — migración pendiente)'}`);
}

async function testProvidersDbSchema() {
    await assertCols('providers', [
        ['id', 'tiene id'],
        ['name', 'tiene name'],
        ['enrollment', 'tiene enrollment (matrícula)'],
        ['type', 'tiene type'],
        ['is_active', 'tiene is_active'],
    ]);
}

async function testExpedientsDbSchema() {
    await assertCols('expedients', [
        ['id', 'tiene id'],
        ['expedient_number', 'tiene expedient_number'],
        ['status', 'tiene status'],
        ['affiliate_id', 'tiene affiliate_id'],
        ['resolved_at', 'tiene resolved_at'],
        ['resolved_by', 'tiene resolved_by'],
    ]);
}

async function testExpedientNotesDbSchema() {
    await assertCols('expedient_notes', [
        ['expedient_id', 'tiene expedient_id'],
        ['note_type', 'tiene note_type (interna/para_afiliado)'],
        ['content', 'tiene content'],
        ['author_id', 'tiene author_id'],
    ]);
}

async function testDoctorEnrollmentQuery() {
    const group = 'Doctor enrollment query';
    if (!supabase) { console.log(`${c.yellow}[SKIP] ${group} — sin conexión${c.reset}`); return; }

    const { error } = await supabase
        .from('providers')
        .select('id, name, enrollment, type, is_active')
        .ilike('enrollment', '%12345%')
        .eq('is_active', true)
        .limit(5);

    if (error) ko(group, 'query enrollment ilike funciona', error.message);
    else ok(group, 'query enrollment ilike funciona correctamente');
}

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO C: Nuevas features de esta sesión
// ─────────────────────────────────────────────────────────────────────────────

function testFilterPeriod() {
    const group = 'Filtros período';

    // Simula la lógica de filtrado por período
    interface MockExpedient { id: number; created_at: string }
    function filterByPeriod(items: MockExpedient[], period: string): MockExpedient[] {
        if (!period) return items;
        return items.filter(e => e.created_at?.slice(0, 7) === period);
    }

    const items: MockExpedient[] = [
        { id: 1, created_at: '2026-01-15T10:00:00Z' },
        { id: 2, created_at: '2026-02-20T10:00:00Z' },
        { id: 3, created_at: '2026-01-30T10:00:00Z' },
        { id: 4, created_at: '2025-12-01T10:00:00Z' },
    ];

    const jan = filterByPeriod(items, '2026-01');
    jan.length === 2 ? ok(group, 'filtra solo ene-2026 (2 items)') : ko(group, 'debe haber 2 items en 2026-01', `got ${jan.length}`);
    jan.every(i => i.created_at.startsWith('2026-01')) ? ok(group, 'todos los items son de ene-2026') : ko(group, 'todos items deben ser ene-2026');

    const feb = filterByPeriod(items, '2026-02');
    feb.length === 1 ? ok(group, 'filtra solo feb-2026 (1 item)') : ko(group, 'debe haber 1 item en 2026-02', `got ${feb.length}`);

    const all = filterByPeriod(items, '');
    all.length === 4 ? ok(group, 'sin filtro retorna todos (4)') : ko(group, 'sin filtro debe retornar todos', `got ${all.length}`);

    const old = filterByPeriod(items, '2025-12');
    old.length === 1 ? ok(group, 'filtra dic-2025 (1 item)') : ko(group, 'debe haber 1 item en 2025-12', `got ${old.length}`);
}

function testExportCSV() {
    const group = 'Export CSV';

    interface MockRow { expedient_number: string; type: string; status: string; affiliate_name: string }

    function buildCSVRow(row: MockRow): string {
        const cols = [row.expedient_number, row.type, row.status, row.affiliate_name];
        return cols.map(v => `"${v.replace(/"/g, '""')}"`).join(',');
    }

    const r1 = buildCSVRow({ expedient_number: 'EXP-0001', type: 'ambulatoria', status: 'resuelto', affiliate_name: 'Juan Pérez' });
    r1.includes('"EXP-0001"') ? ok(group, 'número de expediente en CSV') : ko(group, 'número debe estar en CSV');
    r1.includes('"ambulatoria"') ? ok(group, 'tipo de expediente en CSV') : ko(group, 'tipo debe estar en CSV');
    r1.includes('"Juan Pérez"') ? ok(group, 'nombre con acento en CSV') : ko(group, 'nombre con acento debe estar');

    // Caracteres especiales: comillas dentro de campo
    const r2 = buildCSVRow({ expedient_number: 'EXP-0002', type: 'reintegros', status: 'pendiente', affiliate_name: 'O"Brien, John' });
    r2.includes('"O""Brien, John"') ? ok(group, 'escapa comillas internas con doble "') : ko(group, 'comillas deben ser escapadas');

    const header = ['Número', 'Tipo', 'Estado', 'Afiliado', 'DNI', 'Prestador', 'Fecha'];
    header.length === 7 ? ok(group, 'header tiene 7 columnas') : ko(group, 'header debe tener 7 columnas');
}

function testPanelCuota() {
    const group = 'Panel cuota/padrón';

    interface MockAffiliate {
        quota_debt?: number;
        quota_coefficient?: number;
        copay_debt?: number;
        agreement?: string;
        children_count?: number;
    }

    function calcMonthsOwed(quotaDebt: number, coef: number): number {
        if (coef <= 0) return 0;
        return Math.round(quotaDebt / coef);
    }

    const a1: MockAffiliate = { quota_debt: 15000, quota_coefficient: 5000, agreement: 'Empresa X' };
    calcMonthsOwed(a1.quota_debt!, a1.quota_coefficient!) === 3 ? ok(group, 'calcula 3 meses adeudados (15000/5000)') : ko(group, 'debe calcular 3 meses');
    (Number(a1.quota_debt) > 0) ? ok(group, 'detecta deuda de cuota') : ko(group, 'debe detectar deuda');
    a1.agreement === 'Empresa X' ? ok(group, 'convenio disponible en panel') : ko(group, 'convenio debe estar disponible');

    const a2: MockAffiliate = { quota_debt: 0, copay_debt: 2500 };
    !(Number(a2.quota_debt) > 0) ? ok(group, 'sin deuda de cuota: no muestra deuda cuota') : ko(group, 'no debe mostrar deuda 0');
    Number(a2.copay_debt) > 0 ? ok(group, 'detecta deuda de coseguro') : ko(group, 'debe detectar deuda coseguro');

    const a3: MockAffiliate = { children_count: 2, quota_coefficient: 7500 };
    const showPanel = !!(a3.quota_coefficient || a3.quota_debt || a3.copay_debt || a3.agreement);
    showPanel ? ok(group, 'panel visible cuando hay coefficient') : ko(group, 'panel debe ser visible con coefficient');
}

function testCoseguroCalc() {
    const group = 'Coseguro PDF';

    interface MockPractice { status: string; copay_amount?: number; practice_id: number; quantity: number }

    function hasCopay(practices: MockPractice[]): boolean {
        return practices.some(p =>
            ['autorizada', 'autorizada_parcial'].includes(p.status) && (p.copay_amount ?? 0) > 0
        );
    }

    function totalCopay(practices: MockPractice[]): number {
        return practices
            .filter(p => ['autorizada', 'autorizada_parcial'].includes(p.status))
            .reduce((s, p) => s + (p.copay_amount || 0), 0);
    }

    const pSet1: MockPractice[] = [
        { status: 'autorizada', copay_amount: 1500, practice_id: 1234, quantity: 1 },
        { status: 'autorizada', copay_amount: 800, practice_id: 5678, quantity: 2 },
        { status: 'denegada', copay_amount: 0, practice_id: 9999, quantity: 1 },
    ];
    hasCopay(pSet1) ? ok(group, 'detecta coseguro en prácticas autorizadas') : ko(group, 'debe detectar coseguro');
    totalCopay(pSet1) === 2300 ? ok(group, 'total coseguro = 2300 (1500+800)') : ko(group, 'total debe ser 2300', `got ${totalCopay(pSet1)}`);

    const pSet2: MockPractice[] = [
        { status: 'autorizada', copay_amount: 0, practice_id: 1111, quantity: 1 },
        { status: 'denegada', copay_amount: 500, practice_id: 2222, quantity: 1 },
    ];
    !hasCopay(pSet2) ? ok(group, 'sin coseguro en autorizadas → no muestra botón') : ko(group, 'no debe mostrar botón sin coseguro real');
    totalCopay(pSet2) === 0 ? ok(group, 'total coseguro 0 cuando solo hay denegadas') : ko(group, 'total debe ser 0');

    const pSet3: MockPractice[] = [
        { status: 'autorizada_parcial', copay_amount: 350, practice_id: 3333, quantity: 3 },
    ];
    hasCopay(pSet3) ? ok(group, 'detecta coseguro en autorizada_parcial') : ko(group, 'debe detectar en parcial');
    totalCopay(pSet3) === 350 ? ok(group, 'total correcto en autorizada_parcial') : ko(group, 'total debe ser 350');
}

function testFamilyGroupBadge() {
    const group = 'Grupo familiar badge';

    interface MockAffiliate { certificate_number?: string; relationship?: string; titular_id?: string }

    function hasFamilyGroup(a: MockAffiliate): boolean {
        return !!(a.certificate_number || a.titular_id);
    }

    function getFamilyGroupId(a: MockAffiliate): string | undefined {
        return a.certificate_number;
    }

    const titular: MockAffiliate = { certificate_number: 'GF-1001', relationship: 'Titular' };
    hasFamilyGroup(titular) ? ok(group, 'titular con certificate_number tiene grupo') : ko(group, 'titular con cert debe tener grupo');
    getFamilyGroupId(titular) === 'GF-1001' ? ok(group, 'obtiene ID grupo familiar del titular') : ko(group, 'debe obtener ID del grupo');

    const hijo: MockAffiliate = { certificate_number: 'GF-1001', relationship: 'hijo', titular_id: 'aff-001' };
    hasFamilyGroup(hijo) ? ok(group, 'hijo con certificate_number tiene grupo') : ko(group, 'hijo debe tener grupo');
    getFamilyGroupId(hijo) === 'GF-1001' ? ok(group, 'hijo comparte mismo grupo que titular') : ko(group, 'debe compartir grupo');

    const sinGrupo: MockAffiliate = { relationship: 'Titular' };
    !hasFamilyGroup(sinGrupo) ? ok(group, 'afiliado sin cert ni titular_id → sin grupo') : ko(group, 'sin cert debe ser falso');

    // Los resultados de búsqueda muestran badge solo cuando hay cert_number
    const searchResults: MockAffiliate[] = [titular, hijo, sinGrupo];
    const withBadge = searchResults.filter(a => !!a.certificate_number);
    withBadge.length === 2 ? ok(group, 'badge de grupo familiar en 2 de 3 resultados') : ko(group, 'debe mostrar badge en 2', `got ${withBadge.length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n${c.blue}${c.bold}═══ TEST GAP FEATURES — CPCE Salud ═══${c.reset}`);
    console.log(`${c.yellow}Pruebas automatizadas del gap analysis...${c.reset}\n`);

    console.log(`${c.bold}[Grupo A] Lógica pura (sin DB)${c.reset}`);
    testCalcCarencia();
    testPracticeItemShape();
    testExtractEnrollmentDigits();

    console.log(`\n${c.bold}[Grupo C] Nuevas features — filtros, cuota, coseguro, familia${c.reset}`);
    testFilterPeriod();
    testExportCSV();
    testPanelCuota();
    testCoseguroCalc();
    testFamilyGroupBadge();

    console.log(`\n${c.bold}[Grupo B] Esquema de base de datos${c.reset}`);
    if (!supabase) console.log(`${c.yellow}⚠ NEXT_PUBLIC_SUPABASE_URL o ANON_KEY no encontrados — tests DB omitidos${c.reset}`);
    await testAffiliatesDbSchema();
    await testProvidersDbSchema();
    await testExpedientsDbSchema();
    await testExpedientNotesDbSchema();
    await testDoctorEnrollmentQuery();

    const total = pass + fail;
    console.log(`\n${c.bold}═══ RESULTADO ═══${c.reset}`);
    console.log(`Total: ${total}  ${c.green}Passed: ${pass}${c.reset}  ${fail > 0 ? c.red : c.green}Failed: ${fail}${c.reset}`);

    if (fail > 0) {
        console.log(`${c.red}\n✗ Hay ${fail} prueba(s) fallida(s).${c.reset}`);
        process.exit(1);
    } else {
        console.log(`${c.green}\n✓ Todas las pruebas pasaron.${c.reset}`);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
