import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log(`Cancelling deletion for user: ${userId}`)

    // Remove deleted_at timestamps from all user data tables
    const cancelDeletionOperations = [
      // Cancel profile deletion
      supabase
        .from('profiles')
        .update({ deleted_at: null })
        .eq('id', userId)
        .not('deleted_at', 'is', null),

      // Cancel fit metrics deletion
      supabase
        .from('fit_daily_metrics')
        .update({ deleted_at: null })
        .eq('user_id', userId)
        .not('deleted_at', 'is', null),

      // Cancel lab reports deletion
      supabase
        .from('lab_reports')
        .update({ deleted_at: null })
        .eq('user_id', userId)
        .not('deleted_at', 'is', null),

      // Cancel lab markers deletion
      supabase
        .from('lab_markers')
        .update({ deleted_at: null })
        .eq('user_id', userId)
        .not('deleted_at', 'is', null),

      // Cancel chat conversations deletion
      supabase
        .from('chat_conversations')
        .update({ deleted_at: null })
        .eq('user_id', userId)
        .not('deleted_at', 'is', null),

      // Cancel message embeddings deletion (if exists)
      supabase
        .from('message_embeddings')
        .update({ deleted_at: null })
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
    ]

    // Execute all cancel deletion operations
    const results = await Promise.allSettled(cancelDeletionOperations)

    // Check for any failures
    const failures = results.filter(result => result.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some cancel deletion operations failed:', failures)
      // Continue anyway - partial restoration is better than no restoration
    }

    // Count successful restorations
    const successful = results.filter(r => r.status === 'fulfilled').length

    console.log(`User ${userId} deletion cancelled - ${successful} operations completed`)

    return NextResponse.json({
      success: true,
      message: 'Account deletion cancelled successfully',
      restoredAt: new Date().toISOString(),
      operations: {
        total: cancelDeletionOperations.length,
        successful,
        failed: failures.length
      }
    })

  } catch (error) {
    console.error('Cancel deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel account deletion' },
      { status: 500 }
    )
  }
} 