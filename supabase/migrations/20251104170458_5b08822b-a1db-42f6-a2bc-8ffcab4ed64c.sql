-- RLS Policies para permitir que alunos acessem suas próprias assinaturas e transações

-- Policy para alunos lerem suas próprias assinaturas
CREATE POLICY "Students can read own subscriptions"
ON active_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy para alunos lerem suas próprias transações
CREATE POLICY "Students can read own transactions"
ON payment_transactions
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Comentário: Estas policies permitem que o projeto do aluno consulte
-- assinaturas e transações usando o mesmo banco de dados Supabase