"use client"

import { JurisdictionToggle } from "./JurisdictionToggle"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useAlertCounts } from "@/lib/useAlerts"
import { Search, Bell, Settings, Camera, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePathname } from "next/navigation"
import Link from "next/link"

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
    const alertCounts = useAlertCounts(activeJurisdiction?.id)

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm">
            {/* Left: Page Title / Toggle */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden">
                    <span className="sr-only">Menu</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </Button>
                <h1 className="text-xl font-semibold text-foreground">
                    {pageTitle}
                </h1>
            </div>

            {/* Center: Search Bar (Auditor-IA style) */}
            <div className="flex-1 max-w-xl mx-8 hidden md:block">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar pacientes, códigos, protocolos..."
                        className="w-full pl-10 bg-background border-border focus-visible:ring-primary rounded-full"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                        ctrl+k
                    </span>
                </div>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-3">
                <JurisdictionToggle />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDarkMode}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Settings className="h-5 w-5" />
                </Button>

                <Link href="/alerts">
                    <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                        <Bell className="h-5 w-5" />
                        {alertCounts.total > 0 ? (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border border-card">
                                {alertCounts.total > 9 ? '9+' : alertCounts.total}
                            </span>
                        ) : (
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gray-300 border border-card" />
                        )}
                    </Button>
                </Link>

                <div className="flex items-center gap-3 pl-3 border-l ml-1">
                    <div className="flex flex-col text-right hidden md:block">
                        <span className="text-sm font-medium text-foreground">Admin Sistema</span>
                        <span className="text-xs text-muted-foreground">Superusuario</span>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                        SA
                    </div>
                </div>
            </div>
        </header>
    )
}
