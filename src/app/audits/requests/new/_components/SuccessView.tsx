'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import type { PracticeItem } from './types';

interface SuccessViewProps {
    submittedExpNumber: string;
    autoApprovedCodes: string[];
    practiceItems: PracticeItem[];
    onReset: () => void;
}

export function SuccessView({ submittedExpNumber, autoApprovedCodes, practiceItems, onReset }: SuccessViewProps) {
    const allAutoApproved = autoApprovedCodes.length === practiceItems.length && practiceItems.length > 0;
    const someAutoApproved = autoApprovedCodes.length > 0 && !allAutoApproved;

    return (
        <div className="max-w-lg mx-auto p-6 mt-8">
            <div className="border border-green-200 bg-green-50/50 rounded-xl p-8 text-center space-y-4">
                <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold text-green-800">Expediente Creado</h2>
                <p className="text-3xl font-mono font-bold text-green-900">{submittedExpNumber}</p>

                {allAutoApproved && (
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                        <p className="text-sm font-semibold text-green-800 flex items-center justify-center gap-1.5">
                            <Zap className="h-4 w-4" /> Todas las prácticas auto-aprobadas
                        </p>
                        <div className="mt-2 space-y-1">
                            {autoApprovedCodes.map(code => (
                                <p key={code} className="text-sm font-mono text-green-800">{code}</p>
                            ))}
                        </div>
                    </div>
                )}

                {someAutoApproved && (
                    <div className="space-y-2">
                        <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                            <p className="text-sm font-semibold text-green-800">
                                ✓ {autoApprovedCodes.length} práctica(s) auto-aprobada(s):
                            </p>
                            <div className="mt-1 space-y-0.5">
                                {autoApprovedCodes.map(code => (
                                    <p key={code} className="text-sm font-mono text-green-800">{code}</p>
                                ))}
                            </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                                ⏳ {practiceItems.length - autoApprovedCodes.length} práctica(s) derivada(s) a auditoría
                            </p>
                        </div>
                    </div>
                )}

                {autoApprovedCodes.length === 0 && (
                    <p className="text-sm text-green-600">Derivado a auditoría para revisión.</p>
                )}

                <div className="flex gap-3 justify-center pt-2">
                    <Button onClick={onReset}>Nueva Solicitud</Button>
                    <Link href="/audits/requests"><Button variant="outline">Ver Pendientes</Button></Link>
                </div>
            </div>
        </div>
    );
}
