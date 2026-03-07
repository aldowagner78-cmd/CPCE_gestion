// Tipos compartidos para los componentes de nueva solicitud
import type { ExpedientType, ExpedientDocumentType, ExpedientPriority, ExpedientNoteType, Practice } from '@/types/database';
import type { PracticeRuleResult } from '@/services/rulesEngine';

export interface PracticeItem {
    practice: Practice;
    quantity: number;
    ruleResult?: PracticeRuleResult;
    prescription_ref?: string;           // N° de receta para esta práctica
    prescribing_doctor_code?: string;    // Matrícula del médico prescriptor
}

export interface ConsumptionItem {
    practiceCode: string;
    practiceName: string;
    count: number;
    lastDate: string;
}

export interface DetailedConsumption {
    id: string;
    date: string;
    practiceCode: string;
    practiceName: string;
    practiceId: number;
    status: string;
    coveredAmount: number;
    copayAmount: number;
    expedientNumber: string;
    expedientId: string;
    auditorName: string;
    providerName: string;
    quantity: number;
    source: 'expedient' | 'audit' | 'request';
    diagnosisCode?: string;
    diagnosisName?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fullPractice?: any;
}

export interface PendingFile {
    file: File;
    documentType: ExpedientDocumentType;
    originalSize: number;
    wasCompressed: boolean;
    savingsPercent: number;
}

export interface ChatMessage {
    from: string;
    text: string;
    date: string;
    channel: ExpedientNoteType;
}

export { type ExpedientType, type ExpedientDocumentType, type ExpedientPriority };
