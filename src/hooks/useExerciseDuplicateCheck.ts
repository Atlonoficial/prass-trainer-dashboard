import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Exercise } from '@/hooks/useExercises'

export interface FileAnalysis {
  filename: string
  exerciseName: string
  isValid: boolean
  isDuplicate: boolean
  reason?: string
  file: File
}

export interface ImportAnalysis {
  total: number
  valid: number
  invalid: number
  duplicates: number
  newExercises: number
  files: FileAnalysis[]
}

export function useExerciseDuplicateCheck() {
  const parseExerciseName = (filename: string) => {
    const nameWithoutExt = filename.replace(/\.(mp4|webm|mov|gif)$/i, '')
    const parts = nameWithoutExt.split('_')
    return parts[0] || nameWithoutExt
  }

  const checkDuplicates = useCallback(async (files: FileList): Promise<ImportAnalysis> => {
    try {
      // Fetch existing exercises
      const { data: existingExercises, error } = await supabase
        .from('exercises')
        .select('name')
        .order('name')
      
      if (error) {
        console.error('Error fetching existing exercises:', error)
        throw error
      }

      const existingNames = new Set(existingExercises?.map(ex => ex.name.toLowerCase()) || [])
      const filesArray = Array.from(files)
      const processedFiles: FileAnalysis[] = []
      const seenNames = new Set<string>()

      for (const file of filesArray) {
        const exerciseName = parseExerciseName(file.name)
        const normalizedName = exerciseName.toLowerCase()
        
        let isValid = true
        let isDuplicate = false
        let reason = ''

        // Check file type
        if (!file.type.startsWith('video/') && file.type !== 'image/gif') {
          isValid = false
          reason = 'Tipo de arquivo inválido'
        }
        // Check if exercise name already exists in database
        else if (existingNames.has(normalizedName)) {
          isDuplicate = true
          reason = 'Exercício já existe no banco de dados'
        }
        // Check if we've seen this name in current batch
        else if (seenNames.has(normalizedName)) {
          isDuplicate = true
          reason = 'Duplicado no lote atual'
        }
        // Check if name is too short
        else if (exerciseName.length < 2) {
          isValid = false
          reason = 'Nome do exercício muito curto'
        }

        seenNames.add(normalizedName)
        
        processedFiles.push({
          filename: file.name,
          exerciseName,
          isValid,
          isDuplicate,
          reason,
          file
        })
      }

      const valid = processedFiles.filter(f => f.isValid && !f.isDuplicate).length
      const invalid = processedFiles.filter(f => !f.isValid).length
      const duplicates = processedFiles.filter(f => f.isDuplicate).length
      const newExercises = valid

      return {
        total: filesArray.length,
        valid,
        invalid,
        duplicates,
        newExercises,
        files: processedFiles
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
      throw error
    }
  }, [])

  return { checkDuplicates }
}