// Cliente Supabase secundário para acessar dados do Shape Pro
import { createClient } from '@supabase/supabase-js';

const SHAPEPRO_SUPABASE_URL = "https://bqbopkqzkavhmenjlhab.supabase.co";
const SHAPEPRO_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxYm9wa3F6a2F2aG1lbmpsaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjEwMTQsImV4cCI6MjA3MDQ5NzAxNH0.AeqAVWHVqyAn7wxNvHeuQFkJREHUTB9fZP22qpv73d0";

// Cliente Supabase para acessar dados do Shape Pro (somente leitura)
export const supabaseShapePro = createClient(SHAPEPRO_SUPABASE_URL, SHAPEPRO_SUPABASE_ANON_KEY);
