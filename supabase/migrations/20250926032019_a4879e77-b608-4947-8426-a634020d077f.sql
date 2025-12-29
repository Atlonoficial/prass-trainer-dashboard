-- First, let's check what columns exist in marketing_segments
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'marketing_segments' 
AND table_schema = 'public';