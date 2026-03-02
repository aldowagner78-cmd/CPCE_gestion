'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Loader2, Lock, Mail, Trash2, Power, RefreshCw, Clock, LogOut } from 'lucide-react'

interface UserWithCredentials {
    id: string
    email: string
    full_name: string
    is_active: boolean
    role: string
    last_sign_in_at: string | null
}

export function SuperuserCredentialPanel() {
    const { user, hasPermission } = useAuth()
    const [users, setUsers] = useState<UserWithCredentials[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedUser, setSelectedUser] = useState<UserWithCredentials | null>(null)
    const [actionDialogOpen, setActionDialogOpen] = useState(false)
    const [actionType, setActionType] = useState<'reset' | 'force-change' | 'toggle-active' | 'invalidate-sessions' | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionSuccess, setActionSuccess] = useState(false)

    const supabase = createClient()

    // Check permissions
    const canManageCredentials = user && (user.role === 'superuser' || hasPermission?.('users.manage'))

    useEffect(() => {
        if (!canManageCredentials) return
        loadUsers()
    }, [canManageCredentials])

    const loadUsers = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data, error: dbError } = await supabase
                .from('users')
                .select('id, email, full_name, is_active, role, last_sign_in_at')
                .order('created_at', { ascending: false })

            if (dbError) throw dbError
            setUsers(data || [])
        } catch (err) {
            setError(`Error loading users: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async () => {
        if (!selectedUser) return
        setActionLoading(true)

        try {
            // Send password reset email via Supabase
            const { error } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email: selectedUser.email,
                options: {
                    redirectTo: `${window.location.origin}/reset-password?force=true`,
                },
            })

            if (error) throw error

            setActionSuccess(true)
            setTimeout(() => {
                setActionDialogOpen(false)
                setActionSuccess(false)
                setSelectedUser(null)
                setActionType(null)
            }, 2000)
        } catch (err) {
            setError(`Error resetting password: ${err instanceof Error ? err.message : 'Unknown'}`)
        } finally {
            setActionLoading(false)
        }
    }

    const handleToggleActive = async () => {
        if (!selectedUser) return
        setActionLoading(true)

        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: !selectedUser.is_active })
                .eq('id', selectedUser.id)

            if (error) throw error

            setUsers(users.map(u => u.id === selectedUser.id ? { ...u, is_active: !u.is_active } : u))
            setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active })
            setActionSuccess(true)

            setTimeout(() => {
                setActionDialogOpen(false)
                setActionSuccess(false)
                setSelectedUser(null)
                setActionType(null)
            }, 2000)
        } catch (err) {
            setError(`Error toggling user status: ${err instanceof Error ? err.message : 'Unknown'}`)
        } finally {
            setActionLoading(false)
        }
    }

    const handleInvalidateSessions = async () => {
        if (!selectedUser) return
        setActionLoading(true)

        try {
            // Invalidate all sessions by updating last_sign_in_at
            const { error } = await supabase
                .from('users')
                .update({ last_session_invalidated_at: new Date().toISOString() })
                .eq('id', selectedUser.id)

            if (error) throw error

            setActionSuccess(true)
            setTimeout(() => {
                setActionDialogOpen(false)
                setActionSuccess(false)
                setSelectedUser(null)
                setActionType(null)
            }, 2000)
        } catch (err) {
            setError(`Error invalidating sessions: ${err instanceof Error ? err.message : 'Unknown'}`)
        } finally {
            setActionLoading(false)
        }
    }

    if (!canManageCredentials) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    No tiene permisos para acceder a este panel. Solo superuser y admin pueden gestionar credenciales.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Credenciales</h1>
                    <p className="text-gray-600 mt-1">Administra contraseñas, activación y sesiones de usuarios</p>
                </div>
                <Button onClick={loadUsers} disabled={loading} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recargar
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {users.map((user) => (
                        <Card key={user.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                            <Badge variant="outline">{user.role}</Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            {user.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Last login info */}
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600 flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        Último acceso:{' '}
                                        {user.last_sign_in_at
                                            ? new Date(user.last_sign_in_at).toLocaleString('es-AR')
                                            : 'Nunca'}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedUser(user)
                                            setActionType('reset')
                                            setActionDialogOpen(true)
                                        }}
                                        className="gap-1"
                                    >
                                        <Lock className="h-4 w-4" />
                                        Reset Contraseña
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedUser(user)
                                            setActionType('toggle-active')
                                            setActionDialogOpen(true)
                                        }}
                                        className="gap-1"
                                    >
                                        <Power className="h-4 w-4" />
                                        {user.is_active ? 'Desactivar' : 'Activar'}
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedUser(user)
                                            setActionType('invalidate-sessions')
                                            setActionDialogOpen(true)
                                        }}
                                        className="gap-1"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Cerrar Sesiones
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'reset' && 'Reset de Contraseña'}
                            {actionType === 'force-change' && 'Forzar Cambio de Contraseña'}
                            {actionType === 'toggle-active' && `${selectedUser?.is_active ? 'Desactivar' : 'Activar'} Usuario`}
                            {actionType === 'invalidate-sessions' && 'Cerrar todas las sesiones'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'reset' && `Se enviará un email a ${selectedUser?.email} con instrucciones para restablecer su contraseña.`}
                            {actionType === 'toggle-active' && `El usuario será ${selectedUser?.is_active ? 'desactivado' : 'activado'} y perderá acceso al sistema.`}
                            {actionType === 'invalidate-sessions' && 'Se cerrarán todas las sesiones activas de este usuario.'}
                        </DialogDescription>
                    </DialogHeader>

                    {actionSuccess && (
                        <Alert className="bg-green-50 border-green-200 text-green-800">
                            <AlertTriangle className="h-4 w-4 text-green-600" />
                            <AlertDescription>¡Operación completada exitosamente!</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                if (actionType === 'reset') handleResetPassword()
                                if (actionType === 'toggle-active') handleToggleActive()
                                if (actionType === 'invalidate-sessions') handleInvalidateSessions()
                            }}
                            disabled={actionLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {actionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                'Confirmar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
