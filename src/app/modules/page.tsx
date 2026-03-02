'use client'

import { ModuleGrid } from '@/components/dashboard/ModuleGrid'
import { LayoutGrid } from 'lucide-react'

export default function ModulesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <LayoutGrid className="h-7 w-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Módulos Disponibles</h1>
                    <p className="text-sm text-muted-foreground">Accede rápidamente a todas las herramientas del sistema</p>
                </div>
            </div>
            <ModuleGrid />
        </div>
    )
}
