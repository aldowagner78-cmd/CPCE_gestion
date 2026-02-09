"use client"

import { useState, useMemo } from "react"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MOCK_PRACTICES } from "@/lib/mockData"
import { Search, FileText } from "lucide-react"

export default function PracticesPage() {
    const { activeJurisdiction } = useJurisdiction()
    const [searchTerm, setSearchTerm] = useState("")

    // Filter practices by active jurisdiction AND search term
    const filteredPractices = useMemo(() => {
        if (!activeJurisdiction) return []

        let practices = MOCK_PRACTICES.filter(p => p.jurisdiction_id === activeJurisdiction.id)

        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase()
            practices = practices.filter(p =>
                p.code.toLowerCase().includes(lowerTerm) ||
                p.description.toLowerCase().includes(lowerTerm)
            )
        }

        return practices
    }, [activeJurisdiction, searchTerm])

    if (!activeJurisdiction) {
        return <div className="p-8 text-center text-muted-foreground">Cargando catálogo...</div>
    }

    return (
        <div className="space-y-6 container mx-auto max-w-5xl pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Nomencladores</h1>
                    <p className="text-muted-foreground">Catálogos de prácticas — {activeJurisdiction.name}</p>
                </div>
            </div>

            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por código o descripción..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Código</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Descripción</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Categoría</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredPractices.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No se encontraron prácticas con ese criterio.
                                    </td>
                                </tr>
                            ) : (
                                filteredPractices.map((practice) => (
                                    <tr key={practice.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle font-medium">{practice.code}</td>
                                        <td className="p-4 align-middle">{practice.description}</td>
                                        <td className="p-4 align-middle">
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                {practice.category || 'General'}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-right font-mono">
                                            ${practice.financial_value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="text-xs text-muted-foreground text-center">
                Mostrando {filteredPractices.length} resultados del catálogo vigente.
            </div>
        </div>
    )
}
