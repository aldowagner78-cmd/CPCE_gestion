'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const { activeJurisdiction, isDarkMode } = useJurisdiction();

    // Rutas públicas que no requieren layout de dashboard
    const isPublicPage = pathname?.startsWith('/login');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Protección de rutas: Si no es pública y no hay usuario, redirigir
    useEffect(() => {
        if (!loading && !user && !isPublicPage) {
            router.push('/login');
        }
    }, [user, loading, isPublicPage, router]);

    // Fondos dinámicos según jurisdicción
    const mainBgColors = {
        camera1Light: 'bg-blue-50/50',
        camera1Dark: 'bg-slate-900',
        camera2Light: 'bg-emerald-50/50',
        camera2Dark: 'bg-slate-900',
    };

    const getMainBg = () => {
        if (activeJurisdiction?.id === 1) {
            return isDarkMode ? mainBgColors.camera1Dark : mainBgColors.camera1Light;
        }
        return isDarkMode ? mainBgColors.camera2Dark : mainBgColors.camera2Light;
    };

    // Evitar hidratación incorrecta
    if (!isMounted) return null;

    // Si es página pública, renderizar solo contenido (sin layout)
    if (isPublicPage) {
        return <>{children}</>;
    }

    // Estado de carga
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Si no hay usuario y no es pública, retornar null mientras redirige
    if (!user && !isPublicPage) return null;

    // Layout principal
    return (
        <div className={cn("flex min-h-screen", getMainBg())}>
            {/* Sidebar global */}
            <div className="hidden md:block w-64 fixed inset-y-0 z-50">
                <Sidebar />
            </div>

            {/* Mobile Sidebar (Sidebar handles its own visibility/toggle internally) */}
            <div className="md:hidden">
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300 w-full min-h-screen">
                {/* Header global */}
                <Header />

                <main className="flex-1 p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
