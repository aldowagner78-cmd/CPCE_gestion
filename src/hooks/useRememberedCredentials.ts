import { useEffect, useState } from 'react'

interface RememberedCredentials {
    email: string
    rememberMe: boolean
}

const STORAGE_KEY = 'cpce_remembered_credentials'

export function useRememberedCredentials() {
    const [credentials, setCredentials] = useState<RememberedCredentials | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored) as RememberedCredentials
                setCredentials(parsed)
            }
        } catch (error) {
            console.error('Error loading remembered credentials:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const save = (email: string, rememberMe: boolean) => {
        if (rememberMe) {
            const toStore: RememberedCredentials = { email, rememberMe: true }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
            setCredentials(toStore)
        } else {
            // Don't save if user didn't check "Remember Me"
            clear()
        }
    }

    const clear = () => {
        localStorage.removeItem(STORAGE_KEY)
        setCredentials(null)
    }

    return {
        credentials,
        isLoading,
        save,
        clear,
    }
}
