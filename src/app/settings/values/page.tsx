'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, History, TrendingUp, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { valuesService, type UnitValues } from '@/services/valuesService'
import { Badge } from '@/components/ui/badge'

export default function ValuesPage() {
    const { hasPermission } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

    // Estado para valores actuales
    const [santaFeValues, setSantaFeValues] = useState<UnitValues | null>(null)
    const [rosarioValues, setRosarioValues] = useState<UnitValues | null>(null)

    // Estado para formulario
    const [formValues, setFormValues] = useState({
        santaFe: { medical: '', biochemical: '', dental: '' },
        rosario: { medical: '', biochemical: '', dental: '' }
    })

    useEffect(() => {
        loadValues()
    }, [])

    const loadValues = async () => {
        try {
            setLoading(true)
            const [sf, ros] = await Promise.all([
                valuesService.getCurrentValues(1),
                valuesService.getCurrentValues(2)
            ])

            setSantaFeValues(sf)
            setRosarioValues(ros)

            // Inicializar formulario
            setFormValues({
                santaFe: {
                    medical: sf?.medical_value.toString() || '',
                    biochemical: sf?.biochemical_value.toString() || '',
                    dental: sf?.dental_value.toString() || ''
                },
                rosario: {
                    medical: ros?.medical_value.toString() || '',
                    biochemical: ros?.biochemical_value.toString() || '',
                    dental: ros?.dental_value.toString() || ''
                }
            })
        } catch (err) {
            console.error(err)
            setMessage({ text: 'Error al cargar valores', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (jurisdictionId: number) => {
        setSaving(true)
        setMessage(null)
        try {
            const values = jurisdictionId === 1 ? formValues.santaFe : formValues.rosario

            await valuesService.updateValues(jurisdictionId, {
                medical: parseFloat(values.medical) || 0,
                biochemical: parseFloat(values.biochemical) || 0,
                dental: parseFloat(values.dental) || 0
            })

            await loadValues() // Recargar para confirmar
            setMessage({ text: 'Valores actualizados correctamente', type: 'success' })
        } catch (err) {
            setMessage({ text: 'Error al guardar valores', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    if (!hasPermission('config.view')) {
        return (
            <div className="flex items-center justify-center p-8">
                <Alert variant="destructive" className="max-w-md">
                    <AlertDescription>
                        No tiene permisos para ver esta sección.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Configuración de Valores</h1>
                <p className="text-muted-foreground">
                    Administrar valores de unidades (Galeno, NBU, UO) por jurisdicción.
                </p>
            </div>

            {message && (
                <Alert variant={message.type === 'success' ? 'default' : 'destructive'}
                    className={message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="santa-fe" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="santa-fe">Cámara I - Santa Fe</TabsTrigger>
                    <TabsTrigger value="rosario">Cámara II - Rosario</TabsTrigger>
                </TabsList>

                {/* SANTA FE CONTENT */}
                <TabsContent value="santa-fe">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-blue-600" />
                                Valores Vigentes: Santa Fe
                            </CardTitle>
                            <CardDescription>
                                Última actualización: {santaFeValues?.valid_from ? new Date(santaFeValues.valid_from).toLocaleDateString() : 'Nunca'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-3">
                                {/* Galeno */}
                                <div className="space-y-2">
                                    <Label>Galeno (Médico)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={formValues.santaFe.medical}
                                            onChange={e => setFormValues({
                                                ...formValues,
                                                santaFe: { ...formValues.santaFe, medical: e.target.value }
                                            })}
                                            className="pl-7"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Valor actual: ${santaFeValues?.medical_value || 0}
                                    </p>
                                </div>

                                {/* NBU */}
                                <div className="space-y-2">
                                    <Label>NBU (Bioquímico)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={formValues.santaFe.biochemical}
                                            onChange={e => setFormValues({
                                                ...formValues,
                                                santaFe: { ...formValues.santaFe, biochemical: e.target.value }
                                            })}
                                            className="pl-7"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Valor actual: ${santaFeValues?.biochemical_value || 0}
                                    </p>
                                </div>

                                {/* UO */}
                                <div className="space-y-2">
                                    <Label>UO (Odontológico)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={formValues.santaFe.dental}
                                            onChange={e => setFormValues({
                                                ...formValues,
                                                santaFe: { ...formValues.santaFe, dental: e.target.value }
                                            })}
                                            className="pl-7"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Valor actual: ${santaFeValues?.dental_value || 0}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-between border-t bg-muted/50 p-4">
                            <div className="text-sm text-muted-foreground">
                                <History className="inline h-4 w-4 mr-1" />
                                Historial disponible en reportes
                            </div>
                            <Button onClick={() => handleSave(1)} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Actualizar Valores
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ROSARIO CONTENT */}
                <TabsContent value="rosario">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                                Valores Vigentes: Rosario
                            </CardTitle>
                            <CardDescription>
                                Última actualización: {rosarioValues?.valid_from ? new Date(rosarioValues.valid_from).toLocaleDateString() : 'Nunca'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-3">
                                {/* Galeno */}
                                <div className="space-y-2">
                                    <Label>Galeno (Médico)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={formValues.rosario.medical}
                                            onChange={e => setFormValues({
                                                ...formValues,
                                                rosario: { ...formValues.rosario, medical: e.target.value }
                                            })}
                                            className="pl-7"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Valor actual: ${rosarioValues?.medical_value || 0}
                                    </p>
                                </div>

                                {/* NBU */}
                                <div className="space-y-2">
                                    <Label>NBU (Bioquímico)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={formValues.rosario.biochemical}
                                            onChange={e => setFormValues({
                                                ...formValues,
                                                rosario: { ...formValues.rosario, biochemical: e.target.value }
                                            })}
                                            className="pl-7"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Valor actual: ${rosarioValues?.biochemical_value || 0}
                                    </p>
                                </div>

                                {/* UO */}
                                <div className="space-y-2">
                                    <Label>UO (Odontológico)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={formValues.rosario.dental}
                                            onChange={e => setFormValues({
                                                ...formValues,
                                                rosario: { ...formValues.rosario, dental: e.target.value }
                                            })}
                                            className="pl-7"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Valor actual: ${rosarioValues?.dental_value || 0}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-between border-t bg-muted/50 p-4">
                            <div className="text-sm text-muted-foreground">
                                <History className="inline h-4 w-4 mr-1" />
                                Historial disponible en reportes
                            </div>
                            <Button onClick={() => handleSave(2)} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Actualizar Valores
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
