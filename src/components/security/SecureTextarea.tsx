import React, { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useSecurityAudit } from '@/hooks/useSecurityAudit'

interface SecureTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  allowHtml?: boolean
  required?: boolean
  disabled?: boolean
  className?: string
  rows?: number
}

export function SecureTextarea({
  value,
  onChange,
  placeholder,
  maxLength = 5000,
  allowHtml = false,
  required = false,
  disabled = false,
  className,
  rows = 3
}: SecureTextareaProps) {
  const { validateInput } = useSecurityAudit()
  const [isValid, setIsValid] = useState(true)
  const [validationError, setValidationError] = useState<string>('')

  useEffect(() => {
    if (!value) {
      setIsValid(true)
      setValidationError('')
      return
    }

    const validateAsync = async () => {
      try {
        const valid = await validateInput(value, maxLength, allowHtml)
        setIsValid(valid)
        
        if (!valid) {
          setValidationError('Conteúdo inválido detectado')
        } else {
          setValidationError('')
        }
      } catch (error) {
        console.warn('Textarea validation failed:', error)
        setIsValid(true) // Fail open for better UX
      }
    }

    // Debounce validation
    const timeoutId = setTimeout(validateAsync, 300)
    return () => clearTimeout(timeoutId)
  }, [value, maxLength, allowHtml, validateInput])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    
    // Basic length check on client side
    if (newValue.length <= maxLength) {
      onChange(newValue)
    }
  }

  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${className} ${!isValid ? 'border-destructive' : ''}`}
        rows={rows}
        maxLength={maxLength}
      />
      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}
      <div className="text-xs text-muted-foreground text-right">
        {value.length}/{maxLength}
      </div>
    </div>
  )
}