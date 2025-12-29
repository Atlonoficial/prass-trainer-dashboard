# External User IDs Implementation Guide

## Overview
Para garantir que as notificações push sejam entregues corretamente, o sistema agora utiliza External User IDs ao invés de Player IDs. Isso oferece maior controle e confiabilidade na segmentação e entrega de notificações.

## App do Aluno - Configuração Required

O app do aluno **DEVE** implementar a configuração do External User ID após o login do usuário:

```typescript
// No hook useOneSignal ou após autenticação bem-sucedida
import OneSignal from 'react-onesignal';

const configureOneSignalUser = async (userId: string) => {
  try {
    // Configurar External User ID
    await OneSignal.setExternalUserId(userId);
    console.log('OneSignal External User ID configured:', userId);
    
    // Opcional: adicionar tags para segmentação avançada
    await OneSignal.sendTags({
      user_type: 'student',
      last_login: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error configuring OneSignal External User ID:', error);
  }
};

// Chamar após login/autenticação
const { user } = useAuth();
useEffect(() => {
  if (user?.id) {
    configureOneSignalUser(user.id);
  }
}, [user]);
```

## Dashboard do Professor - Segmentação

O sistema de notificações no dashboard do professor agora suporta:

### Segmentos Automáticos:
- **Todos**: Todos os alunos do professor
- **Ativos**: Alunos com atividade nos últimos 30 dias
- **Inativos**: Alunos sem atividade há mais de 30 dias  
- **Novos**: Alunos cadastrados nos últimos 7 dias

### Segmentação Customizada:
- **IDs Específicos**: Lista de User IDs separados por vírgula

## Edge Function `/send-push`

A nova Edge Function simplificada:

### Endpoint:
```
POST /functions/v1/send-push
```

### Payload:
```json
{
  "title": "Título da notificação",
  "message": "Mensagem da notificação", 
  "segment": "all" | "ativos" | "inativos" | "novos" | "custom",
  "externalUserIds": ["user-id-1", "user-id-2"] // Opcional, apenas para segment: "custom"
}
```

### Response:
```json
{
  "success": true,
  "notification_id": "onesignal-notification-id",
  "recipients": 123,
  "segment": "all",
  "message": "Notification sent successfully to 123 devices"
}
```

## Segurança

- ✅ REST API Key protegida no servidor (Supabase Secrets)
- ✅ App ID pode ser público no frontend se necessário
- ✅ Validação de autorização (apenas professores podem enviar)
- ✅ Segmentação baseada em relacionamento professor-aluno
- ✅ Logs detalhados para auditoria

## Troubleshooting

### Notifications not being delivered:
1. Verificar se External User ID está sendo configurado no app do aluno
2. Confirmar que as Supabase Secrets estão configuradas corretamente
3. Verificar logs da Edge Function para erros
4. Confirmar que os usuários estão com notificações habilitadas no dispositivo

### Segmentation not working:
1. Verificar dados na tabela `students` (relacionamento professor-aluno)
2. Confirmar que `last_activity` está sendo atualizada
3. Verificar queries de segmentação na Edge Function

## Migration from Legacy System

O campo `onesignal_player_id` na tabela `profiles` é mantido apenas para auditoria. O sistema agora utiliza External User IDs que são mais confiáveis e não dependem de sincronização manual.

## Next Steps

1. ✅ Configurar Supabase Secrets com OneSignal credentials
2. ✅ Publicar app do aluno com External User ID configuration 
3. ✅ Testar notificações end-to-end
4. ✅ Monitorar métricas de entrega
5. ✅ Configurar automações futuras (triggers, scheduling)