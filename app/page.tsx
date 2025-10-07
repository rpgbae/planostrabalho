"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CalendarDays,
  Leaf,
  Bold as Road,
  Wrench,
  User,
  LogOut,
  LayoutDashboard,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import {
  format,
  getWeek,
  getYear,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import AdminDashboard from "@/components/admin-dashboard"
import { AutoEstradasSelect } from "@/components/auto-estradas-select"

// Tipagem para o intervalo de datas
interface DateRange {
  from?: Date
  to?: Date
}

// Tipagem para uma atividade
interface Atividade {
  id: string
  descricaoAtividade: string
  periodo: DateRange
  pkInicial: string
  pkFinal: string
  sentido: string
  perfil: string
  localIntervencao: string
  restricoes: string
  esquema: string
  observacoes: string
  detalhesDiarios: { [dateString: string]: DailyDetail }
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
  tipoTrabalho: string
  autoEstrada?: string // Added autoEstrada field to SubmittedPlan interface
  atividades: Atividade[]
  status: "Pendente Confirmação" | "Confirmado" | "Rejeitado"
  tipo: "Manutenção Vegetal" | "Beneficiação de Pavimento" | "Manutenção Geral"
  isInISistema: boolean
  comentarioGO?: string
  kmInicial?: string
  kmFinal?: string
  trabalhoFixo?: boolean
  trabalhoMovel?: boolean
  fiscalizacaoNome?: string
  fiscalizacaoContato?: string
  entidadeExecutanteNome?: string
  entidadeExecutanteContato?: string
  sinalizacaoNome?: string
  sinalizacaoContato?: string
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
  const [tipoTrabalho, setTipoTrabalho] = useState("")
  const [descricaoAtividade, setDescricaoAtividade] = useState("")
  const [submittedPlans, setSubmittedPlans] = useState<SubmittedPlan[]>([])
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<SubmittedPlan | null>(null)
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("vegetal")
  const [autoEstrada, setAutoEstrada] = useState("")
  const [kmInicial, setKmInicial] = useState("")
  const [kmFinal, setKmFinal] = useState("")
  const [pkInicial, setPkInicial] = useState("")
  const [pkFinal, setPkFinal] = useState("")
  const [sentido, setSentido] = useState("")
  const [perfil, setPerfil] = useState("")
  const [trabalhoFixo, setTrabalhoFixo] = useState(false)
  const [trabalhoMovel, setTrabalhoMovel] = useState(false)
  const [localIntervencao, setLocalIntervencao] = useState("")
  const [restricoes, setRestricoes] = useState("")
  const [esquema, setEsquema] = useState("")
  const [observacoes, setObservacoes] = useState("")

  // Estado para lista de atividades
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [editingAtividadeId, setEditingAtividadeId] = useState<string | null>(null)

  const [fiscalizacaoNome, setFiscalizacaoNome] = useState("")
  const [fiscalizacaoContato, setFiscalizacaoContato] = useState("")
  const [entidadeExecutanteNome, setEntidadeExecutanteNome] = useState("")
  const [entidadeExecutanteContato, setEntidadeExecutanteContato] = useState("")
  const [sinalizacaoNome, setSinalizacaoNome] = useState("")
  const [sinalizacaoContato, setSinalizacaoContato] = useState("")

  const [notificationDialog, setNotificationDialog] = useState<{
    open: boolean
    title: string
    description: string
  }>({
    open: false,
    title: "",
    description: "",
  })

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
  const [weeklyPlanCounts, setWeeklyPlanCounts] = useState<{ [weekId: string]: number }>({})
  const [isWeeklyPlansDialogOpen, setIsWeeklyPlansDialogOpen] = useState(false)
  const [currentWeekPlans, setCurrentWeekPlans] = useState<SubmittedPlan[]>([])
  const [currentWeekTitle, setCurrentWeekTitle] = useState("")

  // New calendar view states
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date())
  const [calendarFilterPeriod, setCalendarFilterPeriod] = useState<string>("all")
  const [calendarFilterTipoTrabalho, setCalendarFilterTipoTrabalho] = useState<string>("all")

  useEffect(() => {
    const newBlockedDates = new Set<string>()
    const newWeeklyCounts: { [weekId: string]: number } = {}

    submittedPlans.forEach((plan) => {
      if (plan.status === "Confirmado") {
        plan.atividades.forEach((atividade) => {
          if (atividade.periodo.from && atividade.periodo.to) {
            const dates = getDatesInRange(atividade.periodo.from, atividade.periodo.to)
            dates.forEach((date) => newBlockedDates.add(format(date, "yyyy-MM-dd")))
          }
        })
      }

      if (plan.status === "Confirmado" && plan.atividades.length > 0 && plan.atividades[0].periodo.from) {
        const weekNum = getWeek(plan.atividades[0].periodo.from, { locale: ptBR, weekStartsOn: 1 })
        const year = getYear(plan.atividades[0].periodo.from)
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
      setUser({ name: "Gestor Operacional", email: loginData.email })
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
    setTipoTrabalho("")
    setDescricaoAtividade("")
    setEditingPlanId(null)
    setActiveTab("vegetal")
    setAutoEstrada("")
    setKmInicial("")
    setKmFinal("")
    setIsUrgente(false)
    setPkInicial("")
    setPkFinal("")
    setSentido("")
    setPerfil("")
    setTrabalhoFixo(false)
    setTrabalhoMovel(false)
    setLocalIntervencao("")
    setRestricoes("")
    setEsquema("")
    setObservacoes("")
    setAtividades([])
    setEditingAtividadeId(null)
    setFiscalizacaoNome("")
    setFiscalizacaoContato("")
    setEntidadeExecutanteNome("")
    setEntidadeExecutanteContato("")
    setSinalizacaoNome("")
    setSinalizacaoContato("")
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

  const resetAtividadeForm = () => {
    setDescricaoAtividade("")
    setDateRange(undefined)
    setDailyDetails({})
    setPkInicial("")
    setPkFinal("")
    setSentido("")
    setPerfil("")
    setLocalIntervencao("")
    setRestricoes("")
    setEsquema("")
    setObservacoes("")
    setEditingAtividadeId(null)
  }

  const resetForm = () => {
    setVegetalNumero("")
    setTipoTrabalho("")
    setAutoEstrada("")
    setKmInicial("")
    setKmFinal("")
    setIsUrgente(false)
    setTrabalhoFixo(false)
    setTrabalhoMovel(false)
    setAtividades([])
    resetAtividadeForm()
    setEditingPlanId(null)
    setFiscalizacaoNome("")
    setFiscalizacaoContato("")
    setEntidadeExecutanteNome("")
    setEntidadeExecutanteContato("")
    setSinalizacaoNome("")
    setSinalizacaoContato("")
  }

  const handleAdicionarAtividade = () => {
    // Validação básica
    if (!descricaoAtividade || !dateRange?.from || !dateRange?.to) {
      setNotificationDialog({
        open: true,
        title: "Campos Obrigatórios",
        description: "Por favor, preencha a descrição da atividade e o período antes de adicionar.",
      })
      return
    }

    const selectedDates = getDatesInRange(dateRange.from, dateRange.to)
    const hasOverlap = selectedDates.some((date) => {
      const dateStr = format(date, "yyyy-MM-dd")
      return blockedDates.has(dateStr)
    })

    if (hasOverlap) {
      setNotificationDialog({
        open: true,
        title: "Datas Bloqueadas",
        description: "Uma ou mais datas selecionadas já estão bloqueadas por um plano aprovado.",
      })
      return
    }

    if (editingAtividadeId) {
      // Atualizar atividade existente
      setAtividades((prev) =>
        prev.map((ativ) =>
          ativ.id === editingAtividadeId
            ? {
                ...ativ,
                descricaoAtividade,
                periodo: dateRange,
                pkInicial,
                pkFinal,
                sentido,
                perfil,
                localIntervencao,
                restricoes,
                esquema,
                observacoes,
                detalhesDiarios: dailyDetails,
              }
            : ativ,
        ),
      )
    } else {
      // Adicionar nova atividade
      const novaAtividade: Atividade = {
        id: `atividade-${Date.now()}`,
        descricaoAtividade,
        periodo: dateRange,
        pkInicial,
        pkFinal,
        sentido,
        perfil,
        localIntervencao,
        restricoes,
        esquema,
        observacoes,
        detalhesDiarios: dailyDetails,
      }
      setAtividades((prev) => [...prev, novaAtividade])
    }

    resetAtividadeForm()
  }

  const handleEditarAtividade = (atividade: Atividade) => {
    setEditingAtividadeId(atividade.id)
    setDescricaoAtividade(atividade.descricaoAtividade)
    setDateRange(atividade.periodo)
    setPkInicial(atividade.pkInicial)
    setPkFinal(atividade.pkFinal)
    setSentido(atividade.sentido)
    setPerfil(atividade.perfil)
    setLocalIntervencao(atividade.localIntervencao)
    setRestricoes(atividade.restricoes)
    setEsquema(atividade.esquema)
    setObservacoes(atividade.observacoes)
    setDailyDetails(atividade.detalhesDiarios)
  }

  const handleRemoverAtividade = (atividadeId: string) => {
    setAtividades((prev) => prev.filter((ativ) => ativ.id !== atividadeId))
  }

  const handleSubmitOrUpdateVegetalPlan = () => {
    if (atividades.length === 0) {
      setNotificationDialog({
        open: true,
        title: "Erro na Submissão",
        description: "Por favor, adicione pelo menos uma atividade ao plano.",
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
                tipoTrabalho: tipoTrabalho,
                autoEstrada: autoEstrada, // Save autoEstrada when updating
                atividades: atividades,
                status: "Pendente Confirmação",
                comentarioGO: undefined,
                kmInicial,
                kmFinal,
                trabalhoFixo,
                trabalhoMovel,
                fiscalizacaoNome,
                fiscalizacaoContato,
                entidadeExecutanteNome,
                entidadeExecutanteContato,
                sinalizacaoNome,
                sinalizacaoContato,
              }
            : plan,
        ),
      )
      setNotificationDialog({
        open: true,
        title: "Plano Submetido",
        description: "Plano de trabalho submetido com sucesso. Status: Pendente de Confirmação",
      })
    } else {
      const newPlan: SubmittedPlan = {
        id: `plan-${Date.now()}`,
        numero: vegetalNumero,
        tipoTrabalho: tipoTrabalho,
        autoEstrada: autoEstrada, // Save autoEstrada when creating
        atividades: atividades,
        status: "Pendente Confirmação",
        tipo: "Manutenção Vegetal",
        isInISistema: false,
        kmInicial,
        kmFinal,
        trabalhoFixo,
        trabalhoMovel,
        fiscalizacaoNome,
        fiscalizacaoContato,
        entidadeExecutanteNome,
        entidadeExecutanteContato,
        sinalizacaoNome,
        sinalizacaoContato,
      }
      setSubmittedPlans((prev) => [...prev, newPlan])
      setNotificationDialog({
        open: true,
        title: "Plano Submetido",
        description: "Plano de trabalho submetido com sucesso. Status: Pendente de Confirmação",
      })
    }
    resetForm()
  }

  const openConfirmationDialog = (type: "approve" | "reject", planId: string, planTitle: string) => {
    setConfirmationDialog({
      open: true,
      type,
      planId,
      planTitle,
    })
    setRejectionComment("")
  }

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
    setTipoTrabalho(planToEdit.tipoTrabalho)
    setAutoEstrada(planToEdit.autoEstrada || "") // Load autoEstrada when editing
    setKmInicial(planToEdit.kmInicial || "")
    setKmFinal(planToEdit.kmFinal || "")
    setTrabalhoFixo(planToEdit.trabalhoFixo || false)
    setTrabalhoMovel(planToEdit.trabalhoMovel || false)
    setAtividades(planToEdit.atividades)
    setFiscalizacaoNome(planToEdit.fiscalizacaoNome || "")
    setFiscalizacaoContato(planToEdit.fiscalizacaoContato || "")
    setEntidadeExecutanteNome(planToEdit.entidadeExecutanteNome || "")
    setEntidadeExecutanteContato(planToEdit.entidadeExecutanteContato || "")
    setSinalizacaoNome(planToEdit.sinalizacaoNome || "")
    setSinalizacaoContato(planToEdit.sinalizacaoContato || "")
    setActiveTab("vegetal")
  }

  const datesToRender = getDatesInRange(dateRange?.from, dateRange?.to)

  const disableBlockedDates = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return blockedDates.has(dateStr)
  }

  const handleViewWeeklyPlans = (weekId: string) => {
    const [yearStr, , weekNumStr] = weekId.split("-")
    const year = Number.parseInt(yearStr)
    const weekNum = Number.parseInt(weekNumStr)
    const startDate = startOfWeek(new Date(year, 0, (weekNum - 1) * 7 + 1), { locale: ptBR, weekStartsOn: 1 })
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 4)

    const plansForWeek = submittedPlans.filter((plan) => {
      if (plan.atividades.length === 0 || !plan.atividades[0].periodo.from || plan.status !== "Confirmado") return false
      const planWeekNum = getWeek(plan.atividades[0].periodo.from, { locale: ptBR, weekStartsOn: 1 })
      const planYear = getYear(plan.atividades[0].periodo.from)
      return planWeekNum === weekNum && planYear === year
    })
    setCurrentWeekPlans(plansForWeek)
    setCurrentWeekTitle(
      `Planos da Semana ${weekNum} (${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM", { locale: ptBR })})`,
    )
    setIsWeeklyPlansDialogOpen(true)
  }

  const handleToggleISistemaStatus = (planId: string) => {
    setSubmittedPlans((prev) =>
      prev.map((plan) => (plan.id === planId ? { ...plan, isInISistema: !plan.isInISistema } : plan)),
    )
  }

  const getEditingPlan = () => {
    if (!editingPlanId) return null
    return submittedPlans.find((plan) => plan.id === editingPlanId)
  }

  const getPlansForDate = (date: Date) => {
    return submittedPlans.filter((plan) => {
      // Apply filters
      if (calendarFilterTipoTrabalho !== "all" && plan.tipoTrabalho !== calendarFilterTipoTrabalho) {
        return false
      }

      // Check if any activity falls on this date
      return plan.atividades.some((atividade) => {
        if (!atividade.periodo.from || !atividade.periodo.to) return false
        const dates = getDatesInRange(atividade.periodo.from, atividade.periodo.to)
        return dates.some((d) => isSameDay(d, date))
      })
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmado":
        return "bg-green-100 border-green-300 text-green-800"
      case "Pendente Confirmação":
        return "bg-yellow-100 border-yellow-300 text-yellow-800"
      case "Rejeitado":
        return "bg-red-100 border-red-300 text-red-800"
      default:
        return "bg-gray-100 border-gray-300 text-gray-800"
    }
  }

  const getUniqueWorkTypes = () => {
    const types = new Set<string>()
    submittedPlans.forEach((plan) => {
      if (plan.tipoTrabalho) types.add(plan.tipoTrabalho)
    })
    return Array.from(types)
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

  if (userRole === "admin") {
    return <AdminDashboard onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                    <span>
                      {autoEstrada || vegetalNumero || tipoTrabalho
                        ? `${autoEstrada || "..."} - ${vegetalNumero || "..."} - ${tipoTrabalho || "..."}`
                        : "Novo Plano de Trabalho"}
                    </span>
                  </CardTitle>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="km-inicial">Km inicial</Label>
                    <Input
                      id="km-inicial"
                      type="number"
                      placeholder="Ex: 100"
                      value={kmInicial}
                      onChange={(e) => setKmInicial(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="km-final">Km final</Label>
                    <Input
                      id="km-final"
                      type="number"
                      placeholder="Ex: 150"
                      value={kmFinal}
                      onChange={(e) => setKmFinal(e.target.value)}
                    />
                  </div>
                </div>

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
                    <Label htmlFor="vegetal-tipo-trabalho">Tipo de Trabalho</Label>
                    <Select value={tipoTrabalho} onValueChange={setTipoTrabalho}>
                      <SelectTrigger id="vegetal-tipo-trabalho">
                        <SelectValue placeholder="Selecione o tipo de trabalho" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opcao1">Opção 1 (a definir)</SelectItem>
                        <SelectItem value="opcao2">Opção 2 (a definir)</SelectItem>
                        <SelectItem value="opcao3">Opção 3 (a definir)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-gray-400" />
                    </div>
                    <div className="relative flex justify-center text-sm uppercase">
                      <span className="bg-white px-4 text-gray-700 font-semibold tracking-wide">
                        Detalhes das Atividades
                      </span>
                    </div>
                  </div>

                  {/* Lista de atividades já adicionadas */}
                  {atividades.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Atividades Adicionadas ({atividades.length})</Label>
                      </div>
                      <Accordion type="single" collapsible className="w-full">
                        {atividades.map((atividade, index) => (
                          <AccordionItem key={atividade.id} value={atividade.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="font-medium">
                                  Atividade {index + 1}: {atividade.descricaoAtividade.substring(0, 50)}
                                  {atividade.descricaoAtividade.length > 50 && "..."}
                                </span>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" onClick={() => handleEditarAtividade(atividade)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoverAtividade(atividade.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="p-4 space-y-3 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <Label className="font-semibold">Descrição:</Label>
                                    <p className="text-gray-700">{atividade.descricaoAtividade}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Período:</Label>
                                    <p className="text-gray-700">
                                      {atividade.periodo.from && atividade.periodo.to
                                        ? `${format(atividade.periodo.from, "dd/MM/yyyy")} - ${format(atividade.periodo.to, "dd/MM/yyyy")}`
                                        : "N/A"}
                                    </p>
                                  </div>
                                  {atividade.pkInicial && (
                                    <div>
                                      <Label className="font-semibold">Pk Inicial:</Label>
                                      <p className="text-gray-700">{atividade.pkInicial}</p>
                                    </div>
                                  )}
                                  {atividade.pkFinal && (
                                    <div>
                                      <Label className="font-semibold">Pk Final:</Label>
                                      <p className="text-gray-700">{atividade.pkFinal}</p>
                                    </div>
                                  )}
                                  {atividade.sentido && (
                                    <div>
                                      <Label className="font-semibold">Sentido:</Label>
                                      <p className="text-gray-700 capitalize">{atividade.sentido}</p>
                                    </div>
                                  )}
                                  {atividade.perfil && (
                                    <div>
                                      <Label className="font-semibold">Perfil:</Label>
                                      <p className="text-gray-700">{atividade.perfil}</p>
                                    </div>
                                  )}
                                  {atividade.localIntervencao && (
                                    <div>
                                      <Label className="font-semibold">Local de Intervenção:</Label>
                                      <p className="text-gray-700 capitalize">
                                        {atividade.localIntervencao.replace(/-/g, " ")}
                                      </p>
                                    </div>
                                  )}
                                  {atividade.restricoes && (
                                    <div>
                                      <Label className="font-semibold">Restrições:</Label>
                                      <p className="text-gray-700">{atividade.restricoes}</p>
                                    </div>
                                  )}
                                  {atividade.esquema && (
                                    <div>
                                      <Label className="font-semibold">Esquema:</Label>
                                      <p className="text-gray-700">{atividade.esquema}</p>
                                    </div>
                                  )}
                                  {atividade.observacoes && (
                                    <div className="md:col-span-2">
                                      <Label className="font-semibold">Observações:</Label>
                                      <p className="text-gray-700 whitespace-pre-wrap">{atividade.observacoes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="descricao-atividade">Descrição da atividade</Label>
                    <Textarea
                      id="descricao-atividade"
                      placeholder="Descreva a atividade a realizar..."
                      value={descricaoAtividade}
                      onChange={(e) => setDescricaoAtividade(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Período</Label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pk-inicial">Pk inicial</Label>
                      <Input
                        id="pk-inicial"
                        type="number"
                        placeholder="Ex: 10.5"
                        step="0.1"
                        value={pkInicial}
                        onChange={(e) => setPkInicial(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pk-final">Pk final</Label>
                      <Input
                        id="pk-final"
                        type="number"
                        placeholder="Ex: 15.3"
                        step="0.1"
                        value={pkFinal}
                        onChange={(e) => setPkFinal(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sentido">Sentido</Label>
                    <Select value={sentido} onValueChange={setSentido}>
                      <SelectTrigger id="sentido">
                        <SelectValue placeholder="Selecione o sentido" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crescente">Crescente</SelectItem>
                        <SelectItem value="decrescente">Decrescente</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="perfil">Perfil</Label>
                    <Select value={perfil} onValueChange={setPerfil}>
                      <SelectTrigger id="perfil">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2x2">2 x 2</SelectItem>
                        <SelectItem value="2x3">2 x 3</SelectItem>
                        <SelectItem value="2x4">2 x 4</SelectItem>
                        <SelectItem value="1x1">1 x 1</SelectItem>
                        <SelectItem value="1x2">1 x 2</SelectItem>
                        <SelectItem value="garrafao">Garrafão de Portagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-3 block">Tipo de Trabalhos</Label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="trabalho-fixo"
                          checked={trabalhoFixo}
                          onCheckedChange={(checked) => setTrabalhoFixo(checked as boolean)}
                        />
                        <Label htmlFor="trabalho-fixo" className="font-normal cursor-pointer">
                          Trabalhos Fixos
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="trabalho-movel"
                          checked={trabalhoMovel}
                          onCheckedChange={(checked) => setTrabalhoMovel(checked as boolean)}
                        />
                        <Label htmlFor="trabalho-movel" className="font-normal cursor-pointer">
                          Trabalhos Móveis
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="local-intervencao">Local de intervenção</Label>
                    <Select value={localIntervencao} onValueChange={setLocalIntervencao}>
                      <SelectTrigger id="local-intervencao">
                        <SelectValue placeholder="Selecione o local de intervenção" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plena-via">Plena Via</SelectItem>
                        <SelectItem value="no-ramo">Nó / Ramo</SelectItem>
                        <SelectItem value="separador-central">Separador Central</SelectItem>
                        <SelectItem value="talude">Talude</SelectItem>
                        <SelectItem value="acesso-exterior">Acesso Exterior</SelectItem>
                        <SelectItem value="portagem">Portagem</SelectItem>
                        <SelectItem value="area-servico">Área de Serviço</SelectItem>
                        <SelectItem value="area-repouso">Área de Repouso</SelectItem>
                        <SelectItem value="fora-concessao">Fora da Concessão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="restricoes">Restrições</Label>
                    <Select value={restricoes} onValueChange={setRestricoes}>
                      <SelectTrigger id="restricoes">
                        <SelectValue placeholder="Selecione as restrições" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restricao1">Restrição 1 (a definir)</SelectItem>
                        <SelectItem value="restricao2">Restrição 2 (a definir)</SelectItem>
                        <SelectItem value="restricao3">Restrição 3 (a definir)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="esquema">Esquema</Label>
                    <Select value={esquema} onValueChange={setEsquema}>
                      <SelectTrigger id="esquema">
                        <SelectValue placeholder="Selecione o esquema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="esquema1">Esquema 1 (a definir)</SelectItem>
                        <SelectItem value="esquema2">Esquema 2 (a definir)</SelectItem>
                        <SelectItem value="esquema3">Esquema 3 (a definir)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Adicione observações relevantes..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button size="sm" onClick={handleAdicionarAtividade} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      {editingAtividadeId ? "Atualizar Atividade" : "Adicionar Atividade"}
                    </Button>
                    {editingAtividadeId && (
                      <Button size="sm" variant="ghost" onClick={resetAtividadeForm}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-gray-400" />
                  </div>
                  <div className="relative flex justify-center text-sm uppercase">
                    <span className="bg-white px-4 text-gray-700 font-semibold tracking-wide">Contactos</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Fiscalização */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold text-gray-900">Fiscalização</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fiscalizacao-nome">Nome</Label>
                        <Input
                          id="fiscalizacao-nome"
                          type="text"
                          placeholder="Nome do responsável"
                          value={fiscalizacaoNome}
                          onChange={(e) => setFiscalizacaoNome(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fiscalizacao-contato">Contato</Label>
                        <Input
                          id="fiscalizacao-contato"
                          type="tel"
                          placeholder="Telefone ou email"
                          value={fiscalizacaoContato}
                          onChange={(e) => setFiscalizacaoContato(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Entidade Executante */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold text-gray-900">Entidade Executante</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="entidade-nome">Nome</Label>
                        <Input
                          id="entidade-nome"
                          type="text"
                          placeholder="Nome do responsável"
                          value={entidadeExecutanteNome}
                          onChange={(e) => setEntidadeExecutanteNome(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="entidade-contato">Contato</Label>
                        <Input
                          id="entidade-contato"
                          type="tel"
                          placeholder="Telefone ou email"
                          value={entidadeExecutanteContato}
                          onChange={(e) => setEntidadeExecutanteContato(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sinalização */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold text-gray-900">Sinalização</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sinalizacao-nome">Nome</Label>
                        <Input
                          id="sinalizacao-nome"
                          type="text"
                          placeholder="Nome do responsável"
                          value={sinalizacaoNome}
                          onChange={(e) => setSinalizacaoNome(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sinalizacao-contato">Contato</Label>
                        <Input
                          id="sinalizacao-contato"
                          type="tel"
                          placeholder="Telefone ou email"
                          value={sinalizacaoContato}
                          onChange={(e) => setSinalizacaoContato(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" onClick={handleSubmitOrUpdateVegetalPlan}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {editingPlanId ? "Atualizar Plano de Trabalho" : "Submeter Plano de Trabalho"}
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="aprovacao" className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4" />
                <span>Aprovação de Planos</span>
              </TabsTrigger>
              <TabsTrigger value="calendario" className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4" />
                <span>Calendário</span>
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
                              {plan.autoEstrada || "..."} - {plan.numero || "..."} - {plan.tipoTrabalho || "..."}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {plan.atividades.length} atividade{plan.atividades.length !== 1 && "s"}
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
                                        <Label className="font-semibold">Sublanço:</Label>
                                        <span className="text-gray-700">{selectedPlanForDetails.numero || "N/A"}</span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Tipo de Trabalho:</Label>
                                        <span className="text-gray-700">
                                          {selectedPlanForDetails.tipoTrabalho || "N/A"}
                                        </span>
                                      </div>

                                      {selectedPlanForDetails.kmInicial && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Inicial:</Label>
                                          <span className="text-gray-700">{selectedPlanForDetails.kmInicial}</span>
                                        </div>
                                      )}

                                      {selectedPlanForDetails.kmFinal && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Final:</Label>
                                          <span className="text-gray-700">{selectedPlanForDetails.kmFinal}</span>
                                        </div>
                                      )}

                                      {(selectedPlanForDetails.trabalhoFixo ||
                                        selectedPlanForDetails.trabalhoMovel) && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Tipo de Trabalhos:</Label>
                                          <span className="text-gray-700">
                                            {[
                                              selectedPlanForDetails.trabalhoFixo && "Trabalhos Fixos",
                                              selectedPlanForDetails.trabalhoMovel && "Trabalhos Móveis",
                                            ]
                                              .filter(Boolean)
                                              .join(", ")}
                                          </span>
                                        </div>
                                      )}

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

                                    {(selectedPlanForDetails.fiscalizacaoNome ||
                                      selectedPlanForDetails.entidadeExecutanteNome ||
                                      selectedPlanForDetails.sinalizacaoNome) && (
                                      <div className="border-t pt-4">
                                        <Label className="text-base font-semibold mb-3 block">Contactos</Label>
                                        <div className="space-y-3">
                                          {selectedPlanForDetails.fiscalizacaoNome && (
                                            <div>
                                              <Label className="font-semibold text-sm">Fiscalização:</Label>
                                              <p className="text-gray-700">
                                                {selectedPlanForDetails.fiscalizacaoNome}
                                                {selectedPlanForDetails.fiscalizacaoContato &&
                                                  ` - ${selectedPlanForDetails.fiscalizacaoContato}`}
                                              </p>
                                            </div>
                                          )}
                                          {selectedPlanForDetails.entidadeExecutanteNome && (
                                            <div>
                                              <Label className="font-semibold text-sm">Entidade Executante:</Label>
                                              <p className="text-gray-700">
                                                {selectedPlanForDetails.entidadeExecutanteNome}
                                                {selectedPlanForDetails.entidadeExecutanteContato &&
                                                  ` - ${selectedPlanForDetails.entidadeExecutanteContato}`}
                                              </p>
                                            </div>
                                          )}
                                          {selectedPlanForDetails.sinalizacaoNome && (
                                            <div>
                                              <Label className="font-semibold text-sm">Sinalização:</Label>
                                              <p className="text-gray-700">
                                                {selectedPlanForDetails.sinalizacaoNome}
                                                {selectedPlanForDetails.sinalizacaoContato &&
                                                  ` - ${selectedPlanForDetails.sinalizacaoContato}`}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <div className="border-t pt-4">
                                      <h5 className="text-lg font-semibold mb-4">
                                        Atividades ({selectedPlanForDetails.atividades.length}):
                                      </h5>
                                      {selectedPlanForDetails.atividades.length === 0 ? (
                                        <p className="text-gray-500">Nenhuma atividade adicionada.</p>
                                      ) : (
                                        <Accordion type="single" collapsible className="w-full">
                                          {selectedPlanForDetails.atividades.map((atividade, index) => (
                                            <AccordionItem key={atividade.id} value={atividade.id}>
                                              <AccordionTrigger>
                                                Atividade {index + 1}: {atividade.descricaoAtividade.substring(0, 50)}
                                                {atividade.descricaoAtividade.length > 50 && "..."}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="p-4 space-y-3 bg-gray-50 rounded-lg">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                      <Label className="font-semibold">Descrição:</Label>
                                                      <p className="text-gray-700">{atividade.descricaoAtividade}</p>
                                                    </div>
                                                    <div>
                                                      <Label className="font-semibold">Período:</Label>
                                                      <p className="text-gray-700">
                                                        {atividade.periodo.from && atividade.periodo.to
                                                          ? `${format(atividade.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(atividade.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                                          : "N/A"}
                                                      </p>
                                                    </div>
                                                    {atividade.pkInicial && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Inicial:</Label>
                                                        <p className="text-gray-700">{atividade.pkInicial}</p>
                                                      </div>
                                                    )}
                                                    {atividade.pkFinal && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Final:</Label>
                                                        <p className="text-gray-700">{atividade.pkFinal}</p>
                                                      </div>
                                                    )}
                                                    {atividade.sentido && (
                                                      <div>
                                                        <Label className="font-semibold">Sentido:</Label>
                                                        <p className="text-gray-700 capitalize">{atividade.sentido}</p>
                                                      </div>
                                                    )}
                                                    {atividade.perfil && (
                                                      <div>
                                                        <Label className="font-semibold">Perfil:</Label>
                                                        <p className="text-gray-700">{atividade.perfil}</p>
                                                      </div>
                                                    )}
                                                    {atividade.localIntervencao && (
                                                      <div>
                                                        <Label className="font-semibold">Local de Intervenção:</Label>
                                                        <p className="text-gray-700 capitalize">
                                                          {atividade.localIntervencao.replace(/-/g, " ")}
                                                        </p>
                                                      </div>
                                                    )}
                                                    {atividade.restricoes && (
                                                      <div>
                                                        <Label className="font-semibold">Restrições:</Label>
                                                        <p className="text-gray-700">{atividade.restricoes}</p>
                                                      </div>
                                                    )}
                                                    {atividade.esquema && (
                                                      <div>
                                                        <Label className="font-semibold">Esquema:</Label>
                                                        <p className="text-gray-700">{atividade.esquema}</p>
                                                      </div>
                                                    )}
                                                    {atividade.observacoes && (
                                                      <div className="md:col-span-2">
                                                        <Label className="font-semibold">Observações:</Label>
                                                        <p className="text-gray-700 whitespace-pre-wrap">
                                                          {atividade.observacoes}
                                                        </p>
                                                      </div>
                                                    )}
                                                  </div>

                                                  {Object.entries(atividade.detalhesDiarios).length > 0 && (
                                                    <div className="mt-4 border-t pt-4">
                                                      <Label className="font-semibold block mb-2">
                                                        Detalhes Diários:
                                                      </Label>
                                                      <div className="space-y-3">
                                                        {Object.entries(atividade.detalhesDiarios).map(
                                                          ([dateString, details]) => (
                                                            <div
                                                              key={dateString}
                                                              className="border rounded p-3 bg-white"
                                                            >
                                                              <p className="font-medium text-xs text-blue-600 mb-2">
                                                                {format(new Date(dateString), "PPP", { locale: ptBR })}
                                                              </p>
                                                              <div className="grid grid-cols-2 gap-2 text-xs">
                                                                {details.timeSlot && (
                                                                  <div>
                                                                    <span className="font-medium">Horário:</span>{" "}
                                                                    {details.timeSlot}
                                                                  </div>
                                                                )}
                                                                {details.perfilTipo && (
                                                                  <div>
                                                                    <span className="font-medium">Perfil:</span>{" "}
                                                                    {details.perfilTipo}
                                                                  </div>
                                                                )}
                                                                {details.kmsInicio && (
                                                                  <div>
                                                                    <span className="font-medium">Km Início:</span>{" "}
                                                                    {details.kmsInicio}
                                                                  </div>
                                                                )}
                                                                {details.kmsFim && (
                                                                  <div>
                                                                    <span className="font-medium">Km Fim:</span>{" "}
                                                                    {details.kmsFim}
                                                                  </div>
                                                                )}
                                                                {details.responsavelNome && (
                                                                  <div>
                                                                    <span className="font-medium">Responsável:</span>{" "}
                                                                    {details.responsavelNome}
                                                                  </div>
                                                                )}
                                                                {details.responsavelContacto && (
                                                                  <div>
                                                                    <span className="font-medium">Contacto:</span>{" "}
                                                                    {details.responsavelContacto}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>
                                          ))}
                                        </Accordion>
                                      )}
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button onClick={() => setSelectedPlanForDetails(null)}>Fechar</Button>
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
                                  `${plan.autoEstrada || "..."} - ${plan.numero || "..."} - ${plan.tipoTrabalho || "..."}`,
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
                                  `${plan.autoEstrada || "..."} - ${plan.numero || "..."} - ${plan.tipoTrabalho || "..."}`,
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

            <TabsContent value="calendario">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <span>Calendário de Planos</span>
                  </CardTitle>
                  <CardDescription>Visualização mensal dos planos de trabalho agendados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="filter-tipo-trabalho">Tipo de Trabalho</Label>
                      <Select value={calendarFilterTipoTrabalho} onValueChange={setCalendarFilterTipoTrabalho}>
                        <SelectTrigger id="filter-tipo-trabalho">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {getUniqueWorkTypes().map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="filter-status">Status</Label>
                      <Select value={calendarFilterPeriod} onValueChange={setCalendarFilterPeriod}>
                        <SelectTrigger id="filter-status">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Pendente Confirmação">Pendente Confirmação</SelectItem>
                          <SelectItem value="Confirmado">Confirmado</SelectItem>
                          <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentCalendarMonth(subMonths(currentCalendarMonth, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-lg font-semibold capitalize">
                      {format(currentCalendarMonth, "MMMM yyyy", { locale: ptBR })}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentCalendarMonth(addMonths(currentCalendarMonth, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day headers */}
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                      <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {eachDayOfInterval({
                      start: startOfWeek(startOfMonth(currentCalendarMonth), { locale: ptBR }),
                      end: endOfMonth(currentCalendarMonth),
                    }).map((day, index) => {
                      const plansForDay = getPlansForDate(day).filter((plan) => {
                        if (calendarFilterPeriod === "all") return true
                        return plan.status === calendarFilterPeriod
                      })
                      const isCurrentMonth = isSameMonth(day, currentCalendarMonth)

                      return (
                        <div
                          key={index}
                          className={`min-h-[120px] border rounded-lg p-2 ${
                            isCurrentMonth ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <div
                            className={`text-sm font-medium mb-2 ${isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {plansForDay.slice(0, 2).map((plan) => (
                              <Dialog key={plan.id}>
                                <DialogTrigger asChild>
                                  <div
                                    className={`text-xs p-2 rounded border cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(plan.status)}`}
                                  >
                                    <div className="font-semibold truncate">
                                      {plan.autoEstrada || "..."} - {plan.numero || "..."}
                                    </div>
                                    <div className="text-xs truncate">{plan.tipoTrabalho || "..."}</div>
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      {plan.autoEstrada || "..."} - {plan.numero || "..."} -{" "}
                                      {plan.tipoTrabalho || "..."}
                                    </DialogTitle>
                                    <DialogDescription>Detalhes do plano de trabalho</DialogDescription>
                                  </DialogHeader>

                                  <div className="space-y-4 py-4 text-sm">
                                    <div className="grid grid-cols-1 gap-4">
                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Status:</Label>
                                        <Badge
                                          className="w-fit"
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
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Tipo:</Label>
                                        <span className="text-gray-700">{plan.tipo}</span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Sublanço:</Label>
                                        <span className="text-gray-700">{plan.numero || "N/A"}</span>
                                      </div>

                                      {plan.kmInicial && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Inicial:</Label>
                                          <span className="text-gray-700">{plan.kmInicial}</span>
                                        </div>
                                      )}

                                      {plan.kmFinal && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Final:</Label>
                                          <span className="text-gray-700">{plan.kmFinal}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="border-t pt-4">
                                      <h5 className="text-lg font-semibold mb-4">
                                        Atividades ({plan.atividades.length}):
                                      </h5>
                                      {plan.atividades.length === 0 ? (
                                        <p className="text-gray-500">Nenhuma atividade adicionada.</p>
                                      ) : (
                                        <Accordion type="single" collapsible className="w-full">
                                          {plan.atividades.map((atividade, index) => (
                                            <AccordionItem key={atividade.id} value={atividade.id}>
                                              <AccordionTrigger>
                                                Atividade {index + 1}: {atividade.descricaoAtividade.substring(0, 50)}
                                                {atividade.descricaoAtividade.length > 50 && "..."}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="p-4 space-y-3 bg-gray-50 rounded-lg">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                      <Label className="font-semibold">Descrição:</Label>
                                                      <p className="text-gray-700">{atividade.descricaoAtividade}</p>
                                                    </div>
                                                    <div>
                                                      <Label className="font-semibold">Período:</Label>
                                                      <p className="text-gray-700">
                                                        {atividade.periodo.from && atividade.periodo.to
                                                          ? `${format(atividade.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(atividade.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                                          : "N/A"}
                                                      </p>
                                                    </div>
                                                    {atividade.pkInicial && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Inicial:</Label>
                                                        <p className="text-gray-700">{atividade.pkInicial}</p>
                                                      </div>
                                                    )}
                                                    {atividade.pkFinal && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Final:</Label>
                                                        <p className="text-gray-700">{atividade.pkFinal}</p>
                                                      </div>
                                                    )}
                                                    {atividade.sentido && (
                                                      <div>
                                                        <Label className="font-semibold">Sentido:</Label>
                                                        <p className="text-gray-700 capitalize">{atividade.sentido}</p>
                                                      </div>
                                                    )}
                                                    {atividade.perfil && (
                                                      <div>
                                                        <Label className="font-semibold">Perfil:</Label>
                                                        <p className="text-gray-700">{atividade.perfil}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>
                                          ))}
                                        </Accordion>
                                      )}
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button variant="outline">Fechar</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            ))}
                            {plansForDay.length > 2 && (
                              <div className="text-xs text-gray-500 text-center py-1">
                                +{plansForDay.length - 2} mais
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                      <span className="text-sm text-gray-600">Confirmado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                      <span className="text-sm text-gray-600">Pendente Confirmação</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                      <span className="text-sm text-gray-600">Rejeitado</span>
                    </div>
                  </div>
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
                          })
                          const endDate = new Date(startDate)
                          endDate.setDate(startDate.getDate() + 4)

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
                                  {plan.autoEstrada || "..."} - {plan.numero || "..."} - {plan.tipoTrabalho || "..."}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {plan.atividades.length} atividade{plan.atividades.length !== 1 && "s"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default">{plan.status}</Badge>
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
                            {plan.autoEstrada || "..."} - {plan.numero || "..."} - {plan.tipoTrabalho || "..."}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {plan.atividades.length} atividade{plan.atividades.length !== 1 && "s"}
                          </p>
                          {plan.comentarioGO && (
                            <p className="text-sm text-red-600 mt-1">
                              <strong>Comentário GO:</strong> {plan.comentarioGO}
                            </p>
                          )}
                        </div>
                      </div>
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
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

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
                        {plan.autoEstrada || "..."} - {plan.numero || "..."} - {plan.tipoTrabalho || "..."}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {plan.atividades.length} atividade{plan.atividades.length !== 1 && "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{plan.status}</Badge>
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
