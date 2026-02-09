'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { practiceTypeService, type Practice, type PracticeType } from '@/services/practiceTypeService'
import { useJurisdiction } from '@/lib/jurisdictionContext'

interface PracticeEditorProps {
    practice?: Practice | null
    practiceType: PracticeType
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function PracticeEditor({ practice, practiceType, open, onOpenChange, onSuccess }: PracticeEditorProps) {
    const { activeJurisdiction } = useJurisdiction()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        code: practice?.code || '',
        name: practice?.name || '',
        description: practice?.description || '',
        category: practice?.category || '',
        unit_quantity: practice?.unit_quantity || 0,
        financial_value: practice?.financial_value || 0,
        is_active: practice?.is_active ?? true
    })

    useEffect(() => {
        if (practice) {
            setFormData({
                code: practice.code,
                name: practice.name,
                description: practice.description || '',
                category: practice.category || '',
                unit_quantity: practice.unit_quantity,
                financial_value: practice.financial_value,
                is_active: practice.is_active
            })
        }
    }, [practice])

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            category: '',
            unit_quantity: 0,
            financial_value: 0,
            is_active: true
        })
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.code.trim() || !formData.name.trim()) {
            setError('Código y nombre son obligatorios')
            return
        }

        if (!activeJurisdiction) {
            setError('No hay jurisdicción activa')
            return
        }

        setLoading(true)
        setError(null)

        try {
            if (practice?.id) {
                await practiceTypeService.updatePractice(practice.id, formData)
            } else {
                await practiceTypeService.createPractice({
                    ...formData,
                    practice_type_id: practiceType.id,
                    jurisdiction_id: activeJurisdiction.id
                })
            }
            
            onSuccess()
            onOpenChange(false)
            resetForm()
        } catch (err) {
            console.error(err)
            const error = err as Error
            setError(error.message || 'Error al guardar la práctica')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            onOpenChange(newOpen)
            if (!newOpen) resetForm()
        }}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            {practice ? 'Editar Práctica' : `Nueva Práctica - ${practiceType.name}`}
                        </DialogTitle>
                        <DialogDescription>
                            {practice 
                                ? 'Modifica los datos de la práctica.'
                                : `Agrega una nueva práctica al nomenclador ${practiceType.name}.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="code">Código *</Label>
                                <Input
                                    id="code"
                                    placeholder="Ej: 420101"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Input
                                    id="category"
                                    placeholder="Ej: Consultas"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                placeholder="Ej: Consulta médica general"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                placeholder="Descripción detallada de la práctica"
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="unit_quantity">
                                    Cantidad de Unidades {practiceType.unit_name && `(${practiceType.unit_name})`}
                                </Label>
                                <Input
                                    id="unit_quantity"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.unit_quantity}
                                    onChange={(e) => setFormData({ ...formData, unit_quantity: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="financial_value">Valor Monetario ($)</Label>
                                <Input
                                    id="financial_value"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.financial_value}
                                    onChange={(e) => setFormData({ ...formData, financial_value: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
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
                                Práctica activa
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
                            {practice ? 'Guardar Cambios' : 'Crear Práctica'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
