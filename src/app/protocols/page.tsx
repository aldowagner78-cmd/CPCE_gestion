"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Search, Plus, ChevronRight, BookOpen } from "lucide-react"

interface Protocol {
    id: number
    title: string
    category: string
    description: string
    applies_to: string
    last_updated: string
}

const BUILT_IN_PROTOCOLS: Protocol[] = [
    { id: 1, title: "Autorización previa — Cirugías programadas", category: "Autorización", description: "Toda cirugía programada requiere autorización previa del auditor médico con documentación completa: orden médica, estudios prequirúrgicos, y presupuesto del prestador.", applies_to: "Cirugía", last_updated: "2024-01-15" },
    { id: 2, title: "Período de carencia — Prácticas de alta complejidad", category: "Carencia", description: "Las prácticas de alta complejidad (RMN, TAC, cateterismo) tienen un período de carencia de 3 meses desde el alta del afiliado.", applies_to: "Diagnóstico por imágenes", last_updated: "2024-02-01" },
    { id: 3, title: "Tope mensual de consultas", category: "Frecuencia", description: "Se cubren hasta 4 consultas médicas por mes por afiliado. A partir de la 5ta consulta se requiere justificación del médico tratante.", applies_to: "Consultas", last_updated: "2024-03-10" },
    { id: 4, title: "Cobertura de medicamentos — Crónicos", category: "Medicamentos", description: "Los afiliados con enfermedades crónicas (diabetes, hipertensión, EPOC) tienen cobertura del 70% en medicamentos con receta actualizada cada 6 meses.", applies_to: "Farmacia", last_updated: "2024-01-20" },
    { id: 5, title: "Prótesis y órtesis — Presupuesto comparativo", category: "Autorización", description: "La provisión de prótesis u órtesis requiere al menos 2 presupuestos de proveedores diferentes y autorización del Comité de Prestaciones.", applies_to: "Prótesis", last_updated: "2024-04-05" },
    { id: 6, title: "Emergencias — Cobertura directa", category: "Emergencia", description: "Las emergencias médicas tienen cobertura directa al 100% sin necesidad de autorización previa, tanto en prestadores de red como fuera de red.", applies_to: "Urgencia", last_updated: "2024-01-01" },
]

const CATEGORY_COLORS: Record<string, string> = {
    "Autorización": "bg-purple-100 text-purple-700",
    "Carencia": "bg-amber-100 text-amber-700",
    "Frecuencia": "bg-blue-100 text-blue-700",
    "Medicamentos": "bg-green-100 text-green-700",
    "Emergencia": "bg-red-100 text-red-700",
}

export default function ProtocolsPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedId, setSelectedId] = useState<number | null>(null)

    const filtered = BUILT_IN_PROTOCOLS.filter(p => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase()
        return p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.applies_to.toLowerCase().includes(q)
    })

    const selected = BUILT_IN_PROTOCOLS.find(p => p.id === selectedId)

    return (
        <div className="space-y-6 container mx-auto max-w-6xl pt-6">
            <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-lg"><FileText className="h-6 w-6 text-teal-700" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Protocolos Médicos</h1>
                    <p className="text-muted-foreground">Reglas de cobertura, autorización y carencias aplicables</p>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Buscar protocolos..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
                {/* Protocol list */}
                <div className="md:col-span-1 space-y-2">
                    {filtered.map(p => (
                        <Card key={p.id} className={`p-3 cursor-pointer transition-colors hover:bg-muted/40 ${selectedId === p.id ? 'ring-2 ring-teal-500 bg-teal-50' : ''}`} onClick={() => setSelectedId(p.id)}>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[p.category] ?? 'bg-gray-100 text-gray-700'}`}>{p.category}</span>
                            <h4 className="font-medium text-sm mt-1.5 line-clamp-2">{p.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Aplica a: {p.applies_to}</p>
                        </Card>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">Sin resultados</div>
                    )}
                </div>

                {/* Protocol detail */}
                <div className="md:col-span-2">
                    {selected ? (
                        <Card className="p-6">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[selected.category] ?? 'bg-gray-100 text-gray-700'}`}>{selected.category}</span>
                            <h2 className="text-xl font-bold mt-3">{selected.title}</h2>
                            <p className="text-sm text-muted-foreground mt-1">Aplica a: <strong>{selected.applies_to}</strong></p>
                            <hr className="my-4" />
                            <p className="text-sm leading-relaxed">{selected.description}</p>
                            <p className="text-xs text-muted-foreground mt-4">Última actualización: {new Date(selected.last_updated).toLocaleDateString('es-AR')}</p>
                        </Card>
                    ) : (
                        <Card className="p-12 text-center">
                            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <h3 className="font-semibold">Seleccione un protocolo</h3>
                            <p className="text-sm text-muted-foreground">Elija un protocolo de la lista para ver los detalles.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
