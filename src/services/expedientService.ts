'use client';

import { createClient } from '@/lib/supabase';
import type {
    Expedient,
    ExpedientType,
    ExpedientStatus,
    ExpedientPriority,
    ExpedientPractice,
    ExpedientNote,
    ExpedientNoteType,
    ExpedientAttachment,
    ExpedientDocumentType,
    ExpedientLog,
    RulesResult,
    PracticeClassification,
} from '@/types/database';

// Re-export types used by consumers
export type { PracticeResolutionStatus } from '@/types/database';

const supabase = createClient();

// ── Typed table accessor (workaround supabase types) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ── Helpers ──

function generateAuthorizationCode(type: ExpedientType): string {
    const prefixes: Record<string, string> = {
        ambulatoria: 'AMB',
        bioquimica: 'BIO',
        internacion: 'INT',
        odontologica: 'ODO',
        programas_especiales: 'PES',
        elementos: 'ELE',
        reintegros: 'REI',
    };
    const prefix = prefixes[type] || 'AUT';
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
}

function defaultAuthorizationExpiry(days = 30): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

// ── Tipos internos para parámetros ──

interface CreateExpedientInput {
    type: ExpedientType;
    priority?: ExpedientPriority;
    affiliate_id: string;
    affiliate_plan_id?: number;
    family_member_relation?: string;
    provider_id?: number;
    requesting_doctor_id?: number;
    // Médico prescriptor (texto libre)
    requesting_doctor_name?: string;
    requesting_doctor_registration?: string;
    requesting_doctor_specialty?: string;
    // Prestador / Efector (texto libre)
    provider_name?: string;
    // Prescripción
    prescription_date?: string;
    prescription_number?: string;
    order_expiry_date?: string;
    // Diagnóstico
    diagnosis_code?: string;
    diagnosis_description?: string;
    disease_id?: number;
    // Asignación
    assigned_to?: string;
    // Otros
    request_notes?: string;
    estimated_days?: number;
    requires_control_desk?: boolean;
    rules_result?: RulesResult;
    created_by: string;
    jurisdiction_id: number;
    practices: CreatePracticeInput[];
    // ── IA (Etapa 1) ──
    clinical_priority_score?: number;
    ia_suggestions?: import('@/types/database').IASuggestion[];
    ocr_text?: string;
}

interface CreatePracticeInput {
    practice_id: number;
    quantity?: number;
    practice_value?: number;
    coverage_percent?: number;
    covered_amount?: number;
    copay_amount?: number;
    copay_percent?: number;
    rule_result?: RulesResult;
    rule_classification?: PracticeClassification;
    rule_messages?: string[];
    sort_order?: number;
}

interface ResolvePracticeInput {
    diagnosis_code?: string;
    diagnosis_description?: string;
    disease_id?: number;
    resolution_notes?: string;
    coverage_percent: number;
    covered_amount: number;
    copay_amount: number;
    copay_percent?: number;
    authorization_expiry_days?: number;
}

// ── Servicio principal ──

export const ExpedientService = {

    // ────────────────────────────────────────────────────
    // CREAR EXPEDIENTE CON N PRÁCTICAS
    // ────────────────────────────────────────────────────

    async create(input: CreateExpedientInput): Promise<Expedient> {
        // 1) Insertar cabecera
        const { data: expedient, error: expError } = await db('expedients')
            .insert({
                type: input.type,
                priority: input.priority || 'normal',
                affiliate_id: input.affiliate_id,
                affiliate_plan_id: input.affiliate_plan_id,
                family_member_relation: input.family_member_relation,
                provider_id: input.provider_id,
                requesting_doctor_id: input.requesting_doctor_id,
                // Médico prescriptor (texto libre)
                requesting_doctor_name: input.requesting_doctor_name || null,
                requesting_doctor_registration: input.requesting_doctor_registration || null,
                requesting_doctor_specialty: input.requesting_doctor_specialty || null,
                // Prestador (texto libre)
                provider_name: input.provider_name || null,
                // Prescripción
                prescription_date: input.prescription_date || null,
                prescription_number: input.prescription_number || null,
                order_expiry_date: input.order_expiry_date || null,
                // Diagnóstico
                diagnosis_code: input.diagnosis_code || null,
                diagnosis_description: input.diagnosis_description || null,
                disease_id: input.disease_id || null,
                // Asignación
                assigned_to: input.assigned_to || null,
                // Otros
                request_notes: input.request_notes,
                estimated_days: input.estimated_days,
                requires_control_desk: input.requires_control_desk || false,
                rules_result: input.rules_result,
                status: 'pendiente',
                created_by: input.created_by,
                jurisdiction_id: input.jurisdiction_id,
                // IA fields (Etapa 1)
                clinical_priority_score: input.clinical_priority_score ?? 0,
                ia_suggestions: input.ia_suggestions ?? [],
                ocr_text: input.ocr_text ?? null,
                last_activity_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (expError) throw new Error(`Error creando expediente: ${expError.message}`);

        const expId = (expedient as Expedient).id;

        // 2) Insertar prácticas
        if (input.practices.length > 0) {
            const practiceRows = input.practices.map((p, idx) => ({
                expedient_id: expId,
                practice_id: p.practice_id,
                quantity: p.quantity || 1,
                practice_value: p.practice_value,
                coverage_percent: p.coverage_percent,
                covered_amount: p.covered_amount,
                copay_amount: p.copay_amount,
                copay_percent: p.copay_percent,
                rule_result: p.rule_result,
                rule_classification: p.rule_classification,
                rule_messages: p.rule_messages || [],
                sort_order: p.sort_order ?? idx,
                status: 'pendiente',
            }));

            const { error: pracError } = await db('expedient_practices')
                .insert(practiceRows);

            if (pracError) throw new Error(`Error agregando prácticas: ${pracError.message}`);
        }

        // 3) Log de creación
        await ExpedientService.addLog(expId, 'created', input.created_by, {
            type: input.type,
            affiliate_id: input.affiliate_id,
            practice_count: input.practices.length,
        });

        return expedient as Expedient;
    },

    // ────────────────────────────────────────────────────
    // LISTAR EXPEDIENTES CON FILTROS
    // ────────────────────────────────────────────────────

    async fetchAll(filters?: {
        jurisdiction_id?: number;
        type?: ExpedientType;
        status?: ExpedientStatus;
        affiliate_id?: string;
        assigned_to?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: Expedient[]; count: number }> {
        let query = db('expedients')
            .select('*, affiliate:affiliates(*)', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (filters?.jurisdiction_id) query = query.eq('jurisdiction_id', filters.jurisdiction_id);
        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.affiliate_id) query = query.eq('affiliate_id', filters.affiliate_id);
        if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw new Error(`Error obteniendo expedientes: ${error.message}`);

        return { data: (data || []) as Expedient[], count: count || 0 };
    },

    // ────────────────────────────────────────────────────
    // PENDIENTES PARA EL AUDITOR (con prioridad)
    // ────────────────────────────────────────────────────

    async fetchPending(jurisdictionId: number, type?: ExpedientType): Promise<Expedient[]> {
        let query = db('expedients')
            .select('*, affiliate:affiliates(*)')
            .eq('jurisdiction_id', jurisdictionId)
            .in('status', ['pendiente', 'en_revision', 'parcialmente_resuelto', 'observada'])
            .order('priority', { ascending: true })   // urgente primero
            .order('created_at', { ascending: true })  // más antiguas primero
            .limit(100);

        if (type) query = query.eq('type', type);

        const { data, error } = await query;
        if (error) throw new Error(`Error obteniendo pendientes: ${error.message}`);

        return (data || []) as Expedient[];
    },

    // ────────────────────────────────────────────────────
    // DETALLE DE UN EXPEDIENTE (con prácticas)
    // ────────────────────────────────────────────────────

    async fetchById(id: string): Promise<Expedient | null> {
        const { data, error } = await db('expedients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(`Error obteniendo expediente: ${error.message}`);
        }

        // Cargar prácticas del expediente
        const { data: practices, error: pracError } = await db('expedient_practices')
            .select('*')
            .eq('expedient_id', id)
            .order('sort_order', { ascending: true });

        if (pracError) throw new Error(`Error obteniendo prácticas: ${pracError.message}`);

        const expedient = data as Expedient;
        expedient.practices = (practices || []) as ExpedientPractice[];

        return expedient;
    },

    // ────────────────────────────────────────────────────
    // TOMAR PARA REVISIÓN (auditor)
    // ────────────────────────────────────────────────────

    async takeForReview(id: string, auditorId: string): Promise<void> {
        const { error } = await db('expedients')
            .update({
                status: 'en_revision',
                assigned_to: auditorId,
            })
            .eq('id', id)
            .in('status', ['pendiente', 'observada']);

        if (error) throw new Error(`Error tomando expediente: ${error.message}`);

        // Marcar todas las prácticas pendientes como en_revision
        await db('expedient_practices')
            .update({ status: 'en_revision' })
            .eq('expedient_id', id)
            .eq('status', 'pendiente');

        await ExpedientService.addLog(id, 'taken_for_review', auditorId, {});

        await ExpedientService.addNote({
            expedient_id: id,
            author_id: auditorId,
            content: 'Expediente tomado para revisión',
            note_type: 'sistema',
            status_from: 'pendiente',
            status_to: 'en_revision',
        });
    },

    // ────────────────────────────────────────────────────
    // REASIGNAR A OTRO AUDITOR (supervisor)
    // ────────────────────────────────────────────────────

    async reassign(id: string, supervisorId: string, newAuditorId: string): Promise<void> {
        const { error } = await db('expedients')
            .update({ assigned_to: newAuditorId })
            .eq('id', id);

        if (error) throw new Error(`Error reasignando: ${error.message}`);

        await ExpedientService.addLog(id, 'reassigned', supervisorId, {
            new_auditor: newAuditorId,
        });

        await ExpedientService.addNote({
            expedient_id: id,
            author_id: supervisorId,
            content: `Expediente reasignado a otro auditor`,
            note_type: 'sistema',
        });
    },

    // ────────────────────────────────────────────────────
    // RESOLVER PRÁCTICA INDIVIDUAL
    // ────────────────────────────────────────────────────

    /** Autorizar una práctica: genera código de autorización */
    async authorizePractice(
        expedientId: string,
        practiceRecordId: string,
        auditorId: string,
        data: ResolvePracticeInput,
    ): Promise<{ authorization_code: string }> {
        const expedient = await ExpedientService.fetchById(expedientId);
        if (!expedient) throw new Error('Expediente no encontrado');

        const authCode = generateAuthorizationCode(expedient.type);
        const expiry = defaultAuthorizationExpiry(data.authorization_expiry_days);

        const { error } = await db('expedient_practices')
            .update({
                status: 'autorizada',
                authorization_code: authCode,
                authorization_expiry: expiry,
                coverage_percent: data.coverage_percent,
                covered_amount: data.covered_amount,
                copay_amount: data.copay_amount,
                copay_percent: data.copay_percent,
                diagnosis_code: data.diagnosis_code,
                diagnosis_description: data.diagnosis_description,
                disease_id: data.disease_id,
                resolution_notes: data.resolution_notes,
                resolved_by: auditorId,
                resolved_at: new Date().toISOString(),
            })
            .eq('id', practiceRecordId)
            .eq('expedient_id', expedientId);

        if (error) throw new Error(`Error autorizando práctica: ${error.message}`);

        await ExpedientService.addLog(expedientId, 'practice_authorized', auditorId, {
            practice_record_id: practiceRecordId,
            authorization_code: authCode,
            coverage_percent: data.coverage_percent,
        }, practiceRecordId);

        await ExpedientService.addNote({
            expedient_id: expedientId,
            author_id: auditorId,
            content: `Práctica autorizada. Código: ${authCode}`,
            note_type: 'resolucion',
            practice_id: practiceRecordId,
        });

        return { authorization_code: authCode };
    },

    /** Autorizar parcialmente (ajustar cantidad/monto) */
    async authorizePartialPractice(
        expedientId: string,
        practiceRecordId: string,
        auditorId: string,
        data: ResolvePracticeInput & { adjusted_quantity?: number },
    ): Promise<{ authorization_code: string }> {
        const expedient = await ExpedientService.fetchById(expedientId);
        if (!expedient) throw new Error('Expediente no encontrado');

        const authCode = generateAuthorizationCode(expedient.type);
        const expiry = defaultAuthorizationExpiry(data.authorization_expiry_days);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {
            status: 'autorizada_parcial',
            authorization_code: authCode,
            authorization_expiry: expiry,
            coverage_percent: data.coverage_percent,
            covered_amount: data.covered_amount,
            copay_amount: data.copay_amount,
            copay_percent: data.copay_percent,
            diagnosis_code: data.diagnosis_code,
            diagnosis_description: data.diagnosis_description,
            disease_id: data.disease_id,
            resolution_notes: data.resolution_notes,
            resolved_by: auditorId,
            resolved_at: new Date().toISOString(),
        };

        if (data.adjusted_quantity !== undefined) {
            updateData.quantity = data.adjusted_quantity;
        }

        const { error } = await db('expedient_practices')
            .update(updateData)
            .eq('id', practiceRecordId)
            .eq('expedient_id', expedientId);

        if (error) throw new Error(`Error autorizando parcial: ${error.message}`);

        await ExpedientService.addLog(expedientId, 'practice_authorized_partial', auditorId, {
            practice_record_id: practiceRecordId,
            authorization_code: authCode,
            adjusted_quantity: data.adjusted_quantity,
        }, practiceRecordId);

        await ExpedientService.addNote({
            expedient_id: expedientId,
            author_id: auditorId,
            content: `Práctica autorizada parcialmente. Código: ${authCode}. ${data.resolution_notes || ''}`,
            note_type: 'resolucion',
            practice_id: practiceRecordId,
        });

        return { authorization_code: authCode };
    },

    /** Denegar una práctica */
    async denyPractice(
        expedientId: string,
        practiceRecordId: string,
        auditorId: string,
        data: {
            resolution_notes: string; // Motivo obligatorio
            diagnosis_code?: string;
            diagnosis_description?: string;
            disease_id?: number;
        },
    ): Promise<void> {
        const { error } = await db('expedient_practices')
            .update({
                status: 'denegada',
                resolution_notes: data.resolution_notes,
                diagnosis_code: data.diagnosis_code,
                diagnosis_description: data.diagnosis_description,
                disease_id: data.disease_id,
                resolved_by: auditorId,
                resolved_at: new Date().toISOString(),
            })
            .eq('id', practiceRecordId)
            .eq('expedient_id', expedientId);

        if (error) throw new Error(`Error denegando práctica: ${error.message}`);

        await ExpedientService.addLog(expedientId, 'practice_denied', auditorId, {
            practice_record_id: practiceRecordId,
            reason: data.resolution_notes,
        }, practiceRecordId);

        await ExpedientService.addNote({
            expedient_id: expedientId,
            author_id: auditorId,
            content: `Práctica denegada. Motivo: ${data.resolution_notes}`,
            note_type: 'resolucion',
            practice_id: practiceRecordId,
        });
    },

    /** Observar una práctica (falta documentación) */
    async observePractice(
        expedientId: string,
        practiceRecordId: string,
        auditorId: string,
        notes: string,
    ): Promise<void> {
        const { error } = await db('expedient_practices')
            .update({ status: 'observada' })
            .eq('id', practiceRecordId)
            .eq('expedient_id', expedientId);

        if (error) throw new Error(`Error observando práctica: ${error.message}`);

        await ExpedientService.addLog(expedientId, 'practice_observed', auditorId, {
            practice_record_id: practiceRecordId,
        }, practiceRecordId);

        await ExpedientService.addNote({
            expedient_id: expedientId,
            author_id: auditorId,
            content: notes,
            note_type: 'interna',
            practice_id: practiceRecordId,
        });
    },

    /** Diferir una práctica (revisar en una fecha futura) */
    async deferPractice(
        expedientId: string,
        practiceRecordId: string,
        auditorId: string,
        reviewDate: string,
        notes?: string,
    ): Promise<void> {
        const { error } = await db('expedient_practices')
            .update({
                status: 'diferida',
                review_date: reviewDate,
                resolution_notes: notes,
            })
            .eq('id', practiceRecordId)
            .eq('expedient_id', expedientId);

        if (error) throw new Error(`Error difiriendo práctica: ${error.message}`);

        await ExpedientService.addLog(expedientId, 'practice_deferred', auditorId, {
            practice_record_id: practiceRecordId,
            review_date: reviewDate,
        }, practiceRecordId);

        await ExpedientService.addNote({
            expedient_id: expedientId,
            author_id: auditorId,
            content: `Práctica diferida hasta ${reviewDate}. ${notes || ''}`,
            note_type: 'sistema',
            practice_id: practiceRecordId,
        });
    },

    // ────────────────────────────────────────────────────
    // AUTO-APROBACIÓN (motor de reglas)
    // ────────────────────────────────────────────────────

    /**
     * Auto-aprobar todas las prácticas VERDES de un expediente.
     * Retorna los códigos de autorización generados.
     */
    async autoApprovePractices(
        expedientId: string,
        systemUserId: string,
    ): Promise<{ authorized: Array<{ practiceRecordId: string; authorization_code: string }> }> {
        const expedient = await ExpedientService.fetchById(expedientId);
        if (!expedient) throw new Error('Expediente no encontrado');

        const greenPractices = (expedient.practices || []).filter(
            (p) => p.rule_result === 'verde' && p.status === 'pendiente',
        );

        const authorized: Array<{ practiceRecordId: string; authorization_code: string }> = [];

        for (const practice of greenPractices) {
            const authCode = generateAuthorizationCode(expedient.type);
            const expiry = defaultAuthorizationExpiry();

            await db('expedient_practices')
                .update({
                    status: 'autorizada',
                    authorization_code: authCode,
                    authorization_expiry: expiry,
                    resolved_by: systemUserId,
                    resolved_at: new Date().toISOString(),
                })
                .eq('id', practice.id);

            authorized.push({ practiceRecordId: practice.id, authorization_code: authCode });
        }

        if (authorized.length > 0) {
            await ExpedientService.addLog(expedientId, 'auto_approved', systemUserId, {
                count: authorized.length,
                codes: authorized.map((a) => a.authorization_code),
            });

            await ExpedientService.addNote({
                expedient_id: expedientId,
                author_id: systemUserId,
                content: `${authorized.length} práctica(s) auto-aprobada(s) por motor de reglas`,
                note_type: 'sistema',
            });
        }

        return { authorized };
    },

    // ────────────────────────────────────────────────────
    // OBSERVAR EXPEDIENTE COMPLETO (devolver al admin)
    // ────────────────────────────────────────────────────

    async observe(id: string, auditorId: string, notes: string): Promise<void> {
        const { error } = await db('expedients')
            .update({ status: 'observada' })
            .eq('id', id);

        if (error) throw new Error(`Error observando expediente: ${error.message}`);

        await ExpedientService.addLog(id, 'observed', auditorId, { notes });

        await ExpedientService.addNote({
            expedient_id: id,
            author_id: auditorId,
            content: notes,
            note_type: 'interna',
            status_from: 'en_revision',
            status_to: 'observada',
        });
    },

    // ────────────────────────────────────────────────────
    // REENVIAR OBSERVADA (admin responde al auditor)
    // ────────────────────────────────────────────────────

    async resubmitObserved(id: string, adminId: string, notes?: string): Promise<void> {
        const { error } = await db('expedients')
            .update({ status: 'pendiente' })
            .eq('id', id)
            .eq('status', 'observada');

        if (error) throw new Error(`Error reenviando expediente: ${error.message}`);

        // Reabrir prácticas observadas
        await db('expedient_practices')
            .update({ status: 'pendiente' })
            .eq('expedient_id', id)
            .eq('status', 'observada');

        await ExpedientService.addLog(id, 'resubmitted', adminId, { notes });

        await ExpedientService.addNote({
            expedient_id: id,
            author_id: adminId,
            content: notes || 'Expediente reenviado con documentación adicional',
            note_type: 'interna',
            status_from: 'observada',
            status_to: 'pendiente',
        });
    },

    // ────────────────────────────────────────────────────
    // APELAR (reabre denegada → va a supervisor)
    // ────────────────────────────────────────────────────

    async appeal(id: string, userId: string, reason: string): Promise<void> {
        const { error } = await db('expedients')
            .update({
                status: 'en_apelacion',
                resolution_notes: reason,
            })
            .eq('id', id)
            .in('status', ['resuelto', 'parcialmente_resuelto']);

        if (error) throw new Error(`Error apelando: ${error.message}`);

        await ExpedientService.addLog(id, 'appealed', userId, { reason });

        await ExpedientService.addNote({
            expedient_id: id,
            author_id: userId,
            content: `Apelación: ${reason}`,
            note_type: 'interna',
            status_from: 'resuelto',
            status_to: 'en_apelacion',
        });
    },

    // ────────────────────────────────────────────────────
    // ANULAR EXPEDIENTE
    // ────────────────────────────────────────────────────

    async cancel(id: string, userId: string, reason: string): Promise<void> {
        const { error } = await db('expedients')
            .update({
                status: 'anulada',
                resolution_notes: reason,
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw new Error(`Error anulando: ${error.message}`);

        await ExpedientService.addLog(id, 'cancelled', userId, { reason });

        await ExpedientService.addNote({
            expedient_id: id,
            author_id: userId,
            content: `Expediente anulado. Motivo: ${reason}`,
            note_type: 'sistema',
            status_from: '',
            status_to: 'anulada',
        });
    },

    // ────────────────────────────────────────────────────
    // MESA DE CONTROL
    // ────────────────────────────────────────────────────

    async approveControlDesk(id: string, supervisorId: string): Promise<void> {
        const { error } = await db('expedients')
            .update({
                control_desk_status: 'aprobado',
                control_desk_by: supervisorId,
                control_desk_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('requires_control_desk', true);

        if (error) throw new Error(`Error en mesa de control: ${error.message}`);

        await ExpedientService.addLog(id, 'control_desk_approved', supervisorId, {});
    },

    async rejectControlDesk(id: string, supervisorId: string, reason: string): Promise<void> {
        const { error } = await db('expedients')
            .update({
                control_desk_status: 'rechazado',
                control_desk_by: supervisorId,
                control_desk_at: new Date().toISOString(),
                status: 'observada',
            })
            .eq('id', id)
            .eq('requires_control_desk', true);

        if (error) throw new Error(`Error en mesa de control: ${error.message}`);

        await ExpedientService.addLog(id, 'control_desk_rejected', supervisorId, { reason });

        await ExpedientService.addNote({
            expedient_id: id,
            author_id: supervisorId,
            content: `Rechazado en mesa de control: ${reason}`,
            note_type: 'sistema',
        });
    },

    // ────────────────────────────────────────────────────
    // NOTAS
    // ────────────────────────────────────────────────────

    async addNote(data: {
        expedient_id: string;
        author_id: string;
        content: string;
        note_type: ExpedientNoteType;
        status_from?: string;
        status_to?: string;
        practice_id?: string;
    }): Promise<ExpedientNote> {
        const { data: note, error } = await db('expedient_notes')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(`Error agregando nota: ${error.message}`);
        return note as ExpedientNote;
    },

    async fetchNotes(expedientId: string): Promise<ExpedientNote[]> {
        const { data, error } = await db('expedient_notes')
            .select('*')
            .eq('expedient_id', expedientId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(`Error obteniendo notas: ${error.message}`);
        return (data || []) as ExpedientNote[];
    },

    // ────────────────────────────────────────────────────
    // ADJUNTOS
    // ────────────────────────────────────────────────────

    async uploadAttachment(
        expedientId: string,
        file: File,
        documentType: ExpedientDocumentType,
        uploadedBy: string,
    ): Promise<ExpedientAttachment> {
        const filePath = `expedients/${expedientId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase
            .storage
            .from('audit-attachments')
            .upload(filePath, file);

        if (uploadError) throw new Error(`Error subiendo archivo: ${uploadError.message}`);

        const { data: attachment, error } = await db('expedient_attachments')
            .insert({
                expedient_id: expedientId,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                storage_path: filePath,
                document_type: documentType,
                uploaded_by: uploadedBy,
            })
            .select()
            .single();

        if (error) throw new Error(`Error registrando adjunto: ${error.message}`);

        await ExpedientService.addLog(expedientId, 'attachment_added', uploadedBy, {
            file_name: file.name,
            document_type: documentType,
        });

        return attachment as ExpedientAttachment;
    },

    async fetchAttachments(expedientId: string): Promise<ExpedientAttachment[]> {
        const { data, error } = await db('expedient_attachments')
            .select('*')
            .eq('expedient_id', expedientId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(`Error obteniendo adjuntos: ${error.message}`);
        return (data || []) as ExpedientAttachment[];
    },

    async getAttachmentUrl(storagePath: string): Promise<string> {
        const { data } = supabase
            .storage
            .from('audit-attachments')
            .getPublicUrl(storagePath);

        return data.publicUrl;
    },

    // ────────────────────────────────────────────────────
    // LOG DE TRAZABILIDAD
    // ────────────────────────────────────────────────────

    async addLog(
        expedientId: string,
        action: string,
        performedBy: string,
        details: Record<string, unknown> = {},
        practiceRecordId?: string,
    ): Promise<void> {
        await db('expedient_log')
            .insert({
                expedient_id: expedientId,
                action,
                details,
                practice_id: practiceRecordId,
                performed_by: performedBy,
            });
    },

    async fetchLog(expedientId: string): Promise<ExpedientLog[]> {
        const { data, error } = await db('expedient_log')
            .select('*')
            .eq('expedient_id', expedientId)
            .order('performed_at', { ascending: true });

        if (error) throw new Error(`Error obteniendo log: ${error.message}`);
        return (data || []) as ExpedientLog[];
    },

    // ────────────────────────────────────────────────────
    // CONTADORES (para bandeja)
    // ────────────────────────────────────────────────────

    async getCounts(jurisdictionId: number): Promise<Record<ExpedientStatus, number>> {
        const statuses: ExpedientStatus[] = [
            'borrador', 'pendiente', 'en_revision', 'parcialmente_resuelto',
            'resuelto', 'observada', 'en_apelacion', 'anulada',
        ];
        const counts: Record<string, number> = {};

        for (const status of statuses) {
            const { count } = await db('expedients')
                .select('*', { count: 'exact', head: true })
                .eq('jurisdiction_id', jurisdictionId)
                .eq('status', status);
            counts[status] = count || 0;
        }

        return counts as Record<ExpedientStatus, number>;
    },

    // ────────────────────────────────────────────────────
    // HISTORIAL DEL AFILIADO
    // ────────────────────────────────────────────────────

    async fetchAffiliateHistory(affiliateId: string): Promise<Expedient[]> {
        const { data, error } = await db('expedients')
            .select('*')
            .eq('affiliate_id', affiliateId)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw new Error(`Error obteniendo historial: ${error.message}`);
        return (data || []) as Expedient[];
    },

    /**
     * Prácticas del afiliado con autorización activa (para control de frecuencia)
     */
    async fetchAffiliatePracticeUsage(
        affiliateId: string,
        practiceId: number,
        sinceDate: string,
    ): Promise<{ total_quantity: number; records: ExpedientPractice[] }> {
        // Buscar expedientes del afiliado
        const { data: expedients } = await db('expedients')
            .select('id')
            .eq('affiliate_id', affiliateId)
            .gte('created_at', sinceDate);

        if (!expedients || expedients.length === 0) {
            return { total_quantity: 0, records: [] };
        }

        const expIds = (expedients as Array<{ id: string }>).map((e) => e.id);

        // Buscar prácticas autorizadas de esa práctica
        const { data: practices, error } = await db('expedient_practices')
            .select('*')
            .in('expedient_id', expIds)
            .eq('practice_id', practiceId)
            .in('status', ['autorizada', 'autorizada_parcial']);

        if (error) throw new Error(`Error obteniendo uso: ${error.message}`);

        const records = (practices || []) as ExpedientPractice[];
        const total_quantity = records.reduce((sum, p) => sum + (p.quantity || 0), 0);

        return { total_quantity, records };
    },
};
