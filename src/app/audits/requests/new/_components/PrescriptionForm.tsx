'use client';

import { Input } from '@/components/ui/input';
import { Stethoscope, Sparkles } from 'lucide-react';

function DateMaskedInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
    const handleChange = (raw: string) => {
        const digits = raw.replace(/\D/g, '');
        let formatted = '';
        for (let i = 0; i < digits.length && i < 8; i++) {
            if (i === 2 || i === 4) formatted += '/';
            formatted += digits[i];
        }
        onChange(formatted);
    };
    return (
        <Input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            value={value}
            onChange={e => handleChange(e.target.value)}
            maxLength={10}
            className={className}
        />
    );
}

interface PrescriptionFormProps {
    doctorName: string;
    doctorRegistration: string;
    doctorSpecialty: string;
    providerName: string;
    prescriptionDate: string;
    prescriptionNumber: string;
    orderExpiryDate: string;
    onDoctorNameChange: (v: string) => void;
    onDoctorRegistrationChange: (v: string) => void;
    onDoctorSpecialtyChange: (v: string) => void;
    onProviderNameChange: (v: string) => void;
    onPrescriptionDateChange: (v: string) => void;
    onPrescriptionNumberChange: (v: string) => void;
    onOrderExpiryDateChange: (v: string) => void;
}

export function PrescriptionForm({
    doctorName, doctorRegistration, doctorSpecialty, providerName,
    prescriptionDate, prescriptionNumber, orderExpiryDate,
    onDoctorNameChange, onDoctorRegistrationChange, onDoctorSpecialtyChange,
    onProviderNameChange, onPrescriptionDateChange, onPrescriptionNumberChange, onOrderExpiryDateChange,
}: PrescriptionFormProps) {
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
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Médico solicitante</label>
                        <Input placeholder="Dr./Dra. nombre completo" value={doctorName} onChange={e => onDoctorNameChange(e.target.value)} className="text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Matrícula (MN/MP)</label>
                        <Input placeholder="Ej: MN 12345 o MP 67890" value={doctorRegistration} onChange={e => onDoctorRegistrationChange(e.target.value)} className="text-sm" />
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Fecha prescripción</label>
                        <DateMaskedInput value={prescriptionDate} onChange={onPrescriptionDateChange} className="text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nro. receta / orden</label>
                        <Input placeholder="Nro. referencia" value={prescriptionNumber} onChange={e => onPrescriptionNumberChange(e.target.value)} className="text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Vencimiento orden</label>
                        <DateMaskedInput value={orderExpiryDate} onChange={onOrderExpiryDateChange} className="text-sm" />
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
