# 🔧 CORREÇÃO CRÍTICA - OneSignal no App do Aluno

## 🚨 PROBLEMA IDENTIFICADO

O hook `useOneSignal.ts` no App do Aluno está **salvando o FCM/APNs token como Player ID**, resultando em registros inválidos no OneSignal.

**Linha problemática (69-74):**
```typescript
await PushNotifications.addListener('registration', (token) => {
  console.log('🔔 Push token:', token.value);
  setPushToken(token.value);
  setPlayerId(token.value); // ❌ ERRADO: FCM token não é Player ID!
  syncPlayerIdWithServer(token.value); // ❌ Salvando token errado
});
```

## ✅ SOLUÇÃO COMPLETA

### 1. Corrigir `src/hooks/useOneSignal.ts`

Substituir o listener `registration` por (linhas 69-102):

```typescript
await PushNotifications.addListener('registration', async (token) => {
  console.log('🔔 FCM/APNs Token capturado:', token.value);
  setPushToken(token.value);
  
  // ✅ CRÍTICO: Registrar no OneSignal para obter Player ID REAL
  if (user?.id) {
    try {
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      
      console.log('🔄 Registrando device no OneSignal...');
      const response = await fetch('https://onesignal.com/api/v1/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: appId,
          device_type: platformInfo.isIOS ? 0 : 1, // 0=iOS, 1=Android
          identifier: token.value, // FCM/APNs token
          language: 'pt-BR',
          timezone: -10800,
          tags: {
            user_id: user.id,
            user_type: 'student',
            platform: platformInfo.isIOS ? 'ios' : 'android'
          }
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.id) {
        console.log('✅ OneSignal Player ID obtido:', result.id);
        setPlayerId(result.id); // ✅ CORRETO: Player ID do OneSignal
        
        // Sincronizar com Supabase
        await syncPlayerIdWithServer(result.id);
      } else {
        console.error('❌ Erro ao registrar no OneSignal:', result);
      }
    } catch (error) {
      console.error('❌ Erro ao chamar OneSignal API:', error);
    }
  }
  
  setIsInitialized(true);
});
```

### 2. Verificar `.env` do App do Aluno

Confirmar que tem:
```env
VITE_SUPABASE_URL=https://bqbopkqzkavhmenjlhab.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ONESIGNAL_APP_ID=be1bd1f4-bd4f-4dc9-9c33-7b9f7fe5dc82
```

### 3. Confirmar Firebase/OneSignal (Android/iOS)

**Android:**
- `android/app/google-services.json` existe e está correto
- `android/app/build.gradle` tem: `apply plugin: 'com.google.gms.google-services'`

**iOS:**
- `ios/App/App/GoogleService-Info.plist` existe e está correto
- APNs certificate configurado no OneSignal Dashboard

### 4. Testar

1. Fazer login no App do Aluno
2. Aceitar permissão de notificações
3. Verificar console:
   ```
   ✅ OneSignal Player ID obtido: xxxx-xxxx-xxxx
   ✅ Token synced to Supabase
   ```
4. Verificar banco:
   ```sql
   SELECT id, email, onesignal_player_id, push_token
   FROM profiles
   WHERE id = 'seu-user-id';
   ```
   - `onesignal_player_id` deve ser UUID do OneSignal (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - `push_token` deve ser o FCM/APNs token (string longa)

5. No Dashboard, enviar notificação de teste
6. Verificar logs da Edge Function:
   ```bash
   supabase functions logs send-push
   ```
   Deve mostrar:
   ```
   ✓ User abcd1234...: HAS player_id (xxxx-xxxx...)
   Users with valid player_id: 1
   Success rate: 100%
   ```

## 📊 RESULTADO ESPERADO

**Antes:**
- `onesignal_player_id` = FCM token (inválido)
- Edge Function retorna 0 recipients
- Notificações não são entregues

**Depois:**
- `onesignal_player_id` = UUID do OneSignal (válido)
- Edge Function encontra destinatários
- Notificações são entregues com sucesso

## 🆘 TROUBLESHOOTING

### Problema: "Player ID não é salvo"
- Verificar se `VITE_ONESIGNAL_APP_ID` está correto
- Verificar se OneSignal API está respondendo (testar com Postman)
- Checar logs do console para erros

### Problema: "Notificação não chega no celular"
1. Verificar se device está registrado no OneSignal Dashboard
2. Checar se App ID está correto
3. Confirmar Firebase configuration (google-services.json / GoogleService-Info.plist)
4. Testar envio direto do OneSignal Dashboard para confirmar setup

### Problema: "Edge Function retorna 0 recipients"
- Confirmar que aluno abriu o app após a correção
- Verificar banco de dados (player_id deve ser UUID, não token)
- Checar logs da Edge Function para ver análise de dispositivos
