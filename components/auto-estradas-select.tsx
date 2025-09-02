"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface AutoEstrada {
  value: string
  label: string
}

interface AutoEstradasSelectProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
}

export function AutoEstradasSelect({
  value,
  onValueChange,
  label = "Auto Estrada",
  placeholder = "Selecione a Auto Estrada",
}: AutoEstradasSelectProps) {
  const [autoEstradas, setAutoEstradas] = useState<AutoEstrada[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAutoEstradas = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/data/options.json")

        if (!response.ok) {
          throw new Error(`Erro ao carregar dados: ${response.status}`)
        }

        const data = await response.json()

        if (data.autoEstradas && Array.isArray(data.autoEstradas)) {
          setAutoEstradas(data.autoEstradas)
        } else {
          throw new Error("Formato de dados inválido")
        }
      } catch (err) {
        console.error("Erro ao carregar auto-estradas:", err)
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAutoEstradas()
  }, [])

  if (error) {
    return (
      <div className="space-y-2">
        <Label>{label}:</Label>
        <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          Erro ao carregar opções: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="auto-estrada">{label}:</Label>
      <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
        <SelectTrigger className="w-full">
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Carregando...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {autoEstradas.map((autoEstrada) => (
            <SelectItem key={autoEstrada.value} value={autoEstrada.value}>
              {autoEstrada.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
