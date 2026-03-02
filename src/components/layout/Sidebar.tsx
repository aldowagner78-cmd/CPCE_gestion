'use client';

import {
    Calculator,
    FileText,
    Settings,
    ShieldCheck,
    Users,
    Bell,
    Database,
    Calendar,
    Menu,
    X,
    CreditCard,
    Target,
    LogOut,
    Home,
    FileCheck,
    BookOpen,
    Shield,
    HelpCircle,
    Search,
    LayoutGrid,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { useActiveAlerts } from '@/lib/useAlerts';
import { Permission, ROLE_LABELS } from '@/types/auth';
import Image from 'next/image';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    href: string;
    permission?: Permission;
    useDynamicBadge?: boolean;
}

// Items principales (siempre visibles)
const mainItems: MenuItem[] = [
    { icon: Home, label: 'Inicio', href: '/' },
    { icon: Calculator, label: 'Calculadora', href: '/calculator', permission: 'calculator.use' },
    { icon: FileText, label: 'Auditorías', href: '/audits', permission: 'audits.view' },
    { icon: FileCheck, label: 'Pendientes', href: '/pending', permission: 'pending.view' },
    { icon: Users, label: 'Pacientes', href: '/patients', permission: 'patients.view' },
    { icon: Bell, label: 'Alertas', href: '/alerts', permission: 'alerts.view', useDynamicBadge: true },
    { icon: Calendar, label: 'Agenda', href: '/agenda', permission: 'agenda.view' },
    { icon: LayoutGrid, label: 'Módulos', href: '/modules' },
];

// Items secundarios (colapsables bajo "Más herramientas")
const moreItems: MenuItem[] = [
    { icon: Target, label: 'Homologador', href: '/matcher', permission: 'matcher.use' },
    { icon: BookOpen, label: 'Nomencladores', href: '/practices', permission: 'nomenclators.view' },
    { icon: Shield, label: 'Protocolos', href: '/protocols', permission: 'protocols.view' },
    { icon: HelpCircle, label: 'Ayuda', href: '/help' },
];

// Items de administración
const adminItems: MenuItem[] = [
    { icon: FileText, label: 'Nomencladores Ext.', href: '/practices/external', permission: 'nomenclators.manage' },
    { icon: Users, label: 'Usuarios', href: '/users', permission: 'users.manage' },
    { icon: CreditCard, label: 'Valores', href: '/settings/values', permission: 'config.values' },
    { icon: Database, label: 'Backup', href: '/backup', permission: 'backup.export' },
    { icon: Settings, label: 'Configuración', href: '/settings', permission: 'config.view' },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const { user, signOut, hasPermission, loading } = useAuth();
    const { activeJurisdiction, isDarkMode } = useJurisdiction();
    const activeAlerts = useActiveAlerts(activeJurisdiction?.id);

    // Colores dinámicos según jurisdicción
    const sidebarColors = {
        camera1Light: 'bg-gradient-to-b from-blue-50 to-blue-100',
        camera1Dark: 'bg-gradient-to-b from-slate-900 to-blue-950',
        camera2Light: 'bg-gradient-to-b from-emerald-50 to-emerald-100',
        camera2Dark: 'bg-gradient-to-b from-slate-900 to-emerald-950',
    };

    const getSidebarBg = () => {
        if (activeJurisdiction?.id === 1) {
            return isDarkMode ? sidebarColors.camera1Dark : sidebarColors.camera1Light;
        }
        return isDarkMode ? sidebarColors.camera2Dark : sidebarColors.camera2Light;
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 border-r shadow-sm transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
                getSidebarBg(),
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header del Sidebar con Branding Oficial — Logo clickable como Home */}
                <div className="p-6 pb-2">
                    <Link href="/" className="flex flex-col items-center text-center group">
                        <div className="relative w-16 h-16 bg-white rounded-xl shadow-md p-2 flex items-center justify-center mb-3 group-hover:shadow-lg transition-shadow">
                            <Image
                                src="/logo.png"
                                alt="CPCE Logo"
                                width={60}
                                height={60}
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                            CPCE Salud
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">
                            Gestión Integral
                        </p>
                    </Link>
                </div>

                <div className="px-6 py-2">
                    <div className="h-px bg-border w-full" />
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {/* Buscador como primer item */}
                    <Link
                        href="/buscador"
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group",
                            pathname === '/buscador'
                                ? "bg-primary/20 text-primary shadow-sm"
                                : "text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-foreground"
                        )}
                    >
                        <Search size={20} className={cn(
                            pathname === '/buscador' ? "text-primary" : "text-slate-600 dark:text-slate-400 group-hover:text-foreground"
                        )} />
                        <span className="flex-1">Buscador</span>
                    </Link>

                    <div className="my-2 border-t border-border mx-4" />

                    {/* Items principales */}
                    {mainItems.map((item) => {
                        if (item.permission && !hasPermission(item.permission)) return null;

                        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                        const badgeCount = item.useDynamicBadge ? activeAlerts.length : 0;
                        
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group",
                                    isActive
                                        ? "bg-primary/20 text-primary shadow-sm"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-foreground"
                                )}
                            >
                                <item.icon size={20} className={cn(
                                    isActive ? "text-primary" : "text-slate-600 dark:text-slate-400 group-hover:text-foreground"
                                )} />
                                <span className="flex-1">{item.label}</span>
                                {item.useDynamicBadge && badgeCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200 rounded-full">
                                        {badgeCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Más herramientas (colapsable) */}
                    {moreItems.some((item) => !item.permission || hasPermission(item.permission)) && (
                        <>
                            <button
                                onClick={() => setMoreOpen(!moreOpen)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 w-full text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10 hover:text-foreground"
                            >
                                {moreOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <span className="text-xs font-bold uppercase tracking-widest">Más herramientas</span>
                            </button>

                            {moreOpen && moreItems.map((item) => {
                                if (item.permission && !hasPermission(item.permission)) return null;
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ml-2",
                                            isActive
                                                ? "bg-primary/20 text-primary shadow-sm"
                                                : "text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon size={18} className={cn(
                                            isActive ? "text-primary" : "text-slate-600 dark:text-slate-400 group-hover:text-foreground"
                                        )} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </>
                    )}

                    {!loading && (
                        <>
                            {/* Solo mostrar sección admin si hay al menos un item visible */}
                            {adminItems.some((item) => !item.permission || hasPermission(item.permission)) && (
                                <>
                                    <div className="my-4 border-t border-border mx-4" />
                                    <div className="px-4 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        Administración
                                    </div>
                                </>
                            )}

                            {adminItems.map((item) => {
                                if (item.permission && !hasPermission(item.permission)) return null;

                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group",
                                            isActive
                                                ? "bg-primary/10 text-primary border-l-2 border-primary pl-[14px]"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground pl-4"
                                        )}
                                    >
                                        <item.icon size={20} className={cn(
                                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                        )} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20">
                            {user?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-foreground" title={user?.full_name || 'Usuario'}>
                                {user?.full_name || 'Usuario'}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                                {ROLE_LABELS[user?.role || 'auditor'] || user?.role || 'Invitado'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:text-red-400 rounded-md transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                    >
                        <LogOut size={16} />
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
