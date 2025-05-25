import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Create server-side Supabase client with service role for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Test if profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    // Test if fit_daily_metrics table exists  
    const { data: metrics, error: metricsError } = await supabase
      .from('fit_daily_metrics')
      .select('id')
      .limit(1)

    return NextResponse.json({
      success: true,
      tables: {
        profiles: profilesError ? `Error: ${profilesError.message}` : `OK (${profiles?.length || 0} records)`,
        fit_daily_metrics: metricsError ? `Error: ${metricsError.message}` : `OK (${metrics?.length || 0} records)`
      }
    })
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Database test failed'
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
} 