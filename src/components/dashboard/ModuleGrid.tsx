'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { Permission } from '@/types/auth'
import { cn } from '@/lib/utils'
import {
    Calculator, FileText, Target, MessageCircle,
    Bell, Calendar, Users, Database, Settings,
    CreditCard, Shield,
    FileCheck, BookOpen, Loader2
} from 'lucide-react'

interface ModuleItem {
    icon: React.ElementType
    label: string
    description: string
    href: string
    permission?: Permission
    color: string
    bgColor: string
}

// Definición de todos los módulos disponibles
const ALL_MODULES: ModuleItem[] = [
    {
        icon: Calculator,
        label: 'Calculadora',
        description: 'Calcular cobertura de prácticas',
        href: '/calculator',
        permission: 'calculator.use',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50',
    },
    {
        icon: Target,
        label: 'Homologador',
        description: 'Homologar nomencladores',
        href: '/matcher',
        permission: 'matcher.use',
        color: 'text-violet-600',
        bgColor: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/50',
    },
    {
        icon: FileText,
        label: 'Auditorías',
        description: 'Historial y gestión de auditorías',
        href: '/audits',
        permission: 'audits.view',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50',
    },
    {
        icon: FileCheck,
        label: 'Pendientes',
        description: 'Prácticas pendientes de resolución',
        href: '/pending',
        permission: 'pending.view',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50',
    },
    {
        icon: Users,
        label: 'Pacientes',
        description: 'Padrón de afiliados',
        href: '/patients',
        permission: 'patients.view',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:hover:bg-cyan-950/50',
    },
    {
        icon: MessageCircle,
        label: 'Chat',
        description: 'Consultas internas',
        href: '/chat',
        permission: 'chat.direct_only',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-950/50',
    },
    {
        icon: Bell,
        label: 'Alertas',
        description: 'Alertas presupuestarias',
        href: '/alerts',
        permission: 'alerts.view',
        color: 'text-red-600',
        bgColor: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50',
    },
    {
        icon: Calendar,
        label: 'Agenda',
        description: 'Eventos y recordatorios',
        href: '/agenda',
        permission: 'agenda.view',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50',
    },
    {
        icon: BookOpen,
        label: 'Nomencladores',
        description: 'Catálogo de prácticas',
        href: '/practices',
        permission: 'nomenclators.view',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-950/50',
    },
    {
        icon: Shield,
        label: 'Protocolos',
        description: 'Protocolos clínicos',
        href: '/protocols',
        permission: 'protocols.view',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50',
    },
    {
        icon: Database,
        label: 'Backup',
        description: 'Exportar datos del sistema',
        href: '/backup',
        permission: 'backup.export',
        color: 'text-slate-600',
        bgColor: 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/30 dark:hover:bg-slate-950/50',
    },
    {
        icon: Users,
        label: 'Usuarios',
        description: 'Gestionar usuarios y roles',
        href: '/users',
        permission: 'users.manage',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50',
    },
    {
        icon: CreditCard,
        label: 'Valores',
        description: 'Valores de unidades por tipo',
        href: '/settings/values',
        permission: 'config.values',
        color: 'text-green-600',
        bgColor: 'bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50',
    },
    {
        icon: Settings,
        label: 'Configuración',
        description: 'Ajustes del sistema',
        href: '/settings',
        permission: 'config.view',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/30 dark:hover:bg-gray-800/50',
    },
]

export function ModuleGrid() {
    const { user, hasPermission, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Filtrar módulos según permisos del usuario
    const visibleModules = ALL_MODULES.filter((mod) => {
        if (!mod.permission) return true
        if (user?.is_superuser) return true
        return hasPermission(mod.permission)
    })

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visibleModules.map((mod) => (
                <Link key={mod.href} href={mod.href}>
                    <Card className={cn(
                        'p-4 flex flex-col items-center text-center gap-2 cursor-pointer transition-all',
                        'hover:shadow-md hover:scale-[1.03] border',
                        mod.bgColor
                    )}>
                        <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center',
                            'bg-white/70 dark:bg-black/20 shadow-sm'
                        )}>
                            <mod.icon className={cn('h-6 w-6', mod.color)} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{mod.description}</span>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
