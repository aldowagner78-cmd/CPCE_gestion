'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Pencil, Check, X, Loader2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { autoAuthRulesService, type AutoAuthRule } from '@/services/parametrizacionService';
import { useJurisdiction } from '@/lib/jurisdictionContext';

const CATEGORIES = [
    { value: 'medico', label: 'Médico (Galeno)' },
    { value: 'bioquimico', label: 'Bioquímico (NBU)' },
    { value: 'odontologico', label: 'Odontológico (UO)' },
    { value: 'farmacia', label: 'Farmacia' },
];

const EMPTY_RULE: Omit<AutoAuthRule, 'id' | 'created_at' | 'updated_at'> = {
    jurisdiction_id: 1,
    rule_name: '',
    description: '',
    practice_code: null,
    practice_category: null,
    plan_id: null,
    max_amount: null,
    requires_no_prior_in_period: null,
    requires_active_affiliate: true,
    conditions: {},
    is_active: true,
    priority: 0,
};

export function AutorizacionesTab() {
    const { activeJurisdiction } = useJurisdiction();
    const jid = activeJurisdiction?.id ?? 1;
    const [rules, setRules] = useState<AutoAuthRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<Omit<AutoAuthRule, 'id' | 'created_at' | 'updated_at'>>({ ...EMPTY_RULE, jurisdiction_id: jid });

    const load = useCallback(async () => {
        setLoading(true);
        try { setRules(await autoAuthRulesService.list(jid)); } catch { /* noop */ }
        setLoading(false);
    }, [jid]);

    useEffect(() => {
        const t = setTimeout(() => { void load(); }, 0);
        return () => clearTimeout(t);
    }, [load]);

    const resetForm = () => { setForm({ ...EMPTY_RULE, jurisdiction_id: jid }); setEditId(null); setShowForm(false); };

    const handleSave = async () => {
        if (!form.rule_name.trim()) { setMsg({ text: 'El nombre de la regla es obligatorio', type: 'error' }); return; }
        setSaving(true); setMsg(null);
        try {
            if (editId) await autoAuthRulesService.update(editId, form);
            else await autoAuthRulesService.create({ ...form, jurisdiction_id: jid });
            await load(); resetForm();
            setMsg({ text: 'Regla guardada', type: 'success' });
        } catch { setMsg({ text: 'Error al guardar', type: 'error' }); }
        setSaving(false);
    };

    const handleToggle = async (id: number, active: boolean) => {
        await autoAuthRulesService.toggleActive(id, active);
        await load();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta regla?')) return;
        await autoAuthRulesService.delete(id);
        await load();
    };

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    Las reglas de <strong>auto-aprobación</strong> permiten que ciertas prácticas se aprueben automáticamente sin intervención del auditor, cuando se cumplen todas las condiciones configuradas.
                </p>
            </div>

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
                    <span className="font-medium">{editId ? 'Editar regla' : 'Nueva regla de auto-aprobación'}</span>
                    {showForm ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                </button>
                {showForm && (
                    <div className="p-4 pt-0 border-t space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Nombre de la regla *</Label>
                                <Input placeholder="Ej: Rx simple — aprobación directa" value={form.rule_name} onChange={e => setForm(p => ({ ...p, rule_name: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Código de práctica (o dejar vacío para categoría)</Label>
                                <Input placeholder="Ej: 2-01-01" value={form.practice_code || ''} onChange={e => setForm(p => ({ ...p, practice_code: e.target.value || null }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Categoría del nomenclador</Label>
                                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.practice_category || ''} onChange={e => setForm(p => ({ ...p, practice_category: e.target.value || null }))}>
                                    <option value="">Todas las categorías</option>
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Monto máximo habilitado ($)</Label>
                                <Input type="number" min="0" placeholder="Sin límite si vacío" value={form.max_amount ?? ''} onChange={e => setForm(p => ({ ...p, max_amount: e.target.value ? Number(e.target.value) : null }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Días sin solicitud previa requeridos</Label>
                                <Input type="number" min="0" placeholder="0 = sin restricción" value={form.requires_no_prior_in_period ?? ''} onChange={e => setForm(p => ({ ...p, requires_no_prior_in_period: e.target.value ? Number(e.target.value) : null }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Prioridad (mayor = evalúa primero)</Label>
                                <Input type="number" min="0" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs">Descripción / Fundamento</Label>
                                <Input placeholder="Explicación de cuándo aplica esta regla" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t">
                            <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Guardar
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : rules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay reglas de auto-aprobación configuradas.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {rules.map(r => (
                        <Card key={r.id} className="p-4">
                            <div className="flex items-start gap-3">
                                {/* Toggle */}
                                <button
                                    onClick={() => handleToggle(r.id, !r.is_active)}
                                    className={`mt-1 relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${r.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${r.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">{r.rule_name}</span>
                                        {r.is_active
                                            ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Activa</Badge>
                                            : <Badge variant="outline" className="text-xs">Inactiva</Badge>}
                                        {r.priority > 0 && <Badge variant="secondary" className="text-xs">P{r.priority}</Badge>}
                                    </div>
                                    {r.description && <p className="text-xs text-muted-foreground mb-1">{r.description}</p>}
                                    <div className="flex flex-wrap gap-1.5 text-xs">
                                        {r.practice_code && <Badge variant="outline">Cód: {r.practice_code}</Badge>}
                                        {r.practice_category && <Badge variant="outline">Cat: {r.practice_category}</Badge>}
                                        {r.max_amount != null && <Badge variant="secondary">Máx: ${r.max_amount}</Badge>}
                                        {r.requires_no_prior_in_period != null && <Badge variant="secondary">{r.requires_no_prior_in_period}d sin prev.</Badge>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setForm({ ...r }); setEditId(r.id); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
