"use client"

import { useState, useMemo, useEffect } from "react"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MOCK_AFFILIATES, MOCK_PRACTICES, MOCK_PLANS } from "@/lib/mockData"
import { calculateCoverage, CoverageResult } from "@/lib/coverageEngine"
import { Calculator, CheckCircle, XCircle, AlertTriangle, FileText, Loader2, ClipboardCheck, FileDown } from "lucide-react"
import { AuditService } from "@/services/auditService"
import { generateAuditPDF } from "@/lib/auditPDF"

export default function CalculatorPage() {
    const { activeJurisdiction } = useJurisdiction()

    const [selectedAffiliateId, setSelectedAffiliateId] = useState<number | string>("")
    const [selectedPracticeId, setSelectedPracticeId] = useState<number | string>("")
    const [result, setResult] = useState<CoverageResult | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const [auditSaved, setAuditSaved] = useState(false)
    const [lastAffiliateId, setLastAffiliateId] = useState<number | null>(null)
    const [lastPracticeId, setLastPracticeId] = useState<number | null>(null)

    // Reset selections when jurisdiction changes
    useEffect(() => {
        setSelectedAffiliateId("")
        setSelectedPracticeId("")
        setResult(null)
        setAuditSaved(false)
    }, [activeJurisdiction])

    // Filter data by active jurisdiction
    const filteredAffiliates = useMemo(() => {
        if (!activeJurisdiction) return []
        return MOCK_AFFILIATES.filter(a => a.jurisdiction_id === activeJurisdiction.id)
    }, [activeJurisdiction])

    const filteredPractices = useMemo(() => {
        if (!activeJurisdiction) return []
        return MOCK_PRACTICES.filter(p => p.jurisdiction_id === activeJurisdiction.id)
    }, [activeJurisdiction])

    if (!activeJurisdiction) {
        return <div className="p-8 text-center text-muted-foreground">Cargando configuración de cámara...</div>
    }

    const handleCalculate = () => {
        if (!selectedAffiliateId || !selectedPracticeId) return

        setIsCalculating(true)
        setAuditSaved(false)

        // Simular breve delay para feedback visual (con datos reales será real)
        setTimeout(() => {
            const affiliate = MOCK_AFFILIATES.find(a => a.id === Number(selectedAffiliateId))
            const practice = MOCK_PRACTICES.find(p => p.id === Number(selectedPracticeId))

            if (affiliate && practice) {
                const plan = MOCK_PLANS.find(p => p.id === affiliate.plan_id)
                if (plan) {
                    const coverage = calculateCoverage(affiliate, plan, practice)
                    setResult(coverage)
                    setLastAffiliateId(affiliate.id)
                    setLastPracticeId(practice.id)
                    console.log("Calculated Coverage:", coverage)
                }
            }
            setIsCalculating(false)
        }, 300)
    }

    const handleRegisterAudit = () => {
        if (!result || !lastAffiliateId || !lastPracticeId) return

        const affiliate = MOCK_AFFILIATES.find(a => a.id === lastAffiliateId)
        const practice = MOCK_PRACTICES.find(p => p.id === lastPracticeId)
        if (!affiliate || !practice) return

        const plan = MOCK_PLANS.find(p => p.id === affiliate.plan_id)
        if (!plan) return

        AuditService.create(affiliate, plan, practice, result)
        setAuditSaved(true)
    }

    return (
        <div className="space-y-6 container mx-auto max-w-4xl pt-6">
            <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                    <Calculator className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Calculadora de Cobertura</h1>
                    <p className="text-muted-foreground">Simulador de reglas de negocio para {activeJurisdiction.name}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Input Form */}
                <Card className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="affiliate-select" className="text-sm font-medium">Afiliado</label>
                            <select
                                id="affiliate-select"
                                aria-label="Seleccionar afiliado"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedAffiliateId}
                                onChange={(e) => setSelectedAffiliateId(e.target.value)}
                            >
                                <option value="">Seleccione un afiliado...</option>
                                {filteredAffiliates.map(aff => (
                                    <option key={aff.id} value={aff.id}>
                                        {aff.full_name} - DNI: {aff.document_number}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="practice-select" className="text-sm font-medium">Práctica Médica</label>
                            <select
                                id="practice-select"
                                aria-label="Seleccionar práctica médica"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedPracticeId}
                                onChange={(e) => setSelectedPracticeId(e.target.value)}
                            >
                                <option value="">Seleccione una práctica...</option>
                                {filteredPractices.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.code} - {p.description} (${p.financial_value})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Button
                            className="w-full bg-action-blue hover:bg-blue-700 text-white"
                            onClick={handleCalculate}
                            disabled={!selectedAffiliateId || !selectedPracticeId || isCalculating}
                        >
                            {isCalculating ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculando...</>
                            ) : (
                                'Calcular Cobertura'
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Results Panel */}
                <div className="space-y-4">
                    {!result ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                            <Calculator className="h-10 w-10 text-muted-foreground mb-3" />
                            <h3 className="font-medium text-foreground">Sin resultados</h3>
                            <p className="text-sm text-muted-foreground">Seleccione un afiliado y una práctica para ver el detalle.</p>
                        </div>
                    ) : (
                        <Card className={`p-6 border-l-4 ${result.covered ? 'border-l-green-500' : 'border-l-red-500'} shadow-md`}>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${result.covered ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {result.covered ? (
                                            <><CheckCircle className="h-4 w-4 mr-2" /> APROBADA</>
                                        ) : (
                                            <><XCircle className="h-4 w-4 mr-2" /> RECHAZADA</>
                                        )}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Cobertura</div>
                                    <div className="text-3xl font-bold text-foreground">{result.percentage}%</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">Monto Cubierto</span>
                                    <span className="font-semibold text-green-600">${result.coveredAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">Copago a Cargo</span>
                                    <span className="font-semibold text-orange-600">${result.copay.toFixed(2)}</span>
                                </div>
                            </div>

                            {(result.messages.length > 0 || result.authorizationRequired) && (
                                <div className="mt-6 bg-yellow-50 p-4 rounded-md border border-yellow-100">
                                    <h4 className="flex items-center text-sm font-bold text-yellow-800 mb-2">
                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                        Observaciones
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                                        {result.authorizationRequired && (
                                            <li>Requiere autorización previa de auditoría.</li>
                                        )}
                                        {result.messages.map((msg, i) => (
                                            <li key={i}>{msg}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Botón Registrar Auditoría */}
                            <div className="mt-6 pt-4 border-t space-y-2">
                                {auditSaved ? (
                                    <>
                                        <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-md p-3">
                                            <ClipboardCheck className="h-4 w-4" />
                                            Auditoría registrada correctamente
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                if (!lastAffiliateId || !lastPracticeId) return
                                                const aff = MOCK_AFFILIATES.find(a => a.id === lastAffiliateId)
                                                const prc = MOCK_PRACTICES.find(p => p.id === lastPracticeId)
                                                if (!aff || !prc) return
                                                const pl = MOCK_PLANS.find(p => p.id === aff.plan_id)
                                                if (!pl) return
                                                const lastAudit = AuditService.getAll().find(
                                                    a => a.affiliate_id === lastAffiliateId && a.practice_id === lastPracticeId
                                                )
                                                if (lastAudit) generateAuditPDF(lastAudit)
                                            }}
                                        >
                                            <FileDown className="h-4 w-4 mr-2" />
                                            Exportar PDF
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                        onClick={handleRegisterAudit}
                                    >
                                        <ClipboardCheck className="h-4 w-4 mr-2" />
                                        Registrar Auditoría
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
