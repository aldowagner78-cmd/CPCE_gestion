'use client'

import { useState, useEffect } from 'react'
import { useJurisdiction } from '@/lib/jurisdictionContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search, Plus, Edit2, Trash2, FileText } from 'lucide-react'
import { practiceTypeService, type PracticeType, type Practice, type PracticeTypeStats } from '@/services/practiceTypeService'
import { PracticeEditor } from '@/components/practices/PracticeEditor'

export default function PracticesPage() {
    const { activeJurisdiction } = useJurisdiction()
    const [loading, setLoading] = useState(true)
    const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([])
    const [stats, setStats] = useState<PracticeTypeStats[]>([])
    const [activeTab, setActiveTab] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Estado para cada tipo
    const [practicesByType, setPracticesByType] = useState<Record<number, Practice[]>>({})
    const [loadingType, setLoadingType] = useState<Record<number, boolean>>({})
    const [searchByType, setSearchByType] = useState<Record<number, string>>({})
    const [pageByType, setPageByType] = useState<Record<number, number>>({})
    const [totalByType, setTotalByType] = useState<Record<number, number>>({})

    // Editor
    const [editorOpen, setEditorOpen] = useState(false)
    const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null)
    const [selectedType, setSelectedType] = useState<PracticeType | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

    useEffect(() => {
        loadPracticeTypes()
    }, [activeJurisdiction])

    useEffect(() => {
        if (activeTab && practiceTypes.length > 0) {
            const typeId = parseInt(activeTab)
            if (!practicesByType[typeId]) {
                loadPractices(typeId)
            }
        }
    }, [activeTab, practiceTypes])

    const loadPracticeTypes = async () => {
        try {
            setLoading(true)
            const types = await practiceTypeService.getPracticeTypes()
            setPracticeTypes(types)
            
            if (types.length > 0 && !activeTab) {
                setActiveTab(types[0].id.toString())
            }

            // Cargar estadísticas
            if (activeJurisdiction) {
                const statsData = await practiceTypeService.getPracticeTypeStats(activeJurisdiction.id)
                setStats(statsData)
            }
        } catch (err) {
            console.error(err)
            setError('Error al cargar tipos de nomencladores')
        } finally {
            setLoading(false)
        }
    }

    const loadPractices = async (typeId: number, page = 1) => {
        try {
            setLoadingType({ ...loadingType, [typeId]: true })
            const search = searchByType[typeId] || ''
            
            const { data, count } = await practiceTypeService.getPracticesByType(
                typeId,
                page,
                50,
                search,
                activeJurisdiction?.id
            )

            setPracticesByType({ ...practicesByType, [typeId]: data })
            setTotalByType({ ...totalByType, [typeId]: count })
            setPageByType({ ...pageByType, [typeId]: page })
        } catch (err) {
            console.error(err)
            setError('Error al cargar prácticas')
        } finally {
            setLoadingType({ ...loadingType, [typeId]: false })
        }
    }

    const handleSearch = (typeId: number, search: string) => {
        setSearchByType({ ...searchByType, [typeId]: search })
        // Debounce y recargar
        setTimeout(() => loadPractices(typeId, 1), 300)
    }

    const handleCreate = (type: PracticeType) => {
        setSelectedType(type)
        setSelectedPractice(null)
        setEditorOpen(true)
    }

    const handleEdit = (practice: Practice, type: PracticeType) => {
        setSelectedType(type)
        setSelectedPractice(practice)
        setEditorOpen(true)
    }

    const handleDelete = async (id: number, typeId: number) => {
        try {
            await practiceTypeService.deletePractice(id)
            loadPractices(typeId)
            loadPracticeTypes() // Reload stats
        } catch (err) {
            console.error(err)
            setError('Error al eliminar práctica')
        } finally {
            setDeleteConfirm(null)
        }
    }

    if (!activeJurisdiction) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!activeJurisdiction) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nomencladores Internos</h1>
                <p className="text-muted-foreground mt-1">
                    Gestión de prácticas por tipo • {activeJurisdiction.name}
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                {practiceTypes.map((type) => {
                    const typeStat = stats.find(s => s.type_id === type.id)
                    return (
                        <Card key={type.id}>
                            <CardHeader className="pb-3">
                                <CardDescription>{type.name}</CardDescription>
                                <CardTitle className="text-3xl">
                                    {typeStat?.total_practices || 0}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">
                                    {typeStat?.active_practices || 0} activas
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Tabs por tipo */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                    {practiceTypes.map((type) => (
                        <TabsTrigger key={type.id} value={type.id.toString()}>
                            {type.name}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {practiceTypes.map((type) => {
                    const typeId = type.id
                    const practices = practicesByType[typeId] || []
                    const isLoading = loadingType[typeId]
                    const search = searchByType[typeId] || ''
                    const page = pageByType[typeId] || 1
                    const total = totalByType[typeId] || 0
                    const totalPages = Math.ceil(total / 50)

                    return (
                        <TabsContent key={typeId} value={typeId.toString()} className="space-y-4">
                            {/* Filtros y acciones */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{type.name}</CardTitle>
                                            <CardDescription>
                                                {type.description || `Nomenclador de ${type.name.toLowerCase()}`}
                                                {type.unit_name && ` • Unidad: ${type.unit_name}`}
                                            </CardDescription>
                                        </div>
                                        <Button onClick={() => handleCreate(type)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Nueva Práctica
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por código o nombre..."
                                            value={search}
                                            onChange={(e) => handleSearch(typeId, e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Listado */}
                            <Card>
                                <CardContent className="p-0">
                                    {isLoading ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        </div>
                                    ) : practices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No hay prácticas</h3>
                                            <p className="text-muted-foreground max-w-sm mb-4">
                                                {search ? 'No se encontraron prácticas con ese criterio.' : 'Agrega tu primera práctica a este nomenclador.'}
                                            </p>
                                            <Button onClick={() => handleCreate(type)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Crear Práctica
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50 border-b">
                                                        <tr>
                                                            <th className="text-left p-3 font-semibold">Código</th>
                                                            <th className="text-left p-3 font-semibold">Nombre</th>
                                                            <th className="text-left p-3 font-semibold">Categoría</th>
                                                            <th className="text-right p-3 font-semibold">Unidades</th>
                                                            <th className="text-right p-3 font-semibold">Valor</th>
                                                            <th className="text-center p-3 font-semibold">Estado</th>
                                                            <th className="text-right p-3 font-semibold">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {practices.map((practice) => (
                                                            <tr key={practice.id} className="border-b hover:bg-muted/30">
                                                                <td className="p-3 font-mono font-semibold">{practice.code}</td>
                                                                <td className="p-3">{practice.name}</td>
                                                                <td className="p-3">
                                                                    {practice.category && (
                                                                        <Badge variant="secondary">{practice.category}</Badge>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right font-mono">
                                                                    {practice.unit_quantity > 0 ? practice.unit_quantity : '-'}
                                                                </td>
                                                                <td className="p-3 text-right font-mono font-semibold">
                                                                    ${practice.financial_value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {practice.is_active ? (
                                                                        <Badge className="bg-green-100 text-green-800">Activa</Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary">Inactiva</Badge>
                                                                    )}
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            onClick={() => handleEdit(practice, type)}
                                                                        >
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </Button>
                                                                        {deleteConfirm === practice.id ? (
                                                                            <Button
                                                                                variant="danger"
                                                                                size="icon"
                                                                                onClick={() => handleDelete(practice.id, typeId)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                onClick={() => setDeleteConfirm(practice.id)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Paginación */}
                                            {totalPages > 1 && (
                                                <div className="flex items-center justify-between p-4">
                                                    <p className="text-sm text-muted-foreground">
                                                        Página {page} de {totalPages} ({total} registros)
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => loadPractices(typeId, page - 1)}
                                                            disabled={page === 1}
                                                        >
                                                            Anterior
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => loadPractices(typeId, page + 1)}
                                                            disabled={page === totalPages}
                                                        >
                                                            Siguiente
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )
                })}
            </Tabs>

            {/* Editor Modal */}
            {selectedType && (
                <PracticeEditor
                    practice={selectedPractice}
                    practiceType={selectedType}
                    open={editorOpen}
                    onOpenChange={setEditorOpen}
                    onSuccess={() => {
                        loadPractices(selectedType.id)
                        loadPracticeTypes() // Reload stats
                    }}
                />
            )}
        </div>
    )
}
