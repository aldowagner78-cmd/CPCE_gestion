"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    BookOpen,
    Search,
    Calculator,
    ArrowLeftRight,
    FileText,
    ClipboardCheck,
    ChevronDown,
    ChevronRight,
    HelpCircle,
    AlertTriangle,
    CheckCircle,
    XCircle,
} from "lucide-react"

type Section = {
    id: string
    icon: React.ElementType
    title: string
    content: React.ReactNode
}

export default function HelpPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["intro"]))

    const toggleSection = (id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const sections: Section[] = [
        {
            id: "intro",
            icon: BookOpen,
            title: "Introducción al Sistema",
            content: (
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                        La <strong className="text-foreground">Suite Integral CPCE Salud</strong> es un sistema de auditoría médica para gestionar las operaciones de dos jurisdicciones:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="font-semibold text-blue-700 mb-1">Cámara I — Santa Fe</div>
                            <p className="text-blue-600 text-xs">Identificada con color azul en toda la interfaz.</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="font-semibold text-emerald-700 mb-1">Cámara II — Rosario</div>
                            <p className="text-emerald-600 text-xs">Identificada con color verde esmeralda.</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                        <h4 className="font-semibold text-foreground mb-2">Roles del Sistema</h4>
                        <table className="w-full text-xs">
                            <tbody>
                                <tr className="border-b"><td className="py-1.5 font-medium text-foreground">Administrador</td><td>Acceso completo, gestión de usuarios y configuración</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium text-foreground">Auditor</td><td>Verifica coberturas, aplica reglas y genera reportes</td></tr>
                                <tr><td className="py-1.5 font-medium text-foreground">Afiliado</td><td>Consulta su cobertura (futuro)</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ),
        },
        {
            id: "calculator",
            icon: Calculator,
            title: "Cómo Usar la Calculadora de Cobertura",
            content: (
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>La Calculadora permite verificar si un afiliado tiene cobertura para una práctica médica antes de prestarse el servicio.</p>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                            <p>Verifique la <strong className="text-foreground">Cámara activa</strong> en la barra superior. Los datos se filtran según la jurisdicción.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                            <p>Seleccione un <strong className="text-foreground">Afiliado</strong> del desplegable (nombre + DNI).</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                            <p>Seleccione una <strong className="text-foreground">Práctica Médica</strong> (código + descripción + valor).</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                            <p>Presione <strong className="text-foreground">&quot;Calcular Cobertura&quot;</strong> y lea el resultado.</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border mt-4">
                        <h4 className="font-semibold text-foreground mb-3">Interpretación del Resultado</h4>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span><strong className="text-green-700">APROBADA:</strong> La práctica está cubierta por el plan.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span><strong className="text-red-700">RECHAZADA:</strong> Práctica no cubierta (revise observaciones).</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span><strong className="text-yellow-700">CON OBSERVACIONES:</strong> Aprobada pero requiere acción (copago o autorización).</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Observaciones Posibles
                        </h4>
                        <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                            <li><strong>Período de carencia no cumplido:</strong> El afiliado no alcanzó la antigüedad mínima.</li>
                            <li><strong>Requiere autorización previa:</strong> Prácticas de Cirugía o Alta Complejidad.</li>
                            <li><strong>Copago a cargo:</strong> Porcentaje no cubierto que debe abonar el afiliado.</li>
                            <li><strong>Jurisdicción no coincide:</strong> Error territorial entre afiliado y práctica.</li>
                        </ul>
                    </div>
                </div>
            ),
        },
        {
            id: "nomenclator",
            icon: FileText,
            title: "Nomencladores",
            content: (
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                        Los <strong className="text-foreground">Nomencladores</strong> son catálogos oficiales que definen las prácticas médicas y sus valores reconocidos por cada jurisdicción. El sistema soporta <strong className="text-foreground">múltiples nomencladores</strong> que pueden agregarse según convenios.
                    </p>

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3">Tipos de Nomencladores y Unidades</h4>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-1.5 font-medium text-blue-800">Código</th>
                                    <th className="py-1.5 font-medium text-blue-800">Tipo</th>
                                    <th className="py-1.5 font-medium text-blue-800">Unidad</th>
                                    <th className="py-1.5 font-medium text-blue-800">Descripción</th>
                                </tr>
                            </thead>
                            <tbody className="text-blue-700">
                                <tr className="border-b"><td className="py-1.5 font-mono">MED</td><td>Médico</td><td><strong>Galeno</strong></td><td>Consultas, cirugías, diagnósticos</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-mono">BIO</td><td>Bioquímico</td><td><strong>NBU</strong></td><td>Análisis clínicos y de laboratorio</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-mono">ODO</td><td>Odontológico</td><td><strong>UO</strong></td><td>Prácticas odontológicas</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-mono">FAR</td><td>Medicamentos</td><td>—</td><td>Fármacos y drogas</td></tr>
                                <tr><td className="py-1.5 font-mono">ESP</td><td>Especiales</td><td>—</td><td>Programas y coberturas específicas</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Cómo se Calculan los Valores
                        </h4>
                        <p className="text-xs text-amber-700 mb-2">
                            El valor monetario de cada práctica se calcula multiplicando:
                        </p>
                        <div className="bg-white rounded p-3 text-center text-amber-800 font-mono text-sm">
                            <strong>Valor Práctica = Unidades × Valor Unidad Vigente</strong>
                        </div>
                        <p className="text-xs text-amber-700 mt-2">
                            El <strong>Valor de Unidad</strong> (ej: valor del Galeno) varía por jurisdicción y se actualiza periódicamente según convenios colectivos.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="font-semibold text-blue-700 text-xs mb-1">Cámara I — Santa Fe</div>
                            <p className="text-xs text-blue-600">Galeno: $150 (vigente 2026)</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <div className="font-semibold text-emerald-700 text-xs mb-1">Cámara II — Rosario</div>
                            <p className="text-xs text-emerald-600">Galeno: $155 (vigente 2026)</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border">
                        <h4 className="font-semibold text-foreground mb-2">Columnas de la Tabla</h4>
                        <table className="w-full text-xs">
                            <tbody>
                                <tr className="border-b"><td className="py-1.5 font-medium">Código</td><td>Identificador alfanumérico (ej: 42.01.01)</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium">Descripción</td><td>Nombre completo de la práctica</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium">Categoría</td><td>Clasificación (Consultas, Cirugía, etc.)</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium">Unidades</td><td>Cantidad de unidades (ej: 5 Galenos)</td></tr>
                                <tr><td className="py-1.5 font-medium">Valor</td><td>Monto final en pesos (Unidades × Valor Unidad)</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs">
                        <strong>Tip:</strong> Al cambiar de Cámara, el sistema recalcula los valores según el valor de unidad vigente de esa jurisdicción. Use la barra de búsqueda para filtrar prácticas.
                    </p>
                </div>
            ),
        },
        {
            id: "jurisdictions",
            icon: ArrowLeftRight,
            title: "Cambio de Jurisdicción (Cámaras)",
            content: (
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                        El sistema opera con dos jurisdicciones independientes. Puede alternar entre ellas usando el <strong className="text-foreground">Toggle de Cámara</strong> en la esquina superior derecha.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                        <h4 className="font-semibold text-foreground mb-2">¿Qué cambia al alternar?</h4>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-1.5 font-medium text-foreground">Elemento</th>
                                    <th className="py-1.5 font-medium text-blue-600">Cámara I</th>
                                    <th className="py-1.5 font-medium text-emerald-600">Cámara II</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b"><td className="py-1.5 font-medium">Color</td><td>Azul</td><td>Verde esmeralda</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium">Afiliados</td><td>Solo Santa Fe</td><td>Solo Rosario</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium">Prácticas</td><td>Nomenclador SF</td><td>Nomenclador ROS</td></tr>
                                <tr><td className="py-1.5 font-medium">Valores</td><td>Convenio local</td><td>Convenio local</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-xs text-amber-700">
                        <strong>Importante:</strong> Al cambiar de cámara, los formularios abiertos pueden resetearse. Complete su operación antes de alternar.
                    </div>
                </div>
            ),
        },
        {
            id: "audit-states",
            icon: ClipboardCheck,
            title: "Estados de Auditoría",
            content: (
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>Cada auditoría pasa por un ciclo de vida con los siguientes estados:</p>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-700 text-xs">APROBADA</span>
                            </div>
                            <p className="text-xs text-green-600">100% cubierta, sin restricciones. Autorizar prestación.</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="font-semibold text-red-700 text-xs">RECHAZADA</span>
                            </div>
                            <p className="text-xs text-red-600">No cubierta: carencia, jurisdicción no válida u otra causa.</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <span className="font-semibold text-orange-700 text-xs">PARCIAL</span>
                            </div>
                            <p className="text-xs text-orange-600">Cubierta con copago. Informar monto al afiliado.</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <HelpCircle className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-blue-700 text-xs">PENDIENTE</span>
                            </div>
                            <p className="text-xs text-blue-600">En espera de revisión o autorización superior.</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border">
                        <h4 className="font-semibold text-foreground mb-2">Criterios del Motor</h4>
                        <table className="w-full text-xs">
                            <tbody>
                                <tr className="border-b"><td className="py-1.5 font-medium text-foreground">Activo + Plan 100% + Sin carencia</td><td className="text-green-600">✅ Aprobada</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium text-foreground">Activo + Plan 80% + Sin carencia</td><td className="text-orange-600">⚠️ Parcial (copago)</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium text-foreground">En período de carencia</td><td className="text-red-600">❌ Rechazada</td></tr>
                                <tr className="border-b"><td className="py-1.5 font-medium text-foreground">Jurisdicción no coincide</td><td className="text-red-600">❌ Rechazada</td></tr>
                                <tr><td className="py-1.5 font-medium text-foreground">Cirugía / Alta Complejidad</td><td className="text-yellow-600">⚠️ Requiere autorización</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ),
        },
        {
            id: "faq",
            icon: HelpCircle,
            title: "Preguntas Frecuentes",
            content: (
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="font-semibold text-foreground mb-1">¿Por qué no aparecen afiliados al seleccionar?</h4>
                            <p className="text-xs">Verifique que la Cámara activa coincide con la jurisdicción del afiliado. Si está en Cámara I pero el afiliado pertenece a Cámara II, no aparecerá.</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="font-semibold text-foreground mb-1">¿Qué significa &quot;Período de carencia no cumplido&quot;?</h4>
                            <p className="text-xs">El plan requiere un tiempo mínimo de antigüedad. Por ejemplo, con 6 meses de carencia, un afiliado con 3 meses de antigüedad será rechazado.</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="font-semibold text-foreground mb-1">¿Por qué una cirugía con 100% de cobertura requiere autorización?</h4>
                            <p className="text-xs">La cobertura monetaria y la autorización administrativa son procesos independientes. Las cirugías siempre requieren aprobación del auditor, independientemente del porcentaje.</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="font-semibold text-foreground mb-1">¿Puedo ver datos de ambas cámaras a la vez?</h4>
                            <p className="text-xs">No en esta versión. El sistema muestra una cámara a la vez. Use el toggle para alternar.</p>
                        </div>
                    </div>
                </div>
            ),
        },
    ]

    const filteredSections = searchTerm.trim()
        ? sections.filter(
            (s) =>
                s.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : sections

    return (
        <div className="space-y-6 container mx-auto max-w-4xl pt-6">
            <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Centro de Ayuda</h1>
                    <p className="text-muted-foreground">Manual de usuario y guía de referencia rápida</p>
                </div>
            </div>

            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar en la ayuda..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            <div className="space-y-3">
                {filteredSections.map((section) => {
                    const isExpanded = expandedSections.has(section.id)
                    const Icon = section.icon
                    return (
                        <Card key={section.id} className="overflow-hidden">
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium text-foreground">{section.title}</span>
                                </div>
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t pt-4">
                                    {section.content}
                                </div>
                            )}
                        </Card>
                    )
                })}
            </div>

            <div className="text-xs text-muted-foreground text-center pb-6">
                Suite Integral CPCE Salud — v1.0.0-alpha | Centro de Ayuda
            </div>
        </div>
    )
}
