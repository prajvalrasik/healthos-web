// @ts-nocheck
// Supabase Edge Function - runs in Deno runtime, not Node.js
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)
    const cutoffISO = cutoffDate.toISOString()

    console.log(`Starting hard delete cleanup for records deleted before: ${cutoffISO}`)

    // Define tables to clean up
    const tablesToCleanup = [
      'message_embeddings',
      'chat_conversations', 
      'lab_markers',
      'lab_reports',
      'fit_daily_metrics',
      'profiles' // Delete profiles last due to foreign key constraints
    ]

    const results: { [key: string]: number } = {}

    // Hard delete from each table
    for (const table of tablesToCleanup) {
      try {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .lt('deleted_at', cutoffISO)
          .not('deleted_at', 'is', null)

        if (error) {
          console.error(`Error deleting from ${table}:`, error)
          results[table] = -1 // Indicate error
        } else {
          const deletedCount = Array.isArray(data) ? data.length : 0
          results[table] = deletedCount
          console.log(`Deleted ${deletedCount} records from ${table}`)
        }
      } catch (tableError) {
        console.error(`Exception deleting from ${table}:`, tableError)
        results[table] = -1
      }
    }

    // Clean up orphaned files in storage (lab reports)
    let storageCleanupCount = 0
    try {
      // Get list of deleted lab reports to clean up their files
      const { data: deletedReports } = await supabase
        .from('lab_reports')
        .select('file_path')
        .lt('deleted_at', cutoffISO)
        .not('deleted_at', 'is', null)

      if (deletedReports && deletedReports.length > 0) {
        const filePaths = deletedReports.map(report => report.file_path).filter(Boolean)
        
        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('lab-reports')
            .remove(filePaths)

          if (storageError) {
            console.error('Storage cleanup error:', storageError)
          } else {
            storageCleanupCount = filePaths.length
            console.log(`Cleaned up ${storageCleanupCount} files from storage`)
          }
        }
      }
    } catch (storageError) {
      console.error('Storage cleanup exception:', storageError)
    }

    const totalDeleted = Object.values(results).reduce((sum, count) => sum + Math.max(0, count), 0)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Hard delete cleanup completed',
        cutoffDate: cutoffISO,
        results,
        totalRecordsDeleted: totalDeleted,
        storageFilesDeleted: storageCleanupCount,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Hard delete cleanup error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 