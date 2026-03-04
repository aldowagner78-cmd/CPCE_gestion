'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';
import {
    DollarSign, ClipboardList, ShieldCheck, Package, Target, Timer,
    SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValoresTab } from '@/components/parametrizacion/ValoresTab';
import { TopesTab } from '@/components/parametrizacion/TopesTab';
import { AutorizacionesTab } from '@/components/parametrizacion/AutorizacionesTab';
import { CoberturaTab } from '@/components/parametrizacion/CoberturaTab';
import { ProgramasTab } from '@/components/parametrizacion/ProgramasTab';
import { SLATab } from '@/components/parametrizacion/SLATab';

type Tab = 'valores' | 'topes' | 'autorizaciones' | 'cobertura' | 'programas' | 'sla';

const TABS: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'valores', label: 'Valores', icon: DollarSign, description: 'Galeno, NBU y UO por jurisdicción' },
    { id: 'topes', label: 'Topes de Consumo', icon: ClipboardList, description: 'Límites por práctica, plan y edad' },
    { id: 'autorizaciones', label: 'Auto-aprobaciones', icon: ShieldCheck, description: 'Reglas de semáforo verde' },
    { id: 'cobertura', label: 'Cobertura', icon: Package, description: 'Sobreescrituras por plan y práctica' },
    { id: 'programas', label: 'Prog. Especiales', icon: Target, description: 'Oncología, CUD, Maternidad…' },
    { id: 'sla', label: 'SLA', icon: Timer, description: 'Tiempos de respuesta objetivo' },
];

export default function ParametrizacionPage() {
    const { user, hasPermission, loading } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('valores');

    // Guard: solo usuarios con permiso de config.values
    if (!loading && (!user || !hasPermission('config.values'))) {
        redirect('/');
    }

    const ActiveComponent = {
        valores: ValoresTab,
        topes: TopesTab,
        autorizaciones: AutorizacionesTab,
        cobertura: CoberturaTab,
        programas: ProgramasTab,
        sla: SLATab,
    }[activeTab];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                            <SlidersHorizontal className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Parametrización</h1>
                            <p className="text-xs text-muted-foreground">
                                Configuración integral del motor de auditoría — Solo Administradores
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
                {/* Sidebar de navegación interna */}
                <aside className="lg:w-56 shrink-0">
                    <nav className="space-y-1">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                                    <div>
                                        <div className={cn('text-sm font-medium leading-tight', isActive && 'text-primary')}>
                                            {tab.label}
                                        </div>
                                        <div className="text-[10px] leading-tight mt-0.5 opacity-70">{tab.description}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Contenido */}
                <main className="flex-1 min-w-0">
                    <ActiveComponent />
                </main>
            </div>
        </div>
    );
}
