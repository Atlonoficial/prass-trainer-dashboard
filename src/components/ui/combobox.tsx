import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string }[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allowCustom?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhuma opção encontrada.",
  allowCustom = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [customValue, setCustomValue] = React.useState("")

  // Check if current value is a custom value (not in predefined options)
  const isCustomValue = value && !options.find(option => option.value === value)
  
  // Get display text for the current value
  const displayValue = React.useMemo(() => {
    if (!value) return ""
    const option = options.find(opt => opt.value === value)
    return option ? option.label : value
  }, [value, options])

  // Handle selection from dropdown
  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange("")
    } else {
      onValueChange(selectedValue)
      setCustomValue("")
    }
    setOpen(false)
  }

  // Handle custom input when typing
  const handleSearchChange = (searchValue: string) => {
    setSearch(searchValue)
    if (allowCustom && searchValue && !options.find(opt => opt.label.toLowerCase().includes(searchValue.toLowerCase()))) {
      setCustomValue(searchValue)
    }
  }

  // Handle selecting custom value
  const handleSelectCustom = () => {
    if (customValue) {
      onValueChange(customValue)
      setSearch("")
      setCustomValue("")
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {value ? displayValue : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom && customValue ? (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleSelectCustom}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Usar "{customValue}"
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}