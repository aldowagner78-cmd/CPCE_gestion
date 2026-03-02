"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { FileText, Search, Plus, BookOpen, Pencil, Trash2, Loader2, Database } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { useAuth } from "@/contexts/AuthContext"

interface Protocol {
    id: number
    title: string
    category: string
    description: string
    applies_to: string | null
    jurisdiction_id: number | null
    is_active: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

const CATEGORY_COLORS: Record<string, string> = {
    "Autorización": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    "Carencia": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "Frecuencia": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "Medicamentos": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "Emergencia": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    "Internación": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "General": "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
}

const CATEGORIES = Object.keys(CATEGORY_COLORS)

// Protocolos fallback (se usan solo si Supabase no tiene la tabla todavía)
const FALLBACK_PROTOCOLS: Protocol[] = [
    { id: 1, title: "Autorización previa — Cirugías programadas", category: "Autorización", description: "Toda cirugía programada requiere autorización previa del auditor médico con documentación completa: orden médica, estudios prequirúrgicos, y presupuesto del prestador.", applies_to: "Cirugía", jurisdiction_id: 1, is_active: true, created_by: null, created_at: "2024-01-15", updated_at: "2024-01-15" },
    { id: 2, title: "Período de carencia — Prácticas de alta complejidad", category: "Carencia", description: "Las prácticas de alta complejidad (RMN, TAC, cateterismo) tienen un período de carencia de 3 meses desde el alta del afiliado.", applies_to: "Diagnóstico por imágenes", jurisdiction_id: 1, is_active: true, created_by: null, created_at: "2024-02-01", updated_at: "2024-02-01" },
    { id: 3, title: "Tope mensual de consultas", category: "Frecuencia", description: "Se cubren hasta 4 consultas médicas por mes por afiliado. A partir de la 5ta consulta se requiere justificación del médico tratante.", applies_to: "Consultas", jurisdiction_id: 1, is_active: true, created_by: null, created_at: "2024-03-10", updated_at: "2024-03-10" },
    { id: 4, title: "Cobertura de medicamentos — Crónicos", category: "Medicamentos", description: "Los afiliados con enfermedades crónicas (diabetes, hipertensión, EPOC) tienen cobertura del 70% en medicamentos con receta actualizada cada 6 meses.", applies_to: "Farmacia", jurisdiction_id: 1, is_active: true, created_by: null, created_at: "2024-01-20", updated_at: "2024-01-20" },
    { id: 5, title: "Prótesis y órtesis — Presupuesto comparativo", category: "Autorización", description: "La provisión de prótesis u órtesis requiere al menos 2 presupuestos de proveedores diferentes y autorización del Comité de Prestaciones.", applies_to: "Prótesis", jurisdiction_id: 1, is_active: true, created_by: null, created_at: "2024-04-05", updated_at: "2024-04-05" },
    { id: 6, title: "Emergencias — Cobertura directa", category: "Emergencia", description: "Las emergencias médicas tienen cobertura directa al 100% sin necesidad de autorización previa, tanto en prestadores de red como fuera de red.", applies_to: "Urgencia", jurisdiction_id: 1, is_active: true, created_by: null, created_at: "2024-01-01", updated_at: "2024-01-01" },
]

const emptyForm = { title: '', category: 'General', description: '', applies_to: '' }

export default function ProtocolsPage() {
    const supabase = createClient()
    const { activeJurisdiction } = useJurisdiction()
    const { user, hasPermission } = useAuth()
    const canManage = hasPermission('protocols.view') // TODO: add protocols.manage permission

    const [protocols, setProtocols] = useState<Protocol[]>([])
    const [loading, setLoading] = useState(true)
    const [usingFallback, setUsingFallback] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedId, setSelectedId] = useState<number | null>(null)

    // CRUD state
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

    const fetchProtocols = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('protocols')
                .select('*')
                .order('category', { ascending: true })
                .order('title', { ascending: true })

            if (error) {
                console.warn('Protocols table not available, using fallback:', error.message)
                setProtocols(FALLBACK_PROTOCOLS)
                setUsingFallback(true)
            } else {
                setProtocols(data || [])
                setUsingFallback(false)
            }
        } catch {
            setProtocols(FALLBACK_PROTOCOLS)
            setUsingFallback(true)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => { fetchProtocols() }, [fetchProtocols])

    const filtered = protocols.filter(p => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase()
        return p.title.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.applies_to || '').toLowerCase().includes(q)
    })

    const selected = protocols.find(p => p.id === selectedId)

    // Create / Edit
    const openCreate = () => {
        setEditingId(null)
        setForm(emptyForm)
        setDialogOpen(true)
    }

    const openEdit = (p: Protocol) => {
        setEditingId(p.id)
        setForm({ title: p.title, category: p.category, description: p.description, applies_to: p.applies_to || '' })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!form.title.trim() || !form.description.trim()) return
        setSaving(true)

        const record = {
            title: form.title.trim(),
            category: form.category,
            description: form.description.trim(),
            applies_to: form.applies_to.trim() || null,
            jurisdiction_id: activeJurisdiction?.id || 1,
            is_active: true,
            updated_at: new Date().toISOString(),
            ...(editingId ? {} : { created_by: user?.full_name || null }),
        }

        if (editingId) {
            await supabase.from('protocols').update(record).eq('id', editingId)
        } else {
            await supabase.from('protocols').insert(record)
        }

        setSaving(false)
        setDialogOpen(false)
        fetchProtocols()
    }

    // Delete
    const handleDelete = async (id: number) => {
        await supabase.from('protocols').delete().eq('id', id)
        setDeleteConfirm(null)
        if (selectedId === id) setSelectedId(null)
        fetchProtocols()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 container mx-auto max-w-6xl pt-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg">
                        <FileText className="h-6 w-6 text-teal-700 dark:text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Protocolos Médicos</h1>
                        <p className="text-muted-foreground text-sm">
                            Reglas de cobertura, autorización y carencias
                            {!usingFallback && (
                                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                    <Database className="inline h-3 w-3 mr-0.5" />Supabase
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                {canManage && !usingFallback && (
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> Nuevo Protocolo
                    </Button>
                )}
            </div>

            <Card className="p-4">
                <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar protocolos..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Badge variant="secondary">{filtered.length} protocolo{filtered.length !== 1 ? 's' : ''}</Badge>
                </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
                {/* Protocol list */}
                <div className="md:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                    {filtered.map(p => (
                        <Card
                            key={p.id}
                            className={`p-3 cursor-pointer transition-colors hover:bg-muted/40 ${selectedId === p.id ? 'ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-900/20' : ''}`}
                            onClick={() => setSelectedId(p.id)}
                        >
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS['General']}`}>
                                {p.category}
                            </span>
                            <h4 className="font-medium text-sm mt-1.5 line-clamp-2">{p.title}</h4>
                            {p.applies_to && (
                                <p className="text-xs text-muted-foreground mt-0.5">Aplica a: {p.applies_to}</p>
                            )}
                        </Card>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Sin resultados
                        </div>
                    )}
                </div>

                {/* Protocol detail */}
                <div className="md:col-span-2">
                    {selected ? (
                        <Card className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[selected.category] ?? CATEGORY_COLORS['General']}`}>
                                        {selected.category}
                                    </span>
                                    <h2 className="text-xl font-bold mt-3">{selected.title}</h2>
                                    {selected.applies_to && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Aplica a: <strong>{selected.applies_to}</strong>
                                        </p>
                                    )}
                                </div>
                                {canManage && !usingFallback && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(selected)} title="Editar">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDeleteConfirm(selected.id)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <hr className="my-4" />
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                                {selected.created_by && <span>Creado por: {selected.created_by}</span>}
                                <span>
                                    Actualizado: {new Date(selected.updated_at).toLocaleDateString('es-AR')}
                                </span>
                            </div>
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

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Protocolo' : 'Nuevo Protocolo'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Título *</label>
                            <Input
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="Título del protocolo"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Categoría</label>
                            <select
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Aplica a</label>
                            <Input
                                value={form.applies_to}
                                onChange={e => setForm({ ...form, applies_to: e.target.value })}
                                placeholder="Ej: Cirugía, Farmacia, Consultas..."
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Descripción *</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Detalle del protocolo..."
                                rows={5}
                                className="w-full px-3 py-2 border rounded-md text-sm bg-background resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.description.trim()}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingId ? 'Guardar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>¿Eliminar protocolo?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        Esta acción no se puede deshacer. El protocolo será eliminado permanentemente.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button
                            variant="danger"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        >
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
