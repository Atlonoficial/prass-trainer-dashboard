# Configuração do Sistema de Autenticação Supabase

## Configurações Obrigatórias no Painel Supabase

Para que o sistema de recuperação de senha funcione corretamente, você **DEVE** configurar as seguintes URLs no painel do Supabase:

### 1. Acesse Authentication > URL Configuration

### 2. Configure o Site URL
```
https://5ad14ac5-85f4-43a9-9f6d-5952227da3f2.lovableproject.com
```

### 3. Configure as Redirect URLs (adicione TODAS)
```
https://5ad14ac5-85f4-43a9-9f6d-5952227da3f2.lovableproject.com/auth
https://5ad14ac5-85f4-43a9-9f6d-5952227da3f2.lovableproject.com/auth?type=recovery
https://5ad14ac5-85f4-43a9-9f6d-5952227da3f2.lovableproject.com/email/reset-password
https://id-preview--5ad14ac5-85f4-43a9-9f6d-5952227da3f2.lovable.app/auth
https://id-preview--5ad14ac5-85f4-43a9-9f6d-5952227da3f2.lovable.app/auth?type=recovery
```

### 4. Templates de Email (Authentication > Email Templates)

#### Recovery Email Template
Personalize o template de recuperação para garantir que os links redirecionem corretamente:

```html
<h2>Redefinir senha</h2>
<p>Clique no link abaixo para redefinir sua senha:</p>
<p><a href="{{ .SiteURL }}/auth?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}">Redefinir senha</a></p>
<p>Ou copie e cole esta URL no seu navegador:</p>
<p>{{ .SiteURL }}/auth?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}</p>
<p>Este link expira em 1 hora.</p>
```

## Fluxo de Recovery Implementado

1. **Solicitação**: Usuário clica "Esqueceu a senha?" na página `/auth`
2. **Email**: Sistema envia email com link para `/auth?type=recovery&...`
3. **Processamento**: `useTokenProcessor` processa os tokens automaticamente
4. **Interface**: `AuthPage` detecta o token e ativa modo de redefinição
5. **Atualização**: Usuário define nova senha usando `useAuthRecovery`
6. **Redirect**: Após sucesso, redireciona para dashboard

## Debugging

### Console Logs
O sistema gera logs detalhados no console para debugging:
- `[TokenProcessor]` - Processamento de tokens da URL
- `[AuthPage]` - Eventos de autenticação e mudanças de estado
- `[AuthRecovery]` - Operações de recuperação de senha

### Problemas Comuns

#### "requested path is invalid"
- Verifique se todas as URLs estão configuradas no Supabase
- Certifique-se que o Site URL está correto

#### "localhost:3000" no redirect
- Configure as URLs de produção no Supabase
- Verifique o template de email

#### Token não processado
- Verifique se os parâmetros estão na URL
- Confirme que o `useTokenProcessor` está sendo executado

## URLs do Painel Supabase

- [URL Configuration](https://supabase.com/dashboard/project/bqbopkqzkavhmenjlhab/auth/url-configuration)
- [Email Templates](https://supabase.com/dashboard/project/bqbopkqzkavhmenjlhab/auth/templates)
- [Users](https://supabase.com/dashboard/project/bqbopkqzkavhmenjlhab/auth/users)