import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, Database, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function OrphanedVideosCleanup() {
  const [orphanedCount, setOrphanedCount] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    deleted: number;
    errors: number;
  } | null>(null);
  const { toast } = useToast();

  const scanOrphanedVideos = async () => {
    setIsScanning(true);
    setCleanupResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-videos', {
        body: { action: 'scan' }
      });

      if (error) throw error;

      setOrphanedCount(data.orphaned_count || 0);
      
      toast({
        title: "Scan completo",
        description: `Encontrados ${data.orphaned_count} vídeos órfãos`,
      });
    } catch (error) {
      console.error('Error scanning orphaned videos:', error);
      toast({
        title: "Erro ao escanear",
        description: "Não foi possível escanear os vídeos órfãos",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    setShowConfirm(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-videos', {
        body: { action: 'cleanup' }
      });

      if (error) throw error;

      setCleanupResult({
        deleted: data.deleted_count || 0,
        errors: data.errors?.length || 0
      });
      
      setOrphanedCount(0);
      
      toast({
        title: "Limpeza concluída",
        description: `${data.deleted_count} vídeos órfãos foram removidos`,
      });
    } catch (error) {
      console.error('Error cleaning orphaned videos:', error);
      toast({
        title: "Erro na limpeza",
        description: "Não foi possível remover os vídeos órfãos",
        variant: "destructive"
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <>
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Gerenciamento de Storage
          </CardTitle>
          <CardDescription>
            Identifique e remova vídeos não vinculados a exercícios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cleanupResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Limpeza concluída com sucesso!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {cleanupResult.deleted} arquivos removidos
                    {cleanupResult.errors > 0 && ` (${cleanupResult.errors} erros)`}
                  </p>
                </div>
              </div>
            )}

            {orphanedCount === null ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  Execute um scan para identificar vídeos órfãos no storage
                </p>
                <Button 
                  onClick={scanOrphanedVideos}
                  disabled={isScanning}
                  className="gap-2"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Escaneando...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Escanear Storage
                    </>
                  )}
                </Button>
              </div>
            ) : orphanedCount === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-900">Storage limpo!</p>
                <p className="text-sm text-green-700 mt-1">
                  Nenhum vídeo órfão encontrado
                </p>
                <Button 
                  variant="outline" 
                  onClick={scanOrphanedVideos}
                  disabled={isScanning}
                  className="mt-3"
                  size="sm"
                >
                  Escanear novamente
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-900">
                        {orphanedCount} vídeo{orphanedCount !== 1 ? 's' : ''} órfão{orphanedCount !== 1 ? 's' : ''} detectado{orphanedCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        Estes arquivos não estão vinculados a nenhum exercício e podem ser removidos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">
                      <strong>Atenção:</strong> Esta ação é irreversível. Os arquivos serão deletados permanentemente do Supabase Storage.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowConfirm(true)}
                    disabled={isCleaning}
                    className="gap-2 flex-1"
                  >
                    {isCleaning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Removendo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Remover {orphanedCount} Vídeo{orphanedCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={scanOrphanedVideos}
                    disabled={isScanning || isCleaning}
                  >
                    Atualizar
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar remoção
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a remover <strong>{orphanedCount} vídeo{orphanedCount !== 1 ? 's' : ''}</strong> do storage.
              </p>
              <p className="text-destructive font-medium">
                Esta ação não pode ser desfeita!
              </p>
              <p>
                Os arquivos serão permanentemente deletados do Supabase Storage.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, remover permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
