import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, Image, Check, Info, AlertCircle } from 'lucide-react'

interface ImageUploadProps {
  onImageUpload: (url: string) => void
  currentImage?: string
  bucket: string
  path?: string
  label?: string
  aspectRatio?: string
  recommendedSize?: string
  previewClassName?: string
  showSizeHint?: boolean
}

export function ImageUpload({ 
  onImageUpload, 
  currentImage, 
  bucket, 
  path = '', 
  label = 'Imagem',
  aspectRatio = '16/9',
  recommendedSize = '800x450px (16:9 otimizado para mobile)',
  previewClassName,
  showSizeHint = true
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentImage || '')
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const validateImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)

      // Validate image dimensions
      const dimensions = await validateImageDimensions(file)
      setImageDimensions(dimensions)
      
      // Validar aspect ratio 16:9
      const aspectRatioValue = dimensions.width / dimensions.height
      const target169 = 16 / 9  // 1.777...
      const is16by9 = Math.abs(aspectRatioValue - target169) < 0.15  // Tolerância de 15%

      if (!is16by9) {
        toast({
          title: "⚠️ Formato não ideal",
          description: "Para melhor visualização mobile, use imagens 16:9. Exemplo: 800x450px",
        })
      }

      if (dimensions.width < 800 || dimensions.height < 450) {
        toast({
          title: "⚠️ Imagem pequena",
          description: "Use pelo menos 800x450px para garantir qualidade em dispositivos mobile.",
        })
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const fileExt = file.name.split('.').pop()
      // Use user ID structure for avatars bucket
      const fileName = bucket === 'avatars' ? 'avatar.jpg' : `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = bucket === 'avatars' ? `${user.id}/${fileName}` : (path ? `${path}/${fileName}` : fileName)

      // Delete existing avatar if it exists (for avatars bucket)
      if (bucket === 'avatars') {
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([filePath])
        
        // Log delete result (don't throw error if file doesn't exist)
        if (deleteError && !deleteError.message.includes('not found')) {
          console.warn('Warning deleting existing file:', deleteError)
        }
      }

      // Upload new file with upsert to overwrite any existing
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL with cache busting for immediate update
      const timestamp = Date.now()
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      const publicUrl = `${data.publicUrl}?t=${timestamp}`
      
      console.log('✅ Upload successful:', publicUrl)
      console.log('📦 Bucket:', bucket, '| Path:', filePath)
      
      // Update preview immediately
      setPreview(publicUrl)
      
      // Call parent callback to update profile
      onImageUpload(publicUrl)

      toast({
        title: "✅ Imagem enviada!",
        description: `Carregada: ${dimensions.width}×${dimensions.height}px`,
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível carregar a imagem.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        })
        return
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato inválido",
          description: "Apenas arquivos de imagem são permitidos.",
          variant: "destructive",
        })
        return
      }

      uploadFile(file)
    }
  }

  const removeImage = () => {
    setPreview('')
    onImageUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      
      {preview ? (
        <div className="space-y-3">
          <div 
            className={previewClassName || `relative w-full rounded-lg border border-border overflow-hidden bg-muted`}
            style={{ aspectRatio }}
          >
            <img 
              src={preview} 
              alt="Preview do Banner" 
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 shadow-lg"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shadow-md">
              <Check className="h-3 w-3" />
              Imagem carregada
            </div>

            {imageDimensions && (
              <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded shadow-md">
                {imageDimensions.width} × {imageDimensions.height}px
              </div>
            )}
          </div>
          
          {showSizeHint && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Para melhor experiência mobile, use imagens otimizadas com as dimensões recomendadas acima.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div 
            className={previewClassName || `w-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center bg-muted/50 p-8 cursor-pointer hover:border-muted-foreground/40 transition-colors`}
            style={{ aspectRatio }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Clique para fazer upload da imagem do banner
            </p>
          </div>
          
          {showSizeHint && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                📱 Tamanhos Recomendados (Foco Mobile):
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-4">
                <li>• <strong>Dimensões:</strong> 800x450px (formato 16:9)</li>
                <li>• <strong>Uso no app:</strong> Banner aparece como card horizontal completo no app do aluno</li>
                <li>• <strong>Formato:</strong> JPG ou PNG com boa compressão</li>
                <li>• <strong>Tamanho máximo:</strong> 5MB</li>
                <li>• <strong>Dica:</strong> Evite texto muito pequeno, use elementos visuais fortes e centralizados</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Carregando...' : preview ? 'Alterar imagem' : 'Escolher imagem'}
        </Button>
      </div>
    </div>
  )
}