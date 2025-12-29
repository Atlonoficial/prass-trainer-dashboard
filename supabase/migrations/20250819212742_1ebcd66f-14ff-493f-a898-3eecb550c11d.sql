-- Create nutrition_formulas table
CREATE TABLE public.nutrition_formulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_formulas ENABLE ROW LEVEL SECURITY;

-- Create policies for nutrition_formulas
CREATE POLICY "Users can view own formulas" 
ON public.nutrition_formulas 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create own formulas" 
ON public.nutrition_formulas 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own formulas" 
ON public.nutrition_formulas 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own formulas" 
ON public.nutrition_formulas 
FOR DELETE 
USING (auth.uid() = created_by);

-- Teachers can view their students' formulas
CREATE POLICY "Teachers can view students formulas" 
ON public.nutrition_formulas 
FOR SELECT 
USING (is_teacher_of(auth.uid(), created_by));

-- Create trigger for updated_at
CREATE TRIGGER update_nutrition_formulas_updated_at
BEFORE UPDATE ON public.nutrition_formulas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update exercises table to add missing fields
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update exercises table to standardize muscle_groups (make it array if not already)
-- First check if muscle_groups column exists as array, if not convert it
DO $$
BEGIN
  -- Add muscle_groups as array if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercises' AND column_name = 'muscle_groups'
  ) THEN
    ALTER TABLE public.exercises ADD COLUMN muscle_groups TEXT[];
    
    -- Migrate data from muscle_group to muscle_groups if muscle_group exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'exercises' AND column_name = 'muscle_group'
    ) THEN
      UPDATE public.exercises 
      SET muscle_groups = ARRAY[muscle_group] 
      WHERE muscle_group IS NOT NULL;
    END IF;
  END IF;
END $$;