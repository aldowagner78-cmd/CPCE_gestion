'use client';

import { createClient } from '@/lib/supabase';
import type {
    AuditRequest,
    AuditRequestStatus,
    AuditRequestType,
    AuditRequestNote,
    AuditRequestAttachment,
    AuditRequestLog,
} from '@/types/database';

const supabase = createClient();

// ── Typed table accessors ──
// Workaround: Supabase generic inference no resuelve Insert/Update/Row para
// tablas añadidas manualmente a supabase.ts. Se usa `as any` en los argumentos
// de insert/update únicamente. El resto de la cadena (.select, .eq, etc.)
// sigue tipo-seguro. Se regenerará correctamente al ejecutar `supabase gen types`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ── Helpers ──

function generateAuthorizationCode(type: AuditRequestType): string {
    const prefix = type === 'ambulatoria' ? 'AMB' : type === 'bioquimica' ? 'BIO' : 'INT';
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
}

// ── Solicitudes CRUD ──

export const AuditRequestService = {

    /**
     * Crear nueva solicitud (rol administrativo)
     */
    async create(data: {
        type: AuditRequestType;
        affiliate_id: string;
        affiliate_plan_id?: number;
        family_member_relation?: string;
        practice_id: number;
        practice_quantity?: number;
        provider_id?: number;
        requesting_doctor_id?: number;
        request_notes?: string;
        priority?: 'normal' | 'urgente';
        coverage_percent?: number;
        covered_amount?: number;
        copay_amount?: number;
        practice_value?: number;
        estimated_days?: number;
        created_by: string;
        jurisdiction_id: number;
    }): Promise<AuditRequest> {
        const { data: request, error } = await db('audit_requests')            
            .insert({
                type: data.type,
                priority: data.priority || 'normal',
                affiliate_id: data.affiliate_id,
                affiliate_plan_id: data.affiliate_plan_id,
                family_member_relation: data.family_member_relation,
                practice_id: data.practice_id,
                practice_quantity: data.practice_quantity || 1,
                provider_id: data.provider_id,
                requesting_doctor_id: data.requesting_doctor_id,
                request_notes: data.request_notes,
                coverage_percent: data.coverage_percent,
                covered_amount: data.covered_amount,
                copay_amount: data.copay_amount,
                practice_value: data.practice_value,
                estimated_days: data.estimated_days,
                status: 'pendiente',
                created_by: data.created_by,
                jurisdiction_id: data.jurisdiction_id,
            })
            .select()
            .single();

        if (error) throw new Error(`Error creando solicitud: ${error.message}`);

        // Log de creación
        await AuditRequestService.addLog(request.id, 'created', data.created_by, {
            type: data.type,
            affiliate_id: data.affiliate_id,
            practice_id: data.practice_id,
        });

        return request as AuditRequest;
    },

    /**
     * Obtener solicitudes con filtros
     */
    async fetchAll(filters?: {
        jurisdiction_id?: number;
        type?: AuditRequestType;
        status?: AuditRequestStatus;
        affiliate_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: AuditRequest[]; count: number }> {
        let query = db('audit_requests')            
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (filters?.jurisdiction_id) {
            query = query.eq('jurisdiction_id', filters.jurisdiction_id);
        }
        if (filters?.type) {
            query = query.eq('type', filters.type);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.affiliate_id) {
            query = query.eq('affiliate_id', filters.affiliate_id);
        }

        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw new Error(`Error obteniendo solicitudes: ${error.message}`);

        return { data: (data || []) as AuditRequest[], count: count || 0 };
    },

    /**
     * Obtener solicitudes pendientes para el auditor
     */
    async fetchPending(jurisdictionId: number, type?: AuditRequestType): Promise<AuditRequest[]> {
        let query = db('audit_requests')            
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .in('status', ['pendiente', 'en_revision', 'observada'])
            .order('priority', { ascending: true })  // urgente primero
            .order('created_at', { ascending: true }) // las más antiguas primero
            .limit(100);

        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Error obteniendo pendientes: ${error.message}`);

        return (data || []) as AuditRequest[];
    },

    /**
     * Obtener detalle completo de una solicitud
     */
    async fetchById(id: string): Promise<AuditRequest | null> {
        const { data, error } = await db('audit_requests')            
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(`Error obteniendo solicitud: ${error.message}`);
        }

        return data as AuditRequest;
    },

    /**
     * Tomar una solicitud para revisión (auditor)
     */
    async takeForReview(id: string, auditorId: string): Promise<void> {
        const { error } = await db('audit_requests')            
            .update({ status: 'en_revision' })
            .eq('id', id)
            .eq('status', 'pendiente');

        if (error) throw new Error(`Error tomando solicitud: ${error.message}`);

        await AuditRequestService.addLog(id, 'status_changed', auditorId, {
            from: 'pendiente',
            to: 'en_revision',
        });

        await AuditRequestService.addNote({
            request_id: id,
            author_id: auditorId,
            content: 'Solicitud tomada para revisión',
            note_type: 'sistema',
            status_from: 'pendiente',
            status_to: 'en_revision',
        });
    },

    /**
     * Autorizar solicitud
     */
    async authorize(id: string, auditorId: string, data: {
        diagnosis_code?: string;
        diagnosis_description?: string;
        disease_id?: number;
        resolution_notes?: string;
        coverage_percent: number;
        covered_amount: number;
        copay_amount: number;
        practice_value: number;
        authorization_expiry?: string;
    }): Promise<{ authorization_code: string }> {
        // Obtener la solicitud para saber el tipo
        const request = await AuditRequestService.fetchById(id);
        if (!request) throw new Error('Solicitud no encontrada');

        const authCode = generateAuthorizationCode(request.type);

        const { error } = await db('audit_requests')            
            .update({
                status: 'autorizada',
                diagnosis_code: data.diagnosis_code,
                diagnosis_description: data.diagnosis_description,
                disease_id: data.disease_id,
                resolution_notes: data.resolution_notes,
                coverage_percent: data.coverage_percent,
                covered_amount: data.covered_amount,
                copay_amount: data.copay_amount,
                practice_value: data.practice_value,
                authorization_code: authCode,
                authorization_expiry: data.authorization_expiry,
                resolved_by: auditorId,
                resolved_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw new Error(`Error autorizando: ${error.message}`);

        await AuditRequestService.addLog(id, 'authorized', auditorId, {
            authorization_code: authCode,
            coverage_percent: data.coverage_percent,
            copay_amount: data.copay_amount,
            diagnosis: data.diagnosis_code,
        });

        await AuditRequestService.addNote({
            request_id: id,
            author_id: auditorId,
            content: `Solicitud autorizada. Código: ${authCode}. ${data.resolution_notes || ''}`,
            note_type: 'resolucion',
            status_from: request.status,
            status_to: 'autorizada',
        });

        return { authorization_code: authCode };
    },

    /**
     * Denegar solicitud
     */
    async deny(id: string, auditorId: string, data: {
        resolution_notes: string; // Motivo obligatorio
        diagnosis_code?: string;
        diagnosis_description?: string;
        disease_id?: number;
    }): Promise<void> {
        const request = await AuditRequestService.fetchById(id);
        if (!request) throw new Error('Solicitud no encontrada');

        const { error } = await db('audit_requests')            
            .update({
                status: 'denegada',
                resolution_notes: data.resolution_notes,
                diagnosis_code: data.diagnosis_code,
                diagnosis_description: data.diagnosis_description,
                disease_id: data.disease_id,
                resolved_by: auditorId,
                resolved_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw new Error(`Error denegando: ${error.message}`);

        await AuditRequestService.addLog(id, 'denied', auditorId, {
            reason: data.resolution_notes,
        });

        await AuditRequestService.addNote({
            request_id: id,
            author_id: auditorId,
            content: `Solicitud denegada. Motivo: ${data.resolution_notes}`,
            note_type: 'resolucion',
            status_from: request.status,
            status_to: 'denegada',
        });
    },

    /**
     * Observar solicitud (dejar pendiente con comentario)
     */
    async observe(id: string, auditorId: string, notes: string): Promise<void> {
        const request = await AuditRequestService.fetchById(id);
        if (!request) throw new Error('Solicitud no encontrada');

        const { error } = await db('audit_requests')            
            .update({ status: 'observada' })
            .eq('id', id);

        if (error) throw new Error(`Error observando: ${error.message}`);

        await AuditRequestService.addLog(id, 'observed', auditorId, { notes });

        await AuditRequestService.addNote({
            request_id: id,
            author_id: auditorId,
            content: notes,
            note_type: 'interna',
            status_from: request.status,
            status_to: 'observada',
        });
    },

    /**
     * Anular solicitud
     */
    async cancel(id: string, userId: string, reason: string): Promise<void> {
        const request = await AuditRequestService.fetchById(id);
        if (!request) throw new Error('Solicitud no encontrada');

        const { error } = await db('audit_requests')            
            .update({
                status: 'anulada',
                resolution_notes: reason,
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw new Error(`Error anulando: ${error.message}`);

        await AuditRequestService.addLog(id, 'cancelled', userId, { reason });

        await AuditRequestService.addNote({
            request_id: id,
            author_id: userId,
            content: `Solicitud anulada. Motivo: ${reason}`,
            note_type: 'sistema',
            status_from: request.status,
            status_to: 'anulada',
        });
    },

    // ── Notas ──

    async addNote(data: {
        request_id: string;
        author_id: string;
        content: string;
        note_type: 'interna' | 'para_afiliado' | 'sistema' | 'resolucion';
        status_from?: string;
        status_to?: string;
    }): Promise<AuditRequestNote> {
        const { data: note, error } = await db('audit_request_notes')            
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(`Error agregando nota: ${error.message}`);
        return note as AuditRequestNote;
    },

    async fetchNotes(requestId: string): Promise<AuditRequestNote[]> {
        const { data, error } = await db('audit_request_notes')            
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(`Error obteniendo notas: ${error.message}`);
        return (data || []) as AuditRequestNote[];
    },

    // ── Adjuntos ──

    async uploadAttachment(
        requestId: string,
        file: File,
        documentType: AuditRequestAttachment['document_type'],
        uploadedBy: string
    ): Promise<AuditRequestAttachment> {
        // Subir archivo a Supabase Storage
        const filePath = `${requestId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase
            .storage
            .from('audit-attachments')
            .upload(filePath, file);

        if (uploadError) throw new Error(`Error subiendo archivo: ${uploadError.message}`);

        // Registrar en tabla
        const { data: attachment, error } = await db('audit_request_attachments')            
            .insert({
                request_id: requestId,
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

        await AuditRequestService.addLog(requestId, 'attachment_added', uploadedBy, {
            file_name: file.name,
            document_type: documentType,
        });

        return attachment as AuditRequestAttachment;
    },

    async fetchAttachments(requestId: string): Promise<AuditRequestAttachment[]> {
        const { data, error } = await db('audit_request_attachments')            
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(`Error obteniendo adjuntos: ${error.message}`);
        return (data || []) as AuditRequestAttachment[];
    },

    async getAttachmentUrl(storagePath: string): Promise<string> {
        const { data } = supabase
            .storage
            .from('audit-attachments')
            .getPublicUrl(storagePath);

        return data.publicUrl;
    },

    // ── Log de auditoría ──

    async addLog(
        requestId: string,
        action: string,
        performedBy: string,
        details: Record<string, unknown> = {}
    ): Promise<void> {
        await db('audit_request_log')            
            .insert({
                request_id: requestId,
                action,
                details,
                performed_by: performedBy,
            });
    },

    async fetchLog(requestId: string): Promise<AuditRequestLog[]> {
        const { data, error } = await db('audit_request_log')            
            .select('*')
            .eq('request_id', requestId)
            .order('performed_at', { ascending: true });

        if (error) throw new Error(`Error obteniendo log: ${error.message}`);
        return (data || []) as AuditRequestLog[];
    },

    // ── Contadores ──

    async getCounts(jurisdictionId: number): Promise<Record<AuditRequestStatus, number>> {
        const statuses: AuditRequestStatus[] = [
            'pendiente', 'en_revision', 'autorizada', 'denegada', 'observada', 'anulada', 'vencida'
        ];
        const counts: Record<string, number> = {};

        for (const status of statuses) {
            const { count } = await db('audit_requests')                
                .select('*', { count: 'exact', head: true })
                .eq('jurisdiction_id', jurisdictionId)
                .eq('status', status);
            counts[status] = count || 0;
        }

        return counts as Record<AuditRequestStatus, number>;
    },

    // ── Historial de consumo de un afiliado ──

    async fetchAffiliateHistory(affiliateId: string): Promise<AuditRequest[]> {
        const { data, error } = await db('audit_requests')            
            .select('*')
            .eq('affiliate_id', affiliateId)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw new Error(`Error obteniendo historial: ${error.message}`);
        return (data || []) as AuditRequest[];
    },
};
