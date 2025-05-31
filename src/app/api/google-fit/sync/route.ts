import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Types for Google Fit API responses
interface GoogleFitBucket {
  startTimeMillis: string;
  endTimeMillis: string;
  dataset: Array<{
    dataSourceId: string;
    point?: Array<{
      value: Array<{ intVal?: number; fpVal?: number }>;
    }>;
  }>;
}

interface GoogleFitResponse {
  bucket?: GoogleFitBucket[];
}

interface DailyMetrics {
  user_id: string;
  date: string;
  steps: number;
  distance_meters: number;
  calories_burned: number;
  active_minutes: number;
}

// Helper function to refresh Google access token
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    // Handle specific error cases
    if (data.error === 'invalid_grant') {
      throw new Error('REFRESH_TOKEN_EXPIRED: Your Google Fit connection has expired. Please reconnect your account.')
    }
    throw new Error(`Failed to refresh token: ${data.error}`)
  }

  return data.access_token
}

// Helper function to fetch Google Fit data
async function fetchFitData(accessToken: string, startDate: string, endDate: string) {
  const fitApiUrl = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate'
  
  const requestBody = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.active_minutes' },
      // Note: Removed distance as it might not be available for all users
    ],
    bucketByTime: { durationMillis: 86400000 }, // 1 day in milliseconds
    startTimeMillis: new Date(startDate).getTime(),
    endTimeMillis: new Date(endDate).getTime(),
  }

  const response = await fetch(fitApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Fit API error: ${data.error?.message || 'Unknown error'}`)
  }

  return data
}

// Helper function to parse and store fit data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseFitData(fitData: GoogleFitResponse, userId: string, supabase: any) {
  const dailyMetrics: DailyMetrics[] = []

  console.log('🔍 Processing', fitData.bucket?.length || 0, 'daily buckets')

  // Process each daily bucket
  if (fitData.bucket) {
    for (let i = 0; i < fitData.bucket.length; i++) {
      const bucket = fitData.bucket[i]
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0]
      
      const metrics: DailyMetrics = {
        user_id: userId,
        date,
        steps: 0,
        distance_meters: 0,
        calories_burned: 0,
        active_minutes: 0,
      }

      let hasData = false

      // Extract data from each dataset
      if (bucket.dataset) {
        for (const dataset of bucket.dataset) {
          if (dataset.point && dataset.point.length > 0) {
            hasData = true
            console.log(`📊 Day ${i + 1} (${date}): Found ${dataset.point.length} data points in ${dataset.dataSourceId}`)
            
            // More robust parsing of data source ID
            const dataSourceParts = dataset.dataSourceId.split(':')
            const dataTypeName = dataSourceParts.length > 1 ? dataSourceParts[1] : ''
            
            for (const point of dataset.point) {
              if (point.value && point.value.length > 0) {
                const value = point.value[0]?.intVal || point.value[0]?.fpVal || 0

                console.log(`  🔍 Processing dataTypeName: "${dataTypeName}", value: ${value}`)
                
                switch (dataTypeName) {
                  case 'step_count.delta':
                  case 'com.google.step_count.delta':
                    metrics.steps += Math.round(value)
                    console.log(`  👣 Steps: +${Math.round(value)} = ${metrics.steps}`)
                    break
                  case 'distance.delta':
                  case 'com.google.distance.delta':
                    metrics.distance_meters += Math.round(value)
                    console.log(`  📏 Distance: +${Math.round(value)}m = ${metrics.distance_meters}m`)
                    break
                  case 'calories.expended':
                  case 'com.google.calories.expended':
                    metrics.calories_burned += Math.round(value)
                    console.log(`  🔥 Calories: +${Math.round(value)} = ${metrics.calories_burned}`)
                    break
                  case 'active_minutes':
                  case 'com.google.active_minutes':
                    metrics.active_minutes += Math.round(value)
                    console.log(`  ⏱️ Active: +${Math.round(value)}min = ${metrics.active_minutes}min`)
                    break
                  default:
                    console.log(`  ❓ Unknown dataTypeName: "${dataTypeName}"`)
                }
              }
            }
          }
        }
      }

      if (!hasData) {
        console.log(`📊 Day ${i + 1} (${date}): No data points found`)
      }

      dailyMetrics.push(metrics)
    }
  }

      // Upsert metrics into database
    if (dailyMetrics.length > 0) {
      const { error } = await supabase
        .from('fit_daily_metrics')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(dailyMetrics as any, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
  }

  return dailyMetrics.length
}

export async function POST(request: Request) {
  let userId: string | undefined
  let supabase: any
  
  try {
    // Get user ID from request body
    const requestBody = await request.json()
    userId = requestBody.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Create server-side Supabase client with service role for database operations
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's Google refresh token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.google_refresh_token) {
      return NextResponse.json(
        { error: 'Google Fit not connected. Please connect your account first.' },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await refreshAccessToken(profile.google_refresh_token)

    // Fetch last 7 days of data (fix date calculation)
    const today = new Date()
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) // Tomorrow (to include today)
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6) // 7 days ago

    // Format dates properly for Google Fit API  
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    console.log('📅 Requesting date range:', startDateStr, 'to', endDateStr)
    console.log('📅 Today is:', today.toISOString().split('T')[0])

    const fitData = await fetchFitData(accessToken, startDateStr, endDateStr)

    // Parse and store the data (Task 3.3)
    const recordsStored = await parseFitData(fitData, userId, supabase)

    // Enhanced debugging
    console.log('🔍 SYNC DEBUG INFO:')
    console.log('📅 Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0])
    console.log('📊 Raw Google Fit response:', JSON.stringify(fitData, null, 2))
    console.log('💾 Records stored in database:', recordsStored)
    console.log('👤 User ID:', userId)

    return NextResponse.json({
      success: true,
      message: 'Google Fit data synced and stored successfully',
      data: fitData, // Return raw JSON for browser console
      recordsStored,
      recordCount: fitData.bucket?.length || 0
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync Google Fit data'
    console.error('Fit sync error:', errorMessage)
    
    // Handle expired refresh token
    if (errorMessage.includes('REFRESH_TOKEN_EXPIRED')) {
      try {
        // Clear the invalid refresh token if we have the necessary variables
        if (supabase && userId) {
          await supabase
            .from('profiles')
            .update({ google_refresh_token: null })
            .eq('id', userId)
          
          console.log('Cleared invalid refresh token for user:', userId)
        }
        
        return NextResponse.json(
          { 
            error: 'Google Fit connection expired. Please reconnect your account.',
            action: 'reconnect_required'
          },
          { status: 401 }
        )
      } catch (clearError) {
        console.error('Failed to clear invalid token:', clearError)
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 