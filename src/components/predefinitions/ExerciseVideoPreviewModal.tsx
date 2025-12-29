import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';

interface ExerciseVideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  exerciseName: string;
}

export default function ExerciseVideoPreviewModal({ 
  isOpen, 
  onClose, 
  videoUrl, 
  exerciseName 
}: ExerciseVideoPreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isStorageFile = videoUrl.includes('supabase.co/storage') || videoUrl.includes('biblioteca-exercicios');
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isVimeo = videoUrl.includes('vimeo.com');
  const isGif = videoUrl.toLowerCase().endsWith('.gif');
  const isVideo = videoUrl.toLowerCase().match(/\.(mp4|webm|mov)$/);

  const convertToEmbed = (url: string) => {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.searchParams.has('v')) {
          videoId = urlObj.searchParams.get('v') || '';
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/')[1];
        if (videoId) return `https://player.vimeo.com/video/${videoId}`;
      }
      
      return url;
    } catch {
      return url;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[98vw] h-[98vh]' : 'max-w-3xl h-auto max-h-[90vh]'} w-[95vw] p-0 flex flex-col`}>
        <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate max-w-[60%]">
              {exerciseName}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="gap-2"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(videoUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center bg-muted/20 p-4 overflow-hidden">
          {isLoading && isStorageFile && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            </div>
          )}
          
          {isStorageFile ? (
            isGif || !isVideo ? (
              <img 
                src={videoUrl} 
                alt={exerciseName}
                className={`max-w-full ${isFullscreen ? 'max-h-[calc(98vh-80px)]' : 'max-h-[70vh]'} rounded-lg shadow-lg object-contain ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                loading="eager"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className={`max-w-full ${isFullscreen ? 'max-h-[calc(98vh-80px)]' : 'max-h-[70vh]'} rounded-lg shadow-lg`}
                onLoadedData={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            )
          ) : (isYouTube || isVimeo) ? (
            <iframe
              src={convertToEmbed(videoUrl)}
              className={`w-full ${isFullscreen ? 'h-[calc(98vh-80px)]' : 'aspect-video'} rounded-lg`}
              allowFullScreen
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">Formato não suportado</p>
                <p className="text-sm">Clique em "Abrir" para visualizar em nova aba</p>
              </div>
              <Button
                onClick={() => window.open(videoUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Vídeo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
