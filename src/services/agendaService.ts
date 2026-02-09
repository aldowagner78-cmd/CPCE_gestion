import { v4 as uuidv4 } from 'uuid'

/**
 * Servicio de Agenda / Calendario en memoria.
 * Cuando se integre Supabase, este módulo se conectará a la tabla `events`
 * y los recordatorios se manejarán con Edge Functions + Cron.
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

const eventsStore: CalendarEvent[] = [
    // Sample events for demo
    {
        id: '1',
        title: 'Reunión Comisión Directiva',
        description: 'Revisión presupuesto mensual',
        start_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // In 2 days
        end_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        all_day: false,
        location: 'Sala de Reuniones 1',
        type: 'reunion',
        priority: 'alta',
        status: 'confirmado',
        attendees: ['admin@cpce.org.ar', 'auditor@cpce.org.ar'],
        reminder_minutes: 30,
        reminder_sent: false,
        created_by: 'system',
        jurisdiction_id: 1,
        created_at: new Date().toISOString(),
    },
    {
        id: '2',
        title: 'Vencimiento Actualización Nomenclador',
        description: 'Recordatorio para actualizar valores mensuales',
        start_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // In 7 days
        all_day: true,
        type: 'vencimiento',
        priority: 'urgente',
        status: 'pendiente',
        attendees: [],
        reminder_minutes: 1440, // 1 day before
        reminder_sent: false,
        created_by: 'system',
        created_at: new Date().toISOString(),
    },
]

type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
    listeners.forEach((fn) => fn())
}

export const AgendaService = {
    /**
     * Get all events, optionally filtered by date range or jurisdiction.
     */
    getAll(options?: { startDate?: string; endDate?: string; jurisdictionId?: number }): CalendarEvent[] {
        let result = [...eventsStore]

        if (options?.jurisdictionId) {
            result = result.filter(
                (e) => !e.jurisdiction_id || e.jurisdiction_id === options.jurisdictionId
            )
        }

        if (options?.startDate) {
            result = result.filter((e) => e.start_datetime >= options.startDate!)
        }

        if (options?.endDate) {
            result = result.filter((e) => e.start_datetime <= options.endDate!)
        }

        return result.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    },

    /**
     * Get events for a specific month (for calendar view).
     */
    getByMonth(year: number, month: number, jurisdictionId?: number): CalendarEvent[] {
        const startOfMonth = new Date(year, month, 1).toISOString()
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
        return this.getAll({ startDate: startOfMonth, endDate: endOfMonth, jurisdictionId })
    },

    /**
     * Get upcoming events (next 7 days).
     */
    getUpcoming(jurisdictionId?: number): CalendarEvent[] {
        const now = new Date().toISOString()
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        return this.getAll({ startDate: now, endDate: weekFromNow, jurisdictionId })
    },

    /**
     * Get event by ID.
     */
    getById(id: string): CalendarEvent | null {
        return eventsStore.find((e) => e.id === id) ?? null
    },

    /**
     * Create a new event.
     */
    create(event: Omit<CalendarEvent, 'id' | 'created_at' | 'reminder_sent'>): CalendarEvent {
        const newEvent: CalendarEvent = {
            ...event,
            id: uuidv4(),
            reminder_sent: false,
            created_at: new Date().toISOString(),
        }
        eventsStore.push(newEvent)
        notifyListeners()
        return newEvent
    },

    /**
     * Update an existing event.
     */
    update(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
        const event = eventsStore.find((e) => e.id === id)
        if (!event) return null

        Object.assign(event, updates, { updated_at: new Date().toISOString() })
        notifyListeners()
        return event
    },

    /**
     * Delete an event.
     */
    delete(id: string): boolean {
        const index = eventsStore.findIndex((e) => e.id === id)
        if (index === -1) return false
        eventsStore.splice(index, 1)
        notifyListeners()
        return true
    },

    /**
     * Change event status.
     */
    updateStatus(id: string, status: EventStatus): CalendarEvent | null {
        return this.update(id, { status })
    },

    /**
     * Get events pending reminder (for cron job simulation).
     * In production, this would be an Edge Function.
     */
    getPendingReminders(): CalendarEvent[] {
        const now = new Date()
        return eventsStore.filter((e) => {
            if (e.reminder_sent || !e.reminder_minutes) return false
            const reminderTime = new Date(new Date(e.start_datetime).getTime() - e.reminder_minutes * 60 * 1000)
            return reminderTime <= now && e.status !== 'cancelado' && e.status !== 'completado'
        })
    },

    /**
     * Mark reminder as sent (after email dispatch).
     */
    markReminderSent(id: string): void {
        const event = eventsStore.find((e) => e.id === id)
        if (event) {
            event.reminder_sent = true
            notifyListeners()
        }
    },

    /**
     * Simulate sending reminder emails (demo).
     * In production, this would call Supabase Edge Function -> SendGrid/Resend.
     */
    async sendPendingReminders(): Promise<{ sent: number; events: string[] }> {
        const pending = this.getPendingReminders()
        const sent: string[] = []

        for (const event of pending) {
            // Simulate email sending
            console.log(`📧 [DEMO] Sending reminder for: "${event.title}" to: ${event.attendees.join(', ')}`)
            this.markReminderSent(event.id)
            sent.push(event.title)
        }

        return { sent: sent.length, events: sent }
    },

    // ── Reactive subscriptions (useSyncExternalStore) ──

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    getSnapshot(): CalendarEvent[] {
        return eventsStore
    },
}

// ── Auto-check reminders every minute (client-side demo) ──
if (typeof window !== 'undefined') {
    setInterval(() => {
        AgendaService.sendPendingReminders()
    }, 60 * 1000) // Every minute
}
