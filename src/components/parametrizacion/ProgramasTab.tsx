'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Target, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { specialProgramsService, type SpecialProgram } from '@/services/parametrizacionService';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COLOR_OPTIONS = [
    { value: 'blue', label: 'Azul', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
    { value: 'red', label: 'Rojo', cls: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
    { value: 'green', label: 'Verde', cls: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
    { value: 'purple', label: 'Violeta', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
    { value: 'orange', label: 'Naranja', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' },
    { value: 'pink', label: 'Rosa', cls: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200' },
];

const getColorCls = (color: string) => COLOR_OPTIONS.find(c => c.value === color)?.cls ?? 'bg-gray-100 text-gray-700';

const EMPTY: Omit<SpecialProgram, 'id' | 'created_at' | 'updated_at'> = {
    jurisdiction_id: 1, name: '', code: '', description: '',
    inclusion_criteria: {}, benefits: {}, color: 'blue', icon: 'target', is_active: true,
};

export function ProgramasTab() {
    const { activeJurisdiction } = useJurisdiction();
    const jid = activeJurisdiction?.id ?? 1;
    const [programs, setPrograms] = useState<SpecialProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<Omit<SpecialProgram, 'id' | 'created_at' | 'updated_at'>>({ ...EMPTY, jurisdiction_id: jid });
    const [showForm, setShowForm] = useState(false);

    // Raw JSON strings for criteria/benefits
    const [criteriaStr, setCriteriaStr] = useState('{}');
    const [benefitsStr, setBenefitsStr] = useState('{}');

    const load = useCallback(async () => {
        setLoading(true);
        try { setPrograms(await specialProgramsService.list(jid)); } catch { /* noop */ }
        setLoading(false);
    }, [jid]);

    useEffect(() => {
        const t = setTimeout(() => { void load(); }, 0);
        return () => clearTimeout(t);
    }, [load]);

    const resetForm = () => {
        setForm({ ...EMPTY, jurisdiction_id: jid });
        setCriteriaStr('{}'); setBenefitsStr('{}');
        setEditId(null); setShowForm(false);
    };

    const handleEdit = (p: SpecialProgram) => {
        setForm({ ...p });
        setCriteriaStr(JSON.stringify(p.inclusion_criteria, null, 2));
        setBenefitsStr(JSON.stringify(p.benefits, null, 2));
        setEditId(p.id); setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.code.trim()) { setMsg({ text: 'Nombre y código son obligatorios', type: 'error' }); return; }
        let criteria = {}, benefits2 = {};
        try { criteria = JSON.parse(criteriaStr || '{}'); } catch { setMsg({ text: 'JSON de criterios inválido', type: 'error' }); return; }
        try { benefits2 = JSON.parse(benefitsStr || '{}'); } catch { setMsg({ text: 'JSON de beneficios inválido', type: 'error' }); return; }
        setSaving(true); setMsg(null);
        try {
            const payload = { ...form, jurisdiction_id: jid, inclusion_criteria: criteria, benefits: benefits2 };
            if (editId) await specialProgramsService.update(editId, payload);
            else await specialProgramsService.create(payload);
            await load(); resetForm();
            setMsg({ text: 'Programa guardado', type: 'success' });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Error al guardar';
            setMsg({ text: message, type: 'error' });
        }
        setSaving(false);
    };

    const handleToggle = async (id: number, active: boolean) => { await specialProgramsService.toggleActive(id, active); await load(); };
    const handleDelete = async (id: number) => { if (!confirm('¿Eliminar este programa?')) return; await specialProgramsService.delete(id); await load(); };

    return (
        <div className="space-y-4">
            {msg && (
                <Alert variant={msg.type === 'success' ? 'default' : 'destructive'}
                    className={msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
                    <AlertDescription>{msg.text}</AlertDescription>
                </Alert>
            )}

            {/* Formulario */}
            {showForm ? (
                <Card className="p-5 space-y-4">
                    <h3 className="font-semibold">{editId ? 'Editar' : 'Nuevo'} Programa Especial</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Nombre *</Label>
                            <Input placeholder="Ej: Oncología" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Código interno *</Label>
                            <Input placeholder="Ej: ONCOLOGIA" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="font-mono uppercase" />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">Descripción</Label>
                            <Input placeholder="Descripción breve del programa" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Color de identificación</Label>
                            <div className="flex gap-2 flex-wrap">
                                {COLOR_OPTIONS.map(c => (
                                    <button key={c.value} onClick={() => setForm(p => ({ ...p, color: c.value }))}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all ${getColorCls(c.value)} ${form.color === c.value ? 'border-current ring-2 ring-offset-1 ring-current/30' : 'border-transparent'}`}>
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Criterios de inclusión (JSON)</Label>
                            <textarea
                                className="w-full font-mono text-xs rounded-md border border-input bg-background p-2 min-h-[80px]"
                                value={criteriaStr}
                                onChange={e => setCriteriaStr(e.target.value)}
                                spellCheck={false}
                                placeholder={'{"requires_diagnosis": true, "diagnosis_prefix": ["C"]}'}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Beneficios (JSON)</Label>
                            <textarea
                                className="w-full font-mono text-xs rounded-md border border-input bg-background p-2 min-h-[80px]"
                                value={benefitsStr}
                                onChange={e => setBenefitsStr(e.target.value)}
                                spellCheck={false}
                                placeholder={'{"full_coverage": true, "waives_copay": true}'}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Guardar
                        </Button>
                    </div>
                </Card>
            ) : (
                <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Nuevo programa especial
                </Button>
            )}

            {/* Cards de programas */}
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : programs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay programas especiales configurados.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {programs.map(p => (
                        <Card key={p.id} className={`p-4 ${!p.is_active ? 'opacity-60' : ''}`}>
                            <div className="flex items-start gap-3">
                                <button onClick={() => handleToggle(p.id, !p.is_active)}
                                    className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${p.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${p.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <Badge className={`${getColorCls(p.color)} text-xs`}>{p.name}</Badge>
                                        <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                                    </div>
                                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {Object.entries(p.benefits || {}).map(([k, v]) => (
                                            <span key={k} className="text-[10px] bg-muted rounded px-1 py-0.5 font-mono">{k}: {String(v)}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}><Pencil className="h-3 w-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
