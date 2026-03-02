"use client"

import { useState, useEffect, useMemo } from "react"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination, paginateArray } from "@/components/ui/pagination"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { getSupabaseClient } from "@/lib/supabase/client"
import {
    Users, Search, Edit2, Trash2, Loader2,
    CheckCircle, UserPlus
} from "lucide-react"

type AffiliateRow = {
    id: string
    affiliate_number: string | null
    full_name: string
    document_number: string
    birth_date: string | null
    gender: 'M' | 'F' | 'X' | null
    relationship: string
    titular_id: string | null
    plan_id: number | null
    status: 'activo' | 'suspendido' | 'baja'
    start_date: string
    end_date: string | null
    jurisdiction_id: number | null
    created_at: string
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
    activo: { label: "Activo", color: "bg-green-100 text-green-700" },
    suspendido: { label: "Suspendido", color: "bg-yellow-100 text-yellow-700" },
    baja: { label: "Baja", color: "bg-red-100 text-red-700" },
}

const RELATIONSHIPS = ['Titular', 'Cónyuge', 'Hijo', 'Hijo Estudiante', 'Hijo Discapacidad', 'Otro']
const GENDERS = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }, { value: 'X', label: 'Otro' }]

export default function PatientsPage() {
    const { activeJurisdiction } = useJurisdiction()
    const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 15
    const [showEditor, setShowEditor] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [plans, setPlans] = useState<{ id: number; name: string }[]>([])
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const [form, setForm] = useState({
        affiliate_number: '', full_name: '', document_number: '',
        birth_date: '', gender: '' as string, relationship: 'Titular',
        plan_id: '' as string, status: 'activo' as string,
        start_date: new Date().toISOString().split('T')[0],
    })

    const supabase = getSupabaseClient()

    const fetchData = async () => {
        if (!activeJurisdiction) return
        setLoading(true)
        const [affsRes, plansRes] = await Promise.all([
            supabase.from('affiliates').select('*').eq('jurisdiction_id', activeJurisdiction.id).order('full_name'),
            supabase.from('plans').select('id, name').eq('jurisdiction_id', activeJurisdiction.id),
        ])
        setAffiliates((affsRes.data ?? []) as AffiliateRow[])
        setPlans(plansRes.data ?? [])
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [activeJurisdiction])

    const filtered = affiliates.filter(a => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase()
        return a.full_name.toLowerCase().includes(q) || a.document_number.includes(q) || (a.affiliate_number ?? '').toLowerCase().includes(q)
    })

    // Reset page when search changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const _resetPage = useMemo(() => { setPage(1); return null }, [searchTerm])
    const pagedRows = paginateArray(filtered, page, PAGE_SIZE)

    const resetForm = () => {
        setForm({ affiliate_number: '', full_name: '', document_number: '', birth_date: '', gender: '', relationship: 'Titular', plan_id: '', status: 'activo', start_date: new Date().toISOString().split('T')[0] })
        setEditingId(null)
    }

    const handleEdit = (a: AffiliateRow) => {
        setForm({
            affiliate_number: a.affiliate_number ?? '', full_name: a.full_name, document_number: a.document_number,
            birth_date: a.birth_date ?? '', gender: a.gender ?? '', relationship: a.relationship ?? 'Titular',
            plan_id: String(a.plan_id ?? ''), status: a.status, start_date: a.start_date,
        })
        setEditingId(a.id)
        setShowEditor(true)
    }

    const handleSave = async () => {
        if (!activeJurisdiction || !form.full_name || !form.document_number) return
        setSaving(true)
        const payload = {
            affiliate_number: form.affiliate_number || null,
            full_name: form.full_name, document_number: form.document_number,
            birth_date: form.birth_date || null, gender: (form.gender || null) as 'M' | 'F' | 'X' | null,
            relationship: form.relationship, plan_id: form.plan_id ? parseInt(form.plan_id) : null,
            status: form.status as 'activo' | 'suspendido' | 'baja', start_date: form.start_date,
            jurisdiction_id: activeJurisdiction.id,
        }
        if (editingId) { await supabase.from('affiliates').update(payload).eq('id', editingId) }
        else { await supabase.from('affiliates').insert(payload) }
        setSaving(false); setShowEditor(false); resetForm(); await fetchData()
    }

    const handleDelete = async (id: string) => {
        await supabase.from('affiliates').delete().eq('id', id)
        setDeleteConfirm(null)
        await fetchData()
    }

    if (!activeJurisdiction) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>

    const counts = {
        total: affiliates.length,
        activos: affiliates.filter(a => a.status === 'activo').length,
        suspendidos: affiliates.filter(a => a.status === 'suspendido').length,
        bajas: affiliates.filter(a => a.status === 'baja').length,
    }

    return (
        <div className="space-y-6 container mx-auto max-w-6xl pt-6">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg"><Users className="h-6 w-6 text-indigo-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Padrón de Afiliados</h1>
                    <p className="text-muted-foreground">{activeJurisdiction.name}</p>
                </div>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">● Supabase</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{counts.total}</div></Card>
                <Card className="p-3"><div className="text-xs text-green-600">Activos</div><div className="text-2xl font-bold text-green-700">{counts.activos}</div></Card>
                <Card className="p-3"><div className="text-xs text-yellow-600">Suspendidos</div><div className="text-2xl font-bold text-yellow-700">{counts.suspendidos}</div></Card>
                <Card className="p-3"><div className="text-xs text-red-600">Bajas</div><div className="text-2xl font-bold text-red-700">{counts.bajas}</div></Card>
            </div>

            <Card className="p-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Buscar por nombre, DNI o nro. afiliado..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Button onClick={() => { resetForm(); setShowEditor(true) }}><UserPlus className="h-4 w-4 mr-2" /> Nuevo Afiliado</Button>
                </div>
            </Card>

            {showEditor && (
                <Card className="p-6 border-2 border-indigo-200">
                    <h3 className="font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Afiliado</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div><label className="text-xs font-medium">Nro. Afiliado</label><Input value={form.affiliate_number} onChange={e => setForm({ ...form, affiliate_number: e.target.value })} placeholder="AF-001" /></div>
                        <div className="md:col-span-2"><label className="text-xs font-medium">Nombre Completo *</label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Pérez, Juan Carlos" /></div>
                        <div><label className="text-xs font-medium">DNI *</label><Input value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} placeholder="12345678" /></div>
                        <div><label className="text-xs font-medium">Fecha Nacimiento</label><Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} /></div>
                        <div><label className="text-xs font-medium">Género</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">—</option>{GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
                        <div><label className="text-xs font-medium">Parentesco</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>{RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label className="text-xs font-medium">Plan</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.plan_id} onChange={e => setForm({ ...form, plan_id: e.target.value })}><option value="">Sin plan</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        <div><label className="text-xs font-medium">Estado</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="activo">Activo</option><option value="suspendido">Suspendido</option><option value="baja">Baja</option></select></div>
                        <div><label className="text-xs font-medium">Fecha Alta</label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleSave} disabled={saving || !form.full_name || !form.document_number}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            {editingId ? 'Guardar Cambios' : 'Crear Afiliado'}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowEditor(false); resetForm() }}>Cancelar</Button>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Cargando padrón...</p></div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center"><Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><h3 className="font-semibold">Sin afiliados</h3><p className="text-sm text-muted-foreground">Agregue afiliados o importe un padrón.</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b bg-muted/50">
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Nro.</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Nombre</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">DNI</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Parentesco</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Estado</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Alta</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Acciones</th>
                            </tr></thead>
                            <tbody>
                                {pagedRows.map(a => {
                                    const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.activo
                                    return (
                                        <tr key={a.id} className="border-b hover:bg-muted/40">
                                            <td className="p-3 text-xs font-mono">{a.affiliate_number ?? '—'}</td>
                                            <td className="p-3 font-medium">{a.full_name}</td>
                                            <td className="p-3">{a.document_number}</td>
                                            <td className="p-3 text-xs">{a.relationship}</td>
                                            <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span></td>
                                            <td className="p-3 text-xs">{a.start_date ? new Date(a.start_date).toLocaleDateString('es-AR') : '—'}</td>
                                            <td className="p-3"><div className="flex gap-1">
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(a)}><Edit2 className="h-3.5 w-3.5" /></Button>
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteConfirm(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Pagination
                page={page}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                itemLabel="afiliados"
            />

            {/* Delete Confirmation */}
            <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>¿Eliminar afiliado?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        Esta acción no se puede deshacer.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
