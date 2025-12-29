-- Add missing engagement_score column and populate tables with correct data types
ALTER TABLE marketing_segments 
ADD COLUMN IF NOT EXISTS engagement_score NUMERIC DEFAULT 0;

-- Insert marketing campaigns using correct data types
WITH banner_campaigns AS (
  SELECT 
    gen_random_uuid() as id,
    'Campanha de Engajamento - ' || b.title as name,
    'Campanha automática para aumentar engajamento baseada no banner: ' || b.title as description,
    'active' as status,
    'automated' as campaign_type,
    '["usuarios_ativos"]'::jsonb as target_segments,
    jsonb_build_object(
      'title', b.title,
      'message', COALESCE(b.message, 'Mensagem padrão'),
      'action_text', COALESCE(b.action_text, 'Saiba mais')
    ) as banner_template,
    '[{"type": "time_based", "condition": {"hour": 14}}]'::jsonb as triggers,
    '{"start_date": "2024-01-01", "end_date": "2024-12-31", "frequency": "weekly"}'::jsonb as schedule_config,
    b.created_by,
    ROW_NUMBER() OVER (ORDER BY b.created_at) as rn
  FROM banners b
  WHERE b.is_active = true AND b.created_by IS NOT NULL
)
INSERT INTO marketing_campaigns (
  id, name, description, status, campaign_type, target_segments,
  banner_template, triggers, schedule_config, created_by
)
SELECT id, name, description, status, campaign_type, target_segments,
       banner_template, triggers, schedule_config, created_by
FROM banner_campaigns 
WHERE rn <= 3
ON CONFLICT (id) DO NOTHING;

-- Insert marketing segments with engagement_score  
WITH segment_data AS (
  SELECT DISTINCT created_by FROM banners WHERE created_by IS NOT NULL
)
INSERT INTO marketing_segments (
  id, name, description, segment_type, criteria, user_count, 
  engagement_score, is_dynamic, created_by
)
SELECT 
  gen_random_uuid(),
  'Usuários Ativos',
  'Usuários com alta frequência de interação nos últimos 30 dias',
  'behavioral',
  '{"interaction_frequency": "high", "last_activity": "30_days"}'::jsonb,
  GREATEST(1, FLOOR(RANDOM() * 50 + 10)),
  ROUND((RANDOM() * 2 + 3)::numeric, 2),
  true,
  s.created_by
FROM segment_data s
ON CONFLICT (id) DO NOTHING;

-- Insert marketing insights
WITH insight_data AS (
  SELECT DISTINCT created_by FROM banners WHERE created_by IS NOT NULL
)
INSERT INTO marketing_insights (
  id, insight_type, title, description, priority, is_actionable,
  actions, data, created_by
)
SELECT 
  gen_random_uuid(),
  'recommendation',
  'Baixo engajamento detectado',
  'Alguns banners apresentam CTR abaixo da média. Considere revisar o conteúdo.',
  'medium',
  true,
  '{"suggest_ab_test": true, "review_content": true}'::jsonb,
  '{"avg_ctr": 1.2, "threshold": 2.0}'::jsonb,
  i.created_by
FROM insight_data i
ON CONFLICT (id) DO NOTHING;