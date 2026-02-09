"use client"

import { useState } from "react"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useAudits, useAuditCounts } from "@/lib/useAudits"
import { AuditService } from "@/services/auditService"
import { AuditStatus } from "@/types/database"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Activity,
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    ShieldCheck,
    FileText,
    Filter,
    FileDown,
} from "lucide-react"
import { generateAuditPDF } from "@/lib/auditPDF"

const STATUS_CONFIG: Record<AuditStatus, { label: string; color: string; icon: React.ElementType }> = {
    approved: { label: "Aprobada", color: "bg-green-100 text-green-700", icon: CheckCircle },
    rejected: { label: "Rechazada", color: "bg-red-100 text-red-700", icon: XCircle },
    partial: { label: "Parcial", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
    pending: { label: "Pendiente", color: "bg-blue-100 text-blue-700", icon: Clock },
    requires_auth: { label: "Req. Autorización", color: "bg-purple-100 text-purple-700", icon: ShieldCheck },
}

export default function AuditsPage() {
    const { activeJurisdiction } = useJurisdiction()
    const audits = useAudits(activeJurisdiction?.id)
    const counts = useAuditCounts(activeJurisdiction?.id)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<AuditStatus | "all">("all")

    if (!activeJurisdiction) {
        return <div className="p-8 text-center text-muted-foreground">Cargando...</div>
    }

    const filtered = audits.filter((audit) => {
        const matchesSearch =
            !searchTerm.trim() ||
            audit.affiliate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            audit.affiliate_document.includes(searchTerm) ||
            audit.practice_code.includes(searchTerm) ||
            audit.practice_description.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = filterStatus === "all" || audit.status === filterStatus

        return matchesSearch && matchesStatus
    })

    const handleStatusChange = (auditId: number, newStatus: AuditStatus) => {
        AuditService.updateStatus(auditId, newStatus)
    }

    return (
        <div className="space-y-6 container mx-auto max-w-6xl pt-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                    <Activity className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Auditorías</h1>
                    <p className="text-muted-foreground">Registro y seguimiento — {activeJurisdiction.name}</p>
                </div>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(Object.entries(STATUS_CONFIG) as [AuditStatus, typeof STATUS_CONFIG[AuditStatus]][]).map(([key, config]) => {
                    const Icon = config.icon
                    const count = counts[key as keyof typeof counts] ?? 0
                    return (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                            className={`border rounded-lg p-3 space-y-1 hover:shadow-sm transition-all text-left ${filterStatus === key ? "ring-2 ring-primary" : ""}`}
                        >
                            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                                <Icon className="w-3 h-3 mr-1" />
                                {config.label}
                            </div>
                            <div className="text-2xl font-bold text-foreground">{count}</div>
                        </button>
                    )
                })}
            </div>

            {/* Search & Filter */}
            <Card className="p-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por afiliado, DNI, código de práctica..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {filterStatus !== "all" && (
                        <Button variant="outline" size="sm" onClick={() => setFilterStatus("all")} className="shrink-0">
                            <Filter className="h-4 w-4 mr-1" /> Limpiar filtro
                        </Button>
                    )}
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50">
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">N°</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Afiliado</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Práctica</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Plan</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Cobertura</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Copago</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Estado</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Fecha</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            <div className="bg-gray-100 p-4 rounded-full">
                                                <FileText className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground">Sin auditorías</h3>
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                Las auditorías se generan desde la Calculadora de Cobertura.
                                                Vaya a la calculadora, ejecute un cálculo y presione &quot;Registrar Auditoría&quot;.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((audit) => {
                                    const statusConf = STATUS_CONFIG[audit.status]
                                    const StatusIcon = statusConf.icon
                                    const dateStr = new Date(audit.created_at).toLocaleDateString("es-AR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    return (
                                        <tr key={audit.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-3 font-mono text-xs text-muted-foreground">#{audit.id}</td>
                                            <td className="p-3">
                                                <div className="font-medium text-foreground text-xs">{audit.affiliate_name}</div>
                                                <div className="text-xs text-muted-foreground">DNI: {audit.affiliate_document}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium text-foreground text-xs">{audit.practice_code}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{audit.practice_description}</div>
                                            </td>
                                            <td className="p-3 text-xs">{audit.plan_name}</td>
                                            <td className="p-3 text-right font-mono text-xs">{audit.coverage_percent}%</td>
                                            <td className="p-3 text-right font-mono text-xs">
                                                {audit.copay > 0 ? `$${audit.copay.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "—"}
                                            </td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {statusConf.label}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                                            <td className="p-3">
                                                <div className="flex gap-1 items-center">
                                                    {(audit.status === "requires_auth" || audit.status === "pending") && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                                                onClick={() => handleStatusChange(audit.id, "approved")}
                                                            >
                                                                Aprobar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50"
                                                                onClick={() => handleStatusChange(audit.id, "rejected")}
                                                            >
                                                                Rechazar
                                                            </Button>
                                                        </>
                                                    )}
                                                    {audit.status === "approved" && audit.reviewed_at && (
                                                        <span className="text-xs text-muted-foreground">Revisada</span>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                        onClick={() => generateAuditPDF(audit)}
                                                        title="Exportar PDF"
                                                    >
                                                        <FileDown className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="text-xs text-muted-foreground text-center">
                Mostrando {filtered.length} de {audits.length} auditorías
            </div>
        </div>
    )
}
