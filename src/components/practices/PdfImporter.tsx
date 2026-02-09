'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Loader2, FileText, CheckCircle, AlertTriangle, FileDown } from 'lucide-react'
import { externalNomenclatorService } from '@/services/externalNomenclatorService'
import * as pdfjsLib from 'pdfjs-dist'

// Configurar worker de PDF.js
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

interface PdfImporterProps {
    nomenclatorId: number
    onImportComplete: () => void
}

type ExtractionStatus = {
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
}

type ParsedPractice = {
    code: string
    description: string
    value: number | null
    unit: string | null
}

export function PdfImporter({ nomenclatorId, onImportComplete }: PdfImporterProps) {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [extracting, setExtracting] = useState(false)
    const [status, setStatus] = useState<ExtractionStatus | null>(null)
    const [extractedData, setExtractedData] = useState<ParsedPractice[]>([])
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (selectedFile.type !== 'application/pdf') {
                setStatus({ type: 'error', message: 'Solo se permiten archivos PDF' })
                return
            }
            setFile(selectedFile)
            setStatus(null)
            setExtractedData([])
            setProgress(0)
        }
    }

    const extractTextFromPdf = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
                .map((item) => (item as { str: string }).str)
                .join(' ')
            fullText += pageText + '\n'
            setProgress(Math.round((i / pdf.numPages) * 100))
        }

        return fullText
    }

    const parseNomenclatorText = (text: string): ParsedPractice[] => {
        const practices: ParsedPractice[] = []
        const lines = text.split('\n').filter(line => line.trim())

        // Patrones comunes para detectar códigos y descripciones
        // Formato típico: "CÓDIGO123 | Descripción de la práctica | 100.50 | U"
        // O: "123 Descripción aquí 100.50"
        
        const patterns = [
            // Patrón 1: Código | Descripción | Valor | Unidad
            /^(\w+)\s*\|\s*([^|]+)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\w+)/i,
            // Patrón 2: Código espacios Descripción número
            /^(\w{2,10})\s+(.{10,}?)\s+(\d+\.?\d{0,2})\s*$/,
            // Patrón 3: Solo código y descripción (sin valor)
            /^(\w{2,10})\s+(.{10,})$/,
        ]

        for (const line of lines) {
            let matched = false

            for (const pattern of patterns) {
                const match = line.match(pattern)
                if (match) {
                    practices.push({
                        code: match[1].trim(),
                        description: match[2].trim(),
                        value: match[3] ? parseFloat(match[3]) : null,
                        unit: match[4]?.trim() || null,
                    })
                    matched = true
                    break
                }
            }

            // Si no hay match pero la línea tiene al menos un código y texto
            if (!matched && line.length > 10) {
                const parts = line.split(/\s+/)
                if (parts.length >= 2 && parts[0].length <= 15) {
                    practices.push({
                        code: parts[0],
                        description: parts.slice(1).join(' '),
                        value: null,
                        unit: null,
                    })
                }
            }
        }

        return practices
    }

    const handleExtract = async () => {
        if (!file) return

        setExtracting(true)
        setStatus({ type: 'info', message: 'Extrayendo texto del PDF...' })
        setProgress(0)

        try {
            const text = await extractTextFromPdf(file)
            
            if (!text || text.trim().length < 50) {
                setStatus({
                    type: 'warning',
                    message: 'No se pudo extraer suficiente texto del PDF. Verifica que no sea una imagen escaneada.'
                })
                setExtracting(false)
                return
            }

            setStatus({ type: 'info', message: 'Analizando contenido...' })
            const parsed = parseNomenclatorText(text)

            if (parsed.length === 0) {
                setStatus({
                    type: 'warning',
                    message: 'No se detectaron prácticas con el formato esperado. Considera usar CSV manual.'
                })
                setExtracting(false)
                return
            }

            setExtractedData(parsed)
            setStatus({
                type: 'success',
                message: `Extracción completada: ${parsed.length} prácticas detectadas. Revisa y confirma para importar.`
            })
        } catch (err) {
            console.error(err)
            const error = err as Error
            setStatus({ type: 'error', message: `Error al procesar PDF: ${error.message}` })
        } finally {
            setExtracting(false)
            setProgress(0)
        }
    }

    const handleImport = async () => {
        if (extractedData.length === 0) return

        setLoading(true)
        setStatus({ type: 'info', message: 'Importando prácticas...' })

        try {
            const practices = extractedData.map(p => ({
                nomenclator_id: nomenclatorId,
                code: p.code,
                description: p.description,
                value: p.value,
                unit: p.unit,
            }))

            const batchSize = 100
            for (let i = 0; i < practices.length; i += batchSize) {
                const batch = practices.slice(i, i + batchSize)
                await externalNomenclatorService.bulkUpsertPractices(batch)
            }

            setStatus({
                type: 'success',
                message: `¡Importación exitosa! ${practices.length} prácticas guardadas.`
            })
            
            // Limpiar
            setFile(null)
            setExtractedData([])
            if (fileInputRef.current) fileInputRef.current.value = ''
            
            onImportComplete()
        } catch (err) {
            console.error(err)
            const error = err as Error
            setStatus({ type: 'error', message: `Error al importar: ${error.message}` })
        } finally {
            setLoading(false)
        }
    }

    const downloadCsv = () => {
        if (extractedData.length === 0) return

        const csvContent = [
            'code,description,value,unit',
            ...extractedData.map(p => 
                `"${p.code}","${p.description}",${p.value || ''},${p.unit || ''}`
            )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `nomenclador_extraido_${Date.now()}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Card className="border-dashed border-2">
            <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <h3 className="font-semibold">Importar desde PDF</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Sube un PDF y extraeremos automáticamente las prácticas. Funciona mejor con PDFs con texto seleccionable.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="pdf-upload"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Seleccionar PDF
                    </Button>

                    {file && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </div>
                    )}

                    {file && extractedData.length === 0 && (
                        <Button onClick={handleExtract} disabled={extracting}>
                            {extracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {extracting ? `Extrayendo... ${progress}%` : 'Extraer Datos'}
                        </Button>
                    )}

                    {extractedData.length > 0 && (
                        <div className="flex gap-2">
                            <Button onClick={handleImport} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Importar {extractedData.length} prácticas
                            </Button>
                            <Button onClick={downloadCsv} variant="outline">
                                <FileDown className="mr-2 h-4 w-4" />
                                Descargar CSV
                            </Button>
                        </div>
                    )}
                </div>

                {status && (
                    <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
                        {status.type === 'success' && <CheckCircle className="h-4 w-4" />}
                        {status.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                        {status.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                        <AlertDescription>{status.message}</AlertDescription>
                    </Alert>
                )}

                {extractedData.length > 0 && (
                    <div className="border rounded-lg p-4 max-h-60 overflow-auto">
                        <h4 className="font-semibold mb-2">Vista previa ({extractedData.length} registros):</h4>
                        <div className="space-y-1 text-xs">
                            {extractedData.slice(0, 10).map((item, idx) => (
                                <div key={idx} className="border-b pb-1">
                                    <span className="font-mono font-bold">{item.code}</span> - {item.description}
                                    {item.value && <span className="text-muted-foreground ml-2">(${item.value})</span>}
                                </div>
                            ))}
                            {extractedData.length > 10 && (
                                <p className="text-muted-foreground italic">
                                    ... y {extractedData.length - 10} más
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
