'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Timer, Save } from 'lucide-react';
import { slaConfigService, type SlaConfig } from '@/services/parametrizacionService';
import { useJurisdiction } from '@/lib/jurisdictionContext';

const TYPES = [
    { value: 'ambulatorio', label: 'Ambulatorio' },
    { value: 'internacion', label: 'Internación' },
    { value: 'medicamento', label: 'Medicamento' },
    { value: 'discapacidad', label: 'Discapacidad' },
    { value: 'oncologia', label: 'Oncología' },
];
const PRIORITIES: SlaConfig['priority_level'][] = ['normal', 'urgente', 'emergencia'];

const priorityLabel: Record<string, string> = { normal: 'Normal', urgente: '⚡ Urgente', emergencia: '🚨 Emergencia' };
const priorityColor: Record<string, string> = {
    normal: 'bg-blue-50 border-blue-200',
    urgente: 'bg-amber-50 border-amber-200',
    emergencia: 'bg-red-50 border-red-200',
};

export function SLATab() {
    const { activeJurisdiction } = useJurisdiction();
    const jid = activeJurisdiction?.id ?? 1;
    const [configs, setConfigs] = useState<SlaConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    // local edits: key = `${type}-${priority}`
    const [edits, setEdits] = useState<Record<string, Partial<SlaConfig>>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try { setConfigs(await slaConfigService.list(jid)); } catch { /* noop */ }
        setLoading(false);
    }, [jid]);

    useEffect(() => {
        const t = setTimeout(() => { void load(); }, 0);
        return () => clearTimeout(t);
    }, [load]);

    const getConfig = (type: string, priority: SlaConfig['priority_level']) =>
        configs.find(c => c.expedient_type === type && c.priority_level === priority);

    const getValue = (type: string, priority: SlaConfig['priority_level'], field: keyof SlaConfig) => {
        const key = `${type}-${priority}`;
        if (edits[key]?.[field] !== undefined) return edits[key][field] as number;
        return (getConfig(type, priority)?.[field] as number) ?? (field === 'target_hours' ? 24 : 80);
    };

    const setEdit = (type: string, priority: SlaConfig['priority_level'], field: keyof SlaConfig, value: number) => {
        const key = `${type}-${priority}`;
        setEdits(p => ({ ...p, [key]: { ...p[key], [field]: value } }));
    };

    const handleSave = async () => {
        setSaving(true); setMsg(null);
        try {
            const promises = [];
            for (const [key, edit] of Object.entries(edits)) {
                const [type, priority] = key.split('-');
                const existing = getConfig(type, priority as SlaConfig['priority_level']);
                if (existing) {
                    promises.push(slaConfigService.updateById(existing.id, edit));
                } else {
                    promises.push(slaConfigService.upsert({
                        jurisdiction_id: jid,
                        expedient_type: type,
                        priority_level: priority as SlaConfig['priority_level'],
                        target_hours: (edit.target_hours as number) ?? 24,
                        alert_at_percent: (edit.alert_at_percent as number) ?? 80,
                        working_hours_start: '08:00',
                        working_hours_end: '18:00',
                        working_days: [1, 2, 3, 4, 5],
                    }));
                }
            }
            await Promise.all(promises);
            setEdits({});
            await load();
            setMsg({ text: 'Configuración de SLA guardada', type: 'success' });
        } catch { setMsg({ text: 'Error al guardar', type: 'error' }); }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

    const hasPendingEdits = Object.keys(edits).length > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Definí las horas hábiles objetivo para cada tipo de solicitud y nivel de prioridad.
                        El semáforo de la bandeja del auditor usará estos valores para calcular el estado de cada solicitud.
                    </p>
                </div>
                {hasPendingEdits && (
                    <Button size="sm" onClick={handleSave} disabled={saving} className="shrink-0">
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Guardar cambios
                    </Button>
                )}
            </div>

            {msg && (
                <Alert variant={msg.type === 'success' ? 'default' : 'destructive'}
                    className={msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
                    <AlertDescription>{msg.text}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                {TYPES.map(type => (
                    <Card key={type.value} className="p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Timer className="h-4 w-4 text-primary" /> {type.label}
                        </h3>
                        <div className="grid sm:grid-cols-3 gap-3">
                            {PRIORITIES.map(priority => {
                                const hours = getValue(type.value, priority, 'target_hours') as number;
                                const alert = getValue(type.value, priority, 'alert_at_percent') as number;
                                const key = `${type.value}-${priority}`;
                                const isDirty = !!edits[key];
                                return (
                                    <div key={priority} className={`rounded-lg border p-3 space-y-2 ${priorityColor[priority]} ${isDirty ? 'ring-2 ring-primary/30' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold">{priorityLabel[priority]}</span>
                                            {isDirty && <Badge variant="outline" className="text-xs py-0 h-4">Modificado</Badge>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-muted-foreground block">Horas hábiles objetivo</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="1000"
                                                    value={hours}
                                                    onChange={e => setEdit(type.value, priority, 'target_hours', Number(e.target.value))}
                                                    className="w-20 h-8 rounded border bg-white/80 px-2 text-sm font-mono"
                                                />
                                                <span className="text-xs text-muted-foreground">hs</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-muted-foreground block">Alertar al % transcurrido</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="99"
                                                    value={alert}
                                                    onChange={e => setEdit(type.value, priority, 'alert_at_percent', Number(e.target.value))}
                                                    className="w-16 h-8 rounded border bg-white/80 px-2 text-sm font-mono"
                                                />
                                                <span className="text-xs text-muted-foreground">%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ))}
            </div>

            {hasPendingEdits && (
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Guardar todos los cambios
                    </Button>
                </div>
            )}
        </div>
    );
}
