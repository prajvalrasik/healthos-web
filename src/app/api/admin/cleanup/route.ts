import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check (in production, use proper admin auth)
    const { adminKey } = await request.json()
    
    if (adminKey !== process.env.ADMIN_CLEANUP_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)
    const cutoffISO = cutoffDate.toISOString()

    console.log(`Starting hard delete cleanup for records deleted before: ${cutoffISO}`)

    // Define tables to clean up (in order to respect foreign key constraints)
    const tablesToCleanup = [
      'message_embeddings',
      'chat_conversations', 
      'lab_markers',
      'lab_reports',
      'fit_daily_metrics'
      // Note: We don't hard delete profiles to maintain referential integrity
    ]

    const results: { [key: string]: number } = {}

    // Hard delete from each table
    for (const table of tablesToCleanup) {
      try {
        const { error, count } = await supabase
          .from(table)
          .delete({ count: 'exact' })
          .lt('deleted_at', cutoffISO)
          .not('deleted_at', 'is', null)

        if (error) {
          console.error(`Error deleting from ${table}:`, error)
          results[table] = -1 // Indicate error
        } else {
          results[table] = count || 0
          console.log(`Deleted ${count || 0} records from ${table}`)
        }
      } catch (tableError) {
        console.error(`Exception deleting from ${table}:`, tableError)
        results[table] = -1
      }
    }

    const totalDeleted = Object.values(results).reduce((sum, count) => sum + Math.max(0, count), 0)

    return NextResponse.json({
      success: true,
      message: 'Hard delete cleanup completed',
      cutoffDate: cutoffISO,
      results,
      totalRecordsDeleted: totalDeleted,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Hard delete cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to perform cleanup' },
      { status: 500 }
    )
  }
} 