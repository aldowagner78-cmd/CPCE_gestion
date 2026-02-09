
import { calculateCoverage } from "../src/lib/coverageEngine";
import { MOCK_AFFILIATES, MOCK_PLANS, MOCK_PRACTICES, MOCK_JURISDICTIONS } from "../src/lib/mockData";

console.log("=== FINAL SYSTEM CHECK: CPCE GESTION APP ===");

// 1. Data Integrity Check
console.log("\n[1] Checking Data Integrity...");
const jurisdictionCount = MOCK_JURISDICTIONS.length;
const affiliateCount = MOCK_AFFILIATES.length;
const practiceCount = MOCK_PRACTICES.length;
console.log(`Jurisdictions: ${jurisdictionCount}, Affiliates: ${affiliateCount}, Practices: ${practiceCount}`);

if (jurisdictionCount < 2 || affiliateCount < 1 || practiceCount < 1) {
    console.error("FAIL: Missing mock data.");
    process.exit(1);
} else {
    console.log("PASS: Data loaded successfully.");
}

// 2. Logic Simulation: Happy Path
console.log("\n[2] Simulating Happy Path (Coverage Calculation)...");
const aff = MOCK_AFFILIATES[0];
const plan = MOCK_PLANS.find(p => p.id === aff.plan_id)!;
const practice = MOCK_PRACTICES.find(p => p.jurisdiction_id === aff.jurisdiction_id)!;

console.log(`Testing: ${aff.full_name} -> ${practice.description}`);
const result = calculateCoverage(aff, plan, practice);

if (result.covered && result.percentage > 0) {
    console.log("PASS: Coverage calculated correctly.");
    console.log(JSON.stringify(result, null, 2));
} else {
    console.error("FAIL: Coverage calculation error.");
    console.log(result);
    process.exit(1);
}

// 3. Logic Simulation: Rejection Path (Waiting Period)
console.log("\n[3] Simulating Rejection Path (Waiting Period)...");
// Using Pedro Nuevo (ID 5) created in Phase 3
const newAff = MOCK_AFFILIATES.find(a => a.id === 5);
if (newAff) {
    const newPlan = MOCK_PLANS.find(p => p.id === newAff.plan_id)!;
    const standardPractice = MOCK_PRACTICES.find(p => p.jurisdiction_id === newAff.jurisdiction_id)!;

    console.log(`Testing: ${newAff.full_name} -> ${standardPractice.description}`);
    const rejectionResult = calculateCoverage(newAff, newPlan, standardPractice);

    // We expect covered=false OR a message about waiting period
    const hasWaitingMessage = rejectionResult.messages.some(m => m.includes("carencia"));

    if (!rejectionResult.covered || hasWaitingMessage) {
        console.log("PASS: Rejection logic validated.");
        console.log(JSON.stringify(rejectionResult, null, 2));
    } else {
        console.error("FAIL: Should have rejected/warned new affiliate.");
        console.log(rejectionResult);
        process.exit(1);
    }
} else {
    console.warn("WARN: Rejection test skipped (Affiliate ID 5 not found).");
}

console.log("\n=== SYSTEM CHECK COMPLETE: READY FOR DEPLOYMENT ===");
