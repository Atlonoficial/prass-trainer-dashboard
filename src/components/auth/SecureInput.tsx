import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { useSecurityAudit } from '@/hooks/useSecurityAudit'

interface SecureInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password'
  maxLength?: number
  allowHtml?: boolean
  required?: boolean
  disabled?: boolean
  className?: string
}

export function SecureInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength = 1000,
  allowHtml = false,
  required = false,
  disabled = false,
  className
}: SecureInputProps) {
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
        console.warn('Input validation failed:', error)
        setIsValid(true) // Fail open for better UX
      }
    }

    // Debounce validation
    const timeoutId = setTimeout(validateAsync, 300)
    return () => clearTimeout(timeoutId)
  }, [value, maxLength, allowHtml, validateInput])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    // Basic length check on client side
    if (newValue.length <= maxLength) {
      onChange(newValue)
    }
  }

  return (
    <div className="space-y-1">
      <Input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${className} ${!isValid ? 'border-destructive' : ''}`}
        maxLength={maxLength}
      />
      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}
    </div>
  )
}