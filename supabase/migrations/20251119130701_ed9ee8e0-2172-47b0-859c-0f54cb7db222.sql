-- FASE 1 & 6: Esquema de Dados, Índices e Função de Limpeza

-- Adicionar campo de política de retenção
ALTER TABLE teacher_feedback_settings 
ADD COLUMN IF NOT EXISTS feedback_retention_policy TEXT DEFAULT '6months';

-- Garantir feedback_types_enabled não vazio
UPDATE teacher_feedback_settings 
SET feedback_types_enabled = '{workout,diet,general}'::text[]
WHERE feedback_types_enabled = '{}' OR feedback_types_enabled IS NULL;

-- Popular custom_questions vazio com array
UPDATE teacher_feedback_settings 
SET custom_questions = '[]'::jsonb
WHERE custom_questions IS NULL OR custom_questions = 'null'::jsonb;

-- Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_student_created 
ON feedbacks(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedbacks_teacher_created 
ON feedbacks(teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_feedback_settings_active 
ON teacher_feedback_settings(teacher_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_feedbacks_metadata_gin 
ON feedbacks USING gin(metadata);

-- Função de limpeza automática de feedbacks (híbrida: 10 últimos OU 6 meses)
CREATE OR REPLACE FUNCTION cleanup_feedbacks_hybrid()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Deletar feedbacks que não estão nos 10 últimos E são mais antigos que 6 meses
  WITH ranked_feedbacks AS (
    SELECT id, created_at,
           ROW_NUMBER() OVER (
             PARTITION BY student_id, teacher_id 
             ORDER BY created_at DESC
           ) as rn
    FROM feedbacks
  )
  DELETE FROM feedbacks
  WHERE id IN (
    SELECT id FROM ranked_feedbacks 
    WHERE rn > 10 AND created_at < NOW() - INTERVAL '6 months'
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da execução
  INSERT INTO audit_log (table_name, access_type, record_id, user_id)
  VALUES ('feedbacks', 'CLEANUP', NULL, NULL);
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários nas colunas
COMMENT ON COLUMN teacher_feedback_settings.feedback_retention_policy IS 'Política de retenção: 6months, 1year, last10, unlimited';
COMMENT ON COLUMN teacher_feedback_settings.custom_questions IS 'Array de perguntas personalizadas em JSONB';
COMMENT ON COLUMN teacher_feedback_settings.is_active IS 'Ativa/desativa sistema de feedback para alunos';
COMMENT ON COLUMN teacher_feedback_settings.feedback_frequency IS 'Frequência: daily, weekly, biweekly, monthly, never';
COMMENT ON COLUMN teacher_feedback_settings.feedback_days IS 'Dias da semana (0-6) para weekly/biweekly';