"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, UserCheck, UserX, UserPlus, Plus, Edit, Trash2, Calendar, Shield, Settings } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  profile: "Admin" | "Gestor Operacional" | "CCO" | "Prestador de Serviços"
  status: "Ativo" | "Inativo"
  createdAt: string
}

export default function AdminDashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    profile: "",
    status: "Ativo",
  })

  // Dados fictícios
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "João Silva",
      email: "joao.silva@empresa.pt",
      profile: "Admin",
      status: "Ativo",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria.santos@empresa.pt",
      profile: "Gestor Operacional",
      status: "Ativo",
      createdAt: "2024-01-20",
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro.costa@empresa.pt",
      profile: "CCO",
      status: "Ativo",
      createdAt: "2024-01-25",
    },
    {
      id: "4",
      name: "Ana Ferreira",
      email: "ana.ferreira@prestador.pt",
      profile: "Prestador de Serviços",
      status: "Inativo",
      createdAt: "2024-02-01",
    },
    {
      id: "5",
      name: "Carlos Oliveira",
      email: "carlos.oliveira@prestador.pt",
      profile: "Prestador de Serviços",
      status: "Ativo",
      createdAt: "2024-02-10",
    },
  ])

  const totalUsers = users.length
  const activeUsers = users.filter((user) => user.status === "Ativo").length
  const inactiveUsers = users.filter((user) => user.status === "Inativo").length
  const lastCreatedUser = users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      profile: "",
      status: "Ativo",
    })
  }

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.profile) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    const newUser: User = {
      id: (users.length + 1).toString(),
      name: formData.name,
      email: formData.email,
      profile: formData.profile as User["profile"],
      status: formData.status as User["status"],
      createdAt: new Date().toISOString().split("T")[0],
    }

    setUsers([...users, newUser])
    setIsCreateModalOpen(false)
    resetForm()
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      profile: user.profile,
      status: user.status,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateUser = () => {
    if (!editingUser || !formData.name || !formData.email || !formData.profile) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setUsers(
      users.map((user) =>
        user.id === editingUser.id
          ? {
              ...user,
              name: formData.name,
              email: formData.email,
              profile: formData.profile as User["profile"],
              status: formData.status as User["status"],
            }
          : user,
      ),
    )
    setIsEditModalOpen(false)
    setEditingUser(null)
    resetForm()
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("Tem certeza que deseja apagar esta conta?")) {
      setUsers(users.filter((user) => user.id !== userId))
    }
  }

  const getProfileIcon = (profile: string) => {
    switch (profile) {
      case "Admin":
        return <Shield className="w-4 h-4" />
      case "Gestor Operacional":
        return <Settings className="w-4 h-4" />
      case "CCO":
        return <Users className="w-4 h-4" />
      case "Prestador de Serviços":
        return <UserCheck className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case "Admin":
        return "bg-red-100 text-red-800"
      case "Gestor Operacional":
        return "bg-blue-100 text-blue-800"
      case "CCO":
        return "bg-purple-100 text-purple-800"
      case "Prestador de Serviços":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Gestão de contas e utilizadores do sistema</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Contas</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
              <p className="text-xs text-gray-500 mt-1">Contas registadas no sistema</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Contas Ativas</CardTitle>
              <UserCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeUsers}</div>
              <p className="text-xs text-gray-500 mt-1">Utilizadores ativos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Contas Inativas</CardTitle>
              <UserX className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{inactiveUsers}</div>
              <p className="text-xs text-gray-500 mt-1">Utilizadores inativos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Última Conta</CardTitle>
              <Calendar className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-gray-900">{lastCreatedUser?.name}</div>
              <p className="text-xs text-gray-500 mt-1">
                Criada em {new Date(lastCreatedUser?.createdAt || "").toLocaleDateString("pt-PT")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gestão de Contas */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Gestão de Contas</CardTitle>
                <CardDescription className="text-gray-600">
                  Crie, edite e gerencie as contas de utilizadores do sistema
                </CardDescription>
              </div>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Conta
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Criar Nova Conta
                    </DialogTitle>
                    <DialogDescription>Preencha os dados para criar uma nova conta de utilizador.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        placeholder="Nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile">Perfil *</Label>
                      <Select
                        value={formData.profile}
                        onValueChange={(value) => setFormData({ ...formData, profile: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Gestor Operacional">Gestor Operacional</SelectItem>
                          <SelectItem value="CCO">CCO</SelectItem>
                          <SelectItem value="Prestador de Serviços">Prestador de Serviços</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Estado</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateModalOpen(false)
                        resetForm()
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateUser}>Criar Conta</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabela de Contas */}
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Perfil</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Data de Criação</TableHead>
                    <TableHead className="font-semibold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={`${getProfileColor(user.profile)} flex items-center gap-1 w-fit`}>
                          {getProfileIcon(user.profile)}
                          {user.profile}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === "Ativo" ? "default" : "secondary"}
                          className={
                            user.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString("pt-PT")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="hover:bg-red-50 hover:border-red-300 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Editar Conta
              </DialogTitle>
              <DialogDescription>Atualize os dados da conta de utilizador.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Nova Password (opcional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-profile">Perfil *</Label>
                <Select
                  value={formData.profile}
                  onValueChange={(value) => setFormData({ ...formData, profile: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Gestor Operacional">Gestor Operacional</SelectItem>
                    <SelectItem value="CCO">CCO</SelectItem>
                    <SelectItem value="Prestador de Serviços">Prestador de Serviços</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Estado</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingUser(null)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser}>Atualizar Conta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
