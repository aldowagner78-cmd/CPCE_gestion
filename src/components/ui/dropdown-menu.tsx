'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextType {
    open: boolean
    setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null)

function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)

    return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block text-left">
                {children}
            </div>
        </DropdownMenuContext.Provider>
    )
}

function DropdownMenuTrigger({
    children,
    asChild
}: {
    children: React.ReactNode
    asChild?: boolean
}) {
    const context = React.useContext(DropdownMenuContext)
    if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu")

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        context.setOpen(!context.open)
    }

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
            onClick: handleClick,
        })
    }

    return <button onClick={handleClick}>{children}</button>
}

function DropdownMenuContent({
    children,
    className,
    align = "end",
}: {
    children: React.ReactNode
    className?: string
    align?: "start" | "center" | "end"
}) {
    const context = React.useContext(DropdownMenuContext)
    if (!context) throw new Error("DropdownMenuContent must be used within DropdownMenu")

    if (!context.open) return null

    const alignClass = {
        start: "left-0",
        center: "left-1/2 -translate-x-1/2",
        end: "right-0",
    }[align]

    return (
        <>
            <div
                className="fixed inset-0 z-40"
                onClick={() => context.setOpen(false)}
            />
            <div
                className={cn(
                    "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                    alignClass,
                    className
                )}
            >
                {children}
            </div>
        </>
    )
}

function DropdownMenuItem({
    children,
    className,
    onClick,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClick?: () => void }) {
    const context = React.useContext(DropdownMenuContext)

    const handleClick = () => {
        onClick?.()
        context?.setOpen(false)
    }

    return (
        <div
            onClick={handleClick}
            className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function DropdownMenuLabel({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("px-2 py-1.5 text-sm font-semibold", className)}
            {...props}
        />
    )
}

function DropdownMenuSeparator({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("-mx-1 my-1 h-px bg-muted", className)}
            {...props}
        />
    )
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
}
