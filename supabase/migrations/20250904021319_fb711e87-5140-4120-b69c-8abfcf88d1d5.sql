-- Habilitar realtime na tabela workouts
ALTER TABLE workouts REPLICA IDENTITY FULL;

-- Adicionar workouts à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workouts;