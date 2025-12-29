import { supabase } from '@/integrations/supabase/client'

interface AuthDebugLog {
  timestamp: Date
  event: string
  data: any
  level: 'info' | 'warn' | 'error'
}

class AuthDebugger {
  private logs: AuthDebugLog[] = []
  private maxLogs = 100
  private isEnabled = true

  constructor() {
    // Só habilita debug em desenvolvimento
    this.isEnabled = window.location.hostname === 'localhost' || 
                    window.location.hostname.includes('lovable')
    
    if (this.isEnabled) {
      console.log('[AuthDebugger] Debug de autenticação habilitado')
      this.setupAuthListeners()
    }
  }

  private setupAuthListeners() {
    // Monitora todos os eventos de autenticação
    supabase.auth.onAuthStateChange((event, session) => {
      this.log('auth_state_change', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at
      }, 'info')
    })
  }

  log(event: string, data: any, level: 'info' | 'warn' | 'error' = 'info') {
    if (!this.isEnabled) return

    const logEntry: AuthDebugLog = {
      timestamp: new Date(),
      event,
      data,
      level
    }

    this.logs.push(logEntry)
    
    // Mantém apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Log no console com formatação
    const timeStr = logEntry.timestamp.toLocaleTimeString()
    const prefix = `[AuthDebug:${timeStr}]`
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${event}:`, data)
        break
      case 'warn':
        console.warn(`${prefix} ${event}:`, data)
        break
      default:
        console.log(`${prefix} ${event}:`, data)
        break
    }
  }

  getLogs(filter?: { event?: string, level?: 'info' | 'warn' | 'error' }): AuthDebugLog[] {
    let filteredLogs = this.logs

    if (filter?.event) {
      filteredLogs = filteredLogs.filter(log => log.event.includes(filter.event!))
    }

    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level)
    }

    return filteredLogs.slice(-50) // Últimos 50 logs
  }

  getAuthSummary() {
    return {
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.level === 'error').length,
      warningCount: this.logs.filter(log => log.level === 'warn').length,
      lastActivity: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
      recentEvents: this.logs.slice(-10).map(log => ({
        time: log.timestamp.toLocaleTimeString(),
        event: log.event,
        level: log.level
      }))
    }
  }

  clearLogs() {
    this.logs = []
    console.log('[AuthDebugger] Logs limpos')
  }

  async runDiagnostics() {
    this.log('diagnostics_started', {}, 'info')

    const diagnostics = {
      timestamp: new Date(),
      supabaseConfig: 'YOUR_PROJECT_ID.supabase.co',
      localStorage: {},
      session: null,
      user: null,
      connectivity: false,
      errors: []
    }

    try {
      // Verifica localStorage
      const authKeys = ['supabase.auth.token', 'sb-YOUR_PROJECT_ID-auth-token']
      authKeys.forEach(key => {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const parsed = JSON.parse(item)
            diagnostics.localStorage[key] = {
              hasAccessToken: !!parsed.access_token,
              hasRefreshToken: !!parsed.refresh_token,
              expiresAt: parsed.expires_at,
              size: item.length
            }
          }
        } catch (error) {
          diagnostics.localStorage[key] = { error: 'Invalid JSON' }
        }
      })

      // Testa conectividade
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        diagnostics.errors.push(`Session Error: ${sessionError.message}`)
      } else {
        diagnostics.session = sessionData.session ? {
          hasUser: !!sessionData.session.user,
          expiresAt: sessionData.session.expires_at,
          provider: sessionData.session.user?.app_metadata?.provider
        } : null
        diagnostics.connectivity = true
      }

      // Testa user atual
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        diagnostics.errors.push(`User Error: ${userError.message}`)
      } else {
        diagnostics.user = userData.user ? {
          id: userData.user.id,
          email: userData.user.email,
          emailConfirmed: !!userData.user.email_confirmed_at,
          lastSignIn: userData.user.last_sign_in_at
        } : null
      }

    } catch (error: any) {
      diagnostics.errors.push(`Diagnostic Error: ${error.message}`)
    }

    this.log('diagnostics_completed', diagnostics, 'info')
    return diagnostics
  }

  exportLogs(): string {
    return JSON.stringify({
      exportedAt: new Date(),
      summary: this.getAuthSummary(),
      logs: this.getLogs()
    }, null, 2)
  }

  // Expõe métodos no window para debug manual
  exposeDebugMethods() {
    if (!this.isEnabled) return

    (window as any).authDebug = {
      getLogs: this.getLogs.bind(this),
      getSummary: this.getAuthSummary.bind(this),
      clearLogs: this.clearLogs.bind(this),
      runDiagnostics: this.runDiagnostics.bind(this),
      exportLogs: this.exportLogs.bind(this)
    }

    console.log('[AuthDebugger] Métodos de debug expostos em window.authDebug')
  }
}

// Singleton instance
export const authDebugger = new AuthDebugger()

// Auto-expose methods in development
if (authDebugger) {
  authDebugger.exposeDebugMethods()
}

// Função auxiliar para log rápido
export const debugAuth = (event: string, data: any, level: 'info' | 'warn' | 'error' = 'info') => {
  authDebugger.log(event, data, level)
}

export default authDebugger