import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPushRequest {
  title: string;
  message: string;
  segment: "all" | "ativos" | "inativos" | "novos" | "custom";
  externalUserIds?: string[];
}

interface OneSignalV2Response {
  id: string;
  recipients: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OneSignal credentials from environment
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID")?.trim();
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY")?.trim();

    console.log("🔑 OneSignal configured:", {
      appId: oneSignalAppId ? `SET (${oneSignalAppId})` : "NOT SET",
      apiKey: oneSignalApiKey ? `SET (starts with: ${oneSignalApiKey.substring(0, 15)}...)` : "NOT SET",
      apiKeyLength: oneSignalApiKey?.length || 0,
      apiKeyEndsWith: oneSignalApiKey ? `...${oneSignalApiKey.substring(oneSignalApiKey.length - 10)}` : "N/A",
      hasWhitespace: oneSignalApiKey ? /\s/.test(oneSignalApiKey) : false,
      authFormat: "Key YOUR_API_KEY",
    });

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error("❌ OneSignal credentials not configured");
      return new Response(
        JSON.stringify({
          error: "OneSignal credentials not configured",
          details: "ONESIGNAL_APP_ID and ONESIGNAL_API_KEY must be set in environment",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a teacher
    const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();

    if (!profile || profile.user_type !== "teacher") {
      return new Response(JSON.stringify({ error: "Unauthorized - only teachers can send notifications" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { title, message, segment, externalUserIds }: SendPushRequest = await req.json();

    if (!title || !message) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          details: "title and message are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("📤 Sending push notification:", { title, message, segment, externalUserIds });

    // Build OneSignal API payload
    const oneSignalBody: any = {
      app_id: oneSignalAppId,
      headings: { pt: title, en: title },
      contents: { pt: message, en: message },
    };

    // Determine target users
    if (externalUserIds && externalUserIds.length > 0) {
      // API v2 uses include_aliases instead of include_external_user_ids
      oneSignalBody.include_aliases = {
        external_id: externalUserIds,
      };
      console.log("🎯 Targeting specific external user IDs:", externalUserIds);
    } else {
      // Handle segmentation based on teacher's students
      let targetUserIds: string[] = [];

      if (segment === "all") {
        const { data: students } = await supabase.from("students").select("user_id").eq("teacher_id", user.id);

        targetUserIds = students?.map((s) => s.user_id) || [];
      } else if (segment === "ativos") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: students } = await supabase
          .from("students")
          .select("user_id")
          .eq("teacher_id", user.id)
          .gte("last_activity", thirtyDaysAgo.toISOString());

        targetUserIds = students?.map((s) => s.user_id) || [];
      } else if (segment === "inativos") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: students } = await supabase
          .from("students")
          .select("user_id")
          .eq("teacher_id", user.id)
          .or(`last_activity.is.null,last_activity.lt.${thirtyDaysAgo.toISOString()}`);

        targetUserIds = students?.map((s) => s.user_id) || [];
      } else if (segment === "novos") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: students } = await supabase
          .from("students")
          .select("user_id")
          .eq("teacher_id", user.id)
          .gte("created_at", sevenDaysAgo.toISOString());

        targetUserIds = students?.map((s) => s.user_id) || [];
      }

      if (targetUserIds.length === 0) {
        console.log("⚠️ No target users found for segment:", segment);
        return new Response(
          JSON.stringify({
            success: true,
            message: "No target users found for the selected segment",
            recipients: 0,
            notification_id: null,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(`\n=== 🎯 TARGET USERS ANALYSIS ===`);
      console.log(`Segment: ${segment}`);
      console.log(`Total users found: ${targetUserIds.length}`);

      // Get profiles with OneSignal Player IDs
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, onesignal_player_id, push_token, platform")
        .in("id", targetUserIds);

      console.log(`Total profiles fetched: ${profiles?.length || 0}`);

      const validPlayerIds: string[] = [];
      let noDeviceCount = 0;

      for (const profile of profiles || []) {
        if (profile.onesignal_player_id) {
          validPlayerIds.push(profile.onesignal_player_id);
          console.log(`✓ User ${profile.id.substring(0, 8)}...: HAS player_id`);
        } else {
          noDeviceCount++;
          console.log(`❌ User ${profile.id.substring(0, 8)}...: NO player_id`);
        }
      }

      console.log(`\n=== 📊 SUMMARY ===`);
      console.log(`Total target users: ${targetUserIds.length}`);
      console.log(`Users with player_id: ${validPlayerIds.length}`);
      console.log(`Users without player_id: ${noDeviceCount}`);
      console.log(`Success rate: ${Math.round((validPlayerIds.length / targetUserIds.length) * 100)}%\n`);

      if (validPlayerIds.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No recipients with push notifications enabled",
            message: "Nenhum aluno tem notificações push ativas.",
            recipients: 0,
            notification_id: null,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // OneSignal uses include_player_ids with actual player IDs
      oneSignalBody.include_player_ids = validPlayerIds;
      console.log(`🚀 Sending to ${validPlayerIds.length} users`);
    }

    // Send notification to OneSignal API v2
    console.log("📡 Calling OneSignal API:");
    console.log("  - Endpoint: https://api.onesignal.com/notifications");
    console.log("  - Authorization:", `Key ${oneSignalApiKey.substring(0, 20)}...${oneSignalApiKey.substring(oneSignalApiKey.length - 10)}`);
    console.log("  - Body:", JSON.stringify(oneSignalBody, null, 2));

    const oneSignalResponse = await fetch(`https://api.onesignal.com/notifications`, {
      method: "POST",
      headers: {
        Authorization: `Key ${oneSignalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(oneSignalBody),
    });

    const oneSignalData: any = await oneSignalResponse.json();

    console.log("OneSignal API response:", {
      status: oneSignalResponse.status,
      data: oneSignalData,
    });

    if (!oneSignalResponse.ok) {
      console.error("❌ OneSignal API error:", oneSignalData);
      return new Response(
        JSON.stringify({
          error: "Failed to send notification",
          details: oneSignalData.errors || oneSignalData,
          oneSignalStatus: oneSignalResponse.status,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const recipients = oneSignalData.recipients || 0;

    if (recipients === 0) {
      console.warn("⚠️ Notification sent but no recipients were reached");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No recipients could be reached",
          message: "Nenhum dispositivo registrado para receber notificações",
          recipients: 0,
          details: oneSignalData,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // FASE 2: Save campaign to notification_campaigns table
    const { data: campaign, error: dbError } = await supabase
      .from("notification_campaigns")
      .insert({
        teacher_id: user.id,
        title,
        message,
        segment,
        target_user_ids: oneSignalBody.include_aliases?.external_id || [],
        status: "sent",
        sent_count: recipients,
        delivered_count: 0,
        opened_count: 0,
        failed_count: 0,
        onesignal_notification_id: oneSignalData.id,
        sent_at: new Date().toISOString(),
        metadata: {
          api_version: "v2",
          onesignal_response: oneSignalData,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("⚠️ Database error saving campaign:", dbError);
    } else {
      console.log("✅ Campaign saved to database:", campaign?.id);
    }

    console.log("✅ Push notification sent successfully:", {
      notificationId: oneSignalData.id,
      recipients: recipients,
      segment,
    });

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: oneSignalData.id,
        recipients: recipients,
        segment,
        message: `Notificação enviada com sucesso para ${recipients} dispositivo${recipients !== 1 ? "s" : ""}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error in send-push function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
