"use client"

import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useAuth } from "@/contexts/AuthContext"
import { useActiveAlerts } from "@/lib/useAlerts"
import { Bell, Moon, Sun, Home, ChevronRight, MessageCircle, HelpCircle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

const pageTitles: Record<string, string> = {
    '/': 'Inicio',
    '/calculator': 'Calculadora de Cobertura',
    '/practices': 'Nomencladores',
    '/practices/external': 'Nomencladores Externos',
    '/patients': 'Pacientes',
    '/audits': 'Auditorías',
    '/alerts': 'Alertas Presupuestarias',
    '/help': 'Centro de Ayuda',
    '/settings': 'Configuración',
    '/settings/values': 'Valores de Unidades',
    '/pending': 'Pendientes',
    '/users': 'Usuarios',
    '/chat': 'Chat',
    '/agenda': 'Agenda',
    '/matcher': 'Homologador',
    '/backup': 'Backup',
    '/protocols': 'Protocolos',
    '/modules': 'Módulos Disponibles',
    '/audits/requests': 'Solicitudes de Auditoría',
    '/audits/requests/new': 'Nueva Solicitud',
}

export function Header() {
    const { activeJurisdiction, isDarkMode, toggleDarkMode } = useJurisdiction()
    const { user, signOut } = useAuth()
    const pathname = usePathname()

    const handleLogout = () => {
        signOut() // limpia estado local inmediatamente
        // Forzar recarga completa para evitar conflictos con el router de Next.js
        window.location.replace('/welcome')
    }
    const pageTitle = pageTitles[pathname] || 'CPCE Salud'
    const activeAlerts = useActiveAlerts(activeJurisdiction?.id)
    const isHome = pathname === '/'

    // Colores dinámicos para header (mismo que sidebar)
    const headerColors = {
        camera1Light: 'bg-gradient-to-r from-blue-50 to-blue-100',
        camera1Dark: 'bg-gradient-to-r from-slate-900 to-blue-950',
        camera2Light: 'bg-gradient-to-r from-emerald-50 to-emerald-100',
        camera2Dark: 'bg-gradient-to-r from-slate-900 to-emerald-950',
    }

    const getHeaderBg = () => {
        if (activeJurisdiction?.id === 1) {
            return isDarkMode ? headerColors.camera1Dark : headerColors.camera1Light
        }
        return isDarkMode ? headerColors.camera2Dark : headerColors.camera2Light
    }

    return (
        <header className={cn("sticky top-0 z-30 flex h-16 items-center justify-between border-b shadow-sm px-6", getHeaderBg())}>
            {/* Left: Home + Breadcrumb */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden">
                    <span className="sr-only">Menu</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </Button>

                {!isHome && (
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" title="Volver al inicio">
                            <Home className="h-5 w-5" />
                        </Button>
                    </Link>
                )}

                {!isHome && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                )}

                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                    {pageTitle}
                </h1>
            </div>

            {/* Right: Actions & Avatar */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDarkMode}
                    className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                    title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                {/* Ayuda */}
                <Link href="/help">
                    <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-300 relative" title="Centro de Ayuda">
                        <HelpCircle className="h-5 w-5" />
                    </Button>
                </Link>

                {/* Chat */}
                <Link href="/chat">
                    <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-300 relative" title="Chat interno">
                        <MessageCircle className="h-5 w-5" />
                    </Button>
                </Link>

                {/* Alertas */}
                <Link href="/alerts">
                    <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-300 relative">
                        <Bell className="h-5 w-5" />
                        {activeAlerts.length > 0 ? (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border border-card">
                                {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
                            </span>
                        ) : (
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600 border border-card" />
                        )}
                    </Button>
                </Link>

                {/* Avatar con iniciales del usuario */}
                <Link href="/settings">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" title={user?.full_name || 'Usuario'}>
                        {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </div>
                </Link>

                {/* Cerrar sesión */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                    title="Cerrar sesión"
                >
                    <LogOut className="h-4.5 w-4.5" />
                </Button>
            </div>
        </header>
    )
}
