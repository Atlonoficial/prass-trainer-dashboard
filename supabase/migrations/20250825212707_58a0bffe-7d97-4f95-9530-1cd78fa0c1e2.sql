-- Create service_pricing table for teachers to define prices
CREATE TABLE public.service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  service_type TEXT NOT NULL, -- 'consultation', 'course', 'training_plan', 'nutrition_plan'
  service_id UUID, -- References the specific service (course_id, plan_id, etc)
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, service_type, service_id)
);

-- Enable RLS
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_pricing
CREATE POLICY "Teachers can manage own pricing" ON public.service_pricing
FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view teacher pricing" ON public.service_pricing
FOR SELECT USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.user_id = auth.uid() AND s.teacher_id = service_pricing.teacher_id
  )
);

-- Create payment_transactions table for detailed transaction tracking
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  service_pricing_id UUID REFERENCES public.service_pricing(id),
  gateway_type TEXT NOT NULL, -- 'mercado_pago', 'pagbank', 'stripe'
  gateway_transaction_id TEXT,
  gateway_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed', 'refunded'
  payment_method TEXT, -- 'pix', 'credit_card', 'debit_card', 'boleto'
  checkout_url TEXT,
  gateway_response JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Teachers can view own transactions" ON public.payment_transactions
FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view own transactions" ON public.payment_transactions
FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "System can create transactions" ON public.payment_transactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update transactions" ON public.payment_transactions
FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_service_pricing_teacher ON public.service_pricing(teacher_id);
CREATE INDEX idx_service_pricing_active ON public.service_pricing(is_active);
CREATE INDEX idx_payment_transactions_teacher ON public.payment_transactions(teacher_id);
CREATE INDEX idx_payment_transactions_student ON public.payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_gateway_id ON public.payment_transactions(gateway_transaction_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_pricing_updated_at 
  BEFORE UPDATE ON public.service_pricing 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at 
  BEFORE UPDATE ON public.payment_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();