"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
  ChevronDown,
  CheckCircle2,
  Copy,
  AlertCircle,
  Eye,
  X,
  FileText,
  Info,
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
  parseISO,
  addDays,
  endOfWeek, // Added import
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import AdminDashboard from "@/components/admin-dashboard"
import { AutoEstradasSelect } from "@/components/auto-estradas-select"
import type { DateRange as DayPickerDateRange } from "react-day-picker" // Renamed import to avoid conflict
import { useToast } from "@/components/ui/use-toast" // Import toast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert" // Import Alert component

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
  restricoes: string[] // Changed from string to string[] for multiple selections
  esquema: string
  observacoes: string
  sublanco: string // Calculated sublanco result
  autoEstrada?: string // Added for CCO view
}

// Tipagem para uma atividade
interface Atividade {
  id: string
  descricao: string // Changed from descricaoAtividade to descricao
  tipoTrabalho: string
  atividade: string
  periodo: DateRange
  pkInicialKm: string
  pkInicialMeters: string
  pkFinalKm: string
  pkFinalMeters: string
  sentido: string
  perfil: string
  localIntervencao: string
  restricoes: string[] // Keep as string for the Atividade interface
  esquema: string
  observacoes: string
  detalhesDiarios: { [dateString: string]: DailyDetail }
  dayDataMap?: { [dateString: string]: DayData } // Added to store day data when activity is created/edited
  sublanco?: string // Added sublanco to Atividade
  // New fields for work characteristics
  trabalhoFixo?: boolean
  trabalhoMovel?: boolean
  perigosTemporarios?: boolean
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
  observacoes: string
  autoEstrada?: string // Added for CCO view
  sublanco?: string // Added for CCO view
}

interface SubmittedPlan {
  id: string
  numero: string
  tipoTrabalho?: string
  atividade?: string
  autoEstrada?: string // Added autoEstrada to SubmittedPlan interface
  concessao?: string // Added concessao field
  atividades: Atividade[]
  status:
    | "Pendente Aprovação"
    | "Confirmado"
    | "Rejeitado"
    | "Editado - Pendente Aprovação"
    | "Aprovado"
    | "Pendente Aprovação GDC"
    | "Editado - Pendente Aprovação GDC"
  tipo: "Manutenção Vegetal" | "Beneficiação de Pavimento" | "Manutenção Geral"
  isInISistema: boolean
  isUrgente?: boolean
  comentarioGO?: string
  comentarioGDC?: string
  kmInicial?: string
  kmFinal?: string
  trabalhoFixo: boolean // Added to SubmittedPlan
  trabalhoMovel: boolean // Added to SubmittedPlan
  perigosTemporarios: boolean // Added to SubmittedPlan
  fiscalizacaoNome?: string
  fiscalizacaoContato?: string
  entidadeExecutanteNome?: string
  entidadeExecutanteContato?: string
  sinalizacaoNome?: string
  sinalizacaoContato?: string
  originalValues?: Partial<SubmittedPlan> // Store original values before editing
  // Added for CCO view
  prestador?: string
  submittedAt?: string
  // Fields for CCO weekly dialog
  week?: string
  startDate?: string
  endDate?: string
  nomeEmpresa?: string
  dataCriacao?: string
  editedBy?: string // Track who edited the plan (GDC or GO email)
  editedAt?: string // Track when it was edited
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

const calculateSublanco = async (
  concessao: string,
  autoEstrada: string,
  kmInicial: number,
  kmFinal: number,
): Promise<string> => {
  try {
    console.log("[v0] calculateSublanco called with:", { concessao, autoEstrada, kmInicial, kmFinal })

    const csvUrl =
      "https://docs.google.com/spreadsheets/d/1ATKqWm_bTtN398nbfpR0gtHbqYLAc3R5fhOSPqZmNkA/export?format=csv"
    const response = await fetch(csvUrl)

    if (!response.ok) {
      console.log("[v0] CSV fetch failed:", response.status)
      return ""
    }

    const csvText = await response.text()
    const lines = csvText.split("\n").filter((line) => line.trim())

    if (lines.length === 0) {
      console.log("[v0] CSV is empty")
      return ""
    }

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
    console.log("[v0] CSV headers:", headers)

    // Find column indices (case-insensitive with accent normalization)
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

    const concessaoIdx = headers.findIndex((h) => normalize(h) === normalize("concessao"))
    const autoestradaIdx = headers.findIndex((h) => normalize(h) === normalize("autoestrada"))
    const sublancoInicioIdx = headers.findIndex((h) => normalize(h) === normalize("sublanco inicio"))
    const sublancoFimIdx = headers.findIndex((h) => normalize(h) === normalize("sublanco fim"))
    const pkInicioKmIdx = headers.findIndex((h) => normalize(h) === normalize("pk inicio km"))
    const pkFimKmIdx = headers.findIndex((h) => normalize(h) === normalize("pk fim km"))

    console.log("[v0] Column indices:", {
      concessaoIdx,
      autoestradaIdx,
      sublancoInicioIdx,
      sublancoFimIdx,
      pkInicioKmIdx,
      pkFimKmIdx,
    })

    if (
      concessaoIdx === -1 ||
      autoestradaIdx === -1 ||
      sublancoInicioIdx === -1 ||
      sublancoFimIdx === -1 ||
      pkInicioKmIdx === -1 ||
      pkFimKmIdx === -1
    ) {
      console.error("[v0] Required columns not found in CSV")
      return ""
    }

    // Filter and collect intersecting rows
    const intersectingRows: Array<{ sublancoInicio: string; sublancoFim: string; pkInicioKm: number }> = []

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))

      const rowConcessao = cells[concessaoIdx] || ""
      const rowAutoestrada = cells[autoestradaIdx] || ""
      const rowPkInicioKm = Number.parseInt(cells[pkInicioKmIdx] || "0")
      const rowPkFimKm = Number.parseInt(cells[pkFimKmIdx] || "0")
      const rowSublancoInicio = cells[sublancoInicioIdx] || ""
      const rowSublancoFim = cells[sublancoFimIdx] || ""

      // Check if row matches filters and intervals intersect
      if (
        normalize(rowConcessao) === normalize(concessao) &&
        normalize(rowAutoestrada) === normalize(autoEstrada) &&
        rowPkInicioKm <= kmFinal &&
        rowPkFimKm >= kmInicial
      ) {
        intersectingRows.push({
          sublancoInicio: rowSublancoInicio,
          sublancoFim: rowSublancoFim,
          pkInicioKm: rowPkInicioKm,
        })
      }
    }

    console.log("[v0] Intersecting rows found:", intersectingRows.length)

    if (intersectingRows.length === 0) {
      console.log("[v0] No matching rows found")
      return ""
    }

    // Sort by pk inicio km to get first and last
    intersectingRows.sort((a, b) => a.pkInicioKm - b.pkInicioKm)

    const firstRow = intersectingRows[0]
    const lastRow = intersectingRows[intersectingRows.length - 1]

    const result = `${firstRow.sublancoInicio} - ${lastRow.sublancoFim}`
    console.log("[v0] Calculated sublanco:", result)

    return result
  } catch (error) {
    console.error("[v0] Error calculating sublanco:", error)
    return ""
  }
}

const TIPO_TRABALHO_TO_ATIVIDADES: Record<string, string[]> = {
  "Edificios e Portagens": ["Trabalhos em Edifícios e Portagens", "Trabalhos nas Vias de Portagem"],
  Pavimentos: [
    "Beneficiação de Pavimento",
    "Ranhuragens",
    "Selagem de Fissuras",
    "Espalhamento de Sal e Fundentes",
    "Inspecção ao Pavimento",
    "Rejuvenescimento",
    "Waterblasting",
    "Trabalhos em Pavimento",
  ],
  Taludes: ["Trabalhos em Talude", "Inspeção de Talude"],
  Drenagem: [
    "Limpeza de Orgãos de Drenagem",
    "Inspeção de Drenagem",
    "Limpeza de caleiras em ómega",
    "Trabalhos em Drenagem",
  ],
  "Obras Arte": [
    "Inspeção de Obras de Arte (Viadutos, Túneis, PS, PI e PH)",
    "Trabalhos em Obras de Arte (Viadutos, Túneis, PS, PI e PH)",
    "Junta de Dilatação",
  ],
  "Vedações e Património": ["Trabalhos em Vedação", "Inspeção de Vedação", "Levantamento Cadastral"],
  "Sinalização Horizontal": ["Repintura de Sinalização Horizontal", "Inspecção da Sinalização Horizontal"],
  "Sinalização Vertical": ["Substituição de Sinalização Vertical", "Inspecção da Sinalização Vertical"],
  Acidente: ["Reparação de Acidente"],
  Equipamentos: [
    "Guardas de Segurança",
    "Atenuadores de Impacto",
    "New Jerseys",
    "Pórticos/Semi-Pórticos",
    "Equipamentos de Telemática",
    "ETAR / ETAEP",
    "Túneis rodoviários",
    "Iluminação",
    "Telecomunicações",
    "Barreiras Acústicas",
    "Condutas",
    "Linhas de Energia",
    "Carregadores Elétricos",
  ],
  "Revestimento Vegetal": ["Manutenção de Vegetação e Remoção de Resíduos"],
  Outros: ["Outros Trabalhos"],
}

function ServiceSchedulerApp() {
  const { toast } = useToast() // Initialize toast hook
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [user, setUser] = useState({ name: "", email: "" })
  const [userRole, setUserRole] = useState<"prestador" | "go" | "cco" | "admin" | "gestordecontrato" | null>(null)
  const [dateRange, setDateRange] = useState<DayPickerDateRange | undefined>(undefined) // Used DayPickerDateRange here
  const [dailyDetails, setDailyDetails] = useState<{ [dateString: string]: DailyDetail }>({})
  const [isUrgente, setIsUrgente] = useState(false) // Changed from isUrgente to setIsUrgente for consistency with other setters

  const [dayDataMap, setDayDataMap] = useState<{ [dateString: string]: DayData }>({})

  const [vegetalNumero, setVegetalNumero] = useState("")
  const [tipoTrabalho, setTipoTrabalho] = useState("")
  const [atividade, setAtividade] = useState("")
  const [descricaoAtividade, setDescricaoAtividade] = useState("") // Renamed from descricaoAtividade to match the interface

  const [tipoTrabalhoOptions, setTipoTrabalhoOptions] = useState<string[]>([])
  const [atividadeOptions, setAtividadeOptions] = useState<string[]>([])
  const [tipoAtividadeCSVData, setTipoAtividadeCSVData] = useState<Array<{ tipoTrabalho: string; atividade: string }>>(
    [],
  )
  const [tipoEsquemaCSVData, setTipoEsquemaCSVData] = useState<Array<{ tipoTrabalho: string; esquema: string }>>([])
  const [tipoTrabalhoPerDayOptions, setTipoTrabalhoPerDayOptions] = useState<string[]>([])
  const [esquemaOptionsByDay, setEsquemaOptionsByDay] = useState<Record<string, string[]>>({})

  const [perfilRestricoesCsvData, setPerfilRestricoesCsvData] = useState<Array<{ perfil: string; restricoes: string }>>(
    [],
  )
  const [perfilOptions, setPerfilOptions] = useState<string[]>([])
  const [restricoesOptionsByDay, setRestricoesOptionsByDay] = useState<Record<string, string[]>>({})

  const [submittedPlans, setSubmittedPlans] = useState<SubmittedPlan[]>([])
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<SubmittedPlan | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [isEditingApprovedPlan, setIsEditingApprovedPlan] = useState(false) // This state is now controlled by handleEditPlan
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
  const [restricoes, setRestricoes] = useState<string[]>([]) // Changed to string[]
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

  const [rejectionDialog, setRejectionDialog] = useState<{
    open: boolean
    planId: string
    comment: string
  }>({
    open: false,
    planId: "",
    comment: "",
  })

  const [rejectionComment, setRejectionComment] = useState("")
  const [weeklyPlanCounts, setWeeklyPlanCounts] = useState<{ [weekId: string]: number }>({})
  const [isWeeklyPlansDialogOpen, setIsWeeklyPlansDialogOpen] = useState(false)
  const [currentWeekPlans, setCurrentWeekPlans] = useState<{
    plans: SubmittedPlan[]
    week: string
    startDate: string
    endDate: string
  }>({
    plans: [],
    week: "",
    startDate: "",
    endDate: "",
  })
  const [currentWeekTitle, setCurrentWeekTitle] = useState("")

  // New calendar view states
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date())
  const [calendarFilterPeriod, setCalendarFilterPeriod] = useState<string>("all")
  const [calendarFilterTipoTrabalho, setCalendarFilterTipoTrabalho] = useState<string>("all")

  const [concessoes, setConcessoes] = useState<Array<{ value: string; label: string }>>([])

  // State for rejection dialog when viewing plan details
  const [removalDialog, setRemovalDialog] = useState<{
    open: boolean
    planId: string
    planTitle: string
  }>({
    open: false,
    planId: "",
    planTitle: "",
  })

  const [removalReason, setRemovalReason] = useState("")

  // Add state to track PK validation error and disabled options
  const [pkValidationError, setPkValidationError] = useState<{
    show: boolean
    dateStr: string
    distance: number
  }>({ show: false, dateStr: "", distance: 0 })
  const [disabledTipoTrabalhoByDay, setDisabledTipoTrabalhoByDay] = useState<Record<string, string[]>>({})

  const [pkConflictDialog, setPkConflictDialog] = useState<{
    open: boolean
    conflictDetails: string
  }>({
    open: false,
    conflictDetails: "",
  })

  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Adding notification state for edited plans
  const [editNotifications, setEditNotifications] = useState<
    {
      planId: string
      planTitle: string
      editedBy: string
    }[]
  >([])

  const groupConsecutiveActivities = (activities: Atividade[]) => {
    if (activities.length === 0) return []

    // Sort activities by start date
    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = a.periodo?.from?.getTime() || 0
      const dateB = b.periodo?.from?.getTime() || 0
      return dateA - dateB
    })

    const groups: Array<{ activities: Atividade[]; isGrouped: boolean }> = []
    let currentGroup: Atividade[] = [sortedActivities[0]]

    const areFieldsIdentical = (act1: Atividade, act2: Atividade) => {
      const result =
        act1.pkInicialKm === act2.pkInicialKm &&
        act1.pkInicialMeters === act2.pkInicialMeters &&
        act1.pkFinalKm === act2.pkFinalKm &&
        act1.pkFinalMeters === act2.pkFinalMeters &&
        act1.perfil === act2.perfil &&
        act1.restricoes.join(",") === act2.restricoes.join(",") &&
        act1.sentido === act2.sentido &&
        act1.tipoTrabalho === act2.tipoTrabalho &&
        act1.localIntervencao === act2.localIntervencao &&
        act1.esquema === act2.esquema &&
        act1.trabalhoFixo === act2.trabalhoFixo && // Check work characteristics
        act1.trabalhoMovel === act2.trabalhoMovel &&
        act1.perigosTemporarios === act2.perigosTemporarios

      return result
    }

    const areConsecutiveDays = (date1: Date, date2: Date) => {
      const diffTime = Math.abs(date2.getTime() - date1.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const result = diffDays === 1

      return result
    }

    for (let i = 1; i < sortedActivities.length; i++) {
      const prevActivity = sortedActivities[i - 1]
      const currentActivity = sortedActivities[i]

      const prevDate = prevActivity.periodo?.from
      const currentDate = currentActivity.periodo?.from

      if (
        prevDate &&
        currentDate &&
        areConsecutiveDays(prevDate, currentDate) &&
        areFieldsIdentical(prevActivity, currentActivity)
      ) {
        currentGroup.push(currentActivity)
      } else {
        // Push current group
        groups.push({
          activities: currentGroup,
          isGrouped: currentGroup.length > 1,
        })
        // Start new group
        currentGroup = [currentActivity]
      }
    }

    // Push the last group
    groups.push({
      activities: currentGroup,
      isGrouped: currentGroup.length > 1,
    })

    return groups
  }

  const ChangedValue = ({
    newValue,
    oldValue,
    hasOriginalValues = true,
  }: {
    newValue: string | number | undefined | string[]
    oldValue: string | number | undefined | string[]
    hasOriginalValues?: boolean
  }) => {
    console.log("[v0] ChangedValue:", { newValue, oldValue, hasOriginalValues })

    // Convert string arrays to comma-separated strings for comparison
    const stringifyArray = (value: any): string => {
      if (Array.isArray(value)) {
        return value.join(", ") || "N/A"
      }
      return value || "N/A"
    }

    const formattedNewValue = stringifyArray(newValue)
    const formattedOldValue = stringifyArray(oldValue)

    // If there are no original values at all, just show the current value
    if (!hasOriginalValues || oldValue === undefined || oldValue === null || formattedOldValue === "N/A") {
      return <span>{formattedNewValue}</span>
    }

    // Check if value actually changed
    const hasChanged = formattedOldValue !== formattedNewValue

    if (hasChanged) {
      return (
        <span>
          <span className="text-red-600 font-medium">{formattedOldValue}</span>
          <span className="mx-2">→</span>
          <span className="text-green-600 font-medium">{formattedNewValue}</span>
        </span>
      )
    }

    // No change, just show the value
    return <span>{formattedNewValue}</span>
  }

  const ActivityWithChanges = ({
    activity,
    originalActivity,
    index,
  }: {
    activity: Atividade
    originalActivity?: Atividade
    index: number
  }) => {
    const hasChanges = !!originalActivity

    const getTimeDisplay = (): {
      isContinuous: boolean
      display?: string
      dayDetails?: Array<{
        date: string
        timeSlot: string
        data: {
          pkInicial: string
          pkFinal: string
          perfil: string
          restricoes: string
          sentido: string
          tipoTrabalho: string
          localIntervencao: string
          esquema: string
        }
      }>
    } => {
      const detalhesDiarios = activity.detalhesDiarios
      if (!detalhesDiarios || Object.keys(detalhesDiarios).length === 0) {
        return { isContinuous: true, display: "N/A" }
      }

      const sortedDates = Object.keys(detalhesDiarios).sort()
      const dayDetails: Array<{
        date: string
        timeSlot: string
        data: any
      }> = []

      let isContinuous = true
      let allFieldsIdentical = true
      let firstDayData: any = null

      for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i]
        const dayData = detalhesDiarios[date]
        if (!dayData) continue

        const timeSlot = dayData.timeSlot === "Todo o dia" ? "00:00 - 23:59" : dayData.timeSlot || ""

        // Store day details with full data
        dayDetails.push({
          date,
          timeSlot,
          data: dayData,
        })

        if (i === 0) {
          firstDayData = dayData
        }

        // Check if all fields are identical to the first day
        if (firstDayData && i > 0) {
          if (
            dayData.kmsInicio !== firstDayData.kmsInicio ||
            dayData.kmsFim !== firstDayData.kmsFim ||
            dayData.perfilTipo !== firstDayData.perfilTipo ||
            dayData.vias.join(",") !== firstDayData.vias.join(",") ||
            dayData.sentido.join(",") !== firstDayData.sentido.join(",") ||
            dayData.tipoTrabalho.join(",") !== firstDayData.tipoTrabalho.join(",") ||
            dayData.outrosLocais.join(",") !== firstDayData.outrosLocais.join(",") ||
            dayData.esqRef !== firstDayData.esqRef
          ) {
            allFieldsIdentical = false
          }
        }

        // Check time continuity with next day
        if (i < sortedDates.length - 1) {
          const nextDate = sortedDates[i + 1]
          const nextDayData = detalhesDiarios[nextDate]
          if (!nextDayData) {
            isContinuous = false
            continue
          }

          const nextTimeSlot = nextDayData.timeSlot === "Todo o dia" ? "00:00 - 23:59" : nextDayData.timeSlot || ""
          const currentEndTime = timeSlot.split(" - ")[1] || ""
          const nextStartTime = nextTimeSlot.split(" - ")[0] || ""

          if (currentEndTime !== "23:59" || nextStartTime !== "00:00") {
            isContinuous = false
          }
        }
      }

      // Only show unified if BOTH continuous AND all fields identical
      if (isContinuous && allFieldsIdentical) {
        const firstTimeSlot = dayDetails[0].timeSlot
        const lastTimeSlot = dayDetails[dayDetails.length - 1].timeSlot
        const startTime = firstTimeSlot.split(" - ")[0] || "00:00"
        const endTime = lastTimeSlot.split(" - ")[1] || "23:59"

        return {
          isContinuous: true,
          display: `${startTime} - ${endTime}`,
        }
      } else {
        // Return full day details with data
        return {
          isContinuous: false,
          dayDetails: dayDetails.map((d) => ({
            date: new Date(d.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }),
            timeSlot: d.timeSlot,
            data: {
              pkInicial: d.data.kmsInicio || "N/A",
              pkFinal: d.data.kmsFim || "N/A",
              perfil: d.data.perfilTipo || "",
              restricoes: d.data.vias?.join(", ") || "",
              sentido: d.data.sentido?.join(", ") || "",
              tipoTrabalho: d.data.tipoTrabalho?.join(", ") || "",
              localIntervencao: d.data.outrosLocais?.join(", ") || "",
              esquema: d.data.esqRef || "",
            },
          })),
        }
      }
    }

    const timeDisplay = getTimeDisplay()

    return (
      <Collapsible key={activity.id} defaultOpen={index === 0}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">
                Atividade {index + 1}: {activity.descricao}
              </div>
              <div className="text-sm text-muted-foreground">
                {activity.periodo.from ? format(activity.periodo.from, "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                {activity.periodo.to &&
                  activity.periodo.to.getTime() !== activity.periodo.from?.getTime() &&
                  ` - ${format(activity.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`}
              </div>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 pt-2">
          {timeDisplay.isContinuous ? (
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div className="col-span-2">
                <span className="font-medium">Data:</span>{" "}
                <ChangedValue
                  oldValue={
                    originalActivity?.periodo?.from
                      ? format(originalActivity.periodo.from, "dd/MM/yyyy", { locale: ptBR })
                      : ""
                  }
                  newValue={
                    activity.periodo.from ? format(activity.periodo.from, "dd/MM/yyyy", { locale: ptBR }) : "N/A"
                  }
                  label="Data"
                  hasOriginalValues={!!originalActivity}
                />
                {activity.periodo.to && activity.periodo.to.getTime() !== activity.periodo.from?.getTime() && (
                  <>
                    {" - "}
                    <ChangedValue
                      oldValue={
                        originalActivity?.periodo?.to
                          ? format(originalActivity.periodo.to, "dd/MM/yyyy", { locale: ptBR })
                          : ""
                      }
                      newValue={
                        activity.periodo.to ? format(activity.periodo.to, "dd/MM/yyyy", { locale: ptBR }) : "N/A"
                      }
                      label="Data Final"
                      hasOriginalValues={!!originalActivity}
                    />
                  </>
                )}
              </div>

              <div className="col-span-2">
                <span className="font-medium">Horário:</span> {timeDisplay.display}
              </div>

              <div>
                <span className="font-medium">Pk Inicial:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={`${originalActivity.pkInicialKm || 0} Km + ${originalActivity.pkInicialMeters || 0} m`}
                    newValue={`${activity.pkInicialKm || 0} Km + ${activity.pkInicialMeters || 0} m`}
                    label="Pk Inicial"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  `${activity.pkInicialKm || 0} Km + ${activity.pkInicialMeters || 0} m`
                )}
              </div>

              <div>
                <span className="font-medium">Pk Final:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={`${originalActivity.pkFinalKm || 0} Km + ${originalActivity.pkFinalMeters || 0} m`}
                    newValue={`${activity.pkFinalKm || 0} Km + ${activity.pkFinalMeters || 0} m`}
                    label="Pk Final"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  `${activity.pkFinalKm || 0} Km + ${activity.pkFinalMeters || 0} m`
                )}
              </div>

              <div>
                <span className="font-medium">Perfil:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={originalActivity.perfil || "N/A"}
                    newValue={activity.perfil || "N/A"}
                    label="Perfil"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  activity.perfil || "N/A"
                )}
              </div>

              <div>
                <span className="font-medium">Restrições:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={originalActivity.restricoes || "N/A"}
                    newValue={activity.restricoes || "N/A"}
                    label="Restrições"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  activity.restricoes || "N/A"
                )}
              </div>

              <div>
                <span className="font-medium">Sentido:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={originalActivity.sentido || "N/A"}
                    newValue={activity.sentido || "N/A"}
                    label="Sentido"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  activity.sentido || "N/A"
                )}
              </div>

              <div>
                <span className="font-medium">Local da intervenção:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={originalActivity.localIntervencao || "N/A"}
                    newValue={activity.localIntervencao || "N/A"}
                    label="Local da intervenção"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  activity.localIntervencao || "N/A"
                )}
              </div>
              <div>
                <span className="font-medium">Esquema:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={originalActivity.esquema || "N/A"}
                    newValue={activity.esquema || "N/A"}
                    label="Esquema"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  activity.esquema || "N/A"
                )}
              </div>

              <div className="col-span-2">
                <span className="font-medium">Observações:</span>{" "}
                {originalActivity ? (
                  <ChangedValue
                    oldValue={originalActivity.observacoes || ""}
                    newValue={activity.observacoes || ""}
                    label="Observações"
                    hasOriginalValues={!!originalActivity}
                  />
                ) : (
                  activity.observacoes || "N/A"
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {timeDisplay.dayDetails?.map((day, idx) => (
                <div key={idx} className="rounded-lg border p-4">
                  <div className="mb-3 font-medium text-primary">
                    Dia {day.date}: {day.timeSlot}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Pk Inicial:</span> {day.data.pkInicial}
                    </div>
                    <div>
                      <span className="font-medium">Pk Final:</span> {day.data.pkFinal}
                    </div>
                    <div>
                      <span className="font-medium">Perfil:</span> {day.data.perfil || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Restrições:</span> {day.data.restricoes || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Sentido:</span> {day.data.sentido || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Tipo de trabalho:</span> {day.data.tipoTrabalho || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Local da intervenção:</span> {day.data.localIntervencao || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Esquema:</span> {day.data.esquema || "N/A"}
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border p-4">
                <div className="font-medium mb-2">Observações gerais:</div>
                <div>{activity.observacoes || "N/A"}</div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const GroupedActivityWithChanges = ({
    group,
    originalActivities,
    startIndex,
  }: {
    group: { activities: Atividade[]; isGrouped: boolean }
    originalActivities?: Atividade[]
    startIndex: number
  }) => {
    const formatPK = (km: string, meters: string) => {
      return `${km} Km + ${meters} m`
    }

    if (!group.isGrouped) {
      // Single activity, use the original component
      const activity = group.activities[0]
      const originalActivity = originalActivities?.[startIndex]
      return <ActivityWithChanges activity={activity} originalActivity={originalActivity} index={startIndex} />
    }

    // Grouped activities
    const firstActivity = group.activities[0]
    const lastActivity = group.activities[group.activities.length - 1]
    const originalActivity = originalActivities?.[startIndex]

    // Get time range from detalhesDiarios
    const getTimeRange = () => {
      // Get the date keys for first and last activities
      const firstDateKey = firstActivity.periodo?.from ? format(firstActivity.periodo.from, "yyyy-MM-dd") : null
      const lastDateKey = lastActivity.periodo?.from ? format(lastActivity.periodo.from, "yyyy-MM-dd") : null

      if (!firstDateKey || !lastDateKey) {
        return "N/A"
      }

      const firstDayDetails = firstActivity.detalhesDiarios?.[firstDateKey]
      const lastDayDetails = lastActivity.detalhesDiarios?.[lastDateKey]

      if (!firstDayDetails || !lastDayDetails) {
        return "N/A"
      }

      // Extract start time from first day and end time from last day
      const extractStartTime = (timeSlot: string) => {
        if (timeSlot === "Todo o dia") return "00:00"
        const parts = timeSlot.split(" - ")
        return parts[0] || "00:00"
      }

      const extractEndTime = (timeSlot: string) => {
        if (timeSlot === "Todo o dia") return "23:59"
        const parts = timeSlot.split(" - ")
        return parts[1] || "23:59"
      }

      const startTime = extractStartTime(firstDayDetails.timeSlot)
      const endTime = extractEndTime(lastDayDetails.timeSlot)

      const result = `${startTime} - ${endTime}`
      return result
    }

    const timeRange = getTimeRange()

    return (
      <Collapsible key={firstActivity.id} className="border rounded-lg p-4 bg-blue-50/50">
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <h4 className="font-semibold">
            Atividade {startIndex + 1}: {firstActivity.descricao}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (Agrupada - {group.activities.length} dias)
            </span>
          </h4>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Data:</span>{" "}
              {firstActivity.periodo?.from && lastActivity.periodo?.from
                ? `${format(firstActivity.periodo.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(
                    lastActivity.periodo.from,
                    "dd/MM/yyyy",
                    { locale: ptBR },
                  )}`
                : "N/A"}
            </div>
            <div>
              <span className="font-medium">Horário:</span> {timeRange}
            </div>

            <div>
              <span className="font-medium">Pk Inicial:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={formatPK(originalActivity.pkInicialKm, originalActivity.pkInicialMeters)}
                  newValue={formatPK(firstActivity.pkInicialKm, firstActivity.pkInicialMeters)}
                  label="Pk Inicial"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                formatPK(firstActivity.pkInicialKm, firstActivity.pkInicialMeters)
              )}
            </div>

            <div>
              <span className="font-medium">Pk Final:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={formatPK(originalActivity.pkFinalKm, originalActivity.pkFinalMeters)}
                  newValue={formatPK(firstActivity.pkFinalKm, firstActivity.pkFinalMeters)}
                  label="Pk Final"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                formatPK(firstActivity.pkFinalKm, firstActivity.pkFinalMeters)
              )}
            </div>

            <div>
              <span className="font-medium">Perfil:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={originalActivity.perfil || "N/A"}
                  newValue={firstActivity.perfil || "N/A"}
                  label="Perfil"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                firstActivity.perfil || "N/A"
              )}
            </div>

            <div>
              <span className="font-medium">Restrições:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={originalActivity.restricoes?.join(", ") || "N/A"}
                  newValue={firstActivity.restricoes?.join(", ") || "N/A"}
                  label="Restrições"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                firstActivity.restricoes?.join(", ") || "N/A"
              )}
            </div>

            <div>
              <span className="font-medium">Sentido:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={originalActivity.sentido || "N/A"}
                  newValue={firstActivity.sentido || "N/A"}
                  label="Sentido"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                firstActivity.sentido || "N/A"
              )}
            </div>

            <div>
              <span className="font-medium">Tipo de trabalho:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={originalActivity.tipoTrabalho || "N/A"}
                  newValue={firstActivity.tipoTrabalho || "N/A"}
                  label="Tipo de Trabalho"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                firstActivity.tipoTrabalho || "N/A"
              )}
            </div>

            <div>
              <span className="font-medium">Local da intervenção:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={originalActivity.localIntervencao || "N/A"}
                  newValue={firstActivity.localIntervencao || "N/A"}
                  label="Local da Intervenção"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                firstActivity.localIntervencao || "N/A"
              )}
            </div>

            <div>
              <span className="font-medium">Esquema:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={originalActivity.esquema || "N/A"}
                  newValue={firstActivity.esquema || "N/A"}
                  label="Esquema"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                firstActivity.esquema || "N/A"
              )}
            </div>

            <div className="col-span-2">
              <span className="font-medium">Observações:</span>{" "}
              {originalActivity ? (
                <ChangedValue
                  oldValue={originalActivity.observacoes || ""}
                  newValue={firstActivity.observacoes || ""}
                  label="Observações"
                  hasOriginalValues={!!originalActivity}
                />
              ) : (
                firstActivity.observacoes || "N/A"
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const DialogContentWithChangedValues = ({ plan }: { plan: SubmittedPlan }) => {
    const originalValues = plan.originalValues

    const activityGroups = groupConsecutiveActivities(plan.atividades)

    return (
      <>
        <DialogHeader>
          <DialogTitle>Detalhes do Plano: {plan.numero}</DialogTitle>
          <DialogDescription>
            Resumo completo do plano de trabalho submetido.
            {plan.status === "Editado - Pendente Aprovação" && (
              <span className="block mt-2 text-orange-600 font-semibold">
                Este plano foi editado. Os valores alterados estão destacados.
              </span>
            )}
            {plan.status === "Editado - Pendente Aprovação GDC" && (
              <span className="block mt-2 text-orange-600 font-semibold">
                Este plano foi editado e aguarda aprovação do GDC. Os valores alterados estão destacados.
              </span>
            )}
          </DialogDescription>
          {plan.comentarioGO && (
            <div className="mt-4 p-4 rounded-lg border-2 bg-destructive/10 border-destructive/20">
              <p className="text-sm font-semibold text-destructive mb-1">Motivo da Rejeição (GO):</p>
              <p className="text-sm text-destructive/90">{plan.comentarioGO}</p>
            </div>
          )}
          {plan.comentarioGDC && (
            <div className="mt-4 p-4 rounded-lg border-2 bg-orange-100 border-orange-300">
              <p className="text-sm font-semibold text-orange-800 mb-1">Motivo da Rejeição (GDC):</p>
              <p className="text-sm text-orange-700">{plan.comentarioGDC}</p>
            </div>
          )}
          {/* CHANGE: Display edit information */}
          {plan.editedBy && plan.editedAt && (
            <div className="mt-4 p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
              <p className="text-sm font-semibold text-blue-800 mb-1">
                Editado por:{" "}
                {plan.editedBy === "gestordecontrato@teste.pt" ? "Gestor de Contrato" : "Gestor de Operações"}
              </p>
              <p className="text-sm text-blue-700">
                Data da edição: {format(parseISO(plan.editedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cabeçalho</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Concessão:</p>
                <p>
                  <ChangedValue
                    newValue={plan.concessao}
                    oldValue={originalValues?.concessao}
                    hasOriginalValues={!!originalValues}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Autoestrada:</p>
                <p>
                  <ChangedValue
                    newValue={plan.autoEstrada}
                    oldValue={originalValues?.autoEstrada}
                    hasOriginalValues={!!originalValues}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Km Inicial:</p>
                <p>
                  <ChangedValue
                    newValue={plan.kmInicial}
                    oldValue={originalValues?.kmInicial}
                    hasOriginalValues={!!originalValues}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Km Final:</p>
                <p>
                  <ChangedValue
                    newValue={plan.kmFinal}
                    oldValue={originalValues?.kmFinal}
                    hasOriginalValues={!!originalValues}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sublanço:</p>
                <p>
                  <ChangedValue
                    newValue={plan.numero || "N/A"}
                    oldValue={originalValues?.numero}
                    hasOriginalValues={!!originalValues}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo de Trabalho:</p>
                <p>
                  <ChangedValue
                    newValue={plan.tipoTrabalho}
                    oldValue={originalValues?.tipoTrabalho}
                    hasOriginalValues={!!originalValues}
                  />
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Atividade:</p>
                <p>
                  <ChangedValue
                    newValue={plan.atividade}
                    oldValue={originalValues?.atividade}
                    hasOriginalValues={!!originalValues}
                  />
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contactos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-1">Fiscalização:</p>
                <div className="space-y-2">
                  <p className="font-medium">Nome:</p>
                  <p>
                    <ChangedValue
                      newValue={plan.fiscalizacaoNome || "N/A"}
                      oldValue={originalValues?.fiscalizacaoNome}
                      hasOriginalValues={!!originalValues}
                    />
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <p className="font-medium">Contacto:</p>
                  <p>
                    <ChangedValue
                      newValue={plan.fiscalizacaoContato || "N/A"}
                      oldValue={originalValues?.fiscalizacaoContato}
                      hasOriginalValues={!!originalValues}
                    />
                  </p>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Entidade Executante:</p>
                <div className="space-y-2">
                  <p className="font-medium">Nome:</p>
                  <p>
                    <ChangedValue
                      newValue={plan.entidadeExecutanteNome || "N/A"}
                      oldValue={originalValues?.entidadeExecutanteNome}
                      hasOriginalValues={!!originalValues}
                    />
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <p className="font-medium">Contacto:</p>
                  <p>
                    <ChangedValue
                      newValue={plan.entidadeExecutanteContato || "N/A"}
                      oldValue={originalValues?.entidadeExecutanteContato}
                      hasOriginalValues={!!originalValues}
                    />
                  </p>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Sinalização:</p>
                <div className="space-y-2">
                  <p className="font-medium">Nome:</p>
                  <p>
                    <ChangedValue
                      newValue={plan.sinalizacaoNome || "N/A"}
                      oldValue={originalValues?.sinalizacaoNome}
                      hasOriginalValues={!!originalValues}
                    />
                  </p>
                </div>
                <div className="space-y-2 mt-4">
                  <p className="font-medium">Contacto:</p>
                  <p>
                    <ChangedValue
                      newValue={plan.sinalizacaoContato || "N/A"}
                      oldValue={originalValues?.sinalizacaoContato}
                      hasOriginalValues={!!originalValues}
                    />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activities Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividades ({plan.atividades.length}):</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityGroups.map((group, groupIndex) => {
                let startIndex = 0
                for (let i = 0; i < groupIndex; i++) {
                  startIndex += activityGroups[i].activities.length
                }

                return (
                  <GroupedActivityWithChanges
                    key={group.activities[0].id}
                    group={group}
                    originalActivities={originalValues?.atividades}
                    startIndex={startIndex}
                  />
                )
              })}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-6 gap-2">
          {/* CHANGE: Add edit button for GO and GDC roles */}
          {(userRole === "go" || userRole === "gestordecontrato") &&
            (plan.status === "Pendente Aprovação" ||
              plan.status === "Pendente Aprovação GDC" ||
              plan.status === "Editado - Pendente Aprovação" ||
              plan.status === "Editado - Pendente Aprovação GDC") && (
              <Button
                variant="outline"
                onClick={() => {
                  handleEditPlan(plan)
                }}
                className="mr-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          <Button variant="outline" onClick={() => setSelectedPlanForDetails(null)}>
            Fechar
          </Button>
        </DialogFooter>
      </>
    )
  }

  const validatePKDistance = (dateStr: string, dayData: DayData): boolean => {
    // Only validate for prestador role
    if (userRole !== "prestador") {
      return false
    }

    // Check if all PK fields are filled
    if (!dayData.pkInicialKm || !dayData.pkInicialMeters || !dayData.pkFinalKm || !dayData.pkFinalMeters) {
      return false
    }

    // Check if current dayData has a tipoTrabalhoDay set to "Trabalhos Fixos"
    if (dayData.tipoTrabalhoDay !== "Trabalhos Fixos") {
      return false
    }

    // Calculate PK values in kilometers
    const pkInicial = Number.parseFloat(dayData.pkInicialKm) + Number.parseFloat(dayData.pkInicialMeters) / 1000
    const pkFinal = Number.parseFloat(dayData.pkFinalKm) + Number.parseFloat(dayData.pkFinalMeters) / 1000

    // Check if PK values are valid numbers after parsing
    if (isNaN(pkInicial) || isNaN(pkFinal)) {
      return false
    }

    // Calculate absolute difference
    const difference = Math.abs(pkFinal - pkInicial)

    // Check if distance exceeds 3.5 km
    if (difference > 3.5) {
      setPkValidationError({
        show: true,
        dateStr,
        distance: difference,
      })
      return true // Indicate that there was an error
    }
    return false // Indicate no error
  }

  const validateAllDaysWithTrabalhosFix = () => {
    // Get all dates that have Trabalhos Fixos selected
    const datesWithTrabalhosFix = Object.entries(dayDataMap).filter(
      ([_, dayData]) => dayData.tipoTrabalhoDay === "Trabalhos Fixos",
    )

    // Validate each day
    for (const [dateStr, dayData] of datesWithTrabalhosFix) {
      const hasError = validatePKDistance(dateStr, dayData)
      if (hasError) {
        // Stop at the first error to show it to the user
        break
      }
    }
  }

  const handlePkValidationErrorClose = () => {
    const { dateStr } = pkValidationError

    // Disable "Trabalhos Fixos" for this day
    setDisabledTipoTrabalhoByDay((prev) => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), "Trabalhos Fixos"],
    }))

    // Reset tipoTrabalhoDay if it was "Trabalhos Fixos"
    if (dayDataMap[dateStr]?.tipoTrabalhoDay === "Trabalhos Fixos") {
      updateDayData(dateStr, "tipoTrabalhoDay", "")
      // Also clear esquema since it depends on tipo de trabalho
      updateDayData(dateStr, "esquema", "")
    }

    // Close the dialog
    setPkValidationError({ show: false, dateStr: "", distance: 0 })
  }

  const reEnableTrabalhosFix = (dateStr: string) => {
    setDisabledTipoTrabalhoByDay((prev) => {
      const updated = { ...prev }
      if (updated[dateStr]) {
        // Remove "Trabalhos Fixos" from the disabled list
        updated[dateStr] = updated[dateStr].filter((tipo) => tipo !== "Trabalhos Fixos")
        // If the array is empty, remove the key
        if (updated[dateStr].length === 0) {
          delete updated[dateStr]
        }
      }
      return updated
    })
  }

  const PERFIL_RESTRICOES_MAP: Record<string, string[]> = {
    "2 x 3": ["Esquerda", "Central (Via Lentos)"],
    "2 x 4": ["Berma", "Direita", "Esquerda", "Central Direita", "Central Esquerda"],
    "1 x 1": ["Berma", "Via única"],
    "1 x 2": ["Berma", "Direita", "Esquerda"],
    "Garrafão de Portagem": ["Garrafão de Portagem"],
  }

  const TIPO_TRABALHO_ESQUEMA_MAP: Record<string, string[]> = {
    "Trabalhos Fixos": [
      "F01",
      "F01a",
      "F01b",
      "F01c",
      "F01d",
      "F02",
      "F02a",
      "F03",
      "F03b",
      "F04",
      "F05",
      "F05b",
      "F06",
      "F07",
      "F08",
      "F09",
      "F10",
      "F11",
      "F12",
      "F13",
      "F14",
      "F15",
      "F16",
      "F17",
      "F18",
      "F19",
      "F20",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F26",
      "F27",
      "F28",
      "F29",
      "F30",
      "F31",
      "F33",
      "F34",
      "F34a",
      "F35",
      "F35a",
      "F36",
      "F37",
      "F38",
      "F39",
      "F40",
      "F41",
      "F42",
      "F43",
      "F44",
      "F45",
      "F46",
      "F47",
      "F48",
      "F49",
      "F49a",
      "F50",
      "F50a",
      "D1",
      "D2",
      "D3",
      "D4",
      "D4a",
      "FSL1",
      "FSL2",
      "FSL3",
      "FSL4",
      "FSL5",
      "FSL6",
    ],
    "Trabalhos Móveis": [
      "M01",
      "M02",
      "M03",
      "M04",
      "M05",
      "M06",
      "M07",
      "M08",
      "M09",
      "M10",
      "M11",
      "M12",
      "MR1",
      "MR2",
      "MRV13",
      "MRV14",
      "MRV15",
      "MRV16",
      "MRV17",
      "MRV18",
      "MRV19",
      "MRV20",
    ],
    "Perigos Temporários": ["P1A", "P1B", "P22", "P23", "P24"],
  }

  const validateTime = (time: string): boolean => {
    if (!time || time.length !== 5) return false

    const [hours, minutes] = time.split(":").map(Number)

    // Validate hours (00-23) and minutes (00-59)
    if (isNaN(hours) || isNaN(minutes)) return false
    if (hours < 0 || hours > 23) return false
    if (minutes < 0 || minutes > 59) return false

    return true
  }

  const compareTime = (startTime: string, endTime: string): boolean => {
    // Returns true if endTime is after or equal to startTime
    if (!startTime || !endTime) return true
    if (!validateTime(startTime) || !validateTime(endTime)) return true // Consider invalid times as comparable to avoid blocking valid input

    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const [endHours, endMinutes] = endTime.split(":").map(Number)

    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes

    return endTotalMinutes >= startTotalMinutes
  }

  const formatTimeInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "")

    // Limit to 4 digits
    let limitedNumbers = numbers.slice(0, 4)

    // Validate hours (first 2 digits must be 00-23)
    if (limitedNumbers.length >= 1) {
      const firstDigit = Number.parseInt(limitedNumbers[0])
      // First digit of hours must be 0, 1, or 2
      if (firstDigit > 2) {
        limitedNumbers = ""
      }
    }

    if (limitedNumbers.length >= 2) {
      const firstDigit = Number.parseInt(limitedNumbers[0])
      const secondDigit = Number.parseInt(limitedNumbers[1])
      // If first digit is 2, second digit must be 0-3 (for 20-23)
      if (firstDigit === 2 && secondDigit > 3) {
        limitedNumbers = limitedNumbers.slice(0, 1)
      }
    }

    // Validate minutes (digits 3-4 must be 00-59)
    if (limitedNumbers.length >= 3) {
      const firstMinuteDigit = Number.parseInt(limitedNumbers[2])
      // First digit of minutes must be 0-5
      if (firstMinuteDigit > 5) {
        limitedNumbers = limitedNumbers.slice(0, 2)
      }
    }

    // Add colon after first 2 digits
    if (limitedNumbers.length >= 3) {
      return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2)}`
    }

    return limitedNumbers
  }

  const handleTimeInput = (dateStr: string, field: "horaInicio" | "horaFim", value: string) => {
    const formatted = formatTimeInput(value)

    // Only validate if the input is complete (5 characters: HH:MM)
    if (formatted.length === 5) {
      if (!validateTime(formatted)) {
        // Optionally, you could display an error to the user here
        return // Don't update if time is invalid
      }

      // Get current day data to check the other time field
      const currentDayData = dayDataMap[dateStr]

      if (currentDayData) {
        if (field === "horaFim") {
          // Check if end time is not before start time
          if (currentDayData.horaInicio && !compareTime(currentDayData.horaInicio, formatted)) {
            alert("A Hora de Fim não pode ser anterior à Hora de Início")
            return
          }
        } else if (field === "horaInicio") {
          // Check if start time is not after end time
          if (currentDayData.horaFim && !compareTime(formatted, currentDayData.horaFim)) {
            alert("A Hora de Início não pode ser posterior à Hora de Fim")
            return
          }
        }
      }
    }

    updateDayData(dateStr, field, formatted)
  }

  const updateSublancoForDay = async (dateStr: string) => {
    const dayData = dayDataMap[dateStr] // Accessing from the state object

    if (!dayData || !concessao || !autoEstrada) {
      // Clear sublanco if essential data is missing
      updateDayData(dateStr, "sublanco", "")
      return
    }

    const kmInicial = Number.parseInt(dayData.pkInicialKm || "0")
    const kmFinal = Number.parseInt(dayData.pkFinalKm || "0")

    if (kmInicial === 0 && kmFinal === 0) {
      // Clear sublanco if PKs are reset
      updateDayData(dateStr, "sublanco", "")
      return
    }

    const sublanco = await calculateSublanco(concessao, autoEstrada, kmInicial, kmFinal)
    updateDayData(dateStr, "sublanco", sublanco)

    if (sublanco) {
      setVegetalNumero(sublanco)
    }
  }

  useEffect(() => {
    const calculateFormSublanco = async () => {
      // Only calculate if all required fields are filled
      if (!concessao || !autoEstrada || !kmInicial || !kmFinal) {
        return
      }

      const kmInicialNum = Number.parseInt(kmInicial)
      const kmFinalNum = Number.parseInt(kmFinal)

      if (isNaN(kmInicialNum) || isNaN(kmFinalNum)) {
        return
      }

      const result = await calculateSublanco(concessao, autoEstrada, kmInicialNum, kmFinalNum)

      if (result) {
        setVegetalNumero(result)
      } else {
        setVegetalNumero("")
      }
    }

    calculateFormSublanco()
  }, [concessao, autoEstrada, kmInicial, kmFinal])

  useEffect(() => {
    const loadConcessoes = async () => {
      try {
        const csvUrl =
          "https://docs.google.com/spreadsheets/d/1ATKqWm_bTtN398nbfpR0gtHbqYLAc3R5fhOSPqZmNkA/export?format=csv"
        const response = await fetch(csvUrl)
        if (!response.ok) {
          throw new Error("Failed to load CSV from Google Sheets")
        }
        const csvText = await response.text()

        // Parse CSV
        const lines = csvText.split("\n").filter((line) => line.trim())
        if (lines.length === 0) {
          throw new Error("CSV is empty")
        }

        // Get headers (first line)
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))

        // Find the "concessão" column (case-insensitive)
        const concessaoIndex = headers.findIndex(
          (h) =>
            h
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") === "concessao".normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        )

        if (concessaoIndex === -1) {
          console.error("Available columns:", headers)
          throw new Error("Column 'concessão' not found in CSV")
        }

        // Extract values from the concessão column
        const concessaoValues = new Set<string>()
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
          const concessaoValue = values[concessaoIndex]
          if (concessaoValue && concessaoValue.trim()) {
            concessaoValues.add(concessaoValue.trim())
          }
        }

        // Format as array of objects with value and label
        const formattedData = Array.from(concessaoValues).map((item) => ({
          value: item,
          label: item,
        }))

        setConcessoes(formattedData)
      } catch (error) {
        console.error("Erro ao carregar concessões:", error)
        // Fallback to local file if Google Sheets fails
        try {
          const response = await fetch("/data/concessoes.json")
          if (response.ok) {
            const data: string[] = await response.json()
            const formattedData = data.map((item) => ({
              value: item,
              label: item,
            }))
            setConcessoes(formattedData)
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError)
        }
      }
    }

    loadConcessoes()
  }, [])

  useEffect(() => {
    const fetchPerfilRestricoesCsv = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1YjO_rNCY9XAPaO7YkMuumlosb-DmiLsbE6jie8JTfkw/export?format=csv",
        )
        const csvText = await response.text()

        // Parse CSV
        const lines = csvText.split("\n").filter((line) => line.trim())
        if (lines.length === 0) {
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))

        // Find column indices (case-insensitive with accent normalization)
        const normalizeString = (str: string) =>
          str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")

        const perfilIndex = headers.findIndex((h) => normalizeString(h) === normalizeString("Perfil"))
        const restricoesIndex = headers.findIndex((h) => normalizeString(h) === normalizeString("Restrições"))

        if (perfilIndex === -1 || restricoesIndex === -1) {
          console.error("[v0] Required columns not found in perfil-restricoes CSV")
          return
        }

        // Parse data rows
        const data: Array<{ perfil: string; restricoes: string }> = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
          const perfil = values[perfilIndex]
          const restricoes = values[restricoesIndex]

          if (perfil && restricoes) {
            data.push({ perfil, restricoes })
          }
        }

        setPerfilRestricoesCsvData(data)

        const uniquePerfis = Array.from(new Set(data.map((row) => row.perfil))).sort()
        setPerfilOptions(uniquePerfis)
      } catch (error) {
        console.error("[v0] Error fetching perfil-restricoes CSV:", error)
      }
    }

    fetchPerfilRestricoesCsv()
  }, [])

  useEffect(() => {
    const fetchTipoAtividadeData = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1K2UXfOD3pcJ-8LTjKuEzgsPUn0H5WDOJXVT93_iWrUg/export?format=csv",
        )
        const csvText = await response.text()

        // Parse CSV
        const lines = csvText.split("\n").filter((line) => line.trim())
        if (lines.length === 0) return

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))

        // Find column indices (case-insensitive)
        const tipoTrabalhoIndex = headers.findIndex(
          (h) =>
            h
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") === "tipo de trabalho".normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        )
        const atividadeIndex = headers.findIndex(
          (h) =>
            h
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") === "atividade".normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        )

        if (tipoTrabalhoIndex === -1 || atividadeIndex === -1) {
          console.error("[v0] Required columns not found in CSV")
          return
        }

        // Parse data rows
        const data: Array<{ tipoTrabalho: string; atividade: string }> = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
          const tipoTrabalho = values[tipoTrabalhoIndex]
          const atividade = values[atividadeIndex]

          if (tipoTrabalho && atividade) {
            data.push({ tipoTrabalho, atividade })
          }
        }

        setTipoAtividadeCSVData(data)
      } catch (error) {
        console.error("[v0] Error fetching tipo/atividade CSV:", error)
      }
    }

    fetchTipoAtividadeData()
  }, [])

  useEffect(() => {
    const tipoTrabalhoValues = [
      "Edificios e Portagens",
      "Pavimentos",
      "Taludes",
      "Drenagem",
      "Obras Arte",
      "Vedações e Património",
      "Sinalização Horizontal",
      "Sinalização Vertical",
      "Acidente",
      "Equipamentos",
      "Revestimento Vegetal",
      "Outros",
    ]
    setTipoTrabalhoOptions(tipoTrabalhoValues)
  }, [])

  useEffect(() => {
    const tipoTrabalhoValues = ["Perigos Temporários", "Trabalhos Fixos", "Trabalhos Móveis"]
    setTipoTrabalhoPerDayOptions(tipoTrabalhoValues)
  }, [])

  useEffect(() => {
    const fetchTipoEsquemaData = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1qDI5zszQV3aRKbCPD-TjOaqFgnGxlzoETmPAKEhJN1c/export?format=csv",
        )
        const csvText = await response.text()

        // Parse CSV
        const lines = csvText.split("\n").filter((line) => line.trim())
        if (lines.length === 0) {
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))

        const normalizeString = (str: string) =>
          str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")

        const tipoTrabalhoIndex = headers.findIndex((h) => normalizeString(h) === normalizeString("Tipo de Esquema"))
        const esquemaIndex = headers.findIndex((h) => normalizeString(h) === normalizeString("Esquemas"))

        if (tipoTrabalhoIndex === -1 || esquemaIndex === -1) {
          console.error("[v0] Required columns not found in tipo trabalho and esquema CSV")
          console.error("[v0] Looking for: 'Tipo de Esquema' and 'Esquemas'")
          console.error("[v0] Found headers:", headers)
          return
        }

        // Parse data rows
        const data: Array<{ tipoTrabalho: string; esquema: string }> = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
          const tipoTrabalho = values[tipoTrabalhoIndex]
          const esquema = values[esquemaIndex]

          if (tipoTrabalho && esquema) {
            data.push({ tipoTrabalho, esquema })
          }
        }

        setTipoEsquemaCSVData(data)
      } catch (error) {
        console.error("[v0] Error fetching tipo trabalho and esquema CSV:", error)
      }
    }

    fetchTipoEsquemaData()
  }, [])

  useEffect(() => {
    if (!tipoTrabalho) {
      setAtividadeOptions([])
      return
    }

    // Get atividades from hardcoded mapping
    const atividades = TIPO_TRABALHO_TO_ATIVIDADES[tipoTrabalho] || []
    setAtividadeOptions(atividades)

    if (!editingAtividadeId && !editingPlanId) {
      setAtividade("")
    }
  }, [tipoTrabalho, editingAtividadeId, editingPlanId])

  useEffect(() => {
    const newDailyDetails: { [dateString: string]: DailyDetail } = {}

    Object.entries(dayDataMap).forEach(([dateStr, dayData]) => {
      const timeSlot = dayData.todoDia ? "00:00 - 23:59" : `${dayData.horaInicio} - ${dayData.horaFim}` // Ensure it's always HH:MM - HH:MM or "Todo o dia"

      const kmsInicio =
        dayData.pkInicialKm && dayData.pkInicialMeters ? `${dayData.pkInicialKm} Km + ${dayData.pkInicialMeters} m` : ""

      const kmsFim =
        dayData.pkFinalKm && dayData.pkFinalMeters ? `${dayData.pkFinalKm} Km + ${dayData.pkFinalMeters} m` : ""

      newDailyDetails[dateStr] = {
        timeSlot: timeSlot,
        perfilTipo: dayData.perfil,
        tipoTrabalho: dayData.tipoTrabalhoDay ? [dayData.tipoTrabalhoDay] : [],
        kmsInicio: kmsInicio,
        kmsFim: kmsFim,
        sentido: dayData.sentido ? [dayData.sentido] : [],
        vias: dayData.restricoes || [], // 'vias' maps to 'restricoes'
        esqRef: dayData.esquema,
        outrosLocais: dayData.localIntervencao ? [dayData.localIntervencao] : [],
        responsavelNome: "", // Not used in current form
        responsavelContacto: "", // Not used in current form
        observacoes: dayData.observacoes || "", // Initialize observacoes
        autoEstrada: autoEstrada, // Add autoEstrada to DailyDetail
        sublanco: dayData.sublanco, // Add sublanco to DailyDetail
      }
    })

    setDailyDetails(newDailyDetails)
  }, [dayDataMap, autoEstrada]) // Depend on autoEstrada to update DailyDetail

  useEffect(() => {
    const newWeeklyCounts: { [weekId: string]: number } = {}

    submittedPlans.forEach((plan) => {
      // Show approved plans, or edited/rejected plans that are already in iSistema
      const shouldShowInCCO =
        plan.status === "Confirmado" ||
        ((plan.status === "Editado - Pendente Aprovação" || plan.status === "Rejeitado") && plan.isInISistema)

      if (shouldShowInCCO && plan.atividades.length > 0 && plan.atividades[0].periodo.from) {
        const weekNum = getWeek(plan.atividades[0].periodo.from, { locale: ptBR, weekStartsOn: 1 })
        const year = getYear(plan.atividades[0].periodo.from)
        const weekId = `${year}-Semana-${weekNum}`
        newWeeklyCounts[weekId] = (newWeeklyCounts[weekId] || 0) + 1
      }
    })
    setWeeklyPlanCounts(newWeeklyCounts)
  }, [submittedPlans])

  useEffect(() => {
    // Skip regeneration if we're in edit mode - the edit handler will set dayDataMap
    if (editingAtividadeId) {
      return
    }

    const newDayDataMap = generateDaysData(dateRange)
    // Preserve existing data for dates that are still in the new range
    Object.keys(dayDataMap).forEach((dateStr) => {
      if (newDayDataMap.find((day) => format(day.date, "yyyy-MM-dd") === dateStr)) {
        const existingData = dayDataMap[dateStr]
        const dayIndex = newDayDataMap.findIndex((day) => format(day.date, "yyyy-MM-dd") === dateStr)
        if (dayIndex !== -1) {
          // Ensure we don't overwrite newly generated default values if they exist
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
    } else if (loginData.email === "gestordecontrato@teste.pt") {
      setUser({ name: "Gestor de Contrato", email: loginData.email })
      setUserRole("gestordecontrato")
      setIsLoggedIn(true)
      setActiveTab("aprovacao-gdc")
    } else if (loginData.email === "go@teste.pt") {
      setUser({ name: "Gestor de Operações", email: loginData.email })
      setUserRole("go")
      setIsLoggedIn(true)
      setActiveTab("aprovacao")
    } else if (loginData.email === "cco@teste.pt") {
      setUser({ name: "Coordenador de Operações", email: loginData.email })
      setUserRole("cco")
      setIsLoggedIn(true)
      setActiveTab("dashboard-cco") // Changed active tab for CCO
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
    setIsUrgente(false) // Reset urgent status on logout
    setTrabalhoFixo(false)
    setTrabalhoMovel(false)
    setPerigosTemporarios(false)
    setAtividades([])
    setEditingAtividadeId(null)
    setIsEditingApprovedPlan(false)
    setFiscalizacaoNome("")
    setFiscalizacaoContato("")
    setEntidadeExecutanteNome("")
    setEntidadeExecutanteContato("")
    setSinalizacaoNome("")
    setSinalizacaoContato("")
    setTipoAtividadeCSVData([])
    setPerfilRestricoesCsvData([])
    setRestricoesOptionsByDay({})
    setTipoEsquemaCSVData([])
    setEsquemaOptionsByDay({})
    setPkValidationError({ show: false, dateStr: "", distance: 0 })
    setDisabledTipoTrabalhoByDay({})
    setPkConflictDialog({ open: false, conflictDetails: "" })
    // Reset edit dialog state
    setEditDialogOpen(false)
    // Clear notifications on logout
    setEditNotifications([])
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
  const generateDaysData = (range: DayPickerDateRange | undefined): DayData[] => {
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
        restricoes: [], // Initialize as an empty array
        esquema: "",
        observacoes: "",
        sublanco: "", // Initialize sublanco
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
        observacoes: "", // Initialize observacoes
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

  const handleDayClick = (day: Date) => {
    const clickedDay = startOfDay(day)

    // If no range is selected, start a new single-day selection
    if (!dateRange || !dateRange.from) {
      setDateRange({ from: clickedDay, to: clickedDay })
      return
    }

    // If a single day is selected (from === to)
    if (dateRange.from && dateRange.to && isSameDay(dateRange.from, dateRange.to)) {
      const selectedDay = startOfDay(dateRange.from)

      // If clicking the same day, deselect
      if (isSameDay(clickedDay, selectedDay)) {
        setDateRange(undefined)
        return
      }

      // If clicking a different day, create a range or new single-day selection
      if (clickedDay < selectedDay) {
        setDateRange({ from: clickedDay, to: selectedDay })
      } else {
        setDateRange({ from: selectedDay, to: clickedDay })
      }
      return
    }

    // If a range is already selected, start a new single-day selection
    if (dateRange.from && dateRange.to) {
      setDateRange({ from: clickedDay, to: clickedDay })
      return
    }

    // If only 'from' is selected (shouldn't happen with new logic, but keeping for safety)
    if (dateRange.from && !dateRange.to) {
      const from = startOfDay(dateRange.from)

      if (isSameDay(clickedDay, from)) {
        setDateRange(undefined)
        return
      }

      if (clickedDay < from) {
        setDateRange({ from: clickedDay, to: from })
      } else {
        setDateRange({ from, to: clickedDay })
      }
      return
    }

    // Fallback: start new single-day selection
    setDateRange({ from: clickedDay, to: clickedDay })
  }

  const updateRestricoesOptionsForDay = (dateStr: string, selectedPerfil: string, preserveValue = false) => {
    if (!selectedPerfil) {
      setRestricoesOptionsByDay((prev) => ({ ...prev, [dateStr]: [] }))
      // Clear the selected restrictions if the profile is cleared
      if (!preserveValue) {
        updateDayData(dateStr, "restricoes", [])
      }
      return
    }

    // Get restricoes options from hardcoded mapping
    const restricoesOptions = PERFIL_RESTRICOES_MAP[selectedPerfil] || []
    setRestricoesOptionsByDay((prev) => ({ ...prev, [dateStr]: restricoesOptions }))

    // Clear selected restrictions when perfil changes (unless preserveValue is true during editing)
    if (!preserveValue) {
      updateDayData(dateStr, "restricoes", [])
    }
  }

  const updateEsquemaOptionsForDay = (dateStr: string, selectedTipoTrabalho: string, preserveValue = false) => {
    if (!selectedTipoTrabalho) {
      setEsquemaOptionsByDay((prev) => ({ ...prev, [dateStr]: [] }))
      // Clear the selected esquema if tipo de trabalho is cleared
      if (!preserveValue) {
        updateDayData(dateStr, "esquema", "")
      }
      return
    }

    // Get esquema options from hardcoded mapping
    const esquemaOptions = TIPO_TRABALHO_ESQUEMA_MAP[selectedTipoTrabalho] || []
    setEsquemaOptionsByDay((prev) => ({ ...prev, [dateStr]: esquemaOptions }))

    // Clear the selected esquema when tipo de trabalho changes
    if (!preserveValue) {
      updateDayData(dateStr, "esquema", "")
    }
  }

  const copyToNextDay = (currentDateStr: string) => {
    const currentDate = parseISO(currentDateStr)
    const nextDate = addDays(currentDate, 1)
    const nextDateStr = format(nextDate, "yyyy-MM-dd")

    const currentDayData = dayDataMap[currentDateStr]

    if (!currentDayData) {
      return
    }

    // Copy all relevant fields to the next day
    const copiedData: Partial<DayData> = {
      horaInicio: currentDayData.horaInicio,
      horaFim: currentDayData.horaFim,
      todoDia: currentDayData.todoDia,
      pkInicialKm: currentDayData.pkInicialKm,
      pkInicialMeters: currentDayData.pkInicialMeters,
      pkFinalKm: currentDayData.pkFinalKm,
      pkFinalMeters: currentDayData.pkFinalMeters,
      perfil: currentDayData.perfil,
      restricoes: currentDayData.restricoes,
      sentido: currentDayData.sentido,
      tipoTrabalhoDay: currentDayData.tipoTrabalhoDay,
      localIntervencao: currentDayData.localIntervencao,
      esquema: currentDayData.esquema,
      observacoes: currentDayData.observacoes,
      // Work characteristics copied to the activity level, not per day
    }

    // Update the next day with copied data
    setDayDataMap((prev) => ({
      ...prev,
      [nextDateStr]: {
        ...prev[nextDateStr], // Ensure existing data for the next day is preserved if any
        ...copiedData,
      },
    }))

    // Update dependent options for the next day
    if (copiedData.perfil) {
      updateRestricoesOptionsForDay(nextDateStr, copiedData.perfil, true)
    }
    if (copiedData.tipoTrabalhoDay) {
      updateEsquemaOptionsForDay(nextDateStr, copiedData.tipoTrabalhoDay, true)
    }

    // Trigger sublanco calculation for the next day
    setTimeout(() => updateSublancoForDay(nextDateStr), 100)
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
    setRestricoes([]) // Reset to empty array
    setEsquema("")
    setObservacoes("")
    setEditingAtividadeId(null)
    // Clear daily details specific to this activity
    setRestricoesOptionsByDay({})
    // Reset esquemas for the cleared activity
    setEsquemaOptionsByDay({})
    // Reset disabled tipo trabalho options for the cleared activity's days
    setDisabledTipoTrabalhoByDay({})
  }

  const handleAdicionarAtividade = () => {
    // Validate required fields
    if (!descricaoAtividade.trim()) {
      setNotificationDialog({
        open: true,
        title: "Erro",
        description: "Por favor, preencha a descrição da atividade.",
      })
      return
    }

    if (!dateRange?.from || !dateRange?.to) {
      setNotificationDialog({
        open: true,
        title: "Erro",
        description: "Por favor, selecione um período para a atividade.",
      })
      return
    }

    if (userRole === "prestador") {
      // Check for PK conflicts with approved plans, but exclude the current plan if editing
      const approvedPlans = submittedPlans.filter((plan) => {
        // Exclude the current plan being edited from the conflict check
        if (editingPlanId && plan.id === editingPlanId) {
          return false
        }
        return plan.status === "Confirmado"
      })

      // Check each day in the date range
      const currentDate = dateRange.from ? new Date(dateRange.from) : null
      const endDate = dateRange.to ? new Date(dateRange.to) : null

      if (!currentDate || !endDate) {
        setNotificationDialog({
          open: true,
          title: "Erro Interno",
          description: "Não foi possível verificar conflitos de PK devido a um intervalo de datas inválido.",
        })
        return
      }

      let conflictDetected = false

      while (currentDate <= endDate && !conflictDetected) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const dayData = dayDataMap[dateStr]

        if (dayData) {
          const pkInicialKm = Number.parseFloat(dayData.pkInicialKm || "0")
          const pkInicialMeters = Number.parseFloat(dayData.pkInicialMeters || "0")
          const pkFinalKm = Number.parseFloat(dayData.pkFinalKm || "0")
          const pkFinalMeters = Number.parseFloat(dayData.pkFinalMeters || "0")

          if (
            (pkInicialKm || pkInicialMeters || pkFinalKm || pkFinalMeters) &&
            (pkInicialKm + pkInicialMeters / 1000 > 0 || pkFinalKm + pkFinalMeters / 1000 > 0)
          ) {
            const pkInicial = pkInicialKm + pkInicialMeters / 1000
            const pkFinal = pkFinalKm + pkFinalMeters / 1000

            const minPK = Math.min(pkInicial, pkFinal)
            const maxPK = Math.max(pkInicial, pkFinal)

            for (const approvedPlan of approvedPlans) {
              if (approvedPlan.autoEstrada !== autoEstrada) {
                continue
              }

              for (const activity of approvedPlan.atividades) {
                const activityStart = activity.periodo.from ? new Date(activity.periodo.from) : null
                const activityEnd = activity.periodo.to ? new Date(activity.periodo.to) : null
                const checkDate = new Date(dateStr)

                if (activityStart && activityEnd && checkDate >= activityStart && checkDate <= activityEnd) {
                  const activityDayData = activity.dayDataMap?.[dateStr]

                  if (activityDayData) {
                    const approvedPkInicialKm = Number.parseFloat(activityDayData.pkInicialKm || "0")
                    const approvedPkInicialMeters = Number.parseFloat(activityDayData.pkInicialMeters || "0")
                    const approvedPkFinalKm = Number.parseFloat(activityDayData.pkFinalKm || "0")
                    const approvedPkFinalMeters = Number.parseFloat(activityDayData.pkFinalMeters || "0")

                    const approvedPkInicial = approvedPkInicialKm + approvedPkInicialMeters / 1000
                    const approvedPkFinal = approvedPkFinalKm + approvedPkFinalMeters / 1000

                    const approvedMinPK = Math.min(approvedPkInicial, approvedPkFinal)
                    const approvedMaxPK = Math.max(approvedPkInicial, approvedPkFinal)

                    const hasOverlap = minPK <= approvedMaxPK && approvedMinPK <= maxPK

                    if (hasOverlap) {
                      setNotificationDialog({
                        open: true,
                        title: "Conflito de Localização",
                        description: `Já existe um trabalho programado e aprovado para a mesma localização:\n\nAutoestrada: ${approvedPlan.autoEstrada}\nData: ${new Date(dateStr).toLocaleDateString("pt-PT")}\nPK: ${approvedMinPK.toFixed(3)} - ${approvedMaxPK.toFixed(3)}\n\nNão é possível adicionar esta atividade.`,
                      })
                      conflictDetected = true
                      return
                    }
                  }
                }
              }
              if (conflictDetected) return
            }
          }
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      if (conflictDetected) {
        return
      }
    }

    // Create activity object
    const atividadeData: Atividade = {
      id: editingAtividadeId || `atividade-${Date.now()}`,
      descricao: descricaoAtividade,
      periodo: {
        from: dateRange.from,
        to: dateRange.to,
      },
      detalhesDiarios: { ...dailyDetails },
      dayDataMap: { ...dayDataMap },
      // Include other fields if they are part of the activity's data
      pkInicialKm: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.pkInicialKm || "",
      pkInicialMeters: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.pkInicialMeters || "",
      pkFinalKm: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.pkFinalKm || "",
      pkFinalMeters: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.pkFinalMeters || "",
      sentido: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.sentido || "",
      perfil: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.perfil || "",
      localIntervencao: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.localIntervencao || "",
      restricoes: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.restricoes || [],
      esquema: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.esquema || "",
      tipoTrabalho: tipoTrabalho, // This is the main plan's tipoTrabalho
      atividade: atividade, // This is the main plan's atividade
      // Add other necessary fields for Atividade
      observacoes: dayDataMap[format(dateRange.from, "yyyy-MM-dd")]?.observacoes || "",
      sublanco: vegetalNumero, // Add sublanco to the activity
      // Added work characteristics to the activity
      trabalhoFixo: trabalhoFixo,
      trabalhoMovel: trabalhoMovel,
      perigosTemporarios: perigosTemporarios,
    }

    if (editingAtividadeId) {
      // Update existing activity
      setAtividades((prev) => prev.map((ativ) => (ativ.id === editingAtividadeId ? atividadeData : ativ)))
    } else {
      // Add new activity
      setAtividades((prev) => [...prev, atividadeData])
    }

    // Reset form
    resetAtividadeForm()
  }

  const handleEditarAtividade = (atividade: Atividade) => {
    setEditingAtividadeId(atividade.id)
    setDescricaoAtividade(atividade.descricao)
    setDateRange(atividade.periodo)
    setDayDataMap(atividade.dayDataMap || {}) // Restore day data
    setDailyDetails(atividade.detalhesDiarios || {}) // Restore daily details
    setVegetalNumero(atividade.sublanco || "") // Set sublanco from activity

    // Restore work characteristics
    setTrabalhoFixo(atividade.trabalhoFixo || false)
    setTrabalhoMovel(atividade.trabalhoMovel || false)
    setPerigosTemporarios(atividade.perigosTemporarios || false)

    // Restore restricoes and esquema options for each day
    if (atividade.dayDataMap) {
      Object.entries(atividade.dayDataMap).forEach(([dateStr, dayData]) => {
        if (dayData.perfil) {
          updateRestricoesOptionsForDay(dateStr, dayData.perfil, true)
        }
        if (dayData.tipoTrabalhoDay) {
          updateEsquemaOptionsForDay(dateStr, dayData.tipoTrabalhoDay, true)
        }
      })
    }
  }

  const handleRemoverAtividade = (atividadeId: string) => {
    setAtividades((prev) => prev.filter((ativ) => ativ.id !== atividadeId))

    // If we're currently editing this activity, reset the form
    if (editingAtividadeId === atividadeId) {
      resetAtividadeForm()
    }
  }

  const resetForm = () => {
    setVegetalNumero("")
    setTipoTrabalho("")
    setAutoEstrada("")
    setConcessao("") // Reset concessao state
    setKmInicial("")
    setKmFinal("")
    setIsUrgente(false) // Reset urgent status on reset form
    setTrabalhoFixo(false)
    setTrabalhoMovel(false)
    setPerigosTemporarios(false)
    setAtividades([])
    resetAtividadeForm()
    setEditingPlanId(null)
    setIsEditingApprovedPlan(false)
    setFiscalizacaoNome("")
    setFiscalizacaoContato("")
    setEntidadeExecutanteNome("")
    setEntidadeExecutanteContato("")
    setSinalizacaoNome("")
    setSinalizacaoContato("")
    // Reset PK validation states
    setPkValidationError({ show: false, dateStr: "", distance: 0 })
    setDisabledTipoTrabalhoByDay({})
  }

  const checkPKConflicts = (): { hasConflict: boolean; conflictMessage: string } => {
    // Only check for prestador users
    if (userRole !== "prestador") {
      return { hasConflict: false, conflictMessage: "" }
    }

    // Get all approved plans
    const approvedPlans = submittedPlans.filter((plan) => {
      // Exclude the current plan being edited from the conflict check
      if (editingPlanId && plan.id === editingPlanId) {
        return false
      }
      return plan.status === "Confirmado"
    })

    // Check each activity in the current plan
    for (const atividade of atividades) {
      if (!atividade.periodo.from || !atividade.periodo.to) continue

      const selectedDates = getDatesInRange(atividade.periodo.from, atividade.periodo.to)

      for (const date of selectedDates) {
        const dateStr = format(date, "yyyy-MM-dd")
        const dayData = dayDataMap[dateStr]

        if (!dayData) {
          continue
        }

        // Calculate PK interval for current plan
        const currentPkInicial =
          Number.parseFloat(dayData.pkInicialKm || "0") + Number.parseFloat(dayData.pkInicialMeters || "0") / 1000
        const currentPkFinal =
          Number.parseFloat(dayData.pkFinalKm || "0") + Number.parseFloat(dayData.pkFinalMeters || "0") / 1000

        // Skip if PK values are not set
        if (currentPkInicial === 0 && currentPkFinal === 0) {
          continue
        }

        // Normalize the interval (ensure inicial <= final)
        const currentMin = Math.min(currentPkInicial, currentPkFinal)
        const maxPK = Math.max(currentPkInicial, currentPkFinal)

        // Check against all approved plans
        for (const approvedPlan of approvedPlans) {
          // Skip if different autoestrada
          if (approvedPlan.autoEstrada !== autoEstrada) {
            continue
          }

          // Check each activity in the approved plan
          for (const approvedAtividade of approvedPlan.atividades) {
            if (!approvedAtividade.periodo.from || !approvedAtividade.periodo.to) continue

            const approvedDates = getDatesInRange(approvedAtividade.periodo.from, approvedAtividade.periodo.to)

            // Check if the date matches
            const dateMatches = approvedDates.some((approvedDate) => {
              return format(approvedDate, "yyyy-MM-dd") === dateStr
            })

            if (!dateMatches) continue

            // Get PK data for this date in the approved plan
            const approvedDayData = approvedAtividade.dayDataMap?.[dateStr]
            if (!approvedDayData) {
              continue
            }

            // Calculate PK interval for approved plan
            const approvedPkInicial =
              Number.parseFloat(approvedDayData.pkInicialKm || "0") +
              Number.parseFloat(approvedDayData.pkInicialMeters || "0") / 1000
            const approvedPkFinal =
              Number.parseFloat(approvedDayData.pkFinalKm || "0") +
              Number.parseFloat(approvedDayData.pkFinalMeters || "0") / 1000

            // Skip if PK values are not set
            if (approvedPkInicial === 0 && approvedPkFinal === 0) {
              continue
            }

            // Normalize the approved interval
            const approvedMin = Math.min(approvedPkInicial, approvedPkFinal)
            const approvedMax = Math.max(approvedPkInicial, approvedPkFinal)

            // Check for overlap: two intervals [a1, a2] and [b1, b2] overlap if a1 <= b2 AND b1 <= a2
            const hasOverlap = currentMin <= approvedMax && approvedMin <= maxPK

            if (hasOverlap) {
              const conflictMessage = `Já existe um trabalho aprovado para a mesma localização:\n\nAuto Estrada: ${autoEstrada}\nData: ${format(date, "dd/MM/yyyy")}\nIntervalo Aprovado: PK ${approvedMin.toFixed(3)} - ${approvedMax.toFixed(3)}\nSeu Intervalo: PK ${currentMin.toFixed(3)} - ${maxPK.toFixed(3)}\n\nPor favor, escolha um intervalo diferente.`

              return { hasConflict: true, conflictMessage }
            }
          }
        }
      }
    }

    return { hasConflict: false, conflictMessage: "" }
  }

  // FIX: Added confirmGDCRejection function
  const confirmGDCRejection = () => {
    setSubmittedPlans((prev) =>
      prev.map((plan) =>
        plan.id === confirmationDialog.planId
          ? {
              ...plan,
              status: "Rejeitado",
              comentarioGDC: rejectionComment || undefined,
              originalValues: undefined, // Clear originalValues on rejection
            }
          : plan,
      ),
    )
    setNotificationDialog({
      open: true,
      title: "Plano Rejeitado pelo GDC",
      description: "O plano foi rejeitado. O prestador foi notificado.",
    })
    setConfirmationDialog({ open: false, type: "reject", planId: "", planTitle: "" })
    setRejectionComment("")
  }

  const handleSubmitPlano = (e?: React.FormEvent) => {
    if (e) e.preventDefault() // Prevent default form submission if event is passed

    // Basic validation
    if (!vegetalNumero.trim()) {
      setNotificationDialog({
        open: true,
        title: "Erro na Submissão",
        description: "Por favor, preencha o Sublanço.",
      })
      return
    }
    if (!concessao) {
      setNotificationDialog({
        open: true,
        title: "Erro na Submissão",
        description: "Por favor, selecione a Concessão.",
      })
      return
    }
    if (!autoEstrada) {
      setNotificationDialog({
        open: true,
        title: "Erro na Submissão",
        description: "Por favor, selecione a Auto Estrada.",
      })
      return
    }
    if (!kmInicial.trim() || !kmFinal.trim()) {
      setNotificationDialog({
        open: true,
        title: "Erro na Submissão",
        description: "Por favor, preencha o Km inicial e Km final.",
      })
      return
    }

    if (atividades.length === 0) {
      setNotificationDialog({
        open: true,
        title: "Erro na Submissão",
        description: "Por favor, adicione pelo menos uma atividade ao plano.",
      })
      return
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    for (const atividade of atividades) {
      if (atividade.periodo.from && atividade.periodo.to) {
        const selectedDates = getDatesInRange(atividade.periodo.from, atividade.periodo.to)

        for (const date of selectedDates) {
          const dateStr = format(date, "yyyy-MM-dd")
          const dayData = dayDataMap[dateStr]
          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

          // If the date is before today, reject
          if (dateOnly < today) {
            setNotificationDialog({
              open: true,
              title: "Data Inválida",
              description: `Não é possível submeter planos de trabalho para datas passadas. A atividade "${atividade.descricao}" contém a data ${format(date, "dd/MM/yyyy")} que já passou.`,
            })
            return
          }

          // If the date is today and not "todo o dia", check if the time is in the past
          if (dateOnly.getTime() === today.getTime() && dayData && !dayData.todoDia) {
            if (dayData.horaInicio && dayData.horaInicio < currentTime) {
              setNotificationDialog({
                open: true,
                title: "Hora Inválida",
                description: `Não é possível submeter planos de trabalho para horas passadas. A atividade "${atividade.descricao}" tem hora de início ${dayData.horaInicio} no dia ${format(date, "dd/MM/yyyy")} que já passou.`,
              })
              return
            }
          }
        }
      }
    }

    // Final check on time validity for all days in activities
    let allTimesValid = true
    atividades.forEach((atividade) => {
      if (atividade.periodo.from && atividade.periodo.to) {
        const selectedDates = getDatesInRange(atividade.periodo.from, atividade.periodo.to)
        selectedDates.forEach((date) => {
          const dateStr = format(date, "yyyy-MM-dd")
          const dayData = dayDataMap[dateStr]
          if (dayData && !dayData.todoDia) {
            if (!validateTime(dayData.horaInicio) || !validateTime(dayData.horaFim)) {
              setNotificationDialog({
                open: true,
                title: "Formato de Hora Inválido",
                description: `Por favor, verifique o formato da Hora de Início e Hora de Fim para ${format(date, "dd/MM/yyyy", { locale: ptBR })}. O formato deve ser HH:MM.`,
              })
              allTimesValid = false
              return // Stop inner loop
            }
            if (!compareTime(dayData.horaInicio, dayData.horaFim)) {
              setNotificationDialog({
                open: true,
                title: "Conflito de Horário",
                description: `A Hora de Fim não pode ser anterior à Hora de Início no dia ${format(date, "dd/MM/yyyy", { locale: ptBR })}.`,
              })
              allTimesValid = false
              return // Stop inner loop
            }
          }
        })
      }
      if (!allTimesValid) return // Stop outer loop if invalid time found
    })

    if (!allTimesValid) return // Prevent submission if times are invalid

    if (userRole === "prestador") {
      const { hasConflict, conflictMessage } = checkPKConflicts()
      if (hasConflict) {
        setPkConflictDialog({
          open: true,
          conflictDetails: conflictMessage,
        })
        return // Prevent submission
      }
    }

    // Determine the initial status based on user role and editing state
    let newStatus: SubmittedPlan["status"]
    if (editingPlanId) {
      // If editing, maintain the original status if it was already pending GDC or GO,
      // otherwise, transition to the appropriate pending state.
      const originalPlan = submittedPlans.find((p) => p.id === editingPlanId)
      if (originalPlan) {
        if (originalPlan.status.includes("Pendente Aprovação GDC")) {
          newStatus = isEditingApprovedPlan ? "Editado - Pendente Aprovação GDC" : "Pendente Aprovação GDC"
        } else {
          // If it was already approved or rejected by GO, and being edited
          newStatus = isEditingApprovedPlan ? "Editado - Pendente Aprovação" : "Pendente Aprovação"
        }
      } else {
        // Fallback if original plan not found (shouldn't happen)
        newStatus = "Pendente Aprovação GDC"
      }
    } else {
      // For new plans, always start with GDC approval
      newStatus = "Pendente Aprovação GDC"
    }

    const submittedPlan: SubmittedPlan = {
      id: editingPlanId || `plan-${Date.now()}`,
      numero: vegetalNumero,
      tipoTrabalho: tipoTrabalho,
      atividade: atividade,
      autoEstrada: autoEstrada,
      concessao: concessao,
      atividades,
      status: newStatus,
      tipo: "Manutenção Vegetal", // Assuming this is constant for now
      isInISistema: false, // Default value for new plans
      isUrgente: isUrgente,
      kmInicial: kmInicial,
      kmFinal: kmFinal,
      trabalhoFixo: trabalhoFixo, // Set from state
      trabalhoMovel: trabalhoMovel, // Set from state
      perigosTemporarios: perigosTemporarios, // Set from state
      fiscalizacaoNome: fiscalizacaoNome,
      fiscalizacaoContato: fiscalizacaoContato,
      entidadeExecutanteNome: entidadeExecutanteNome,
      entidadeExecutanteContato: entidadeExecutanteContato,
      sinalizacaoNome: sinalizacaoNome,
      sinalizacaoContato: sinalizacaoContato,
      comentarioGDC: undefined,
      comentarioGO: editingPlanId ? submittedPlans.find((p) => p.id === editingPlanId)?.comentarioGO : undefined,
      prestador: user.email, // Use user's email as prestador identifier
      submittedAt: new Date().toISOString(),
      // CHANGE: Only set originalValues if explicitly needed (not on initial submission)
      originalValues: editingPlanId ? submittedPlans.find((p) => p.id === editingPlanId)?.originalValues : undefined,
      editedBy: editingPlanId && (userRole === "gestordecontrato" || userRole === "go") ? user.email : undefined,
      editedAt:
        editingPlanId && (userRole === "gestordecontrato" || userRole === "go") ? new Date().toISOString() : undefined,
    }

    // CHANGE: Fix handleSubmitPlano to get fresh plan data before saving
    if (editingPlanId) {
      console.log("[v0] Updating existing plan. User role:", userRole)

      setSubmittedPlans((prev) => {
        const existingPlan = prev.find((p) => p.id === editingPlanId)

        const preservedOriginalValues = existingPlan?.originalValues
        console.log("[v0] Preserved originalValues:", preservedOriginalValues ? "YES" : "NO")

        return prev.map((plan) =>
          plan.id === editingPlanId
            ? {
                ...submittedPlan,
                id: plan.id,
                status: userRole === "prestador" ? "Editado - Pendente Aprovação GDC" : submittedPlan.status,
                originalValues: preservedOriginalValues, // Always preserve originalValues
                editedBy: userRole === "prestador" ? undefined : user.email,
                editedAt: userRole === "prestador" ? undefined : new Date().toISOString(),
              }
            : plan,
        )
      })
      console.log(
        "[v0] Plan updated. New status:",
        userRole === "prestador" ? "Editado - Pendente Aprovação GDC" : submittedPlan.status,
      )
      setNotificationDialog({
        open: true,
        title: "Plano Atualizado",
        description: `Plano de Trabalho ${vegetalNumero} foi atualizado com sucesso.`,
      })
    } else {
      setSubmittedPlans((prev) => [...prev, submittedPlan])
      setNotificationDialog({
        open: true,
        title: "Plano Submetido",
        description: `Plano de Trabalho ${vegetalNumero} foi submetido com sucesso para aprovação do GDC.`, // Using description for consistency
      })
    }

    setEditingPlanId(null)
    setIsEditingApprovedPlan(false)
    // CHANGE: Redirect to 'todos-planos-gdc' tab for GDC after submission/update
    if (userRole === "gestordecontrato") {
      setActiveTab("todos-planos-gdc")
    } else {
      setActiveTab("agendamentos") // Default tab for other roles
    }
    resetForm()
  }

  const confirmGDCApproval = () => {
    const plan = submittedPlans.find((p) => p.id === confirmationDialog.planId)

    setSubmittedPlans((prev) =>
      prev.map((plan) =>
        plan.id === confirmationDialog.planId
          ? // Preserve originalValues when GDC approves
            { ...plan, status: "Pendente Aprovação", originalValues: plan.originalValues } // Send to GO for final approval, keep originalValues
          : plan,
      ),
    )

    if (plan?.editedBy && plan.editedBy.includes("gestordecontrato")) {
      const planTitle = `${plan.autoEstrada || "..."} - ${plan.numero || "..."} - ${plan.tipoTrabalho || "..."}`
      setEditNotifications((prev) => [
        ...prev,
        {
          planId: plan.id,
          planTitle: planTitle,
          editedBy: plan.editedBy,
        },
      ])
    }

    setNotificationDialog({
      open: true,
      title: "Plano Aprovado pelo GDC!",
      description: "O plano foi aprovado e seguirá para aprovação do Gestor de Operações.",
    })
    setConfirmationDialog({ open: false, type: "approve", planId: "", planTitle: "" })
  }

  const confirmApproval = () => {
    const plan = submittedPlans.find((p) => p.id === confirmationDialog.planId)

    setSubmittedPlans((prev) =>
      prev.map((plan) =>
        plan.id === confirmationDialog.planId
          ? // Preserve originalValues when GO approves (only clear on final confirmation)
            { ...plan, status: "Confirmado", originalValues: plan.originalValues } // Keep originalValues even after confirmation
          : plan,
      ),
    )

    if (plan?.editedBy && plan.editedBy.includes("go@")) {
      const planTitle = `${plan.autoEstrada || "..."} - ${plan.numero || "..."} - ${plan.tipoTrabalho || "..."}`
      setEditNotifications((prev) => [
        ...prev,
        {
          planId: plan.id,
          planTitle: planTitle,
          editedBy: plan.editedBy,
        },
      ])
    }

    setNotificationDialog({
      open: true,
      title: "Plano Aprovado!",
      description: "O plano foi aprovado com sucesso.",
    })
    setConfirmationDialog({ open: false, type: "approve", planId: "", planTitle: "" })
  }

  const confirmRejection = () => {
    setSubmittedPlans((prev) =>
      prev.map((plan) =>
        plan.id === confirmationDialog.planId
          ? // Preserve originalValues even on rejection so prestador can see what was changed
            {
              ...plan,
              status: "Rejeitado",
              comentarioGDC: userRole === "gestordecontrato" ? rejectionComment || undefined : plan.comentarioGDC,
              comentarioGO: userRole === "go" ? rejectionComment || undefined : plan.comentarioGO,
              originalValues: plan.originalValues, // Preserve originalValues on rejection
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
    console.log("[v0] handleEditPlan called for plan:", planToEdit.id, "Status:", planToEdit.status)

    setSelectedPlanForDetails(null)

    setEditingPlanId(planToEdit.id)
    // Set isEditingApprovedPlan based on whether the plan was previously Confirmed or Editado (GDC/GO)
    setIsEditingApprovedPlan(
      planToEdit.status === "Confirmado" ||
        planToEdit.status === "Editado - Pendente Aprovação" ||
        planToEdit.status === "Editado - Pendente Aprovação GDC",
    )

    if (
      !planToEdit.originalValues &&
      (userRole === "gestordecontrato" || userRole === "go") &&
      (planToEdit.status === "Pendente Aprovação GDC" ||
        planToEdit.status === "Pendente Aprovação" ||
        planToEdit.status === "Confirmado")
    ) {
      console.log("[v0] Saving originalValues for first edit by GDC/GO")
      setSubmittedPlans((prev) =>
        prev.map((plan) =>
          plan.id === planToEdit.id
            ? {
                ...plan,
                originalValues: {
                  numero: plan.numero,
                  tipoTrabalho: plan.tipoTrabalho,
                  atividade: plan.atividade,
                  autoEstrada: plan.autoEstrada,
                  concessao: plan.concessao,
                  kmInicial: plan.kmInicial,
                  kmFinal: plan.kmFinal,
                  trabalhoFixo: plan.trabalhoFixo,
                  trabalhoMovel: plan.trabalhoMovel,
                  perigosTemporarios: plan.perigosTemporarios,
                  fiscalizacaoNome: plan.fiscalizacaoNome,
                  fiscalizacaoContato: plan.fiscalizacaoContato,
                  entidadeExecutanteNome: plan.entidadeExecutanteNome,
                  entidadeExecutanteContato: plan.entidadeExecutanteContato,
                  sinalizacaoNome: plan.sinalizacaoNome,
                  sinalizacaoContato: plan.sinalizacaoContato,
                  // Deep copy activities array
                  atividades: JSON.parse(JSON.stringify(plan.atividades)),
                },
              }
            : plan,
        ),
      )
    }

    setVegetalNumero(planToEdit.numero)
    setTipoTrabalho(planToEdit.tipoTrabalho || "")
    setAtividade(planToEdit.atividade || "")
    setAutoEstrada(planToEdit.autoEstrada || "")
    setConcessao(planToEdit.concessao || "")
    setKmInicial(planToEdit.kmInicial || "")
    setKmFinal(planToEdit.kmFinal || "")
    setTrabalhoFixo(planToEdit.trabalhoFixo || false)
    setTrabalhoMovel(planToEdit.trabalhoMovel || false)
    setPerigosTemporarios(planToEdit.perigosTemporarios || false)
    setIsUrgente(planToEdit.isUrgente || false)
    setAtividades(planToEdit.atividades)
    setFiscalizacaoNome(planToEdit.fiscalizacaoNome || "")
    setFiscalizacaoContato(planToEdit.fiscalizacaoContato || "")
    setEntidadeExecutanteNome(planToEdit.entidadeExecutanteNome || "")
    setEntidadeExecutanteContato(planToEdit.entidadeExecutanteContato || "")
    setSinalizacaoNome(planToEdit.sinalizacaoNome || "")
    setSinalizacaoContato(planToEdit.sinalizacaoContato || "")

    // Set the correct active tab based on the plan's status
    if (
      planToEdit.status.startsWith("Pendente Aprovação GDC") ||
      planToEdit.status.startsWith("Editado - Pendente Aprovação GDC")
    ) {
      setActiveTab("aprovacao-gdc")
      console.log("[v0] Switched to tab: aprovacao-gdc for editing")
    } else if (
      planToEdit.status.startsWith("Pendente Aprovação") ||
      planToEdit.status.startsWith("Editado - Pendente Aprovação")
    ) {
      setActiveTab("aprovacao")
      console.log("[v0] Switched to tab: aprovacao for editing")
    } else {
      // Fallback to the plan's tipoTrabalho if available, otherwise default to 'vegetal'
      const tabBasedOnTipoTrabalho = planToEdit.tipoTrabalho?.toLowerCase() || "vegetal"
      setActiveTab(tabBasedOnTipoTrabalho)
      console.log("[v0] Switched to tab:", tabBasedOnTipoTrabalho, "for editing")
    }

    setEditDialogOpen(true)
  }

  const datesToRender = getDatesInRange(dateRange?.from, dateRange?.to)

  const disableBlockedDates = (date: Date) => {
    return isBefore(startOfDay(date), startOfDay(new Date()))
  }

  const handleViewWeeklyPlans = (weekId: string) => {
    const [yearStr, , weekNumStr] = weekId.split("-")
    const year = Number.parseInt(yearStr)
    const weekNum = Number.parseInt(weekNumStr)

    const startDate = startOfWeek(new Date(year, 0, (weekNum - 1) * 7 + 1), {
      locale: ptBR,
      weekStartsOn: 1,
    })
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    const plansForWeek = submittedPlans.filter((plan) => {
      // Only consider plans that are confirmed or approved
      if (plan.status !== "Confirmado" && plan.status !== "Aprovado") return false

      // Check if any activity falls within the selected week
      return plan.atividades.some((atividade) => {
        const dayDataMap = atividade.dayDataMap || {}
        return Object.keys(dayDataMap).some((dateStr) => {
          const planDate = parseISO(dateStr)
          return planDate >= startDate && planDate <= endDate
        })
      })
    })

    console.log("[v0] CCO - Week clicked:", weekId)
    console.log("[v0] CCO - Plans found:", plansForWeek.length)
    console.log(
      "[v0] CCO - Plan statuses:",
      plansForWeek.map((p) => p.status),
    )

    setCurrentWeekPlans({
      week: weekNum.toString(),
      startDate: format(startDate, "dd/MM", { locale: ptBR }),
      endDate: format(endDate, "dd/MM/yyyy", { locale: ptBR }),
      plans: plansForWeek,
    })
    // setIsWeeklyPlansDialogOpen(false) // Removed this line as the dialog is no longer used
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

  const getStatusDisplayText = (status: string) => {
    if (status === "Confirmado") return "Aprovado"
    if (status === "Pendente Aprovação GDC") return "Pendente Aprovação (GDC)"
    if (status === "Editado - Pendente Aprovação GDC") return "Editado (GDC)"
    if (status === "Pendente Aprovação") return "Pendente Aprovação (GO)"
    if (status === "Editado - Pendente Aprovação") return "Editado (GO)"
    return status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmado":
      case "Aprovado": // Handle both for consistency
        return "bg-green-100 border-green-300 text-green-800"
      case "Pendente Aprovação GDC":
      case "Editado - Pendente Aprovação GDC":
        return "bg-blue-100 border-blue-300 text-blue-800"
      case "Pendente Aprovação":
      case "Editado - Pendente Aprovação":
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

  const openRemovalDialog = (planId: string, planTitle: string) => {
    setRemovalDialog({
      open: true,
      planId,
      planTitle,
    })
    setRemovalReason("")
  }

  const confirmRemovalApproval = () => {
    setSubmittedPlans((prev) =>
      prev.map((plan) =>
        plan.id === removalDialog.planId
          ? {
              ...plan,
              status: "Pendente Aprovação", // Reset status to Pendente Aprovação (GO)
              comentarioGO: removalReason || undefined, // Store removal reason as GO comment
              originalValues: undefined, // Clear originalValues after removal
            }
          : plan,
      ),
    )
    setNotificationDialog({
      open: true,
      title: "Remoção de aprovação efetuada com sucesso",
      description:
        "A aprovação do plano de trabalho foi removida e o status foi alterado para Pendente Aprovação (GO).",
    })
    setRemovalDialog({ open: false, planId: "", planTitle: "" })
    setRemovalReason("")
  }

  const handleDateRangeChange = (range: DayPickerDateRange | undefined) => {
    // If range is undefined or has no from date, clear the selection
    if (!range || !range.from) {
      setDateRange(undefined)
      return
    }

    // If only from date is set (single click), set it
    if (!range.to) {
      setDateRange(range)
      return
    }

    // Validate that from and to are in the correct order
    if (range.from && range.to && range.from > range.to) {
      // Swap if they're in wrong order
      setDateRange({ from: range.to, to: range.from })
      return
    }

    // and normalize them to start of day to prevent time-based comparison issues
    const normalizedFrom = range.from ? startOfDay(range.from) : undefined
    const normalizedTo = range.to ? startOfDay(range.to) : undefined

    // Set the valid range with normalized dates
    setDateRange({
      from: normalizedFrom,
      to: normalizedTo,
    })
  }

  const handleViewPlanDetails = (plan: SubmittedPlan) => {
    console.log("[v0] handleViewPlanDetails called for plan:", plan.id)
    setSelectedPlanForDetails(plan)
    // setIsWeeklyPlansDialogOpen(false) // Removed this line as the dialog is no longer used
  }

  const handleToggleISistemaStatus = (planId: string) => {
    console.log("[v0] handleMarkAsInserted called for plan:", planId)
    // Update the isInISistema status for the specific plan
    setSubmittedPlans((prev) => prev.map((plan) => (plan.id === planId ? { ...plan, isInISistema: true } : plan)))
    // Update the currentWeekPlans state as well to reflect the change immediately in the dialog
    setCurrentWeekPlans((prev) => ({
      ...prev,
      plans: prev.plans.map((plan) => (plan.id === planId ? { ...plan, isInISistema: true } : plan)),
    }))
    toast({ title: "Sucesso", description: "Plano marcado como inserido em iSistema." })
  }

  // Helper function to get the current editing plan
  const getEditingPlan = (): SubmittedPlan | undefined => {
    return editingPlanId ? submittedPlans.find((plan) => plan.id === editingPlanId) : undefined
  }

  // Helper function to open confirmation dialog
  const openConfirmationDialog = (type: "approve" | "reject", planId: string, planTitle: string) => {
    setConfirmationDialog({ open: true, type, planId, planTitle })
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Wrench className="w-6 h-4 text-white" />
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
              <CardTitle className="flex items-center space-x-2">
                <Leaf className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-lg">
                  {autoEstrada || vegetalNumero || tipoTrabalho || atividade
                    ? `${autoEstrada || "..."} - ${vegetalNumero || "..."} - ${tipoTrabalho || "..."}${atividade ? `/${atividade}` : ""}`
                    : "Novo Plano de Trabalho"}
                </span>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Label htmlFor="urgente-checkbox" className="text-sm font-medium">
                  Urgente?
                </Label>
                <Checkbox id="urgente-checkbox" checked={isUrgente} onCheckedChange={setIsUrgente} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="my-1.5" htmlFor="concessao">
                    Concessão
                  </Label>
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
                    concessao={concessao}
                    disabled={!concessao}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="max-w-[120px]">
                    <Label className="my-1.5" htmlFor="km-inicial">
                      Km inicial
                    </Label>
                    <Input
                      id="km-inicial"
                      type="number"
                      placeholder="Ex: 100"
                      value={kmInicial}
                      onChange={(e) => setKmInicial(e.target.value)}
                      disabled={!autoEstrada}
                    />
                  </div>
                  <div className="max-w-[120px]">
                    <Label className="my-1.5" htmlFor="km-final">
                      Km final
                    </Label>
                    <Input
                      id="km-final"
                      type="number"
                      placeholder="Ex: 150"
                      value={kmFinal}
                      onChange={(e) => setKmFinal(e.target.value)}
                      disabled={!kmInicial}
                    />
                  </div>
                </div>

                {editingPlanId && getEditingPlan()?.comentarioGO && (
                  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <Label className="text-sm font-semibold text-red-800 mb-2 block">
                      Comentário do Gestor de Operações:
                    </Label>
                    <p className="text-sm text-red-700">{getEditingPlan()?.comentarioGO}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="my-1.5" htmlFor="sublanco">
                      Sublanço
                    </Label>
                    <Input
                      id="sublanco"
                      placeholder="Ex: MV-001"
                      value={vegetalNumero}
                      readOnly
                      className="max-w-md bg-muted cursor-not-allowed"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <Label className="my-1.5" htmlFor="tipo-de-trabalho">
                        Tipo de Trabalho
                      </Label>
                      <Select value={tipoTrabalho} onValueChange={setTipoTrabalho} disabled={!vegetalNumero}>
                        <SelectTrigger id="tipo-de-trabalho">
                          <SelectValue placeholder="Selecione o tipo de trabalho" />
                        </SelectTrigger>
                        <SelectContent>
                          {tipoTrabalhoOptions.length > 0 ? (
                            tipoTrabalhoOptions.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                {tipo}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>
                              Carregando...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="my-1.5" htmlFor="atividade">
                        Atividade
                      </Label>
                      <Select value={atividade} onValueChange={setAtividade} disabled={!tipoTrabalho}>
                        <SelectTrigger id="atividade">
                          <SelectValue placeholder="Selecione a atividade" />
                        </SelectTrigger>
                        <SelectContent>
                          {atividadeOptions.length > 0 ? (
                            atividadeOptions.map((atv) => (
                              <SelectItem key={atv} value={atv}>
                                {atv}
                              </SelectItem>
                            ))
                          ) : tipoTrabalho ? (
                            <SelectItem value="none" disabled>
                              Nenhuma atividade disponível
                            </SelectItem>
                          ) : (
                            <SelectItem value="select-tipo" disabled>
                              Selecione o tipo de trabalho primeiro
                            </SelectItem>
                          )}
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
                                  Atividade {index + 1}: {atividade.descricao.substring(0, 50)}
                                  {atividade.descricao.length > 50 && "..."}
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
                                    <p className="text-foreground">{atividade.descricao}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Período:</Label>
                                    <p className="text-foreground">
                                      {atividade.periodo.from && atividade.periodo.to
                                        ? `${format(atividade.periodo.from, "dd/MM/yyyy", { locale: ptBR })}-${format(atividade.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
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
                                      <p className="text-foreground">{atividade.restricoes.join(", ")}</p>
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
                      rows={1}
                      className="max-w-md my-1"
                    />
                  </div>

                  <div>
                    <Label className="my-1.5">Período</Label>
                    <Calendar
                      key={dateRange?.from?.toISOString() || "no-selection"} // Force re-render on selection change
                      initialFocus
                      mode="single"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onDayClick={handleDayClick} // Use custom handler
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

                          const isLastDay = dateRange.to && format(dateRange.to, "yyyy-MM-dd") === dateStr

                          return (
                            <div
                              key={dateStr}
                              className="flex-shrink-0 border rounded-xl p-3 shadow-sm bg-white min-w-[300px] lg:min-w-[350px]"
                            >
                              {/* Date header */}
                              <div className="mb-3 pb-2 border-b flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-foreground">
                                    {format(date, "dd/MM/yyyy", { locale: ptBR })}
                                  </h4>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {format(date, "EEEE", { locale: ptBR })}
                                  </p>
                                </div>
                                {!isLastDay && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToNextDay(dateStr)}
                                    className="flex items-center gap-1 text-xs h-8"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copiar para dia seguinte
                                  </Button>
                                )}
                              </div>

                              {/* Time fields - horizontal layout */}
                              <div className="flex flex-row gap-2 mb-3">
                                <div className="flex-1">
                                  <Label htmlFor={`hora-inicio-${dateStr}`} className="text-xs my-1">
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
                                  <Label htmlFor={`hora-fim-${dateStr}`} className="text-xs my-1">
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
                                      <Label className="text-xs my-1">Pk inicial</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="Km"
                                          value={dayData.pkInicialKm}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, "")
                                            updateDayData(dateStr, "pkInicialKm", value)
                                            reEnableTrabalhosFix(dateStr)
                                            if (value) {
                                              setTimeout(() => {
                                                updateSublancoForDay(dateStr)
                                                const updatedDayData = { ...dayDataMap[dateStr], pkInicialKm: value }
                                                validatePKDistance(dateStr, updatedDayData)
                                              }, 100)
                                            }
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
                                              reEnableTrabalhosFix(dateStr)
                                              if (value) {
                                                setTimeout(() => {
                                                  const updatedDayData = {
                                                    ...dayDataMap[dateStr],
                                                    pkInicialMeters: value,
                                                  }
                                                  validatePKDistance(dateStr, updatedDayData)
                                                }, 100)
                                              }
                                            }
                                          }}
                                          className="text-sm w-16"
                                          maxLength={3}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs my-1">Pk final</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="Km"
                                          value={dayData.pkFinalKm}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, "")
                                            updateDayData(dateStr, "pkFinalKm", value)
                                            reEnableTrabalhosFix(dateStr)
                                            if (value) {
                                              setTimeout(() => {
                                                updateSublancoForDay(dateStr)
                                                const updatedDayData = { ...dayDataMap[dateStr], pkFinalKm: value }
                                                validatePKDistance(dateStr, updatedDayData)
                                              }, 100)
                                            }
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
                                              reEnableTrabalhosFix(dateStr)
                                              if (value) {
                                                setTimeout(() => {
                                                  const updatedDayData = {
                                                    ...dayDataMap[dateStr],
                                                    pkFinalMeters: value,
                                                  }
                                                  validatePKDistance(dateStr, updatedDayData)
                                                }, 100)
                                              }
                                            }
                                          }}
                                          className="text-sm w-16"
                                          maxLength={3}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-xs my-1">Perfil</Label>
                                    <Select
                                      value={dayData.perfil}
                                      onValueChange={(value) => {
                                        updateDayData(dateStr, "perfil", value)
                                        updateRestricoesOptionsForDay(dateStr, value)
                                        // Clear selected restrictions when perfil changes
                                        updateDayData(dateStr, "restricoes", [])
                                      }}
                                    >
                                      <SelectTrigger id={`perfil-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {perfilOptions.length > 0 ? (
                                          perfilOptions.map((perfil) => (
                                            <SelectItem key={perfil} value={perfil}>
                                              {perfil}
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <SelectItem value="loading" disabled>
                                            Carregando...
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-xs mb-2 block">Restrições</Label>
                                    {restricoesOptionsByDay[dateStr] && restricoesOptionsByDay[dateStr].length > 0 ? (
                                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                        {restricoesOptionsByDay[dateStr].map((restricao) => (
                                          <div key={restricao} className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`restricao-${dateStr}-${restricao}`}
                                              checked={dayData.restricoes.includes(restricao)}
                                              onCheckedChange={(checked) => {
                                                const currentRestricoes = dayData.restricoes || []
                                                const newRestricoes = checked
                                                  ? [...currentRestricoes, restricao]
                                                  : currentRestricoes.filter((r) => r !== restricao)
                                                updateDayData(dateStr, "restricoes", newRestricoes)
                                              }}
                                            />
                                            <Label
                                              htmlFor={`restricao-${dateStr}-${restricao}`}
                                              className="text-xs cursor-pointer"
                                            >
                                              {restricao}
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        {dayData.perfil
                                          ? "Nenhuma restrição disponível"
                                          : "Selecione um perfil primeiro"}
                                      </p>
                                    )}
                                  </div>

                                  <div>
                                    <Label className="text-xs my-1">Sentido</Label>
                                    <Select
                                      value={dayData.sentido}
                                      onValueChange={(value) => {
                                        updateDayData(dateStr, "sentido", value)
                                      }}
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
                                    <Label htmlFor={`tipo-trabalho-day-${dateStr}`} className="text-xs my-1">
                                      Tipo de trabalho
                                    </Label>
                                    <Select
                                      value={dayData.tipoTrabalhoDay}
                                      onValueChange={(value) => {
                                        updateDayData(dateStr, "tipoTrabalhoDay", value)
                                        updateEsquemaOptionsForDay(dateStr, value)
                                        setTimeout(() => {
                                          const updatedDayData = { ...dayDataMap[dateStr], tipoTrabalhoDay: value }
                                          validatePKDistance(dateStr, updatedDayData)

                                          // If user selected Trabalhos Fixos, validate all other days too
                                          if (value === "Trabalhos Fixos") {
                                            setTimeout(() => {
                                              validateAllDaysWithTrabalhosFix()
                                            }, 200)
                                          }
                                        }, 100)
                                      }}
                                    >
                                      <SelectTrigger id={`tipo-trabalho-day-${dateStr}`} className="text-sm">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {tipoTrabalhoPerDayOptions.length > 0 ? (
                                          tipoTrabalhoPerDayOptions
                                            .filter((tipo) => !disabledTipoTrabalhoByDay[dateStr]?.includes(tipo))
                                            .map((tipo) => (
                                              <SelectItem key={tipo} value={tipo}>
                                                {tipo}
                                              </SelectItem>
                                            ))
                                        ) : (
                                          <SelectItem value="loading" disabled>
                                            Carregando...
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label htmlFor={`local-intervencao-${dateStr}`} className="text-xs my-1">
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
                                    <Label htmlFor={`esquema-${dateStr}`} className="text-xs my-1">
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
                                        {esquemaOptionsByDay[dateStr] && esquemaOptionsByDay[dateStr].length > 0 ? (
                                          esquemaOptionsByDay[dateStr].map((esquema) => (
                                            <SelectItem key={esquema} value={esquema}>
                                              {esquema}
                                            </SelectItem>
                                          ))
                                        ) : dayData.tipoTrabalhoDay ? (
                                          <SelectItem value="none" disabled>
                                            Nenhum esquema disponível
                                          </SelectItem>
                                        ) : (
                                          <SelectItem value="select-tipo" disabled>
                                            Selecione o tipo de trabalho primeiro
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label htmlFor={`observacoes-${dateStr}`} className="text-xs my-1">
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
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleAdicionarAtividade}>
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
                      <Label className="my-1.5" htmlFor="fiscalizacao-nome">
                        Nome
                      </Label>
                      <Input
                        className="px-3.5"
                        id="fiscalizacao-nome"
                        type="text"
                        placeholder="Nome do responsável"
                        value={fiscalizacaoNome}
                        onChange={(e) => setFiscalizacaoNome(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="my-1.5" htmlFor="fiscalizacao-contato">
                        Contato
                      </Label>
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
                      <Label className="my-1.5" htmlFor="entidade-nome">
                        Nome
                      </Label>
                      <Input
                        id="entidade-nome"
                        type="text"
                        placeholder="Nome do responsável"
                        value={entidadeExecutanteNome}
                        onChange={(e) => setEntidadeExecutanteNome(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="my-1.5" htmlFor="entidade-contato">
                        Contato
                      </Label>
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
                      <Label className="my-1.5" htmlFor="sinalizacao-nome">
                        Nome
                      </Label>
                      <Input
                        id="sinalizacao-nome"
                        type="text"
                        placeholder="Nome do responsável"
                        value={sinalizacaoNome}
                        onChange={(e) => setSinalizacaoNome(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="my-1.5" htmlFor="sinalizacao-contato">
                        Contato
                      </Label>
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
                <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleSubmitPlano}>
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

        {userRole === "gestordecontrato" && (
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="aprovacao-gdc" className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4" />
                <span>Aprovação de Planos (GDC)</span>
              </TabsTrigger>
              <TabsTrigger value="todos-planos-gdc" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Todos os Agendamentos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="aprovacao-gdc" className="space-y-6">
              {/* CHANGE: Added edit form when editingPlanId is set */}
              {editingPlanId ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Editar Plano de Trabalho</CardTitle>
                    <CardDescription>
                      Faça as alterações necessárias ao plano. As alterações serão visíveis para o prestador.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Form fields matching the submission form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-vegetal-numero">Número *</Label>
                        <Input
                          id="edit-vegetal-numero"
                          value={vegetalNumero}
                          onChange={(e) => setVegetalNumero(e.target.value)}
                          placeholder="Ex: 2024-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-tipo-trabalho">Tipo de Trabalho *</Label>
                        <Select value={tipoTrabalho} onValueChange={setTipoTrabalho}>
                          <SelectTrigger id="edit-tipo-trabalho">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Revestimento Vegetal">Revestimento Vegetal</SelectItem>
                            <SelectItem value="Obras de Arte">Obras de Arte</SelectItem>
                            <SelectItem value="Pavimento">Pavimento</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-atividade">Atividade/Descrição *</Label>
                      <Textarea
                        id="edit-atividade"
                        value={atividade}
                        onChange={(e) => setAtividade(e.target.value)}
                        placeholder="Descreva a atividade..."
                        rows={3}
                      />
                    </div>

                    <AutoEstradasSelect
                      concessao={concessao}
                      autoEstrada={autoEstrada}
                      onConcessaoChange={setConcessao}
                      onAutoEstradaChange={setAutoEstrada}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-km-inicial">Pk Inicial *</Label>
                        <Input
                          id="edit-km-inicial"
                          value={kmInicial}
                          onChange={(e) => setKmInicial(e.target.value)}
                          placeholder="Ex: 1 Km + 500 m"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-km-final">Pk Final *</Label>
                        <Input
                          id="edit-km-final"
                          value={kmFinal}
                          onChange={(e) => setKmFinal(e.target.value)}
                          placeholder="Ex: 2 Km + 300 m"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Características do Trabalho</Label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-trabalho-fixo"
                            checked={trabalhoFixo}
                            onCheckedChange={(checked) => setTrabalhoFixo(checked === true)}
                          />
                          <label htmlFor="edit-trabalho-fixo" className="text-sm cursor-pointer">
                            Trabalho Fixo
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-trabalho-movel"
                            checked={trabalhoMovel}
                            onCheckedChange={(checked) => setTrabalhoMovel(checked === true)}
                          />
                          <label htmlFor="edit-trabalho-movel" className="text-sm cursor-pointer">
                            Trabalho Móvel
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-perigos-temporarios"
                            checked={perigosTemporarios}
                            onCheckedChange={(checked) => setPerigosTemporarios(checked === true)}
                          />
                          <label htmlFor="edit-perigos-temporarios" className="text-sm cursor-pointer">
                            Perigos Temporários
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-is-urgente"
                            checked={isUrgente}
                            onCheckedChange={(checked) => setIsUrgente(checked === true)}
                          />
                          <label htmlFor="edit-is-urgente" className="text-sm cursor-pointer">
                            Intervenção Urgente
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Entidades section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Entidades Envolvidas</h3>

                      <div className="space-y-3">
                        <Label>Fiscalização</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="Nome"
                            value={fiscalizacaoNome}
                            onChange={(e) => setFiscalizacaoNome(e.target.value)}
                          />
                          <Input
                            placeholder="Contacto"
                            value={fiscalizacaoContato}
                            onChange={(e) => setFiscalizacaoContato(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Entidade Executante</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="Nome"
                            value={entidadeExecutanteNome}
                            onChange={(e) => setEntidadeExecutanteNome(e.target.value)}
                          />
                          <Input
                            placeholder="Contacto"
                            value={entidadeExecutanteContato}
                            onChange={(e) => setEntidadeExecutanteContato(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Sinalização</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="Nome"
                            value={sinalizacaoNome}
                            onChange={(e) => setSinalizacaoNome(e.target.value)}
                          />
                          <Input
                            placeholder="Contacto"
                            value={sinalizacaoContato}
                            onChange={(e) => setSinalizacaoContato(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Activities list */}
                    <div className="space-y-4">
                      <Label>Atividades ({atividades.length})</Label>
                      {atividades.map((ativ) => (
                        <Card key={ativ.id}>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{ativ.descricao}</p>
                                <p className="text-sm text-muted-foreground">
                                  {/* CHANGE: Fixed locale variable name from pt to ptBR to match the import */}
                                  {format(ativ.periodo.from!, "dd/MM/yyyy", { locale: ptBR })}
                                  {ativ.periodo.to && ` - ${format(ativ.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingPlanId(null)
                        setIsEditingApprovedPlan(false)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitPlano}>Guardar Alterações</Button>
                  </CardFooter>
                </Card>
              ) : (
                <>
                  {/* Existing approval list */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Planos Pendentes de Aprovação GDC</CardTitle>
                      <CardDescription>
                        Revise e aprove ou rejeite os planos de trabalho antes de enviá-los ao GO.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {submittedPlans.filter(
                        (plan) =>
                          plan.status === "Pendente Aprovação GDC" ||
                          plan.status === "Editado - Pendente Aprovação GDC",
                      ).length === 0 ? (
                        <p className="text-muted-foreground">Nenhum plano pendente de aprovação GDC.</p>
                      ) : (
                        submittedPlans
                          .filter(
                            (plan) =>
                              plan.status === "Pendente Aprovação GDC" ||
                              plan.status === "Editado - Pendente Aprovação GDC",
                          )
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
                                <div className="flex gap-2">
                                  <Badge variant="outline">{plan.status}</Badge>
                                  {plan.isUrgente && (
                                    <Badge className="bg-red-500 hover:bg-red-600 text-white">Urgente</Badge>
                                  )}
                                </div>

                                <Dialog
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setSelectedPlanForDetails(null)
                                      setConfirmationDialog({ open: false, type: "approve", planId: "", planTitle: "" })
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button variant="link" size="sm" onClick={() => setSelectedPlanForDetails(plan)}>
                                      Ver Detalhes
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                    {selectedPlanForDetails && (
                                      <DialogContentWithChangedValues plan={selectedPlanForDetails} />
                                    )}
                                  </DialogContent>
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
                </>
              )}
            </TabsContent>

            <TabsContent value="todos-planos-gdc">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>Todos os Agendamentos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submittedPlans.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum plano submetido.</p>
                  ) : (
                    submittedPlans.map((plan) => (
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
                          <div className="flex gap-2">
                            <Badge variant="outline">{plan.status}</Badge>
                            {plan.isUrgente && (
                              <Badge className="bg-red-500 hover:bg-red-600 text-white">Urgente</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
                  <CardDescription>
                    Revise e aprove ou rejeite os planos de trabalho aprovados pelo GDC.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submittedPlans.filter(
                    (plan) => plan.status === "Pendente Aprovação" || plan.status === "Editado - Pendente Aprovação",
                  ).length === 0 ? (
                    <p className="text-muted-foreground">Nenhum plano pendente de aprovação.</p>
                  ) : (
                    submittedPlans
                      .filter(
                        (plan) =>
                          plan.status === "Pendente Aprovação" || plan.status === "Editado - Pendente Aprovação",
                      )
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
                            <div className="flex gap-2">
                              <Badge variant="outline">{plan.status}</Badge>
                              {plan.isUrgente && (
                                <Badge className="bg-red-500 hover:bg-red-600 text-white">Urgente</Badge>
                              )}
                            </div>

                            <Dialog
                              onOpenChange={(open) => {
                                if (!open) {
                                  setSelectedPlanForDetails(null)
                                  setConfirmationDialog({ open: false, type: "approve", planId: "", planTitle: "" })
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="link" size="sm" onClick={() => setSelectedPlanForDetails(plan)}>
                                  Ver Detalhes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                {selectedPlanForDetails && (
                                  <DialogContentWithChangedValues plan={selectedPlanForDetails} />
                                )}
                              </DialogContent>
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
                            {plan.status === "Confirmado" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openRemovalDialog(
                                    plan.id,
                                    `${plan.autoEstrada || "..."} - ${plan.numero || "..."} - ${plan.tipoTrabalho || "..."}`,
                                  )
                                }
                                className="flex items-center gap-1 text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                              >
                                Remover Aprovação
                              </Button>
                            )}
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
                          <SelectItem value="Pendente Aprovação">Pendente Aprovação</SelectItem>
                          <SelectItem value="Editado - Pendente Aprovação">Editado - Pendente Aprovação</SelectItem>
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
                      <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {eachDayOfInterval({
                      start: startOfWeek(startOfMonth(currentCalendarMonth), { locale: ptBR }),
                      end: endOfWeek(endOfMonth(currentCalendarMonth), { locale: ptBR }),
                    }).map((day, index) => {
                      const plansForDay = getPlansForDate(day).filter((plan) => {
                        if (calendarFilterPeriod === "all") return true
                        return plan.status === calendarFilterPeriod
                      })
                      const isCurrentMonth = isSameMonth(day, currentCalendarMonth)

                      return (
                        <div
                          key={index}
                          className={`min-h-[120px] border rounded-lg p-2 ${isCurrentMonth ? "bg-card" : "bg-muted"}`}
                        >
                          <div
                            className={`text-sm font-medium mb-2 ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {plansForDay.slice(0, 2).map((plan) => (
                              <Dialog
                                key={plan.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setSelectedPlanForDetails(null)
                                    setConfirmationDialog({ open: false, type: "approve", planId: "", planTitle: "" })
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <div
                                    className={`text-xs p-2 rounded border cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(plan.status)}`}
                                    onClick={() => setSelectedPlanForDetails(plan)}
                                  >
                                    <div className="font-semibold truncate">
                                      {plan.autoEstrada || "..."} - {plan.numero || "..."}
                                    </div>
                                    <div className="text-xs truncate">{plan.tipoTrabalho || "..."}</div>
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                  {selectedPlanForDetails && (
                                    <DialogContentWithChangedValues plan={selectedPlanForDetails} />
                                  )}
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
                      <span className="text-sm text-muted-foreground">Pendente Aprovação</span>
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

        {userRole === "cco" && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Planos de Trabalho Aprovados por Semana</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">Clique numa semana para ver os planos aprovados</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.keys(weeklyPlanCounts).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 col-span-full">
                      Nenhum plano aprovado encontrado.
                    </p>
                  ) : (
                    Object.entries(weeklyPlanCounts)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([weekId, count]) => {
                        const [yearStr, , weekNumStr] = weekId.split("-")
                        const year = Number.parseInt(yearStr)
                        const weekNum = Number.parseInt(weekNumStr)
                        const startDate = startOfWeek(new Date(year, 0, (weekNum - 1) * 7 + 1), {
                          locale: ptBR,
                          weekStartsOn: 1,
                        })
                        const endDate = new Date(startDate)
                        endDate.setDate(startDate.getDate() + 6)

                        return (
                          <Card
                            key={weekId}
                            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                            onClick={() => handleViewWeeklyPlans(weekId)}
                          >
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center justify-between">
                                <span>Semana {weekNum}</span>
                                <Badge variant="secondary" className="text-lg font-bold">
                                  {count}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-muted-foreground">
                                <CalendarDays className="w-4 h-4 inline mr-1" />
                                {format(startDate, "dd/MM", { locale: ptBR })} -{" "}
                                {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {count} {count === 1 ? "plano aprovado" : "planos aprovados"}
                              </p>
                            </CardContent>
                          </Card>
                        )
                      })
                  )}
                </div>
              </CardContent>
            </Card>

            {currentWeekPlans.plans.length > 0 && (
              <Card className="border-2 border-primary shadow-lg">
                <CardHeader className="bg-primary/5 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold">Planos da Semana {currentWeekPlans.week}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        Período: {currentWeekPlans.startDate} - {currentWeekPlans.endDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-base px-4 py-1">
                        {currentWeekPlans.plans.length} {currentWeekPlans.plans.length === 1 ? "plano" : "planos"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentWeekPlans({ week: "", startDate: "", endDate: "", plans: [] })}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Planos aprovados para esta semana. Clique em &quot;Ver Detalhes&quot; para ver informações completas
                    ou marque como &quot;Inserido em iSistema&quot; quando concluído.
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex gap-6 overflow-x-auto pb-4">
                    {currentWeekPlans.plans.map((plan) => {
                      const firstActivity = plan.atividades?.[0]

                      const sublanco = firstActivity?.sublanco || ""

                      const autoEstrada = plan.autoEstrada || "A1"
                      const tipoTrabalho = firstActivity?.tipoTrabalho || plan.tipoTrabalho || "N/A"

                      const planTitle = `${autoEstrada} - ${sublanco || "N/A"} - ${tipoTrabalho}`

                      return (
                        <Card
                          key={plan.id}
                          className="p-6 hover:shadow-lg transition-shadow border-2 min-w-[400px] flex-shrink-0"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-semibold text-lg">{planTitle}</h3>
                                <Badge className="bg-green-600 hover:bg-green-700 text-white">Aprovado</Badge>
                              </div>
                              <div className="grid gap-2 text-sm text-muted-foreground">
                                <p>
                                  <strong>Prestador:</strong> {plan.prestador}
                                </p>
                                <p>
                                  <strong>Submetido em:</strong>{" "}
                                  {plan.submittedAt
                                    ? format(new Date(plan.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                    : "N/A"}
                                </p>
                                <p>
                                  <strong>Autoestrada:</strong> {autoEstrada}
                                </p>
                                <p>
                                  <strong>Tipo de Trabalho:</strong> {tipoTrabalho}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-6 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => handleViewPlanDetails(plan)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                            <Button
                              variant="default"
                              size="default"
                              onClick={() => {
                                handleToggleISistemaStatus(plan.id)
                              }}
                              disabled={plan.isInISistema}
                              className={`flex-1 ${plan.isInISistema ? "bg-green-600 hover:bg-green-700" : "bg-black hover:bg-gray-800"}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {plan.isInISistema ? "Já Inserido" : "Inserido em iSistema"}
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
              {userRole === "prestador" && editNotifications.length > 0 && (
                <div className="mb-6 space-y-2">
                  {editNotifications.map((notification, index) => (
                    <Alert key={index} className="border-blue-300 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-900">Plano Editado</AlertTitle>
                      <AlertDescription className="text-blue-800">
                        O plano "{notification.planTitle}" foi editado por{" "}
                        {notification.editedBy.includes("gestordecontrato")
                          ? "Gestor de Contrato"
                          : "Gestor de Operações"}
                        .
                        <Button
                          variant="link"
                          size="sm"
                          className="ml-2 h-auto p-0 text-blue-600 underline"
                          onClick={() => {
                            const plan = submittedPlans.find((p) => p.id === notification.planId)
                            if (plan) {
                              setSelectedPlanForDetails(plan)
                              // Remove this notification after viewing
                              setEditNotifications((prev) => prev.filter((n) => n.planId !== notification.planId))
                            }
                          }}
                        >
                          Ver diferenças
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {submittedPlans.length === 0 ? (
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
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {plan.autoEstrada || "..."} - {plan.numero || "..."} - {plan.tipoTrabalho || "..."}
                          </h4>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              {plan.atividades.length} atividade{plan.atividades.length !== 1 && "s"}
                            </p>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-sm text-blue-600 underline"
                              onClick={() => setSelectedPlanForDetails(plan)}
                            >
                              Ver Detalhes
                            </Button>
                          </div>
                          {plan.status === "Rejeitado" && plan.comentarioGO && (
                            <div className="mt-2 p-3 rounded-lg border-2 bg-destructive/10 border-destructive/20">
                              <p className="text-sm font-semibold text-red-800 mb-1">Motivo da Rejeição (GO):</p>
                              <p className="text-sm text-red-700">{plan.comentarioGO}</p>
                            </div>
                          )}
                          {plan.status === "Rejeitado" && plan.comentarioGDC && (
                            <div className="mt-2 p-3 rounded-lg border-2 bg-orange-100 border-orange-300">
                              <p className="text-sm font-semibold text-orange-800 mb-1">Motivo da Rejeição (GDC):</p>
                              <p className="text-sm text-orange-700">{plan.comentarioGDC}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(plan.status === "Pendente Aprovação" ||
                          plan.status === "Editado - Pendente Aprovação" ||
                          plan.status === "Pendente Aprovação GDC" ||
                          plan.status === "Editado - Pendente Aprovação GDC" ||
                          plan.status === "Confirmado") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPlan(plan)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </Button>
                        )}
                        {plan.status === "Confirmado" && userRole === "go" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openRemovalDialog(
                                plan.id,
                                `${plan.autoEstrada || "..."} - ${plan.numero || "..."} - ${plan.tipoTrabalho || "..."}`,
                              )
                            }
                            className="flex items-center gap-1 text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                          >
                            Remover Aprovação
                          </Button>
                        )}
                        <Badge
                          variant={
                            plan.status === "Pendente Aprovação" || plan.status === "Editado - Pendente Aprovação"
                              ? "outline"
                              : plan.status === "Confirmado"
                                ? "default"
                                : plan.status === "Rejeitado"
                                  ? "destructive"
                                  : "outline"
                          }
                          className={
                            plan.status === "Confirmado" || plan.status === "Aprovado"
                              ? "h-9 text-base font-semibold bg-green-600 hover:bg-green-600 px-4 flex items-center"
                              : plan.status === "Pendente Aprovação" || plan.status === "Editado - Pendente Aprovação"
                                ? "h-9 text-base font-semibold bg-yellow-600 text-white hover:bg-yellow-600 px-4 flex items-center"
                                : plan.status === "Pendente Aprovação GDC" ||
                                    plan.status === "Editado - Pendente Aprovação GDC"
                                  ? "h-9 text-base font-semibold bg-blue-600 text-white hover:bg-blue-600 px-4 flex items-center"
                                  : plan.status === "Rejeitado"
                                    ? "h-9 text-base font-semibold bg-red-600 text-white hover:bg-red-600 px-4 flex items-center"
                                    : "h-9 text-base font-semibold px-4 flex items-center"
                          }
                        >
                          {getStatusDisplayText(plan.status)}
                        </Badge>
                      </div>
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
        onOpenChange={() => setConfirmationDialog({ ...confirmationDialog, open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmationDialog.type === "approve" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
            </DialogTitle>
            <DialogDescription>
              {confirmationDialog.type === "approve"
                ? `Tem a certeza de que deseja ${userRole === "gestordecontrato" ? "aprovar (GDC)" : "aprovar"} o plano "${confirmationDialog.planTitle}"?`
                : `Tem a certeza de que deseja rejeitar o plano "${confirmationDialog.planTitle}"?`}
            </DialogDescription>
          </DialogHeader>
          {confirmationDialog.type === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-comment">Comentário (obrigatório)</Label>
              <Textarea
                id="rejection-comment"
                placeholder="Por favor, indique o motivo da rejeição..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmationDialog({ ...confirmationDialog, open: false })}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (confirmationDialog.type === "approve") {
                  if (userRole === "gestordecontrato") {
                    confirmGDCApproval()
                  } else {
                    confirmApproval()
                  }
                } else {
                  if (!rejectionComment.trim()) {
                    alert("Por favor, forneça um comentário para a rejeição.")
                    return
                  }
                  if (userRole === "gestordecontrato") {
                    confirmGDCRejection()
                  } else {
                    confirmRejection()
                  }
                }
              }}
              className={confirmationDialog.type === "approve" ? "bg-green-500 hover:bg-green-600" : ""}
              variant={confirmationDialog.type === "approve" ? "default" : "destructive"}
            >
              {confirmationDialog.type === "approve" ? "Aprovar" : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removalDialog.open} onOpenChange={(open) => setRemovalDialog({ ...removalDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Aprovação</DialogTitle>
            <DialogDescription>
              Quer remover a aprovação para o plano de trabalho "{removalDialog.planTitle}"?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="removal-reason" className="text-sm font-medium">
              Motivo (Comentário Interno):
            </Label>
            <Textarea
              id="removal-reason"
              placeholder="Descreva brevemente o motivo da remoção..."
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovalDialog({ open: false, planId: "", planTitle: "" })}>
              Cancelar
            </Button>
            <Button onClick={confirmRemovalApproval} className="bg-orange-500 hover:bg-orange-600">
              Remover Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pkValidationError.show} onOpenChange={(open) => !open && handlePkValidationErrorClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erro de Validação</AlertDialogTitle>
            <AlertDialogDescription>
              A restrição não pode ser superior a 3,5 kms.
              <br />
              <br />
              Distância atual: <strong>{pkValidationError.distance.toFixed(3)} km</strong>
              <br />
              <br />A opção "Trabalhos Fixos" será desabilitada para este dia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handlePkValidationErrorClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pkConflictDialog.open}
        onOpenChange={(open) => setPkConflictDialog({ ...pkConflictDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Conflito de Localização
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line text-left">
              {pkConflictDialog.conflictDetails}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPkConflictDialog({ open: false, conflictDetails: "" })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Plan Details Dialog - shared between GO and CCO */}
      <Dialog open={!!selectedPlanForDetails} onOpenChange={(open) => !open && setSelectedPlanForDetails(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          {selectedPlanForDetails && <DialogContentWithChangedValues plan={selectedPlanForDetails} />}
        </DialogContent>
      </Dialog>

      {/* Add edit dialog in the render section */}
      {editDialogOpen && editingPlanId && (
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditDialogOpen(false)
              setEditingPlanId(null)
              setIsEditingApprovedPlan(false)
            }
          }}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Plano de Trabalho</DialogTitle>
              <DialogDescription>
                Faça as alterações necessárias ao plano de trabalho. As alterações serão rastreadas.
              </DialogDescription>
            </DialogHeader>

            {/* Form fields identical to the creation form */}
            {/* This is a complete editing interface */}
            <div className="space-y-6 py-4">
              {/* Prestador Form Section - Copied from above */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-lg">
                      {autoEstrada || vegetalNumero || tipoTrabalho || atividade
                        ? `${autoEstrada || "..."} - ${vegetalNumero || "..."} - ${tipoTrabalho || "..."}${atividade ? `/${atividade}` : ""}`
                        : "Editar Plano de Trabalho"}
                    </span>
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Label htmlFor="urgente-checkbox" className="text-sm font-medium">
                      Urgente?
                    </Label>
                    <Checkbox id="urgente-checkbox" checked={isUrgente} onCheckedChange={setIsUrgente} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="my-1.5" htmlFor="concessao">
                        Concessão
                      </Label>
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
                        concessao={concessao}
                        disabled={!concessao}
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="max-w-[120px]">
                        <Label className="my-1.5" htmlFor="km-inicial">
                          Km inicial
                        </Label>
                        <Input
                          id="km-inicial"
                          type="number"
                          placeholder="Ex: 100"
                          value={kmInicial}
                          onChange={(e) => setKmInicial(e.target.value)}
                          disabled={!autoEstrada}
                        />
                      </div>
                      <div className="max-w-[120px]">
                        <Label className="my-1.5" htmlFor="km-final">
                          Km final
                        </Label>
                        <Input
                          id="km-final"
                          type="number"
                          placeholder="Ex: 150"
                          value={kmFinal}
                          onChange={(e) => setKmFinal(e.target.value)}
                          disabled={!kmInicial}
                        />
                      </div>
                    </div>

                    {editingPlanId && getEditingPlan()?.comentarioGO && (
                      <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                        <Label className="text-sm font-semibold text-red-800 mb-2 block">
                          Comentário do Gestor de Operações:
                        </Label>
                        <p className="text-sm text-red-700">{getEditingPlan()?.comentarioGO}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Label className="my-1.5" htmlFor="sublanco">
                          Sublanço
                        </Label>
                        <Input
                          id="sublanco"
                          placeholder="Ex: MV-001"
                          value={vegetalNumero}
                          readOnly
                          className="max-w-md bg-muted cursor-not-allowed"
                        />
                      </div>

                      <div className="flex gap-4">
                        <div>
                          <Label className="my-1.5" htmlFor="tipo-de-trabalho">
                            Tipo de Trabalho
                          </Label>
                          <Select value={tipoTrabalho} onValueChange={setTipoTrabalho} disabled={!vegetalNumero}>
                            <SelectTrigger id="tipo-de-trabalho">
                              <SelectValue placeholder="Selecione o tipo de trabalho" />
                            </SelectTrigger>
                            <SelectContent>
                              {tipoTrabalhoOptions.length > 0 ? (
                                tipoTrabalhoOptions.map((tipo) => (
                                  <SelectItem key={tipo} value={tipo}>
                                    {tipo}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="loading" disabled>
                                  Carregando...
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="my-1.5" htmlFor="atividade">
                            Atividade
                          </Label>
                          <Select value={atividade} onValueChange={setAtividade} disabled={!tipoTrabalho}>
                            <SelectTrigger id="atividade">
                              <SelectValue placeholder="Selecione a atividade" />
                            </SelectTrigger>
                            <SelectContent>
                              {atividadeOptions.length > 0 ? (
                                atividadeOptions.map((atv) => (
                                  <SelectItem key={atv} value={atv}>
                                    {atv}
                                  </SelectItem>
                                ))
                              ) : tipoTrabalho ? (
                                <SelectItem value="none" disabled>
                                  Nenhuma atividade disponível
                                </SelectItem>
                              ) : (
                                <SelectItem value="select-tipo" disabled>
                                  Selecione o tipo de trabalho primeiro
                                </SelectItem>
                              )}
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
                          <Label className="text-lg font-semibold">Atividades Adicionadas ({atividades.length})</Label>
                          <Accordion type="single" collapsible className="w-full">
                            {atividades.map((atividade, index) => (
                              <AccordionItem key={atividade.id} value={atividade.id}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex items-center justify-between w-full pr-4">
                                    <span className="font-medium">
                                      Atividade {index + 1}: {atividade.descricao.substring(0, 50)}
                                      {atividade.descricao.length > 50 && "..."}
                                    </span>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditarAtividade(atividade)}
                                      >
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
                                        <p className="text-foreground">{atividade.descricao}</p>
                                      </div>
                                      <div>
                                        <Label className="font-semibold">Período:</Label>
                                        <p className="text-foreground">
                                          {atividade.periodo.from && atividade.periodo.to
                                            ? `${format(atividade.periodo.from, "dd/MM/yyyy", { locale: ptBR })}-${format(atividade.periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
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
                                          <p className="text-foreground">{atividade.restricoes.join(", ")}</p>
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
                          rows={1}
                          className="max-w-md my-1"
                        />
                      </div>

                      <div>
                        <Label className="my-1.5">Período</Label>
                        <Calendar
                          key={dateRange?.from?.toISOString() || "no-selection"} // Force re-render on selection change
                          initialFocus
                          mode="single"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onDayClick={handleDayClick} // Use custom handler
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

                              const isLastDay = dateRange.to && format(dateRange.to, "yyyy-MM-dd") === dateStr

                              return (
                                <div
                                  key={dateStr}
                                  className="flex-shrink-0 border rounded-xl p-3 shadow-sm bg-white min-w-[300px] lg:min-w-[350px]"
                                >
                                  {/* Date header */}
                                  <div className="mb-3 pb-2 border-b flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold text-foreground">
                                        {format(date, "dd/MM/yyyy", { locale: ptBR })}
                                      </h4>
                                      <p className="text-xs text-muted-foreground capitalize">
                                        {format(date, "EEEE", { locale: ptBR })}
                                      </p>
                                    </div>
                                    {!isLastDay && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToNextDay(dateStr)}
                                        className="flex items-center gap-1 text-xs h-8"
                                      >
                                        <Copy className="h-3 w-3" />
                                        Copiar para dia seguinte
                                      </Button>
                                    )}
                                  </div>

                                  {/* Time fields - horizontal layout */}
                                  <div className="flex flex-row gap-2 mb-3">
                                    <div className="flex-1">
                                      <Label htmlFor={`hora-inicio-${dateStr}`} className="text-xs my-1">
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
                                      <Label htmlFor={`hora-fim-${dateStr}`} className="text-xs my-1">
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
                                          onCheckedChange={(checked) =>
                                            handleTodoDiaChange(dateStr, checked as boolean)
                                          }
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
                                          <Label className="text-xs my-1">Pk inicial</Label>
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              placeholder="Km"
                                              value={dayData.pkInicialKm}
                                              onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, "")
                                                updateDayData(dateStr, "pkInicialKm", value)
                                                reEnableTrabalhosFix(dateStr)
                                                if (value) {
                                                  setTimeout(() => {
                                                    updateSublancoForDay(dateStr)
                                                    const updatedDayData = {
                                                      ...dayDataMap[dateStr],
                                                      pkInicialKm: value,
                                                    }
                                                    validatePKDistance(dateStr, updatedDayData)
                                                  }, 100)
                                                }
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
                                                  reEnableTrabalhosFix(dateStr)
                                                  if (value) {
                                                    setTimeout(() => {
                                                      const updatedDayData = {
                                                        ...dayDataMap[dateStr],
                                                        pkInicialMeters: value,
                                                      }
                                                      validatePKDistance(dateStr, updatedDayData)
                                                    }, 100)
                                                  }
                                                }
                                              }}
                                              className="text-sm w-16"
                                              maxLength={3}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs my-1">Pk final</Label>
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              placeholder="Km"
                                              value={dayData.pkFinalKm}
                                              onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, "")
                                                updateDayData(dateStr, "pkFinalKm", value)
                                                reEnableTrabalhosFix(dateStr)
                                                if (value) {
                                                  setTimeout(() => {
                                                    updateSublancoForDay(dateStr)
                                                    const updatedDayData = { ...dayDataMap[dateStr], pkFinalKm: value }
                                                    validatePKDistance(dateStr, updatedDayData)
                                                  }, 100)
                                                }
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
                                                  reEnableTrabalhosFix(dateStr)
                                                  if (value) {
                                                    setTimeout(() => {
                                                      const updatedDayData = {
                                                        ...dayDataMap[dateStr],
                                                        pkFinalMeters: value,
                                                      }
                                                      validatePKDistance(dateStr, updatedDayData)
                                                    }, 100)
                                                  }
                                                }
                                              }}
                                              className="text-sm w-16"
                                              maxLength={3}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <Label className="text-xs my-1">Perfil</Label>
                                        <Select
                                          value={dayData.perfil}
                                          onValueChange={(value) => {
                                            updateDayData(dateStr, "perfil", value)
                                            updateRestricoesOptionsForDay(dateStr, value)
                                            // Clear selected restrictions when perfil changes
                                            updateDayData(dateStr, "restricoes", [])
                                          }}
                                        >
                                          <SelectTrigger id={`perfil-${dateStr}`} className="text-sm">
                                            <SelectValue placeholder="Selecione" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {perfilOptions.length > 0 ? (
                                              perfilOptions.map((perfil) => (
                                                <SelectItem key={perfil} value={perfil}>
                                                  {perfil}
                                                </SelectItem>
                                              ))
                                            ) : (
                                              <SelectItem value="loading" disabled>
                                                Carregando...
                                              </SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label className="text-xs mb-2 block">Restrições</Label>
                                        {restricoesOptionsByDay[dateStr] &&
                                        restricoesOptionsByDay[dateStr].length > 0 ? (
                                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                            {restricoesOptionsByDay[dateStr].map((restricao) => (
                                              <div key={restricao} className="flex items-center space-x-2">
                                                <Checkbox
                                                  id={`restricao-${dateStr}-${restricao}`}
                                                  checked={dayData.restricoes.includes(restricao)}
                                                  onCheckedChange={(checked) => {
                                                    const currentRestricoes = dayData.restricoes || []
                                                    const newRestricoes = checked
                                                      ? [...currentRestricoes, restricao]
                                                      : currentRestricoes.filter((r) => r !== restricao)
                                                    updateDayData(dateStr, "restricoes", newRestricoes)
                                                  }}
                                                />
                                                <Label
                                                  htmlFor={`restricao-${dateStr}-${restricao}`}
                                                  className="text-xs cursor-pointer"
                                                >
                                                  {restricao}
                                                </Label>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground italic">
                                            {dayData.perfil
                                              ? "Nenhuma restrição disponível"
                                              : "Selecione um perfil primeiro"}
                                          </p>
                                        )}
                                      </div>

                                      <div>
                                        <Label className="text-xs my-1">Sentido</Label>
                                        <Select
                                          value={dayData.sentido}
                                          onValueChange={(value) => {
                                            updateDayData(dateStr, "sentido", value)
                                          }}
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
                                        <Label htmlFor={`tipo-trabalho-day-${dateStr}`} className="text-xs my-1">
                                          Tipo de trabalho
                                        </Label>
                                        <Select
                                          value={dayData.tipoTrabalhoDay}
                                          onValueChange={(value) => {
                                            updateDayData(dateStr, "tipoTrabalhoDay", value)
                                            updateEsquemaOptionsForDay(dateStr, value)
                                            setTimeout(() => {
                                              const updatedDayData = { ...dayDataMap[dateStr], tipoTrabalhoDay: value }
                                              validatePKDistance(dateStr, updatedDayData)

                                              // If user selected Trabalhos Fixos, validate all other days too
                                              if (value === "Trabalhos Fixos") {
                                                setTimeout(() => {
                                                  validateAllDaysWithTrabalhosFix()
                                                }, 200)
                                              }
                                            }, 100)
                                          }}
                                        >
                                          <SelectTrigger id={`tipo-trabalho-day-${dateStr}`} className="text-sm">
                                            <SelectValue placeholder="Selecione" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {tipoTrabalhoPerDayOptions.length > 0 ? (
                                              tipoTrabalhoPerDayOptions
                                                .filter((tipo) => !disabledTipoTrabalhoByDay[dateStr]?.includes(tipo))
                                                .map((tipo) => (
                                                  <SelectItem key={tipo} value={tipo}>
                                                    {tipo}
                                                  </SelectItem>
                                                ))
                                            ) : (
                                              <SelectItem value="loading" disabled>
                                                Carregando...
                                              </SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label htmlFor={`local-intervencao-${dateStr}`} className="text-xs my-1">
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
                                        <Label htmlFor={`esquema-${dateStr}`} className="text-xs my-1">
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
                                            {esquemaOptionsByDay[dateStr] && esquemaOptionsByDay[dateStr].length > 0 ? (
                                              esquemaOptionsByDay[dateStr].map((esquema) => (
                                                <SelectItem key={esquema} value={esquema}>
                                                  {esquema}
                                                </SelectItem>
                                              ))
                                            ) : dayData.tipoTrabalhoDay ? (
                                              <SelectItem value="none" disabled>
                                                Nenhum esquema disponível
                                              </SelectItem>
                                            ) : (
                                              <SelectItem value="select-tipo" disabled>
                                                Selecione o tipo de trabalho primeiro
                                              </SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label htmlFor={`observacoes-${dateStr}`} className="text-xs my-1">
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
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleSubmitPlano}>
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
                          <Label className="my-1.5" htmlFor="fiscalizacao-nome">
                            Nome
                          </Label>
                          <Input
                            className="px-3.5"
                            id="fiscalizacao-nome"
                            type="text"
                            placeholder="Nome do responsável"
                            value={fiscalizacaoNome}
                            onChange={(e) => setFiscalizacaoNome(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="my-1.5" htmlFor="fiscalizacao-contato">
                            Contato
                          </Label>
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
                          <Label className="my-1.5" htmlFor="entidade-nome">
                            Nome
                          </Label>
                          <Input
                            id="entidade-nome"
                            type="text"
                            placeholder="Nome do responsável"
                            value={entidadeExecutanteNome}
                            onChange={(e) => setEntidadeExecutanteNome(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="my-1.5" htmlFor="entidade-contato">
                            Contato
                          </Label>
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
                          <Label className="my-1.5" htmlFor="sinalizacao-nome">
                            Nome
                          </Label>
                          <Input
                            id="sinalizacao-nome"
                            type="text"
                            placeholder="Nome do responsável"
                            value={sinalizacaoNome}
                            onChange={(e) => setSinalizacaoNome(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="my-1.5" htmlFor="sinalizacao-contato">
                            Contato
                          </Label>
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
                    <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleSubmitPlano}>
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
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false)
                  setEditingPlanId(null)
                  setIsEditingApprovedPlan(false)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  // Save the edited plan
                  handleSubmitPlano()
                  setEditDialogOpen(false)
                }}
              >
                Guardar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default ServiceSchedulerApp
