'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { planCoverageService, type PlanCoverageOverride } from '@/services/parametrizacionService';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CATEGORIES = [
    'medico', 'bioquimico', 'odontologico', 'farmacia', 'kinesiologia',
    'fonoaudiologia', 'psicologia', 'nutricion', 'cirugia', 'internacion',
];

export function CoberturaTab() {
    const { activeJurisdiction } = useJurisdiction();
    const jid = activeJurisdiction?.id ?? 1;
    const [overrides, setOverrides] = useState<PlanCoverageOverride[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({
        jurisdiction_id: jid,
        plan_id: 0,
        practice_id: null as number | null,
        practice_category: '',
        coverage_percent: 80,
        copay_type: 'percent' as 'percent' | 'fixed',
        copay_value: 0,
        notes: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: null as string | null,
        is_active: true,
    });

    const load = useCallback(async () => {
        setLoading(true);
        try { setOverrides(await planCoverageService.list(jid)); } catch { /* noop */ }
        setLoading(false);
    }, [jid]);

    useEffect(() => {
        const t = setTimeout(() => { void load(); }, 0);
        return () => clearTimeout(t);
    }, [load]);

    const resetForm = () => {
        setForm({ jurisdiction_id: jid, plan_id: 0, practice_id: null, practice_category: '', coverage_percent: 80, copay_type: 'percent', copay_value: 0, notes: '', valid_from: new Date().toISOString().split('T')[0], valid_to: null, is_active: true });
        setEditId(null); setShowForm(false);
    };

    const handleEdit = (o: PlanCoverageOverride) => {
        setForm({ ...o, practice_id: o.practice_id ?? null, practice_category: o.practice_category ?? '', notes: o.notes ?? '', valid_to: o.valid_to ?? null });
        setEditId(o.id); setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.plan_id) { setMsg({ text: 'Ingresá el ID del plan', type: 'error' }); return; }
        if (form.coverage_percent < 0 || form.coverage_percent > 100) { setMsg({ text: 'La cobertura debe estar entre 0 y 100', type: 'error' }); return; }
        setSaving(true); setMsg(null);
        try {
            await planCoverageService.upsert({ ...form, jurisdiction_id: jid });
            await load(); resetForm();
            setMsg({ text: 'Sobreescritura guardada', type: 'success' });
        } catch { setMsg({ text: 'Error al guardar', type: 'error' }); }
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta sobreescritura?')) return;
        await planCoverageService.delete(id);
        await load();
    };

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2">
                <Package className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    Definí sobreescrituras de cobertura para combinaciones plan–práctica o plan–categoría específicas,
                    anulando el porcentaje base del plan cuando corresponda.
                </p>
            </div>

            {msg && (
                <Alert variant={msg.type === 'success' ? 'default' : 'destructive'}
                    className={msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
                    <AlertDescription>{msg.text}</AlertDescription>
                </Alert>
            )}

            {showForm ? (
                <Card className="p-5 space-y-4">
                    <h3 className="font-semibold">{editId ? 'Editar' : 'Nueva'} sobreescritura de cobertura</h3>
                    <div className="grid sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">ID del Plan *</Label>
                            <Input type="number" min="1" value={form.plan_id || ''} onChange={e => setForm(p => ({ ...p, plan_id: Number(e.target.value) }))} placeholder="ID numérico" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Categoría del nomenclador</Label>
                            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.practice_category} onChange={e => setForm(p => ({ ...p, practice_category: e.target.value }))}>
                                <option value="">Todas las categorías</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">ID práctica específica</Label>
                            <Input type="number" min="1" value={form.practice_id ?? ''} onChange={e => setForm(p => ({ ...p, practice_id: e.target.value ? Number(e.target.value) : null }))} placeholder="(opcional)" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">% Cobertura *</Label>
                            <div className="relative"><Input type="number" min="0" max="100" step="1" value={form.coverage_percent} onChange={e => setForm(p => ({ ...p, coverage_percent: Number(e.target.value) }))} className="pr-7" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span></div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Coseguro tipo</Label>
                            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.copay_type} onChange={e => setForm(p => ({ ...p, copay_type: e.target.value as 'percent' | 'fixed' }))}>
                                <option value="percent">Porcentaje (%)</option>
                                <option value="fixed">Monto fijo ($)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Valor coseguro</Label>
                            <Input type="number" min="0" step="0.01" value={form.copay_value} onChange={e => setForm(p => ({ ...p, copay_value: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Válido desde</Label>
                            <DatePicker value={form.valid_from} onChange={v => setForm(p => ({ ...p, valid_from: v }))} placeholder="Desde" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Válido hasta (opcional)</Label>
                            <DatePicker value={form.valid_to ?? ''} onChange={v => setForm(p => ({ ...p, valid_to: v || null }))} placeholder="Hasta (opcional)" clearable />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                            <Label className="text-xs">Observaciones</Label>
                            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Fundamento o notas" />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end border-t pt-2">
                        <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Guardar
                        </Button>
                    </div>
                </Card>
            ) : (
                <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Nueva sobreescritura
                </Button>
            )}

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : overrides.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay sobreescrituras de cobertura configuradas.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {overrides.map(o => (
                        <Card key={o.id} className={`p-4 flex items-start gap-3 ${!o.is_active ? 'opacity-50' : ''}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">{o.plan_name || `Plan #${o.plan_id}`}</span>
                                    {o.practice_category && <Badge variant="outline" className="text-xs">{o.practice_category}</Badge>}
                                    {o.practice_name && <span className="text-xs text-muted-foreground truncate">{o.practice_name}</span>}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <Badge className="bg-primary/10 text-primary">Cob: {o.coverage_percent}%</Badge>
                                    {o.copay_value > 0 && <Badge variant="secondary">Coseguro: {o.copay_type === 'percent' ? `${o.copay_value}%` : `$${o.copay_value}`}</Badge>}
                                    <Badge variant="outline">Desde: {new Date(o.valid_from).toLocaleDateString('es-AR')}</Badge>
                                    {o.valid_to && <Badge variant="outline">Hasta: {new Date(o.valid_to).toLocaleDateString('es-AR')}</Badge>}
                                </div>
                                {o.notes && <p className="text-xs text-muted-foreground mt-1">{o.notes}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
