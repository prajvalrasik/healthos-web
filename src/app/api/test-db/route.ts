import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Test database connection and table existence
    const tableTests = [
      'profiles',
      'fit_daily_metrics', 
      'lab_markers',
      'lab_reports',
      'chat_conversations'
    ]

    const results: { [key: string]: any } = {}

    for (const table of tableTests) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1)

        results[table] = {
          exists: !error,
          error: error?.message || null,
          count: count || 0
        }
      } catch (err) {
        results[table] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          count: 0
        }
      }
    }

    // Test environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GOOGLE_GEMINI_API_KEY: !!process.env.GOOGLE_GEMINI_API_KEY
    }

    return NextResponse.json({
      success: true,
      tables: results,
      environment: envCheck,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 