'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Stethoscope, Sparkles, CheckCircle, AlertTriangle, Loader2, UserPlus, CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Tipos ──
type ProviderMatch = { name: string; specialty: string | null; type: string };
type ProviderSuggestion = { name: string; enrollment: string | null; specialty: string | null };
type ValidationState = 'idle' | 'checking' | 'found' | 'not_found';

// Extrae solo dígitos de la matrícula (ej: "MN 12345" → "12345")
function extractEnrollmentDigits(raw: string): string {
    return raw.replace(/\D/g, '');
}

// Calcula fecha de vencimiento sumando días a una fecha ISO
function calcExpiryDate(prescriptionDate: string, days: number): string {
    const d = new Date(prescriptionDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

// Formatea fecha ISO a texto legible (ej: "06/04/2026")
function formatDateDisplay(iso: string): string {
    if (!iso || iso.length < 10) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

interface PrescriptionFormProps {
    doctorName: string;
    doctorRegistration: string;
    doctorSpecialty: string;
    providerName: string;
    prescriptionDate: string;
    orderExpiryDate: string;
    onDoctorNameChange: (v: string) => void;
    onDoctorRegistrationChange: (v: string) => void;
    onDoctorSpecialtyChange: (v: string) => void;
    onProviderNameChange: (v: string) => void;
    onPrescriptionDateChange: (v: string) => void;
    onOrderExpiryDateChange: (v: string) => void;
}

export function PrescriptionForm({
    doctorName, doctorRegistration, doctorSpecialty, providerName,
    prescriptionDate, orderExpiryDate,
    onDoctorNameChange, onDoctorRegistrationChange, onDoctorSpecialtyChange,
    onProviderNameChange, onPrescriptionDateChange, onOrderExpiryDateChange,
}: PrescriptionFormProps) {
    const [validationState, setValidationState] = useState<ValidationState>('idle');
    const [providerMatch, setProviderMatch] = useState<ProviderMatch | null>(null);
    const [nameSuggestions, setNameSuggestions] = useState<ProviderSuggestion[]>([]);
    const [showNameDropdown, setShowNameDropdown] = useState(false);
    const [expiryDays, setExpiryDays] = useState<30 | 60 | 90>(30);
    const [savingDoctor, setSavingDoctor] = useState(false);
    const [doctorSaved, setDoctorSaved] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const nameDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const nameDropdownRef = useRef<HTMLDivElement>(null);

    // Refs para leer valores actuales sin agregarlos a deps de efectos
    const doctorNameRef = useRef(doctorName);
    const doctorSpecialtyRef = useRef(doctorSpecialty);
    useEffect(() => { doctorNameRef.current = doctorName; }, [doctorName]);
    useEffect(() => { doctorSpecialtyRef.current = doctorSpecialty; }, [doctorSpecialty]);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (nameDropdownRef.current && !nameDropdownRef.current.contains(e.target as Node)) {
                setShowNameDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Validar matrícula contra tabla providers (debounce 600ms) ──
    useEffect(() => {
        clearTimeout(debounceRef.current);
        const digits = extractEnrollmentDigits(doctorRegistration);
        if (digits.length < 4) {
            setValidationState('idle');
            setProviderMatch(null);
            return;
        }
        setValidationState('checking');
        debounceRef.current = setTimeout(async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('providers')
                .select('name, specialty, type')
                .ilike('enrollment', `%${digits}%`)
                .eq('is_active', true)
                .limit(1)
                .single();
            if (data) {
                setProviderMatch(data as ProviderMatch);
                setValidationState('found');
                setDoctorSaved(false);
                // Auto-completar nombre y especialidad si los campos están vacíos
                if (!doctorNameRef.current) onDoctorNameChange(data.name);
                if (!doctorSpecialtyRef.current && data.specialty) onDoctorSpecialtyChange(data.specialty);
            } else {
                setProviderMatch(null);
                setValidationState('not_found');
                setDoctorSaved(false);
            }
        }, 600);
        return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctorRegistration]);

    // ── Autocomplete por nombre (debounce 400ms) ──
    useEffect(() => {
        clearTimeout(nameDebounceRef.current);
        if (doctorName.length < 3) {
            setNameSuggestions([]);
            setShowNameDropdown(false);
            return;
        }
        nameDebounceRef.current = setTimeout(async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('providers')
                .select('name, enrollment, specialty')
                .ilike('name', `%${doctorName}%`)
                .eq('is_active', true)
                .limit(6);
            if (data && data.length > 0) {
                setNameSuggestions(data as ProviderSuggestion[]);
                setShowNameDropdown(true);
            } else {
                setNameSuggestions([]);
                setShowNameDropdown(false);
            }
        }, 400);
        return () => clearTimeout(nameDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctorName]);

    // ── Auto-calcular vencimiento al cambiar fecha o días ──
    useEffect(() => {
        if (!prescriptionDate || !/^\d{4}-\d{2}-\d{2}$/.test(prescriptionDate)) return;
        onOrderExpiryDateChange(calcExpiryDate(prescriptionDate, expiryDays));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prescriptionDate, expiryDays]);

    // Seleccionar sugerencia del dropdown
    const selectSuggestion = useCallback((s: ProviderSuggestion) => {
        onDoctorNameChange(s.name);
        if (s.enrollment) onDoctorRegistrationChange(s.enrollment);
        if (s.specialty) onDoctorSpecialtyChange(s.specialty);
        setShowNameDropdown(false);
        setNameSuggestions([]);
    }, [onDoctorNameChange, onDoctorRegistrationChange, onDoctorSpecialtyChange]);

    // Guardar médico desconocido en providers
    async function handleSaveDoctor() {
        if (!doctorName.trim()) return;
        setSavingDoctor(true);
        try {
            const supabase = createClient();
            const digits = extractEnrollmentDigits(doctorRegistration);
            await supabase.from('providers').insert({
                name: doctorName.trim(),
                enrollment: digits || null,
                specialty: doctorSpecialty.trim() || null,
                type: 'medico',
                is_active: true,
            });
            setDoctorSaved(true);
            setValidationState('found');
            setProviderMatch({ name: doctorName.trim(), specialty: doctorSpecialty.trim() || null, type: 'medico' });
        } finally {
            setSavingDoctor(false);
        }
    }

    return (
        <div className="border rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Médico prescriptor y prestador
                </p>
            </div>
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* ── Campo nombre con autocomplete ── */}
                    <div ref={nameDropdownRef} className="relative">
                        <label className="text-xs text-muted-foreground mb-1 block">Médico solicitante</label>
                        <Input
                            placeholder="Dr./Dra. nombre completo"
                            value={doctorName}
                            onChange={e => { onDoctorNameChange(e.target.value); }}
                            onFocus={() => nameSuggestions.length > 0 && setShowNameDropdown(true)}
                            className="text-sm"
                            autoComplete="off"
                        />
                        {showNameDropdown && nameSuggestions.length > 0 && (
                            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg overflow-hidden">
                                {nameSuggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col gap-0.5 border-b last:border-b-0"
                                    >
                                        <span className="font-medium text-foreground">{s.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {s.enrollment && <span className="mr-2">Mat. {s.enrollment}</span>}
                                            {s.specialty && <span>{s.specialty}</span>}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Campo matrícula con validación automática ── */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Matrícula (MN/MP)</label>
                        <div className="space-y-1">
                            <Input
                                placeholder="Ej: MN 12345 o MP 67890"
                                value={doctorRegistration}
                                onChange={e => onDoctorRegistrationChange(e.target.value)}
                                className="text-sm"
                            />
                            {validationState === 'checking' && (
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Verificando en padrón...
                                </p>
                            )}
                            {validationState === 'found' && providerMatch && (
                                <p className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
                                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                    {doctorSaved ? 'Médico guardado en padrón' : `${providerMatch.name}${providerMatch.specialty ? ` — ${providerMatch.specialty}` : ''}`}
                                </p>
                            )}
                            {validationState === 'not_found' && !doctorSaved && (
                                <div className="flex items-center gap-2">
                                    <p className="flex items-center gap-1 text-xs text-amber-600">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> No registrado en padrón
                                    </p>
                                    {doctorName.trim() && (
                                        <button
                                            type="button"
                                            onClick={handleSaveDoctor}
                                            disabled={savingDoctor}
                                            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                                        >
                                            {savingDoctor
                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                : <UserPlus className="h-3 w-3" />}
                                            Guardar médico
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Especialidad</label>
                        <Input placeholder="Ej: Cardiología, Traumatología" value={doctorSpecialty} onChange={e => onDoctorSpecialtyChange(e.target.value)} className="text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Prestador / Efector</label>
                        <Input placeholder="Clínica, sanatorio, laboratorio" value={providerName} onChange={e => onProviderNameChange(e.target.value)} className="text-sm" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Fecha prescripción</label>
                        <DatePicker value={prescriptionDate} onChange={onPrescriptionDateChange} placeholder="Seleccionar fecha" />
                    </div>

                    {/* ── Vencimiento auto-calculado ── */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" /> Vencimiento orden
                        </label>
                        <div className="space-y-2">
                            {/* Selector de días */}
                            <div className="flex gap-1">
                                {([30, 60, 90] as const).map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setExpiryDays(d)}
                                        className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium border transition-colors
                                            ${expiryDays === d
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background text-muted-foreground border-input hover:bg-accent'}`}
                                    >
                                        {d} días
                                    </button>
                                ))}
                            </div>
                            {/* Fecha calculada */}
                            {orderExpiryDate
                                ? <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                                    Vence el <span className="font-semibold text-foreground ml-0.5">{formatDateDisplay(orderExpiryDate)}</span>
                                  </p>
                                : <p className="text-xs text-muted-foreground italic">
                                    — Ingresar fecha de prescripción primero
                                  </p>
                            }
                        </div>
                    </div>
                </div>

                {doctorName && prescriptionDate && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Datos detectados por IA — verificar antes de enviar
                    </p>
                )}
            </div>
        </div>
    );
}
