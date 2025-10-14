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
  isBefore,
  startOfDay,
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
import type { DateRange as DayPickerDateRange } from "react-day-picker" // Renamed import to avoid conflict

// Tipagem para o intervalo de datas
interface DateRange {
  from?: Date
  to?: Date
}

interface DayData {
  date: Date
  horaInicio: string
  horaFim: string
  todoDia: boolean
  pkInicialKm: string
  pkInicialMeters: string
  pkFinalKm: string
  pkFinalMeters: string
  sentido: string
  perfil: string
  tipoTrabalhoDay: string
  localIntervencao: string
  restricoes: string
  esquema: string
  observacoes: string
}

// Tipagem para uma atividade
interface Atividade {
  id: string
  descricaoAtividade: string
  periodo: DateRange
  pkInicialKm: string
  pkInicialMeters: string
  pkFinalKm: string
  pkFinalMeters: string
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
  atividade?: string // Added atividade field
  autoEstrada?: string // Added autoEstrada field to SubmittedPlan interface
  concessao?: string // Added concessao field
  atividades: Atividade[]
  status: "Pendente Confirmação" | "Confirmado" | "Rejeitado"
  tipo: "Manutenção Vegetal" | "Beneficiação de Pavimento" | "Manutenção Geral"
  isInISistema: boolean
  comentarioGO?: string
  kmInicial?: string
  kmFinal?: string
  trabalhoFixo: boolean
  trabalhoMovel: boolean
  perigosTemporarios: boolean
  fiscalizacaoNome?: string
  fiscalizacaoContato?: string
  entidadeExecutanteNome?: string
  entidadeExecutanteContato?: string
  sinalizacaoNome?: string
  sinalizacaoContato?: string
}

function calculateEaster(year: number): Date {
  const f = Math.floor
  const G = year % 19
  const C = f(year / 100)
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11))
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7
  const L = I - J
  const month = 3 + f((L + 40) / 44)
  const day = L + 28 - 31 * f(month / 4)
  return new Date(year, month - 1, day)
}

function getPortugueseHolidays(year: number): Date[] {
  const easter = calculateEaster(year)
  const holidays: Date[] = [
    new Date(year, 0, 1), // Ano Novo
    new Date(year, 3, 25), // Dia da Liberdade
    new Date(year, 4, 1), // Dia do Trabalhador
    new Date(year, 5, 10), // Dia de Portugal
    new Date(year, 7, 15), // Assunção de Nossa Senhora
    new Date(year, 9, 5), // Implantação da República
    new Date(year, 10, 1), // Todos os Santos
    new Date(year, 11, 1), // Restauração da Independência
    new Date(year, 11, 8), // Imaculada Conceição
    new Date(year, 11, 25), // Natal
  ]

  // Add variable holidays based on Easter
  const carnival = new Date(easter)
  carnival.setDate(easter.getDate() - 47) // Carnaval (47 days before Easter)

  const goodFriday = new Date(easter)
  goodFriday.setDate(easter.getDate() - 2) // Sexta-feira Santa

  const corpusChristi = new Date(easter)
  corpusChristi.setDate(easter.getDate() + 60) // Corpo de Deus

  holidays.push(carnival, goodFriday, corpusChristi)

  return holidays
}

function isPortugueseHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const holidays = getPortugueseHolidays(year)
  return holidays.some((holiday) => isSameDay(holiday, date))
}

export default function ServiceSchedulerApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [user, setUser] = useState({ name: "", email: "" })
  const [userRole, setUserRole] = useState<"prestador" | "go" | "cco" | "admin" | null>(null)
  const [dateRange, setDateRange] = useState<DayPickerDateRange | undefined>(undefined) // Used DayPickerDateRange here
  const [dailyDetails, setDailyDetails] = useState<{ [dateString: string]: DailyDetail }>({})
  const [isUrgente, setIsUrgente] = useState(false) // Changed from isUrgente to setIsUrgente for consistency with other setters

  const [dayDataMap, setDayDataMap] = useState<{ [dateString: string]: DayData }>({})

  const [vegetalNumero, setVegetalNumero] = useState("")
  const [tipoTrabalho, setTipoTrabalho] = useState("")
  const [atividade, setAtividade] = useState("")
  const [descricaoAtividade, setDescricaoAtividade] = useState("")
  const [submittedPlans, setSubmittedPlans] = useState<SubmittedPlan[]>([])
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<SubmittedPlan | null>(null)
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("vegetal")
  const [autoEstrada, setAutoEstrada] = useState("")
  const [concessao, setConcessao] = useState("") // Added concessao state
  const [kmInicial, setKmInicial] = useState("")
  const [kmFinal, setKmFinal] = useState("")
  const [pkInicial, setPkInicial] = useState("") // This state will now be split
  const [pkFinal, setPkFinal] = useState("") // This state will now be split
  const [sentido, setSentido] = useState("")
  const [perfil, setPerfil] = useState("")
  const [trabalhoFixo, setTrabalhoFixo] = useState(false)
  const [trabalhoMovel, setTrabalhoMovel] = useState(false)
  const [perigosTemporarios, setPerigosTemporarios] = useState(false)
  const [localIntervencao, setLocalIntervencao] = useState("")
  const [restricoes, setRestricoes] = useState("")
  const [esquema, setEsquema] = useState("")
  const [observacoes, setObservacoes] = useState("")

  // State for PK initial and final (split into km and meters)
  const [pkInicialKm, setPkInicialKm] = useState("")
  const [pkInicialMeters, setPkInicialMeters] = useState("")
  const [pkFinalKm, setPkFinalKm] = useState("")
  const [pkFinalMeters, setPkFinalMeters] = useState("")

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

  const [concessoes, setConcessoes] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    const loadConcessoes = async () => {
      try {
        const response = await fetch("/data/concessoes.json")
        if (!response.ok) {
          throw new Error("Failed to load concessoes")
        }
        const data: string[] = await response.json()
        const formattedData = data.map((item) => ({
          value: item,
          label: item,
        }))
        setConcessoes(formattedData)
      } catch (error) {
        console.error("Erro ao carregar concessões:", error)
      }
    }

    loadConcessoes()
  }, [])

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

  useEffect(() => {
    const newDayDataMap = generateDaysData(dateRange)
    // Preserve existing data for dates that are still in the new range
    Object.keys(dayDataMap).forEach((dateStr) => {
      if (newDayDataMap.find((day) => format(day.date, "yyyy-MM-dd") === dateStr)) {
        const existingData = dayDataMap[dateStr]
        const dayIndex = newDayDataMap.findIndex((day) => format(day.date, "yyyy-MM-dd") === dateStr)
        if (dayIndex !== -1) {
          newDayDataMap[dayIndex] = { ...newDayDataMap[dayIndex], ...existingData }
        }
      }
    })
    setDayDataMap(Object.fromEntries(newDayDataMap.map((day) => [format(day.date, "yyyy-MM-dd"), day])))
  }, [dateRange])

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
    setConcessao("") // Reset concessao state
    setKmInicial("")
    setKmFinal("")
    setIsUrgente(false)
    setPkInicial("") // Resetting old states if they exist
    setPkFinal("") // Resetting old states if they exist
    setPkInicialKm("") // Reset new states
    setPkInicialMeters("")
    setPkFinalKm("")
    setPkFinalMeters("")
    setSentido("")
    setPerfil("")
    setTrabalhoFixo(false)
    setTrabalhoMovel(false)
    setPerigosTemporarios(false)
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

  // Function to generate an array of DayData objects for a given date range
  const generateDaysData = (range: DateRange | undefined): DayData[] => {
    if (!range?.from) return []

    const days: DayData[] = []
    const currentDate = new Date(range.from)
    const endDate = range.to || range.from

    while (currentDate <= endDate) {
      days.push({
        date: new Date(currentDate),
        horaInicio: "",
        horaFim: "",
        todoDia: false,
        pkInicialKm: "",
        pkInicialMeters: "",
        pkFinalKm: "",
        pkFinalMeters: "",
        sentido: "",
        perfil: "",
        tipoTrabalhoDay: "",
        localIntervencao: "",
        restricoes: "",
        esquema: "",
        observacoes: "",
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
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

  const updateDayData = (dateStr: string, field: keyof DayData, value: any) => {
    setDayDataMap((prev) => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [field]: value,
      },
    }))
  }

  const handleTodoDiaChange = (dateStr: string, checked: boolean) => {
    setDayDataMap((prev) => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        todoDia: checked,
        horaInicio: checked ? "00:00" : prev[dateStr]?.horaInicio || "",
        horaFim: checked ? "23:59" : prev[dateStr]?.horaFim || "",
      },
    }))
  }

  const formatTimeInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "")

    // Limit to 4 digits
    const limitedNumbers = numbers.slice(0, 4)

    // Add colon after first 2 digits
    if (limitedNumbers.length >= 3) {
      return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2)}`
    }

    return limitedNumbers
  }

  const handleTimeInput = (dateStr: string, field: "horaInicio" | "horaFim", value: string) => {
    const formatted = formatTimeInput(value)
    updateDayData(dateStr, field, formatted)
  }

  const resetAtividadeForm = () => {
    setDescricaoAtividade("")
    setDateRange(undefined)
    setDailyDetails({})
    setDayDataMap({}) // Reset day data map
    setPkInicialKm("") // Reset split PK fields
    setPkInicialMeters("")
    setPkFinalKm("")
    setPkFinalMeters("")
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
    setConcessao("") // Reset concessao state
    setKmInicial("")
    setKmFinal("")
    setIsUrgente(false)
    setTrabalhoFixo(false)
    setTrabalhoMovel(false)
    setPerigosTemporarios(false)
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

    // Validar que todos os dias têm todos os campos preenchidos
    const selectedDates = getDatesInRange(dateRange.from, dateRange.to)
    const missingFieldsDays: string[] = []

    selectedDates.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd")
      const dayData = dayDataMap[dateStr]

      if (!dayData) {
        missingFieldsDays.push(format(date, "dd/MM/yyyy"))
        return
      }

      // Verificar se todos os campos obrigatórios estão preenchidos
      // Excluir horaInicio e horaFim se 'todoDia' estiver ativo
      const requiredFields: { [key: string]: string | undefined } = {
        horaInicio: dayData.todoDia ? undefined : dayData.horaInicio,
        horaFim: dayData.todoDia ? undefined : dayData.horaFim,
        pkInicialKm: dayData.pkInicialKm,
        pkInicialMeters: dayData.pkInicialMeters,
        pkFinalKm: dayData.pkFinalKm,
        pkFinalMeters: dayData.pkFinalMeters,
        sentido: dayData.sentido,
        perfil: dayData.perfil,
        tipoTrabalhoDay: dayData.tipoTrabalhoDay,
        localIntervencao: dayData.localIntervencao,
        restricoes: dayData.restricoes,
        esquema: dayData.esquema,
        observacoes: dayData.observacoes,
      }

      const hasEmptyFields = Object.values(requiredFields).some(
        (value) => value !== undefined && (value === null || value.trim() === ""),
      )

      if (hasEmptyFields) {
        missingFieldsDays.push(format(date, "dd/MM/yyyy"))
      }
    })

    if (missingFieldsDays.length > 0) {
      setNotificationDialog({
        open: true,
        title: "Campos Obrigatórios Incompletos",
        description: `Por favor, preencha todos os campos obrigatórios para os seguintes dias: ${missingFieldsDays.join(", ")}. Certifique-se de preencher todos os campos relevantes.`,
      })
      return
    }

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
                pkInicialKm, // Update split PK fields
                pkInicialMeters,
                pkFinalKm,
                pkFinalMeters,
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
        pkInicialKm, // Add split PK fields
        pkInicialMeters,
        pkFinalKm,
        pkFinalMeters,
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
    setPkInicialKm(atividade.pkInicialKm) // Load split PK fields
    setPkInicialMeters(atividade.pkInicialMeters)
    setPkFinalKm(atividade.pkFinalKm)
    setPkFinalMeters(atividade.pkFinalMeters)
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
                atividade: atividade, // Save atividade when updating
                autoEstrada: autoEstrada, // Save autoEstrada when updating
                concessao: concessao, // Save concessao when updating
                atividades: atividades,
                status: "Pendente Confirmação",
                comentarioGO: undefined,
                kmInicial,
                kmFinal,
                trabalhoFixo,
                trabalhoMovel,
                perigosTemporarios, // Update temporary dangers
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
        atividade: atividade, // Save atividade when creating
        autoEstrada: autoEstrada, // Save autoEstrada when creating
        concessao: concessao, // Save concessao when creating
        atividades: atividades,
        status: "Pendente Confirmação",
        tipo: "Manutenção Vegetal",
        isInISistema: false,
        kmInicial,
        kmFinal,
        trabalhoFixo,
        trabalhoMovel,
        perigosTemporarios, // Add temporary dangers to plan data
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
    setAtividade(planToEdit.atividade || "") // Load atividade when editing
    setAutoEstrada(planToEdit.autoEstrada || "") // Load autoEstrada when editing
    setConcessao(planToEdit.concessao || "") // Load concessao when editing
    setKmInicial(planToEdit.kmInicial || "")
    setKmFinal(planToEdit.kmFinal || "")
    setTrabalhoFixo(planToEdit.trabalhoFixo || false)
    setTrabalhoMovel(planToEdit.trabalhoMovel || false)
    setPerigosTemporarios(planToEdit.perigosTemporarios || false) // Load temporary dangers
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
    return blockedDates.has(dateStr) || isBefore(startOfDay(date), startOfDay(new Date()))
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
      if (calendarFilterPeriod !== "all" && plan.status !== calendarFilterPeriod) {
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
        return "bg-destructive/10 border-destructive text-destructive"
      default:
        return "bg-muted border-border text-muted-foreground"
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
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
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
    // Replace hardcoded grays with semantic tokens
    <div className="min-h-screen bg-secondary">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Portal de agendamento - Planos de Trabalho</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{user.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Planos de Trabalho</h2>
        <p className="text-muted-foreground">Selecione o tipo de manutenção e crie seu plano de trabalho</p>

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
                  <Label htmlFor="concessao">Concessão</Label>
                  <Select value={concessao} onValueChange={setConcessao}>
                    <SelectTrigger id="concessao">
                      <SelectValue placeholder="Selecione a concessão" />
                    </SelectTrigger>
                    <SelectContent>
                      {concessoes.map((concessaoItem) => (
                        <SelectItem key={concessaoItem.value} value={concessaoItem.value}>
                          {concessaoItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <AutoEstradasSelect
                    value={autoEstrada}
                    onValueChange={setAutoEstrada}
                    label="Auto Estrada"
                    placeholder="Selecione a Auto Estrada"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
                  <div className="max-w-[120px]">
                    <Label htmlFor="km-inicial">Km inicial</Label>
                    <Input
                      id="km-inicial"
                      type="number"
                      placeholder="Ex: 100"
                      value={kmInicial}
                      onChange={(e) => setKmInicial(e.target.value)}
                    />
                  </div>
                  <div className="max-w-[120px]">
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
                  // Replace bg-red-50 and border-red-200 with destructive tokens
                  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
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

                    <div>
                      <Label htmlFor="atividade">Atividade</Label>
                      <Select value={atividade} onValueChange={setAtividade}>
                        <SelectTrigger id="atividade">
                          <SelectValue placeholder="Selecione a atividade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limpeza">Limpeza</SelectItem>
                          <SelectItem value="poda">Poda</SelectItem>
                          <SelectItem value="reparacao">Reparação</SelectItem>
                          <SelectItem value="sinalizacao">Sinalização</SelectItem>
                          <SelectItem value="pavimentacao">Pavimentação</SelectItem>
                          <SelectItem value="inspecao">Inspeção</SelectItem>
                          <SelectItem value="manutencao-preventiva">Manutenção Preventiva</SelectItem>
                          <SelectItem value="manutencao-corretiva">Manutenção Corretiva</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm uppercase">
                      <span className="bg-card px-4 text-foreground font-semibold tracking-wide">
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
                              <div className="p-4 space-y-3 bg-muted rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <Label className="font-semibold">Descrição:</Label>
                                    <p className="text-foreground">{atividade.descricaoAtividade}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Período:</Label>
                                    <p className="text-foreground">
                                      {atividade.periodo.from && atividade.periodo.to
                                        ? `${format(atividade.periodo.from, "dd/MM/yyyy")}-${format(atividade.periodo.to, "dd/MM/yyyy")}`
                                        : "N/A"}
                                    </p>
                                  </div>
                                  {atividade.pkInicialKm && (
                                    <div>
                                      <Label className="font-semibold">Pk Inicial:</Label>
                                      <p className="text-foreground">{`${atividade.pkInicialKm}km ${atividade.pkInicialMeters}m`}</p>
                                    </div>
                                  )}
                                  {atividade.pkFinalKm && (
                                    <div>
                                      <Label className="font-semibold">Pk Final:</Label>
                                      <p className="text-foreground">{`${atividade.pkFinalKm}km ${atividade.pkFinalMeters}m`}</p>
                                    </div>
                                  )}
                                  {atividade.sentido && (
                                    <div>
                                      <Label className="font-semibold">Sentido:</Label>
                                      <p className="text-foreground capitalize">{atividade.sentido}</p>
                                    </div>
                                  )}
                                  {atividade.perfil && (
                                    <div>
                                      <Label className="font-semibold">Perfil:</Label>
                                      <p className="text-foreground">{atividade.perfil}</p>
                                    </div>
                                  )}
                                  {atividade.localIntervencao && (
                                    <div>
                                      <Label className="font-semibold">Local de Intervenção:</Label>
                                      <p className="text-foreground capitalize">
                                        {atividade.localIntervencao.replace(/-/g, " ")}
                                      </p>
                                    </div>
                                  )}
                                  {atividade.restricoes && (
                                    <div>
                                      <Label className="font-semibold">Restrições:</Label>
                                      <p className="text-foreground">{atividade.restricoes}</p>
                                    </div>
                                  )}
                                  {atividade.esquema && (
                                    <div>
                                      <Label className="font-semibold">Esquema:</Label>
                                      <p className="text-foreground">{atividade.esquema}</p>
                                    </div>
                                  )}
                                  {atividade.observacoes && (
                                    <div className="md:col-span-2">
                                      <Label className="font-semibold">Observações:</Label>
                                      <p className="text-foreground whitespace-pre-wrap">{atividade.observacoes}</p>
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
                      numberOfMonths={3}
                      locale={ptBR}
                      className="rounded-md border shadow"
                      disabled={disableBlockedDates}
                      modifiers={{
                        holiday: (date) => isPortugueseHoliday(date),
                      }}
                      modifiersClassNames={{
                        holiday: "bg-red-100 text-red-900 font-semibold hover:bg-red-200",
                      }}
                    />
                    <div className="mt-3 text-xs text-muted-foreground text-center">
                      {datesToRender.length === 0 && "Selecione um período no calendário"}
                      {datesToRender.length === 1 && "1 dia selecionado"}
                      {datesToRender.length > 1 && `${datesToRender.length} dias selecionados`}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                        <span>Feriados Nacionais</span>
                      </div>
                    </div>
                  </div>

                  {datesToRender.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Detalhes por Dia</Label>
                      <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto">
                        {datesToRender.map((date) => {
                          const dateStr = format(date, "yyyy-MM-dd")
                          const dayData = dayDataMap[dateStr]
                          if (!dayData) return null

                          return (
                            <div
                              key={dateStr}
                              className="flex-shrink-0 border rounded-xl p-3 shadow-sm bg-white min-w-[300px] lg:min-w-[350px]"
                            >
                              {/* Date header */}
                              <div className="mb-3 pb-2 border-b">
                                <h4 className="font-semibold text-foreground">
                                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                                </h4>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {format(date, "EEEE", { locale: ptBR })}
                                </p>
                              </div>

                              {/* Time fields - horizontal layout */}
                              <div className="flex flex-row gap-2 mb-3">
                                <div className="flex-1">
                                  <Label htmlFor={`hora-inicio-${dateStr}`} className="text-xs">
                                    Hora de Início (24h)
                                  </Label>
                                  <Input
                                    id={`hora-inicio-${dateStr}`}
                                    type="text"
                                    value={dayData.horaInicio}
                                    onChange={(e) => handleTimeInput(dateStr, "horaInicio", e.target.value)}
                                    disabled={dayData.todoDia}
                                    className="text-sm"
                                    placeholder="HH:MM"
                                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                                    maxLength={5}
                                    required
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label htmlFor={`hora-fim-${dateStr}`} className="text-xs">
                                    Hora de Fim (24h)
                                  </Label>
                                  <Input
                                    id={`hora-fim-${dateStr}`}
                                    type="text"
                                    value={dayData.horaFim}
                                    onChange={(e) => handleTimeInput(dateStr, "horaFim", e.target.value)}
                                    disabled={dayData.todoDia}
                                    className="text-sm"
                                    placeholder="HH:MM"
                                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                                    maxLength={5}
                                    required
                                  />
                                </div>
                                <div className="flex flex-col justify-end pb-2">
                                  <div className="flex items-center space-x-1">
                                    <Checkbox
                                      id={`todo-dia-${dateStr}`}
                                      checked={dayData.todoDia}
                                      onCheckedChange={(checked) => handleTodoDiaChange(dateStr, checked as boolean)}
                                    />
                                    <Label htmlFor={`todo-dia-${dateStr}`} className="text-xs cursor-pointer">
                                      Todo o dia
                                    </Label>
                                  </div>
                                </div>
                              </div>

                              {/* Detail fields - vertical layout (shown when time is selected or todo dia is checked) */}
                              {(dayData.horaInicio || dayData.horaFim || dayData.todoDia) && (
                                <div className="space-y-3 pt-3 border-t">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-xs">Pk inicial</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="Km"
                                          value={dayData.pkInicialKm}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, "")
                                            updateDayData(dateStr, "pkInicialKm", value)
                                          }}
                                          className="text-sm w-16"
                                          maxLength={3}
                                        />
                                        <span className="text-lg font-semibold">+</span>
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="m"
                                          value={dayData.pkInicialMeters}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, "")
                                            if (Number.parseInt(value) <= 999 || value === "") {
                                              updateDayData(dateStr, "pkInicialMeters", value)
                                            }
                                          }}
                                          className="text-sm w-16"
                                          maxLength={3}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Pk final</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="Km"
                                          value={dayData.pkFinalKm}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, "")
                                            updateDayData(dateStr, "pkFinalKm", value)
                                          }}
                                          className="text-sm w-16"
                                          maxLength={3}
                                        />
                                        <span className="text-lg font-semibold">+</span>
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="m"
                                          value={dayData.pkFinalMeters}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, "")
                                            if (Number.parseInt(value) <= 999 || value === "") {
                                              updateDayData(dateStr, "pkFinalMeters", value)
                                            }
                                          }}
                                          className="text-sm w-16"
                                          maxLength={3}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <Label htmlFor={`sentido-${dateStr}`} className="text-xs">
                                      Sentido
                                    </Label>
                                    <Select
                                      value={dayData.sentido}
                                      onValueChange={(value) => updateDayData(dateStr, "sentido", value)}
                                    >
                                      <SelectTrigger id={`sentido-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
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
                                    <Label htmlFor={`perfil-${dateStr}`} className="text-xs">
                                      Perfil
                                    </Label>
                                    <Select
                                      value={dayData.perfil}
                                      onValueChange={(value) => updateDayData(dateStr, "perfil", value)}
                                    >
                                      <SelectTrigger id={`perfil-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
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
                                    <Label htmlFor={`tipo-trabalho-day-${dateStr}`} className="text-xs">
                                      Tipo de trabalho
                                    </Label>
                                    <Select
                                      value={dayData.tipoTrabalhoDay}
                                      onValueChange={(value) => updateDayData(dateStr, "tipoTrabalhoDay", value)}
                                    >
                                      <SelectTrigger id={`tipo-trabalho-day-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="opcao1">Opção 1 (a definir)</SelectItem>
                                        <SelectItem value="opcao2">Opção 2 (a definir)</SelectItem>
                                        <SelectItem value="opcao3">Opção 3 (a definir)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label htmlFor={`local-intervencao-${dateStr}`} className="text-xs">
                                      Local da intervenção
                                    </Label>
                                    <Select
                                      value={dayData.localIntervencao}
                                      onValueChange={(value) => updateDayData(dateStr, "localIntervencao", value)}
                                    >
                                      <SelectTrigger id={`local-intervencao-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
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
                                    <Label htmlFor={`restricoes-${dateStr}`} className="text-xs">
                                      Restrições
                                    </Label>
                                    <Select
                                      value={dayData.restricoes}
                                      onValueChange={(value) => updateDayData(dateStr, "restricoes", value)}
                                    >
                                      <SelectTrigger id={`restricoes-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="restricao1">Restrição 1 (a definir)</SelectItem>
                                        <SelectItem value="restricao2">Restrição 2 (a definir)</SelectItem>
                                        <SelectItem value="restricao3">Restrição 3 (a definir)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label htmlFor={`esquema-${dateStr}`} className="text-xs">
                                      Esquema
                                    </Label>
                                    <Select
                                      value={dayData.esquema}
                                      onValueChange={(value) => updateDayData(dateStr, "esquema", value)}
                                    >
                                      <SelectTrigger id={`esquema-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="esquema1">Esquema 1 (a definir)</SelectItem>
                                        <SelectItem value="esquema2">Esquema 2 (a definir)</SelectItem>
                                        <SelectItem value="esquema3">Esquema 3 (a definir)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label htmlFor={`observacoes-${dateStr}`} className="text-xs">
                                      Observações
                                    </Label>
                                    <Textarea
                                      id={`observacoes-${dateStr}`}
                                      placeholder="Observações..."
                                      value={dayData.observacoes}
                                      onChange={(e) => updateDayData(dateStr, "observacoes", e.target.value)}
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Removed Pk inicial, Pk final, and Sentido fields from here */}
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
                  <span className="w-full border-t-2 border-border" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-card px-4 text-foreground font-semibold tracking-wide">Contactos</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Fiscalização */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-foreground">Fiscalização</Label>
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
                  <Label className="text-base font-semibold text-foreground">Entidade Executante</Label>
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
                  <Label className="text-base font-semibold text-foreground">Sinalização</Label>
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

              <div className="flex justify-end gap-2 mt-6">
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
                    // Replace text-gray-500 with text-muted-foreground
                    <p className="text-muted-foreground">Nenhum plano pendente de aprovação.</p>
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
                            <p className="text-sm text-muted-foreground">
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
                                      // Replace bg-red-50 and border-red-200 with destructive tokens
                                      <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
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
                                        <span className="text-foreground">{selectedPlanForDetails.tipo}</span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Sublanço:</Label>
                                        <span className="text-foreground">
                                          {selectedPlanForDetails.numero || "N/A"}
                                        </span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Tipo de Trabalho:</Label>
                                        <span className="text-foreground">
                                          {selectedPlanForDetails.tipoTrabalho || "N/A"}
                                        </span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Atividade:</Label>
                                        <span className="text-foreground">
                                          {selectedPlanForDetails.atividade || "N/A"}
                                        </span>
                                      </div>

                                      {selectedPlanForDetails.kmInicial && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Inicial:</Label>
                                          <span className="text-foreground">{selectedPlanForDetails.kmInicial}</span>
                                        </div>
                                      )}

                                      {selectedPlanForDetails.kmFinal && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Final:</Label>
                                          <span className="text-foreground">{selectedPlanForDetails.kmFinal}</span>
                                        </div>
                                      )}

                                      {(selectedPlanForDetails.trabalhoFixo ||
                                        selectedPlanForDetails.trabalhoMovel) && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Tipo de Trabalhos:</Label>
                                          <span className="text-foreground">
                                            {[
                                              selectedPlanForDetails.trabalhoFixo && "Trabalhos Fixos",
                                              selectedPlanForDetails.trabalhoMovel && "Trabalhos Móveis",
                                            ]
                                              .filter(Boolean)
                                              .join(", ")}
                                          </span>
                                        </div>
                                      )}

                                      {selectedPlanForDetails.perigosTemporarios && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Perigos Temporários:</Label>
                                          <span className="text-foreground">
                                            {selectedPlanForDetails.perigosTemporarios
                                              .toString()
                                              .split("-")
                                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                              .join(" ")}
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
                                              <p className="text-foreground">
                                                {selectedPlanForDetails.fiscalizacaoNome}
                                                {selectedPlanForDetails.fiscalizacaoContato &&
                                                  ` - ${selectedPlanForDetails.fiscalizacaoContato}`}
                                              </p>
                                            </div>
                                          )}
                                          {selectedPlanForDetails.entidadeExecutanteNome && (
                                            <div>
                                              <Label className="font-semibold text-sm">Entidade Executante:</Label>
                                              <p className="text-foreground">
                                                {selectedPlanForDetails.entidadeExecutanteNome}
                                                {selectedPlanForDetails.entidadeExecutanteContato &&
                                                  ` - ${selectedPlanForDetails.entidadeExecutanteContato}`}
                                              </p>
                                            </div>
                                          )}
                                          {selectedPlanForDetails.sinalizacaoNome && (
                                            <div>
                                              <Label className="font-semibold text-sm">Sinalização:</Label>
                                              <p className="text-foreground">
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
                                        // Replace text-gray-500 with text-muted-foreground
                                        <p className="text-muted-foreground">Nenhuma atividade adicionada.</p>
                                      ) : (
                                        <Accordion type="single" collapsible className="w-full">
                                          {selectedPlanForDetails.atividades.map((atividade, index) => (
                                            <AccordionItem key={atividade.id} value={atividade.id}>
                                              <AccordionTrigger>
                                                Atividade {index + 1}: {atividade.descricaoAtividade.substring(0, 50)}
                                                {atividade.descricaoAtividade.length > 50 && "..."}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="p-4 space-y-3 bg-muted rounded-lg">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                      <Label className="font-semibold">Descrição:</Label>
                                                      <p className="text-foreground">{atividade.descricaoAtividade}</p>
                                                    </div>
                                                    <div>
                                                      <Label className="font-semibold">Período:</Label>
                                                      <p className="text-foreground">
                                                        {atividade.periodo.from && atividade.periodo.to
                                                          ? `${format(atividade.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(atividade.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                                          : "N/A"}
                                                      </p>
                                                    </div>
                                                    {atividade.pkInicialKm && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Inicial:</Label>
                                                        <p className="text-foreground">{`${atividade.pkInicialKm}km ${atividade.pkInicialMeters}m`}</p>
                                                      </div>
                                                    )}
                                                    {atividade.pkFinalKm && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Final:</Label>
                                                        <p className="text-foreground">{`${atividade.pkFinalKm}km ${atividade.pkFinalMeters}m`}</p>
                                                      </div>
                                                    )}
                                                    {atividade.sentido && (
                                                      <div>
                                                        <Label className="font-semibold">Sentido:</Label>
                                                        <p className="text-foreground capitalize">
                                                          {atividade.sentido}
                                                        </p>
                                                      </div>
                                                    )}
                                                    {atividade.perfil && (
                                                      <div>
                                                        <Label className="font-semibold">Perfil:</Label>
                                                        <p className="text-foreground">{atividade.perfil}</p>
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
                                    <Button onClick={() => setSelectedPlanForDetails(null)}>Fechar</Button>
                                  </DialogFooter>
                                </DialogContent>
                              )}
                            </Dialog>
                          </div>
                          <div className="flex gap-2 mt-3 sm:mt-0">
                            {/* Keep green colors for action buttons as they are semantic */}
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
                      // Replace text-gray-600 with text-muted-foreground
                      <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
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
                          // Replace bg-white and bg-gray-50 with semantic tokens
                          className={`min-h-[120px] border rounded-lg p-2 ${isCurrentMonth ? "bg-card" : "bg-muted"}`}
                        >
                          <div
                            // Replace text-gray-900 and text-gray-400 with semantic tokens
                            className={`text-sm font-medium mb-2 ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}
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
                                        <span className="text-foreground">{plan.tipo}</span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Sublanço:</Label>
                                        <span className="text-foreground">{plan.numero || "N/A"}</span>
                                      </div>

                                      <div className="flex flex-col space-y-2">
                                        <Label className="font-semibold">Atividade:</Label>
                                        <span className="text-foreground">{plan.atividade || "N/A"}</span>
                                      </div>

                                      {plan.kmInicial && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Inicial:</Label>
                                          <span className="text-foreground">{plan.kmInicial}</span>
                                        </div>
                                      )}

                                      {plan.kmFinal && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Km Final:</Label>
                                          <span className="text-foreground">{plan.kmFinal}</span>
                                        </div>
                                      )}

                                      {(plan.trabalhoFixo || plan.trabalhoMovel) && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Tipo de Trabalhos:</Label>
                                          <span className="text-foreground">
                                            {[
                                              plan.trabalhoFixo && "Trabalhos Fixos",
                                              plan.trabalhoMovel && "Trabalhos Móveis",
                                            ]
                                              .filter(Boolean)
                                              .join(", ")}
                                          </span>
                                        </div>
                                      )}

                                      {plan.perigosTemporarios && (
                                        <div className="flex flex-col space-y-2">
                                          <Label className="font-semibold">Perigos Temporários:</Label>
                                          <span className="text-foreground">
                                            {plan.perigosTemporarios
                                              .toString()
                                              .split("-")
                                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                              .join(" ")}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="border-t pt-4">
                                      <h5 className="text-lg font-semibold mb-4">
                                        Atividades ({plan.atividades.length}):
                                      </h5>
                                      {plan.atividades.length === 0 ? (
                                        // Replace text-gray-500 with text-muted-foreground
                                        <p className="text-muted-foreground">Nenhuma atividade adicionada.</p>
                                      ) : (
                                        <Accordion type="single" collapsible className="w-full">
                                          {plan.atividades.map((atividade, index) => (
                                            <AccordionItem key={atividade.id} value={atividade.id}>
                                              <AccordionTrigger>
                                                Atividade {index + 1}: {atividade.descricaoAtividade.substring(0, 50)}
                                                {atividade.descricaoAtividade.length > 50 && "..."}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="p-4 space-y-3 bg-muted rounded-lg">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                      <Label className="font-semibold">Descrição:</Label>
                                                      <p className="text-foreground">{atividade.descricaoAtividade}</p>
                                                    </div>
                                                    <div>
                                                      <Label className="font-semibold">Período:</Label>
                                                      <p className="text-foreground">
                                                        {atividade.periodo.from && atividade.periodo.to
                                                          ? `${format(atividade.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(atividade.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                                          : "N/A"}
                                                      </p>
                                                    </div>
                                                    {atividade.pkInicialKm && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Inicial:</Label>
                                                        <p className="text-foreground">{`${atividade.pkInicialKm}km ${atividade.pkInicialMeters}m`}</p>
                                                      </div>
                                                    )}
                                                    {atividade.pkFinalKm && (
                                                      <div>
                                                        <Label className="font-semibold">Pk Final:</Label>
                                                        <p className="text-foreground">{`${atividade.pkFinalKm}km ${atividade.pkFinalMeters}m`}</p>
                                                      </div>
                                                    )}
                                                    {atividade.sentido && (
                                                      <div>
                                                        <Label className="font-semibold">Sentido:</Label>
                                                        <p className="text-foreground capitalize">
                                                          {atividade.sentido}
                                                        </p>
                                                      </div>
                                                    )}
                                                    {atividade.perfil && (
                                                      <div>
                                                        <Label className="font-semibold">Perfil:</Label>
                                                        <p className="text-foreground">{atividade.perfil}</p>
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
                              <div className="text-xs text-muted-foreground text-center py-1">
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
                      <span className="text-sm text-muted-foreground">Confirmado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                      <span className="text-sm text-muted-foreground">Pendente Confirmação</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                      <span className="text-sm text-muted-foreground">Rejeitado</span>
                    </div>
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
                  // Replace text-gray-500 with text-muted-foreground
                  <p className="text-muted-foreground">Nenhum agendamento submetido ainda.</p>
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
                          <p className="text-sm text-muted-foreground">
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
              // Replace text-gray-500 with text-muted-foreground
              <p className="text-muted-foreground">Nenhum plano aprovado para esta semana.</p>
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
                      <p className="text-sm text-muted-foreground">
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
