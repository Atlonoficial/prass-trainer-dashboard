-- Garantir que o bucket biblioteca-exercicios existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('biblioteca-exercicios', 'biblioteca-exercicios', true)
ON CONFLICT (id) DO NOTHING;