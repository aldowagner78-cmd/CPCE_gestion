'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Plus, Trash2, Pencil, Check, X, Loader2, ClipboardList,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { practiceLimitsService, type PracticeLimit } from '@/services/parametrizacionService';
import { useJurisdiction } from '@/lib/jurisdictionContext';

const EMPTY: Omit<PracticeLimit, 'id' | 'created_at' | 'updated_at' | 'practice_name' | 'plan_name'> = {
    jurisdiction_id: 1,
    practice_id: null,
    practice_code: '',
    plan_id: null,
    max_per_year: null,
    min_days_between: null,
    min_age_years: null,
    max_age_years: null,
    gender_restriction: null,
    diagnosis_code: null,
    requires_authorization: true,
    notes: '',
    is_active: true,
};

export function TopesTab() {
    const { activeJurisdiction } = useJurisdiction();
    const jid = activeJurisdiction?.id ?? 1;

    const [limits, setLimits] = useState<PracticeLimit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...EMPTY, jurisdiction_id: jid });
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try { setLimits(await practiceLimitsService.list(jid)); } catch { /* noop */ }
        setLoading(false);
    }, [jid]);

    useEffect(() => {
        const t = setTimeout(() => { void load(); }, 0);
        return () => clearTimeout(t);
    }, [load]);

    const resetForm = () => { setForm({ ...EMPTY, jurisdiction_id: jid }); setEditId(null); setShowForm(false); };

    const handleEdit = (l: PracticeLimit) => {
        setForm({ ...l, jurisdiction_id: jid });
        setEditId(l.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            if (editId) await practiceLimitsService.update(editId, form);
            else await practiceLimitsService.create({ ...form, jurisdiction_id: jid });
            await load();
            resetForm();
            setMsg({ text: 'Tope guardado correctamente', type: 'success' });
        } catch { setMsg({ text: 'Error al guardar', type: 'error' }); }
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este tope?')) return;
        await practiceLimitsService.delete(id);
        await load();
    };

    const filtered = limits.filter(l =>
        !search ||
        l.practice_code?.toLowerCase().includes(search.toLowerCase()) ||
        l.practice_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.diagnosis_code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {msg && (
                <Alert variant={msg.type === 'success' ? 'default' : 'destructive'}
                    className={msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
                    <AlertDescription>{msg.text}</AlertDescription>
                </Alert>
            )}

            {/* Formulario */}
            <Card className="overflow-hidden">
                <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                >
                    <Plus className="h-5 w-5 text-primary" />
                    <span className="font-medium">{editId ? 'Editar tope' : 'Nuevo tope de consumo'}</span>
                    {showForm ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
                </button>
                {showForm && (
                    <div className="p-4 pt-0 border-t space-y-4">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Código de práctica *</Label>
                                <Input placeholder="Ej: 3-01-01" value={form.practice_code || ''} onChange={e => setForm(p => ({ ...p, practice_code: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Máximo por año</Label>
                                <Input type="number" min="1" placeholder="Ej: 2" value={form.max_per_year ?? ''} onChange={e => setForm(p => ({ ...p, max_per_year: e.target.value ? Number(e.target.value) : null }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Días mínimos entre solicitudes</Label>
                                <Input type="number" min="0" placeholder="Ej: 30" value={form.min_days_between ?? ''} onChange={e => setForm(p => ({ ...p, min_days_between: e.target.value ? Number(e.target.value) : null }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Edad mínima (años)</Label>
                                <Input type="number" min="0" max="120" value={form.min_age_years ?? ''} onChange={e => setForm(p => ({ ...p, min_age_years: e.target.value ? Number(e.target.value) : null }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Edad máxima (años)</Label>
                                <Input type="number" min="0" max="120" value={form.max_age_years ?? ''} onChange={e => setForm(p => ({ ...p, max_age_years: e.target.value ? Number(e.target.value) : null }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">CIE-10 requerido</Label>
                                <Input placeholder="Ej: M54" value={form.diagnosis_code || ''} onChange={e => setForm(p => ({ ...p, diagnosis_code: e.target.value || null }))} />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs">Observaciones</Label>
                                <Input placeholder="Notas opcionales" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                                <input type="checkbox" id="req_auth" checked={form.requires_authorization} onChange={e => setForm(p => ({ ...p, requires_authorization: e.target.checked }))} className="h-4 w-4 rounded" />
                                <Label htmlFor="req_auth" className="text-xs cursor-pointer">Requiere autorización manual</Label>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t">
                            <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                Guardar
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Lista */}
            <div className="space-y-2">
                <Input placeholder="Buscar por código, nombre o diagnóstico..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No hay topes configurados aún.</p>
                        <p className="text-xs">Usá el formulario de arriba para agregar el primero.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(l => (
                            <Card key={l.id} className={`p-4 flex items-start gap-3 ${!l.is_active ? 'opacity-50' : ''}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-mono text-sm font-semibold">{l.practice_code || '(sin código)'}</span>
                                        {l.practice_name && <span className="text-xs text-muted-foreground truncate">{l.practice_name}</span>}
                                        {!l.is_active && <Badge variant="outline" className="text-xs">Inactivo</Badge>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {l.max_per_year != null && <Badge variant="secondary">Máx: {l.max_per_year}/año</Badge>}
                                        {l.min_days_between != null && <Badge variant="secondary">Min: {l.min_days_between} días</Badge>}
                                        {l.min_age_years != null && <Badge variant="secondary">+{l.min_age_years} años</Badge>}
                                        {l.max_age_years != null && <Badge variant="secondary">hasta {l.max_age_years} años</Badge>}
                                        {l.diagnosis_code && <Badge variant="outline">CIE: {l.diagnosis_code}</Badge>}
                                        {l.requires_authorization && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">Requiere auth</Badge>}
                                    </div>
                                    {l.notes && <p className="text-xs text-muted-foreground mt-1">{l.notes}</p>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
