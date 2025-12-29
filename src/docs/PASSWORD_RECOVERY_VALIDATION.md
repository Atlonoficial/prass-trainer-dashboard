# Validação do Sistema de Recuperação de Senha

## Checklist de Validação

### ✅ Configurações Obrigatórias
- [ ] Site URL configurado no Supabase
- [ ] Redirect URLs configuradas (produção e preview)
- [ ] Template de email personalizado configurado

### ✅ Fluxo de Recuperação
1. **Página de Login** (`/auth`)
   - [ ] Botão "Esqueceu a senha?" funcional
   - [ ] Campo de email obrigatório antes de enviar
   - [ ] Feedback visual durante envio

2. **Envio de Email**
   - [ ] Email enviado com sucesso
   - [ ] Toast de confirmação exibido
   - [ ] Rate limiting funcionando (máx 3 tentativas)
   
3. **Processamento do Link**
   - [ ] Link do email redireciona para `/auth?type=recovery&...`
   - [ ] Tokens são processados automaticamente
   - [ ] Página entra em modo "reset" automaticamente

4. **Redefinição de Senha**
   - [ ] Campos de nova senha aparecem
   - [ ] Validação de senha (mín 8 caracteres)
   - [ ] Confirmação de senha funcional
   - [ ] Botão de atualizar funcional

5. **Finalização**
   - [ ] Senha atualizada com sucesso
   - [ ] Toast de sucesso exibido
   - [ ] Redirecionamento para dashboard
   - [ ] Login automático funcional

### ✅ Logs de Debugging
No console do navegador, você deve ver:
```
[TokenProcessor] Parâmetros detectados: {...}
[AuthPage] Auth event: PASSWORD_RECOVERY
[AuthPage] Token de recovery detectado - ativando modo reset
[AuthRecovery] Iniciando atualização de senha
[AuthRecovery] Atualizando senha
```

### ✅ Cenários de Erro
- [ ] Link expirado (> 1 hora) - deve mostrar erro apropriado
- [ ] Link inválido - deve redirecionar para solicitação
- [ ] Rate limiting - deve impedir múltiplas solicitações
- [ ] Senha fraca - deve rejeitar com feedback
- [ ] Senhas não conferem - deve rejeitar com feedback

### ✅ Integração com Sistema
- [ ] Supabase auth state é atualizado corretamente
- [ ] Sessão é estabelecida após reset
- [ ] Redirecionamento preserva `returnTo` se presente
- [ ] Página funciona em diferentes ambientes (preview/produção)

## Como Testar

1. **Vá para** `/auth`
2. **Digite** um email válido de usuário existente
3. **Clique** "Esqueceu a senha?"
4. **Verifique** email e clique no link
5. **Confirme** que redireciona para `/auth` em modo reset
6. **Digite** nova senha (mín 8 chars)
7. **Confirme** a senha
8. **Clique** "Atualizar senha"
9. **Verifique** redirecionamento para dashboard

## Solução de Problemas

### "requested path is invalid"
- Configurar URLs no Supabase (ver SUPABASE_AUTH_SETUP.md)

### Link não funciona
- Verificar template de email
- Confirmar que tokens estão na URL

### Não entra em modo reset
- Verificar logs do `useTokenProcessor`
- Confirmar que `type=recovery` está na URL

### Senha não atualiza
- Verificar logs do `useAuthRecovery`
- Confirmar que usuário está autenticado após processar token