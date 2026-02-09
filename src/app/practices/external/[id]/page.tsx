'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search, ArrowLeft, Filter, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { externalNomenclatorService, type ExternalPractice, type ExternalNomenclator } from '@/services/externalNomenclatorService'
import { CsvImporter } from '@/components/practices/CsvImporter'
import { PracticeMapper } from '@/components/practices/PracticeMapper'

export default function ExternalNomenclatorDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = parseInt(params.id as string)

    const [nomenclator, setNomenclator] = useState<ExternalNomenclator | null>(null)
    const [practices, setPractices] = useState<ExternalPractice[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingPractices, setLoadingPractices] = useState(false)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [search, setSearch] = useState('')
    const [mappingFilter, setMappingFilter] = useState<'all' | 'mapped' | 'unmapped'>('all')

    useEffect(() => {
        loadData()
    }, [id])

    useEffect(() => {
        if (nomenclator) {
            loadPractices()
        }
    }, [page, search, mappingFilter, nomenclator])

    const loadData = async () => {
        try {
            const noms = await externalNomenclatorService.getNomenclators()
            const found = noms.find(n => n.id === id)
            if (found) {
                setNomenclator(found)
            } else {
                router.push('/practices/external')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const loadPractices = async () => {
        setLoadingPractices(true)
        try {
            const { data, count } = await externalNomenclatorService.getPractices(id, page, 20, search, mappingFilter)
            setPractices(data)
            setTotalCount(count || 0)
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingPractices(false)
        }
    }

    const handleMap = async (externalId: string, internalId: number | null) => {
        await externalNomenclatorService.mapPractice(externalId, internalId)
        loadPractices() // Reload to update UI
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!nomenclator) return null

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <Link href="/practices/external" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Volver a Nomencladores
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{nomenclator.name}</h1>
                        <p className="text-muted-foreground mt-1">{nomenclator.description}</p>
                    </div>
                    <Badge variant="outline" className="text-lg">{nomenclator.code}</Badge>
                </div>
            </div>

            <Tabs defaultValue="practices" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="practices">Prácticas</TabsTrigger>
                    <TabsTrigger value="import">Importar CSV</TabsTrigger>
                </TabsList>

                <TabsContent value="practices" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por código o descripción..."
                                        className="pl-8"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <select
                                        className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={mappingFilter}
                                        onChange={(e) => setMappingFilter(e.target.value as any)}
                                    >
                                        <option value="all">Todos</option>
                                        <option value="unmapped">Sin Homologar</option>
                                        <option value="mapped">Homologados</option>
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Código</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="w-[100px]">Valor</TableHead>
                                            <TableHead className="w-[200px]">Homologación</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingPractices ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                                </TableCell>
                                            </TableRow>
                                        ) : practices.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    No se encontraron prácticas.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            practices.map((practice) => (
                                                <TableRow key={practice.id}>
                                                    <TableCell className="font-medium">{practice.code}</TableCell>
                                                    <TableCell>{practice.description}</TableCell>
                                                    <TableCell>
                                                        {practice.value ? `$${practice.value}` : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {practice.internal_practice ? (
                                                            <div className="flex flex-col text-sm">
                                                                <span className="font-medium text-green-700">
                                                                    {practice.internal_practice.code}
                                                                </span>
                                                                <span className="text-muted-foreground truncate w-[180px]" title={practice.internal_practice.name}>
                                                                    {practice.internal_practice.name}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm italic">Sin vincular</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <PracticeMapper
                                                            externalPracticeId={practice.id}
                                                            currentInternalId={practice.internal_practice_id}
                                                            onMap={(internalId) => handleMap(practice.id, internalId)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loadingPractices}
                                >
                                    Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Página {page}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={practices.length < 20 || loadingPractices}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import">
                    <div className="max-w-2xl mx-auto mt-8">
                        <CsvImporter
                            nomenclatorId={id}
                            onImportComplete={() => {
                                // Switch tab back to practices? or just reload
                                loadPractices()
                            }}
                        />

                        <div className="mt-8 p-4 bg-muted rounded-lg">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Instrucciones CSV
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                El archivo CSV debe tener encabezados en la primera fila. Las columnas requeridas son:
                            </p>
                            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                                <li><code>code</code> o <code>codigo</code> (Obligatorio)</li>
                                <li><code>description</code> o <code>descripcion</code> (Opcional)</li>
                                <li><code>value</code> o <code>valor</code> (Opcional, numérico)</li>
                                <li><code>unit</code> o <code>unidad</code> (Opcional)</li>
                            </ul>
                            <div className="mt-4 p-2 bg-slate-900 text-slate-50 text-xs rounded font-mono">
                                code,description,value<br />
                                42.01.01,Consulta Médica,150.00<br />
                                42.01.02,Consulta Guardia,200.00
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
