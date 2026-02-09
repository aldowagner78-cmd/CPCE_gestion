'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, ArrowRight, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { externalNomenclatorService, type ExternalNomenclator } from '@/services/externalNomenclatorService'

export default function ExternalNomenclatorsPage() {
    const [nomenclators, setNomenclators] = useState<ExternalNomenclator[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadNomenclators()
    }, [])

    const loadNomenclators = async () => {
        try {
            setLoading(true)
            const data = await externalNomenclatorService.getNomenclators() as ExternalNomenclator[]
            setNomenclators(data)
        } catch (err) {
            console.error(err)
            setError('Error al cargar nomencladores')
        } finally {
            setLoading(false)
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
            <h1 className="text-3xl font-bold tracking-tight mb-8">Nomencladores Externos</h1>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {nomenclators.map((nom) => (
                    <Card key={nom.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-lg font-bold">
                                    {nom.code}
                                </Badge>
                                {nom.is_active ? (
                                    <Badge className="bg-green-100 text-green-800">Activo</Badge>
                                ) : (
                                    <Badge variant="secondary">Inactivo</Badge>
                                )}
                            </div>
                            <CardTitle className="mt-4">{nom.name}</CardTitle>
                            <CardDescription className="line-clamp-2 min-h-[40px]">
                                {nom.description || 'Sin descripción'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    <span>Prácticas</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <LinkIcon className="h-4 w-4" />
                                    <span>Homologaciones</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/50 p-4">
                            <Link href={`/practices/external/${nom.id}`} className="w-full">
                                <Button className="w-full group">
                                    Gestionar
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
