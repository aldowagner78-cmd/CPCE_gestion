'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { AuthModal } from '@/components/auth/AuthModal'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function WelcomePage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [phase, setPhase] = useState<'splash' | 'auth'>('splash')

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.replace('/')
        }
    }, [user, loading, router])

    // Splash → Auth transition after 2.5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setPhase('auth')
        }, 2500)
        return () => clearTimeout(timer)
    }, [])

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )
    }

    return (
        <div className="h-screen overflow-hidden relative flex items-center justify-center">
            {/* Animated Background - dims when auth modal appears */}
            <div className={`absolute inset-0 transition-all duration-1000 ${
                phase === 'splash'
                    ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700'
                    : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900'
            }`} />
            <div className={`absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl transition-opacity duration-1000 ${
                phase === 'splash' ? 'bg-blue-400/20 animate-pulse' : 'bg-blue-400/5'
            }`} />
            <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl transition-opacity duration-1000 ${
                phase === 'splash' ? 'bg-purple-400/20 animate-pulse' : 'bg-purple-400/5'
            }`} />
            <div className={`absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full blur-2xl transition-opacity duration-1000 ${
                phase === 'splash' ? 'bg-indigo-300/10 animate-pulse' : 'bg-indigo-300/5'
            }`} style={{ animationDelay: '1s' }} />

            {/* Content Container - centered, no scroll */}
            <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center">

                {/* SPLASH PHASE: Logo + Title + Message */}
                <div
                    className={`flex flex-col items-center text-center transition-all duration-700 ease-in-out ${
                        phase === 'splash'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 -translate-y-8 absolute pointer-events-none'
                    }`}
                >
                    {/* Logo */}
                    <div className="w-28 h-28 p-4 bg-white/95 rounded-full shadow-2xl flex items-center justify-center ring-4 ring-white/30 mb-8">
                        <Image
                            src="/logo.png"
                            alt="Logo CPCE"
                            width={88}
                            height={88}
                            className="object-contain"
                            priority
                        />
                    </div>

                    {/* Title */}
                    <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
                        CPCE Salud
                    </h1>
                    <p className="text-blue-200 text-sm font-semibold uppercase tracking-[0.25em] mb-8">
                        Consejo Profesional de Ciencias Económicas
                    </p>

                    {/* Welcome message */}
                    <p className="text-white/80 text-lg font-light leading-relaxed max-w-sm">
                        Sistema integral de gestión de auditorías y cobertura de servicios de salud
                    </p>

                    {/* Loading dots */}
                    <div className="flex gap-2 mt-10">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                </div>

                {/* AUTH PHASE: Small logo + Auth Modal */}
                <div
                    className={`w-full flex flex-col items-center transition-all duration-700 ease-in-out ${
                        phase === 'auth'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-8 absolute pointer-events-none'
                    }`}
                >
                    {/* Auth Modal (logo integrated in card header) */}
                    <AuthModal
                        onLoginSuccess={() => {
                            router.push('/')
                        }}
                    />

                    {/* Footer */}
                    <p className="text-blue-200/60 text-xs mt-6 text-center">
                        © 2024 CPCE Salud · Acceso restringido
                    </p>
                </div>
            </div>
        </div>
    )
}
