"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useAuditCounts, useAudits } from "@/lib/useAudits"
import { useActiveAlerts, useAlertCounts } from "@/lib/useAlerts"
import Link from "next/link"
import {
  Plus,
  Calculator,
  FileCheck,
  FileX,
  FileClock,
  AlertCircle,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Bell,
  Info,
} from "lucide-react"

const STATUS_BADGE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  approved: { label: "Aprobada", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-700", icon: XCircle },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  pending: { label: "Pendiente", color: "bg-blue-100 text-blue-700", icon: Clock },
  requires_auth: { label: "Req. Auth", color: "bg-purple-100 text-purple-700", icon: ShieldCheck },
}

export default function DashboardPage() {
  const { activeJurisdiction } = useJurisdiction()
  const counts = useAuditCounts(activeJurisdiction?.id)
  const audits = useAudits(activeJurisdiction?.id)
  const recentAudits = audits.slice(0, 5)
  const alertCounts = useAlertCounts(activeJurisdiction?.id)
  const activeAlerts = useActiveAlerts(activeJurisdiction?.id).slice(0, 3)

  const SEVERITY_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    critical: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
    info: { icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">

        {/* Left Column: Audit Status */}
        <Card className="flex-1 p-6 space-y-6">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Estado de Auditorías
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <StatusPill
              label="Aprobadas"
              count={counts.approved}
              color="bg-status-approved text-status-approved-fg"
              icon={FileCheck}
            />
            <StatusPill
              label="Rechazadas"
              count={counts.rejected}
              color="bg-status-rejected text-status-rejected-fg"
              icon={FileX}
            />
            <StatusPill
              label="Parciales"
              count={counts.partial}
              color="bg-status-partial text-status-partial-fg"
              icon={AlertCircle}
            />
            <StatusPill
              label="Pendientes"
              count={counts.pending + counts.requires_auth}
              color="bg-status-pending text-status-pending-fg"
              icon={FileClock}
            />
          </div>
        </Card>

        {/* Right Column: Quick Actions */}
        <Card className="flex-1 p-6 space-y-6">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <ZapIcon className="w-4 h-4" />
            Acciones Rápidas
          </h2>

          <div className="space-y-3">
            <Link href="/patients">
              <Button className="w-full justify-start h-12 text-base font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-indigo-200">
                <UserPlusIcon className="mr-2 h-5 w-5 text-indigo-600" />
                Nuevo Paciente
              </Button>
            </Link>

            <Link href="/calculator">
              <Button className="w-full justify-start h-12 text-base font-medium bg-action-orange text-white hover:bg-orange-600">
                <Plus className="mr-2 h-5 w-5" />
                Nueva Auditoría
              </Button>
            </Link>

            <Link href="/calculator">
              <Button variant="outline" className="w-full justify-start h-12 text-base font-medium border-dashed">
                <Calculator className="mr-2 h-5 w-5 text-muted-foreground" />
                Calculadora
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Middle Section: Alerts Widget */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas Presupuestarias
            {alertCounts.total > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {alertCounts.total}
              </span>
            )}
          </h2>
          <Link href="/alerts">
            <Button variant="ghost" className="text-xs text-muted-foreground h-auto p-0 hover:bg-transparent hover:underline">Ver todas</Button>
          </Link>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <span>Sin alertas activas. El sistema evaluará automáticamente al registrar auditorías.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map((alert) => {
              const sev = SEVERITY_ICON[alert.severity] ?? SEVERITY_ICON.info
              const SevIcon = sev.icon
              return (
                <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.severity === 'critical' ? 'border-red-200 bg-red-50/50' : alert.severity === 'warning' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
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

      {/* Bottom Section: Recent Audits */}
      <Card className="relative p-6 min-h-64">
        <div className="flex w-full justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <HistoryIcon className="w-4 h-4" />
            Últimas Auditorías
          </h2>
          <Link href="/audits">
            <Button variant="ghost" className="text-xs text-muted-foreground h-auto p-0 hover:bg-transparent hover:underline">Ver todas</Button>
          </Link>
        </div>

        {recentAudits.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-center py-12 space-y-2">
            <div className="bg-gray-100 p-4 rounded-full inline-block">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Sin auditorías</h3>
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
    </div>
  )
}

function StatusPill({ label, count, color, icon: Icon }: { label: string, count: number, color: string, icon: any }) {
  return (
    <div className="border rounded-lg p-3 space-y-3 hover:shadow-sm transition-shadow">
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {count}
      </div>
    </div>
  )
}

// Simple icons for locally defined usage
function ClockIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}

function ZapIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
}

function UserPlusIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
}

function HistoryIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /><path d="M12 7v5l4 2" /></svg>
}
