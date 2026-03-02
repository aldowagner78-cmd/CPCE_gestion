'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import { AuthModal } from '@/components/auth/AuthModal'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function WelcomePage() {
    const router = useRouter()
    const { user, loading } = useAuth()

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.replace('/')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl -z-10" />

            <div className="w-full max-w-4xl flex flex-col items-center gap-12">
                {/* Welcome Section */}
                <div className="text-center space-y-6 max-w-2xl">
                    {/* Logo */}
                    <div className="flex justify-center">
                        <div className="relative w-24 h-24 p-3 bg-white rounded-full shadow-lg flex items-center justify-center ring-2 ring-blue-100">
                            <Image
                                src="/logo.png"
                                alt="Logo CPCE"
                                width={80}
                                height={80}
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-2">
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-900 to-indigo-900 bg-clip-text text-transparent">
                            CPCE Salud
                        </h1>
                        <p className="text-lg font-semibold text-blue-600 uppercase tracking-widest">
                            Consejo Profesional de Ciencias Económicas
                        </p>
                    </div>

                    {/* Welcome Message */}
                    <div className="space-y-4 text-gray-700">
                        <p className="text-xl font-light leading-relaxed">
                            Bienvenido al sistema integral de gestión de auditorías y cobertura de servicios de salud.
                        </p>
                        <p className="text-base text-gray-600 leading-relaxed">
                            Accede a tu cuenta para gestionar pacientes, auditorías, agendas, alertas y mucho más.
                            Un sistema moderno, seguro y diseñado para profesionales como vos.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pb-8">
                        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                            <div className="text-2xl mb-2">📋</div>
                            <h3 className="font-semibold text-gray-900 text-sm mb-1">Auditorías</h3>
                            <p className="text-xs text-gray-600">Gestiona casos y auditorías de cobertura</p>
                        </div>
                        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                            <div className="text-2xl mb-2">👥</div>
                            <h3 className="font-semibold text-gray-900 text-sm mb-1">Pacientes</h3>
                            <p className="text-xs text-gray-600">Administra registros y datos de pacientes</p>
                        </div>
                        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                            <div className="text-2xl mb-2">⏰</div>
                            <h3 className="font-semibold text-gray-900 text-sm mb-1">Agenda</h3>
                            <p className="text-xs text-gray-600">Planifica consultas y reuniones</p>
                        </div>
                    </div>
                </div>

                {/* Auth Modal - Centered */}
                <div className="w-full max-w-md">
                    <AuthModal
                        onLoginSuccess={() => {
                            router.push('/')
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 mt-8 border-t border-gray-200 pt-6 w-full">
                    <p>© 2024 CPCE Salud. Todos los derechos reservados.</p>
                    <p className="text-xs mt-2">
                        Este sistema es de acceso restringido. Para solicitar acceso, contacte a administración.
                    </p>
                </div>
            </div>
        </div>
    )
}
