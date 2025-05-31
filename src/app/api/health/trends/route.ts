import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { subDays } from 'date-fns'
import { calculateUnifiedHealthScore, assessMarkerStatus, categorizeMarker } from '@/lib/healthScore'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface FitnessHistoryItem {
  date: string
  steps: number
  calories: number
  activeMinutes: number
  distance: number
}

interface LabHistoryItem {
  date: string
  value: number
  status: string
}

interface LabTrendItem {
  markerName: string
  category: string
  unit: string
  history: LabHistoryItem[]
  trend: 'improving' | 'stable' | 'declining' | 'unknown'
  prediction?: {
    nextValue: number
    confidence: number
    recommendation: string
  }
}

interface TrendData {
  fitnessHistory: Array<FitnessHistoryItem>
  labTrends: Array<LabTrendItem>
  insights: {
    fitnessInsights: string[]
    labInsights: string[]
    overallHealth: {
      score: number
      trend: 'improving' | 'stable' | 'declining'
      keyFactors: string[]
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const trendData = await generateTrendAnalysis(userId, days)

    return NextResponse.json({
      trends: trendData,
      success: true
    })

  } catch (error) {
    console.error('Trend analysis API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate trend analysis' },
      { status: 500 }
    )
  }
}

async function generateTrendAnalysis(userId: string, days: number): Promise<TrendData> {
  const startDate = subDays(new Date(), days).toISOString().split('T')[0]

  // Fetch comprehensive fitness history
  const { data: fitnessData } = await supabase
    .from('fit_daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', startDate)
    .order('date', { ascending: true })

  // Fetch lab marker history with grouping (limit to recent markers like snapshot)
  const { data: labData } = await supabase
    .from('lab_markers')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('created_at', startDate)
    .order('created_at', { ascending: false })
    .limit(5) // Match snapshot API limit

  // Process fitness history
  const fitnessHistory = (fitnessData || []).map(metric => ({
    date: metric.date,
    steps: metric.steps || 0,
    calories: metric.calories_burned || 0,
    activeMinutes: metric.active_minutes || 0,
    distance: Math.round((metric.distance_meters || 0) / 1000 * 10) / 10
  }))

  // Process lab trends by marker
  const labTrendsMap = new Map<string, LabTrendItem>()
  
  ;(labData || []).forEach(marker => {
    const key = marker.marker_name
    if (!labTrendsMap.has(key)) {
      labTrendsMap.set(key, {
        markerName: marker.marker_name,
        category: categorizeMarker(marker.marker_name),
        unit: marker.unit,
        history: [],
        trend: 'unknown' as const
      })
    }
    
    labTrendsMap.get(key)!.history.push({
      date: marker.created_at.split('T')[0],
      value: marker.value,
      status: assessMarkerStatus(marker.marker_name, marker.value, marker.unit)
    })
  })

  // Calculate trends and predictions for each marker
  const labTrends = Array.from(labTrendsMap.values()).map(markerData => {
    const history = markerData.history.sort((a: LabHistoryItem, b: LabHistoryItem) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    if (history.length < 2) {
      return { ...markerData, trend: 'unknown' as const }
    }

    // Simple trend analysis
    const firstHalf = history.slice(0, Math.floor(history.length / 2))
    const secondHalf = history.slice(Math.floor(history.length / 2))
    
    const firstAvg = firstHalf.reduce((sum: number, h: LabHistoryItem) => sum + h.value, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum: number, h: LabHistoryItem) => sum + h.value, 0) / secondHalf.length
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (Math.abs(changePercent) > 10) {
      // For markers where lower is better (like cholesterol)
      const isLowerBetter = markerData.markerName.toLowerCase().includes('cholesterol') || 
                           markerData.markerName.toLowerCase().includes('glucose')
      
      if (isLowerBetter) {
        trend = changePercent < 0 ? 'improving' : 'declining'
      } else {
        trend = changePercent > 0 ? 'improving' : 'declining'
      }
    }

    // Simple prediction (linear extrapolation)
    const prediction = history.length >= 3 ? {
      nextValue: Math.round((secondAvg + (secondAvg - firstAvg)) * 100) / 100,
      confidence: Math.max(0.3, Math.min(0.9, 1 - Math.abs(changePercent) / 100)),
      recommendation: generateRecommendation(markerData.markerName, trend)
    } : undefined

    return {
      ...markerData,
      trend,
      prediction
    }
  })

  // Generate insights
  const insights = generateHealthInsights(fitnessHistory, labTrends)

  return {
    fitnessHistory,
    labTrends,
    insights
  }
}

function generateRecommendation(markerName: string, trend: string): string {
  const name = markerName.toLowerCase()
  
  if (trend === 'improving') {
    return `Your ${markerName} is trending in a positive direction. Keep up your current health practices!`
  }
  
  if (trend === 'declining') {
    if (name.includes('cholesterol')) {
      return 'Consider dietary adjustments: reduce saturated fats, increase fiber intake, and maintain regular exercise.'
    }
    if (name.includes('glucose')) {
      return 'Monitor carbohydrate intake, increase physical activity, and consider consulting with a healthcare provider.'
    }
    if (name.includes('hemoglobin')) {
      return 'Ensure adequate iron intake through diet or supplements, and discuss with your doctor if levels continue declining.'
    }
  }
  
  return `Your ${markerName} appears stable. Continue monitoring and maintain current health practices.`
}

function generateHealthInsights(
  fitnessHistory: FitnessHistoryItem[],
  labTrends: LabTrendItem[]
): {
  fitnessInsights: string[]
  labInsights: string[]
  overallHealth: {
    score: number
    trend: 'improving' | 'stable' | 'declining'
    keyFactors: string[]
  }
} {
  const fitnessInsights: string[] = []
  const labInsights: string[] = []
  
  // Fitness insights
  if (fitnessHistory.length > 7) {
    const recentWeek = fitnessHistory.slice(-7)
    const avgSteps = recentWeek.reduce((sum, day) => sum + day.steps, 0) / 7
    
    if (avgSteps > 8000) {
      fitnessInsights.push('Excellent activity level! You\'re consistently exceeding recommended daily steps.')
    } else if (avgSteps > 5000) {
      fitnessInsights.push('Good activity level. Consider adding 1,000-2,000 more steps daily for optimal health.')
    } else {
      fitnessInsights.push('Low activity detected. Gradual increases in daily movement can significantly improve health outcomes.')
    }
    
    // Activity consistency
    const stepVariance = recentWeek.reduce((variance, day) => {
      return variance + Math.pow(day.steps - avgSteps, 2)
    }, 0) / 7
    
    if (stepVariance < 1000000) { // Low variance
      fitnessInsights.push('Great consistency in your activity levels! Regular exercise patterns support long-term health.')
    }
  }
  
  // Lab insights
  const improvingMarkers = labTrends.filter(trend => trend.trend === 'improving')
  const decliningMarkers = labTrends.filter(trend => trend.trend === 'declining')
  
  if (improvingMarkers.length > 0) {
    labInsights.push(`Positive trends detected in ${improvingMarkers.map(m => m.markerName).join(', ')}. Your health interventions are working!`)
  }
  
  if (decliningMarkers.length > 0) {
    labInsights.push(`Monitor ${decliningMarkers.map(m => m.markerName).join(', ')} - consider lifestyle adjustments or medical consultation.`)
  }
  
  // Overall health score using unified algorithm
  const avgSteps = fitnessHistory.length > 0 ? 
    fitnessHistory.reduce((sum, day) => sum + day.steps, 0) / fitnessHistory.length : 0
  const avgActiveMinutes = fitnessHistory.length > 0 ? 
    fitnessHistory.reduce((sum, day) => sum + day.activeMinutes, 0) / fitnessHistory.length : 0

  // Create lab data for unified scoring
  const recentLabData = labTrends.flatMap(trend => 
    trend.history.slice(-1).map((h: LabHistoryItem) => ({
      status: h.status,
      markerName: trend.markerName,
      value: h.value,
      unit: trend.unit
    }))
  )

  const healthScore = calculateUnifiedHealthScore(
    {
      avgSteps,
      avgActiveMinutes
    },
    recentLabData,
    {
      improvingCount: improvingMarkers.length,
      decliningCount: decliningMarkers.length,
      totalMarkers: labTrends.length
    }
  )

  const overallTrend = determineOverallTrend(improvingMarkers.length, decliningMarkers.length)
  
  const keyFactors: string[] = []
  if (fitnessHistory.length > 0) {
    if (avgSteps > 7000) keyFactors.push('Active lifestyle')
    if (avgSteps < 5000) keyFactors.push('Low activity levels')
  }
  
  if (improvingMarkers.length > decliningMarkers.length) {
    keyFactors.push('Improving biomarkers')
  } else if (decliningMarkers.length > improvingMarkers.length) {
    keyFactors.push('Some concerning trends')
  }
  
  return {
    fitnessInsights,
    labInsights,
    overallHealth: {
      score: healthScore,
      trend: overallTrend,
      keyFactors
    }
  }
}

function determineOverallTrend(improvingCount: number, decliningCount: number): 'improving' | 'stable' | 'declining' {
  if (improvingCount > decliningCount + 1) return 'improving'
  if (decliningCount > improvingCount + 1) return 'declining'
  return 'stable'
} 