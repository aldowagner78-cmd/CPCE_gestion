'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, ArrowRight, Link as LinkIcon, Plus, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { externalNomenclatorService, type ExternalNomenclator } from '@/services/externalNomenclatorService'
import { NomenclatorManager } from '@/components/practices/NomenclatorManager'

export default function ExternalNomenclatorsPage() {
    const [nomenclators, setNomenclators] = useState<ExternalNomenclator[]>([])
    const [stats, setStats] = useState<Record<number, { total: number; mapped: number; unmapped: number }>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedNomenclator, setSelectedNomenclator] = useState<ExternalNomenclator | null>(null)
    const [managerOpen, setManagerOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

    useEffect(() => {
        loadNomenclators()
    }, [])

    const loadNomenclators = async () => {
        try {
            setLoading(true)
            const data = await externalNomenclatorService.getNomenclators() as ExternalNomenclator[]
            setNomenclators(data)
            
            // Cargar estadísticas para cada nomenclador
            const statsData: Record<number, any> = {}
            for (const nom of data) {
                try {
                    statsData[nom.id] = await externalNomenclatorService.getNomenclatorStats(nom.id)
                } catch {
                    statsData[nom.id] = { total: 0, mapped: 0, unmapped: 0 }
                }
            }
            setStats(statsData)
        } catch (err) {
            console.error(err)
            setError('Error al cargar nomencladores')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setSelectedNomenclator(null)
        setManagerOpen(true)
    }

    const handleEdit = (nomenclator: ExternalNomenclator) => {
        setSelectedNomenclator(nomenclator)
        setManagerOpen(true)
    }

    const handleDelete = async (id: number) => {
        try {
            await externalNomenclatorService.deleteNomenclator(id)
            setError(null)
            loadNomenclators()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setDeleteConfirm(null)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nomencladores Externos</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestiona nomencladores de obras sociales, instituciones y otros sistemas
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Nomenclador
                </Button>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {nomenclators.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay nomencladores</h3>
                        <p className="text-muted-foreground text-center max-w-sm mb-4">
                            Crea tu primer nomenclador externo para comenzar a gestionar prácticas de otras instituciones.
                        </p>
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Nomenclador
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {nomenclators.map((nom) => {
                        const nomStats = stats[nom.id] || { total: 0, mapped: 0, unmapped: 0 }
                        return (
                            <Card key={nom.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-lg font-bold">
                                            {nom.code}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            {nom.is_active ? (
                                                <Badge className="bg-green-100 text-green-800">Activo</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactivo</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <CardTitle className="mt-4">{nom.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 min-h-[40px]">
                                        {nom.description || 'Sin descripción'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Prácticas totales:</span>
                                            <span className="font-semibold">{nomStats.total}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Homologadas:</span>
                                            <span className="font-semibold text-green-600">{nomStats.mapped}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Sin homologar:</span>
                                            <span className="font-semibold text-amber-600">{nomStats.unmapped}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-muted/50 p-4 flex gap-2">
                                    <Link href={`/practices/external/${nom.id}`} className="flex-1">
                                        <Button className="w-full group">
                                            Gestionar
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleEdit(nom)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    {deleteConfirm === nom.id ? (
                                        <Button
                                            variant="danger"
                                            size="icon"
                                            onClick={() => handleDelete(nom.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setDeleteConfirm(nom.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}

            <NomenclatorManager
                nomenclator={selectedNomenclator}
                open={managerOpen}
                onOpenChange={setManagerOpen}
                onSuccess={loadNomenclators}
            />
        </div>
    )
}
