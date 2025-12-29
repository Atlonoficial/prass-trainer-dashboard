import { useState, useEffect } from 'react'

interface UrlInfo {
  currentUrl: string
  detectedUrl: string
  environment: 'sandbox' | 'localhost' | 'production' | 'preview'
  isValidRedirect: boolean
  suggestedUrls: string[]
}

export function useUrlDetection() {
  const [urlInfo, setUrlInfo] = useState<UrlInfo | null>(null)

  const detectEnvironmentUrls = () => {
    const currentUrl = window.location.href
    const urlObj = new URL(currentUrl)
    const hostname = urlObj.hostname
    const origin = urlObj.origin

    let environment: UrlInfo['environment'] = 'production'
    let detectedUrl = origin
    const suggestedUrls: string[] = []

    // Detecta ambiente sandbox do Lovable
    if (hostname.includes('sandbox.lovable.dev')) {
      environment = 'sandbox'
      detectedUrl = origin
      suggestedUrls.push(origin)
      suggestedUrls.push(`https://${hostname}`)
    }
    // Detecta ambiente preview
    else if (hostname.includes('lovable.app') || hostname.includes('preview')) {
      environment = 'preview'
      detectedUrl = origin
      suggestedUrls.push(origin)
    }
    // Detecta localhost
    else if (hostname.includes('localhost') || hostname === '127.0.0.1') {
      environment = 'localhost'
      const port = urlObj.port || '3000'
      detectedUrl = `http://localhost:${port}`
      
      // Múltiplas variações para localhost
      suggestedUrls.push(`http://localhost:${port}`)
      suggestedUrls.push(`http://127.0.0.1:${port}`)
      if (port !== '3000') {
        suggestedUrls.push('http://localhost:3000')
      }
    }
    // Produção ou domínio customizado
    else {
      environment = 'production'
      detectedUrl = origin
      suggestedUrls.push(origin)
      suggestedUrls.push(`https://${hostname}`)
    }

    // Adiciona variações de path
    const basePaths = ['/auth', '/', '/login']
    const allUrls: string[] = []
    
    suggestedUrls.forEach(baseUrl => {
      basePaths.forEach(path => {
        allUrls.push(`${baseUrl}${path}`)
      })
    })

    const isValidRedirect = environment !== 'localhost' || 
      (environment === 'localhost' && hostname === 'localhost')

    return {
      currentUrl,
      detectedUrl,
      environment,
      isValidRedirect,
      suggestedUrls: [...new Set(allUrls)] // Remove duplicatas
    }
  }

  const getRedirectUrl = (path: string = '/auth', returnTo?: string) => {
    if (!urlInfo) return `${window.location.origin}${path}`

    let fullPath = path
    if (returnTo) {
      const separator = path.includes('?') ? '&' : '?'
      fullPath = `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`
    }

    return `${urlInfo.detectedUrl}${fullPath}`
  }

  const getAllRedirectUrls = (path: string = '/auth', returnTo?: string) => {
    if (!urlInfo) return [`${window.location.origin}${path}`]

    return urlInfo.suggestedUrls.map(baseUrl => {
      let fullPath = path
      if (returnTo) {
        const separator = path.includes('?') ? '&' : '?'  
        fullPath = `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`
      }
      return `${baseUrl}${fullPath}`
    })
  }

  useEffect(() => {
    const info = detectEnvironmentUrls()
    setUrlInfo(info)
    
    console.log('[UrlDetection] Environment detected:', {
      environment: info.environment,
      currentUrl: info.currentUrl,
      detectedUrl: info.detectedUrl,
      isValidRedirect: info.isValidRedirect,
      suggestedUrls: info.suggestedUrls
    })
  }, [])

  return {
    urlInfo,
    getRedirectUrl,
    getAllRedirectUrls,
    detectEnvironmentUrls
  }
}