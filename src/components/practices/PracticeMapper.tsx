'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Check, Link as LinkIcon, X } from 'lucide-react'
import { practiceService, type Practice } from '@/services/practiceService'
import { Badge } from '@/components/ui/badge'

interface PracticeMapperProps {
    externalPracticeId: string
    currentInternalId: number | null
    onMap: (internalId: number | null) => Promise<void>
    jurisdictionId?: number
}

export function PracticeMapper({ externalPracticeId, currentInternalId, onMap, jurisdictionId }: PracticeMapperProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [results, setResults] = useState<Practice[]>([])
    const [loading, setLoading] = useState(false)
    const [mapping, setMapping] = useState(false)

    const handleSearch = async () => {
        if (!search.trim()) return
        setLoading(true)
        try {
            const data = await practiceService.searchPractices(search, jurisdictionId)
            setResults(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = async (internalId: number | null) => {
        setMapping(true)
        try {
            await onMap(internalId)
            setOpen(false)
        } catch (error) {
            console.error(error)
        } finally {
            setMapping(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={currentInternalId ? "outline" : "primary"} size="sm">
                    {currentInternalId ? (
                        <span className="flex items-center gap-1">
                            <Check className="h-4 w-4 text-green-600" />
                            Homologada
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <LinkIcon className="h-4 w-4" />
                            Homologar
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Homologar Práctica</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Buscar por código o nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {currentInternalId && (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-green-50">
                                <div>
                                    <div className="font-semibold text-green-700">Mapeo Actual</div>
                                    <div className="text-sm">ID Interno: {currentInternalId}</div>
                                </div>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleSelect(null)}
                                    disabled={mapping}
                                >
                                    {mapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-1"><X className="h-4 w-4" /> Desvincular</span>}
                                </Button>
                            </div>
                        )}

                        {results.length === 0 && !loading && search && (
                            <div className="text-center text-muted-foreground py-4">
                                No se encontraron resultados.
                            </div>
                        )}

                        {results.map((practice) => (
                            <div key={practice.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50">
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        <Badge variant="outline">{practice.code}</Badge>
                                        {practice.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                                        {practice.description}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleSelect(practice.id)}
                                    disabled={mapping || currentInternalId === practice.id}
                                >
                                    {mapping && currentInternalId === practice.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        'Seleccionar'
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
