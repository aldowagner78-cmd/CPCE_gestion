'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isSupabaseEnabled } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, Mail, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')

    const router = useRouter()
    const searchParams = useSearchParams()

    const errorParam = searchParams.get('error')

    const cleanState = () => {
        setError(null)
        setSuccess(null)
        setPassword('')
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!isSupabaseEnabled()) {
                // Mock login - accept any credentials
                if (email && password) {
                    // Simulate delay
                    await new Promise(resolve => setTimeout(resolve, 500))
                    router.push('/')
                    router.refresh()
                } else {
                    setError('Email y contraseña requeridos')
                }
                return
            }

            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            
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

            router.push('/')
            router.refresh()
        } catch (err) {
            setError('Error de conexión. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!isSupabaseEnabled()) {
                // Mock register - accept any registration
                if (email && password && fullName) {
                    await new Promise(resolve => setTimeout(resolve, 500))
                    setSuccess('Cuenta creada exitosamente. Ya puede iniciar sesión.')
                    setMode('login')
                    setPassword('')
                } else {
                    setError('Todos los campos son requeridos')
                }
                return
            }

            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            })

            if (signUpError) {
                setError(signUpError.message)
                return
            }

            if (data.user) {
                setSuccess('Cuenta creada exitosamente. Ya puede iniciar sesión.')
                setMode('login')
                setPassword('') // Clear password for login
            }
        } catch (err) {
            setError('Error al registrarse. Intente nuevamente.')
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
        setError(null)

        try {
            if (!isSupabaseEnabled()) {
                // Mock forgot password
                await new Promise(resolve => setTimeout(resolve, 500))
                setSuccess('Se envió un email con instrucciones para restablecer su contraseña.')
                return
            }

            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                setError(error.message)
                return
            }

            setSuccess('Se envió un email con instrucciones para restablecer su contraseña.')
        } catch (err) {
            setError('Error al enviar el email. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 p-4">
            <div className="w-full max-w-md">
                {/* Logo e Identidad Institucional */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <div className="relative w-32 h-32 p-4 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <Image
                                src="/logo.png"
                                alt="Logo CPCE"
                                width={100}
                                height={100}
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-blue-900 tracking-tight">CPCE Salud</h1>
                    <p className="text-sm font-medium text-blue-600 mt-2 uppercase tracking-wide">
                        Consejo Profesional de Ciencias Económicas
                    </p>
                </div>

                <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                    <CardHeader className="pb-4 border-b bg-gray-50/50">
                        <CardTitle className="text-xl text-center text-gray-800">
                            {mode === 'login' && 'Iniciar Sesión'}
                            {mode === 'register' && 'Crear Cuenta'}
                            {mode === 'forgot' && 'Recuperar Contraseña'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {mode === 'login' && 'Ingrese sus credenciales para acceder al sistema'}
                            {mode === 'register' && 'Complete sus datos para registrarse'}
                            {mode === 'forgot' && 'Ingrese su email para recibir instrucciones'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {/* Mensajes de feedback */}
                        {(error || errorParam === 'inactive') && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {errorParam === 'inactive'
                                        ? 'Su cuenta está desactivada. Contacte al administrador.'
                                        : error
                                    }
                                </AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                                <AlertTriangle className="h-4 w-4 text-green-600" />
                                <AlertDescription>
                                    {success}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Formularios */}
                        {mode === 'login' && (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="nombre@ejemplo.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10"
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ingresar'}
                                </Button>
                            </form>
                        )}

                        {mode === 'register' && (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Nombre Completo</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="Juan Pérez"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Email</Label>
                                    <Input
                                        id="reg-email"
                                        type="email"
                                        placeholder="nombre@ejemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Contraseña</Label>
                                    <Input
                                        id="reg-password"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        disabled={loading}
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Crear Cuenta'}
                                </Button>
                            </form>
                        )}

                        {mode === 'forgot' && (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reset-email">Email</Label>
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="nombre@ejemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enviar Instrucciones'}
                                </Button>
                            </form>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-2 border-t pt-4 bg-gray-50/50">
                        {mode === 'login' && (
                            <>
                                <button
                                    onClick={() => { cleanState(); setMode('forgot') }}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    ¿Olvidó su contraseña?
                                </button>
                                <div className="text-sm text-gray-500">
                                    ¿No tiene cuenta?{' '}
                                    <button
                                        onClick={() => { cleanState(); setMode('register') }}
                                        className="font-medium text-blue-700 hover:underline"
                                    >
                                        Registrarse
                                    </button>
                                </div>
                            </>
                        )}

                        {(mode === 'register' || mode === 'forgot') && (
                            <button
                                onClick={() => { cleanState(); setMode('login') }}
                                className="text-sm text-blue-600 hover:underline font-medium"
                            >
                                ← Volver al inicio de sesión
                            </button>
                        )}
                    </CardFooter>
                </Card>

                <div className="mt-8 text-center text-xs text-blue-300">
                    <p>Sistema de Gestión Integral</p>
                    <p>CPCE Santa Fe • Cámara II</p>
                </div>
            </div>
        </div>
    )
}

