import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatWithFallback } from '@/lib/llm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HealthContext {
  recentMetrics?: Array<{
    user_id: string
    date: string
    steps: number
    distance_meters: number
    calories_burned: number
    active_minutes: number
  }>
  labMarkers?: Array<{
    id: string
    user_id: string
    marker_name: string
    value: number
    unit: string
    created_at: string
  }>
  trends?: string
  recentChats?: Array<{
    user_message: string
    ai_response: string
    created_at: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json()

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      )
    }

    // Fetch user's health context for RAG
    const healthContext = await fetchHealthContext(userId)
    
    // Generate AI response based on context
    const aiResponse = await generateHealthResponse(message, healthContext)

    // Store conversation in database
    await storeConversation(userId, message, aiResponse)

    return NextResponse.json({
      response: aiResponse,
      context: healthContext
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

async function fetchHealthContext(userId: string): Promise<HealthContext> {
  try {
    // Fetch recent fitness metrics (last 14 days for better trend analysis)
    const { data: metrics } = await supabase
      .from('fit_daily_metrics')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(14)

    // Fetch recent lab markers (last 20 markers for comprehensive view)
    const { data: labMarkers } = await supabase
      .from('lab_markers')
      .select('id, user_id, marker_name, value, unit, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch recent chat conversations for context continuity
    const { data: recentChats } = await supabase
      .from('chat_conversations')
      .select('user_message, ai_response, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Calculate comprehensive trends
    const trends = calculateComprehensiveTrends(metrics || [])

    return {
      recentMetrics: metrics || [],
      labMarkers: labMarkers || [],
      trends,
      recentChats: recentChats || []
    }
  } catch (error) {
    console.error('Error fetching health context:', error)
    return {}
  }
}

function calculateComprehensiveTrends(metrics: Array<{
  date: string
  steps: number
  calories_burned: number
  active_minutes: number
  distance_meters: number
}>): string {
  if (metrics.length < 3) return 'Insufficient data for trend analysis'

  // Sort by date to ensure proper chronological order
  const sortedMetrics = metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (sortedMetrics.length < 3) return 'Need more data for trends'

  // Calculate 7-day trends vs previous 7 days
  const recent7Days = sortedMetrics.slice(-7)
  const previous7Days = sortedMetrics.slice(-14, -7)

  if (recent7Days.length === 0) return 'No recent data available'

  const recentAvg = {
    steps: Math.round(recent7Days.reduce((sum, m) => sum + m.steps, 0) / recent7Days.length),
    calories: Math.round(recent7Days.reduce((sum, m) => sum + m.calories_burned, 0) / recent7Days.length),
    activeMinutes: Math.round(recent7Days.reduce((sum, m) => sum + m.active_minutes, 0) / recent7Days.length),
    distance: Math.round(recent7Days.reduce((sum, m) => sum + m.distance_meters, 0) / recent7Days.length / 1000 * 10) / 10
  }

  if (previous7Days.length === 0) {
    return `Recent 7-day averages: ${recentAvg.steps.toLocaleString()} steps, ${recentAvg.calories} calories, ${recentAvg.activeMinutes} active minutes, ${recentAvg.distance}km distance`
  }

  const previousAvg = {
    steps: Math.round(previous7Days.reduce((sum, m) => sum + m.steps, 0) / previous7Days.length),
    calories: Math.round(previous7Days.reduce((sum, m) => sum + m.calories_burned, 0) / previous7Days.length),
    activeMinutes: Math.round(previous7Days.reduce((sum, m) => sum + m.active_minutes, 0) / previous7Days.length)
  }

  // Calculate percentage changes
  const stepChange = ((recentAvg.steps - previousAvg.steps) / previousAvg.steps * 100)
  const calorieChange = ((recentAvg.calories - previousAvg.calories) / previousAvg.calories * 100)
  const activeChange = ((recentAvg.activeMinutes - previousAvg.activeMinutes) / previousAvg.activeMinutes * 100)

  const trends = []
  
  if (Math.abs(stepChange) > 5) {
    trends.push(`Steps ${stepChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(stepChange).toFixed(1)}%`)
  } else {
    trends.push(`Steps remain stable around ${recentAvg.steps.toLocaleString()}`)
  }

  if (Math.abs(calorieChange) > 5) {
    trends.push(`calories ${calorieChange > 0 ? 'up' : 'down'} ${Math.abs(calorieChange).toFixed(1)}%`)
  } else {
    trends.push(`calories stable at ${recentAvg.calories}`)
  }

  if (Math.abs(activeChange) > 10) {
    trends.push(`active time ${activeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(activeChange).toFixed(1)}%`)
  }

  return trends.join(', ')
}

async function generateHealthResponse(message: string, context: HealthContext): Promise<string> {
  try {
    // Use the new AI-powered chat with Gemini and rule-based fallback
    const response = await chatWithFallback(message, context)
    return response
  } catch (error) {
    console.error('Error in generateHealthResponse:', error)
    
    // Final fallback to a simple response
    return `I'm having trouble processing your request right now. Please try again in a moment. In the meantime, you can explore your health data in the dashboard or ask me about your steps, calories, or lab results! 🤖`
  }
}

async function storeConversation(userId: string, userMessage: string, aiResponse: string) {
  try {
    await supabase
      .from('chat_conversations')
      .insert([
        {
          user_id: userId,
          user_message: userMessage,
          ai_response: aiResponse,
          created_at: new Date().toISOString()
        }
      ])
  } catch (error) {
    console.error('Error storing conversation:', error)
    // Don't throw error - conversation storage is not critical
  }
} 