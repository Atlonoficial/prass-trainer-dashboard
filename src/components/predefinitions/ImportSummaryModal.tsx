import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, XCircle, Copy, AlertTriangle, Download } from 'lucide-react'

interface ImportResult {
  filename: string
  exerciseName: string
  status: 'success' | 'failed' | 'duplicate' | 'skipped'
  error?: string
}

interface ImportSummaryModalProps {
  isOpen: boolean
  results: ImportResult[]
  onClose: () => void
  stats: {
    total: number
    successful: number
    failed: number
    duplicates: number
    skipped: number
  }
}

export function ImportSummaryModal({ 
  isOpen, 
  results, 
  onClose, 
  stats 
}: ImportSummaryModalProps) {
  const successfulResults = results.filter(r => r.status === 'success')
  const failedResults = results.filter(r => r.status === 'failed')
  const duplicateResults = results.filter(r => r.status === 'duplicate')
  const skippedResults = results.filter(r => r.status === 'skipped')

  const downloadReport = () => {
    const reportData = {
      summary: stats,
      timestamp: new Date().toISOString(),
      results: results
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Relatório de Importação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
              <div className="text-sm text-muted-foreground">Sucessos</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">Falhas</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Copy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{stats.duplicates}</div>
              <div className="text-sm text-muted-foreground">Duplicados</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{stats.skipped}</div>
              <div className="text-sm text-muted-foreground">Ignorados</div>
            </div>
          </div>

          {/* Success message */}
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-lg font-semibold text-green-800">
              ✅ Importação concluída com sucesso!
            </div>
            <div className="text-sm text-green-600 mt-1">
              {stats.successful} exercícios foram adicionados à sua biblioteca.
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            {/* Successful imports */}
            {successfulResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Exercícios importados com sucesso ({successfulResults.length})
                </h3>
                <ScrollArea className="h-24 border rounded-md p-3 bg-green-50/30">
                  <div className="space-y-1">
                    {successfulResults.map((result, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{result.exerciseName}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Failed imports */}
            {failedResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-red-700 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Falhas na importação ({failedResults.length})
                </h3>
                <ScrollArea className="h-24 border rounded-md p-3 bg-red-50/30">
                  <div className="space-y-1">
                    {failedResults.map((result, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex justify-between">
                          <span>{result.filename}</span>
                          <span className="text-xs text-red-600">{result.error}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Duplicates */}
            {duplicateResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-yellow-700 flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Duplicados ignorados ({duplicateResults.length})
                </h3>
                <ScrollArea className="h-24 border rounded-md p-3 bg-yellow-50/30">
                  <div className="space-y-1">
                    {duplicateResults.map((result, index) => (
                      <div key={index} className="text-sm">
                        <span>{result.exerciseName}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={downloadReport} className="mr-auto">
            <Download className="h-4 w-4 mr-2" />
            Baixar Relatório
          </Button>
          <Button onClick={onClose}>
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}