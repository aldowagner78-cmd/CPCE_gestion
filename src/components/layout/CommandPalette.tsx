'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Permission } from '@/types/auth'
import {
    Search, Home, Calculator, FileText, Users, MessageCircle,
    Bell, Calendar, Target, BookOpen, Shield, Database,
    Settings, CreditCard, FileCheck, HelpCircle, X,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
    id: string
    label: string
    description: string
    icon: React.ElementType
    href: string
    keywords: string[]
    section: 'navegación' | 'administración' | 'acciones'
    permission?: Permission  // si no tiene, es visible para todos
}

const ALL_COMMANDS: CommandItem[] = [
    { id: 'home', label: 'Inicio', description: 'Volver al dashboard principal', icon: Home, href: '/', keywords: ['inicio', 'home', 'dashboard', 'principal'], section: 'navegación' },
    { id: 'calculator', label: 'Calculadora de Cobertura', description: 'Calcular cobertura de prácticas', icon: Calculator, href: '/calculator', keywords: ['calculadora', 'cobertura', 'calcular', 'practica'], section: 'navegación', permission: 'calculator.use' },
    { id: 'matcher', label: 'Homologador', description: 'Homologar nomencladores externos', icon: Target, href: '/matcher', keywords: ['homologador', 'homologar', 'matchear', 'nomenclador'], section: 'navegación', permission: 'matcher.use' },
    { id: 'audits', label: 'Auditorías', description: 'Ver y gestionar auditorías', icon: FileText, href: '/audits', keywords: ['auditorias', 'auditoria', 'revisar', 'aprobadas', 'rechazadas'], section: 'navegación', permission: 'audits.view' },
    { id: 'pending', label: 'Pendientes', description: 'Auditorías pendientes de revisión', icon: FileCheck, href: '/pending', keywords: ['pendientes', 'pendiente', 'revisar', 'aprobar', 'rechazar'], section: 'navegación', permission: 'pending.view' },
    { id: 'patients', label: 'Pacientes / Afiliados', description: 'Padrón de afiliados', icon: Users, href: '/patients', keywords: ['pacientes', 'afiliados', 'padron', 'dni', 'buscar afiliado'], section: 'navegación', permission: 'patients.view' },
    { id: 'chat', label: 'Chat', description: 'Mensajería interna', icon: MessageCircle, href: '/chat', keywords: ['chat', 'mensaje', 'mensajes', 'comunicacion'], section: 'navegación', permission: 'chat.direct_only' },
    { id: 'alerts', label: 'Alertas Presupuestarias', description: 'Alertas y desvíos detectados', icon: Bell, href: '/alerts', keywords: ['alertas', 'alerta', 'desvio', 'presupuesto', 'critica'], section: 'navegación', permission: 'alerts.view' },
    { id: 'agenda', label: 'Agenda', description: 'Calendario y eventos', icon: Calendar, href: '/agenda', keywords: ['agenda', 'calendario', 'evento', 'eventos', 'reunion', 'turno'], section: 'navegación', permission: 'agenda.view' },
    { id: 'practices', label: 'Nomencladores', description: 'Gestión de prácticas y nomencladores', icon: BookOpen, href: '/practices', keywords: ['nomenclador', 'nomencladores', 'practicas', 'codigo', 'nbu'], section: 'navegación', permission: 'nomenclators.view' },
    { id: 'protocols', label: 'Protocolos', description: 'Protocolos médicos de referencia', icon: Shield, href: '/protocols', keywords: ['protocolo', 'protocolos', 'clinico', 'medico', 'guia'], section: 'navegación', permission: 'protocols.view' },
    { id: 'help', label: 'Centro de Ayuda', description: 'Documentación y preguntas frecuentes', icon: HelpCircle, href: '/help', keywords: ['ayuda', 'help', 'faq', 'preguntas', 'como', 'documentacion', 'manual'], section: 'navegación' },
    // Administración
    { id: 'external-nom', label: 'Nomencladores Externos', description: 'Gestionar nomencladores de terceros', icon: FileText, href: '/practices/external', keywords: ['nomenclador externo', 'externo', 'terceros', 'importar'], section: 'administración', permission: 'nomenclators.manage' },
    { id: 'users', label: 'Usuarios', description: 'Gestión de usuarios del sistema', icon: Users, href: '/users', keywords: ['usuarios', 'usuario', 'crear usuario', 'roles', 'permisos'], section: 'administración', permission: 'users.manage' },
    { id: 'values', label: 'Valores de Unidades', description: 'Configurar valores NBU, Galeno, UO', icon: CreditCard, href: '/settings/values', keywords: ['valores', 'nbu', 'galeno', 'uo', 'unidad', 'arancel'], section: 'administración', permission: 'config.values' },
    { id: 'backup', label: 'Backup', description: 'Exportar e importar datos', icon: Database, href: '/backup', keywords: ['backup', 'exportar', 'importar', 'respaldo', 'json'], section: 'administración', permission: 'backup.export' },
    { id: 'settings', label: 'Configuración', description: 'Ajustes del sistema', icon: Settings, href: '/settings', keywords: ['configuracion', 'ajustes', 'config', 'preferencias'], section: 'administración', permission: 'config.view' },
]

function normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { hasPermission } = useAuth()

    // Ctrl+K to open/close
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(prev => {
                    if (!prev) {
                        // Reset state when opening
                        setQuery('')
                        setSelectedIndex(0)
                    }
                    return !prev
                })
            }
            if (e.key === 'Escape') {
                setOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    // Filter by permissions first, then by query
    const permittedCommands = useMemo(() => {
        return ALL_COMMANDS.filter(cmd => !cmd.permission || hasPermission(cmd.permission))
    }, [hasPermission])

    const filtered = useMemo(() => {
        if (!query.trim()) return permittedCommands
        const q = normalize(query)
        return permittedCommands.filter(cmd =>
            normalize(cmd.label).includes(q) ||
            normalize(cmd.description).includes(q) ||
            cmd.keywords.some(k => normalize(k).includes(q))
        )
    }, [query, permittedCommands])

    // Group by section, computing stable flat indices
    const { grouped, flatList } = useMemo(() => {
        const sections: Record<string, { item: CommandItem; flatIdx: number }[]> = {}
        filtered.forEach((item, idx) => {
            if (!sections[item.section]) sections[item.section] = []
            sections[item.section].push({ item, flatIdx: idx })
        })
        return { grouped: sections, flatList: filtered }
    }, [filtered])

    const navigate = useCallback((item: CommandItem) => {
        setOpen(false)
        router.push(item.href)
    }, [router])

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(i => Math.min(i + 1, flatList.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (flatList[selectedIndex]) {
                navigate(flatList[selectedIndex])
            }
        }
    }, [flatList, selectedIndex, navigate])

    // Scroll selected item into view
    useEffect(() => {
        const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
        el?.scrollIntoView({ block: 'nearest' })
    }, [selectedIndex])

    if (!open) return null

    const sectionLabels: Record<string, string> = {
        'navegación': 'Navegación',
        'administración': 'Administración',
        'acciones': 'Acciones rápidas',
    }

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

            {/* Palette */}
            <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-700 overflow-hidden">
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-slate-700">
                        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar módulos, acciones..."
                            value={query}
                            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground dark:text-white"
                        />
                        <button
                            onClick={() => setOpen(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Results */}
                    <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
                        {flatList.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No se encontraron resultados para &quot;{query}&quot;
                            </div>
                        ) : (
                            Object.entries(grouped).map(([section, entries]) => (
                                <div key={section}>
                                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {sectionLabels[section] || section}
                                    </div>
                                    {entries.map(({ item, flatIdx }) => (
                                        <button
                                            key={item.id}
                                            data-index={flatIdx}
                                            onClick={() => navigate(item)}
                                            onMouseEnter={() => setSelectedIndex(flatIdx)}
                                            className={cn(
                                                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                                                flatIdx === selectedIndex
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-foreground hover:bg-muted"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0 opacity-60" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium block">{item.label}</span>
                                                <span className="text-xs text-muted-foreground truncate block">{item.description}</span>
                                            </div>
                                            <ArrowRight className={cn(
                                                "h-3 w-3 shrink-0 transition-opacity",
                                                flatIdx === selectedIndex ? "opacity-100" : "opacity-0"
                                            )} />
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t dark:border-slate-700 text-xs text-muted-foreground bg-muted/30">
                        <div className="flex gap-3">
                            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↑↓</kbd> navegar</span>
                            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd> ir</span>
                            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> cerrar</span>
                        </div>
                        <span>{flatList.length} resultado{flatList.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
