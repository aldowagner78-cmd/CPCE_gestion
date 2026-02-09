"use client"

import { JurisdictionToggle } from "./JurisdictionToggle"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useActiveAlerts } from "@/lib/useAlerts"
import { Search, Bell, Settings, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

const pageTitles: Record<string, string> = {
    '/': 'Dashboard',
    '/calculator': 'Calculadora de Cobertura',
    '/practices': 'Nomencladores',
    '/patients': 'Pacientes',
    '/audits': 'Auditorías',
    '/alerts': 'Alertas Presupuestarias',
    '/help': 'Centro de Ayuda',
    '/settings': 'Configuración',
    '/pending': 'Pendientes',
    '/users': 'Usuarios',
}

export function Header() {
    const { activeJurisdiction, isDarkMode, toggleDarkMode } = useJurisdiction()
    const pathname = usePathname()
    const pageTitle = pageTitles[pathname] || 'CPCE Salud'
    const activeAlerts = useActiveAlerts(activeJurisdiction?.id)

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
            {/* Left: Page Title */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden">
                    <span className="sr-only">Menu</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </Button>
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                    {pageTitle}
                </h1>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-xl mx-8 hidden md:block">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar pacientes, códigos, protocolos..."
                        className="w-full pl-10 bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 focus-visible:ring-primary rounded-full"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border">
                        ctrl+k
                    </span>
                </div>
            </div>

            {/* Right: Actions & Avatar */}
            <div className="flex items-center gap-3">
                <JurisdictionToggle />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDarkMode}
                    className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                    title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-300">
                    <Settings className="h-5 w-5" />
                </Button>

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

                {/* Solo avatar, sin texto */}
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                    SA
                </div>
            </div>
        </header>
    )
}
