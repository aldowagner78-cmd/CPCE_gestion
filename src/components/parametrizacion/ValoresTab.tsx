'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Loader2, Save, History, TrendingUp } from 'lucide-react';
import { valuesService, type UnitValues } from '@/services/valuesService';

type FormKey = 'sf' | 'ros';
type ValuesFormState = Record<FormKey, { medical: string; biochemical: string; dental: string }>;

interface JurisdictionCardProps {
    jid: number;
    label: string;
    vals: UnitValues | null;
    formKey: FormKey;
    form: ValuesFormState;
    setForm: React.Dispatch<React.SetStateAction<ValuesFormState>>;
    saving: boolean;
    onSave: (jid: number) => void;
}

function JurisdictionCard({ jid, label, vals, formKey, form, setForm, saving, onSave }: JurisdictionCardProps) {
    return (
        <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" /> {label}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Ultimo cambio: {vals?.valid_from ? new Date(vals.valid_from).toLocaleDateString('es-AR') : 'Sin datos'}
                    </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                {([
                    { key: 'medical', label: 'Galeno (Medico)', current: vals?.medical_value },
                    { key: 'biochemical', label: 'NBU (Bioquimico)', current: vals?.biochemical_value },
                    { key: 'dental', label: 'UO (Odontologico)', current: vals?.dental_value },
                ] as const).map(f => (
                    <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs font-medium">{f.label}</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form[formKey][f.key]}
                                onChange={e => setForm(p => ({ ...p, [formKey]: { ...p[formKey], [f.key]: e.target.value } }))}
                                className="pl-7"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Vigente: ${f.current?.toFixed(2) || '0.00'}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
                <Button onClick={() => onSave(jid)} disabled={saving} size="sm">
                    {saving
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                        : <><Save className="mr-2 h-4 w-4" />Actualizar</>}
                </Button>
            </div>
        </Card>
    );
}

export function ValoresTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [sfValues, setSfValues] = useState<UnitValues | null>(null);
    const [rosValues, setRosValues] = useState<UnitValues | null>(null);
    const [form, setForm] = useState<ValuesFormState>({
        sf: { medical: '', biochemical: '', dental: '' },
        ros: { medical: '', biochemical: '', dental: '' },
    });

    const load = useCallback(async () => {
        setLoading(true);
        const [sf, ros] = await Promise.all([valuesService.getCurrentValues(1), valuesService.getCurrentValues(2)]);
        setSfValues(sf); setRosValues(ros);
        setForm({
            sf: { medical: sf?.medical_value?.toString() || '', biochemical: sf?.biochemical_value?.toString() || '', dental: sf?.dental_value?.toString() || '' },
            ros: { medical: ros?.medical_value?.toString() || '', biochemical: ros?.biochemical_value?.toString() || '', dental: ros?.dental_value?.toString() || '' },
        });
        setLoading(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => { void load(); }, 0);
        return () => clearTimeout(t);
    }, [load]);

    const save = async (jid: number) => {
        setSaving(true);
        setMessage(null);
        try {
            const v = jid === 1 ? form.sf : form.ros;
            await valuesService.updateValues(jid, {
                medical: parseFloat(v.medical) || 0,
                biochemical: parseFloat(v.biochemical) || 0,
                dental: parseFloat(v.dental) || 0,
            });
            await load();
            setMessage({ text: 'Valores actualizados correctamente', type: 'success' });
        } catch { setMessage({ text: 'Error al guardar valores', type: 'error' }); }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-4">
            {message && (
                <Alert variant={message.type === 'success' ? 'default' : 'destructive'}
                    className={message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200' : ''}>
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}
            <Tabs defaultValue="sf">
                <TabsList>
                    <TabsTrigger value="sf">Cámara I — Santa Fe</TabsTrigger>
                    <TabsTrigger value="ros">Cámara II — Rosario</TabsTrigger>
                </TabsList>
                <TabsContent value="sf" className="mt-4">
                    <JurisdictionCard
                        jid={1}
                        label="Valores Santa Fe"
                        vals={sfValues}
                        formKey="sf"
                        form={form}
                        setForm={setForm}
                        saving={saving}
                        onSave={save}
                    />
                </TabsContent>
                <TabsContent value="ros" className="mt-4">
                    <JurisdictionCard
                        jid={2}
                        label="Valores Rosario"
                        vals={rosValues}
                        formKey="ros"
                        form={form}
                        setForm={setForm}
                        saving={saving}
                        onSave={save}
                    />
                </TabsContent>
            </Tabs>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <History className="h-3.5 w-3.5" /> El historial de cambios queda registrado en la tabla de auditoría.
            </p>
        </div>
    );
}
