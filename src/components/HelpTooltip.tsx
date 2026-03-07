'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

// ── Feature flag ──────────────────────────────────────────────────────────────
// Deshabilitado temporalmente: la implementación actual tiene fondo negro y texto
// extenso que no se adapta bien al diseño vigente.
// Para re-habilitar: cambiar a `true`.
const HELP_TOOLTIP_ENABLED = false;

interface HelpTooltipProps {
    text: string;
    /** Position relative to the icon */
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Size of the help icon in pixels */
    size?: number;
    className?: string;
}

export function HelpTooltip({ text, position = 'top', size = 14, className = '' }: HelpTooltipProps) {
    const [visible, setVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const show = () => {
        clearTimeout(timeoutRef.current);
        setVisible(true);
    };

    const hide = () => {
        timeoutRef.current = setTimeout(() => setVisible(false), 150);
    };

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    // Renderiza solo el ícono (sin popup) mientras el flag está apagado
    if (!HELP_TOOLTIP_ENABLED) return null;

    const positionClasses: Record<string, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses: Record<string, string> = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent',
    };

    return (
        <span
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            <HelpCircle
                size={size}
                className="text-muted-foreground/50 hover:text-blue-500 cursor-help transition-colors"
                tabIndex={0}
                aria-label="Ayuda"
            />
            {visible && (
                <div
                    ref={tooltipRef}
                    role="tooltip"
                    className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
                >
                    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-[220px] whitespace-normal leading-relaxed">
                        {text}
                        <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
                    </div>
                </div>
            )}
        </span>
    );
}
