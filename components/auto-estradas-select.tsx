"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AutoEstradasSelectProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
  concessao?: string
  disabled?: boolean
}

export function AutoEstradasSelect({
  value,
  onValueChange,
  label,
  placeholder,
  concessao,
  disabled,
}: AutoEstradasSelectProps) {
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOptions() {
      try {
        const csvUrl =
          "https://docs.google.com/spreadsheets/d/1ATKqWm_bTtN398nbfpR0gtHbqYLAc3R5fhOSPqZmNkA/export?format=csv"
        const response = await fetch(csvUrl)

        if (!response.ok) {
          throw new Error("Failed to fetch CSV")
        }

        const csvText = await response.text()

        // Parse CSV
        const lines = csvText.split("\n").filter((line) => line.trim())
        if (lines.length === 0) {
          throw new Error("CSV is empty")
        }

        // Get headers and find the columns (case-insensitive)
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
        const normalizedHeaders = headers.map((h) =>
          h
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
        )

        const autoestradaIndex = normalizedHeaders.findIndex(
          (h) => h === "autoestrada" || h === "auto-estrada" || h === "auto estrada",
        )
        const concessaoIndex = normalizedHeaders.findIndex((h) => h === "concessao")

        if (autoestradaIndex === -1) {
          throw new Error("Column 'Auto Estrada' not found in CSV")
        }

        const autoestradas = new Set<string>()
        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))

          // If concessao is selected and column exists, filter by it
          if (concessao && concessaoIndex !== -1) {
            const rowConcessao = columns[concessaoIndex]?.trim()
            // Compare in lowercase to make it case-insensitive
            if (rowConcessao.toLowerCase() !== concessao.toLowerCase()) {
              continue // Skip rows that don't match the selected concessão
            }
          }

          const autoestrada = columns[autoestradaIndex]?.trim()
          if (autoestrada) {
            autoestradas.add(autoestrada)
          }
        }

        const sortedAutoestradas = Array.from(autoestradas).sort()
        setOptions(sortedAutoestradas)
      } catch (error) {
        console.error("Erro ao carregar autoestradas do CSV:", error)

        try {
          const response = await fetch("/data/options.json")
          const data = await response.json()
          setOptions(data.autoEstradas || [])
        } catch (fallbackError) {
          console.error("Erro ao carregar opções do fallback:", fallbackError)
          setOptions([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [concessao])

  return (
    <div>
      {label && (
        <Label className="my-1.5" htmlFor="auto-estradas-select">
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
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
