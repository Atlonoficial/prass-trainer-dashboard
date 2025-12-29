-- Atualizar credenciais de teste do Mercado Pago para o professor existente
UPDATE teacher_payment_settings 
SET 
  credentials = '{"api_key": "TEST-6471334101864522-092614-c51b02f80945d8676afd592fa685cde1-1037041863", "is_sandbox": true, "webhook_url": "https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/process-payment-webhook"}'::jsonb,
  is_active = true,
  updated_at = now()
WHERE teacher_id = '0d5398c2-278e-4853-b980-f36961795e52' 
  AND gateway_type = 'mercadopago';