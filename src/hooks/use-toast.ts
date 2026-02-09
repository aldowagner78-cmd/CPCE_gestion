import { useState, useEffect } from 'react'

export interface Toast {
    variant?: 'default' | 'destructive'
    title: string
    description?: string
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = (toast: Toast) => {
        setToasts((prev) => [...prev, toast])
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            setToasts((prev) => prev.slice(1))
        }, 3000)
    }

    return { toast, toasts }
}
