import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action } = await req.json()

    console.log('🔍 [CLEANUP_ORPHANED_VIDEOS] Action:', action);

    // 1. Fetch all files from storage bucket
    const { data: files, error: storageError } = await supabaseClient
      .storage
      .from('biblioteca-exercicios')
      .list()

    if (storageError) {
      console.error('❌ [CLEANUP_ORPHANED_VIDEOS] Storage error:', storageError);
      throw storageError;
    }

    console.log(`📦 [CLEANUP_ORPHANED_VIDEOS] Found ${files?.length || 0} files in storage`);

    // 2. Fetch all video_urls from exercises
    const { data: exercises, error: dbError } = await supabaseClient
      .from('exercises')
      .select('video_url')
      .not('video_url', 'is', null)

    if (dbError) {
      console.error('❌ [CLEANUP_ORPHANED_VIDEOS] Database error:', dbError);
      throw dbError;
    }

    console.log(`💾 [CLEANUP_ORPHANED_VIDEOS] Found ${exercises?.length || 0} exercises with videos`);

    // 3. Create a set of used URLs for fast lookup
    const usedUrls = new Set(exercises?.map(e => {
      // Extract filename from full URL
      const url = e.video_url || '';
      const match = url.match(/biblioteca-exercicios\/(.+)$/);
      return match ? match[1] : '';
    }).filter(Boolean) || []);

    console.log(`🔗 [CLEANUP_ORPHANED_VIDEOS] Found ${usedUrls.size} unique video URLs in use`);

    // 4. Identify orphaned files
    const orphanedFiles = files?.filter(file => {
      const isOrphaned = !usedUrls.has(file.name);
      if (isOrphaned) {
        console.log(`🗑️ [CLEANUP_ORPHANED_VIDEOS] Orphaned file: ${file.name}`);
      }
      return isOrphaned;
    }) || [];

    console.log(`📊 [CLEANUP_ORPHANED_VIDEOS] Total orphaned files: ${orphanedFiles.length}`);

    // 5. If action is 'scan', just return the count
    if (action === 'scan') {
      return new Response(
        JSON.stringify({ 
          orphaned_count: orphanedFiles.length,
          total_files: files?.length || 0,
          used_files: usedUrls.size
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // 6. If action is 'cleanup', delete orphaned files
    if (action === 'cleanup') {
      const deleted = [];
      const errors = [];

      for (const file of orphanedFiles) {
        try {
          const { error: deleteError } = await supabaseClient
            .storage
            .from('biblioteca-exercicios')
            .remove([file.name]);

          if (deleteError) {
            console.error(`❌ [CLEANUP_ORPHANED_VIDEOS] Error deleting ${file.name}:`, deleteError);
            errors.push({ file: file.name, error: deleteError.message });
          } else {
            console.log(`✅ [CLEANUP_ORPHANED_VIDEOS] Deleted: ${file.name}`);
            deleted.push(file.name);
          }
        } catch (error) {
          console.error(`❌ [CLEANUP_ORPHANED_VIDEOS] Exception deleting ${file.name}:`, error);
          errors.push({ file: file.name, error: String(error) });
        }
      }

      console.log(`✅ [CLEANUP_ORPHANED_VIDEOS] Cleanup complete: ${deleted.length} deleted, ${errors.length} errors`);

      return new Response(
        JSON.stringify({ 
          deleted_count: deleted.length,
          deleted_files: deleted,
          errors: errors,
          success: errors.length === 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Invalid action
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "scan" or "cleanup"' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('❌ [CLEANUP_ORPHANED_VIDEOS] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})
