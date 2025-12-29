import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useSecurityAudit() {
  const logSensitiveAccess = useCallback(async (
    tableName: string,
    recordId: string,
    accessType: 'read' | 'write' | 'delete'
  ) => {
    try {
      await supabase.rpc('log_sensitive_access', {
        table_name: tableName,
        record_id: recordId,
        access_type: accessType
      })
    } catch (error) {
      // Fail silently to not break main functionality
      console.warn('Audit logging failed:', error)
    }
  }, [])

  const validateInput = useCallback(async (
    inputText: string,
    maxLength: number = 1000,
    allowHtml: boolean = false
  ): Promise<boolean> => {
    try {
      const { data } = await supabase.rpc('validate_input', {
        input_text: inputText,
        max_length: maxLength,
        allow_html: allowHtml
      })
      return data || false
    } catch (error) {
      console.warn('Input validation failed:', error)
      return false
    }
  }, [])

  return {
    logSensitiveAccess,
    validateInput
  }
}