'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Stethoscope, Loader2, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase';

const supabase = createClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ── Types ──

export interface DiseaseRecord {
    id: number;
    code: string;
    name: string;
    classification: string;
    level?: string;
    category?: string;
    description?: string;
    synonyms?: string[] | null;
    criteria?: string[] | null;
    exclusions?: string[] | null;
    clinical_notes?: string | null;
    is_chronic?: boolean;
    requires_authorization?: boolean;
}

export interface DiseaseSelection {
    code: string;
    name: string;
    classification: string;
}

interface DiseaseAutocompleteProps {
    /** Currently selected disease name */
    value?: string;
    /** Currently selected disease code */
    code?: string;
    /** Called when a disease is selected */
    onSelect: (selection: DiseaseSelection) => void;
    /** Called when the selection is cleared */
    onClear: () => void;
    /** Optional: initial search text from AI extraction */
    initialSearch?: string;
    /** Optional: label override */
    label?: string;
    /** Optional: placeholder override */
    placeholder?: string;
    /** Optional: whether the field is disabled */
    disabled?: boolean;
}

// ── Component ──

export function DiseaseAutocomplete({
    value,
    code,
    onSelect,
    onClear,
    initialSearch,
    label = 'Diagnóstico presuntivo',
    placeholder = 'Buscar diagnóstico por código o nombre (ej: diabetes, J45, fractura...)',
    disabled = false,
}: DiseaseAutocompleteProps) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<DiseaseRecord[]>([]);
    const [searching, setSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const initialSearchDone = useRef(false);

    // ── AI initial search: auto-trigger search when initialSearch changes ──
    useEffect(() => {
        if (!initialSearch || initialSearchDone.current || value) return;
        const timer = setTimeout(() => {
            initialSearchDone.current = true;
            setSearch(initialSearch.substring(0, 40));
        }, 0);
        return () => clearTimeout(timer);
    }, [initialSearch, value]);

    // Reset initialSearchDone when initialSearch actually changes to a new value
    useEffect(() => {
        initialSearchDone.current = false;
    }, [initialSearch]);

    // ── Debounced search (fast-clear + delayed API call) ──
    useEffect(() => {
        // Cierre instantáneo cuando la búsqueda cae por debajo del umbral
        const clearTimer = setTimeout(() => {
            if (search.length < 2) {
                setResults([]);
                setIsOpen(false);
                setSearching(false);
            }
        }, 10);

        // Llamada a API solo cuando hay suficientes caracteres
        // Con el índice GIN pg_trgm (migración 021) los ILIKE con % inicial
        // pasan de ~400 ms (full-scan 46k rows) a < 10 ms.
        const isCodeSearch = /^[A-Za-z]\d/.test(search.trim()); // ej: J45, A00, F32
        // Para búsquedas de código usamos prefijo (sin % inicial) que aprovecha btree
        const nameFilter = `name.ilike.%${search}%`;
        const codeFilter = isCodeSearch
            ? `code.ilike.${search}%`          // prefix sin comodín inicial → btree
            : `code.ilike.%${search}%`;        // contiene → trigrama GIN

        const debounce = isCodeSearch ? 80 : 200; // códigos: respuesta casi inmediata

        const searchTimer = setTimeout(async () => {
            if (search.length < 2) return;
            setSearching(true);
            try {
                const { data } = await db('diseases')
                    .select('id, code, name, classification, level, category, description, synonyms, criteria, exclusions, clinical_notes, is_chronic, requires_authorization')
                    .or(`${nameFilter},${codeFilter}`)
                    .order('code')
                    .limit(20);
                const items = (data || []) as DiseaseRecord[];
                setResults(items);
                setIsOpen(items.length > 0);
                setHighlightIndex(-1);
            } catch {
                setResults([]);
            }
            setSearching(false);
        }, debounce);

        return () => {
            clearTimeout(clearTimer);
            clearTimeout(searchTimer);
        };
    }, [search]);

    // ── Click outside to close ──
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Select a disease ──
    const handleSelect = useCallback((disease: DiseaseRecord) => {
        onSelect({
            code: disease.code,
            name: disease.name,
            classification: disease.classification || 'CIE-10',
        });
        setSearch('');
        setResults([]);
        setIsOpen(false);
        setHighlightIndex(-1);
    }, [onSelect]);

    // ── Keyboard navigation ──
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightIndex >= 0 && highlightIndex < results.length) {
                    handleSelect(results[highlightIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightIndex(-1);
                break;
        }
    }, [isOpen, results, highlightIndex, handleSelect]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightIndex >= 0 && listRef.current) {
            const item = listRef.current.children[highlightIndex] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex]);

    // ── Selected state ──
    if (value) {
        return (
            <div ref={containerRef}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                    {label} <span className="normal-case text-muted-foreground/60">(opcional)</span>
                </label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/30">
                    <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="font-mono font-semibold text-sm">{code}</span>
                        <span className="ml-2 text-sm">{value}</span>
                    </div>
                    {!disabled && (
                        <button
                            onClick={() => {
                                onClear();
                                setSearch('');
                                setResults([]);
                                // Focus the input after clearing (microtask)
                                setTimeout(() => inputRef.current?.focus(), 50);
                            }}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                            aria-label="Borrar diagnóstico"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── Search state ──
    return (
        <div ref={containerRef} className="relative">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                {label} <span className="normal-case text-muted-foreground/60">(opcional)</span>
            </label>

            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    ref={inputRef}
                    placeholder={placeholder}
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        // Cierra el dropdown si hay menos de 2 caracteres
                        if (e.target.value.length < 2) setIsOpen(false);
                    }}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    onKeyDown={handleKeyDown}
                    className="pl-9 pr-8"
                    disabled={disabled}
                    autoComplete="off"
                />
                {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
            </div>

            {/* Results dropdown */}
            {isOpen && results.length > 0 && (
                <div
                    ref={listRef}
                    className="absolute z-30 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-64 overflow-y-auto"
                    role="listbox"
                    aria-label="Resultados de diagnósticos"
                >
                    {results.map((d, idx) => (
                        <button
                            key={d.id}
                            role="option"
                            aria-selected={idx === highlightIndex}
                            onClick={() => handleSelect(d)}
                            className={`
                                w-full px-3 py-2.5 text-left text-sm border-b last:border-0 
                                flex items-center gap-3 transition-colors
                                ${idx === highlightIndex ? 'bg-accent' : 'hover:bg-muted/50'}
                            `}
                        >
                            {/* Code in monospace */}
                            <span className="font-mono font-bold text-primary shrink-0 min-w-[60px]">
                                {d.code}
                            </span>

                            {/* Name */}
                            <span className="flex-1 min-w-0 truncate">{d.name}</span>

                            {/* Requires authorization indicator */}
                            {d.requires_authorization && (
                                <span title="Requiere autorización previa">
                                    <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                                </span>
                            )}

                            {/* Classification tag */}
                            <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                                {d.classification || 'CIE-10'}
                            </span>
                        </button>
                    ))}

                    {/* Footer: count + hint when at limit */}
                    <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t bg-muted/30 flex items-center justify-between">
                        <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
                        {results.length === 15 && (
                            <span className="italic">Refiná la búsqueda para ver más</span>
                        )}
                    </div>
                </div>
            )}

            {/* No results message */}
            {search.length >= 2 && !searching && results.length === 0 && !isOpen && (
                <p className="text-xs text-muted-foreground mt-1">
                    No se encontraron diagnósticos para &quot;{search}&quot;
                </p>
            )}

            {/* Searching indicator */}
            {searching && search.length >= 2 && (
                <p className="text-xs text-muted-foreground mt-1 animate-pulse">
                    Buscando diagnósticos...
                </p>
            )}
        </div>
    );
}
