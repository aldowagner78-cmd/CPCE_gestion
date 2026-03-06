import { useState, useEffect, useRef, useCallback } from 'react';

export interface AutocompleteOption {
    id: string | number;
    label: string;
    value?: string;
    metadata?: Record<string, unknown>;
}

export interface UseAutocompleteOptions<T extends AutocompleteOption> {
    /** Search function that returns matching options */
    searchFn: (query: string) => Promise<T[]>;
    /** Minimum characters before search starts */
    minChars?: number;
    /** Debounce delay in ms */
    debounceMs?: number;
    /** Enable result caching */
    enableCache?: boolean;
    /** Maximum number of results to show */
    maxResults?: number;
}

export function useAutocomplete<T extends AutocompleteOption>({
    searchFn,
    minChars = 2,
    debounceMs = 300,
    enableCache = true,
    maxResults = 10,
}: UseAutocompleteOptions<T>) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const cacheRef = useRef<Map<string, T[]>>(new Map());
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Select an option
    const selectOption = useCallback((option: T) => {
        setQuery(option.label);
        setIsOpen(false);
        setSelectedIndex(-1);
        setResults([]);
    }, []);

    // Perform search
    const performSearch = useCallback(async (q: string) => {
        if (q.length < minChars) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        // Check cache
        if (enableCache && cacheRef.current.has(q)) {
            setResults(cacheRef.current.get(q) || []);
            setIsOpen(true);
            return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        try {
            const data = await searchFn(q);
            const limited = data.slice(0, maxResults);
            
            if (enableCache) {
                cacheRef.current.set(q, limited);
            }

            setResults(limited);
            setIsOpen(limited.length > 0);
            setSelectedIndex(-1);
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Autocomplete search error:', error);
            }
            setResults([]);
            setIsOpen(false);
        } finally {
            setLoading(false);
        }
    }, [searchFn, minChars, enableCache, maxResults]);

    // Debounced search handler
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            performSearch(query);
        }, debounceMs);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [query, debounceMs, performSearch]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < results.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    selectOption(results[selectedIndex]);
                }
                break;
        }
    }, [isOpen, results, selectedIndex, selectOption]);

    // Clear selection
    const clear = useCallback(() => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        cacheRef.current.clear();
    }, []);

    // Close dropdown
    const close = useCallback(() => {
        setIsOpen(false);
        setSelectedIndex(-1);
    }, []);

    return {
        query,
        setQuery,
        results,
        loading,
        isOpen,
        setIsOpen,
        selectedIndex,
        handleKeyDown,
        selectOption,
        clear,
        close,
    };
}
