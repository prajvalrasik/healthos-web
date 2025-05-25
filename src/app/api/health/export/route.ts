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

    console.log(`Starting data export for user: ${userId}`)

    // Fetch all user data from different tables
    const [
      profileResult,
      fitMetricsResult,
      labReportsResult,
      labMarkersResult,
      chatConversationsResult
    ] = await Promise.allSettled([
      // Profile data
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single(),

      // Fitness metrics
      supabase
        .from('fit_daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('date', { ascending: false }),

      // Lab reports
      supabase
        .from('lab_reports')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),

      // Lab markers
      supabase
        .from('lab_markers')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),

      // Chat conversations
      supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
    ])

    // Compile export data
    const exportData = {
      exportInfo: {
        userId,
        exportDate: new Date().toISOString(),
        dataTypes: ['profile', 'fitness_metrics', 'lab_reports', 'lab_markers', 'chat_conversations'],
        format: 'JSON',
        version: '1.0'
      },
      profile: profileResult.status === 'fulfilled' ? profileResult.value.data : null,
      fitnessMetrics: fitMetricsResult.status === 'fulfilled' ? fitMetricsResult.value.data : [],
      labReports: labReportsResult.status === 'fulfilled' ? labReportsResult.value.data : [],
      labMarkers: labMarkersResult.status === 'fulfilled' ? labMarkersResult.value.data : [],
      chatConversations: chatConversationsResult.status === 'fulfilled' ? chatConversationsResult.value.data : [],
      summary: {
        totalFitnessRecords: fitMetricsResult.status === 'fulfilled' ? (fitMetricsResult.value.data?.length || 0) : 0,
        totalLabReports: labReportsResult.status === 'fulfilled' ? (labReportsResult.value.data?.length || 0) : 0,
        totalLabMarkers: labMarkersResult.status === 'fulfilled' ? (labMarkersResult.value.data?.length || 0) : 0,
        totalChatMessages: chatConversationsResult.status === 'fulfilled' ? (chatConversationsResult.value.data?.length || 0) : 0
      }
    }

    // Remove sensitive fields
    if (exportData.profile) {
      delete exportData.profile.google_refresh_token
    }

    console.log(`Data export completed for user ${userId}:`, exportData.summary)

    // Return the data as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="healthos-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`
      }
    })

  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
} 