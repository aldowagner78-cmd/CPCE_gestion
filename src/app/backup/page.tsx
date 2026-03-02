"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseClient } from "@/lib/supabase/client"
import { HardDrive, Download, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react"

const TABLES = ['jurisdictions', 'plans', 'affiliates', 'practices', 'practice_types', 'unit_values', 'audits', 'events', 'alerts', 'alert_rules'] as const

export default function BackupPage() {
    const [status, setStatus] = useState<'idle' | 'exporting' | 'importing' | 'done' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const [selectedTables, setSelectedTables] = useState<string[]>([...TABLES])

    const supabase = getSupabaseClient()

    const handleExport = async () => {
        setStatus('exporting')
        setMessage('')
        try {
            const backup: Record<string, unknown[]> = {}
            for (const table of selectedTables) {
                const { data, error } = await supabase.from(table).select('*')
                if (error) console.warn(`Error exportando ${table}:`, error.message)
                backup[table] = data ?? []
            }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `cpce_backup_${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
            setStatus('done')
            setMessage(`Exportación completa: ${Object.keys(backup).length} tablas, ${Object.values(backup).reduce((s, arr) => s + arr.length, 0)} registros.`)
        } catch (e) {
            setStatus('error')
            setMessage(e instanceof Error ? e.message : 'Error al exportar')
        }
    }

    const handleImport = async (file: File) => {
        setStatus('importing')
        setMessage('')
        try {
            const text = await file.text()
            const data = JSON.parse(text) as Record<string, unknown[]>
            let totalRows = 0
            const errors: string[] = []
            // Import in specific order to respect foreign keys
            const order = ['jurisdictions', 'plans', 'practice_types', 'unit_values', 'affiliates', 'practices', 'audits', 'events', 'alerts', 'alert_rules']
            for (const table of order) {
                if (!data[table] || data[table].length === 0) continue
                const { error } = await supabase.from(table).upsert(data[table] as Record<string, unknown>[])
                if (error) errors.push(`${table}: ${error.message}`)
                else totalRows += data[table].length
            }
            if (errors.length > 0) {
                setStatus('error')
                setMessage(`Importados ${totalRows} registros. Errores: ${errors.join('; ')}`)
            } else {
                setStatus('done')
                setMessage(`Importación completa: ${totalRows} registros en ${Object.keys(data).length} tablas.`)
            }
        } catch (e) {
            setStatus('error')
            setMessage(e instanceof Error ? e.message : 'Error al importar')
        }
    }

    const toggleTable = (t: string) => {
        setSelectedTables(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
    }

    return (
        <div className="space-y-6 container mx-auto max-w-4xl pt-6">
            <div className="flex items-center gap-3">
                <div className="bg-cyan-100 p-2 rounded-lg"><HardDrive className="h-6 w-6 text-cyan-700" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Backup & Exportación</h1>
                    <p className="text-muted-foreground">Respaldo y restauración de datos desde Supabase</p>
                </div>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">● Supabase</span>
            </div>

            {/* Table selection */}
            <Card className="p-5">
                <h3 className="font-semibold mb-3">Tablas a incluir</h3>
                <div className="flex flex-wrap gap-2">
                    {TABLES.map(t => (
                        <button key={t} onClick={() => toggleTable(t)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedTables.includes(t) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Actions */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-6 text-center">
                    <Download className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                    <h3 className="font-bold mb-1">Exportar JSON</h3>
                    <p className="text-sm text-muted-foreground mb-4">Descarga todos los datos seleccionados como archivo JSON.</p>
                    <Button className="w-full" onClick={handleExport} disabled={status === 'exporting' || selectedTables.length === 0}>
                        {status === 'exporting' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Exportar {selectedTables.length} tablas
                    </Button>
                </Card>
                <Card className="p-6 text-center">
                    <Upload className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <h3 className="font-bold mb-1">Importar JSON</h3>
                    <p className="text-sm text-muted-foreground mb-4">Restaura datos desde un archivo JSON de backup.</p>
                    <Input type="file" accept=".json" disabled={status === 'importing'}
                        onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]) }} />
                    {status === 'importing' && <div className="mt-2 flex items-center justify-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Importando...</div>}
                </Card>
            </div>

            {/* Status */}
            {message && (
                <Card className={`p-4 flex items-center gap-3 ${status === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    {status === 'error' ? <AlertCircle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                    <p className="text-sm">{message}</p>
                </Card>
            )}
        </div>
    )
}
