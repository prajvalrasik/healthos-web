import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user profile is soft-deleted
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('deleted_at')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      isDeleted: profile.deleted_at !== null,
      deletedAt: profile.deleted_at
    })

  } catch (error) {
    console.error('Check deletion status error:', error)
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get user from request (you might want to add authentication middleware)
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const deletedAt = new Date().toISOString()

    // Soft delete user data from all tables
    const softDeleteOperations = [
      // Soft delete profiles
      supabase
        .from('profiles')
        .update({ deleted_at: deletedAt })
        .eq('id', userId),

      // Soft delete fit metrics
      supabase
        .from('fit_daily_metrics')
        .update({ deleted_at: deletedAt })
        .eq('user_id', userId),

      // Soft delete lab reports
      supabase
        .from('lab_reports')
        .update({ deleted_at: deletedAt })
        .eq('user_id', userId),

      // Soft delete lab markers
      supabase
        .from('lab_markers')
        .update({ deleted_at: deletedAt })
        .eq('user_id', userId),

      // Soft delete chat conversations
      supabase
        .from('chat_conversations')
        .update({ deleted_at: deletedAt })
        .eq('user_id', userId),

      // Soft delete message embeddings (if exists)
      supabase
        .from('message_embeddings')
        .update({ deleted_at: deletedAt })
        .eq('user_id', userId)
    ]

    // Execute all soft delete operations
    const results = await Promise.allSettled(softDeleteOperations)

    // Check for any failures
    const failures = results.filter(result => result.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some soft delete operations failed:', failures)
      // Continue anyway - partial deletion is better than no deletion
    }

    // Log successful soft deletion
    console.log(`User ${userId} data soft-deleted at ${deletedAt}`)

    return NextResponse.json({
      success: true,
      message: 'Account data marked for deletion',
      deletedAt,
      operations: {
        total: softDeleteOperations.length,
        successful: results.filter(r => r.status === 'fulfilled').length,
        failed: failures.length
      }
    })

  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account data' },
      { status: 500 }
    )
  }
}

 