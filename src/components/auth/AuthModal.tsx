'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRememberedCredentials } from '@/hooks/useRememberedCredentials'
import { Lock, Mail, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'

type AuthModalMode = 'login' | 'forgot'

interface AuthModalProps {
    onLoginSuccess?: () => void
    mode?: AuthModalMode
    onModeChange?: (mode: AuthModalMode) => void
    isOpen?: boolean
}

export function AuthModal({
    onLoginSuccess,
    mode: initialMode = 'login',
    onModeChange,
    isOpen = true,
}: AuthModalProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<AuthModalMode>(initialMode)

    const supabase = createClient()
    const { credentials, isLoading: credentialsLoading, save: saveCredentials, clear: clearCredentials } = useRememberedCredentials()

    // Load remembered credentials if available
    useEffect(() => {
        if (!credentialsLoading && credentials?.email) {
            setEmail(credentials.email)
            setRememberMe(true)
        }
    }, [credentialsLoading, credentials])

    const cleanState = () => {
        setError(null)
        setSuccess(null)
    }

    const handleModeChange = (newMode: AuthModalMode) => {
        cleanState()
        setPassword('')
        setMode(newMode)
        onModeChange?.(newMode)
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        cleanState()

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Email o contraseña incorrectos')
                } else {
                    setError(signInError.message)
                }
                return
            }

            // Save credentials if user checked "Remember Me"
            if (rememberMe) {
                saveCredentials(email, true)
            } else {
                clearCredentials()
            }

            setSuccess('¡Bienvenido!')
            setTimeout(() => {
                onLoginSuccess?.()
            }, 500)
        } catch {
            setError('Error de conexión. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setError('Ingrese su email para recuperar la contraseña')
            return
        }

        setLoading(true)
        cleanState()

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                setError(error.message)
                return
            }

            setSuccess('Se envió un email con instrucciones para restablecer su contraseña.')
            setTimeout(() => {
                handleModeChange('login')
            }, 2000)
        } catch {
            setError('Error al enviar el email. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="w-full max-w-md">
            <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden">
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
                        {mode === 'login' && 'Iniciar Sesión'}
                        {mode === 'forgot' && 'Recuperar Contraseña'}
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                        {mode === 'login' && 'Ingrese sus credenciales para acceder al sistema'}
                        {mode === 'forgot' && 'Ingrese su email para recibir instrucciones'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Success Alert */}
                    {success && (
                        <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                            <AlertTriangle className="h-4 w-4 text-green-600" />
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {/* Login Mode */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    Contraseña
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={loading}
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

                            {/* Remember Me */}
                            <div className="flex items-center gap-2">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={loading}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="remember-me" className="text-sm cursor-pointer">
                                    Recordarme en este dispositivo
                                </Label>
                            </div>

                            {/* Login Button */}
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Iniciando...
                                    </>
                                ) : (
                                    'Iniciar Sesión'
                                )}
                            </Button>

                            {/* Forgot Password Link */}
                            <button
                                type="button"
                                onClick={() => handleModeChange('forgot')}
                                disabled={loading}
                                className="w-full text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                            >
                                ¿Olvidó su contraseña?
                            </button>
                        </form>
                    )}

                    {/* Forgot Password Mode */}
                    {mode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="forgot-email" className="text-sm font-medium">
                                    Email
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="forgot-email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar Instrucciones'
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => handleModeChange('login')}
                                disabled={loading}
                                className="w-full text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                            >
                                Volver al login
                            </button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
