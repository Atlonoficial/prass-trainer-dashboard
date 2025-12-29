-- Create support_tickets table for contact form
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create support tickets (public form)
CREATE POLICY "Anyone can create support tickets"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Only service role can view tickets
CREATE POLICY "Service role can view all tickets"
ON public.support_tickets
FOR SELECT
TO service_role
USING (true);

-- Add index for performance
CREATE INDEX idx_support_tickets_email ON public.support_tickets(email);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);