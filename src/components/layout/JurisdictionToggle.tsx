"use client"

import { useJurisdiction, CAMERA_I, CAMERA_II } from '@/lib/jurisdictionContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function JurisdictionToggle() {
    const { activeJurisdiction, setJurisdiction, isLoading } = useJurisdiction()

    return (
        <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
            <Button
                variant={activeJurisdiction?.id === CAMERA_I.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setJurisdiction(CAMERA_I)}
                className={cn(
                    "transition-all duration-300",
                    activeJurisdiction?.id === CAMERA_I.id ? "bg-blue-600 hover:bg-blue-700" : "text-muted-foreground"
                )}
                disabled={isLoading}
            >
                Cámara I (Santa Fe)
            </Button>
            <Button
                variant={activeJurisdiction?.id === CAMERA_II.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setJurisdiction(CAMERA_II)}
                className={cn(
                    "transition-all duration-300",
                    activeJurisdiction?.id === CAMERA_II.id ? "bg-emerald-600 hover:bg-emerald-700" : "text-muted-foreground"
                )}
                disabled={isLoading}
            >
                Cámara II (Rosario)
            </Button>
        </div>
    )
}
