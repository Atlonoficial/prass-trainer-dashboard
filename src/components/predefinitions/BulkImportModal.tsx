import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileVideo, CheckCircle, XCircle, Loader2, Copy, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useExercises } from '@/hooks/useExercises'
import { supabase } from '@/integrations/supabase/client'
import { useExerciseDuplicateCheck, ImportAnalysis } from '@/hooks/useExerciseDuplicateCheck'
import { ImportConfirmationModal } from './ImportConfirmationModal'
import { ImportSummaryModal } from './ImportSummaryModal'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ImportProgress {
  total: number
  processed: number
  successful: number
  failed: number
  duplicates: number
  skipped: number
  current: string
}

interface ImportResult {
  filename: string
  exerciseName: string
  status: 'success' | 'failed' | 'duplicate' | 'skipped'
  error?: string
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [importing, setImporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null)
  const [results, setResults] = useState<ImportResult[]>([])
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    duplicates: 0,
    skipped: 0,
    current: ''
  })
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { addExercise } = useExercises()
  const { checkDuplicates } = useExerciseDuplicateCheck()

  const parseExerciseName = (filename: string) => {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(mp4|webm|mov|gif)$/i, '')
    
    // Try to extract exercise info from filename
    // Expected format: "SupinoPeito_Intermediario_Chest_3x12"
    const parts = nameWithoutExt.split('_')
    
    // Map Portuguese difficulty values to English
    const difficultyMap: { [key: string]: string } = {
      'iniciante': 'beginner',
      'intermediario': 'intermediate', 
      'avancado': 'advanced',
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced'
    }
    
    const rawDifficulty = (parts[1] || 'intermediario').toLowerCase()
    const mappedDifficulty = difficultyMap[rawDifficulty] || 'intermediate'
    
    return {
      name: parts[0] || nameWithoutExt,
      difficulty: mappedDifficulty,
      muscle_group: parts[2] || 'geral',
      sets: parseInt(parts[3]?.split('x')[0]) || 3,
      reps: parseInt(parts[3]?.split('x')[1]) || 12,
      rest_time: 60
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const fileExt = file.name.split('.').pop()
    // Sanitize filename to remove special characters that might cause storage issues
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `bulk-import/${user.id}/${Date.now()}-${sanitizedName}`

    console.log('📤 Uploading file:', fileName)

    const { error } = await supabase.storage
      .from('biblioteca-exercicios')
      .upload(fileName, file, { upsert: false })

    if (error) {
      console.error('❌ Storage upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('biblioteca-exercicios')
      .getPublicUrl(fileName)

    console.log('✅ File uploaded successfully:', publicUrl)
    return publicUrl
  }

  const analyzeFiles = async (files: FileList) => {
    setAnalyzing(true)
    try {
      console.log(`🔍 Analyzing ${files.length} files for duplicates...`)
      const analysisResult = await checkDuplicates(files)
      setAnalysis(analysisResult)
      setShowConfirmation(true)
      
      console.log('📊 Analysis complete:', {
        total: analysisResult.total,
        newExercises: analysisResult.newExercises,
        duplicates: analysisResult.duplicates,
        invalid: analysisResult.invalid
      })
      
    } catch (error) {
      console.error('Error analyzing files:', error)
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível analisar os arquivos',
        variant: 'destructive'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const processFiles = async () => {
    if (!analysis) return
    
    setImporting(true)
    setShowConfirmation(false)
    
    const validFiles = analysis.files.filter(f => f.isValid && !f.isDuplicate)
    const importResults: ImportResult[] = []
    
    setProgress({
      total: analysis.total,
      processed: 0,
      successful: 0,
      failed: 0,
      duplicates: analysis.duplicates,
      skipped: analysis.invalid,
      current: ''
    })

    // Process duplicates and invalid files first (add to results without processing)
    analysis.files.forEach(file => {
      if (file.isDuplicate) {
        importResults.push({
          filename: file.filename,
          exerciseName: file.exerciseName,
          status: 'duplicate'
        })
      } else if (!file.isValid) {
        importResults.push({
          filename: file.filename,
          exerciseName: file.exerciseName,
          status: 'skipped',
          error: file.reason
        })
      }
    })

    // Process valid files
    for (let i = 0; i < validFiles.length; i++) {
      const fileAnalysis = validFiles[i]
      const file = fileAnalysis.file
      
      setProgress(prev => ({ 
        ...prev, 
        current: file.name,
        processed: analysis.duplicates + analysis.invalid + i + 1
      }))

      try {
        // Upload video
        const videoUrl = await uploadFile(file)
        
        // Parse exercise data from filename
        const exerciseData = parseExerciseName(file.name)
        
        // Create exercise
        await addExercise({
          ...exerciseData,
          video_url: videoUrl,
          category: 'imported',
          description: `Exercício importado de: ${file.name}`
        })

        importResults.push({
          filename: file.name,
          exerciseName: fileAnalysis.exerciseName,
          status: 'success'
        })

        setProgress(prev => ({
          ...prev,
          successful: prev.successful + 1
        }))

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        
        importResults.push({
          filename: file.name,
          exerciseName: fileAnalysis.exerciseName,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
        
        setProgress(prev => ({
          ...prev,
          failed: prev.failed + 1
        }))
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setResults(importResults)
    setImporting(false)
    setShowSummary(true)
    
    toast({
      title: 'Importação concluída',
      description: `${importResults.filter(r => r.status === 'success').length} exercícios importados com sucesso`
    })
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    if (files.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum arquivo selecionado',
        variant: 'destructive'
      })
      return
    }

    analyzeFiles(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    
    if (files.length > 0) {
      const fileList = new DataTransfer()
      files.forEach(file => fileList.items.add(file))
      analyzeFiles(fileList.files)
    }
  }

  const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0

  const handleClose = () => {
    if (!importing && !analyzing) {
      setShowConfirmation(false)
      setShowSummary(false)
      setAnalysis(null)
      setResults([])
      onClose()
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-2 sm:p-3">
          <DialogHeader>
            <DialogTitle>Importação em Massa de Exercícios</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {!importing && !analyzing ? (
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center
                ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                cursor-pointer hover:border-primary/50 transition-colors
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/mp4,video/webm,video/quicktime,image/gif"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />

              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Selecione os vídeos de exercícios</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Arraste uma pasta ou selecione múltiplos arquivos de vídeo
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sistema inteligente detectará duplicados automaticamente
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos: MP4, WEBM, MOV, GIF
                  </p>
                </div>
              </div>
            </div>
            ) : analyzing ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Analisando arquivos...</h3>
                  <p className="text-sm text-muted-foreground">
                    Verificando duplicados e validando arquivos
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                  <h3 className="text-lg font-semibold">Importando exercícios...</h3>
                  <p className="text-sm text-muted-foreground">
                    Processando: {progress.current}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{progress.processed}/{progress.total}</span>
                  </div>
                  <Progress value={progressPercentage} className="w-full" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{progress.successful}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Sucessos</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">{progress.failed}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Falhas</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Copy className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{progress.duplicates}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Duplicados</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{progress.skipped}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Ignorados</p>
                  </div>
                </div>
              </div>
            )}

          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Nomenclatura de arquivos:</h4>
            <p className="text-sm text-muted-foreground">
              Para melhor organização, nomeie os arquivos como: <br />
              <code className="bg-muted px-1 rounded">NomeExercicio_Dificuldade_GrupoMuscular_Sets×Reps</code><br />
              Exemplo: <code className="bg-muted px-1 rounded">SupinoPeito_Intermediario_Chest_3x12.mp4</code>
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={importing || analyzing}>
              {importing || analyzing ? 'Aguarde...' : 'Fechar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ImportConfirmationModal
      isOpen={showConfirmation}
      analysis={analysis}
      onConfirm={processFiles}
      onCancel={() => setShowConfirmation(false)}
      loading={importing}
    />

    <ImportSummaryModal
      isOpen={showSummary}
      results={results}
      onClose={() => setShowSummary(false)}
      stats={{
        total: progress.total,
        successful: progress.successful,
        failed: progress.failed,
        duplicates: progress.duplicates,
        skipped: progress.skipped
      }}
    />
  </>
  )
}