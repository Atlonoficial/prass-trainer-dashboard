import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Copy, ExternalLink } from 'lucide-react'
import { useUrlDetection } from '@/hooks/useUrlDetection'
import { useToast } from '@/hooks/use-toast'

export function DebugPanel() {
  const [searchParams] = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const { urlInfo } = useUrlDetection()
  const { toast } = useToast()

  const urlParams = Object.fromEntries(searchParams.entries())

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado!',
      description: 'Texto copiado para a área de transferência.'
    })
  }

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'sandbox': return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
      case 'localhost': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
      case 'preview': return 'bg-purple-500/20 text-purple-700 border-purple-500/30'
      case 'production': return 'bg-green-500/20 text-green-700 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30'
    }
  }

  if (!urlInfo) return null

  return (
    <div className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Debug Info</span>
              <Badge className={getEnvironmentColor(urlInfo.environment)}>
                {urlInfo.environment}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informações de Debug</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Environment Info */}
              <div>
                <div className="text-xs font-medium mb-2">Ambiente</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tipo:</span>
                    <Badge className={getEnvironmentColor(urlInfo.environment)}>
                      {urlInfo.environment}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">URL Atual:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono max-w-32 truncate">
                        {urlInfo.currentUrl}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(urlInfo.currentUrl)}
                        className="h-5 w-5 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">URL Detectada:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono max-w-32 truncate">
                        {urlInfo.detectedUrl}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(urlInfo.detectedUrl)}
                        className="h-5 w-5 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Redirect Válido:</span>
                    <Badge variant={urlInfo.isValidRedirect ? 'default' : 'destructive'}>
                      {urlInfo.isValidRedirect ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* URL Parameters */}
              {Object.keys(urlParams).length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-2">Parâmetros da URL</div>
                  <div className="space-y-1">
                    {Object.entries(urlParams).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{key}:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono max-w-32 truncate">
                            {key.includes('token') ? `${value.substring(0, 10)}...` : value}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(value)}
                            className="h-5 w-5 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested URLs */}
              <div>
                <div className="text-xs font-medium mb-2">URLs Sugeridas</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {urlInfo.suggestedUrls.slice(0, 6).map((url, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs font-mono max-w-40 truncate">{url}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(url)}
                          className="h-5 w-5 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(url, '_blank')}
                          className="h-5 w-5 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const debugInfo = {
                      environment: urlInfo.environment,
                      currentUrl: urlInfo.currentUrl,
                      detectedUrl: urlInfo.detectedUrl,
                      isValidRedirect: urlInfo.isValidRedirect,
                      urlParams,
                      suggestedUrls: urlInfo.suggestedUrls
                    }
                    copyToClipboard(JSON.stringify(debugInfo, null, 2))
                  }}
                  className="w-full text-xs"
                >
                  Copiar Todas as Informações
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}