import { calculateCoverage } from "../src/lib/coverageEngine";
import { MOCK_AFFILIATES, MOCK_PLANS, MOCK_PRACTICES } from "../src/lib/mockData";

// Helper to find mocking data
const getAffiliate = (id: number) => MOCK_AFFILIATES.find(a => a.id === id)!;
const getPlan = (id: number) => MOCK_PLANS.find(p => p.id === id)!;
const getPractice = (id: number) => MOCK_PRACTICES.find(p => p.id === id)!;

console.log("--- Starting Coverage Engine Tests ---");

// Case 1: Standard Coverage (Camera I - Plan General - Consulta)
// Juan Pérez (Id 1) has Plan General (100%) and start date 2020 (no waiting period issue)
const case1_Affiliate = getAffiliate(1);
const case1_Plan = getPlan(case1_Affiliate.plan_id);
const case1_Practice = getPractice(1); // Consulta Diurna

console.log(`\nTest Case 1: ${case1_Affiliate.full_name} vs ${case1_Practice.description}`);
const result1 = calculateCoverage(case1_Affiliate, case1_Plan, case1_Practice);
console.log("Result:", result1);

// Case 2: Waiting Period Rejection (Camera I - Plan Básico - Consulta)
// María García (Id 2) has Plan Básico (80%, 6 months wait). Start date 2025-01-01. Current simulated date: Let's assume today is Feb 2025.
// Note: The engine uses 'new Date()' so it depends on real time. 
// If today is < July 2025, she should be rejected.
const case2_Affiliate = getAffiliate(2);
const case2_Plan = getPlan(case2_Affiliate.plan_id);
const case2_Practice = getPractice(1); // Consulta Diurna

console.log(`\nTest Case 2: ${case2_Affiliate.full_name} (Old enough) vs ${case2_Practice.description}`);
const result2 = calculateCoverage(case2_Affiliate, case2_Plan, case2_Practice);
console.log("Result:", result2);

// Case 4: Waiting Period Rejection (Camera I - Plan Básico - Consulta)
// Pedro Nuevo (Id 5) started 2026-01-01. Plan requires 6 months. It is now Feb 2026 (1 month tenure).
const case4_Affiliate = getAffiliate(5);
const case4_Plan = getPlan(case4_Affiliate.plan_id);
const case4_Practice = getPractice(1);

console.log(`\nTest Case 4 (Rejection): ${case4_Affiliate.full_name} vs ${case4_Practice.description}`);
const result4 = calculateCoverage(case4_Affiliate, case4_Plan, case4_Practice);
console.log("Result:", result4);

// Case 3: High Complexity Authorization (Camera II - Plan Integral - Cesárea)
// Carlos López (Id 3)
const case3_Affiliate = getAffiliate(3);
const case3_Plan = getPlan(case3_Affiliate.plan_id);
const case3_Practice = getPractice(4); // Cesárea (Módulo)

console.log(`\nTest Case 3: ${case3_Affiliate.full_name} vs ${case3_Practice.description}`);
const result3 = calculateCoverage(case3_Affiliate, case3_Plan, case3_Practice);
console.log("Result:", result3);

console.log("\n--- End Tests ---");
