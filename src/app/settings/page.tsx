"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Settings, User, Shield, Palette, Bell, Database,
    Moon, Sun, Monitor, Check, ChevronRight, Lock
} from "lucide-react"
import Link from "next/link"
import { SuperuserCredentialPanel } from "@/components/auth/SuperuserCredentialPanel"

export default function SettingsPage() {
    const { user } = useAuth()
    const { activeJurisdiction, isDarkMode, toggleDarkMode } = useJurisdiction()
    const [activeSection, setActiveSection] = useState<string>('perfil')

    const isAdmin = user && (user.role === 'superuser' || user.role === 'admin')

    const sections = [
        { id: 'perfil', label: 'Mi Perfil', icon: User, description: 'Información personal y preferencias' },
        { id: 'apariencia', label: 'Apariencia', icon: Palette, description: 'Tema visual y personalización' },
        ...(isAdmin ? [{ id: 'credenciales', label: 'Gestión de Credenciales', icon: Lock, description: 'Administrar usuarios y contraseñas' }] : []),
        { id: 'accesos', label: 'Accesos rápidos', icon: ChevronRight, description: 'Links de administración' },
    ]

    return (
        <div className="space-y-6 container mx-auto max-w-5xl pt-2">
            <div className="flex items-center gap-3 mb-2">
                <Settings className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                {/* Sidebar de secciones */}
                <div className="md:col-span-1 space-y-1">
                    {sections.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                                activeSection === s.id
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <s.icon className="h-4 w-4" />
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Contenido */}
                <div className="md:col-span-3 space-y-4">
                    {activeSection === 'perfil' && (
                        <>
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Mi Perfil
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border-2 border-primary/20">
                                            {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">{user?.full_name || 'Usuario'}</h3>
                                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rol</label>
                                            <div className="mt-1">
                                                <Badge variant="secondary" className="capitalize">
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    {user?.role || 'Sin rol'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jurisdicción activa</label>
                                            <p className="mt-1 font-medium">
                                                {activeJurisdiction?.name || 'Sin jurisdicción'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Superusuario</label>
                                            <p className="mt-1">
                                                {user?.is_superuser ? (
                                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                        <Check className="h-3 w-3 mr-1" /> Sí
                                                    </Badge>
                                                ) : 'No'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</label>
                                            <p className="mt-1">
                                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                    Activo
                                                </Badge>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}

                    {activeSection === 'apariencia' && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Palette className="h-5 w-5 text-primary" />
                                Apariencia
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium mb-3 block">Tema visual</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => { if (isDarkMode) toggleDarkMode() }}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                                !isDarkMode
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/30'
                                            }`}
                                        >
                                            <Sun className="h-6 w-6" />
                                            <span className="text-sm font-medium">Claro</span>
                                            {!isDarkMode && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                        <button
                                            onClick={() => { if (!isDarkMode) toggleDarkMode() }}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                                isDarkMode
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/30'
                                            }`}
                                        >
                                            <Moon className="h-6 w-6" />
                                            <span className="text-sm font-medium">Oscuro</span>
                                            {isDarkMode && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border opacity-50 cursor-not-allowed">
                                            <Monitor className="h-6 w-6" />
                                            <span className="text-sm font-medium">Sistema</span>
                                            <span className="text-[10px] text-muted-foreground">Próximamente</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <label className="text-sm font-medium mb-2 block">Jurisdicción activa</label>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Podés cambiar la jurisdicción desde el toggle en el header (esquina superior derecha).
                                    </p>
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                                        <Database className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{activeJurisdiction?.name || 'Cámara I - Santa Fe'}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeSection === 'credenciales' && (
                        <SuperuserCredentialPanel />
                    )}

                    {activeSection === 'accesos' && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <ChevronRight className="h-5 w-5 text-primary" />
                                Accesos rápidos de Administración
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {[
                                    { label: 'Valores de Unidades', href: '/settings/values', icon: Database, desc: 'NBU, Galeno, UO' },
                                    { label: 'Gestión de Usuarios', href: '/users', icon: User, desc: 'Crear y administrar usuarios' },
                                    { label: 'Backup & Exportación', href: '/backup', icon: Database, desc: 'Exportar e importar datos' },
                                    { label: 'Centro de Ayuda', href: '/help', icon: Bell, desc: 'Documentación y FAQ' },
                                ].map(item => (
                                    <Link key={item.href} href={item.href}>
                                        <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer">
                                            <item.icon className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <span className="text-sm font-medium block">{item.label}</span>
                                                <span className="text-xs text-muted-foreground">{item.desc}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
