
import { Affiliate, Plan, Practice, Jurisdiction, UserProfile } from '@/types/database'
import { CAMERA_I, CAMERA_II } from './jurisdictionContext'
import { GENERATED_AFFILIATES, GENERATED_PRACTICES } from './mockDataExtended'

// --- MOCK DATA FOR DEVELOPMENT ---

export const MOCK_JURISDICTIONS: Jurisdiction[] = [CAMERA_I, CAMERA_II]

export const MOCK_PLANS: Plan[] = [
    // Cámara I Plans
    { id: 101, name: 'Plan General', jurisdiction_id: 1, rules: { coverage_percent: 100, waiting_period_months: 0 }, created_at: new Date().toISOString() },
    { id: 102, name: 'Plan Básico', jurisdiction_id: 1, rules: { coverage_percent: 80, waiting_period_months: 6 }, created_at: new Date().toISOString() },
    // Cámara II Plans
    { id: 201, name: 'Plan Integral', jurisdiction_id: 2, rules: { coverage_percent: 100 }, created_at: new Date().toISOString() },
    { id: 202, name: 'Plan Joven', jurisdiction_id: 2, rules: { coverage_percent: 90 }, created_at: new Date().toISOString() },
    { id: 203, name: 'Plan Básico', jurisdiction_id: 2, rules: { coverage_percent: 70 }, created_at: new Date().toISOString() },
]

// MOCK_AFFILIATES is defined at the bottom merging manual + generated

export const MOCK_PRACTICES: Practice[] = [
    // Consultas
    { id: 1, code: '42.01.01', description: 'CONSULTA MÉDICA DIURNA DE URGENCIAS/EMERGENCIAS', jurisdiction_id: 1, financial_value: 10500, category: 'Consultas', created_at: new Date().toISOString() },
    { id: 2, code: '42.01.01', description: 'CONSULTA MÉDICA (ROSARIO)', jurisdiction_id: 2, financial_value: 12000, category: 'Consultas', created_at: new Date().toISOString() },

    // Cirugía
    { id: 3, code: '11.01.01', description: 'CESÁREA', jurisdiction_id: 1, financial_value: 150000, category: 'Cirugía', created_at: new Date().toISOString() },
    { id: 4, code: '11.01.01', description: 'CESÁREA (MÓDULO)', jurisdiction_id: 2, financial_value: 180000, category: 'Cirugía', created_at: new Date().toISOString() },

    // Salud Mental
    { id: 5, code: '33.01.01', description: 'PSICOTERAPIA INDIVIDUAL', jurisdiction_id: 1, financial_value: 4500, category: 'Salud Mental', created_at: new Date().toISOString() },
    { id: 6, code: '33.01.01', description: 'ATENCIÓN PSICOLÓGICA', jurisdiction_id: 2, financial_value: 5000, category: 'Salud Mental', created_at: new Date().toISOString() },

    // Alta Complejidad
    { id: 7, code: '70.01.01', description: 'CIRUGÍA CARDIOVASCULAR', jurisdiction_id: 1, financial_value: 850000, category: 'Alta Complejidad', created_at: new Date().toISOString() },
    { id: 8, code: '70.01.01', description: 'CIRUGÍA CARDIOVASCULAR (MÓDULO)', jurisdiction_id: 2, financial_value: 920000, category: 'Alta Complejidad', created_at: new Date().toISOString() },
    ...GENERATED_PRACTICES
]

// Override MOCK_AFFILIATES to include generated ones
const MANUAL_AFFILIATES = [
    // Cámara I Affiliates
    {
        id: 1,
        full_name: 'Juan Pérez (C1-General)',
        document_number: '20123456',
        birth_date: '1980-05-15',
        plan_id: 101,
        jurisdiction_id: 1,
        start_date: '2020-01-01',
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        full_name: 'María García (C1-Básico)',
        document_number: '27654321',
        birth_date: '1995-10-20',
        plan_id: 102,
        jurisdiction_id: 1,
        start_date: '2025-01-01', // New affiliate (has wait time)
        created_at: new Date().toISOString()
    },
    // Cámara II Affiliates
    {
        id: 3,
        full_name: 'Carlos López (C2-Integral)',
        document_number: '20987654',
        birth_date: '1975-03-10',
        plan_id: 201,
        jurisdiction_id: 2,
        start_date: '2018-06-15',
        created_at: new Date().toISOString()
    },
    {
        id: 4,
        full_name: 'Ana Torres (C2-Joven)',
        document_number: '27112233',
        birth_date: '2002-12-05',
        plan_id: 202,
        jurisdiction_id: 2,
        start_date: '2024-03-01',
        created_at: new Date().toISOString()
    },
    {
        id: 5,
        full_name: 'Pedro Nuevo (C1-Básico)',
        document_number: '30123456',
        birth_date: '2000-01-01',
        plan_id: 102, // 6 months waiting period
        jurisdiction_id: 1,
        start_date: '2026-01-01', // New affiliate (only ~1 month tenure)
        created_at: new Date().toISOString()
    },
]

export const MOCK_AFFILIATES: Affiliate[] = [...MANUAL_AFFILIATES, ...GENERATED_AFFILIATES]
