import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Maximize,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export interface ImageData {
  id: string
  image_url: string
  title: string
  date: string
  notes?: string
}

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  images: ImageData[]
  initialIndex?: number
}

export function ImageViewerModal({ 
  isOpen, 
  onClose, 
  images, 
  initialIndex = 0 
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const currentImage = images[currentIndex]

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  const resetView = useCallback(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5))
  }

  const handleReset = () => {
    resetView()
  }

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
    resetView()
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
    resetView()
  }

  const handleDownload = async () => {
    if (!currentImage) return
    
    try {
      setIsLoading(true)
      const response = await fetch(currentImage.image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentImage.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date(currentImage.date).toLocaleDateString('pt-BR').replace(/\//g, '-')}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Download concluído",
        description: "A imagem foi baixada com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao baixar imagem:', error)
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a imagem.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          handlePrevious()
          break
        case 'ArrowRight':
          handleNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          handleReset()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, onClose])

  if (!currentImage) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-black/95 border-0">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {currentIndex + 1} de {images.length}
              </Badge>
              <div>
                <h3 className="text-lg font-semibold">{currentImage.title}</h3>
                <p className="text-sm text-white/70">
                  {new Date(currentImage.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <span className="text-sm font-medium px-2 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                disabled={isLoading}
                className="text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <Button
              size="lg"
              variant="ghost"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full p-3"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <Button
              size="lg"
              variant="ghost"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full p-3"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Image container */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <img
            src={currentImage.image_url}
            alt={currentImage.title}
            className={cn(
              "max-w-none transition-transform duration-200 select-none",
              isDragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-zoom-in"
            )}
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              maxHeight: zoom === 1 ? '80vh' : 'none',
              maxWidth: zoom === 1 ? '90vw' : 'none'
            }}
            onClick={() => zoom === 1 && handleZoomIn()}
            draggable={false}
          />
        </div>

        {/* Footer with notes */}
        {currentImage.notes && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-white/90 text-sm max-w-3xl mx-auto text-center">
              {currentImage.notes}
            </p>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="absolute bottom-4 right-4 z-10 text-white/60 text-xs">
          Use ← → para navegar • + - para zoom • ESC para fechar
        </div>
      </DialogContent>
    </Dialog>
  )
}