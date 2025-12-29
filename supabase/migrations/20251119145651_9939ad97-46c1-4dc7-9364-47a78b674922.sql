-- Corrigir security warning: adicionar search_path à função
CREATE OR REPLACE FUNCTION validate_custom_questions()
RETURNS TRIGGER AS $$
DECLARE
  question_count INTEGER;
  question JSONB;
  question_text TEXT;
  question_texts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Se custom_questions for NULL, aceitar
  IF NEW.custom_questions IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validar que é um array JSON
  IF jsonb_typeof(NEW.custom_questions) != 'array' THEN
    RAISE EXCEPTION 'custom_questions deve ser um array JSON';
  END IF;

  -- Contar perguntas
  question_count := jsonb_array_length(NEW.custom_questions);
  
  -- Validar limite de 10 perguntas
  IF question_count > 10 THEN
    RAISE EXCEPTION 'Máximo de 10 perguntas personalizadas permitidas. Você tentou adicionar %', question_count;
  END IF;

  -- Validar cada pergunta
  FOR question IN SELECT * FROM jsonb_array_elements(NEW.custom_questions)
  LOOP
    -- Verificar campos obrigatórios
    IF NOT (question ? 'id' AND question ? 'question' AND question ? 'type' AND question ? 'category') THEN
      RAISE EXCEPTION 'Pergunta inválida: campos obrigatórios (id, question, type, category) ausentes';
    END IF;

    -- Validar tipo da pergunta
    IF question->>'type' NOT IN ('text', 'textarea', 'rating', 'select', 'multiselect') THEN
      RAISE EXCEPTION 'Tipo de pergunta inválido: %. Tipos permitidos: text, textarea, rating, select, multiselect', question->>'type';
    END IF;

    -- Validar categoria
    IF question->>'category' NOT IN ('workout', 'diet', 'general') THEN
      RAISE EXCEPTION 'Categoria inválida: %. Categorias permitidas: workout, diet, general', question->>'category';
    END IF;

    -- Validar texto da pergunta não vazio
    question_text := trim(question->>'question');
    IF question_text = '' OR question_text IS NULL THEN
      RAISE EXCEPTION 'Texto da pergunta não pode estar vazio';
    END IF;

    -- Verificar duplicatas (case-insensitive)
    IF lower(question_text) = ANY(question_texts) THEN
      RAISE EXCEPTION 'Pergunta duplicada encontrada: "%"', question_text;
    END IF;
    question_texts := array_append(question_texts, lower(question_text));

    -- Validar comprimento do texto (máximo 500 caracteres)
    IF length(question_text) > 500 THEN
      RAISE EXCEPTION 'Texto da pergunta muito longo (máximo 500 caracteres): %', question_text;
    END IF;

    -- Se for select ou multiselect, validar options
    IF question->>'type' IN ('select', 'multiselect') THEN
      IF NOT (question ? 'options') OR jsonb_typeof(question->'options') != 'array' THEN
        RAISE EXCEPTION 'Perguntas do tipo select/multiselect devem ter um array de options';
      END IF;
      IF jsonb_array_length(question->'options') < 2 THEN
        RAISE EXCEPTION 'Perguntas do tipo select/multiselect devem ter pelo menos 2 opções';
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;