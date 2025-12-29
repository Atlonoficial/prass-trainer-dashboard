import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const GOAL_OPTIONS = [
  { value: "Emagrecimento", label: "Emagrecimento" },
  { value: "Hipertrofia", label: "Hipertrofia" },
  { value: "Condicionamento", label: "Condicionamento Físico" },
  { value: "Reabilitação", label: "Reabilitação" },
  { value: "Performance", label: "Performance Esportiva" },
  { value: "Saúde Geral", label: "Saúde Geral" },
  { value: "Resistência", label: "Resistência" },
  { value: "Flexibilidade", label: "Flexibilidade" },
] as const

interface MultiSelectGoalsFallbackProps {
  value?: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelectGoalsFallback({
  value = [],
  onChange,
  placeholder = "Selecione os objetivos...",
  className
}: MultiSelectGoalsFallbackProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const safeValue = Array.isArray(value) ? value : []

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return GOAL_OPTIONS
    return GOAL_OPTIONS.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  const handleSelect = (goalValue: string) => {
    const newValues = safeValue.includes(goalValue)
      ? safeValue.filter((v) => v !== goalValue)
      : [...safeValue, goalValue]
    onChange(newValues)
  }

  const handleRemove = (goalValue: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newValues = safeValue.filter((v) => v !== goalValue)
    onChange(newValues)
  }

  const selectedLabels = React.useMemo(() => {
    return GOAL_OPTIONS
      .filter(option => safeValue.includes(option.value))
      .map(option => option.label)
  }, [safeValue])

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[2.5rem] px-3 py-2"
          >
            <div className="flex flex-wrap gap-1">
              {safeValue.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedLabels.map((label) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="text-xs px-2 py-1"
                  >
                    {label}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => {
                        const goalValue = GOAL_OPTIONS.find(opt => opt.label === label)?.value
                        if (goalValue) handleRemove(goalValue, e)
                      }}
                    />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <input
              type="text"
              placeholder="Buscar objetivo..."
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum objetivo encontrado.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      safeValue.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}