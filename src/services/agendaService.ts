import { getSupabaseClient } from '@/lib/supabase/client'

/**
 * Servicio de Agenda / Calendario con Supabase.
 * Persiste eventos en la tabla `events` y mantiene caché local
 * para compatibilidad con useSyncExternalStore.
 */

export type EventType = 'reunion' | 'capacitacion' | 'vencimiento' | 'recordatorio' | 'otro'
export type EventPriority = 'normal' | 'alta' | 'urgente'
export type EventStatus = 'pendiente' | 'confirmado' | 'cancelado' | 'completado'

export interface CalendarEvent {
    id: string
    title: string
    description?: string
    start_datetime: string // ISO string
    end_datetime?: string
    all_day: boolean
    location?: string
    type: EventType
    priority: EventPriority
    status: EventStatus
    attendees: string[] // emails
    reminder_minutes?: number
    reminder_sent: boolean
    created_by: string
    jurisdiction_id?: number
    created_at: string
    updated_at?: string
}

// ── Local cache for useSyncExternalStore compatibility ──
let eventsCache: CalendarEvent[] = []
let initialized = false

type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
    listeners.forEach((fn) => fn())
}

function mapRow(row: Record<string, unknown>): CalendarEvent {
    return {
        id: String(row.id),
        title: row.title as string,
        description: (row.description as string) ?? undefined,
        start_datetime: row.start_datetime as string,
        end_datetime: (row.end_datetime as string) ?? undefined,
        all_day: (row.all_day as boolean) ?? false,
        location: (row.location as string) ?? undefined,
        type: (row.type as EventType) ?? 'otro',
        priority: (row.priority as EventPriority) ?? 'normal',
        status: (row.status as EventStatus) ?? 'pendiente',
        attendees: (row.attendees as string[]) ?? [],
        reminder_minutes: (row.reminder_minutes as number) ?? undefined,
        reminder_sent: (row.reminder_sent as boolean) ?? false,
        created_by: (row.created_by as string) ?? 'system',
        jurisdiction_id: (row.jurisdiction_id as number) ?? undefined,
        created_at: row.created_at as string,
        updated_at: (row.updated_at as string) ?? undefined,
    }
}

async function syncFromSupabase() {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: true })

    if (!error && data) {
        eventsCache = data.map(mapRow)
        notifyListeners()
    }
    initialized = true
}

export const AgendaService = {
    /** Initialize cache from Supabase (call once). */
    async init() {
        if (!initialized) await syncFromSupabase()
    },

    getAll(options?: { startDate?: string; endDate?: string; jurisdictionId?: number }): CalendarEvent[] {
        let result = [...eventsCache]
        if (options?.jurisdictionId) {
            result = result.filter(e => !e.jurisdiction_id || e.jurisdiction_id === options.jurisdictionId)
        }
        if (options?.startDate) result = result.filter(e => e.start_datetime >= options.startDate!)
        if (options?.endDate) result = result.filter(e => e.start_datetime <= options.endDate!)
        return result.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    },

    getByMonth(year: number, month: number, jurisdictionId?: number): CalendarEvent[] {
        const startOfMonth = new Date(year, month, 1).toISOString()
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
        return this.getAll({ startDate: startOfMonth, endDate: endOfMonth, jurisdictionId })
    },

    getUpcoming(jurisdictionId?: number): CalendarEvent[] {
        const now = new Date().toISOString()
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        return this.getAll({ startDate: now, endDate: weekFromNow, jurisdictionId })
    },

    getById(id: string): CalendarEvent | null {
        return eventsCache.find(e => e.id === id) ?? null
    },

    async create(event: Omit<CalendarEvent, 'id' | 'created_at' | 'reminder_sent'>): Promise<CalendarEvent> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('events')
            .insert({
                title: event.title,
                description: event.description ?? null,
                start_datetime: event.start_datetime,
                end_datetime: event.end_datetime ?? null,
                all_day: event.all_day,
                location: event.location ?? null,
                type: event.type,
                priority: event.priority,
                status: event.status,
                attendees: event.attendees,
                reminder_minutes: event.reminder_minutes ?? null,
                reminder_sent: false,
                jurisdiction_id: event.jurisdiction_id ?? null,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating event:', error.message)
            // fallback to local cache
            const fallback: CalendarEvent = {
                ...event,
                id: crypto.randomUUID(),
                reminder_sent: false,
                created_at: new Date().toISOString(),
            }
            eventsCache.push(fallback)
            notifyListeners()
            return fallback
        }

        const mapped = mapRow(data)
        eventsCache.push(mapped)
        notifyListeners()
        return mapped
    },

    async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
        const supabase = getSupabaseClient()
        const { error } = await supabase
            .from('events')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', Number(id))

        const event = eventsCache.find(e => e.id === id)
        if (event) {
            Object.assign(event, updates, { updated_at: new Date().toISOString() })
            notifyListeners()
        }
        if (error) console.error('Error updating event:', error.message)
        return event ?? null
    },

    async delete(id: string): Promise<boolean> {
        const supabase = getSupabaseClient()
        const { error } = await supabase.from('events').delete().eq('id', Number(id))

        const idx = eventsCache.findIndex(e => e.id === id)
        if (idx !== -1) {
            eventsCache.splice(idx, 1)
            notifyListeners()
        }
        if (error) console.error('Error deleting event:', error.message)
        return idx !== -1
    },

    async updateStatus(id: string, status: EventStatus): Promise<CalendarEvent | null> {
        return this.update(id, { status })
    },

    getPendingReminders(): CalendarEvent[] {
        const now = new Date()
        return eventsCache.filter((e) => {
            if (e.reminder_sent || !e.reminder_minutes) return false
            const reminderTime = new Date(new Date(e.start_datetime).getTime() - e.reminder_minutes * 60 * 1000)
            return reminderTime <= now && e.status !== 'cancelado' && e.status !== 'completado'
        })
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        // Trigger initial load if not done
        if (!initialized) syncFromSupabase()
        return () => listeners.delete(listener)
    },

    getSnapshot(): CalendarEvent[] {
        return eventsCache
    },
}
