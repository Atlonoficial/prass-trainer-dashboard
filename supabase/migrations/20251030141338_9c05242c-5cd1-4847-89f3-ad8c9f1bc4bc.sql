-- CORREÇÃO 2: Adicionar RLS Policies para teacher_payment_settings

-- Enable RLS on teacher_payment_settings
ALTER TABLE teacher_payment_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Professors can view only their own payment settings
CREATE POLICY "Professors can view own payment settings"
  ON teacher_payment_settings 
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Policy: Professors can update only their own payment settings
CREATE POLICY "Professors can update own payment settings"
  ON teacher_payment_settings 
  FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Policy: Professors can insert only their own payment settings
CREATE POLICY "Professors can insert own payment settings"
  ON teacher_payment_settings 
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Policy: Professors can delete only their own payment settings
CREATE POLICY "Professors can delete own payment settings"
  ON teacher_payment_settings 
  FOR DELETE
  USING (auth.uid() = teacher_id);

-- Add comment for documentation
COMMENT ON TABLE teacher_payment_settings IS 'Payment gateway credentials for teachers. RLS ensures each teacher can only access their own credentials.';