'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { externalNomenclatorService, type ExternalNomenclator } from '@/services/externalNomenclatorService'

interface NomenclatorManagerProps {
    nomenclator?: ExternalNomenclator | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function NomenclatorManager({ nomenclator, open, onOpenChange, onSuccess }: NomenclatorManagerProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        code: nomenclator?.code || '',
        name: nomenclator?.name || '',
        description: nomenclator?.description || '',
        is_active: nomenclator?.is_active ?? true
    })

    const resetForm = () => {
        setFormData({
            code: nomenclator?.code || '',
            name: nomenclator?.name || '',
            description: nomenclator?.description || '',
            is_active: nomenclator?.is_active ?? true
        })
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validaciones
        if (!formData.code.trim() || !formData.name.trim()) {
            setError('El código y nombre son obligatorios')
            return
        }

        if (formData.code.length > 20) {
            setError('El código no puede superar los 20 caracteres')
            return
        }

        setLoading(true)
        setError(null)

        try {
            if (nomenclator?.id) {
                // Actualizar
                await externalNomenclatorService.updateNomenclator(nomenclator.id, formData)
            } else {
                // Crear
                await externalNomenclatorService.createNomenclator(formData)
            }
            
            onSuccess()
            onOpenChange(false)
            resetForm()
        } catch (err) {
            console.error(err)
            const error = err as Error
            setError(error.message || 'Error al guardar el nomenclador')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            onOpenChange(newOpen)
            if (!newOpen) resetForm()
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            {nomenclator ? 'Editar Nomenclador' : 'Nuevo Nomenclador'}
                        </DialogTitle>
                        <DialogDescription>
                            {nomenclator 
                                ? 'Modifica los datos del nomenclador externo.'
                                : 'Crea un nuevo nomenclador externo para gestionar prácticas de otras instituciones.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="code">Código *</Label>
                            <Input
                                id="code"
                                placeholder="Ej: PAMI, OSDE, SWISS"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                maxLength={20}
                                disabled={!!nomenclator} // No se puede editar el código
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Código único del nomenclador (máx. 20 caracteres)
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                placeholder="Ej: Nomenclador PAMI"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                placeholder="Descripción del nomenclador, fuente, etc."
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="is_active" className="cursor-pointer">
                                Nomenclador activo
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {nomenclator ? 'Guardar Cambios' : 'Crear Nomenclador'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
