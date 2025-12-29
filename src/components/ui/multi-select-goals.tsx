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
import { MultiSelectGoalsFallback } from "./multi-select-goals-fallback"

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

interface MultiSelectGoalsProps {
  value?: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelectGoals({
  value = [],
  onChange,
  placeholder = "Selecione os objetivos...",
  className
}: MultiSelectGoalsProps) {
  // Estado simplificado - sempre começar com fallback
  const [useFallback, setUseFallback] = React.useState(true)
  const [open, setOpen] = React.useState(false)

  const safeValue = Array.isArray(value) ? value : []

  // Proteção defensiva para GOAL_OPTIONS
  const safeGoalOptions = React.useMemo(() => {
    if (!GOAL_OPTIONS || !Array.isArray(GOAL_OPTIONS)) {
      console.warn('⚠️ GOAL_OPTIONS inválido, mantendo fallback');
      return [];
    }
    return GOAL_OPTIONS;
  }, []);

  const selectedLabels = React.useMemo(() => {
    if (!safeGoalOptions.length || !safeValue.length) return [];
    
    return safeGoalOptions
      .filter(option => option && option.value && safeValue.includes(option.value))
      .map(option => option.label);
  }, [safeGoalOptions, safeValue]);

  const handleSelect = React.useCallback((goalValue: string) => {
    const newValues = safeValue.includes(goalValue)
      ? safeValue.filter((v) => v !== goalValue)
      : [...safeValue, goalValue]
    onChange(newValues)
  }, [safeValue, onChange])

  const handleRemove = React.useCallback((goalValue: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newValues = safeValue.filter((v) => v !== goalValue)
    onChange(newValues)
  }, [safeValue, onChange])

  // Verificação de integridade - só tentar versão avançada se tudo estiver OK
  React.useEffect(() => {
    const canUseAdvanced = [
      Array.isArray(GOAL_OPTIONS),
      GOAL_OPTIONS.length > 0,
      GOAL_OPTIONS.every(opt => opt && typeof opt.value === 'string' && typeof opt.label === 'string'),
      typeof onChange === 'function',
      Array.isArray(safeValue)
    ].every(Boolean)

    if (!canUseAdvanced) {
      console.warn('🚨 Condições não atendidas, mantendo fallback')
      setUseFallback(true)
    }
  }, [safeValue, onChange])

  // SEMPRE usar fallback por enquanto - mais estável
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
                        const goalValue = safeGoalOptions.find(opt => opt?.label === label)?.value
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
        <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
          <MultiSelectGoalsFallback
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="border-0 shadow-none"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}