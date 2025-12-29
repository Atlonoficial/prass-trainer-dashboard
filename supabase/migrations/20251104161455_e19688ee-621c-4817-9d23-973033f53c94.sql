-- Deprecar tabela teacher_payment_settings
COMMENT ON TABLE teacher_payment_settings IS 
'DEPRECATED: Substituída por system_payment_config. Sistema agora é global.';

-- Trigger para prevenir novos inserts
CREATE OR REPLACE FUNCTION prevent_teacher_payment_settings_insert()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'teacher_payment_settings obsoleta. Sistema agora usa system_payment_config global.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_insert_teacher_payment_settings
  BEFORE INSERT ON teacher_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_teacher_payment_settings_insert();