'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Search, Plus, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import type { Practice } from '@/types/database';

const supabase = createClient();

const NOMENCLATOR_TABS = [
    { key: 'todos', label: 'Todos', filter: null },
    { key: 'medico', label: 'MED', filter: 'medico' },
    { key: 'bioquimico', label: 'BIO', filter: 'bioquimico' },
    { key: 'odontologico', label: 'ODO', filter: 'odontologico' },
    { key: 'farmacia', label: 'FAR', filter: 'farmacia' },
] as const;

type TabKey = (typeof NOMENCLATOR_TABS)[number]['key'];

const NOMENCLATOR_COLORS: Record<string, string> = {
    MED: 'bg-blue-100 text-blue-700',
    BIO: 'bg-emerald-100 text-emerald-700',
    ODO: 'bg-pink-100 text-pink-700',
    FAR: 'bg-amber-100 text-amber-700',
    'N/N': 'bg-slate-100 text-slate-600',
};

const ABBR_MAP: Record<string, string> = {
    medico: 'MED',
    bioquimico: 'BIO',
    odontologico: 'ODO',
    farmacia: 'FAR',
};

function toSentenceCase(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export interface NomenclatorSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPractice: (p: Practice) => void;
    jurisdictionId: number;
}

export function NomenclatorSearchModal({
    isOpen,
    onClose,
    onSelectPractice,
    jurisdictionId,
}: NomenclatorSearchModalProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('todos');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Practice[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNN, setShowNN] = useState(false);
    const [nnDesc, setNNDesc] = useState('');
    const [nnPrice, setNNPrice] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(() => {
            setQuery('');
            setResults([]);
            setShowNN(false);
            setNNDesc('');
            setNNPrice('');
            setActiveTab('todos');
            inputRef.current?.focus();
        }, 0);
        return () => clearTimeout(t);
    }, [isOpen]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < 2) {
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const tab = NOMENCLATOR_TABS.find(t => t.key === activeTab);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let q = (supabase as any)
                    .from('practices')
                    .select('id, code, description, nomenclator_type, financial_value, jurisdiction_id, category, created_at')
                    .eq('jurisdiction_id', jurisdictionId)
                    .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
                    .limit(40);

                if (tab?.filter) {
                    q = q.eq('nomenclator_type', tab.filter);
                }

                const { data } = await q;
                setResults((data || []) as Practice[]);
            } catch {
                setResults([]);
            }
            setLoading(false);
        }, 300);
    }, [query, activeTab, jurisdictionId]);

    function handleAddNN() {
        if (!nnDesc.trim()) return;
        const custom: Practice = {
            id: -1,
            code: 'S/C',
            description: toSentenceCase(nnDesc.trim()),
            nomenclator_type: undefined,
            financial_value: parseFloat(nnPrice) || 0,
            jurisdiction_id: jurisdictionId,
            category: 'sin_nomenclador',
            created_at: new Date().toISOString(),
        };
        onSelectPractice(custom);
        onClose();
    }

    const displayResults = query.length < 2 ? [] : results;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Search className="h-5 w-5 text-blue-600" />
                        Buscar en nomenclador
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs + N/N button */}
                <div className="flex items-center gap-0 px-5 pt-2 pb-0 border-b">
                    {NOMENCLATOR_TABS.map(t => {
                        const abbr = t.filter ? ABBR_MAP[t.filter] : null;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                                    activeTab === t.key
                                        ? 'border-blue-600 text-blue-700'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {abbr && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${NOMENCLATOR_COLORS[abbr]}`}>
                                        {abbr}
                                    </span>
                                )}
                                {t.label}
                            </button>
                        );
                    })}
                    <div className="ml-auto pb-1">
                        <button
                            onClick={() => setShowNN(v => !v)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                                showNN
                                    ? 'bg-slate-700 text-white border-slate-700'
                                    : 'border-slate-400 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            N/N
                        </button>
                    </div>
                </div>

                {/* N/N form */}
                {showNN && (
                    <div className="px-5 py-3 bg-slate-50/80 border-b">
                        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                            Práctica sin nomenclador (S/C)
                        </p>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Descripción de la práctica..."
                                value={nnDesc}
                                onChange={e => setNNDesc(e.target.value)}
                                onBlur={e => setNNDesc(toSentenceCase(e.target.value))}
                                className="flex-1"
                            />
                            <Input
                                type="number"
                                min={0}
                                placeholder="Valor ($)"
                                value={nnPrice}
                                onChange={e => setNNPrice(e.target.value)}
                                className="w-28"
                            />
                            <button
                                onClick={handleAddNN}
                                disabled={!nnDesc.trim()}
                                className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg font-semibold disabled:opacity-40 hover:bg-slate-800 transition-colors"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                )}

                {/* Search input */}
                <div className="px-5 py-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            placeholder="Código o descripción (ej: RMN, consulta, 420101)..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            Buscando...
                        </div>
                    ) : query.length < 2 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                            <Package className="h-10 w-10 opacity-30" />
                            <p className="text-sm">Escribí al menos 2 caracteres para buscar</p>
                        </div>
                    ) : displayResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                            <Search className="h-8 w-8 opacity-30" />
                            <p className="text-sm">Sin resultados para &ldquo;{query}&rdquo;</p>
                            <button
                                onClick={() => setShowNN(true)}
                                className="text-xs text-blue-600 hover:underline mt-1"
                            >
                                ¿No encontrás la práctica? Agregá una N/N
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Encabezado */}
                            <div className="grid grid-cols-[2.5rem_5.5rem_1fr_5.5rem] gap-2 px-5 py-2 bg-muted/30 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sticky top-0">
                                <span>N.</span>
                                <span>Código</span>
                                <span>Denominación</span>
                                <span className="text-right">Unitario est.</span>
                            </div>
                            {displayResults.map(p => {
                                const abbr = ABBR_MAP[p.nomenclator_type ?? ''] ?? 'N/N';
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => { onSelectPractice(p); onClose(); }}
                                        className="w-full grid grid-cols-[2.5rem_5.5rem_1fr_5.5rem] gap-2 items-center px-5 py-2.5 border-b last:border-0 hover:bg-blue-50/60 text-left transition-colors"
                                    >
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-center ${NOMENCLATOR_COLORS[abbr]}`}>
                                            {abbr}
                                        </span>
                                        <span className="font-mono font-semibold text-xs">{p.code}</span>
                                        <span className="truncate text-sm">{p.description}</span>
                                        <span className="text-right font-mono text-xs text-muted-foreground">
                                            ${(p.financial_value ?? 0).toLocaleString('es-AR')}
                                        </span>
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                        {displayResults.length > 0 ? `${displayResults.length} resultado(s)` : ''}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-muted hover:bg-muted/70 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
