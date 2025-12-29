-- ================================
-- POLÍTICAS RLS PARA GAMIFICAÇÃO
-- ================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para user_points
CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view student points" ON user_points FOR SELECT USING (is_teacher_of(auth.uid(), user_id));
CREATE POLICY "System can manage points" ON user_points FOR ALL USING (auth.role() = 'service_role');

-- Políticas para user_achievements
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view student achievements" ON user_achievements FOR SELECT USING (is_teacher_of(auth.uid(), user_id));
CREATE POLICY "System can manage achievements" ON user_achievements FOR ALL USING (auth.role() = 'service_role');

-- Políticas para rewards_items
CREATE POLICY "Teachers can manage own rewards" ON rewards_items FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Students can view teacher rewards" ON rewards_items 
  FOR SELECT USING (is_active = true AND EXISTS (
    SELECT 1 FROM students s WHERE s.user_id = auth.uid() AND s.teacher_id = created_by
  ));

-- Políticas para reward_redemptions
CREATE POLICY "Users can view own redemptions" ON reward_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own redemptions" ON reward_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can view student redemptions" ON reward_redemptions 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM rewards_items r WHERE r.id = reward_id AND r.created_by = auth.uid()
  ));

-- Políticas para gamification_settings
CREATE POLICY "Teachers can manage own settings" ON gamification_settings FOR ALL USING (auth.uid() = teacher_id);

-- ================================
-- VERIFICAR E AJUSTAR TABELAS DE MARKETING
-- ================================

-- Ajustar tabela banners se necessário
ALTER TABLE banners ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}';

-- Comentários para documentação
COMMENT ON TABLE user_points IS 'Pontuação e níveis dos usuários no sistema de gamificação';
COMMENT ON TABLE user_achievements IS 'Conquistas desbloqueadas pelos usuários';
COMMENT ON TABLE rewards_items IS 'Itens disponíveis na loja de recompensas';
COMMENT ON TABLE reward_redemptions IS 'Histórico de resgates de recompensas';
COMMENT ON TABLE gamification_settings IS 'Configurações de pontuação por professor';