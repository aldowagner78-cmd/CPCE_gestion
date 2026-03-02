"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    Search, BookOpen, Loader2, Copy, FileText, Pencil, Sparkles,
    Check, X, Database, ChevronDown, ChevronUp,
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { parseNormativa, formatNormativa, type NormativaStructured } from "@/lib/normativaParser"

// ── Types ──

interface PracticeType {
    id: number
    code: string
    name: string
    unit_name: string | null
}

interface Practice {
    id: number
    code: string
    name: string
    description: string | null
    category: string | null
    normativa: string | null
    coseguro: string | null
    unit_quantity: number
    practice_type_id: number | null
}

// ── Tab colors per type ──

const TYPE_THEME: Record<string, {
    bg: string; text: string; activeBg: string; activeText: string
    cardRing: string; badge: string
}> = {
    MED: {
        bg: "hover:bg-red-50 dark:hover:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        activeBg: "bg-red-100 dark:bg-red-900/40",
        activeText: "text-red-700 dark:text-red-300",
        cardRing: "ring-red-400",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
    BIO: {
        bg: "hover:bg-green-50 dark:hover:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
        activeBg: "bg-green-100 dark:bg-green-900/40",
        activeText: "text-green-700 dark:text-green-300",
        cardRing: "ring-green-400",
        badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    },
    ODO: {
        bg: "hover:bg-violet-50 dark:hover:bg-violet-900/20",
        text: "text-violet-600 dark:text-violet-400",
        activeBg: "bg-violet-100 dark:bg-violet-900/40",
        activeText: "text-violet-700 dark:text-violet-300",
        cardRing: "ring-violet-400",
        badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    },
    FAR: {
        bg: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
        text: "text-amber-600 dark:text-amber-400",
        activeBg: "bg-amber-100 dark:bg-amber-900/40",
        activeText: "text-amber-700 dark:text-amber-300",
        cardRing: "ring-amber-400",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    ESP: {
        bg: "hover:bg-sky-50 dark:hover:bg-sky-900/20",
        text: "text-sky-600 dark:text-sky-400",
        activeBg: "bg-sky-100 dark:bg-sky-900/40",
        activeText: "text-sky-700 dark:text-sky-300",
        cardRing: "ring-sky-400",
        badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    },
}

const DEFAULT_THEME = TYPE_THEME.MED

function getTheme(code: string) {
    return TYPE_THEME[code] ?? DEFAULT_THEME
}

// ── Main Page ──

export default function BuscadorPage() {
    const supabase = getSupabaseClient()
    const { activeJurisdiction } = useJurisdiction()

    // Data
    const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([])
    const [results, setResults] = useState<Practice[]>([])
    const [loading, setLoading] = useState(true)
    const [searching, setSearching] = useState(false)
    const [totalCount, setTotalCount] = useState(0)

    // UI state
    const [activeTab, setActiveTab] = useState<number | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null)
    const [editMode, setEditMode] = useState(false)
    const [editText, setEditText] = useState("")
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [structurePreview, setStructurePreview] = useState<NormativaStructured | null>(null)

    const searchInputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Load practice types
    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from('practice_types')
                .select('id, code, name, unit_name')
                .order('code')
            if (data && data.length > 0) {
                setPracticeTypes(data)
                setActiveTab(data[0].id)
            }
            setLoading(false)
        })()
    }, [supabase])

    // Search practices
    const doSearch = useCallback(async (typeId: number, query: string) => {
        if (query.length > 0 && query.length < 2) return
        setSearching(true)

        let q = supabase
            .from('practices')
            .select('id, code, name, description, category, normativa, coseguro, unit_quantity, practice_type_id', { count: 'exact' })
            .eq('practice_type_id', typeId)
            .eq('is_active', true)

        if (activeJurisdiction) {
            q = q.eq('jurisdiction_id', activeJurisdiction.id)
        }

        if (query.length >= 2) {
            q = q.or(`code.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
        }

        const { data, count } = await q.order('code').limit(100)
        setResults(data ?? [])
        setTotalCount(count ?? 0)
        setSearching(false)
    }, [supabase, activeJurisdiction])

    // Debounced search
    useEffect(() => {
        if (activeTab === null) return
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doSearch(activeTab, searchTerm), 200)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [activeTab, searchTerm, doSearch])

    // Tab change
    const handleTabChange = (typeId: number) => {
        setActiveTab(typeId)
        setSearchTerm("")
        setResults([])
        searchInputRef.current?.focus()
    }

    // Active type info
    const activeType = useMemo(
        () => practiceTypes.find(t => t.id === activeTab),
        [practiceTypes, activeTab]
    )
    const theme = activeType ? getTheme(activeType.code) : DEFAULT_THEME

    // ── Detail Modal ──

    const openDetail = (p: Practice) => {
        setSelectedPractice(p)
        setEditMode(false)
        setEditText(p.normativa ?? "")
        setStructurePreview(null)
    }

    const handleSave = async () => {
        if (!selectedPractice) return
        setSaving(true)
        const text = editText.trim()
        await supabase
            .from('practices')
            .update({ normativa: text || null })
            .eq('id', selectedPractice.id)

        // Update local results
        setResults(prev => prev.map(r =>
            r.id === selectedPractice.id ? { ...r, normativa: text || null } : r
        ))
        setSelectedPractice(prev => prev ? { ...prev, normativa: text || null } : null)
        setSaving(false)
        setEditMode(false)
    }

    const handleStructure = () => {
        const parsed = parseNormativa(editText)
        setStructurePreview(parsed)
        setEditText(formatNormativa(parsed))
    }

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopied(label)
        setTimeout(() => setCopied(null), 1500)
    }

    // ESC to clear
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !selectedPractice) {
                setSearchTerm("")
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [selectedPractice])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-5xl pt-2 space-y-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-2 pb-4">
                <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg">
                    <BookOpen className="h-6 w-6 text-teal-700 dark:text-teal-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Buscador de Prácticas</h1>
                    <p className="text-muted-foreground text-sm">
                        Busque por código o descripción — vea la normativa de cada práctica
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                            <Database className="inline h-3 w-3 mr-0.5" />Supabase
                        </span>
                    </p>
                </div>
            </div>

            {/* Glass Container */}
            <Card className="overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-800/50">
                    {practiceTypes.map(t => {
                        const th = getTheme(t.code)
                        const isActive = t.id === activeTab
                        return (
                            <button
                                key={t.id}
                                onClick={() => handleTabChange(t.id)}
                                className={`flex-1 py-3 text-center font-semibold text-xs md:text-sm uppercase transition-all duration-200 border-b-2 ${
                                    isActive
                                        ? `${th.activeBg} ${th.activeText} border-current`
                                        : `text-slate-500 border-transparent ${th.bg}`
                                }`}
                            >
                                <span className="hidden md:inline">{t.name}</span>
                                <span className="md:hidden">{t.code}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Search Bar */}
                <div className="p-4 md:p-6 bg-white/30 dark:bg-slate-800/30">
                    <div className="relative">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${theme.text} transition-colors`} />
                        <Input
                            ref={searchInputRef}
                            type="search"
                            placeholder={`Buscar en ${activeType?.name ?? ''}...`}
                            className="pl-12 pr-12 py-5 text-base rounded-xl shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(""); searchInputRef.current?.focus() }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex justify-between items-center mt-2 px-1">
                        <span className={`text-sm font-medium ${theme.text}`}>
                            {searching ? (
                                <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                            ) : results.length > 0 ? (
                                `${results.length}${totalCount > results.length ? ` de ${totalCount}` : ''} resultados`
                            ) : searchTerm.length >= 2 ? (
                                'Sin resultados'
                            ) : null}
                        </span>
                        <span className="text-xs text-slate-400 hidden md:block">
                            ESC para limpiar
                        </span>
                    </div>
                </div>

                {/* Results */}
                <div className="min-h-[300px] max-h-[60vh] overflow-y-auto p-4 md:p-6 space-y-3">
                    {results.length === 0 && !searching && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <BookOpen className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-base">
                                {searchTerm.length < 2
                                    ? "Escriba al menos 2 caracteres para buscar"
                                    : `No se encontraron resultados para "${searchTerm}"`
                                }
                            </p>
                        </div>
                    )}

                    {results.map((p, idx) => {
                        const hasNormativa = !!p.normativa?.trim()
                        return (
                            <div
                                key={p.id}
                                onClick={() => openDetail(p)}
                                className={`p-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer
                                    transition-all duration-200 hover:shadow-md hover:scale-[1.01]
                                    bg-white dark:bg-slate-800 border-l-4 ${hasNormativa ? `border-l-current ${theme.text}` : 'border-l-transparent'}
                                `}
                                style={{ animationDelay: `${idx * 30}ms` }}
                            >
                                {/* Top row */}
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={`font-mono font-bold text-lg ${theme.text}`}>
                                        {p.code}
                                    </span>
                                    {p.coseguro && (
                                        <Badge variant="secondary" className="text-xs">
                                            {p.coseguro}
                                        </Badge>
                                    )}
                                    {hasNormativa && (
                                        <Badge className={`text-xs ${theme.badge}`}>
                                            Normativa
                                        </Badge>
                                    )}
                                    {p.category && (
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {p.category}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug mb-1">
                                    {p.name}
                                </p>

                                {/* Normativa preview */}
                                {hasNormativa && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mt-1 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                                        {p.normativa!.length > 200 ? p.normativa!.slice(0, 200) + '…' : p.normativa}
                                    </p>
                                )}

                                {/* Quick actions */}
                                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                    <button
                                        onClick={e => { e.stopPropagation(); handleCopy(p.code, `code-${p.id}`) }}
                                        className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        {copied === `code-${p.id}` ? <Check className="inline h-3 w-3 mr-1" /> : <Copy className="inline h-3 w-3 mr-1" />}
                                        Código
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleCopy(`${p.code} ${p.name}`, `full-${p.id}`) }}
                                        className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        {copied === `full-${p.id}` ? <Check className="inline h-3 w-3 mr-1" /> : <Copy className="inline h-3 w-3 mr-1" />}
                                        + Nombre
                                    </button>
                                    {hasNormativa && (
                                        <button
                                            onClick={e => { e.stopPropagation(); handleCopy(p.normativa!, `norm-${p.id}`) }}
                                            className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            {copied === `norm-${p.id}` ? <Check className="inline h-3 w-3 mr-1" /> : <Copy className="inline h-3 w-3 mr-1" />}
                                            Nota
                                        </button>
                                    )}
                                    <button
                                        onClick={e => { e.stopPropagation(); openDetail(p) }}
                                        className={`text-xs px-2 py-1 rounded-md ${theme.badge} font-medium hover:opacity-80 transition-opacity ml-auto`}
                                    >
                                        <FileText className="inline h-3 w-3 mr-1" />
                                        Detalle
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card>

            {/* ── Detail / Edit Modal ── */}
            <Dialog open={selectedPractice !== null} onOpenChange={(open) => { if (!open) setSelectedPractice(null) }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    {selectedPractice && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-center text-lg">Detalle de Práctica</DialogTitle>
                            </DialogHeader>

                            {/* Code box */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                                <span className={`block text-3xl md:text-4xl font-mono font-bold tracking-widest select-all ${theme.text}`}>
                                    {selectedPractice.code}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-600 dark:text-slate-300 text-center font-medium px-2">
                                {selectedPractice.name}
                            </p>

                            {/* Meta */}
                            <div className="flex justify-center gap-2 flex-wrap">
                                {selectedPractice.category && (
                                    <Badge variant="secondary">{selectedPractice.category}</Badge>
                                )}
                                {selectedPractice.coseguro && (
                                    <Badge variant="outline">{selectedPractice.coseguro}</Badge>
                                )}
                                {activeType?.unit_name && selectedPractice.unit_quantity > 0 && (
                                    <Badge variant="outline">
                                        {selectedPractice.unit_quantity} {activeType.unit_name}
                                    </Badge>
                                )}
                            </div>

                            {/* View Mode */}
                            {!editMode && (
                                <div className="space-y-3">
                                    <NormativaDisplay
                                        text={selectedPractice.normativa}
                                        theme={theme}
                                    />
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setEditMode(true)
                                            setEditText(selectedPractice.normativa ?? "")
                                            setStructurePreview(null)
                                        }}
                                    >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar Normativa
                                    </Button>
                                </div>
                            )}

                            {/* Edit Mode */}
                            {editMode && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase block">
                                        Normativa — Pegue texto o escriba manualmente
                                    </label>
                                    <textarea
                                        value={editText}
                                        onChange={e => { setEditText(e.target.value); setStructurePreview(null) }}
                                        rows={8}
                                        placeholder="Pegue aquí el texto normativo (de PDF, resolución, etc.)..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm resize-none focus:ring-2 focus:ring-teal-400 outline-none"
                                    />

                                    {/* Structure button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2 text-xs"
                                        onClick={handleStructure}
                                        disabled={!editText.trim()}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Estructurar texto (INCLUYE / EXCLUYE / REQUISITOS)
                                    </Button>

                                    {/* Structure preview */}
                                    {structurePreview && (
                                        <StructurePreview structured={structurePreview} />
                                    )}

                                    <DialogFooter className="gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => { setEditMode(false); setStructurePreview(null) }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button onClick={handleSave} disabled={saving}>
                                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            Guardar
                                        </Button>
                                    </DialogFooter>
                                </div>
                            )}

                            {/* Copy actions at bottom */}
                            {!editMode && (
                                <div className="flex gap-2 flex-wrap pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => handleCopy(selectedPractice.code, 'modal-code')}
                                    >
                                        {copied === 'modal-code' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                        Código
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => handleCopy(`${selectedPractice.code} ${selectedPractice.name}`, 'modal-full')}
                                    >
                                        {copied === 'modal-full' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                        Código + Nombre
                                    </Button>
                                    {selectedPractice.normativa && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => handleCopy(selectedPractice.normativa!, 'modal-norm')}
                                        >
                                            {copied === 'modal-norm' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                            Normativa
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ── Sub-components ──

function NormativaDisplay({ text, theme }: { text: string | null; theme: typeof DEFAULT_THEME }) {
    const [expanded, setExpanded] = useState(false)

    if (!text?.trim()) {
        return (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-center italic text-slate-400">
                Sin normativa especial.
            </div>
        )
    }

    // Parse into sections for rich display
    const parsed = parseNormativa(text)
    const hasSections = parsed.incluye.length > 0 || parsed.excluye.length > 0 || parsed.requisitos.length > 0

    if (!hasSections) {
        // Plain text display
        const isLong = text.length > 300
        return (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm leading-relaxed border border-slate-200 dark:border-slate-600">
                <p className={!expanded && isLong ? 'line-clamp-6' : ''}>
                    {text}
                </p>
                {isLong && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className={`mt-2 text-xs font-medium ${theme.text} flex items-center gap-1`}
                    >
                        {expanded ? <><ChevronUp className="h-3 w-3" /> Ver menos</> : <><ChevronDown className="h-3 w-3" /> Ver más</>}
                    </button>
                )}
            </div>
        )
    }

    // Structured display
    return (
        <div className="space-y-2">
            {parsed.incluye.length > 0 && (
                <SectionBlock title="INCLUYE" items={parsed.incluye} color="text-green-700 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" border="border-green-200 dark:border-green-800" />
            )}
            {parsed.excluye.length > 0 && (
                <SectionBlock title="EXCLUYE" items={parsed.excluye} color="text-red-700 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" border="border-red-200 dark:border-red-800" />
            )}
            {parsed.requisitos.length > 0 && (
                <SectionBlock title="REQUISITOS" items={parsed.requisitos} color="text-amber-700 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-200 dark:border-amber-800" />
            )}
            {parsed.observaciones.length > 0 && (
                <SectionBlock title="OBSERVACIONES" items={parsed.observaciones} color="text-blue-700 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-200 dark:border-blue-800" />
            )}
            {parsed.coseguro && (
                <div className="text-xs text-muted-foreground px-2">
                    <strong>Coseguro:</strong> {parsed.coseguro}
                </div>
            )}
        </div>
    )
}

function SectionBlock({ title, items, color, bg, border }: {
    title: string; items: string[]; color: string; bg: string; border: string
}) {
    return (
        <div className={`rounded-lg p-3 ${bg} border ${border}`}>
            <p className={`text-xs font-bold uppercase mb-1 ${color}`}>{title}</p>
            <ul className="space-y-0.5">
                {items.map((item, i) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className={`mr-1.5 ${color}`}>•</span>{item}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function StructurePreview({ structured }: { structured: NormativaStructured }) {
    const total = structured.incluye.length + structured.excluye.length + structured.requisitos.length + structured.observaciones.length
    if (total === 0) return null

    return (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-dashed border-slate-300 dark:border-slate-600">
            <p className="text-xs font-bold text-slate-500 mb-2">
                <Sparkles className="inline h-3 w-3 mr-1" />
                Vista previa estructurada — {total} {total === 1 ? 'elemento' : 'elementos'} detectados
            </p>
            <div className="space-y-1 text-xs">
                {structured.incluye.length > 0 && (
                    <p><span className="font-medium text-green-600">INCLUYE:</span> {structured.incluye.length} items</p>
                )}
                {structured.excluye.length > 0 && (
                    <p><span className="font-medium text-red-600">EXCLUYE:</span> {structured.excluye.length} items</p>
                )}
                {structured.requisitos.length > 0 && (
                    <p><span className="font-medium text-amber-600">REQUISITOS:</span> {structured.requisitos.length} items</p>
                )}
                {structured.observaciones.length > 0 && (
                    <p><span className="font-medium text-blue-600">OBSERVACIONES:</span> {structured.observaciones.length} items</p>
                )}
                {structured.coseguro && (
                    <p><span className="font-medium text-slate-600">COSEGURO:</span> {structured.coseguro}</p>
                )}
            </div>
        </div>
    )
}
