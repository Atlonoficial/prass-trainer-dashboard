import React, { useState, useRef } from 'react'
import { Upload, Video, X, FileVideo, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface VideoUploadProps {
  onUpload: (url: string) => void
  currentVideo?: string
  accept?: string
  maxSize?: number
  className?: string
}

export function VideoUpload({ 
  onUpload, 
  currentVideo, 
  accept = "video/mp4,video/webm,video/quicktime,image/gif",
  maxSize = 50 * 1024 * 1024, // 50MB
  className = ""
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setProgress(0)

      // Validate file
      if (file.size > maxSize) {
        throw new Error(`Arquivo muito grande. Máximo ${maxSize / (1024 * 1024)}MB`)
      }

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Usuário não autenticado')
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('biblioteca-exercicios')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      clearInterval(progressInterval)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('biblioteca-exercicios')
        .getPublicUrl(fileName)

      setProgress(100)
      onUpload(publicUrl)
      toast({ title: 'Sucesso', description: 'Vídeo enviado com sucesso!' })

    } catch (error: any) {
      console.error('Erro no upload:', error)
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    uploadFile(files[0])
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
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {currentVideo && (
        <div className="relative">
          {currentVideo.endsWith('.gif') ? (
            <img src={currentVideo} alt="Exercise GIF" className="w-full h-48 object-cover rounded-lg" />
          ) : (
            <video 
              src={currentVideo} 
              controls 
              className="w-full h-48 object-cover rounded-lg"
              preload="metadata"
            />
          )}
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => onUpload('')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/50'}
          transition-colors
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Enviando vídeo...</p>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentVideo ? (
              <FileVideo className="h-8 w-8 mx-auto text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {currentVideo ? 'Alterar vídeo' : 'Clique ou arraste um vídeo'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                MP4, WEBM, MOV ou GIF (máx. {maxSize / (1024 * 1024)}MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}