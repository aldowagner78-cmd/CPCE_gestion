"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
    /** Current page (1-based) */
    page: number
    /** Total number of items */
    totalItems: number
    /** Items per page (default 15) */
    pageSize?: number
    /** Called when page changes */
    onPageChange: (page: number) => void
    /** Label for items (e.g. "auditorías", "afiliados") */
    itemLabel?: string
}

export function Pagination({
    page,
    totalItems,
    pageSize = 15,
    onPageChange,
    itemLabel = "registros",
}: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, totalItems)

    if (totalItems <= pageSize) {
        // Single page — show only the summary
        return (
            <div className="text-xs text-muted-foreground text-center py-2">
                {totalItems} {itemLabel}
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted-foreground">
                {from}–{to} de {totalItems} {itemLabel}
            </span>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => onPageChange(1)}
                    title="Primera página"
                >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    title="Anterior"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium px-2 min-w-[60px] text-center">
                    {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    title="Siguiente"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(totalPages)}
                    title="Última página"
                >
                    <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}

/**
 * Helper hook: paginate a pre-filtered array client-side.
 * Returns the sliced items for the current page.
 */
export function paginateArray<T>(items: T[], page: number, pageSize: number = 15): T[] {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
}
