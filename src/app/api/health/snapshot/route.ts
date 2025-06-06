import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateUnifiedHealthScore, assessMarkerStatus, categorizeMarker } from '@/lib/healthScore'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HealthSnapshot {
  fitness: {
    stepsToday: number
    caloriesToday: number
    activeMinutesToday: number
    distanceToday: number
    stepsGoal: number
    caloriesGoal: number
    dataDate: string
    isCurrentDay: boolean
  }
  labHighlights: Array<{
    marker_name: string
    value: number
    unit: string
    status: 'optimal' | 'borderline' | 'high' | 'low' | 'normal'
    category: string
    taken_at: string
  }>
  trends: {
    stepsChange: number
    caloriesChange: number
    weeklyAverage: {
      steps: number
      calories: number
      activeMinutes: number
    }
  }
  healthScore: number
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const snapshot = await generateHealthSnapshot(userId)

    return NextResponse.json({
      snapshot,
      success: true
    })

  } catch (error) {
    console.error('Health snapshot API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate health snapshot' },
      { status: 500 }
    )
  }
}

async function generateHealthSnapshot(userId: string): Promise<HealthSnapshot> {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch today's fitness data
  const { data: todayMetrics } = await supabase
    .from('fit_daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .is('deleted_at', null)
    .single()

  // If today has no data, try yesterday
  let currentMetrics = todayMetrics
  let dataDate = today
  
  if (!currentMetrics || (currentMetrics.steps === 0 && currentMetrics.calories_burned === 0)) {
    const { data: yesterdayMetrics } = await supabase
      .from('fit_daily_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', yesterday)
      .is('deleted_at', null)
      .single()
    
    if (yesterdayMetrics && (yesterdayMetrics.steps > 0 || yesterdayMetrics.calories_burned > 0)) {
      currentMetrics = yesterdayMetrics
      dataDate = yesterday
      console.log(`Using yesterday's data (${yesterday}) because today (${today}) has no meaningful data`)
    }
  }

  // Fetch last 7 days for trends
  const { data: weekMetrics } = await supabase
    .from('fit_daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Fetch recent lab markers (last 5 key markers)
  const { data: labMarkers } = await supabase
    .from('lab_markers')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  // Build fitness snapshot with better labeling
  const fitness = {
    stepsToday: currentMetrics?.steps || 0,
    caloriesToday: currentMetrics?.calories_burned || 0,
    activeMinutesToday: currentMetrics?.active_minutes || 0,
    distanceToday: Math.round((currentMetrics?.distance_meters || 0) / 1000 * 10) / 10,
    stepsGoal: 10000,
    caloriesGoal: 400,
    // Add metadata about the data source
    dataDate: dataDate,
    isCurrentDay: dataDate === today
  }

  // Build lab highlights with status assessment
  const labHighlights = (labMarkers || []).map(marker => ({
    marker_name: marker.marker_name,
    value: marker.value,
    unit: marker.unit,
    status: assessMarkerStatus(marker.marker_name, marker.value, marker.unit),
    category: categorizeMarker(marker.marker_name),
    taken_at: marker.created_at
  }))

  // Calculate trends
  const trends = calculateWeeklyTrends(weekMetrics || [])

  // Calculate health score using unified algorithm
  const healthScore = calculateUnifiedHealthScore(
    {
      avgSteps: trends.weeklyAverage.steps,
      avgActiveMinutes: trends.weeklyAverage.activeMinutes
    },
    labHighlights.map(lab => ({
      status: lab.status,
      markerName: lab.marker_name,
      value: lab.value,
      unit: lab.unit
    })),
    {
      stepsChange: trends.stepsChange,
      caloriesChange: trends.caloriesChange
    }
  )

  return {
    fitness,
    labHighlights,
    trends,
    healthScore,
    lastUpdated: new Date().toISOString()
  }
}

function calculateWeeklyTrends(weekMetrics: Array<{
  date: string
  steps: number
  calories_burned: number
  active_minutes: number
}>): {
  stepsChange: number
  caloriesChange: number
  weeklyAverage: {
    steps: number
    calories: number
    activeMinutes: number
  }
} {
  if (weekMetrics.length < 2) {
    return {
      stepsChange: 0,
      caloriesChange: 0,
      weeklyAverage: {
        steps: weekMetrics[0]?.steps || 0,
        calories: weekMetrics[0]?.calories_burned || 0,
        activeMinutes: weekMetrics[0]?.active_minutes || 0
      }
    }
  }

  const sortedMetrics = weekMetrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const recent3Days = sortedMetrics.slice(-3)
  const previous3Days = sortedMetrics.slice(-6, -3)
  
  const recentAvgSteps = recent3Days.reduce((sum, m) => sum + m.steps, 0) / recent3Days.length
  const previousAvgSteps = previous3Days.length > 0 ? previous3Days.reduce((sum, m) => sum + m.steps, 0) / previous3Days.length : recentAvgSteps
  
  const recentAvgCalories = recent3Days.reduce((sum, m) => sum + m.calories_burned, 0) / recent3Days.length
  const previousAvgCalories = previous3Days.length > 0 ? previous3Days.reduce((sum, m) => sum + m.calories_burned, 0) / previous3Days.length : recentAvgCalories

  const weeklyAverage = {
    steps: Math.round(weekMetrics.reduce((sum, m) => sum + m.steps, 0) / weekMetrics.length),
    calories: Math.round(weekMetrics.reduce((sum, m) => sum + m.calories_burned, 0) / weekMetrics.length),
    activeMinutes: Math.round(weekMetrics.reduce((sum, m) => sum + m.active_minutes, 0) / weekMetrics.length)
  }

  const stepsChange =
    previousAvgSteps === 0
      ? 0
      : Math.round(((recentAvgSteps - previousAvgSteps) / previousAvgSteps) * 100)

  const caloriesChange =
    previousAvgCalories === 0
      ? 0
      : Math.round(((recentAvgCalories - previousAvgCalories) / previousAvgCalories) * 100)

  return {
    stepsChange,
    caloriesChange,
    weeklyAverage
  }
}
