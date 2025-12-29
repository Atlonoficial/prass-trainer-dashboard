# 🔔 Configuração OneSignal - App do Aluno

## ⚠️ CONFIGURAÇÃO OBRIGATÓRIA

Este guia detalha como configurar notificações push no **App do Aluno** usando OneSignal. Sem esta configuração, os alunos **NÃO receberão notificações** enviadas pelo professor.

---

## 📋 Pré-requisitos

### 1. OneSignal App ID
- ✅ Mesmo App ID usado no Dashboard do Professor
- ✅ Configurado em `.env`:
```env
VITE_ONESIGNAL_APP_ID=seu-app-id-aqui
```

### 2. Dependências Instaladas
```bash
npm install @capacitor/push-notifications
# OneSignal SDK já está incluído via CDN no index.html
```

### 3. Sistema de Autenticação Funcionando
- O aluno precisa estar logado (ter `user.id`)
- O `user.id` será usado como `External User ID` no OneSignal

---

## 🚀 Implementação Passo a Passo

### Passo 1: Copiar Hook `useOneSignal`

**Arquivo:** `src/hooks/useOneSignal.ts`

✅ **O hook já existe no projeto do Dashboard do Professor**

Copie o arquivo completo para o App do Aluno. Este hook gerencia:
- Inicialização do OneSignal Web SDK
- Captura do Player ID
- Sincronização com Supabase
- Suporte a plataformas nativas (iOS/Android)

---

### Passo 2: Criar Componente Inicializador

**Arquivo:** `src/components/OneSignalInitializer.tsx` (CRIAR NO APP DO ALUNO)

```typescript
import { useEffect } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useAuth } from '@/hooks/useAuth'; // Ou seu hook de autenticação
import { toast } from 'sonner';

export function OneSignalInitializer() {
  const { user } = useAuth();
  const {
    isInitialized,
    initializeOneSignal,
    requestPermission,
    setExternalUserId,
    syncPlayerIdWithServer,
    capturePlayerId,
    playerId,
    loading,
    initError,
    platform,
  } = useOneSignal();

  // 1. Inicializar OneSignal ao carregar o app
  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

    if (!appId || appId === 'YOUR_ONESIGNAL_APP_ID_HERE') {
      console.error('❌ VITE_ONESIGNAL_APP_ID não configurado!');
      toast.error('Notificações indisponíveis: configuração faltando');
      return;
    }

    if (!isInitialized && !loading) {
      console.log('🔔 Inicializando OneSignal no App do Aluno...');
      
      initializeOneSignal({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
      });
    }
  }, [isInitialized, loading, initializeOneSignal]);

  // 2. Configurar External User ID após login
  useEffect(() => {
    if (user?.id && isInitialized) {
      console.log('🔔 Configurando External User ID:', user.id);
      setExternalUserId(user.id);
    }
  }, [user?.id, isInitialized, setExternalUserId]);

  // 3. Sincronizar Player ID com Supabase
  useEffect(() => {
    if (user?.id && isInitialized && playerId) {
      console.log('🔔 Sincronizando Player ID com Supabase:', playerId);
      syncPlayerIdWithServer(playerId);
    }
  }, [user?.id, isInitialized, playerId, syncPlayerIdWithServer]);

  // 4. Solicitar permissão automaticamente (opcional)
  useEffect(() => {
    if (isInitialized && user?.id && !playerId) {
      console.log('🔔 Solicitando permissão de notificação...');
      
      // Aguardar 2 segundos antes de solicitar
      const timer = setTimeout(async () => {
        const granted = await requestPermission();
        
        if (granted) {
          toast.success('Notificações ativadas!', {
            description: `Você receberá notificações no ${platform}`,
          });
          
          // Forçar captura do Player ID
          setTimeout(() => capturePlayerId(), 1000);
        } else {
          toast.error('Notificações bloqueadas', {
            description: 'Ative nas configurações do navegador para receber notificações',
            duration: 8000,
          });
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isInitialized, user?.id, playerId, requestPermission, capturePlayerId, platform]);

  // Mostrar erros de inicialização
  useEffect(() => {
    if (initError) {
      console.error('❌ Erro OneSignal:', initError);
      toast.error('Erro ao ativar notificações', {
        description: initError,
      });
    }
  }, [initError]);

  return null; // Este é um componente de lógica apenas
}
```

---

### Passo 3: Adicionar ao App Principal

**Arquivo:** `src/App.tsx` (NO APP DO ALUNO)

```typescript
import { OneSignalInitializer } from '@/components/OneSignalInitializer';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          
          {/* ✅ ADICIONAR AQUI */}
          <OneSignalInitializer />
          
          <BrowserRouter>
            <Routes>
              {/* suas rotas */}
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

---

### Passo 4: (Opcional) Botão Manual de Ativação

Se preferir não solicitar permissão automaticamente, adicione um botão:

**Arquivo:** `src/components/NotificationButton.tsx` (CRIAR)

```typescript
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { toast } from 'sonner';

export function NotificationButton() {
  const {
    isInitialized,
    playerId,
    loading,
    requestPermission,
    capturePlayerId,
    syncPlayerIdWithServer,
    platform,
  } = useOneSignal();

  const handleActivate = async () => {
    if (!isInitialized) {
      toast.error('OneSignal não inicializado');
      return;
    }

    const granted = await requestPermission();
    
    if (granted) {
      toast.success('Notificações ativadas!', {
        description: `Você receberá notificações no ${platform}`,
      });
      
      // Capturar Player ID e sincronizar
      setTimeout(async () => {
        const id = await capturePlayerId();
        if (id) {
          await syncPlayerIdWithServer(id);
        }
      }, 1000);
    } else {
      toast.error('Permissão negada', {
        description: 'Ative nas configurações do navegador',
        duration: 8000,
      });
    }
  };

  if (loading) {
    return (
      <Button disabled variant="outline">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Carregando...
      </Button>
    );
  }

  if (playerId) {
    return (
      <Button disabled variant="outline">
        <Bell className="w-4 h-4 mr-2" />
        Notificações Ativas
      </Button>
    );
  }

  return (
    <Button onClick={handleActivate} variant="default">
      <BellOff className="w-4 h-4 mr-2" />
      Ativar Notificações
    </Button>
  );
}
```

**Uso:**
```typescript
import { NotificationButton } from '@/components/NotificationButton';

<NotificationButton />
```

---

## 🔍 Verificação e Debug

### Console Logs Esperados (Sucesso)

```
🔔 Inicializando OneSignal no App do Aluno...
OneSignal: Starting initialization...
OneSignal: Initialization completed successfully
✅ OneSignal: SDK detected and already initialized
🔔 Configurando External User ID: 1adbd8ee-fc70-46d4-9187-ad69b523eb11
🔔 OneSignal: Player ID captured: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
🔔 Sincronizando Player ID com Supabase: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✅ Token synced successfully to profiles table
Notificações ativadas (web/android/ios)
```

### Verificar no Banco de Dados

```sql
-- Verificar se o aluno tem Player ID registrado
SELECT 
  p.email,
  p.onesignal_player_id,
  p.platform,
  p.push_token,
  CASE 
    WHEN p.onesignal_player_id IS NOT NULL THEN '✅ Configurado'
    ELSE '❌ Sem Player ID'
  END as status
FROM profiles p
WHERE id = 'ID_DO_ALUNO';
```

**Resultado esperado:**
```
email: aluno@example.com
onesignal_player_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
platform: web (ou android/ios)
push_token: NULL (ou FCM token se nativo)
status: ✅ Configurado
```

### Verificar no OneSignal Dashboard

1. Acesse [https://onesignal.com/](https://onesignal.com/)
2. Abra seu App
3. Vá para **Audience** → **All Users**
4. Procure pelo `External User ID` = `user.id` do aluno
5. Deve aparecer com status **"Subscribed"**

---

## 🐛 Troubleshooting

### ❌ Player ID não é capturado

**Sintomas:**
```
OneSignal: Permission not granted, Player ID not available
```

**Solução:**
1. Verificar se permissão foi concedida no navegador
2. Chrome: `chrome://settings/content/notifications`
3. Garantir que o site está na lista de **Permitidos**
4. Tentar solicitar permissão novamente

---

### ❌ External User ID não é configurado

**Sintomas:**
```
OneSignal: No user logged in
```

**Solução:**
1. Garantir que `user.id` existe após login
2. Verificar se `useAuth()` ou seu hook de autenticação retorna o user
3. Adicionar log: `console.log('User ID:', user?.id)`

---

### ❌ Sincronização com Supabase falha

**Sintomas:**
```
OneSignal: Sync failed: undefined
```

**Possíveis causas:**
1. **Tabela `profiles` não tem coluna `onesignal_player_id`**
   
   **Solução - Migration:**
   ```sql
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT,
   ADD COLUMN IF NOT EXISTS push_token TEXT,
   ADD COLUMN IF NOT EXISTS platform TEXT;
   ```

2. **RLS Policy bloqueando UPDATE**
   
   **Solução - Policy:**
   ```sql
   CREATE POLICY "Users can update own profile"
   ON profiles FOR UPDATE
   USING (auth.uid() = id)
   WITH CHECK (auth.uid() = id);
   ```

3. **Usuário não autenticado**
   
   Verificar: `const { data: { session } } = await supabase.auth.getSession();`

---

### ❌ Notificações não aparecem no dispositivo

**Checklist:**
1. ✅ Player ID registrado no banco? (query SQL acima)
2. ✅ External User ID configurado? (OneSignal Dashboard → Audience)
3. ✅ Permissão concedida? (Configurações do navegador)
4. ✅ Professor está enviando para o `segment` correto?
5. ✅ Edge Function `send-push` está funcionando? (verificar logs)

**Teste manual:**
1. Acesse [OneSignal Dashboard](https://onesignal.com/)
2. Vá para **Messages** → **New Push**
3. Envie notificação de teste para o `External User ID` do aluno
4. Se funcionar aqui mas não pelo professor → problema na Edge Function
5. Se não funcionar nem aqui → problema na configuração do aluno

---

## 📱 Suporte a Plataformas Nativas (iOS/Android)

O hook `useOneSignal` já detecta automaticamente se está rodando em:
- **Web**: Usa OneSignal Web SDK
- **Android/iOS**: Usa Capacitor Push Notifications

### Configuração adicional para Capacitor:

1. Adicionar plugin no `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.aluno',
  appName: 'App do Aluno',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

2. Sincronizar:
```bash
npx cap sync
```

3. Configurar FCM (Firebase Cloud Messaging) para Android
4. Configurar APNs (Apple Push Notification service) para iOS

---

## ✅ Checklist Final

Antes de considerar a configuração completa, verifique:

### No Código do App do Aluno:
- [ ] Hook `useOneSignal.ts` copiado
- [ ] Componente `OneSignalInitializer.tsx` criado
- [ ] Inicializador adicionado ao `App.tsx`
- [ ] `VITE_ONESIGNAL_APP_ID` configurado no `.env`

### No Navegador (após login):
- [ ] Console mostra "✅ OneSignal inicializado"
- [ ] Console mostra "✅ External User ID configurado"
- [ ] Console mostra "✅ Player ID captured"
- [ ] Console mostra "✅ Token synced successfully"
- [ ] Toast de sucesso aparece

### No Banco de Dados:
- [ ] Query SQL mostra `onesignal_player_id` preenchido
- [ ] `platform` está correto (web/android/ios)

### No OneSignal Dashboard:
- [ ] Usuário aparece em **Audience** → **All Users**
- [ ] Status é **"Subscribed"**
- [ ] `External User ID` = `user.id` do Supabase

### Teste End-to-End:
- [ ] Professor envia notificação de teste
- [ ] Edge Function executa sem erros (verificar logs)
- [ ] Notificação aparece no dispositivo do aluno
- [ ] Notification é salva na tabela `notifications`

---

## 📞 Suporte

Se após seguir todos os passos o sistema ainda não funcionar:

1. **Verificar Edge Function Logs:**
   ```bash
   supabase functions logs send-push --project-ref seu-project-ref
   ```

2. **Verificar OneSignal Delivery Logs:**
   - OneSignal Dashboard → **Delivery** → **View Details**

3. **Console Logs Detalhados:**
   - Abrir DevTools (F12)
   - Aba Console
   - Filtrar por "OneSignal"
   - Copiar e enviar logs completos

---

## 🎯 Resumo

**O que o App do Aluno DEVE fazer:**
1. ✅ Inicializar OneSignal ao abrir
2. ✅ Configurar External User ID ao fazer login
3. ✅ Solicitar permissão de notificação
4. ✅ Capturar Player ID
5. ✅ Sincronizar Player ID com Supabase

**O que o Professor faz:**
1. Envia notificação pelo Dashboard
2. Edge Function busca `onesignal_player_id` do aluno no banco
3. Edge Function chama OneSignal API
4. OneSignal entrega para o dispositivo do aluno

**Fluxo completo:**
```
Professor → Dashboard → Edge Function → Supabase (busca player_id)
                                    ↓
                              OneSignal API
                                    ↓
                         Dispositivo do Aluno
```

---

**Data:** 2025
**Versão:** 1.0.0
**OneSignal SDK:** v16
