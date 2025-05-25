import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: string
  table: string
  record: any
  schema: string
  old_record: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const payload: WebhookPayload = await req.json()
    
    console.log('Received webhook payload:', payload)

    // Check if this is a storage event for lab reports
    if (payload.type === 'INSERT' && payload.table === 'objects') {
      const record = payload.record
      
      // Only process files in the lab-reports bucket
      if (record.bucket_id === 'lab-reports' && record.name.endsWith('.pdf')) {
        console.log('Processing lab report:', record.name)
        
        // Get the lab report record from database
        const pathParts = record.name.split('/')
        const userId = pathParts[1] // reports/[user_id]/filename
        
        // Find the lab report record
        const { data: labReport, error: labReportError } = await supabase
          .from('lab_reports')
          .select('*')
          .eq('user_id', userId)
          .eq('file_url', `${supabaseUrl}/storage/v1/object/public/lab-reports/${record.name}`)
          .single()

        if (labReportError) {
          console.error('Error finding lab report:', labReportError)
          throw labReportError
        }

        console.log('Found lab report record:', labReport.id)

        // Download the PDF file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('lab-reports')
          .download(record.name)

        if (downloadError) {
          console.error('Error downloading file:', downloadError)
          throw downloadError
        }

        console.log('Downloaded PDF file, size:', fileData.size)

        // Convert file to base64 for processing
        const arrayBuffer = await fileData.arrayBuffer()
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        
        // For now, just mark as processed (we'll implement actual text extraction in next step)
        const { error: updateError } = await supabase
          .from('lab_reports')
          .update({ 
            processed: true,
            processed_at: new Date().toISOString()
          })
          .eq('id', labReport.id)

        if (updateError) {
          console.error('Error updating lab report:', updateError)
          throw updateError
        }

        console.log('Marked lab report as processed:', labReport.id)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Lab report processed successfully',
            labReportId: labReport.id
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    // Not a lab report file, ignore
    return new Response(
      JSON.stringify({ success: true, message: 'Not a lab report, skipping' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 