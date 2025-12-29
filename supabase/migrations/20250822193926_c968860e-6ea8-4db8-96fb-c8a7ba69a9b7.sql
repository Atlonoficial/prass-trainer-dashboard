-- FASE 1: Base de Dados Completa para Sistema de Produtos e Cursos

-- Create products table for physical and digital products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_digital BOOLEAN NOT NULL DEFAULT false,
  stock INTEGER,
  category TEXT,
  image_url TEXT,
  files JSONB DEFAULT '[]'::jsonb, -- For digital products
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expand courses table structure (add missing fields)
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS requirements TEXT[],
ADD COLUMN IF NOT EXISTS what_you_learn TEXT[],
ADD COLUMN IF NOT EXISTS has_certificate BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER DEFAULT 0;

-- Create course modules table
CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, order_index)
);

-- Create course lessons table
CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_duration_minutes INTEGER DEFAULT 0,
  content TEXT, -- Rich text content
  attachments JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT false, -- Some lessons can be free previews
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_id, order_index)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instructor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  course_id UUID REFERENCES public.courses(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'course')),
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_item_reference CHECK (
    (item_type = 'product' AND product_id IS NOT NULL AND course_id IS NULL) OR
    (item_type = 'course' AND course_id IS NOT NULL AND product_id IS NULL)
  )
);

-- Create user purchases table (for access control)
CREATE TABLE public.user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id),
  course_id UUID REFERENCES public.courses(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('product', 'course')),
  access_granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_expires_at TIMESTAMPTZ, -- NULL means lifetime access
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id),
  UNIQUE(user_id, course_id),
  CONSTRAINT valid_purchase_reference CHECK (
    (purchase_type = 'product' AND product_id IS NOT NULL AND course_id IS NULL) OR
    (purchase_type = 'course' AND course_id IS NOT NULL AND product_id IS NULL)
  )
);

-- Update course progress to link with lessons
ALTER TABLE public.course_progress 
ADD COLUMN IF NOT EXISTS current_lesson_id UUID REFERENCES public.course_lessons(id),
ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;

-- Create lesson progress table
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent_minutes INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0, -- For video position
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Teachers can manage own products" ON public.products
FOR ALL USING (auth.uid() = instructor_id);

CREATE POLICY "Students can view published products" ON public.products
FOR SELECT USING (is_published = true);

-- RLS Policies for course_modules
CREATE POLICY "Teachers can manage own course modules" ON public.course_modules
FOR ALL USING (EXISTS(SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.instructor = auth.uid()));

CREATE POLICY "Students can view published modules of purchased courses" ON public.course_modules
FOR SELECT USING (
  is_published = true AND
  (EXISTS(SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.is_free = true) OR
   EXISTS(SELECT 1 FROM public.user_purchases WHERE user_purchases.user_id = auth.uid() AND user_purchases.course_id = course_modules.course_id))
);

-- RLS Policies for course_lessons
CREATE POLICY "Teachers can manage own course lessons" ON public.course_lessons
FOR ALL USING (EXISTS(
  SELECT 1 FROM public.course_modules 
  JOIN public.courses ON courses.id = course_modules.course_id 
  WHERE course_modules.id = course_lessons.module_id AND courses.instructor = auth.uid()
));

CREATE POLICY "Students can view accessible lessons" ON public.course_lessons
FOR SELECT USING (
  is_published = true AND (
    is_free = true OR
    EXISTS(SELECT 1 FROM public.course_modules 
           JOIN public.courses ON courses.id = course_modules.course_id 
           WHERE course_modules.id = course_lessons.module_id AND courses.is_free = true) OR
    EXISTS(SELECT 1 FROM public.course_modules 
           JOIN public.courses ON courses.id = course_modules.course_id 
           JOIN public.user_purchases ON user_purchases.course_id = courses.id 
           WHERE course_modules.id = course_lessons.module_id AND user_purchases.user_id = auth.uid())
  )
);

-- RLS Policies for orders
CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view orders for their products/courses" ON public.orders
FOR SELECT USING (auth.uid() = instructor_id);

CREATE POLICY "Users can create own orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update orders" ON public.orders
FOR UPDATE USING (true);

-- RLS Policies for order_items
CREATE POLICY "Users can view own order items" ON public.order_items
FOR SELECT USING (EXISTS(SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Teachers can view their order items" ON public.order_items
FOR SELECT USING (EXISTS(SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.instructor_id = auth.uid()));

CREATE POLICY "Users can create order items for own orders" ON public.order_items
FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- RLS Policies for user_purchases
CREATE POLICY "Users can view own purchases" ON public.user_purchases
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view purchases of their content" ON public.user_purchases
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.products WHERE products.id = user_purchases.product_id AND products.instructor_id = auth.uid()) OR
  EXISTS(SELECT 1 FROM public.courses WHERE courses.id = user_purchases.course_id AND courses.instructor = auth.uid())
);

CREATE POLICY "System can create purchases" ON public.user_purchases
FOR INSERT WITH CHECK (true);

-- RLS Policies for lesson_progress
CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student lesson progress" ON public.lesson_progress
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.course_lessons 
         JOIN public.course_modules ON course_modules.id = course_lessons.module_id
         JOIN public.courses ON courses.id = course_modules.course_id 
         WHERE course_lessons.id = lesson_progress.lesson_id AND courses.instructor = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_products_instructor ON public.products(instructor_id);
CREATE INDEX idx_products_published ON public.products(is_published);
CREATE INDEX idx_course_modules_course ON public.course_modules(course_id);
CREATE INDEX idx_course_lessons_module ON public.course_lessons(module_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_instructor ON public.orders(instructor_id);
CREATE INDEX idx_user_purchases_user ON public.user_purchases(user_id);
CREATE INDEX idx_user_purchases_course ON public.user_purchases(course_id);
CREATE INDEX idx_user_purchases_product ON public.user_purchases(product_id);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

-- Enable real-time for all tables
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.course_modules REPLICA IDENTITY FULL;
ALTER TABLE public.course_lessons REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.user_purchases REPLICA IDENTITY FULL;
ALTER TABLE public.lesson_progress REPLICA IDENTITY FULL;

-- Add tables to real-time publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_modules;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_lessons;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_purchases;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END
$$;

-- Create function to automatically grant access after successful payment
CREATE OR REPLACE FUNCTION public.grant_access_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when order status changes to 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Grant access to all items in the order
    INSERT INTO public.user_purchases (user_id, product_id, course_id, order_id, purchase_type)
    SELECT 
      NEW.user_id,
      oi.product_id,
      oi.course_id,
      NEW.id,
      oi.item_type
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
    ON CONFLICT (user_id, product_id) DO NOTHING
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic access granting
CREATE TRIGGER trigger_grant_access_after_payment
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_access_after_payment();

-- Function to update course totals when modules/lessons change
CREATE OR REPLACE FUNCTION public.update_course_totals()
RETURNS TRIGGER AS $$
DECLARE
  _course_id UUID;
  _total_lessons INTEGER;
  _total_duration INTEGER;
BEGIN
  -- Get course_id based on the table being updated
  IF TG_TABLE_NAME = 'course_modules' THEN
    _course_id := COALESCE(NEW.course_id, OLD.course_id);
  ELSIF TG_TABLE_NAME = 'course_lessons' THEN
    SELECT course_id INTO _course_id 
    FROM public.course_modules 
    WHERE id = COALESCE(NEW.module_id, OLD.module_id);
  END IF;
  
  -- Calculate totals
  SELECT 
    COUNT(cl.id),
    COALESCE(SUM(cl.video_duration_minutes), 0)
  INTO _total_lessons, _total_duration
  FROM public.course_modules cm
  JOIN public.course_lessons cl ON cl.module_id = cm.id
  WHERE cm.course_id = _course_id
    AND cm.is_published = true 
    AND cl.is_published = true;
  
  -- Update course
  UPDATE public.courses 
  SET 
    total_lessons = _total_lessons,
    total_duration_minutes = _total_duration,
    updated_at = now()
  WHERE id = _course_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for course totals
CREATE TRIGGER trigger_update_course_totals_modules
  AFTER INSERT OR UPDATE OR DELETE ON public.course_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_totals();

CREATE TRIGGER trigger_update_course_totals_lessons
  AFTER INSERT OR UPDATE OR DELETE ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_totals();