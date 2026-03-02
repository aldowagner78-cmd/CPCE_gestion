"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useAuth } from "@/contexts/AuthContext"
import { useAudits } from "@/lib/useAudits"
import { useActiveAlerts } from "@/lib/useAlerts"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { KPICards } from "@/components/dashboard/KPICards"
import { ModuleGrid } from "@/components/dashboard/ModuleGrid"
import { ROLE_LABELS } from "@/types/auth"
import Link from "next/link"
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Bell,
  Info,
  AlertCircle,
  Megaphone,
} from "lucide-react"

const STATUS_BADGE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  approved: { label: "Aprobada", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-700", icon: XCircle },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  pending: { label: "Pendiente", color: "bg-blue-100 text-blue-700", icon: Clock },
  requires_auth: { label: "Req. Auth", color: "bg-purple-100 text-purple-700", icon: ShieldCheck },
}

export default function WelcomePage() {
  const { activeJurisdiction } = useJurisdiction()
  const { user, hasPermission } = useAuth()
  const stats = useDashboardStats(activeJurisdiction?.id)
  const audits = useAudits(activeJurisdiction?.id)
  const recentAudits = audits.slice(0, 5)
  const activeAlerts = useActiveAlerts(activeJurisdiction?.id).slice(0, 3)

  const showRevenue = hasPermission('revenue.view')

  const SEVERITY_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    critical: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
    info: { icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
  }

  // Saludo contextual
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="space-y-6">
      {/* ─── Encabezado de Bienvenida ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABELS[user?.role || 'auditor']} · {activeJurisdiction?.name || 'CPCE Salud'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ─── KPIs ─── */}
      <KPICards stats={stats} showRevenue={showRevenue} />

      {/* ─── Fila: Alertas + Últimas Auditorías ─── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Alertas */}
        {hasPermission('alerts.view') && (
          <Card className="lg:w-1/3 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Alertas
                {activeAlerts.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {activeAlerts.length}
                  </span>
                )}
              </h2>
              <Link href="/alerts">
                <Button variant="ghost" className="text-xs text-muted-foreground h-auto p-0 hover:bg-transparent hover:underline">Ver todas</Button>
              </Link>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
                <div className="bg-green-100 dark:bg-green-950/50 p-2 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <span>Sin alertas activas</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAlerts.map((alert) => {
                  const sev = SEVERITY_ICON[alert.severity] ?? SEVERITY_ICON.info
                  const SevIcon = sev.icon
                  return (
                    <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.severity === 'critical' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : alert.severity === 'warning' ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'}`}>
                      <div className={`p-1.5 rounded-full ${sev.bg} shrink-0`}>
                        <SevIcon className={`h-3.5 w-3.5 ${sev.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{alert.rule_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* Últimas Auditorías */}
        {hasPermission('audits.view') && (
          <Card className="flex-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <HistoryIcon className="w-4 h-4" />
                Últimas Auditorías
              </h2>
              <Link href="/audits">
                <Button variant="ghost" className="text-xs text-muted-foreground h-auto p-0 hover:bg-transparent hover:underline">Ver todas</Button>
              </Link>
            </div>

            {recentAudits.length === 0 ? (
              <div className="flex flex-col justify-center items-center text-center py-8 space-y-2">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">Las auditorías recientes aparecerán aquí</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Afiliado</th>
                      <th className="pb-2 font-medium">Práctica</th>
                      <th className="pb-2 font-medium">Cobertura</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudits.map((a) => {
                      const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.pending
                      const BadgeIcon = badge.icon
                      return (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="py-2.5">{a.affiliate_name}</td>
                          <td className="py-2.5">{a.practice_code}</td>
                          <td className="py-2.5 font-medium">{a.coverage_percent}%</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("es-AR")}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ─── Grid de Módulos ─── */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          Módulos Disponibles
        </h2>
        <ModuleGrid />
      </div>
    </div>
  )
}

function HistoryIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /><path d="M12 7v5l4 2" /></svg>
}
