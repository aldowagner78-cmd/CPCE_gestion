'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Users, Plus, Search, MoreHorizontal, Loader2,
    UserCheck, UserX, Pencil, Trash2, Shield, AlertTriangle
} from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { userService } from '@/services/userService'
import type { AuthUser, UserRole } from '@/types/auth'
import { ROLE_LABELS, ROLE_COLORS } from '@/types/auth'

export default function UsersPage() {
    const { user: currentUser, hasPermission } = useAuth()
    const [users, setUsers] = useState<AuthUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
    const [saving, setSaving] = useState(false)

    // Form states
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'auditor' as UserRole,
        jurisdiction_id: 1,
    })

    // Check permission
    const canManageUsers = hasPermission('users.manage')

    // Load users
    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            setLoading(true)
            const data = await userService.listAll()
            setUsers(data)
        } catch (err) {
            setError('Error al cargar usuarios')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // Filtered users
    const filteredUsers = users.filter(u => {
        const matchesSearch =
            u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === 'all' || u.role === roleFilter
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && u.is_active) ||
            (statusFilter === 'inactive' && !u.is_active)

        return matchesSearch && matchesRole && matchesStatus
    })

    // Create user
    const handleCreate = async () => {
        try {
            setSaving(true)
            await userService.create(formData)
            await loadUsers()
            setShowCreateModal(false)
            resetForm()
        } catch (err) {
            setError('Error al crear usuario')
        } finally {
            setSaving(false)
        }
    }

    // Update user
    const handleUpdate = async () => {
        if (!selectedUser) return
        try {
            setSaving(true)
            await userService.update(selectedUser.id, {
                full_name: formData.full_name,
                role: formData.role,
                jurisdiction_id: formData.jurisdiction_id,
            })
            await loadUsers()
            setShowEditModal(false)
            setSelectedUser(null)
            resetForm()
        } catch (err) {
            setError('Error al actualizar usuario')
        } finally {
            setSaving(false)
        }
    }

    // Toggle active status
    const handleToggleActive = async (user: AuthUser) => {
        try {
            if (user.is_active) {
                await userService.deactivate(user.id)
            } else {
                await userService.activate(user.id)
            }
            await loadUsers()
        } catch (err) {
            setError('Error al cambiar estado')
        }
    }

    const resetForm = () => {
        setFormData({
            email: '',
            full_name: '',
            role: 'auditor',
            jurisdiction_id: 1,
        })
    }

    const openEditModal = (user: AuthUser) => {
        setSelectedUser(user)
        setFormData({
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            jurisdiction_id: user.jurisdiction_id ?? 1,
        })
        setShowEditModal(true)
    }

    // Access denied
    if (!canManageUsers) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
                        <p className="text-muted-foreground">
                            No tiene permisos para gestionar usuarios.
                            Esta función está reservada para el Superusuario.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-muted-foreground">
                        Administrar usuarios, roles y permisos del sistema
                    </p>
                </div>
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Usuario
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                            <DialogDescription>
                                El usuario recibirá un email para establecer su contraseña.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="usuario@cpce.org.ar"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input
                                    id="name"
                                    placeholder="Nombre y Apellido"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Rol</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="auditor">Auditor</SelectItem>
                                        <SelectItem value="administrativo">Administrativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Cámara</Label>
                                <Select
                                    value={String(formData.jurisdiction_id)}
                                    onValueChange={(v) => setFormData({ ...formData, jurisdiction_id: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Cámara I - Santa Fe</SelectItem>
                                        <SelectItem value="2">Cámara II - Rosario</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleCreate} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Crear Usuario
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o email..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="auditor">Auditor</SelectItem>
                                <SelectItem value="administrativo">Administrativo</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Activos</SelectItem>
                                <SelectItem value="inactive">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">Usuarios</CardTitle>
                        <Badge variant="secondary" className="ml-auto">
                            {filteredUsers.length} usuarios
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Cámara</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="w-[100px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {user.full_name}
                                                {user.is_superuser && (
                                                    <Shield className="h-4 w-4 text-purple-600" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={ROLE_COLORS[user.role]}>
                                                {ROLE_LABELS[user.role]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.jurisdiction_id === 1 ? 'Santa Fe' : 'Rosario'}
                                        </TableCell>
                                        <TableCell>
                                            {user.is_active ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    <UserCheck className="h-3 w-3 mr-1" />
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                                    <UserX className="h-3 w-3 mr-1" />
                                                    Inactivo
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {!user.is_superuser && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openEditModal(user)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                                            {user.is_active ? (
                                                                <>
                                                                    <UserX className="h-4 w-4 mr-2" />
                                                                    Desactivar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                                    Activar
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => {
                                                                if (confirm('¿Eliminar este usuario permanentemente?')) {
                                                                    userService.delete(user.id).then(loadUsers)
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No se encontraron usuarios
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>
                            Modificar datos del usuario {selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nombre Completo</Label>
                            <Input
                                id="edit-name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="auditor">Auditor</SelectItem>
                                    <SelectItem value="administrativo">Administrativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Cámara</Label>
                            <Select
                                value={String(formData.jurisdiction_id)}
                                onValueChange={(v) => setFormData({ ...formData, jurisdiction_id: parseInt(v) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Cámara I - Santa Fe</SelectItem>
                                    <SelectItem value="2">Cámara II - Rosario</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
