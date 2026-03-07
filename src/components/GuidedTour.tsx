'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { CallBackProps, Step, Styles } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';

// Dynamic import to avoid SSR issues with react-joyride
const JoyrideComponent = dynamic(() => import('react-joyride'), { ssr: false });

// ── Tour definitions ──

const TOUR_STYLES: Partial<Styles> = {
    options: {
        primaryColor: '#2563eb',
        zIndex: 10000,
        arrowColor: '#fff',
        backgroundColor: '#fff',
        textColor: '#1f2937',
    },
    tooltip: {
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
    },
    buttonNext: {
        backgroundColor: '#2563eb',
        borderRadius: '8px',
        fontSize: '13px',
        padding: '8px 16px',
    },
    buttonBack: {
        color: '#6b7280',
        fontSize: '13px',
    },
    buttonSkip: {
        color: '#9ca3af',
        fontSize: '12px',
    },
};

const DASHBOARD_STEPS: Step[] = [
    {
        target: '[data-tour="sidebar"]',
        content: 'Este es el menú principal. Desde aquí accedés a todos los módulos del sistema: auditoría, pacientes, prácticas, configuración y más.',
        title: '📋 Menú de navegación',
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="jurisdiction"]',
        content: 'Seleccioná la jurisdicción activa. Todos los datos se filtran según la jurisdicción que tengas seleccionada.',
        title: '🏛️ Jurisdicción',
        placement: 'bottom',
    },
    {
        target: '[data-tour="audits-link"]',
        content: 'El módulo de Auditoría es el corazón del sistema. Aquí podés crear, revisar y resolver expedientes de auditoría médica.',
        title: '🔍 Auditoría Médica',
        placement: 'right',
    },
    {
        target: '[data-tour="user-menu"]',
        content: 'Tu perfil y configuración. Podés cambiar tu contraseña, ver tu rol y ajustar preferencias.',
        title: '👤 Tu perfil',
        placement: 'left',
    },
];

const CREATION_STEPS: Step[] = [
    {
        target: '[data-tour="mode-tabs"]',
        content: 'Elegí entre modo IA (subí una imagen y el sistema extrae los datos automáticamente) o modo Manual (completás todo a mano).',
        title: '🤖 Modo IA vs Manual',
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="section-1"]',
        content: 'Primero seleccioná el tipo de solicitud y buscá al afiliado. Las secciones se auto-avanzan al completarse.',
        title: '1️⃣ Tipo y Afiliado',
        placement: 'bottom',
    },
    {
        target: '[data-tour="section-2"]',
        content: 'Agregá las prácticas solicitadas, los datos del prescriptor y diagnóstico. El semáforo te indica si es auto-aprobable.',
        title: '2️⃣ Prácticas y Prescripción',
        placement: 'bottom',
    },
    {
        target: '[data-tour="section-3"]',
        content: 'Adjuntá documentación, dejá notas y enviá la solicitud. El motor de reglas evalúa automáticamente antes de enviar.',
        title: '3️⃣ Adjuntos y Envío',
        placement: 'top',
    },
];

const REVIEW_STEPS: Step[] = [
    {
        target: '[data-tour="status-tabs"]',
        content: 'Filtrá solicitudes por estado: pendientes, resueltas, apelaciones o anuladas. Los contadores se actualizan en tiempo real.',
        title: '📊 Filtros por estado',
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="expedient-list"]',
        content: 'La lista muestra cada solicitud con su semáforo SLA (verde/amarillo/rojo), tipo, afiliado y prioridad clínica.',
        title: '📋 Lista de solicitudes',
        placement: 'right',
    },
    {
        target: '[data-tour="expedient-detail"]',
        content: 'Al seleccionar una solicitud, se abre la ficha completa con los datos del afiliado, prácticas, adjuntos y comunicación.',
        title: '📄 Ficha del expediente',
        placement: 'left',
    },
];

// ── Feature flag ── 
// Tour deshabilitado temporalmente; los contenidos están desactualizados
// respecto a los cambios en curso. Re-habilitar al final del desarrollo.
const TOURS_ENABLED = false;

type TourId = 'dashboard' | 'creation' | 'review';

const TOURS: Record<TourId, Step[]> = {
    dashboard: DASHBOARD_STEPS,
    creation: CREATION_STEPS,
    review: REVIEW_STEPS,
};

const STORAGE_KEY = 'cpce_completed_tours';

function getCompletedTours(): TourId[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
}

function markTourCompleted(tourId: TourId) {
    const completed = getCompletedTours();
    if (!completed.includes(tourId)) {
        completed.push(tourId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
}

export function resetAllTours() {
    localStorage.removeItem(STORAGE_KEY);
}

// ── Hook ──

export function useOnboarding(tourId: TourId) {
    const { user } = useAuth();
    const [run, setRun] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (!TOURS_ENABLED || !user || hasChecked) return;
        // Small delay to let DOM targets mount
        const timer = setTimeout(() => {
            const completed = getCompletedTours();
            if (!completed.includes(tourId)) {
                setRun(true);
            }
            setHasChecked(true);
        }, 1000);
        return () => clearTimeout(timer);
    }, [user, tourId, hasChecked]);

    const startTour = useCallback(() => setRun(true), []);

    const handleCallback = useCallback((data: CallBackProps) => {
        const { status } = data;
        if (status === 'finished' || status === 'skipped') {
            setRun(false);
            markTourCompleted(tourId);
        }
    }, [tourId]);

    return { run, startTour, handleCallback, steps: TOURS[tourId] };
}

// ── Component ──

export function GuidedTour({ tourId }: { tourId: TourId }) {
    const { run, handleCallback, steps } = useOnboarding(tourId);

    if (!run) return null;

    return (
        <JoyrideComponent
            steps={steps}
            run={run}
            callback={handleCallback}
            continuous
            showProgress
            showSkipButton
            scrollToFirstStep
            disableOverlayClose
            styles={TOUR_STYLES}
            locale={{
                back: 'Anterior',
                close: 'Cerrar',
                last: 'Finalizar',
                next: 'Siguiente',
                open: 'Abrir',
                skip: 'Omitir tour',
            }}
        />
    );
}
