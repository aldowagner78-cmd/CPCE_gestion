"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Jurisdiction } from '@/types/database'

type JurisdictionContextType = {
    activeJurisdiction: Jurisdiction | null
    setJurisdiction: (jurisdiction: Jurisdiction) => void
    isLoading: boolean
    isDarkMode: boolean
    toggleDarkMode: () => void
}

// Default configurations for the two chambers
const CAMERA_I: Jurisdiction = {
    id: 1,
    name: "Cámara I - Santa Fe",
    theme_config: { primaryColor: "blue", secondaryColor: "slate" },
    created_at: new Date().toISOString()
}

const CAMERA_II: Jurisdiction = {
    id: 2,
    name: "Cámara II - Rosario",
    theme_config: { primaryColor: "emerald", secondaryColor: "red" },
    created_at: new Date().toISOString()
}

const JurisdictionContext = createContext<JurisdictionContextType | undefined>(undefined)

export function JurisdictionProvider({ children }: { children: ReactNode }) {
    const [activeJurisdiction, setActiveJurisdiction] = useState<Jurisdiction | null>(() => {
        if (typeof window === 'undefined') return CAMERA_I;
        const savedJurisdictionId = localStorage.getItem('jurisdictionId');
        if (savedJurisdictionId === '2') return CAMERA_II;
        return CAMERA_I;
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    })

    // Apply Jurisdiction Theme
    useEffect(() => {
        if (activeJurisdiction) {
            const theme = activeJurisdiction.id === 1 ? 'camera-i' : 'camera-ii'
            document.documentElement.setAttribute('data-theme', theme)
            localStorage.setItem('jurisdictionId', activeJurisdiction.id.toString())
        }
    }, [activeJurisdiction])

    // Apply Dark Mode
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [isDarkMode])

    const setJurisdiction = (jurisdiction: Jurisdiction) => {
        setIsLoading(true)
        setActiveJurisdiction(jurisdiction)
        setTimeout(() => setIsLoading(false), 300)
    }

    const toggleDarkMode = () => {
        setIsDarkMode(prev => !prev)
    }

    return (
        <JurisdictionContext.Provider value={{
            activeJurisdiction,
            setJurisdiction,
            isLoading,
            isDarkMode,
            toggleDarkMode
        }}>
            {children}
        </JurisdictionContext.Provider>
    )
}

export function useJurisdiction() {
    const context = useContext(JurisdictionContext)
    if (context === undefined) {
        throw new Error('useJurisdiction must be used within a JurisdictionProvider')
    }
    return context
}

export { CAMERA_I, CAMERA_II }
