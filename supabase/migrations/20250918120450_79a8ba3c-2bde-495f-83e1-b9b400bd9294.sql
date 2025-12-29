-- Criar índice GIN para performance com arrays UUID na coluna assigned_to
CREATE INDEX IF NOT EXISTS idx_workouts_assigned_to_gin 
ON workouts USING gin (assigned_to);