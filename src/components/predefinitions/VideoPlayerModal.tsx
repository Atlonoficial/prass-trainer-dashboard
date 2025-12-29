import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export default function VideoPlayerModal({ isOpen, onClose, videoUrl, title }: VideoPlayerModalProps) {
  // Função para extrair ID do YouTube e converter para embed
  const getEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      
      // YouTube - diferentes formatos
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';
        
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.searchParams.has('v')) {
          videoId = urlObj.searchParams.get('v') || '';
        }
        
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      // Vimeo
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/')[1];
        if (videoId) {
          return `https://player.vimeo.com/video/${videoId}`;
        }
      }
      
      // Se já for um embed, retorna como está
      if (url.includes('/embed/')) {
        return url;
      }
      
      // Retorna URL original se não conseguir converter
      return url;
    } catch {
      return url;
    }
  };

  const embedUrl = getEmbedUrl(videoUrl);
  const isEmbeddable = embedUrl.includes('/embed/') || embedUrl.includes('player.vimeo.com');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl h-[80vh] p-4">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.open(videoUrl, '_blank')}
                size="sm"
                variant="outline"
                className="p-2"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button 
                onClick={onClose}
                size="sm"
                variant="ghost"
                className="p-2 hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg">
          {isEmbeddable ? (
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">Não foi possível incorporar este vídeo</p>
                <p className="text-sm">Clique no botão abaixo para abrir em uma nova aba</p>
              </div>
              <Button
                onClick={() => window.open(videoUrl, '_blank')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Vídeo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}