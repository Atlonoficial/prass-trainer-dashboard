import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  name: string;
  activePlan: string;
  goals: string[];
  modalities: string[];
  courses: string[];
  invitationCode: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    const { 
      email, 
      name, 
      activePlan, 
      goals, 
      modalities, 
      courses, 
      invitationCode 
    }: InvitationRequest = await req.json();

    // Validate required fields
    if (!email || !invitationCode) {
      return new Response(
        JSON.stringify({ error: 'Email and invitation code are required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`Sending invitation to ${email} with code ${invitationCode}`);

    // Send invitation using Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'https://YOUR_PROJECT_ID.supabase.co'}/accept-invite?code=${invitationCode}`,
      data: {
        invitationCode,
        studentName: name,
        activePlan,
        goals,
        modalities,
        courses,
        invitedAt: new Date().toISOString()
      }
    });

    if (error) {
      console.error('Error sending invitation:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Invitation sent successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Convite enviado por email com sucesso',
        user: data.user
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in send-invitation-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);