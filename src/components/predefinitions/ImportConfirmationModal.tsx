import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, XCircle, Copy, AlertTriangle, FileVideo } from 'lucide-react'
import { ImportAnalysis } from '@/hooks/useExerciseDuplicateCheck'

interface ImportConfirmationModalProps {
  isOpen: boolean
  analysis: ImportAnalysis | null
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

export function ImportConfirmationModal({ 
  isOpen, 
  analysis, 
  onConfirm, 
  onCancel, 
  loading 
}: ImportConfirmationModalProps) {
  if (!analysis) return null

  const validFiles = analysis.files.filter(f => f.isValid && !f.isDuplicate)
  const invalidFiles = analysis.files.filter(f => !f.isValid)
  const duplicateFiles = analysis.files.filter(f => f.isDuplicate)

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Confirmar Importação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <FileVideo className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{analysis.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{analysis.newExercises}</div>
              <div className="text-sm text-muted-foreground">Novos</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Copy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{analysis.duplicates}</div>
              <div className="text-sm text-muted-foreground">Duplicados</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold text-red-600">{analysis.invalid}</div>
              <div className="text-sm text-muted-foreground">Inválidos</div>
            </div>
          </div>

          {/* Files to be imported */}
          {validFiles.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Exercícios que serão importados ({validFiles.length})
              </h3>
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-2">
                  {validFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{file.exerciseName}</span>
                      <span className="text-xs text-muted-foreground">{file.filename}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Duplicate files */}
          {duplicateFiles.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-yellow-700 flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Duplicados que serão ignorados ({duplicateFiles.length})
              </h3>
              <ScrollArea className="h-32 border rounded-md p-3 bg-yellow-50/50">
                <div className="space-y-2">
                  {duplicateFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{file.exerciseName}</span>
                      <Badge variant="outline" className="text-xs">
                        {file.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Invalid files */}
          {invalidFiles.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-red-700 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Arquivos inválidos que serão rejeitados ({invalidFiles.length})
              </h3>
              <ScrollArea className="h-32 border rounded-md p-3 bg-red-50/50">
                <div className="space-y-2">
                  {invalidFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{file.filename}</span>
                      <Badge variant="destructive" className="text-xs">
                        {file.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Warning */}
          {analysis.newExercises === 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="text-sm">
                <strong>Atenção:</strong> Nenhum exercício novo será importado. 
                Todos os arquivos são duplicados ou inválidos.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading || analysis.newExercises === 0}
            className="min-w-32"
          >
            {loading ? 'Importando...' : `Importar ${analysis.newExercises} exercícios`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}