/**
 * Servicio de Alertas con Supabase
 * Lee y escribe alertas desde la base de datos Supabase
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client for browser
const getSupabaseClient = () => {
    return createClient(supabaseUrl, supabaseKey)
}

// ── Types ──

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertType = 'threshold' | 'frequency' | 'deadline' | 'anomaly' | 'compliance'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed'

export interface Alert {
    id: string
    rule_id?: number
    title: string
    description?: string
    type?: AlertType
    severity: AlertSeverity
    status: AlertStatus
    affiliate_id?: string
    metadata?: Record<string, unknown>
    jurisdiction_id?: number
    assigned_to?: string
    resolved_by?: string
    resolved_at?: string
    created_at: string
    updated_at?: string
}

export interface CreateAlertInput {
    title: string
    description?: string
    type?: AlertType
    severity: AlertSeverity
    jurisdiction_id?: number
}

// ── Listeners for reactivity ──

type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
    listeners.forEach((fn) => fn())
}

// ── Service ──

export const SupabaseAlertService = {
    /**
     * Get all alerts, ordered by created_at descending
     */
    async getAll(): Promise<Alert[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('alerts')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching alerts:', error.message)
            return []
        }

        return data as Alert[]
    },

    /**
     * Get alerts by status
     */
    async getByStatus(status: AlertStatus): Promise<Alert[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('alerts')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching alerts by status:', error.message)
            return []
        }

        return data as Alert[]
    },

    /**
     * Get a single alert by ID
     */
    async getById(id: string): Promise<Alert | null> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('alerts')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching alert:', error.message)
            return null
        }

        return data as Alert
    },

    /**
     * Create a new alert
     */
    async create(input: CreateAlertInput): Promise<Alert | null> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('alerts')
            .insert({
                ...input,
                status: 'active',
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating alert:', error.message)
            return null
        }

        notifyListeners()
        return data as Alert
    },

    /**
     * Update alert status
     */
    async updateStatus(id: string, status: AlertStatus): Promise<Alert | null> {
        const supabase = getSupabaseClient()

        const updateData: Partial<Alert> = {
            status,
            updated_at: new Date().toISOString(),
        }

        if (status === 'resolved') {
            updateData.resolved_at = new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('alerts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating alert:', error.message)
            return null
        }

        notifyListeners()
        return data as Alert
    },

    /**
     * Delete an alert
     */
    async delete(id: string): Promise<boolean> {
        const supabase = getSupabaseClient()
        const { error } = await supabase
            .from('alerts')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting alert:', error.message)
            return false
        }

        notifyListeners()
        return true
    },

    /**
     * Get alert counts by severity
     */
    async getCounts(): Promise<{ total: number; active: number; high: number; critical: number }> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('alerts')
            .select('status, severity')

        if (error) {
            console.error('Error fetching alert counts:', error.message)
            return { total: 0, active: 0, high: 0, critical: 0 }
        }

        const alerts = data || []
        return {
            total: alerts.length,
            active: alerts.filter(a => a.status === 'active').length,
            high: alerts.filter(a => a.severity === 'high' && a.status === 'active').length,
            critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
        }
    },

    /**
     * Subscribe to changes
     */
    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },
}
