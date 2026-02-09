
const fs = require('fs');
const path = require('path');

// --- HELPER FUNCTIONS ---

const NAMES = ["Juan", "María", "Carlos", "Ana", "Luis", "Elena", "Pedro", "Sofia", "Miguel", "Lucía", "Diego", "Valentina", "Jorge", "Isabella", "Raúl", "Camila", "Fernando", "Martina", "Gustavo", "Catalina"];
const SURNAMES = ["Pérez", "García", "López", "Torres", "Rodríguez", "González", "Fernández", "Martínez", "Sánchez", "Romero", "Díaz", "Alvarez", "Ruiz", "Gómez", "Flores", "Acosta", "Benítez", "Medina", "Herrera", "Aguirre"];

const PRACTICE_DESCRIPTIONS = [
    { desc: "CONSULTA PEDIÁTRICA", val: 12000, cat: "Consultas" },
    { desc: "ECOGRAFÍA ABDOMINAL", val: 25000, cat: "Estudios" },
    { desc: "RADIOGRAFÍA TÓRAX", val: 18000, cat: "Estudios" },
    { desc: "SESIÓN KINESIOLOGÍA", val: 8000, cat: "Kinesiología" },
    { desc: "EXTRACCIÓN DENTARIA", val: 35000, cat: "Odontología" },
    { desc: "ANALISIS LAB. COMPLETO", val: 40000, cat: "Estudios" },
    { desc: "RESONANCIA MAGNÉTICA", val: 120000, cat: "Alta Complejidad" },
    { desc: "INTERNACIÓN EN UTI (DÍA)", val: 250000, cat: "Internación" },
    { desc: "PSICODIAGNÓSTICO", val: 15000, cat: "Salud Mental" },
    { desc: "HOLTER 24HS", val: 45000, cat: "Estudios" },
];

function getRandomItem(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDNI() {
    return getRandomInt(20000000, 50000000).toString();
}

function generateDate(startYear: number, endYear: number) {
    const year = getRandomInt(startYear, endYear);
    const month = getRandomInt(1, 12).toString().padStart(2, '0');
    const day = getRandomInt(1, 28).toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- GENERATION LOGIC ---

// 1. Generate 50 Affiliates
const generatedAffiliates = [];
for (let i = 1; i <= 50; i++) {
    const jurisdictionId = Math.random() > 0.5 ? 1 : 2;
    // Map jurisdiction to plans (Jurisdiction 1 -> Plans 101, 102; Jurisdiction 2 -> Plans 201, 202, 203)
    const planId = jurisdictionId === 1
        ? (Math.random() > 0.5 ? 101 : 102)
        : [201, 202, 203][getRandomInt(0, 2)];

    generatedAffiliates.push({
        id: 100 + i, // Start IDs from 100 to avoid conflict with manual mocks
        full_name: `${getRandomItem(SURNAMES)}, ${getRandomItem(NAMES)}`,
        document_number: generateDNI(),
        birth_date: generateDate(1960, 2005),
        plan_id: planId,
        jurisdiction_id: jurisdictionId,
        start_date: generateDate(2015, 2025),
        created_at: new Date().toISOString()
    });
}

// 2. Generate 20 Practices
const generatedPractices = [];
for (let i = 1; i <= 20; i++) {
    const jurisdictionId = Math.random() > 0.5 ? 1 : 2;
    const template = getRandomItem(PRACTICE_DESCRIPTIONS);

    // Add some variation to values
    const value = Math.round(template.val * (Math.random() * 0.4 + 0.8)); // +/- 20% variation

    generatedPractices.push({
        id: 100 + i,
        code: `${getRandomInt(10, 99)}.${getRandomInt(1, 10).toString().padStart(2, '0')}.${getRandomInt(1, 50).toString().padStart(2, '0')}`,
        description: `${template.desc} ${jurisdictionId === 2 ? '(ROS)' : ''}`,
        jurisdiction_id: jurisdictionId,
        financial_value: value,
        category: template.cat,
        created_at: new Date().toISOString()
    });
}

// --- OUTPUT ---

const fileContent = `
import { Affiliate, Practice } from '@/types/database';

export const GENERATED_AFFILIATES: Affiliate[] = ${JSON.stringify(generatedAffiliates, null, 4)};

export const GENERATED_PRACTICES: Practice[] = ${JSON.stringify(generatedPractices, null, 4)};
`;

const outputPath = path.join(__dirname, '../src/lib/mockDataExtended.ts');
fs.writeFileSync(outputPath, fileContent);

console.log(`Successfully generated ${generatedAffiliates.length} affiliates and ${generatedPractices.length} practices.`);
console.log(`Output saved to: ${outputPath}`);
