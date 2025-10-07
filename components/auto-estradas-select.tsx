"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AutoEstradasSelectProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
}

export function AutoEstradasSelect({ value, onValueChange, label, placeholder }: AutoEstradasSelectProps) {
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await fetch("/data/options.json")
        const data = await response.json()
        setOptions(data.autoEstradas || [])
      } catch (error) {
        console.error("Erro ao carregar opções:", error)
        setOptions([])
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [])

  return (
    <div>
      {label && <Label htmlFor="auto-estradas-select">{label}</Label>}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="auto-estradas-select">
          <SelectValue placeholder={loading ? "Carregando..." : placeholder || "Selecione uma opção"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
