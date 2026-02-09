"use client"

import { useState } from "react"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useSupabaseAlerts, useSupabaseAlertCounts } from "@/lib/useSupabaseAlerts"
import { AlertSeverity, AlertStatus } from "@/services/alertService.supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Bell,
    Search,
    AlertTriangle,
    AlertCircle,
    Info,
    Shield,
    Filter,
    Eye,
    X,
    CheckCircle,
    Loader2,
} from "lucide-react"

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    critical: { label: "Crítica", color: "text-red-700", bg: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
    high: { label: "Alta", color: "text-orange-700", bg: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle },
    medium: { label: "Media", color: "text-amber-700", bg: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
    low: { label: "Baja", color: "text-blue-700", bg: "bg-blue-100 text-blue-700 border-blue-200", icon: Info },
}

const STATUS_CONFIG: Record<AlertStatus, { label: string; color: string }> = {
    active: { label: "Activa", color: "bg-red-100 text-red-700" },
    acknowledged: { label: "Reconocida", color: "bg-yellow-100 text-yellow-700" },
    resolved: { label: "Resuelta", color: "bg-green-100 text-green-700" },
    dismissed: { label: "Descartada", color: "bg-gray-100 text-gray-500" },
}

export default function AlertsPage() {
    const { activeJurisdiction } = useJurisdiction()
    const { alerts, loading, error, updateStatus } = useSupabaseAlerts(activeJurisdiction?.id)
    const counts = useSupabaseAlertCounts(activeJurisdiction?.id)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all")
    const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("active")

    if (!activeJurisdiction) {
        return <div className="p-8 text-center text-muted-foreground">Cargando...</div>
    }

    const filtered = alerts.filter((alert) => {
        const matchesSearch =
            !searchTerm.trim() ||
            (alert.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (alert.description?.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity
        const matchesStatus = filterStatus === "all" || alert.status === filterStatus

        return matchesSearch && matchesSeverity && matchesStatus
    })

    const handleDismiss = async (alertId: string) => {
        await updateStatus(alertId, "dismissed")
    }

    const handleReview = async (alertId: string) => {
        await updateStatus(alertId, "resolved")
    }

    return (
        <div className="space-y-6 container mx-auto max-w-6xl pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-lg">
                        <Bell className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Alertas Presupuestarias</h1>
                        <p className="text-muted-foreground">
                            Detección de anomalías — {activeJurisdiction.name}
                            <span className="ml-2 text-xs text-green-600 font-medium">● Supabase</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Severity Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                    onClick={() => setFilterSeverity("all")}
                    className={`border rounded-lg p-3 space-y-1 hover:shadow-sm transition-all text-left ${filterSeverity === "all" ? "ring-2 ring-primary" : ""}`}
                >
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <Shield className="w-3 h-3 mr-1" />
                        Total Activas
                    </div>
                    <div className="text-2xl font-bold text-foreground">{counts.active}</div>
                </button>
                <button
                    onClick={() => setFilterSeverity(filterSeverity === "critical" ? "all" : "critical")}
                    className={`border rounded-lg p-3 space-y-1 hover:shadow-sm transition-all text-left ${filterSeverity === "critical" ? "ring-2 ring-primary" : ""}`}
                >
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Críticas
                    </div>
                    <div className="text-2xl font-bold text-foreground">{counts.critical}</div>
                </button>
                <button
                    onClick={() => setFilterSeverity(filterSeverity === "high" ? "all" : "high")}
                    className={`border rounded-lg p-3 space-y-1 hover:shadow-sm transition-all text-left ${filterSeverity === "high" ? "ring-2 ring-primary" : ""}`}
                >
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Altas
                    </div>
                    <div className="text-2xl font-bold text-foreground">{counts.high}</div>
                </button>
                <button
                    onClick={() => setFilterSeverity(filterSeverity === "medium" ? "all" : "medium")}
                    className={`border rounded-lg p-3 space-y-1 hover:shadow-sm transition-all text-left ${filterSeverity === "medium" ? "ring-2 ring-primary" : ""}`}
                >
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <Info className="w-3 h-3 mr-1" />
                        Medias
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {alerts.filter(a => a.severity === 'medium' && a.status === 'active').length}
                    </div>
                </button>
            </div>

            {/* Search & Filter */}
            <Card className="p-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por título o descripción..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="text-sm border rounded-md px-3 py-1 bg-background"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as AlertStatus | "all")}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activas</option>
                        <option value="acknowledged">Reconocidas</option>
                        <option value="resolved">Resueltas</option>
                        <option value="dismissed">Descartadas</option>
                    </select>
                    {(filterSeverity !== "all" || filterStatus !== "active") && (
                        <Button variant="outline" size="sm" onClick={() => { setFilterSeverity("all"); setFilterStatus("active") }} className="shrink-0">
                            <Filter className="h-4 w-4 mr-1" /> Reset
                        </Button>
                    )}
                </div>
            </Card>

            {/* Loading State */}
            {loading && (
                <Card className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Cargando alertas desde Supabase...</p>
                </Card>
            )}

            {/* Error State */}
            {error && (
                <Card className="p-6 text-center border-red-200 bg-red-50">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                </Card>
            )}

            {/* Alerts List */}
            {!loading && !error && (
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <Card className="p-12 text-center">
                            <div className="flex flex-col items-center space-y-3">
                                <div className="bg-green-100 p-4 rounded-full">
                                    <CheckCircle className="h-8 w-8 text-green-500" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground">Sin alertas</h3>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    No hay alertas que coincidan con los filtros aplicados.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        filtered.map((alert) => {
                            const sevConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium
                            const SevIcon = sevConfig.icon
                            const statusConf = STATUS_CONFIG[alert.status] || STATUS_CONFIG.active
                            const dateStr = new Date(alert.created_at).toLocaleDateString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                            })

                            return (
                                <Card
                                    key={alert.id}
                                    className={`p-4 border-l-4 ${alert.severity === 'critical' ? 'border-l-red-500' :
                                            alert.severity === 'high' ? 'border-l-orange-500' :
                                                alert.severity === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500'
                                        } ${alert.status !== 'active' ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className={`p-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-100' :
                                                    alert.severity === 'high' ? 'bg-orange-100' :
                                                        alert.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                                                }`}>
                                                <SevIcon className={`h-4 w-4 ${sevConfig.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sevConfig.bg}`}>
                                                        {sevConfig.label}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                                                        {statusConf.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{dateStr}</span>
                                                </div>
                                                <p className="text-sm font-medium text-foreground mt-1">{alert.title}</p>
                                                {alert.description && (
                                                    <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                                                )}
                                                {alert.type && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Tipo: <strong>{alert.type}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {alert.status === "active" && (
                                            <div className="flex gap-1 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                                    onClick={() => handleReview(alert.id)}
                                                >
                                                    <Eye className="h-3 w-3 mr-1" /> Resolver
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs text-gray-500 border-gray-200 hover:bg-gray-50"
                                                    onClick={() => handleDismiss(alert.id)}
                                                >
                                                    <X className="h-3 w-3 mr-1" /> Descartar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            )
                        })
                    )}
                </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
                Mostrando {filtered.length} de {alerts.length} alertas
            </div>
        </div>
    )
}
