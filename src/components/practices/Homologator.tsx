'use client'

import { useState, useEffect } from 'react'
import { Search, Link2, Trash2, X, Check, AlertCircle, Sparkles, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { homologationService, type HomologationSuggestion } from '@/services/homologationService'
import { practiceTypeService } from '@/services/practiceTypeService'
import { externalNomenclatorService } from '@/services/externalNomenclatorService'
import { useToast } from '@/hooks/use-toast'

interface HomologatorProps {
    nomenclatorId: number
    nomenclatorName: string
}

export default function Homologator({ nomenclatorId, nomenclatorName }: HomologatorProps) {
    const [externalPractices, setExternalPractices] = useState<any[]>([])
    const [selectedExternal, setSelectedExternal] = useState<any | null>(null)
    const [internalSearch, setInternalSearch] = useState('')
    const [internalPractices, setInternalPractices] = useState<any[]>([])
    const [suggestions, setSuggestions] = useState<HomologationSuggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [ratio, setRatio] = useState('1.0')
    const [notes, setNotes] = useState('')
    const [isMapping, setIsMapping] = useState(false)
    const [selectedInternal, setSelectedInternal] = useState<any | null>(null)
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const { toast } = useToast()

    // Cargar prácticas externas sin homologar
    useEffect(() => {
        loadExternalPractices()
    }, [nomenclatorId])

    // Buscar prácticas internas cuando cambia el texto
    useEffect(() => {
        if (internalSearch.length >= 2) {
            searchInternalPractices()
        } else {
            setInternalPractices([])
        }
    }, [internalSearch])

    const loadExternalPractices = async () => {
        try {
            // Cargar prácticas externas no homologadas
            const { data } = await externalNomenclatorService.getPractices(
                nomenclatorId,
                1,
                100,
                '',
                'unmapped'
            )
            setExternalPractices(data)
        } catch (error) {
            console.error('Error loading external practices:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron cargar las prácticas externas'
            })
        }
    }

    const searchInternalPractices = async () => {
        try {
            const results = await practiceTypeService.searchPractices(internalSearch, 10)
            setInternalPractices(results)
        } catch (error) {
            console.error('Error searching practices:', error)
        }
    }

    const loadSuggestions = async (externalPractice: any) => {
        try {
            setShowSuggestions(true)
            const suggestions = await homologationService.suggestHomologations(
                externalPractice.code,
                externalPractice.description || '',
                nomenclatorId,
                10
            )
            setSuggestions(suggestions)
        } catch (error) {
            console.error('Error loading suggestions:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron cargar sugerencias'
            })
        }
    }

    const handleSelectExternal = (practice: any) => {
        setSelectedExternal(practice)
        setInternalSearch('')
        setInternalPractices([])
        setSuggestions([])
        setShowSuggestions(false)
        setRatio('1.0')
        setNotes('')
        setSelectedInternal(null)
        
        // Cargar sugerencias automáticas
        loadSuggestions(practice)
    }

    const handleSelectInternal = (practice: any) => {
        setSelectedInternal(practice)
        setConfirmDialogOpen(true)
    }

    const handleConfirmMapping = async () => {
        if (!selectedExternal || !selectedInternal) return

        setIsMapping(true)
        try {
            await homologationService.createHomologation(
                selectedInternal.id,
                nomenclatorId,
                selectedExternal.code,
                selectedExternal.description,
                parseFloat(ratio),
                notes || undefined
            )

            toast({
                title: 'Homologación creada',
                description: `${selectedExternal.code} → ${selectedInternal.code}`,
                variant: 'default'
            })

            // Actualizar lista
            await loadExternalPractices()
            
            // Resetear selecciones
            setSelectedExternal(null)
            setSelectedInternal(null)
            setInternalSearch('')
            setInternalPractices([])
            setSuggestions([])
            setShowSuggestions(false)
            setConfirmDialogOpen(false)
            setRatio('1.0')
            setNotes('')
        } catch (error: any) {
            console.error('Error creating homologation:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo crear la homologación'
            })
        } finally {
            setIsMapping(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Homologador</h2>
                    <p className="text-sm text-muted-foreground">
                        Vincular prácticas de {nomenclatorName} con nomencladores internos
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">{externalPractices.length}</div>
                    <div className="text-sm text-muted-foreground">Prácticas pendientes</div>
                </div>
            </div>

            {/* Main Layout: Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: External Practices */}
                <Card className="p-6">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg mb-2">Prácticas Externas</h3>
                            <p className="text-sm text-muted-foreground">
                                Selecciona una práctica para homologar
                            </p>
                        </div>

                        {externalPractices.length === 0 ? (
                            <div className="text-center py-12">
                                <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
                                <p className="font-medium">¡Todo homologado!</p>
                                <p className="text-sm text-muted-foreground">
                                    No hay prácticas pendientes de homologación
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {externalPractices.map((practice) => (
                                    <button
                                        key={practice.code}
                                        onClick={() => handleSelectExternal(practice)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                                            selectedExternal?.code === practice.code
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                                : 'border-border hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium">{practice.code}</div>
                                                <div className="text-sm text-muted-foreground truncate">
                                                    {practice.description || 'Sin descripción'}
                                                </div>
                                                {practice.unit_value && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Valor: ${parseFloat(practice.unit_value).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                            {selectedExternal?.code === practice.code && (
                                                <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Right: Internal Search & Suggestions */}
                <Card className="p-6">
                    <div className="space-y-4">
                        {!selectedExternal ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Link2 className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                <p>Selecciona una práctica externa para comenzar</p>
                            </div>
                        ) : (
                            <>
                                {/* Selected External Practice Info */}
                                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-semibold text-blue-900 dark:text-blue-100">
                                                {selectedExternal.code}
                                            </div>
                                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                                {selectedExternal.description || 'Sin descripción'}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedExternal(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Search Internal Practices */}
                                <div className="space-y-2">
                                    <Label>Buscar práctica interna</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por código o nombre..."
                                            value={internalSearch}
                                            onChange={(e) => setInternalSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {/* Suggestions Tab */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-yellow-500" />
                                            <Label className="text-yellow-700 dark:text-yellow-400">
                                                Sugerencias automáticas
                                            </Label>
                                        </div>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {suggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.internal_practice_id}
                                                    onClick={() => handleSelectInternal({
                                                        id: suggestion.internal_practice_id,
                                                        code: suggestion.internal_code,
                                                        name: suggestion.internal_name
                                                    })}
                                                    className="w-full text-left p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <div className="font-medium">{suggestion.internal_code}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {suggestion.internal_name}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="text-xs px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 rounded">
                                                                    {(suggestion.similarity_score * 100).toFixed(0)}% match
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {suggestion.reason}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Link2 className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Search Results */}
                                {internalPractices.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Resultados de búsqueda</Label>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {internalPractices.map((practice) => (
                                                <button
                                                    key={practice.id}
                                                    onClick={() => handleSelectInternal(practice)}
                                                    className="w-full text-left p-3 rounded-lg border border-border hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <div className="font-medium">{practice.code}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {practice.name}
                                                            </div>
                                                        </div>
                                                        <Link2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {internalSearch.length >= 2 && internalPractices.length === 0 && (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-30" />
                                        <p className="text-sm">No se encontraron prácticas internas</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Homologación</DialogTitle>
                        <DialogDescription>
                            Estás a punto de vincular estas dos prácticas:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* External */}
                        <div className="space-y-2">
                            <Label>Práctica Externa</Label>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="font-medium">{selectedExternal?.code}</div>
                                <div className="text-sm text-muted-foreground">
                                    {selectedExternal?.description}
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                            <ChevronRight className="h-6 w-6 rotate-90 text-muted-foreground" />
                        </div>

                        {/* Internal */}
                        <div className="space-y-2">
                            <Label>Práctica Interna</Label>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                    {selectedInternal?.code}
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                    {selectedInternal?.name}
                                </div>
                            </div>
                        </div>

                        {/* Ratio */}
                        <div className="space-y-2">
                            <Label htmlFor="ratio">Ratio de Conversión</Label>
                            <Input
                                id="ratio"
                                type="number"
                                step="0.01"
                                min="0"
                                value={ratio}
                                onChange={(e) => setRatio(e.target.value)}
                                placeholder="1.0"
                            />
                            <p className="text-xs text-muted-foreground">
                                Factor de conversión entre unidades (por defecto 1.0)
                            </p>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (opcional)</Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas adicionales..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialogOpen(false)}
                            disabled={isMapping}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmMapping}
                            disabled={isMapping}
                        >
                            {isMapping ? 'Creando...' : 'Confirmar Homologación'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
