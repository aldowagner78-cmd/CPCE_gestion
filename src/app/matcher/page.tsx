'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Link2, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { externalNomenclatorService } from '@/services/externalNomenclatorService'
import { homologationService } from '@/services/homologationService'

interface NomenclatorWithStats {
    id: number
    code: string
    name: string
    description: string
    total_external: number
    homologated: number
    pending: number
    percentage: number
}

export default function MatcherPage() {
    const router = useRouter()
    const [nomenclators, setNomenclators] = useState<NomenclatorWithStats[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadNomenclators()
    }, [])

    const loadNomenclators = async () => {
        try {
            const noms = await externalNomenclatorService.getNomenclators()
            
            // Cargar estadísticas para cada nomenclador
            const withStats = await Promise.all(
                noms.map(async (nom) => {
                    const stats = await homologationService.getHomologationStats(nom.id)
                    return {
                        ...nom,
                        total_external: stats.total_external,
                        homologated: stats.homologated,
                        pending: stats.pending,
                        percentage: stats.total_external > 0 
                            ? Math.round((stats.homologated / stats.total_external) * 100) 
                            : 0
                    }
                })
            )
            
            setNomenclators(withStats)
        } catch (error) {
            console.error('Error loading nomenclators:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleHomologate = (nomenclatorId: number) => {
        router.push(`/practices/external/${nomenclatorId}/homologate`)
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Homologador</h1>
                <p className="text-muted-foreground">
                    Vincula prácticas externas con nomencladores internos. Selecciona un nomenclador para comenzar.
                </p>
            </div>

            {nomenclators.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">No hay nomencladores externos</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Primero debes crear nomencladores externos e importar sus prácticas
                        </p>
                        <Button onClick={() => router.push('/practices/external')}>
                            Ir a Nomencladores Externos
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {nomenclators.map((nom) => (
                        <Card key={nom.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg mb-1">{nom.name}</CardTitle>
                                        <Badge variant="outline">{nom.code}</Badge>
                                    </div>
                                    {nom.percentage === 100 && (
                                        <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 ml-2" />
                                    )}
                                </div>
                                {nom.description && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {nom.description}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Progreso</span>
                                        <span className="font-semibold">{nom.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                nom.percentage === 100
                                                    ? 'bg-green-500'
                                                    : nom.percentage > 50
                                                    ? 'bg-blue-500'
                                                    : 'bg-yellow-500'
                                            }`}
                                            style={{ width: `${nom.percentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="space-y-1">
                                        <div className="text-2xl font-bold">{nom.total_external}</div>
                                        <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-2xl font-bold text-green-600">
                                            {nom.homologated}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Homologadas</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {nom.pending}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Pendientes</div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <Button
                                    onClick={() => handleHomologate(nom.id)}
                                    className="w-full"
                                    disabled={nom.total_external === 0}
                                >
                                    {nom.total_external === 0 ? (
                                        'Sin prácticas'
                                    ) : nom.pending === 0 ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Ver Homologaciones
                                        </>
                                    ) : (
                                        <>
                                            <Link2 className="h-4 w-4 mr-2" />
                                            Homologar ({nom.pending} pendientes)
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
