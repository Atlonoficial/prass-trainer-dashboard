-- Add missing columns to existing teacher_feedback_settings table
ALTER TABLE public.teacher_feedback_settings 
ADD COLUMN IF NOT EXISTS default_feedback_period INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS feedbacks_per_page INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS auto_request_feedback BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feedback_reminder_days INTEGER NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS show_feedback_stats BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS feedback_types_enabled TEXT[] NOT NULL DEFAULT '{workout,diet,general}'::TEXT[];