import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ChartDataPoint {
  day: string
  steps: number
  calories: number
  activeMinutes: number
  date: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '7')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

    // Fetch fitness data for the specified range
    const { data: fitnessData } = await supabase
      .from('fit_daily_metrics')
      .select('date, steps, calories_burned, active_minutes')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Create a map of existing data
    const dataMap = new Map()
    if (fitnessData) {
      fitnessData.forEach(item => {
        dataMap.set(item.date, {
          steps: item.steps || 0,
          calories: item.calories_burned || 0,
          activeMinutes: item.active_minutes || 0
        })
      })
    }

    // Generate chart data for all days in range (fill missing days with 0)
    const chartData: ChartDataPoint[] = []
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = currentDate.toISOString().split('T')[0]
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' })
      
      const data = dataMap.get(dateStr) || { steps: 0, calories: 0, activeMinutes: 0 }
      
      chartData.push({
        day: dayName,
        steps: data.steps,
        calories: data.calories,
        activeMinutes: data.activeMinutes,
        date: dateStr
      })
    }

    return NextResponse.json({
      chartData,
      success: true,
      summary: {
        totalDays: days,
        daysWithData: fitnessData?.length || 0,
        averageSteps: chartData.reduce((sum, item) => sum + item.steps, 0) / chartData.length,
        averageCalories: chartData.reduce((sum, item) => sum + item.calories, 0) / chartData.length,
        averageActiveMinutes: chartData.reduce((sum, item) => sum + item.activeMinutes, 0) / chartData.length
      }
    })

  } catch (error) {
    console.error('Chart data API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
} 