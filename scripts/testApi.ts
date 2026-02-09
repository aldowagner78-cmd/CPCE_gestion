
const API_URL = "http://localhost:3000/api/practices";

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m"
};

let passCount = 0;
let failCount = 0;

function logTest(group: string, id: string, name: string, success: boolean, error?: string) {
    if (success) {
        passCount++;
        console.log(`${colors.green}[PASS] ${group}.${id} — ${name}${colors.reset}`);
    } else {
        failCount++;
        console.log(`${colors.red}[FAIL] ${group}.${id} — ${name}${colors.reset}`);
        if (error) console.log(`${colors.yellow}       Error: ${error}${colors.reset}`);
    }
}

async function runGroup5() {
    console.log(`\n${colors.bold}--- GRUPO 5: API ROUTE (/api/practices) ---${colors.reset}`);

    // T5.1 GET ALL
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        const success = Array.isArray(data) && data.length >= 8;
        logTest('T5', '1', 'GET sin parámetros (todos)', success, !success ? `Got ${data.length} items` : undefined);
    } catch (e) {
        logTest('T5', '1', 'GET sin parámetros', false, (e as Error).message);
    }

    // T5.2 Filter Jurisdiction
    try {
        const res = await fetch(`${API_URL}?jurisdiction_id=1`);
        const data = await res.json();
        // Mock Data: Jurisdiction 1 has ~4 practices manual + generated ones.
        // We check if all returned items have jurisdiction_id === 1
        const allMatch = Array.isArray(data) && data.length > 0 && data.every((p: any) => p.jurisdiction_id === 1);
        logTest('T5', '2', 'Filtro por jurisdicción=1', allMatch);
    } catch (e) {
        logTest('T5', '2', 'Filtro por jurisdicción', false, (e as Error).message);
    }

    // T5.3 Search Text
    try {
        const q = 'consulta';
        const res = await fetch(`${API_URL}?q=${q}`);
        const data = await res.json();
        const valid = Array.isArray(data) && data.length > 0 && data.every((p: any) =>
            p.description.toLowerCase().includes(q) || p.code.includes(q)
        );
        logTest('T5', '3', 'Búsqueda por texto "consulta"', valid);
    } catch (e) {
        logTest('T5', '3', 'Búsqueda por texto', false, (e as Error).message);
    }

    // T5.4 Combined
    try {
        const q = 'cirugia';
        const jId = 2;
        const res = await fetch(`${API_URL}?q=${q}&jurisdiction_id=${jId}`);
        const data = await res.json();
        const valid = Array.isArray(data) && data.every((p: any) =>
            (p.description.toLowerCase().includes(q) || p.code.includes(q)) && p.jurisdiction_id === jId
        );
        logTest('T5', '4', 'Filtro combinado (texto+jurisdicción)', valid);
    } catch (e) {
        logTest('T5', '4', 'Filtro combinado', false, (e as Error).message);
    }
}

(async () => {
    await runGroup5();
    console.log(`\n${colors.bold}RESUMEN API:${colors.reset}`);
    console.log(`Total: ${passCount + failCount}`);
    console.log(`${colors.green}PASS: ${passCount}${colors.reset}`);
    console.log(`${colors.red}FAIL: ${failCount}${colors.reset}`);
    if (failCount > 0) process.exit(1);
})();
