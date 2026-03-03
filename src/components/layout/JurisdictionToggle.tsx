"use client"

import { useJurisdiction, CAMERA_I, CAMERA_II } from '@/lib/jurisdictionContext'
import { cn } from '@/lib/utils'

export function JurisdictionToggle() {
    const { activeJurisdiction, setJurisdiction, isLoading } = useJurisdiction()

    return (
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/50">
            <button
                onClick={() => setJurisdiction(CAMERA_I)}
                disabled={isLoading}
                className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                    activeJurisdiction?.id === CAMERA_I.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10"
                )}
            >
                Cámara I
            </button>
            <button
                onClick={() => setJurisdiction(CAMERA_II)}
                disabled={isLoading}
                className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                    activeJurisdiction?.id === CAMERA_II.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10"
                )}
            >
                Cámara II
            </button>
        </div>
    )
}
