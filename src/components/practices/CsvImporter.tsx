'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Loader2, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { externalNomenclatorService } from '@/services/externalNomenclatorService'

interface CsvImporterProps {
    nomenclatorId: number
    onImportComplete: () => void
}

export function CsvImporter({ nomenclatorId, onImportComplete }: CsvImporterProps) {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null)
    const [stats, setStats] = useState({ total: 0, distinct: 0 })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus(null)
            setStats({ total: 0, distinct: 0 })
        }
    }

    const processFile = () => {
        if (!file) return

        setLoading(true)
        setStatus(null)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data as any[]

                    if (rows.length === 0) {
                        setStatus({ type: 'warning', message: 'El archivo está vacío o no tiene formato válido.' })
                        setLoading(false)
                        return
                    }

                    // Validar columnas
                    const firstRow = rows[0]
                    if (!firstRow.code && !firstRow.codigo) {
                        setStatus({
                            type: 'error',
                            message: 'Falta la columna "code" o "codigo". Estructura requerida: code, description, value, unit'
                        })
                        setLoading(false)
                        return
                    }

                    // Mapear a ExternalPractice
                    const practices = rows.map(row => ({
                        nomenclator_id: nomenclatorId,
                        code: (row.code || row.codigo || '').toString().trim(),
                        description: (row.description || row.descripcion || '').toString().trim(),
                        value: parseFloat(row.value || row.valor || '0') || null,
                        unit: (row.unit || row.unidad || '').toString().trim() || null,
                    })).filter(p => p.code)

                    // Enviar al servicio (lotes de 100)
                    const batchSize = 100
                    for (let i = 0; i < practices.length; i += batchSize) {
                        const batch = practices.slice(i, i + batchSize)
                        await externalNomenclatorService.bulkUpsertPractices(batch)
                    }

                    setStatus({
                        type: 'success',
                        message: `Importación completada. ${practices.length} prácticas procesadas.`
                    })
                    onImportComplete()
                } catch (err: any) {
                    console.error(err)
                    setStatus({ type: 'error', message: `Error: ${err.message}` })
                } finally {
                    setLoading(false)
                    setFile(null)
                    // Reset input via file key or just clear
                }
            },
            error: (err) => {
                setStatus({ type: 'error', message: `Error leyendo CSV: ${err.message}` })
                setLoading(false)
            }
        })
    }

    return (
        <Card className="border-dashed border-2">
            <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-3 bg-blue-50 rounded-full">
                        <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Importar prácticas (CSV)</p>
                        <p className="text-xs text-muted-foreground">Columnas: code, description, value, unit</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <input
                        type="file"
                        accept=".csv"
                        className="text-sm"
                        onChange={handleFileChange}
                        disabled={loading}
                    />
                    <Button
                        onClick={processFile}
                        disabled={!file || loading}
                        className="w-full"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Procesando...' : 'Subir'}
                    </Button>
                </div>

                {status && (
                    <Alert variant={status.type === 'error' ? 'destructive' : 'default'}
                        className={status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
                        <AlertDescription>{status.message}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    )
}
