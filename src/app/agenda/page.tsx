'use client'

import { useState, useMemo, useSyncExternalStore, useCallback } from 'react'
import { AgendaService, CalendarEvent, EventType, EventPriority, EventStatus } from '@/services/agendaService'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, Users, Bell, X, Check, Trash2 } from 'lucide-react'

// ── Helpers ──

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const EVENT_COLORS: Record<EventType, string> = {
    reunion: 'bg-blue-500',
    capacitacion: 'bg-purple-500',
    vencimiento: 'bg-red-500',
    recordatorio: 'bg-amber-500',
    otro: 'bg-gray-500',
}

const PRIORITY_COLORS: Record<EventPriority, string> = {
    normal: 'border-l-slate-400',
    alta: 'border-l-amber-500',
    urgente: 'border-l-red-500',
}

function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getDaysInMonth(year: number, month: number): Date[] {
    const days: Date[] = []
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Pad start with previous month days
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
        const d = new Date(year, month, -i)
        days.push(d)
    }

    // Days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push(new Date(year, month, d))
    }

    // Pad end to complete 6 rows (42 cells)
    while (days.length < 42) {
        days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startPadding + 1))
    }

    return days
}

// ── Components ──

function EventCard({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`text-xs p-1 rounded cursor-pointer truncate text-white ${EVENT_COLORS[event.type]} hover:opacity-80 transition-opacity`}
        >
            {!event.all_day && <span className="mr-1">{formatTime(event.start_datetime)}</span>}
            {event.title}
        </div>
    )
}

function EventDetailModal({
    event,
    onClose,
    onStatusChange,
    onDelete,
}: {
    event: CalendarEvent
    onClose: () => void
    onStatusChange: (status: EventStatus) => void
    onDelete: () => void
}) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border-l-4 ${PRIORITY_COLORS[event.priority]}`}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${EVENT_COLORS[event.type]}`}>
                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </span>
                            <h2 className="text-xl font-bold mt-2 dark:text-white">{event.title}</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>

                    {event.description && (
                        <p className="text-slate-600 dark:text-slate-300 mb-4">{event.description}</p>
                    )}

                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>{formatDate(event.start_datetime)}</span>
                        </div>
                        {!event.all_day && (
                            <div className="flex items-center gap-2">
                                <Clock size={16} />
                                <span>
                                    {formatTime(event.start_datetime)}
                                    {event.end_datetime && ` - ${formatTime(event.end_datetime)}`}
                                </span>
                            </div>
                        )}
                        {event.location && (
                            <div className="flex items-center gap-2">
                                <MapPin size={16} />
                                <span>{event.location}</span>
                            </div>
                        )}
                        {event.attendees.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Users size={16} />
                                <span>{event.attendees.join(', ')}</span>
                            </div>
                        )}
                        {event.reminder_minutes && (
                            <div className="flex items-center gap-2">
                                <Bell size={16} />
                                <span>
                                    Recordatorio: {event.reminder_minutes >= 60
                                        ? `${event.reminder_minutes / 60}h antes`
                                        : `${event.reminder_minutes} min antes`}
                                    {event.reminder_sent && ' (Enviado ✓)'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex gap-2 flex-wrap">
                        {event.status !== 'confirmado' && (
                            <button
                                onClick={() => onStatusChange('confirmado')}
                                className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                <Check size={16} /> Confirmar
                            </button>
                        )}
                        {event.status !== 'completado' && (
                            <button
                                onClick={() => onStatusChange('completado')}
                                className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                <Check size={16} /> Completado
                            </button>
                        )}
                        {event.status !== 'cancelado' && (
                            <button
                                onClick={() => onStatusChange('cancelado')}
                                className="flex items-center gap-1 px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
                            >
                                <X size={16} /> Cancelar
                            </button>
                        )}
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                            <Trash2 size={16} /> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function CreateEventModal({ onClose, onSubmit, initialDate }: {
    onClose: () => void
    onSubmit: (event: Omit<CalendarEvent, 'id' | 'created_at' | 'reminder_sent'>) => void
    initialDate?: Date
}) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        date: initialDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        time: '10:00',
        endTime: '11:00',
        all_day: false,
        location: '',
        type: 'reunion' as EventType,
        priority: 'normal' as EventPriority,
        attendees: '',
        reminder_minutes: 30,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title.trim()) return

        const start_datetime = form.all_day
            ? new Date(form.date).toISOString()
            : new Date(`${form.date}T${form.time}`).toISOString()

        const end_datetime = form.all_day
            ? undefined
            : new Date(`${form.date}T${form.endTime}`).toISOString()

        onSubmit({
            title: form.title,
            description: form.description || undefined,
            start_datetime,
            end_datetime,
            all_day: form.all_day,
            location: form.location || undefined,
            type: form.type,
            priority: form.priority,
            status: 'pendiente',
            attendees: form.attendees ? form.attendees.split(',').map((e) => e.trim()) : [],
            reminder_minutes: form.reminder_minutes,
            created_by: 'current-user',
        })
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-white">Nuevo Evento</h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Título *"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        required
                    />

                    <textarea
                        placeholder="Descripción (opcional)"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        rows={2}
                    />

                    <div className="flex gap-4">
                        <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
                            className="flex-1 px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value="reunion">Reunión</option>
                            <option value="capacitacion">Capacitación</option>
                            <option value="vencimiento">Vencimiento</option>
                            <option value="recordatorio">Recordatorio</option>
                            <option value="otro">Otro</option>
                        </select>

                        <select
                            value={form.priority}
                            onChange={(e) => setForm({ ...form, priority: e.target.value as EventPriority })}
                            className="flex-1 px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            className="flex-1 px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                        <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input
                                type="checkbox"
                                checked={form.all_day}
                                onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
                            />
                            Todo el día
                        </label>
                    </div>

                    {!form.all_day && (
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-slate-500 dark:text-slate-400">Inicio</label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-slate-500 dark:text-slate-400">Fin</label>
                                <input
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Ubicación (opcional)"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />

                    <input
                        type="text"
                        placeholder="Participantes (emails separados por coma)"
                        value={form.attendees}
                        onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />

                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Recordatorio</label>
                        <select
                            value={form.reminder_minutes}
                            onChange={(e) => setForm({ ...form, reminder_minutes: Number(e.target.value) })}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value={0}>Sin recordatorio</option>
                            <option value={15}>15 minutos antes</option>
                            <option value={30}>30 minutos antes</option>
                            <option value={60}>1 hora antes</option>
                            <option value={1440}>1 día antes</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Crear Evento
                    </button>
                </div>
            </form>
        </div>
    )
}

// ── Main Page ──

export default function AgendaPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createDate, setCreateDate] = useState<Date | undefined>()

    const events = useSyncExternalStore(
        AgendaService.subscribe,
        AgendaService.getSnapshot,
        AgendaService.getSnapshot
    )

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const days = useMemo(() => getDaysInMonth(year, month), [year, month])

    const monthEvents = useMemo(() => {
        return AgendaService.getByMonth(year, month)
    }, [year, month, events])

    const getEventsForDay = useCallback((date: Date) => {
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString()
        return monthEvents.filter((e) => e.start_datetime >= dayStart && e.start_datetime <= dayEnd)
    }, [monthEvents])

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
    const handleToday = () => setCurrentDate(new Date())

    const handleDayClick = (date: Date) => {
        setCreateDate(date)
        setShowCreateModal(true)
    }

    const handleCreateEvent = (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'reminder_sent'>) => {
        AgendaService.create(eventData)
        setShowCreateModal(false)
    }

    const handleStatusChange = (status: EventStatus) => {
        if (selectedEvent) {
            AgendaService.updateStatus(selectedEvent.id, status)
            setSelectedEvent(null)
        }
    }

    const handleDeleteEvent = () => {
        if (selectedEvent && confirm('¿Eliminar este evento?')) {
            AgendaService.delete(selectedEvent.id)
            setSelectedEvent(null)
        }
    }

    const isToday = (date: Date) => {
        const today = new Date()
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        )
    }

    const isCurrentMonth = (date: Date) => date.getMonth() === month

    const upcomingEvents = AgendaService.getUpcoming()

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Calendar className="text-blue-500" />
                        Agenda CPCE
                    </h1>
                    <button
                        onClick={() => { setCreateDate(undefined); setShowCreateModal(true) }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <Plus size={20} /> Nuevo Evento
                    </button>
                </div>

                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                <ChevronLeft />
                            </button>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold dark:text-white">
                                    {MONTHS[month]} {year}
                                </h2>
                                <button
                                    onClick={handleToday}
                                    className="text-sm px-3 py-1 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white"
                                >
                                    Hoy
                                </button>
                            </div>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                <ChevronRight />
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 border-b dark:border-slate-700">
                            {DAYS.map((day) => (
                                <div key={day} className="p-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7">
                            {days.map((date, i) => {
                                const dayEvents = getEventsForDay(date)
                                return (
                                    <div
                                        key={i}
                                        onClick={() => handleDayClick(date)}
                                        className={`min-h-[100px] p-1 border-b border-r dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!isCurrentMonth(date) ? 'bg-slate-100 dark:bg-slate-800/50' : ''
                                            }`}
                                    >
                                        <div
                                            className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday(date)
                                                    ? 'bg-blue-500 text-white'
                                                    : isCurrentMonth(date)
                                                        ? 'text-slate-800 dark:text-white'
                                                        : 'text-slate-400'
                                                }`}
                                        >
                                            {date.getDate()}
                                        </div>
                                        <div className="space-y-1">
                                            {dayEvents.slice(0, 3).map((event) => (
                                                <EventCard
                                                    key={event.id}
                                                    event={event}
                                                    onClick={() => setSelectedEvent(event)}
                                                />
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    +{dayEvents.length - 3} más
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Upcoming Events Sidebar */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
                        <h3 className="font-semibold text-lg mb-4 dark:text-white">Próximos Eventos</h3>
                        {upcomingEvents.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                No hay eventos en los próximos 7 días
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${PRIORITY_COLORS[event.priority]} dark:bg-slate-700/30`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full ${EVENT_COLORS[event.type]}`} />
                                            <span className="font-medium text-sm dark:text-white truncate">{event.title}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {formatDate(event.start_datetime)}
                                            {!event.all_day && ` • ${formatTime(event.start_datetime)}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                    {Object.entries(EVENT_COLORS).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded ${color}`} />
                            <span className="capitalize text-slate-600 dark:text-slate-400">{type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteEvent}
                />
            )}

            {showCreateModal && (
                <CreateEventModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateEvent}
                    initialDate={createDate}
                />
            )}
        </div>
    )
}
