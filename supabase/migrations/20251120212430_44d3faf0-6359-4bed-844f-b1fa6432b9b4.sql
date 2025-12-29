-- Garantir REPLICA IDENTITY FULL para capturar mudanças completas
ALTER TABLE user_presence REPLICA IDENTITY FULL;