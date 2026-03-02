'use client'

import { Card } from '@/components/ui/card'
import { DashboardStats } from '@/hooks/useDashboardStats'
import {
    Users, FileCheck, AlertTriangle, Calendar,
    TrendingUp, TrendingDown, ShieldCheck,
    CheckCircle, XCircle, Clock, DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardsProps {
    stats: DashboardStats
    showRevenue?: boolean
}

interface KPICardData {
    label: string
    value: string | number
    subValue?: string
    icon: React.ElementType
    color: string
    bgColor: string
    trend?: 'up' | 'down' | 'neutral'
}

export function KPICards({ stats, showRevenue = false }: KPICardsProps) {
    if (stats.loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3" />
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-24" />
                    </Card>
                ))}
            </div>
        )
    }

    const cards: KPICardData[] = [
        {
            label: 'Afiliados Activos',
            value: stats.activeAffiliates,
            subValue: `${stats.totalAffiliates} total · ${stats.suspendedAffiliates} susp.`,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
            label: 'Auditorías Pendientes',
            value: stats.pendingAudits,
            subValue: `${stats.totalAudits} total`,
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        },
        {
            label: 'Tasa Aprobación',
            value: `${stats.approvalRate}%`,
            subValue: `${stats.approvedAudits} aprob. · ${stats.rejectedAudits} rech.`,
            icon: CheckCircle,
            color: stats.approvalRate >= 70 ? 'text-green-600' : 'text-red-600',
            bgColor: stats.approvalRate >= 70 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30',
            trend: stats.approvalRate >= 70 ? 'up' : 'down',
        },
        {
            label: 'Alertas Activas',
            value: stats.activeAlerts,
            subValue: stats.criticalAlerts > 0 ? `${stats.criticalAlerts} críticas` : 'Sin críticas',
            icon: AlertTriangle,
            color: stats.criticalAlerts > 0 ? 'text-red-600' : 'text-emerald-600',
            bgColor: stats.criticalAlerts > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30',
        },
        {
            label: 'Aprobadas',
            value: stats.approvedAudits,
            subValue: 'Auditorías aprobadas',
            icon: ShieldCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-950/30',
        },
        {
            label: 'Rechazadas',
            value: stats.rejectedAudits,
            subValue: 'Auditorías rechazadas',
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-950/30',
        },
        {
            label: 'Req. Autorización',
            value: stats.requiresAuthAudits,
            subValue: 'Esperando autorización',
            icon: FileCheck,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        },
        {
            label: 'Eventos Próximos',
            value: stats.upcomingEvents,
            subValue: 'En agenda',
            icon: Calendar,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
        },
    ]

    // Agregar cards de revenue si el usuario tiene permiso
    if (showRevenue) {
        cards.push(
            {
                label: 'Recaudación (12m)',
                value: formatCurrency(stats.totalRevenue),
                subValue: 'Últimos 12 meses',
                icon: DollarSign,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
                trend: 'up',
            },
            {
                label: 'Gasto (12m)',
                value: formatCurrency(stats.totalExpense),
                subValue: 'Cobertura aprobada',
                icon: TrendingDown,
                color: 'text-orange-600',
                bgColor: 'bg-orange-50 dark:bg-orange-950/30',
                trend: 'down',
            },
            {
                label: 'Siniestralidad',
                value: `${stats.siniestralidad}%`,
                subValue: stats.siniestralidad > 80 ? '⚠️ Por encima del objetivo' : '✓ Dentro del objetivo',
                icon: stats.siniestralidad > 80 ? TrendingUp : TrendingDown,
                color: stats.siniestralidad > 80 ? 'text-red-600' : 'text-green-600',
                bgColor: stats.siniestralidad > 80 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30',
                trend: stats.siniestralidad > 80 ? 'up' : 'down',
            }
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card) => (
                <Card
                    key={card.label}
                    className={cn(
                        'p-4 border transition-all hover:shadow-md hover:scale-[1.02]',
                        card.bgColor
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {card.label}
                        </span>
                        <card.icon className={cn('h-5 w-5', card.color)} />
                    </div>
                    <div className={cn('text-2xl font-bold', card.color)}>
                        {card.value}
                    </div>
                    {card.subValue && (
                        <p className="text-xs text-muted-foreground mt-1">{card.subValue}</p>
                    )}
                </Card>
            ))}
        </div>
    )
}

function formatCurrency(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toLocaleString('es-AR')}`
}
