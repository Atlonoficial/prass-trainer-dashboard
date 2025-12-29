# ✅ Checklist de Validação - Sistema de Pagamentos

## 🔧 Configuração Inicial

### Mercado Pago
- [ ] Access Token de **PRODUÇÃO** inserido
- [ ] `is_sandbox: false` (modo produção ativo)
- [ ] `is_active: true` (sistema ativo)
- [ ] Credenciais testadas com sucesso via "Testar Credenciais"
- [ ] Webhook registrado no Mercado Pago
- [ ] URL do webhook: `https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/process-payment-webhook`

### Banco de Dados
- [ ] Tabela `system_payment_config` com registro ativo
- [ ] Tabela `active_subscriptions` criada e com RLS
- [ ] Tabela `payment_transactions` criada e com RLS
- [ ] Tabela `plan_catalog` com planos cadastrados
- [ ] Cron jobs configurados (2 AM, 10 AM, 12 PM)

### Edge Functions
- [ ] `create-checkout-session` deployada
- [ ] `process-payment-webhook` deployada
- [ ] `check-expired-subscriptions` deployada
- [ ] `send-expiry-reminders` deployada
- [ ] `auto-renew-subscriptions` deployada

---

## 👨‍🏫 Projeto Principal (Professor)

### Dashboard Admin
- [ ] Admin consegue acessar `/admin/payment-config`
- [ ] Admin vê status "Sistema Ativo" verde
- [ ] Admin consegue acessar `/payment-management`
- [ ] Dashboard mostra métricas de pagamento
- [ ] Gráficos de receita aparecem corretamente

### Gerenciamento de Planos
- [ ] Admin consegue criar novos planos em `/plans`
- [ ] Planos aparecem com status "Ativo"
- [ ] Features dos planos são salvas corretamente

### Visualização de Alunos
- [ ] Admin vê lista de alunos com status de pagamento
- [ ] Status "Pago", "Vencendo", "Atrasado" aparecem corretos
- [ ] Admin consegue ver histórico de transações por aluno

---

## 🎓 Projeto do Aluno (Web)

### Autenticação
- [ ] Aluno consegue fazer login
- [ ] Sessão persiste após recarregar página
- [ ] Logout funciona corretamente

### Página de Planos (`/plans`)
- [ ] Página carrega sem erros
- [ ] Todos os planos ativos aparecem
- [ ] Preços estão corretos
- [ ] Features dos planos são exibidas
- [ ] Badge "Mais Popular" aparece se configurado

### Checkout
- [ ] Botão "PIX" abre checkout do Mercado Pago
- [ ] Botão "Cartão de Crédito" abre checkout
- [ ] Botão "Boleto" abre checkout
- [ ] Checkout abre em nova aba (web)
- [ ] QR Code do PIX é gerado
- [ ] Dados do comprador são preenchidos automaticamente

### Webhook e Processamento
- [ ] Após pagamento via PIX, webhook processa em ~30 segundos
- [ ] Status da transação muda para "paid"
- [ ] Registro é criado em `active_subscriptions`
- [ ] `end_date` é calculado corretamente (30 dias)
- [ ] Notificação é enviada ao aluno

### Página de Assinatura (`/my-subscription`)
- [ ] Página carrega dados da assinatura
- [ ] Nome do plano aparece correto
- [ ] Data de vencimento está correta
- [ ] Badge "Ativa" aparece verde
- [ ] Componente de renovação automática é exibido

### Renovação Automática
- [ ] Toggle "Renovação Automática" funciona
- [ ] Estado persiste no banco de dados
- [ ] Mensagem de confirmação aparece ao ativar/desativar

### Proteção de Rotas
- [ ] Rotas protegidas bloqueiam sem assinatura
- [ ] Mensagem "Acesso Restrito" aparece
- [ ] Botão "Ver Planos" redireciona para `/plans`
- [ ] Rotas são liberadas após pagamento aprovado
- [ ] Acesso é bloqueado novamente após vencimento

### Sincronização Realtime
- [ ] Dados atualizam automaticamente ao pagar
- [ ] Não é necessário recarregar página
- [ ] Status muda em tempo real

---

## 📱 Projeto do Aluno (Mobile - Capacitor)

### Build e Deploy
- [ ] `npm run build` executa sem erros
- [ ] `npx cap sync` sincroniza assets
- [ ] App abre no Android Emulator
- [ ] App abre no iOS Simulator (se testando iOS)

### Autenticação Mobile
- [ ] Login funciona no app
- [ ] Sessão persiste ao fechar/reabrir app
- [ ] Token é armazenado corretamente

### Checkout Mobile
- [ ] Botão de pagamento abre Browser nativo
- [ ] Browser abre com URL do Mercado Pago
- [ ] QR Code é exibido corretamente no mobile
- [ ] Checkout não trava o app

### Deep Linking
- [ ] Deep link está configurado em `capacitor.config.ts`
- [ ] Após pagamento, app recebe deep link
- [ ] App retorna para tela correta (`/payment-success`)
- [ ] Parâmetros `status` e `transaction_id` são recebidos

### Performance Mobile
- [ ] App carrega em menos de 3 segundos
- [ ] Navegação é fluida
- [ ] Não há memory leaks
- [ ] Sincronização funciona offline (cache)

### Notificações Push (se OneSignal configurado)
- [ ] OneSignal está inicializado
- [ ] Permissão de notificação é solicitada
- [ ] External User ID é configurado no login
- [ ] Notificações de vencimento são recebidas
- [ ] Clicar na notificação abre o app

---

## 🔄 Fluxos Automatizados

### Lembretes de Vencimento
- [ ] Lembrete 7 dias antes é enviado
- [ ] Lembrete 3 dias antes é enviado
- [ ] Lembrete 1 dia antes é enviado
- [ ] E-mail ou notificação push é recebido
- [ ] Mensagem está clara e contém link para renovar

### Expiração de Assinatura
- [ ] Status muda para "expired" no dia seguinte ao vencimento
- [ ] Acesso ao conteúdo é bloqueado automaticamente
- [ ] Mensagem de "Assinatura Vencida" aparece
- [ ] Aluno é redirecionado para `/plans`

### Auto-Renovação
- [ ] Assinatura com `auto_renew: true` renova automaticamente
- [ ] Nova transação é criada em `payment_transactions`
- [ ] `end_date` é estendido por mais 30 dias
- [ ] Aluno recebe notificação de renovação bem-sucedida
- [ ] Se pagamento falhar, aluno é notificado

---

## 🔐 Segurança

### RLS Policies
- [ ] Aluno só vê suas próprias assinaturas
- [ ] Aluno só vê suas próprias transações
- [ ] Aluno não consegue modificar `active_subscriptions`
- [ ] Aluno não consegue criar transações manualmente
- [ ] Teacher consegue ver assinaturas de seus alunos

### Edge Functions
- [ ] Todas as Edge Functions validam JWT
- [ ] `create-checkout-session` valida `student_id`
- [ ] `process-payment-webhook` valida idempotência
- [ ] Access Token do Mercado Pago não é exposto no frontend
- [ ] Logs não exibem dados sensíveis

### Rate Limiting
- [ ] Tentativas de checkout são limitadas
- [ ] Webhook processa apenas eventos únicos
- [ ] Cron jobs têm timeout configurado

---

## 📊 Monitoramento

### Logs do Supabase
- [ ] Logs de Edge Functions estão disponíveis
- [ ] Não há erros críticos nos últimos 7 dias
- [ ] Webhooks aparecem nos logs de `process-payment-webhook`

### Logs do Mercado Pago
- [ ] Webhook está "ativo" no painel do Mercado Pago
- [ ] Últimas requisições mostram status 200
- [ ] Não há webhooks com falha recorrente

### Auditoria
- [ ] Todas operações são registradas em `payment_audit_log`
- [ ] `old_data` e `new_data` são salvos corretamente
- [ ] Logs incluem `user_id` do responsável pela ação

### Cron Jobs
- [ ] `check_expired_subscriptions` executa às 2 AM
- [ ] `send_expiry_reminders` executa às 10 AM
- [ ] `auto_renew_subscriptions` executa ao meio-dia
- [ ] Logs mostram execução bem-sucedida

---

## 🧪 Testes de Integração

### Teste 1: Compra de Plano com PIX
1. [ ] Fazer login como aluno
2. [ ] Acessar `/plans`
3. [ ] Selecionar plano "Básico" (ou menor valor)
4. [ ] Escolher PIX
5. [ ] Escanear QR Code ou copiar código PIX
6. [ ] Efetuar pagamento
7. [ ] Aguardar 30 segundos
8. [ ] Verificar em `/my-subscription` que assinatura aparece
9. [ ] Tentar acessar conteúdo protegido (deve permitir)

### Teste 2: Renovação Manual
1. [ ] Ter assinatura próxima do vencimento
2. [ ] Receber notificação de vencimento
3. [ ] Clicar em "Renovar Agora"
4. [ ] Completar pagamento
5. [ ] Verificar que `end_date` foi estendido

### Teste 3: Auto-Renovação
1. [ ] Ativar toggle "Renovação Automática"
2. [ ] Simular vencimento (via SQL: `UPDATE active_subscriptions SET end_date = CURRENT_DATE`)
3. [ ] Aguardar cron job rodar (ou executar manualmente)
4. [ ] Verificar que nova transação foi criada
5. [ ] Verificar que `end_date` foi estendido

### Teste 4: Bloqueio por Vencimento
1. [ ] Ter assinatura ativa
2. [ ] Simular vencimento (via SQL)
3. [ ] Rodar Edge Function de expiração
4. [ ] Verificar que status mudou para "expired"
5. [ ] Tentar acessar conteúdo protegido (deve bloquear)
6. [ ] Verificar mensagem de acesso restrito

### Teste 5: Sincronização Realtime (Web)
1. [ ] Abrir app em duas abas
2. [ ] Na Aba 1, fazer pagamento
3. [ ] Aguardar webhook processar
4. [ ] Verificar que Aba 2 atualiza automaticamente
5. [ ] Verificar que não é necessário recarregar

### Teste 6: Deep Link (Mobile)
1. [ ] Fazer checkout no app mobile
2. [ ] Completar pagamento no Browser
3. [ ] Verificar que app retorna automaticamente
4. [ ] Verificar que tela de sucesso é exibida

---

## 📈 Métricas de Sucesso

### Performance
- [ ] Checkout carrega em < 2 segundos
- [ ] Webhook processa em < 30 segundos
- [ ] App mobile carrega em < 3 segundos
- [ ] Sincronização Realtime ocorre em < 5 segundos

### Taxa de Conversão
- [ ] > 80% dos checkouts iniciados são completados
- [ ] < 5% de falha em webhooks
- [ ] > 90% de assinaturas renovam automaticamente

### Satisfação do Aluno
- [ ] Processo de pagamento é intuitivo
- [ ] Notificações são claras e úteis
- [ ] Bloqueio/liberação de acesso é instantâneo

---

## 🚨 Ações Corretivas

### Se webhook não processar:
1. Verificar logs em Supabase Dashboard
2. Verificar status no Mercado Pago
3. Re-processar manualmente via SQL
4. Notificar aluno do status

### Se cron job falhar:
1. Verificar logs de `pg_cron`
2. Executar função manualmente via SQL
3. Ajustar horário se necessário

### Se sincronização falhar:
1. Verificar status do Realtime no Supabase
2. Verificar se policies permitem LISTEN
3. Reiniciar canal via código

---

## ✅ Aprovação Final

- [ ] Todos os testes acima passaram
- [ ] Documentação está atualizada
- [ ] Credenciais de produção estão seguras
- [ ] Equipe foi treinada no sistema
- [ ] Plano de rollback está definido

---

**Data da Validação:** ___/___/______  
**Responsável:** ____________________  
**Status:** [ ] Aprovado [ ] Pendente [ ] Com Ressalvas

---

**Notas Adicionais:**
_______________________________________________________
_______________________________________________________
_______________________________________________________
