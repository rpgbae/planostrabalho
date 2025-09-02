"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Leaf, Bold as Road, Wrench, User, LogOut, LayoutDashboard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { format, getWeek, getYear, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import AdminDashboard from "@/components/admin-dashboard"
import { AutoEstradasSelect } from "@/components/auto-estradas-select"

// Tipagem para o intervalo de datas
interface DateRange {
  from?: Date
  to?: Date
}

// Tipagem para os detalhes diários
interface DailyDetail {
  timeSlot: string
  perfilTipo: string
  tipoTrabalho: string[]
  kmsInicio: string
  kmsFim: string
  sentido: string[]
  vias: string[]
  esqRef: string
  outrosLocais: string[]
  responsavelNome: string
  responsavelContacto: string
}

// Tipagem para um plano submetido
interface SubmittedPlan {
  id: string
  numero: string
  descricaoGeral: string
  periodo: DateRange
  detalhesDiarios: { [dateString: string]: DailyDetail }
  status: "Pendente Confirmação" | "Confirmado" | "Rejeitado"
  tipo: "Manutenção Vegetal" | "Beneficiação de Pavimento" | "Manutenção Geral"
  isInISistema: boolean
  comentarioGO?: string // Comentário do GO quando rejeita
}

export default function ServiceSchedulerApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [user, setUser] = useState({ name: "", email: "" })
  const [userRole, setUserRole] = useState<"prestador" | "go" | "cco" | "admin" | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [dailyDetails, setDailyDetails] = useState<{ [dateString: string]: DailyDetail }>({})
  const [isUrgente, setIsUrgente] = useState(false)

  const [vegetalNumero, setVegetalNumero] = useState("")
  const [vegetalDescricao, setVegetalDescricao] = useState("")
  const [submittedPlans, setSubmittedPlans] = useState<SubmittedPlan[]>([])
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<SubmittedPlan | null>(null)
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("vegetal")
  const [autoEstrada, setAutoEstrada] = useState("")
  const [kmInicial, setKmInicial] = useState("")
  const [kmFinal, setKmFinal] = useState("")

  // Novo estado para o pop-up de notificação
  const [notificationDialog, setNotificationDialog] = useState<{
    open: boolean
    title: string
    description: string
  }>({
    open: false,
    title: "",
    description: "",
  })

  // Estados para confirmação de aprovação/rejeição
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean
    type: "approve" | "reject"
    planId: string
    planTitle: string
  }>({
    open: false,
    type: "approve",
    planId: "",
    planTitle: "",
  })

  const [rejectionComment, setRejectionComment] = useState("")

  // Novo estado para o contador semanal
  const [weeklyPlanCounts, setWeeklyPlanCounts] = useState<{ [weekId: string]: number }>({})

  // Estados para o diálogo de planos semanais
  const [isWeeklyPlansDialogOpen, setIsWeeklyPlansDialogOpen] = useState(false)
  const [currentWeekPlans, setCurrentWeekPlans] = useState<SubmittedPlan[]>([])
  const [currentWeekTitle, setCurrentWeekTitle] = useState("")

  // Efeito para recalcular as datas bloqueadas e o contador semanal
  useEffect(() => {
    const newBlockedDates = new Set<string>()
    const newWeeklyCounts: { [weekId: string]: number } = {}

    submittedPlans.forEach((plan) => {
      // Lógica para datas bloqueadas
      if (plan.status === "Confirmado" && plan.periodo.from && plan.periodo.to) {
        const dates = getDatesInRange(plan.periodo.from, plan.periodo.to)
        dates.forEach((date) => newBlockedDates.add(format(date, "yyyy-MM-dd")))
      }

      // Lógica para contador semanal (baseado na data de início do plano)
      // APENAS PLANOS CONFIRMADOS E SEMANA DE SEGUNDA A SEXTA
      if (plan.status === "Confirmado" && plan.periodo.from) {
        const weekNum = getWeek(plan.periodo.from, { locale: ptBR, weekStartsOn: 1 }) // Semana começa na segunda
        const year = getYear(plan.periodo.from)
        const weekId = `${year}-Semana-${weekNum}`
        newWeeklyCounts[weekId] = (newWeeklyCounts[weekId] || 0) + 1
      }
    })
    setBlockedDates(newBlockedDates)
    setWeeklyPlanCounts(newWeeklyCounts)
  }, [submittedPlans])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginData.email === "prestador@teste.pt") {
      setUser({ name: "Prestador de Serviços", email: loginData.email })
      setUserRole("prestador")
      setIsLoggedIn(true)
      setActiveTab("vegetal")
    } else if (loginData.email === "go@teste.pt") {
      setUser({ name: "Gestor de Operações", email: loginData.email })
      setUserRole("go")
      setIsLoggedIn(true)
      setActiveTab("aprovacao")
    } else if (loginData.email === "cco@teste.pt") {
      setUser({ name: "Coordenador de Operações", email: loginData.email })
      setUserRole("cco")
      setIsLoggedIn(true)
      setActiveTab("dashboard-cco")
    } else if (loginData.email === "admin@teste.pt") {
      setUser({ name: "Administrador", email: loginData.email })
      setUserRole("admin")
      setIsLoggedIn(true)
      setActiveTab("admin-dashboard")
    } else {
      alert("Email ou senha inválidos.")
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUser({ name: "", email: "" })
    setUserRole(null)
    setLoginData({ email: "", password: "" })
    setDateRange(undefined)
    setDailyDetails({})
    setVegetalNumero("")
    setVegetalDescricao("")
    setEditingPlanId(null)
    setActiveTab("vegetal")
    setAutoEstrada("")
    setKmInicial("")
    setKmFinal("")
    setIsUrgente(false)
  }

  const getDatesInRange = (startDate?: Date, endDate?: Date): Date[] => {
    if (!startDate || !endDate) return []
    const dates: Date[] = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return dates
  }

  const handleDailyDetailChange = (
    dateString: string,
    field: keyof DailyDetail,
    value: string | string[] | boolean,
    checkboxValue?: string,
  ) => {
    setDailyDetails((prev) => {
      const currentDetails = prev[dateString] || {
        timeSlot: "",
        perfilTipo: "",
        tipoTrabalho: [],
        kmsInicio: "",
        kmsFim: "",
        sentido: [],
        vias: [],
        esqRef: "",
        outrosLocais: [],
        responsavelNome: "",
        responsavelContacto: "",
      }

      if (field === "tipoTrabalho" || field === "sentido" || field === "vias" || field === "outrosLocais") {
        const currentArray = currentDetails[field] as string[]
        if (typeof value === "boolean" && checkboxValue) {
          if (value) {
            return { ...prev, [dateString]: { ...currentDetails, [field]: [...currentArray, checkboxValue] } }
          } else {
            return {
              ...prev,
              [dateString]: { ...currentDetails, [field]: currentArray.filter((item) => item !== checkboxValue) },
            }
          }
        }
      }
      return { ...prev, [dateString]: { ...currentDetails, [field]: value } }
    })
  }

  const resetForm = () => {
    setVegetalNumero("")
    setVegetalDescricao("")
    setDateRange(undefined)
    setDailyDetails({})
    setEditingPlanId(null)
    setAutoEstrada("")
    setKmInicial("")
    setKmFinal("")
    setIsUrgente(false)
  }

  const handleSubmitOrUpdateVegetalPlan = () => {
    if (!dateRange?.from || !dateRange?.to) {
      setNotificationDialog({
        open: true,
        title: "Erro na Submissão",
        description: "Por favor, selecione um período de datas para o plano.",
      })
      return
    }

    const selectedDates = getDatesInRange(dateRange.from, dateRange.to)
    const hasOverlap = selectedDates.some((date) => {
      const dateStr = format(date, "yyyy-MM-dd")
      if (editingPlanId) {
        const currentPlan = submittedPlans.find((p) => p.id === editingPlanId)
        if (
          currentPlan &&
          currentPlan.status === "Confirmado" &&
          getDatesInRange(currentPlan.periodo.from, currentPlan.periodo.to).some(
            (d) => format(d, "yyyy-MM-dd") === dateStr,
          )
        ) {
          return false
        }
      }
      return blockedDates.has(dateStr)
    })

    if (hasOverlap) {
      setNotificationDialog({
        open: true,
        title: "Datas Bloqueadas",
        description:
          "Não é possível submeter/atualizar o plano. Uma ou mais datas selecionadas já estão bloqueadas por um plano aprovado.",
      })
      return
    }

    if (editingPlanId) {
      setSubmittedPlans((prev) =>
        prev.map((plan) =>
          plan.id === editingPlanId
            ? {
                ...plan,
                numero: vegetalNumero,
                descricaoGeral: vegetalDescricao,
                periodo: dateRange,
                detalhesDiarios: dailyDetails,
                status: "Pendente Confirmação",
                comentarioGO: undefined, // Remove o comentário anterior ao resubmeter
              }
            : plan,
        ),
      )
      setNotificationDialog({
        open: true,
        title: "Plano Atualizado!",
        description: "Plano de Manutenção Vegetal atualizado com sucesso! Status: Pendente Confirmação.",
      })
    } else {
      const newPlan: SubmittedPlan = {
        id: `plan-${Date.now()}`,
        numero: vegetalNumero,
        descricaoGeral: vegetalDescricao,
        periodo: dateRange,
        detalhesDiarios: dailyDetails,
        status: "Pendente Confirmação",
        tipo: "Manutenção Vegetal",
        isInISistema: false,
      }
      setSubmittedPlans((prev) => [...prev, newPlan])
      setNotificationDialog({
        open: true,
        title: "Plano Submetido!",
        description: "Plano de Manutenção Vegetal submetido com sucesso! Status: Pendente Confirmação.",
      })
    }
    resetForm()
  }

  // Função para abrir o diálogo de confirmação
  const openConfirmationDialog = (type: "approve" | "reject", planId: string, planTitle: string) => {
    setConfirmationDialog({
      open: true,
      type,
      planId,
      planTitle,
    })
    setRejectionComment("") // Reset do comentário
  }

  // Função para confirmar aprovação
  const confirmApproval = () => {
    setSubmittedPlans((prev) =>
      prev.map((plan) => (plan.id === confirmationDialog.planId ? { ...plan, status: "Confirmado" } : plan)),
    )
    setNotificationDialog({
      open: true,
      title: "Plano Aprovado!",
      description: "O plano foi aprovado com sucesso e as datas foram bloqueadas no calendário.",
    })
    setConfirmationDialog({ open: false, type: "approve", planId: "", planTitle: "" })
  }

  // Função para confirmar rejeição
  const confirmRejection = () => {
    setSubmittedPlans((prev) =>
      prev.map((plan) =>
        plan.id === confirmationDialog.planId
          ? {
              ...plan,
              status: "Rejeitado",
              comentarioGO: rejectionComment || undefined,
            }
          : plan,
      ),
    )
    setNotificationDialog({
      open: true,
      title: "Plano Rejeitado",
      description: "O plano foi rejeitado. O prestador foi notificado.",
    })
    setConfirmationDialog({ open: false, type: "reject", planId: "", planTitle: "" })
    setRejectionComment("")
  }

  const handleEditPlan = (planToEdit: SubmittedPlan) => {
    setEditingPlanId(planToEdit.id)
    setVegetalNumero(planToEdit.numero)
    setVegetalDescricao(planToEdit.descricaoGeral)
    setDateRange(planToEdit.periodo)
    setDailyDetails(planToEdit.detalhesDiarios)
    setActiveTab("vegetal")
  }

  const datesToRender = getDatesInRange(dateRange?.from, dateRange?.to)

  const disableBlockedDates = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    if (editingPlanId) {
      const currentPlan = submittedPlans.find((p) => p.id === editingPlanId)
      if (currentPlan && currentPlan.periodo.from && currentPlan.periodo.to) {
        const oldDatesOfEditingPlan = getDatesInRange(currentPlan.periodo.from, currentPlan.periodo.to).map((d) =>
          format(d, "yyyy-MM-dd"),
        )
        if (oldDatesOfEditingPlan.includes(dateStr)) {
          return false
        }
      }
    }
    return blockedDates.has(dateStr)
  }

  // Função para lidar com o clique no contador semanal
  const handleViewWeeklyPlans = (weekId: string) => {
    const [yearStr, , weekNumStr] = weekId.split("-")
    const year = Number.parseInt(yearStr)
    const weekNum = Number.parseInt(weekNumStr)
    const startDate = startOfWeek(new Date(year, 0, (weekNum - 1) * 7 + 1), { locale: ptBR, weekStartsOn: 1 }) // Segunda-feira
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 4) // Sexta-feira

    const plansForWeek = submittedPlans.filter((plan) => {
      if (!plan.periodo.from || plan.status !== "Confirmado") return false // Apenas planos confirmados
      const planWeekNum = getWeek(plan.periodo.from, { locale: ptBR, weekStartsOn: 1 })
      const planYear = getYear(plan.periodo.from)
      return planWeekNum === weekNum && planYear === year
    })
    setCurrentWeekPlans(plansForWeek)
    setCurrentWeekTitle(
      `Planos da Semana ${weekNum} (${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM", { locale: ptBR })})`,
    )
    setIsWeeklyPlansDialogOpen(true)
  }

  // Função para alternar o status isInISistema
  const handleToggleISistemaStatus = (planId: string) => {
    setSubmittedPlans((prev) =>
      prev.map((plan) => (plan.id === planId ? { ...plan, isInISistema: !plan.isInISistema } : plan)),
    )
  }

  // Função para obter o plano em edição (para mostrar comentário do GO)
  const getEditingPlan = () => {
    if (!editingPlanId) return null
    return submittedPlans.find((plan) => plan.id === editingPlanId)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Portal de agendamento</CardTitle>
            <CardDescription>Plataforma de Agendamento de Planos de Trabalho</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Se for admin, mostrar apenas o dashboard de admin
  if (userRole === "admin") {
    return <AdminDashboard />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Portal de agendamento - Planos de Trabalho</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Planos de Trabalho</h2>
          <p className="text-gray-600">Selecione o tipo de manutenção e crie seu plano de trabalho</p>
        </div>

        {userRole === "prestador" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <span>Manutenção Vegetal</span>
                  </CardTitle>
                  <CardDescription>Serviços de jardinagem, poda e manutenção de áreas verdes</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="urgente-checkbox" className="text-sm font-medium">
                    Urgente?
                  </Label>
                  <Checkbox id="urgente-checkbox" checked={isUrgente} onCheckedChange={setIsUrgente} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <AutoEstradasSelect
                    value={autoEstrada}
                    onValueChange={setAutoEstrada}
                    label="Auto Estrada"
                    placeholder="Selecione a Auto Estrada"
                  />
                </div>

                {/* Novos campos de Km inicial e final */}
                {autoEstrada && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="km-inicial">Km Inicial</Label>
                      <Input
                        id="km-inicial"
                        type="number"
                        placeholder="Ex: 100"
                        value={kmInicial}
                        onChange={(e) => setKmInicial(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="km-final">Km Final</Label>
                      <Input
                        id="km-final"
                        type="number"
                        placeholder="Ex: 150"
                        value={kmFinal}
                        onChange={(e) => setKmFinal(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Mostrar diferença de Km's se ambos estiverem preenchidos */}
                {autoEstrada && kmInicial && kmFinal && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    {(() => {
                      const inicial = Number.parseFloat(kmInicial)
                      const final = Number.parseFloat(kmFinal)
                      if (!isNaN(inicial) && !isNaN(final)) {
                        const diferenca = final - inicial
                        if (diferenca >= 0) {
                          return `📏 Extensão do trabalho: ${diferenca} Km (de ${inicial} Km até ${final} Km)`
                        } else {
                          return <span className="text-red-600">⚠️ Km final deve ser maior que o Km inicial</span>
                        }
                      }
                      return null
                    })()}
                  </div>
                )}

                {/* Mostrar comentário do GO se estiver editando um plano rejeitado */}
                {editingPlanId && getEditingPlan()?.comentarioGO && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Label className="text-sm font-semibold text-red-800 mb-2 block">
                      Comentário do Gestor de Operações:
                    </Label>
                    <p className="text-sm text-red-700">{getEditingPlan()?.comentarioGO}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vegetal-numero">Sublanço</Label>
                    <Input
                      id="vegetal-numero"
                      placeholder="Ex: MV-001"
                      value={vegetalNumero}
                      onChange={(e) => setVegetalNumero(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="vegetal-tipo-trabalho">Plano de Trabalho</Label>
                    <Select value={vegetalDescricao} onValueChange={setVegetalDescricao}>
                      <SelectTrigger id="vegetal-tipo-trabalho">
                        <SelectValue placeholder="Selecione o plano de trabalho" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opcao1">Opção 1 (a definir)</SelectItem>
                        <SelectItem value="opcao2">Opção 2 (a definir)</SelectItem>
                        <SelectItem value="opcao3">Opção 3 (a definir)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data</Label>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                      className="rounded-md border shadow"
                      disabled={disableBlockedDates}
                    />
                    <div className="mt-3 text-xs text-gray-500 text-center">
                      {datesToRender.length === 0 && "Selecione um período no calendário"}
                      {datesToRender.length === 1 && "1 dia selecionado"}
                      {datesToRender.length > 1 && `${datesToRender.length} dias selecionados`}
                    </div>
                  </div>

                  {datesToRender.length >= 1 && (
                    <div className="mt-4 border rounded-lg p-4 bg-blue-50">
                      <Label className="text-sm font-medium mb-3 block">Detalhes por Dia Selecionado</Label>
                      <div className="space-y-4">
                        {datesToRender.map((date) => {
                          const dateString = format(date, "yyyy-MM-dd")
                          const details = dailyDetails[dateString] || {
                            timeSlot: "",
                            perfilTipo: "",
                            tipoTrabalho: [],
                            kmsInicio: "",
                            kmsFim: "",
                            sentido: [],
                            vias: [],
                            esqRef: "",
                            outrosLocais: [],
                            responsavelNome: "",
                            responsavelContacto: "",
                          }

                          return (
                            <div key={dateString} className="bg-white p-4 rounded border space-y-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-sm">{format(date, "PPP", { locale: ptBR })}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-600 mb-1 block">Horário de Início</Label>
                                  <Select
                                    value={details.timeSlot?.split("-")[0] || ""}
                                    onValueChange={(value) => {
                                      const currentEnd = details.timeSlot?.split("-")[1] || ""
                                      handleDailyDetailChange(
                                        dateString,
                                        "timeSlot",
                                        currentEnd ? `${value}-${currentEnd}` : value,
                                      )
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Início" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 21 }, (_, i) => {
                                        const hour = Math.floor(i / 2) + 8
                                        const minute = (i % 2) * 30
                                        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
                                        return (
                                          <SelectItem key={timeString} value={timeString}>
                                            {timeString}
                                          </SelectItem>
                                        )
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-xs text-gray-600 mb-1 block">Horário de Fim</Label>
                                  <Select
                                    value={details.timeSlot?.split("-")[1] || ""}
                                    onValueChange={(value) => {
                                      const currentStart = details.timeSlot?.split("-")[0] || ""
                                      handleDailyDetailChange(
                                        dateString,
                                        "timeSlot",
                                        currentStart ? `${currentStart}-${value}` : value,
                                      )
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Fim" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 21 }, (_, i) => {
                                        const hour = Math.floor(i / 2) + 8
                                        const minute = (i % 2) * 30 + 30
                                        const adjustedHour = minute >= 60 ? hour + 1 : hour
                                        const adjustedMinute = minute >= 60 ? minute - 60 : minute
                                        const timeString = `${adjustedHour.toString().padStart(2, "0")}:${adjustedMinute.toString().padStart(2, "0")}`
                                        return (
                                          <SelectItem key={timeString} value={timeString}>
                                            {timeString}
                                          </SelectItem>
                                        )
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {details.timeSlot?.includes("-") && details.timeSlot?.split("-").length === 2 && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {(() => {
                                    const [start, end] = details.timeSlot.split("-")
                                    if (start && end) {
                                      const startTime = new Date(`2000-01-01 ${start}:00`)
                                      const endTime = new Date(`2000-01-01 ${end}:00`)
                                      const diffMs = endTime.getTime() - startTime.getTime()
                                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                                      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

                                      if (diffMs > 0) {
                                        return `Duração: ${diffHours}h${diffMinutes > 0 ? ` ${diffMinutes}min` : ""}`
                                      } else {
                                        return (
                                          <span className="text-red-500">
                                            ⚠️ Horário de fim deve ser posterior ao início
                                          </span>
                                        )
                                      }
                                    }
                                    return null
                                  })()}
                                </div>
                              )}

                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block" htmlFor={`perfil-${dateString}`}>
                                  Perfil transversal tipo
                                </Label>
                                <Select
                                  value={details.perfilTipo || ""}
                                  onValueChange={(value) => handleDailyDetailChange(dateString, "perfilTipo", value)}
                                >
                                  <SelectTrigger id={`perfil-${dateString}`} className="w-full">
                                    <SelectValue placeholder="Selecione o perfil" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="2x2">2x2</SelectItem>
                                    <SelectItem value="3x3">3x3</SelectItem>
                                    <SelectItem value="4x4">4x4</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Tipos de trabalho</Label>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`trabalho-fixos-${dateString}`}
                                      checked={details.tipoTrabalho?.includes("fixos")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "tipoTrabalho", checked, "fixos")
                                      }
                                    />
                                    <Label htmlFor={`trabalho-fixos-${dateString}`}>Fixos</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`trabalho-moveis-${dateString}`}
                                      checked={details.tipoTrabalho?.includes("moveis")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "tipoTrabalho", checked, "moveis")
                                      }
                                    />
                                    <Label htmlFor={`trabalho-moveis-${dateString}`}>Móveis</Label>
                                  </div>
                                </div>
                              </div>

                              {/* Km's por dia */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Km's</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label
                                      className="text-xs text-gray-600 mb-1 block"
                                      htmlFor={`kms-inicio-${dateString}`}
                                    >
                                      Início (Km)
                                    </Label>
                                    <Input
                                      id={`kms-inicio-${dateString}`}
                                      type="number"
                                      placeholder="Ex: 100"
                                      value={details.kmsInicio || ""}
                                      onChange={(e) => handleDailyDetailChange(dateString, "kmsInicio", e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      className="text-xs text-gray-600 mb-1 block"
                                      htmlFor={`kms-fim-${dateString}`}
                                    >
                                      Fim (Km)
                                    </Label>
                                    <Input
                                      id={`kms-fim-${dateString}`}
                                      type="number"
                                      placeholder="Ex: 150"
                                      value={details.kmsFim || ""}
                                      onChange={(e) => handleDailyDetailChange(dateString, "kmsFim", e.target.value)}
                                    />
                                  </div>
                                </div>
                                {details.kmsInicio && details.kmsFim && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    {(() => {
                                      const inicio = Number.parseFloat(details.kmsInicio)
                                      const fim = Number.parseFloat(details.kmsFim)
                                      if (!isNaN(inicio) && !isNaN(fim)) {
                                        const diffKms = fim - inicio
                                        if (diffKms >= 0) {
                                          return `Km's Percorridos: ${diffKms} Km`
                                        } else {
                                          return (
                                            <span className="text-red-500">
                                              ⚠️ Km final deve ser maior ou igual ao inicial
                                            </span>
                                          )
                                        }
                                      }
                                      return null
                                    })()}
                                  </div>
                                )}
                              </div>

                              {/* Sentido por dia (Checkbox) */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Sentido</Label>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`sentido-ns-${dateString}`}
                                      checked={details.sentido?.includes("N/S")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "sentido", checked, "N/S")
                                      }
                                    />
                                    <Label htmlFor={`sentido-ns-${dateString}`}>N/S</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`sentido-sn-${dateString}`}
                                      checked={details.sentido?.includes("S/N")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "sentido", checked, "S/N")
                                      }
                                    />
                                    <Label htmlFor={`sentido-sn-${dateString}`}>S/N</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`sentido-ambos-${dateString}`}
                                      checked={details.sentido?.includes("Ambos")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "sentido", checked, "Ambos")
                                      }
                                    />
                                    <Label htmlFor={`sentido-ambos-${dateString}`}>Ambos</Label>
                                  </div>
                                </div>
                              </div>

                              {/* Vias por dia (Checkbox) */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Vias</Label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`vias-direita-${dateString}`}
                                      checked={details.vias?.includes("Direita")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "vias", checked, "Direita")
                                      }
                                    />
                                    <Label htmlFor={`vias-direita-${dateString}`}>Direita</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`vias-esquerda-${dateString}`}
                                      checked={details.vias?.includes("Esquerda")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "vias", checked, "Esquerda")
                                      }
                                    />
                                    <Label htmlFor={`vias-esquerda-${dateString}`}>Esquerda</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`vias-centro-${dateString}`}
                                      checked={details.vias?.includes("Centro")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "vias", checked, "Centro")
                                      }
                                    />
                                    <Label htmlFor={`vias-centro-${dateString}`}>Centro</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`vias-berma-${dateString}`}
                                      checked={details.vias?.includes("Berma")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "vias", checked, "Berma")
                                      }
                                    />
                                    <Label htmlFor={`vias-berma-${dateString}`}>Berma</Label>
                                  </div>
                                </div>
                              </div>

                              {/* Esq/Refª por dia */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block" htmlFor={`esq-ref-${dateString}`}>
                                  Esq/Refª
                                </Label>
                                <Input
                                  id={`esq-ref-${dateString}`}
                                  type="text"
                                  placeholder="Preenchimento livre"
                                  value={details.esqRef || ""}
                                  onChange={(e) => handleDailyDetailChange(dateString, "esqRef", e.target.value)}
                                />
                              </div>

                              {/* Outros locais a Intervencionar por dia (Checkbox) */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">
                                  Outros locais a Intervencionar
                                </Label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`outros-locais-separador-${dateString}`}
                                      checked={details.outrosLocais?.includes("Separador Central")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(
                                          dateString,
                                          "outrosLocais",
                                          checked,
                                          "Separador Central",
                                        )
                                      }
                                    />
                                    <Label htmlFor={`outros-locais-separador-${dateString}`}>Separador Central</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`outros-locais-talude-${dateString}`}
                                      checked={details.outrosLocais?.includes("Talude")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "outrosLocais", checked, "Talude")
                                      }
                                    />
                                    <Label htmlFor={`outros-locais-talude-${dateString}`}>Talude</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`outros-locais-no-ramo-${dateString}`}
                                      checked={details.outrosLocais?.includes("Nó/Ramo")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "outrosLocais", checked, "Nó/Ramo")
                                      }
                                    />
                                    <Label htmlFor={`outros-locais-no-ramo-${dateString}`}>Nó/Ramo</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`outros-locais-portagem-${dateString}`}
                                      checked={details.outrosLocais?.includes("Portagem")}
                                      onCheckedChange={(checked) =>
                                        handleDailyDetailChange(dateString, "outrosLocais", checked, "Portagem")
                                      }
                                    />
                                    <Label htmlFor={`outros-locais-portagem-${dateString}`}>Portagem</Label>
                                  </div>
                                </div>
                              </div>

                              {/* Responsáveis por dia */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Responsáveis</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label
                                      className="text-xs text-gray-600 mb-1 block"
                                      htmlFor={`responsavel-nome-${dateString}`}
                                    >
                                      Nome
                                    </Label>
                                    <Input
                                      id={`responsavel-nome-${dateString}`}
                                      type="text"
                                      placeholder="Nome do responsável"
                                      value={details.responsavelNome || ""}
                                      onChange={(e) =>
                                        handleDailyDetailChange(dateString, "responsavelNome", e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      className="text-xs text-gray-600 mb-1 block"
                                      htmlFor={`responsavel-contacto-${dateString}`}
                                    >
                                      Contacto
                                    </Label>
                                    <Input
                                      id={`responsavel-contacto-${dateString}`}
                                      type="text"
                                      placeholder="Contacto do responsável"
                                      value={details.responsavelContacto || ""}
                                      onChange={(e) =>
                                        handleDailyDetailChange(dateString, "responsavelContacto", e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 text-xs text-gray-600">
                        Defina os horários, perfil, tipos de trabalho, quilometragem, sentido, vias, Esq/Refª, outros
                        locais e responsáveis para cada dia selecionado.
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" onClick={handleSubmitOrUpdateVegetalPlan}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {editingPlanId ? "Atualizar Plano de Manutenção Vegetal" : "Criar Plano de Manutenção Vegetal"}
                  </Button>
                  {editingPlanId && (
                    <Button variant="outline" onClick={resetForm}>
                      Cancelar Edição
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userRole === "go" && (
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="aprovacao" className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4" />
                <span>Aprovação de Planos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="aprovacao">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    <span>Planos Pendentes de Aprovação</span>
                  </CardTitle>
                  <CardDescription>Revise e aprove ou rejeite os planos de trabalho submetidos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submittedPlans.filter((plan) => plan.status === "Pendente Confirmação").length === 0 ? (
                    <p className="text-gray-500">Nenhum plano pendente de aprovação.</p>
                  ) : (
                    submittedPlans
                      .filter((plan) => plan.status === "Pendente Confirmação")
                      .map((plan) => (
                        <div
                          key={plan.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
                        >
                          <div className="flex-1 space-y-1 mb-3 sm:mb-0">
                            <h4 className="font-medium text-lg">
                              {plan.descricaoGeral || `Plano de ${plan.tipo} (Nº: ${plan.numero || "N/A"})`}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Período:{" "}
                              {plan.periodo.from && plan.periodo.to
                                ? `${format(plan.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(plan.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                : "Não definido"}
                            </p>
                            <Badge variant="outline">{plan.status}</Badge>
                            <Dialog onOpenChange={(open) => !open && setSelectedPlanForDetails(null)}>
                              <DialogTrigger asChild>
                                <Button variant="link" size="sm" onClick={() => setSelectedPlanForDetails(plan)}>
                                  Ver Detalhes
                                </Button>
                              </DialogTrigger>
                              {selectedPlanForDetails && (
                                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Detalhes do Plano: {selectedPlanForDetails.numero}</DialogTitle>
                                    <DialogDescription>
                                      Resumo completo do plano de trabalho submetido.
                                    </DialogDescription>

                                    {/* Comentário do GO no cabeçalho */}
                                    {selectedPlanForDetails.comentarioGO && (
                                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <Label className="text-sm font-semibold text-red-800 block mb-1">
                                          Comentário do Gestor de Operações:
                                        </Label>
                                        <p className="text-sm text-red-700">{selectedPlanForDetails.comentarioGO}</p>
                                      </div>
                                    )}
                                  </DialogHeader>

                                  <div className="space-y-4 py-4 text-sm">
                                    <div className="grid grid-cols-1 gap-4">
                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Tipo:</Label>
                                        <span className="text-gray-700">{selectedPlanForDetails.tipo}</span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Nº:</Label>
                                        <span className="text-gray-700">{selectedPlanForDetails.numero || "N/A"}</span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Descrição Geral:</Label>
                                        <span className="text-gray-700">
                                          {selectedPlanForDetails.descricaoGeral || "N/A"}
                                        </span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Período:</Label>
                                        <span className="text-gray-700">
                                          {selectedPlanForDetails.periodo.from && selectedPlanForDetails.periodo.to
                                            ? `${format(selectedPlanForDetails.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(selectedPlanForDetails.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                            : "Não definido"}
                                        </span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Status:</Label>
                                        <Badge
                                          className="w-fit"
                                          variant={
                                            selectedPlanForDetails.status === "Pendente Confirmação"
                                              ? "outline"
                                              : selectedPlanForDetails.status === "Confirmado"
                                                ? "default"
                                                : "destructive"
                                          }
                                        >
                                          {selectedPlanForDetails.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="border-t pt-4">
                                      <h5 className="text-lg font-semibold mb-4">Detalhes Diários:</h5>
                                      {Object.entries(selectedPlanForDetails.detalhesDiarios).length === 0 ? (
                                        <p className="text-gray-500">Nenhum detalhe diário preenchido.</p>
                                      ) : (
                                        <div className="space-y-6">
                                          {Object.entries(selectedPlanForDetails.detalhesDiarios).map(
                                            ([dateString, details]) => (
                                              <div key={dateString} className="border rounded-lg p-4 bg-gray-50">
                                                <h6 className="font-medium text-md mb-3 text-blue-600">
                                                  Dia: {format(new Date(dateString), "PPP", { locale: ptBR })}
                                                </h6>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Horário:
                                                    </Label>
                                                    <span className="text-sm">{details.timeSlot || "N/A"}</span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Perfil Tipo:
                                                    </Label>
                                                    <span className="text-sm">{details.perfilTipo || "N/A"}</span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Tipo Trabalho:
                                                    </Label>
                                                    <span className="text-sm">
                                                      {details.tipoTrabalho?.join(", ") || "N/A"}
                                                    </span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Km's Início:
                                                    </Label>
                                                    <span className="text-sm">{details.kmsInicio || "N/A"}</span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Km's Fim:
                                                    </Label>
                                                    <span className="text-sm">{details.kmsFim || "N/A"}</span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Sentido:
                                                    </Label>
                                                    <span className="text-sm">
                                                      {details.sentido?.join(", ") || "N/A"}
                                                    </span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">Vias:</Label>
                                                    <span className="text-sm">{details.vias?.join(", ") || "N/A"}</span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Esq/Refª:
                                                    </Label>
                                                    <span className="text-sm">{details.esqRef || "N/A"}</span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Outros Locais:
                                                    </Label>
                                                    <span className="text-sm">
                                                      {details.outrosLocais?.join(", ") || "N/A"}
                                                    </span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Responsável:
                                                    </Label>
                                                    <span className="text-sm">{details.responsavelNome || "N/A"}</span>
                                                  </div>

                                                  <div className="flex flex-col space-y-1">
                                                    <Label className="text-xs font-medium text-gray-600">
                                                      Contacto:
                                                    </Label>
                                                    <span className="text-sm">
                                                      {details.responsavelContacto || "N/A"}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <div className="flex justify-between w-full">
                                      <div>
                                        {selectedPlanForDetails?.tipo === "Manutenção Vegetal" &&
                                          userRole === "prestador" && (
                                            <Button
                                              variant="outline"
                                              onClick={() => {
                                                handleEditPlan(selectedPlanForDetails)
                                                setSelectedPlanForDetails(null)
                                              }}
                                            >
                                              Editar
                                            </Button>
                                          )}
                                      </div>
                                      <Button onClick={() => setSelectedPlanForDetails(null)}>Fechar</Button>
                                    </div>
                                  </DialogFooter>
                                </DialogContent>
                              )}
                            </Dialog>
                          </div>
                          <div className="flex gap-2 mt-3 sm:mt-0">
                            <Button
                              onClick={() =>
                                openConfirmationDialog(
                                  "approve",
                                  plan.id,
                                  plan.descricaoGeral || `Plano de ${plan.tipo} (Nº: ${plan.numero || "N/A"})`,
                                )
                              }
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              Aprovar
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() =>
                                openConfirmationDialog(
                                  "reject",
                                  plan.id,
                                  plan.descricaoGeral || `Plano de ${plan.tipo} (Nº: ${plan.numero || "N/A"})`,
                                )
                              }
                            >
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {userRole === "cco" && (
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="dashboard-cco" className="flex items-center space-x-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard CCO</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard-cco">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="w-5 h-5 text-purple-600" />
                    <span>Planos Confirmados por Semana</span>
                  </CardTitle>
                  <CardDescription>Visão geral dos planos de trabalho confirmados semanalmente.</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(weeklyPlanCounts).length === 0 ? (
                    <p className="text-gray-500">Nenhum plano confirmado ainda para exibir o resumo semanal.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(weeklyPlanCounts)
                        .sort(([weekIdA], [weekIdB]) => weekIdA.localeCompare(weekIdB))
                        .map(([weekId, count]) => {
                          const [yearStr, , weekNumStr] = weekId.split("-")
                          const year = Number.parseInt(yearStr)
                          const weekNum = Number.parseInt(weekNumStr)
                          const startDate = startOfWeek(new Date(year, 0, (weekNum - 1) * 7 + 1), {
                            locale: ptBR,
                            weekStartsOn: 1,
                          }) // Segunda-feira
                          const endDate = new Date(startDate)
                          endDate.setDate(startDate.getDate() + 4) // Sexta-feira

                          return (
                            <div
                              key={weekId}
                              className="p-4 border rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleViewWeeklyPlans(weekId)}
                            >
                              <h5 className="font-semibold text-md">
                                Semana {weekNum} ({format(startDate, "dd/MM", { locale: ptBR })} -{" "}
                                {format(endDate, "dd/MM", { locale: ptBR })})
                              </h5>
                              <p className="text-2xl font-bold text-blue-600">{count}</p>
                              <p className="text-sm text-gray-500">planos confirmados</p>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* "Todos os Agendamentos" para CCO (apenas aprovados) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="w-5 h-5" />
                    <span>Planos Aprovados</span>
                  </CardTitle>
                  <CardDescription>Lista de todos os planos de trabalho aprovados.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {submittedPlans.filter((plan) => plan.status === "Confirmado").length === 0 ? (
                      <p className="text-gray-500">Nenhum plano aprovado ainda.</p>
                    ) : (
                      submittedPlans
                        .filter((plan) => plan.status === "Confirmado")
                        .map((plan) => (
                          <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                {plan.tipo === "Manutenção Vegetal" && <Leaf className="w-5 h-5 text-green-600" />}
                                {plan.tipo === "Beneficiação de Pavimento" && (
                                  <Road className="w-5 h-5 text-gray-600" />
                                )}
                                {plan.tipo === "Manutenção Geral" && <Wrench className="w-5 h-5 text-blue-600" />}
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {plan.descricaoGeral || `Plano de ${plan.tipo} (Nº: ${plan.numero || "N/A"})`}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  Período:{" "}
                                  {plan.periodo.from && plan.periodo.to
                                    ? `${format(plan.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(plan.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                    : "Não definido"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  plan.status === "Pendente Confirmação"
                                    ? "outline"
                                    : plan.status === "Confirmado"
                                      ? "default"
                                      : "destructive"
                                }
                              >
                                {plan.status}
                              </Badge>
                              <Dialog onOpenChange={(open) => !open && setSelectedPlanForDetails(null)}>
                                <DialogTrigger asChild>
                                  <Button variant="link" size="sm" onClick={() => setSelectedPlanForDetails(plan)}>
                                    Ver Detalhes
                                  </Button>
                                </DialogTrigger>
                                {selectedPlanForDetails && (
                                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Detalhes do Plano: {selectedPlanForDetails.numero}</DialogTitle>
                                      <DialogDescription>
                                        Resumo completo do plano de trabalho submetido.
                                      </DialogDescription>

                                      {/* Comentário do GO no cabeçalho */}
                                      {selectedPlanForDetails.comentarioGO && (
                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                          <Label className="text-sm font-semibold text-red-800 block mb-1">
                                            Comentário do Gestor de Operações:
                                          </Label>
                                          <p className="text-sm text-red-700">{selectedPlanForDetails.comentarioGO}</p>
                                        </div>
                                      )}
                                    </DialogHeader>

                                    <div className="space-y-4 py-4 text-sm">
                                      <div className="grid grid-cols-1 gap-4">
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Tipo:</Label>
                                          <span className="text-gray-700">{selectedPlanForDetails.tipo}</span>
                                        </div>

                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Nº:</Label>
                                          <span className="text-gray-700">
                                            {selectedPlanForDetails.numero || "N/A"}
                                          </span>
                                        </div>

                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Descrição Geral:</Label>
                                          <span className="text-gray-700">
                                            {selectedPlanForDetails.descricaoGeral || "N/A"}
                                          </span>
                                        </div>

                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Período:</Label>
                                          <span className="text-gray-700">
                                            {selectedPlanForDetails.periodo.from && selectedPlanForDetails.periodo.to
                                              ? `${format(selectedPlanForDetails.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(selectedPlanForDetails.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                              : "Não definido"}
                                          </span>
                                        </div>

                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Status:</Label>
                                          <Badge
                                            className="w-fit"
                                            variant={
                                              selectedPlanForDetails.status === "Pendente Confirmação"
                                                ? "outline"
                                                : selectedPlanForDetails.status === "Confirmado"
                                                  ? "default"
                                                  : "destructive"
                                            }
                                          >
                                            {selectedPlanForDetails.status}
                                          </Badge>
                                        </div>
                                      </div>

                                      <div className="border-t pt-4">
                                        <h5 className="text-lg font-semibold mb-4">Detalhes Diários:</h5>
                                        {Object.entries(selectedPlanForDetails.detalhesDiarios).length === 0 ? (
                                          <p className="text-gray-500">Nenhum detalhe diário preenchido.</p>
                                        ) : (
                                          <div className="space-y-6">
                                            {Object.entries(selectedPlanForDetails.detalhesDiarios).map(
                                              ([dateString, details]) => (
                                                <div key={dateString} className="border rounded-lg p-4 bg-gray-50">
                                                  <h6 className="font-medium text-md mb-3 text-blue-600">
                                                    Dia: {format(new Date(dateString), "PPP", { locale: ptBR })}
                                                  </h6>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Horário:
                                                      </Label>
                                                      <span className="text-sm">{details.timeSlot || "N/A"}</span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Perfil Tipo:
                                                      </Label>
                                                      <span className="text-sm">{details.perfilTipo || "N/A"}</span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Tipo Trabalho:
                                                      </Label>
                                                      <span className="text-sm">
                                                        {details.tipoTrabalho?.join(", ") || "N/A"}
                                                      </span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Km's Início:
                                                      </Label>
                                                      <span className="text-sm">{details.kmsInicio || "N/A"}</span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Km's Fim:
                                                      </Label>
                                                      <span className="text-sm">{details.kmsFim || "N/A"}</span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Sentido:
                                                      </Label>
                                                      <span className="text-sm">
                                                        {details.sentido?.join(", ") || "N/A"}
                                                      </span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">Vias:</Label>
                                                      <span className="text-sm">
                                                        {details.vias?.join(", ") || "N/A"}
                                                      </span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Esq/Refª:
                                                      </Label>
                                                      <span className="text-sm">{details.esqRef || "N/A"}</span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Outros Locais:
                                                      </Label>
                                                      <span className="text-sm">
                                                        {details.outrosLocais?.join(", ") || "N/A"}
                                                      </span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Responsável:
                                                      </Label>
                                                      <span className="text-sm">
                                                        {details.responsavelNome || "N/A"}
                                                      </span>
                                                    </div>

                                                    <div className="flex flex-col space-y-1">
                                                      <Label className="text-xs font-medium text-gray-600">
                                                        Contacto:
                                                      </Label>
                                                      <span className="text-sm">
                                                        {details.responsavelContacto || "N/A"}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <DialogFooter>
                                      <div className="flex justify-between w-full">
                                        <div>
                                          {selectedPlanForDetails?.tipo === "Manutenção Vegetal" &&
                                            userRole === "prestador" && (
                                              <Button
                                                variant="outline"
                                                onClick={() => {
                                                  handleEditPlan(selectedPlanForDetails)
                                                  setSelectedPlanForDetails(null)
                                                }}
                                              >
                                                Editar
                                              </Button>
                                            )}
                                        </div>
                                        <Button onClick={() => setIsWeeklyPlansDialogOpen(false)}>Fechar</Button>
                                      </div>
                                    </DialogFooter>
                                  </DialogContent>
                                )}
                              </Dialog>
                              <Button
                                variant={plan.isInISistema ? "default" : "destructive"}
                                className={
                                  plan.isInISistema ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                                }
                                onClick={() => handleToggleISistemaStatus(plan.id)}
                              >
                                {plan.isInISistema ? "Inserido em iSistema" : "Não inserido em iSistema"}
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Todos os Agendamentos (visível para prestador e GO) */}
        {userRole !== "cco" && userRole !== "admin" && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5" />
                <span>Todos os Agendamentos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submittedPlans.length === 0 ? (
                  <p className="text-gray-500">Nenhum agendamento submetido ainda.</p>
                ) : (
                  submittedPlans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          {plan.tipo === "Manutenção Vegetal" && <Leaf className="w-5 h-5 text-green-600" />}
                          {plan.tipo === "Beneficiação de Pavimento" && <Road className="w-5 h-5 text-gray-600" />}
                          {plan.tipo === "Manutenção Geral" && <Wrench className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {plan.descricaoGeral || `Plano de ${plan.tipo} (Nº: ${plan.numero || "N/A"})`}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Período:{" "}
                            {plan.periodo.from && plan.periodo.to
                              ? `${format(plan.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(plan.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                              : "Não definido"}
                          </p>
                          {/* Mostrar comentário do GO se existir */}
                          {plan.comentarioGO && (
                            <p className="text-sm text-red-600 mt-1">
                              <strong>Comentário GO:</strong> {plan.comentarioGO}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            plan.status === "Pendente Confirmação"
                              ? "outline"
                              : plan.status === "Confirmado"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {plan.status}
                        </Badge>
                        <Dialog onOpenChange={(open) => !open && setSelectedPlanForDetails(null)}>
                          <DialogTrigger asChild>
                            <Button variant="link" size="sm" onClick={() => setSelectedPlanForDetails(plan)}>
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          {selectedPlanForDetails && (
                            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Plano: {selectedPlanForDetails.numero}</DialogTitle>
                                <DialogDescription>Resumo completo do plano de trabalho submetido.</DialogDescription>

                                {/* Comentário do GO no cabeçalho */}
                                {selectedPlanForDetails.comentarioGO && (
                                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <Label className="text-sm font-semibold text-red-800 block mb-1">
                                      Comentário do Gestor de Operações:
                                    </Label>
                                    <p className="text-sm text-red-700">{selectedPlanForDetails.comentarioGO}</p>
                                  </div>
                                )}
                              </DialogHeader>

                              <div className="space-y-4 py-4 text-sm">
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="flex flex-col space-y-2">
                                    <Label className="font-semibold">Tipo:</Label>
                                    <span className="text-gray-700">{selectedPlanForDetails.tipo}</span>
                                  </div>

                                  <div className="flex flex-col space-y-2">
                                    <Label className="font-semibold">Nº:</Label>
                                    <span className="text-gray-700">{selectedPlanForDetails.numero || "N/A"}</span>
                                  </div>

                                  <div className="flex flex-col space-y-2">
                                    <Label className="font-semibold">Descrição Geral:</Label>
                                    <span className="text-gray-700">
                                      {selectedPlanForDetails.descricaoGeral || "N/A"}
                                    </span>
                                  </div>

                                  <div className="flex flex-col space-y-2">
                                    <Label className="font-semibold">Período:</Label>
                                    <span className="text-gray-700">
                                      {selectedPlanForDetails.periodo.from && selectedPlanForDetails.periodo.to
                                        ? `${format(selectedPlanForDetails.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(selectedPlanForDetails.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                        : "Não definido"}
                                    </span>
                                  </div>

                                  <div className="flex flex-col space-y-2">
                                    <Label className="font-semibold">Status:</Label>
                                    <Badge
                                      className="w-fit"
                                      variant={
                                        selectedPlanForDetails.status === "Pendente Confirmação"
                                          ? "outline"
                                          : selectedPlanForDetails.status === "Confirmado"
                                            ? "default"
                                            : "destructive"
                                      }
                                    >
                                      {selectedPlanForDetails.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h5 className="text-lg font-semibold mb-4">Detalhes Diários:</h5>
                                  {Object.entries(selectedPlanForDetails.detalhesDiarios).length === 0 ? (
                                    <p className="text-gray-500">Nenhum detalhe diário preenchido.</p>
                                  ) : (
                                    <div className="space-y-6">
                                      {Object.entries(selectedPlanForDetails.detalhesDiarios).map(
                                        ([dateString, details]) => (
                                          <div key={dateString} className="border rounded-lg p-4 bg-gray-50">
                                            <h6 className="font-medium text-md mb-3 text-blue-600">
                                              Dia: {format(new Date(dateString), "PPP", { locale: ptBR })}
                                            </h6>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">Horário:</Label>
                                                <span className="text-sm">{details.timeSlot || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">
                                                  Perfil Tipo:
                                                </Label>
                                                <span className="text-sm">{details.perfilTipo || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">
                                                  Tipo Trabalho:
                                                </Label>
                                                <span className="text-sm">
                                                  {details.tipoTrabalho?.join(", ") || "N/A"}
                                                </span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">
                                                  Km's Início:
                                                </Label>
                                                <span className="text-sm">{details.kmsInicio || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">Km's Fim:</Label>
                                                <span className="text-sm">{details.kmsFim || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">Sentido:</Label>
                                                <span className="text-sm">{details.sentido?.join(", ") || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">Vias:</Label>
                                                <span className="text-sm">{details.vias?.join(", ") || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">Esq/Refª:</Label>
                                                <span className="text-sm">{details.esqRef || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">
                                                  Outros Locais:
                                                </Label>
                                                <span className="text-sm">
                                                  {details.outrosLocais?.join(", ") || "N/A"}
                                                </span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">
                                                  Responsável:
                                                </Label>
                                                <span className="text-sm">{details.responsavelNome || "N/A"}</span>
                                              </div>

                                              <div className="flex flex-col space-y-1">
                                                <Label className="text-xs font-medium text-gray-600">Contacto:</Label>
                                                <span className="text-sm">{details.responsavelContacto || "N/A"}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <DialogFooter>
                                <div className="flex justify-between w-full">
                                  <div>
                                    {selectedPlanForDetails?.tipo === "Manutenção Vegetal" &&
                                      userRole === "prestador" && (
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            handleEditPlan(selectedPlanForDetails)
                                            setSelectedPlanForDetails(null)
                                          }}
                                        >
                                          Editar
                                        </Button>
                                      )}
                                  </div>
                                  <Button onClick={() => setSelectedPlanForDetails(null)}>Fechar</Button>
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Notification Dialog */}
      <Dialog
        open={notificationDialog.open}
        onOpenChange={(open) => setNotificationDialog({ ...notificationDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{notificationDialog.title}</DialogTitle>
            <DialogDescription>{notificationDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setNotificationDialog({ ...notificationDialog, open: false })}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Aprovação/Rejeição */}
      <Dialog
        open={confirmationDialog.open}
        onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmationDialog.type === "approve" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
            </DialogTitle>
            <DialogDescription>
              Pretende {confirmationDialog.type === "approve" ? "aprovar" : "rejeitar"} o plano de trabalho "
              {confirmationDialog.planTitle}"?
            </DialogDescription>
          </DialogHeader>

          {confirmationDialog.type === "reject" && (
            <div className="py-4">
              <Label htmlFor="rejection-comment" className="text-sm font-medium">
                Comentários (opcional):
              </Label>
              <Textarea
                id="rejection-comment"
                placeholder="Adicione comentários sobre a rejeição..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmationDialog({ open: false, type: "approve", planId: "", planTitle: "" })}
            >
              Não
            </Button>
            <Button
              onClick={confirmationDialog.type === "approve" ? confirmApproval : confirmRejection}
              className={
                confirmationDialog.type === "approve"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              }
            >
              Sim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Planos da Semana */}
      <Dialog open={isWeeklyPlansDialogOpen} onOpenChange={setIsWeeklyPlansDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentWeekTitle}</DialogTitle>
            <DialogDescription>Lista de planos aprovados para a semana selecionada.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {currentWeekPlans.length === 0 ? (
              <p className="text-gray-500">Nenhum plano aprovado para esta semana.</p>
            ) : (
              currentWeekPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      {plan.tipo === "Manutenção Vegetal" && <Leaf className="w-5 h-5 text-green-600" />}
                      {plan.tipo === "Beneficiação de Pavimento" && <Road className="w-5 h-5 text-gray-600" />}
                      {plan.tipo === "Manutenção Geral" && <Wrench className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {plan.descricaoGeral || `Plano de ${plan.tipo} (Nº: ${plan.numero || "N/A"})`}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Período:{" "}
                        {plan.periodo.from && plan.periodo.to
                          ? `${format(plan.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(plan.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                          : "Não definido"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        plan.status === "Pendente Confirmação"
                          ? "outline"
                          : plan.status === "Confirmado"
                            ? "default"
                            : "destructive"
                      }
                    >
                      {plan.status}
                    </Badge>
                    <Dialog onOpenChange={(open) => !open && setSelectedPlanForDetails(null)}>
                      <DialogTrigger asChild>
                        <Button variant="link" size="sm" onClick={() => setSelectedPlanForDetails(plan)}>
                          Ver Detalhes
                        </Button>
                      </DialogTrigger>
                      {selectedPlanForDetails && (
                        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Plano: {selectedPlanForDetails.numero}</DialogTitle>
                            <DialogDescription>Resumo completo do plano de trabalho submetido.</DialogDescription>

                            {/* Comentário do GO no cabeçalho */}
                            {selectedPlanForDetails.comentarioGO && (
                              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <Label className="text-sm font-semibold text-red-800 block mb-1">
                                  Comentário do Gestor de Operações:
                                </Label>
                                <p className="text-sm text-red-700">{selectedPlanForDetails.comentarioGO}</p>
                              </div>
                            )}
                          </DialogHeader>

                          <div className="space-y-4 py-4 text-sm">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="flex flex-col space-y-2">
                                <Label className="font-semibold">Tipo:</Label>
                                <span className="text-gray-700">{selectedPlanForDetails.tipo}</span>
                              </div>

                              <div className="flex flex-col space-y-2">
                                <Label className="font-semibold">Nº:</Label>
                                <span className="text-gray-700">{selectedPlanForDetails.numero || "N/A"}</span>
                              </div>

                              <div className="flex flex-col space-y-2">
                                <Label className="font-semibold">Descrição Geral:</Label>
                                <span className="text-gray-700">{selectedPlanForDetails.descricaoGeral || "N/A"}</span>
                              </div>

                              <div className="flex flex-col space-y-2">
                                <Label className="font-semibold">Período:</Label>
                                <span className="text-gray-700">
                                  {selectedPlanForDetails.periodo.from && selectedPlanForDetails.periodo.to
                                    ? `${format(selectedPlanForDetails.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(selectedPlanForDetails.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                    : "Não definido"}
                                </span>
                              </div>

                              <div className="flex flex-col space-y-2">
                                <Label className="font-semibold">Status:</Label>
                                <Badge
                                  className="w-fit"
                                  variant={
                                    selectedPlanForDetails.status === "Pendente Confirmação"
                                      ? "outline"
                                      : selectedPlanForDetails.status === "Confirmado"
                                        ? "default"
                                        : "destructive"
                                  }
                                >
                                  {selectedPlanForDetails.status}
                                </Badge>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h5 className="text-lg font-semibold mb-4">Detalhes Diários:</h5>
                              {Object.entries(selectedPlanForDetails.detalhesDiarios).length === 0 ? (
                                <p className="text-gray-500">Nenhum detalhe diário preenchido.</p>
                              ) : (
                                <div className="space-y-6">
                                  {Object.entries(selectedPlanForDetails.detalhesDiarios).map(
                                    ([dateString, details]) => (
                                      <div key={dateString} className="border rounded-lg p-4 bg-gray-50">
                                        <h6 className="font-medium text-md mb-3 text-blue-600">
                                          Dia: {format(new Date(dateString), "PPP", { locale: ptBR })}
                                        </h6>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Horário:</Label>
                                            <span className="text-sm">{details.timeSlot || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Perfil Tipo:</Label>
                                            <span className="text-sm">{details.perfilTipo || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Tipo Trabalho:</Label>
                                            <span className="text-sm">{details.tipoTrabalho?.join(", ") || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Km's Início:</Label>
                                            <span className="text-sm">{details.kmsInicio || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Km's Fim:</Label>
                                            <span className="text-sm">{details.kmsFim || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Sentido:</Label>
                                            <span className="text-sm">{details.sentido?.join(", ") || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Vias:</Label>
                                            <span className="text-sm">{details.vias?.join(", ") || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Esq/Refª:</Label>
                                            <span className="text-sm">{details.esqRef || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Outros Locais:</Label>
                                            <span className="text-sm">{details.outrosLocais?.join(", ") || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Responsável:</Label>
                                            <span className="text-sm">{details.responsavelNome || "N/A"}</span>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <Label className="text-xs font-medium text-gray-600">Contacto:</Label>
                                            <span className="text-sm">{details.responsavelContacto || "N/A"}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <DialogFooter>
                            <div className="flex justify-between w-full">
                              <div>
                                {selectedPlanForDetails?.tipo === "Manutenção Vegetal" && userRole === "prestador" && (
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      handleEditPlan(selectedPlanForDetails)
                                      setSelectedPlanForDetails(null)
                                    }}
                                  >
                                    Editar
                                  </Button>
                                )}
                              </div>
                              <Button onClick={() => setIsWeeklyPlansDialogOpen(false)}>Fechar</Button>
                            </div>
                          </DialogFooter>
                        </DialogContent>
                      )}
                    </Dialog>
                    <Button
                      variant={plan.isInISistema ? "default" : "destructive"}
                      className={plan.isInISistema ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
                      onClick={() => handleToggleISistemaStatus(plan.id)}
                    >
                      {plan.isInISistema ? "Inserido em iSistema" : "Não inserido em iSistema"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsWeeklyPlansDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
