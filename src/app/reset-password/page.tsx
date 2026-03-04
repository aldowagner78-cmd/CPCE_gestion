'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = createClient()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)

    // Verify if there is a session (Supabase automatically logs in the user via the recovery link)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // If there is no session, the link is invalid or expired
                router.replace('/welcome')
            } else {
                setCheckingSession(false)
            }
        }
        checkSession()
    }, [router, supabase])

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        setLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                setError(updateError.message)
                return
            }

            setSuccess('Contraseña actualizada exitosamente.')
            setTimeout(() => {
                router.push('/')
            }, 2000)

        } catch {
            setError('Error de conexión. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    if (checkingSession) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 overflow-hidden">
            {/* Animated Background matching WelcomePage auth phase */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl bg-blue-400/5 transition-opacity duration-1000" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl bg-purple-400/5 transition-opacity duration-1000" />
            <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full blur-2xl bg-indigo-300/5 transition-opacity duration-1000" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center">
                <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden w-full">
                    {/* Integrated branded header */}
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-5">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 p-1.5 bg-white rounded-full shadow-md flex items-center justify-center flex-shrink-0">
                                <Image
                                    src="/logo.png"
                                    alt="Logo CPCE"
                                    width={28}
                                    height={28}
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight">CPCE Salud</h2>
                                <p className="text-blue-200 text-[10px] uppercase tracking-widest">Sistema de gestión</p>
                            </div>
                        </div>
                    </div>

                    <CardHeader className="pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 pt-4">
                        <CardTitle className="text-xl text-center text-gray-800">
                            Nueva Contraseña
                        </CardTitle>
                        <CardDescription className="text-center text-sm">
                            Ingrese su nueva contraseña para acceder al sistema
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                                <AlertTriangle className="h-4 w-4 text-green-600" />
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    Nueva Contraseña
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading || !!success}
                                        className="pl-10 pr-10"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={loading || !!success}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                    Confirmar Contraseña
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={loading || !!success}
                                        className="pl-10 pr-10"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={loading || !!success}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                                disabled={loading || !!success}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Actualizando...
                                    </>
                                ) : success ? (
                                    '¡Actualizada!'
                                ) : (
                                    'Guardar Contraseña'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-blue-200/60 text-xs mt-6 text-center">
                    © 2026 CPCE Salud · Acceso restringido
                </p>
            </div>
        </div>
    )
}
