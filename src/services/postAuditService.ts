'use client';

import { createClient } from '@/lib/supabase';
import type {
    PostAudit,
    PostAuditItem,
    PostAuditItemMatchStatus,
    PostAuditItemAction,
    PostAuditIssue,
    PostAuditLog,
    DebitNote,
    DebitNoteItem,
    DebitType,
} from '@/types/database';

const supabase = createClient();

// ── Typed table accessor (workaround supabase types) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ═══════════════════════════════════════════════════════
// POST-AUDIT SERVICE
// Cruce de facturas vs autorizaciones + débitos
// ═══════════════════════════════════════════════════════

export const PostAuditService = {
    // ── FETCH: Listado con filtros ──
    async fetchAll(filters?: {
        jurisdictionId?: number;
        status?: string;
        providerId?: number;
        periodMonth?: number;
        periodYear?: number;
        assignedTo?: string;
    }): Promise<PostAudit[]> {
        let query = db('post_audits')
            .select(`
                *,
                provider:providers(id, name, cuit, type),
                invoice:invoices(id, invoice_number, invoice_type, total, status),
                assigned_user:users!post_audits_assigned_to_fkey(full_name),
                resolved_user:users!post_audits_resolved_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false });

        if (filters?.jurisdictionId) {
            query = query.eq('jurisdiction_id', filters.jurisdictionId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.providerId) {
            query = query.eq('provider_id', filters.providerId);
        }
        if (filters?.periodMonth) {
            query = query.eq('period_month', filters.periodMonth);
        }
        if (filters?.periodYear) {
            query = query.eq('period_year', filters.periodYear);
        }
        if (filters?.assignedTo) {
            query = query.eq('assigned_to', filters.assignedTo);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as PostAudit[];
    },

    // ── FETCH: Detalle completo ──
    async fetchById(id: string): Promise<PostAudit | null> {
        const { data, error } = await db('post_audits')
            .select(`
                *,
                provider:providers(id, name, cuit, type),
                invoice:invoices(id, invoice_number, invoice_type, total, status, period_month, period_year, provider_id),
                assigned_user:users!post_audits_assigned_to_fkey(full_name),
                resolved_user:users!post_audits_resolved_by_fkey(full_name)
            `)
            .eq('id', id)
            .single();
        if (error) return null;
        return data as PostAudit;
    },

    // ── FETCH: Items del cruce ──
    async fetchItems(postAuditId: string): Promise<PostAuditItem[]> {
        const { data, error } = await db('post_audit_items')
            .select(`
                *,
                practice:practices(id, code, description),
                affiliate:affiliates(id, name, affiliate_number),
                authorization:authorizations(authorization_number, status, request_date)
            `)
            .eq('post_audit_id', postAuditId)
            .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data || []) as PostAuditItem[];
    },

    // ── FETCH: Log de trazabilidad ──
    async fetchLog(postAuditId: string): Promise<PostAuditLog[]> {
        const { data, error } = await db('post_audit_log')
            .select(`
                *,
                user:users(full_name)
            `)
            .eq('post_audit_id', postAuditId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []) as PostAuditLog[];
    },

    // ── FETCH: Notas de débito de una auditoría ──
    async fetchDebitNotes(postAuditId: string): Promise<DebitNote[]> {
        const { data, error } = await db('debit_notes')
            .select(`
                *,
                provider:providers(id, name, cuit),
                items:debit_note_items(*)
            `)
            .eq('post_audit_id', postAuditId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as DebitNote[];
    },

    // ── CONTADORES para la bandeja ──
    async getCounts(jurisdictionId?: number): Promise<Record<string, number>> {
        const statuses = ['pendiente', 'en_revision', 'aprobada', 'con_debitos', 'en_disputa', 'cerrada'];
        const counts: Record<string, number> = {};

        for (const status of statuses) {
            let query = db('post_audits').select('id', { count: 'exact', head: true }).eq('status', status);
            if (jurisdictionId) query = query.eq('jurisdiction_id', jurisdictionId);
            const { count } = await query;
            counts[status] = count || 0;
        }

        counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
        return counts;
    },

    // ═══════════════════════════════════════════════════
    // CREAR AUDITORÍA POSTERIOR desde una factura
    // ═══════════════════════════════════════════════════
    async createFromInvoice(
        invoiceId: number,
        userId: string,
        jurisdictionId: number,
    ): Promise<PostAudit> {
        // 1. Obtener la factura con sus detalles
        const { data: invoice, error: invErr } = await db('invoices')
            .select('*, details:invoice_details(*)')
            .eq('id', invoiceId)
            .single();
        if (invErr || !invoice) throw new Error('Factura no encontrada');

        // 2. Crear la cabecera de la auditoría posterior
        const { data: postAudit, error: paErr } = await db('post_audits')
            .insert({
                invoice_id: invoiceId,
                provider_id: invoice.provider_id,
                period_month: invoice.period_month,
                period_year: invoice.period_year,
                invoiced_total: invoice.total || 0,
                status: 'pendiente',
                created_by: userId,
                jurisdiction_id: jurisdictionId,
            })
            .select()
            .single();
        if (paErr || !postAudit) throw new Error('Error creando auditoría posterior');

        // 3. Crear items del cruce (1 por cada detalle de factura)
        const details = invoice.details || [];
        if (details.length > 0) {
            const items = details.map((d: Record<string, unknown>, idx: number) => ({
                post_audit_id: postAudit.id,
                invoice_detail_id: d.id,
                practice_id: d.practice_id,
                practice_description: d.description,
                affiliate_id: d.affiliate_id,
                invoiced_quantity: d.quantity || 1,
                invoiced_unit_price: d.unit_price,
                invoiced_total: d.total_price || d.subtotal,
                authorization_id: d.authorization_id,
                match_status: 'pendiente',
                sort_order: idx,
            }));

            await db('post_audit_items').insert(items);
        }

        // 4. Log
        await this.addLog(postAudit.id, 'creada', userId, {
            invoice_number: invoice.invoice_number,
            total: invoice.total,
            detail_count: details.length,
        });

        return postAudit as PostAudit;
    },

    // ═══════════════════════════════════════════════════
    // MOTOR DE CRUCE AUTOMÁTICO
    // Cruza cada línea de la factura contra autorizaciones
    // ═══════════════════════════════════════════════════
    async runAutoCrossCheck(postAuditId: string, userId: string): Promise<{
        result: 'ok' | 'warning' | 'error';
        messages: PostAuditIssue[];
        itemsChecked: number;
        issuesFound: number;
    }> {
        const items = await this.fetchItems(postAuditId);
        const messages: PostAuditIssue[] = [];
        let issuesFound = 0;
        let authorizedTotal = 0;

        for (const item of items) {
            const itemIssues: PostAuditIssue[] = [];
            let matchStatus: PostAuditItemMatchStatus = 'ok';
            let debitAmount = 0;

            if (!item.authorization_id) {
                // ── Sin autorización vinculada: buscar por práctica + afiliado ──
                const match = await this._findMatchingAuthorization(item);

                if (!match) {
                    matchStatus = 'sin_autorizacion';
                    debitAmount = item.invoiced_total || 0;
                    itemIssues.push({
                        type: 'no_authorization',
                        message: `Práctica ${item.practice_description || item.practice_id} facturada sin autorización`,
                        severity: 'error',
                    });
                    issuesFound++;
                } else {
                    // Encontramos una autorización → vincular y verificar
                    await db('post_audit_items')
                        .update({
                            authorization_id: match.authorization_id,
                            authorization_detail_id: match.detail_id,
                            authorized_quantity: match.quantity,
                            authorized_unit_price: match.unit_price,
                            authorized_total: match.total,
                            authorized_coverage_percent: match.coverage_percent,
                        })
                        .eq('id', item.id);

                    // Actualizar item local para las verificaciones siguientes
                    item.authorization_id = match.authorization_id;
                    item.authorized_quantity = match.quantity;
                    item.authorized_unit_price = match.unit_price;
                    item.authorized_total = match.total;
                    authorizedTotal += match.total || 0;

                    // Verificar coincidencia
                    const checkResult = this._checkItemMatch(item, match);
                    matchStatus = checkResult.status;
                    debitAmount = checkResult.debitAmount;
                    itemIssues.push(...checkResult.issues);
                    if (checkResult.issues.length > 0) issuesFound++;
                }
            } else {
                // ── Autorización ya vinculada (desde invoice_details) ──
                const { data: authDetail } = await db('authorization_details')
                    .select('*')
                    .eq('authorization_id', item.authorization_id)
                    .eq('practice_id', item.practice_id)
                    .maybeSingle();

                const { data: auth } = await db('authorizations')
                    .select('*')
                    .eq('id', item.authorization_id)
                    .single();

                if (auth && authDetail) {
                    const match = {
                        authorization_id: auth.id,
                        detail_id: authDetail.id,
                        quantity: authDetail.quantity,
                        unit_price: authDetail.unit_price,
                        total: authDetail.total_price,
                        coverage_percent: authDetail.coverage_percent,
                        status: auth.status,
                        request_date: auth.request_date,
                        resolution_date: auth.resolution_date,
                    };

                    await db('post_audit_items')
                        .update({
                            authorization_detail_id: authDetail.id,
                            authorized_quantity: authDetail.quantity,
                            authorized_unit_price: authDetail.unit_price,
                            authorized_total: authDetail.total_price,
                            authorized_coverage_percent: authDetail.coverage_percent,
                        })
                        .eq('id', item.id);

                    authorizedTotal += authDetail.total_price || 0;

                    // Verificar estado de la autorización
                    if (auth.status === 'vencida') {
                        matchStatus = 'autorizacion_vencida';
                        debitAmount = item.invoiced_total || 0;
                        itemIssues.push({
                            type: 'expired_authorization',
                            message: `Autorización ${auth.authorization_number} vencida al momento de la factura`,
                            severity: 'error',
                        });
                        issuesFound++;
                    } else if (auth.status === 'anulada' || auth.status === 'rechazada') {
                        matchStatus = 'sin_autorizacion';
                        debitAmount = item.invoiced_total || 0;
                        itemIssues.push({
                            type: 'invalid_authorization',
                            message: `Autorización ${auth.authorization_number} en estado "${auth.status}"`,
                            severity: 'error',
                        });
                        issuesFound++;
                    } else {
                        const checkResult = this._checkItemMatch(item, match);
                        matchStatus = checkResult.status;
                        debitAmount = checkResult.debitAmount;
                        itemIssues.push(...checkResult.issues);
                        if (checkResult.issues.length > 0) issuesFound++;
                    }
                } else {
                    matchStatus = 'sin_autorizacion';
                    debitAmount = item.invoiced_total || 0;
                    itemIssues.push({
                        type: 'authorization_not_found',
                        message: `Autorización #${item.authorization_id} referenciada pero no encontrada`,
                        severity: 'error',
                    });
                    issuesFound++;
                }
            }

            // Actualizar el item con el resultado del cruce
            await db('post_audit_items')
                .update({
                    match_status: matchStatus,
                    issues: itemIssues,
                    debit_amount: debitAmount,
                })
                .eq('id', item.id);

            if (itemIssues.length > 0) {
                messages.push(...itemIssues);
            }
        }

        // Determinar resultado global
        const hasErrors = messages.some(m => m.severity === 'error');
        const hasWarnings = messages.some(m => m.severity === 'warning');
        const result = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

        // Calcular totales
        const postAudit = await this.fetchById(postAuditId);
        const invoicedTotal = postAudit?.invoiced_total || 0;
        const difference = invoicedTotal - authorizedTotal;
        const debitTotal = items.reduce((sum, it) => {
            const found = messages.filter(m => m.type !== 'info');
            return sum + (found.length > 0 ? (it.invoiced_total || 0) - (it.authorized_total || 0) : 0);
        }, 0);

        // Recalcular debit_total sumando los débitos de cada item
        const updatedItems = await this.fetchItems(postAuditId);
        const actualDebitTotal = updatedItems.reduce((sum, it) => sum + (it.debit_amount || 0), 0);

        // Actualizar cabecera
        await db('post_audits')
            .update({
                authorized_total: authorizedTotal,
                difference: difference,
                debit_total: actualDebitTotal,
                auto_check_result: result,
                auto_check_messages: messages.slice(0, 50), // Limitar a 50 mensajes
                auto_check_at: new Date().toISOString(),
            })
            .eq('id', postAuditId);

        // Log
        await this.addLog(postAuditId, 'cruce_automatico', userId, {
            result,
            items_checked: items.length,
            issues_found: issuesFound,
            authorized_total: authorizedTotal,
            debit_total: actualDebitTotal,
        });

        // Suprimir TS unused
        void debitTotal;

        return { result, messages, itemsChecked: items.length, issuesFound };
    },

    // ── Helper: Buscar autorización que matchee con el item ──
    async _findMatchingAuthorization(item: PostAuditItem): Promise<{
        authorization_id: number;
        detail_id: number;
        quantity: number;
        unit_price: number;
        total: number;
        coverage_percent: number;
        status: string;
        request_date?: string;
        resolution_date?: string;
    } | null> {
        if (!item.practice_id || !item.affiliate_id) return null;

        // Buscar en authorization_details por práctica + afiliado
        const { data: details } = await db('authorization_details')
            .select(`
                *,
                authorization:authorizations(*)
            `)
            .eq('practice_id', item.practice_id);

        if (!details || details.length === 0) return null;

        // Filtrar por afiliado y estado válido
        for (const d of details) {
            const auth = d.authorization;
            if (!auth) continue;
            if (auth.affiliate_id !== item.affiliate_id) continue;
            if (!['aprobada', 'pendiente'].includes(auth.status)) continue;

            return {
                authorization_id: auth.id,
                detail_id: d.id,
                quantity: d.quantity || 1,
                unit_price: d.unit_price || 0,
                total: d.total_price || 0,
                coverage_percent: d.coverage_percent || 100,
                status: auth.status,
                request_date: auth.request_date,
                resolution_date: auth.resolution_date,
            };
        }

        return null;
    },

    // ── Helper: Verificar coincidencia item factura vs autorización ──
    _checkItemMatch(
        item: PostAuditItem,
        match: { quantity: number; unit_price: number; total: number },
    ): {
        status: PostAuditItemMatchStatus;
        debitAmount: number;
        issues: PostAuditIssue[];
    } {
        const issues: PostAuditIssue[] = [];
        let debitAmount = 0;
        let status: PostAuditItemMatchStatus = 'ok';

        const invQty = item.invoiced_quantity || 1;
        const authQty = match.quantity || 1;
        const invPrice = item.invoiced_unit_price || 0;
        const authPrice = match.unit_price || 0;
        const invTotal = item.invoiced_total || 0;
        const authTotal = match.total || 0;

        // Verificar cantidad
        if (invQty > authQty) {
            status = 'cantidad_excedida';
            const exceso = (invQty - authQty) * invPrice;
            debitAmount += exceso;
            issues.push({
                type: 'quantity_exceeded',
                message: `Cantidad facturada (${invQty}) excede autorizada (${authQty}). Exceso: $${exceso.toFixed(2)}`,
                severity: 'error',
            });
        }

        // Verificar precio (tolerancia del 5%)
        const priceTolerance = authPrice * 0.05;
        if (invPrice > authPrice + priceTolerance) {
            status = 'precio_excedido';
            const exceso = (invPrice - authPrice) * Math.min(invQty, authQty);
            debitAmount += exceso;
            issues.push({
                type: 'price_exceeded',
                message: `Precio unitario $${invPrice.toFixed(2)} excede autorizado $${authPrice.toFixed(2)}. Exceso: $${exceso.toFixed(2)}`,
                severity: 'warning',
            });
        }

        // Verificar total
        if (invTotal > authTotal * 1.05 && issues.length === 0) {
            issues.push({
                type: 'total_mismatch',
                message: `Total facturado $${invTotal.toFixed(2)} vs autorizado $${authTotal.toFixed(2)}`,
                severity: 'warning',
            });
            debitAmount = invTotal - authTotal;
        }

        // Si hay diferencia menor al 5%, es OK
        if (debitAmount <= 0) {
            status = 'ok';
        }

        return { status, debitAmount, issues };
    },

    // ═══════════════════════════════════════════════════
    // ACCIONES DEL AUDITOR
    // ═══════════════════════════════════════════════════

    // ── Tomar para revisión ──
    async takeForReview(id: string, userId: string): Promise<void> {
        await db('post_audits')
            .update({
                status: 'en_revision',
                assigned_to: userId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        await this.addLog(id, 'tomada_revision', userId, {});
    },

    // ── Resolver un item individual ──
    async resolveItem(
        itemId: string,
        action: PostAuditItemAction,
        userId: string,
        notes?: string,
        adjustedDebit?: number,
    ): Promise<void> {
        const updates: Record<string, unknown> = {
            auditor_action: action,
            auditor_notes: notes,
            resolved_by: userId,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        switch (action) {
            case 'aprobar':
                updates.match_status = 'aprobado_manual';
                updates.debit_amount = 0;
                break;
            case 'debitar':
                updates.match_status = 'debitado';
                if (adjustedDebit !== undefined) {
                    updates.debit_amount = adjustedDebit;
                }
                break;
            case 'rechazar':
                updates.match_status = 'debitado';
                // Debitar el total facturado
                break;
            case 'ajustar':
                updates.match_status = 'aprobado_manual';
                if (adjustedDebit !== undefined) {
                    updates.debit_amount = adjustedDebit;
                }
                break;
        }

        await db('post_audit_items').update(updates).eq('id', itemId);

        // Obtener el post_audit_id para log
        const { data: item } = await db('post_audit_items').select('post_audit_id').eq('id', itemId).single();
        if (item) {
            await this.addLog(item.post_audit_id, `item_${action}`, userId, { item_id: itemId, notes });
        }
    },

    // ── Aprobar la auditoría completa (todo ok) ──
    async approve(id: string, userId: string, notes?: string): Promise<void> {
        const pa = await this.fetchById(id);
        if (!pa) throw new Error('Auditoría no encontrada');

        await db('post_audits')
            .update({
                status: 'aprobada',
                approved_total: pa.invoiced_total,
                debit_total: 0,
                resolution_notes: notes,
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        // Marcar todos los items pendientes como ok
        await db('post_audit_items')
            .update({
                match_status: 'aprobado_manual',
                auditor_action: 'aprobar',
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
            })
            .eq('post_audit_id', id)
            .in('match_status', ['pendiente', 'ok']);

        await this.addLog(id, 'aprobada', userId, { notes });
    },

    // ── Cerrar con débitos ──
    async closeWithDebits(id: string, userId: string, notes?: string): Promise<DebitNote> {
        const items = await this.fetchItems(id);
        const debitedItems = items.filter(it => (it.debit_amount || 0) > 0);

        if (debitedItems.length === 0) {
            throw new Error('No hay items con débitos para generar nota');
        }

        const pa = await this.fetchById(id);
        if (!pa) throw new Error('Auditoría no encontrada');

        const totalDebit = debitedItems.reduce((sum, it) => sum + (it.debit_amount || 0), 0);

        // 1. Crear nota de débito
        const { data: debitNote, error: dnErr } = await db('debit_notes')
            .insert({
                post_audit_id: id,
                invoice_id: pa.invoice_id,
                provider_id: pa.provider_id,
                total_amount: totalDebit,
                detail_count: debitedItems.length,
                status: 'borrador',
                reason: notes || 'Débitos por diferencias en facturación',
                created_by: userId,
                jurisdiction_id: pa.jurisdiction_id,
            })
            .select()
            .single();

        if (dnErr || !debitNote) throw new Error('Error creando nota de débito');

        // 2. Crear detalles de la nota de débito
        const debitDetails: Partial<DebitNoteItem>[] = debitedItems.map((item, idx) => ({
            debit_note_id: debitNote.id,
            post_audit_item_id: item.id,
            practice_id: item.practice_id,
            practice_description: item.practice_description,
            invoiced_amount: item.invoiced_total,
            authorized_amount: item.authorized_total,
            debit_amount: item.debit_amount,
            reason: item.debit_reason || (item.issues?.[0]?.message),
            debit_type: this._mapIssueToDebitType(item),
            sort_order: idx,
        }));

        await db('debit_note_items').insert(debitDetails);

        // 3. Actualizar cabecera
        await db('post_audits')
            .update({
                status: 'con_debitos',
                debit_total: totalDebit,
                approved_total: (pa.invoiced_total || 0) - totalDebit,
                resolution_notes: notes,
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        await this.addLog(id, 'cerrada_con_debitos', userId, {
            debit_note_id: debitNote.id,
            total_debit: totalDebit,
            items_debited: debitedItems.length,
        });

        return debitNote as DebitNote;
    },

    // ── Emitir nota de débito ──
    async emitDebitNote(debitNoteId: string, userId: string): Promise<void> {
        await db('debit_notes')
            .update({
                status: 'emitida',
                emitted_by: userId,
                emitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', debitNoteId);

        const { data: dn } = await db('debit_notes').select('post_audit_id').eq('id', debitNoteId).single();
        if (dn) {
            await this.addLog(dn.post_audit_id, 'nota_debito_emitida', userId, { debit_note_id: debitNoteId });
        }
    },

    // ── Disputa de nota de débito (prestador) ──
    async disputeDebitNote(debitNoteId: string, reason: string, userId: string): Promise<void> {
        await db('debit_notes')
            .update({
                status: 'disputada',
                dispute_reason: reason,
                dispute_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', debitNoteId);

        const { data: dn } = await db('debit_notes').select('post_audit_id').eq('id', debitNoteId).single();
        if (dn) {
            await db('post_audits')
                .update({ status: 'en_disputa', updated_at: new Date().toISOString() })
                .eq('id', dn.post_audit_id);
            await this.addLog(dn.post_audit_id, 'nota_debito_disputada', userId, { debit_note_id: debitNoteId, reason });
        }
    },

    // ── Resolver disputa ──
    async resolveDispute(
        debitNoteId: string,
        resolution: string,
        adjustedAmount: number | null,
        userId: string,
    ): Promise<void> {
        const updates: Record<string, unknown> = {
            status: 'resuelta',
            dispute_resolution: resolution,
            dispute_resolved_by: userId,
            dispute_resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (adjustedAmount !== null) {
            updates.total_amount = adjustedAmount;
        }

        await db('debit_notes').update(updates).eq('id', debitNoteId);

        const { data: dn } = await db('debit_notes').select('post_audit_id, total_amount').eq('id', debitNoteId).single();
        if (dn) {
            // Cerrar el post_audit
            await db('post_audits')
                .update({
                    status: 'cerrada',
                    debit_total: adjustedAmount ?? dn.total_amount,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', dn.post_audit_id);
            await this.addLog(dn.post_audit_id, 'disputa_resuelta', userId, {
                debit_note_id: debitNoteId,
                resolution,
                adjusted_amount: adjustedAmount,
            });
        }
    },

    // ── Cerrar auditoría ──
    async close(id: string, userId: string, notes?: string): Promise<void> {
        await db('post_audits')
            .update({
                status: 'cerrada',
                resolution_notes: notes,
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        await this.addLog(id, 'cerrada', userId, { notes });
    },

    // ── Reasignar ──
    async reassign(id: string, newUserId: string, performedBy: string): Promise<void> {
        await db('post_audits')
            .update({
                assigned_to: newUserId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        await this.addLog(id, 'reasignada', performedBy, { new_assigned: newUserId });
    },

    // ═══════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════

    async addLog(
        postAuditId: string,
        action: string,
        userId: string,
        details: Record<string, unknown>,
    ): Promise<void> {
        await db('post_audit_log').insert({
            post_audit_id: postAuditId,
            action,
            details,
            performed_by: userId,
        });
    },

    _mapIssueToDebitType(item: PostAuditItem): DebitType {
        if (item.match_status === 'sin_autorizacion') return 'sin_autorizacion';
        if (item.match_status === 'autorizacion_vencida') return 'autorizacion_vencida';
        if (item.match_status === 'cantidad_excedida') return 'cantidad_excedida';
        if (item.match_status === 'precio_excedido') return 'precio_excedido';
        if (item.match_status === 'duplicada') return 'duplicada';
        return 'otro';
    },
};
