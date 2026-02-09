/**
 * Tipos de base de datos generados para Supabase
 * CPCE Salud
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            jurisdictions: {
                Row: {
                    id: number
                    name: string
                    theme_config: Json
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    theme_config?: Json
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    theme_config?: Json
                    created_at?: string
                }
            }
            plans: {
                Row: {
                    id: number
                    name: string
                    jurisdiction_id: number | null
                    coverage_percent: number
                    waiting_period_months: number
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    jurisdiction_id?: number | null
                    coverage_percent?: number
                    waiting_period_months?: number
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    jurisdiction_id?: number | null
                    coverage_percent?: number
                    waiting_period_months?: number
                    created_at?: string
                }
            }
            affiliates: {
                Row: {
                    id: string
                    affiliate_number: string | null
                    full_name: string
                    document_number: string
                    birth_date: string | null
                    gender: 'M' | 'F' | 'X' | null
                    relationship: 'Titular' | 'Cónyuge' | 'Hijo' | 'Hijo Estudiante' | 'Hijo Discapacidad' | 'Otro'
                    titular_id: string | null
                    plan_id: number | null
                    special_conditions: Json
                    start_date: string
                    end_date: string | null
                    status: 'activo' | 'suspendido' | 'baja'
                    jurisdiction_id: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    affiliate_number?: string | null
                    full_name: string
                    document_number: string
                    birth_date?: string | null
                    gender?: 'M' | 'F' | 'X' | null
                    relationship?: 'Titular' | 'Cónyuge' | 'Hijo' | 'Hijo Estudiante' | 'Hijo Discapacidad' | 'Otro'
                    titular_id?: string | null
                    plan_id?: number | null
                    special_conditions?: Json
                    start_date?: string
                    end_date?: string | null
                    status?: 'activo' | 'suspendido' | 'baja'
                    jurisdiction_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    affiliate_number?: string | null
                    full_name?: string
                    document_number?: string
                    birth_date?: string | null
                    gender?: 'M' | 'F' | 'X' | null
                    relationship?: 'Titular' | 'Cónyuge' | 'Hijo' | 'Hijo Estudiante' | 'Hijo Discapacidad' | 'Otro'
                    titular_id?: string | null
                    plan_id?: number | null
                    special_conditions?: Json
                    start_date?: string
                    end_date?: string | null
                    status?: 'activo' | 'suspendido' | 'baja'
                    jurisdiction_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            practice_types: {
                Row: {
                    id: number
                    code: string
                    name: string
                    description: string | null
                    unit_name: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    code: string
                    name: string
                    description?: string | null
                    unit_name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    code?: string
                    name?: string
                    description?: string | null
                    unit_name?: string | null
                    created_at?: string
                }
            }
            practices: {
                Row: {
                    id: number
                    code: string
                    name: string
                    description: string | null
                    practice_type_id: number | null
                    unit_quantity: number | null
                    fixed_value: number | null
                    category: string | null
                    requires_authorization: boolean
                    max_per_month: number | null
                    max_per_year: number | null
                    jurisdiction_id: number | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    code: string
                    name: string
                    description?: string | null
                    practice_type_id?: number | null
                    unit_quantity?: number | null
                    fixed_value?: number | null
                    category?: string | null
                    requires_authorization?: boolean
                    max_per_month?: number | null
                    max_per_year?: number | null
                    jurisdiction_id?: number | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    code?: string
                    name?: string
                    description?: string | null
                    practice_type_id?: number | null
                    unit_quantity?: number | null
                    fixed_value?: number | null
                    category?: string | null
                    requires_authorization?: boolean
                    max_per_month?: number | null
                    max_per_year?: number | null
                    jurisdiction_id?: number | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            users: {
                Row: {
                    id: string
                    email: string
                    full_name: string
                    avatar_url: string | null
                    role: 'admin' | 'supervisor' | 'auditor'
                    jurisdiction_id: number | null
                    is_active: boolean
                    last_login: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    full_name: string
                    avatar_url?: string | null
                    role?: 'admin' | 'supervisor' | 'auditor'
                    jurisdiction_id?: number | null
                    is_active?: boolean
                    last_login?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string
                    avatar_url?: string | null
                    role?: 'admin' | 'supervisor' | 'auditor'
                    jurisdiction_id?: number | null
                    is_active?: boolean
                    last_login?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            audits: {
                Row: {
                    id: string
                    affiliate_id: string | null
                    practice_id: number | null
                    plan_id: number | null
                    jurisdiction_id: number | null
                    coverage_result: Json
                    status: 'pending' | 'approved' | 'rejected' | 'partial' | 'requires_auth'
                    auditor_id: string | null
                    reviewer_id: string | null
                    notes: string | null
                    authorization_code: string | null
                    created_at: string
                    reviewed_at: string | null
                    updated_at: string
                }
                Insert: {
                    id?: string
                    affiliate_id?: string | null
                    practice_id?: number | null
                    plan_id?: number | null
                    jurisdiction_id?: number | null
                    coverage_result: Json
                    status?: 'pending' | 'approved' | 'rejected' | 'partial' | 'requires_auth'
                    auditor_id?: string | null
                    reviewer_id?: string | null
                    notes?: string | null
                    authorization_code?: string | null
                    created_at?: string
                    reviewed_at?: string | null
                    updated_at?: string
                }
                Update: {
                    id?: string
                    affiliate_id?: string | null
                    practice_id?: number | null
                    plan_id?: number | null
                    jurisdiction_id?: number | null
                    coverage_result?: Json
                    status?: 'pending' | 'approved' | 'rejected' | 'partial' | 'requires_auth'
                    auditor_id?: string | null
                    reviewer_id?: string | null
                    notes?: string | null
                    authorization_code?: string | null
                    created_at?: string
                    reviewed_at?: string | null
                    updated_at?: string
                }
            }
            alerts: {
                Row: {
                    id: string
                    rule_id: number | null
                    title: string
                    description: string | null
                    type: 'threshold' | 'frequency' | 'deadline' | 'anomaly' | 'compliance'
                    severity: 'low' | 'medium' | 'high' | 'critical'
                    status: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
                    affiliate_id: string | null
                    metadata: Json
                    jurisdiction_id: number | null
                    assigned_to: string | null
                    resolved_by: string | null
                    resolved_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    rule_id?: number | null
                    title: string
                    description?: string | null
                    type: 'threshold' | 'frequency' | 'deadline' | 'anomaly' | 'compliance'
                    severity?: 'low' | 'medium' | 'high' | 'critical'
                    status?: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
                    affiliate_id?: string | null
                    metadata?: Json
                    jurisdiction_id?: number | null
                    assigned_to?: string | null
                    resolved_by?: string | null
                    resolved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    rule_id?: number | null
                    title?: string
                    description?: string | null
                    type?: 'threshold' | 'frequency' | 'deadline' | 'anomaly' | 'compliance'
                    severity?: 'low' | 'medium' | 'high' | 'critical'
                    status?: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
                    affiliate_id?: string | null
                    metadata?: Json
                    jurisdiction_id?: number | null
                    assigned_to?: string | null
                    resolved_by?: string | null
                    resolved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            events: {
                Row: {
                    id: string
                    title: string
                    description: string | null
                    start_datetime: string
                    end_datetime: string | null
                    all_day: boolean
                    location: string | null
                    type: 'reunion' | 'capacitacion' | 'vencimiento' | 'recordatorio' | 'otro'
                    priority: 'normal' | 'alta' | 'urgente'
                    status: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'
                    attendees: string[] | null
                    reminder_minutes: number
                    reminder_sent: boolean
                    created_by: string | null
                    jurisdiction_id: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    description?: string | null
                    start_datetime: string
                    end_datetime?: string | null
                    all_day?: boolean
                    location?: string | null
                    type?: 'reunion' | 'capacitacion' | 'vencimiento' | 'recordatorio' | 'otro'
                    priority?: 'normal' | 'alta' | 'urgente'
                    status?: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'
                    attendees?: string[] | null
                    reminder_minutes?: number
                    reminder_sent?: boolean
                    created_by?: string | null
                    jurisdiction_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string | null
                    start_datetime?: string
                    end_datetime?: string | null
                    all_day?: boolean
                    location?: string | null
                    type?: 'reunion' | 'capacitacion' | 'vencimiento' | 'recordatorio' | 'otro'
                    priority?: 'normal' | 'alta' | 'urgente'
                    status?: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'
                    attendees?: string[] | null
                    reminder_minutes?: number
                    reminder_sent?: boolean
                    created_by?: string | null
                    jurisdiction_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            conversations: {
                Row: {
                    id: string
                    name: string | null
                    type: 'direct' | 'channel'
                    description: string | null
                    is_private: boolean
                    jurisdiction_id: number | null
                    created_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name?: string | null
                    type: 'direct' | 'channel'
                    description?: string | null
                    is_private?: boolean
                    jurisdiction_id?: number | null
                    created_by?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string | null
                    type?: 'direct' | 'channel'
                    description?: string | null
                    is_private?: boolean
                    jurisdiction_id?: number | null
                    created_by?: string | null
                    created_at?: string
                }
            }
            conversation_members: {
                Row: {
                    id: string
                    conversation_id: string
                    user_id: string
                    role: 'admin' | 'member'
                    last_read_at: string | null
                    joined_at: string
                }
                Insert: {
                    id?: string
                    conversation_id: string
                    user_id: string
                    role?: 'admin' | 'member'
                    last_read_at?: string | null
                    joined_at?: string
                }
                Update: {
                    id?: string
                    conversation_id?: string
                    user_id?: string
                    role?: 'admin' | 'member'
                    last_read_at?: string | null
                    joined_at?: string
                }
            }
            messages: {
                Row: {
                    id: string
                    conversation_id: string
                    sender_id: string | null
                    content: string
                    type: 'text' | 'file' | 'system'
                    attachment_url: string | null
                    reply_to_id: string | null
                    is_edited: boolean
                    is_deleted: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    conversation_id: string
                    sender_id?: string | null
                    content: string
                    type?: 'text' | 'file' | 'system'
                    attachment_url?: string | null
                    reply_to_id?: string | null
                    is_edited?: boolean
                    is_deleted?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    conversation_id?: string
                    sender_id?: string | null
                    content?: string
                    type?: 'text' | 'file' | 'system'
                    attachment_url?: string | null
                    reply_to_id?: string | null
                    is_edited?: boolean
                    is_deleted?: boolean
                    created_at?: string
                }
            }
        }
    }
}

// Tipos de conveniencia
export type Jurisdiction = Database['public']['Tables']['jurisdictions']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Affiliate = Database['public']['Tables']['affiliates']['Row']
export type PracticeType = Database['public']['Tables']['practice_types']['Row']
export type Practice = Database['public']['Tables']['practices']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Audit = Database['public']['Tables']['audits']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationMember = Database['public']['Tables']['conversation_members']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

// Tipos para inserción
export type AffiliateInsert = Database['public']['Tables']['affiliates']['Insert']
export type PracticeInsert = Database['public']['Tables']['practices']['Insert']
export type AuditInsert = Database['public']['Tables']['audits']['Insert']
export type AlertInsert = Database['public']['Tables']['alerts']['Insert']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
