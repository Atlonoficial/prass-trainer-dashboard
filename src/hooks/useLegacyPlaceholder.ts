import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface StudentConversation {
  id: string
  student_id: string
  teacher_id: string
  last_message?: string | null
  last_message_at?: string | null
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: 'teacher' | 'student'
  message: string
  created_at?: string | null
}

// TODO: Remove this file after refactoring all code to use new hooks

export function useFoodsLegacy() {
  // This is a placeholder if needed
}
