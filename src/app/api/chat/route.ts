import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    // Fetch recent fitness metrics
    const { data: metrics } = await supabase
      .from('fit_daily_metrics')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(7)

    // Fetch recent lab markers
    const { data: labMarkers } = await supabase
      .from('lab_markers')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate trends
    const trends = calculateTrends(metrics || [])

    return {
      recentMetrics: metrics || [],
      labMarkers: labMarkers || [],
      trends
    }
  } catch (error) {
    console.error('Error fetching health context:', error)
    return {}
  }
}

function calculateTrends(metrics: Array<{
  steps: number
  calories_burned: number
}>): string {
  if (metrics.length < 2) return 'Insufficient data for trends'

  const recent = metrics[0]
  const previous = metrics[1]

  const stepsTrend = recent.steps > previous.steps ? 'increasing' : 'decreasing'
  const caloriesTrend = recent.calories_burned > previous.calories_burned ? 'increasing' : 'decreasing'

  return `Steps are ${stepsTrend}, calories are ${caloriesTrend}`
}

async function generateHealthResponse(message: string, context: HealthContext): Promise<string> {
  // For now, we'll create a rule-based response system
  // In production, this would integrate with OpenAI/Claude API
  
  const lowerMessage = message.toLowerCase()
  
  // Health insights based on context
  if (lowerMessage.includes('steps') || lowerMessage.includes('walking')) {
    const recentSteps = context.recentMetrics?.[0]?.steps || 0
    if (recentSteps > 8000) {
      return `Great job! You've been walking ${recentSteps.toLocaleString()} steps recently. You're exceeding the recommended 8,000 steps per day. Keep up the excellent work! 🚶‍♂️✨`
    } else if (recentSteps > 5000) {
      return `You're doing well with ${recentSteps.toLocaleString()} steps recently. Try to aim for 8,000+ steps daily for optimal health benefits. Maybe take a walk after meals? 🌟`
    } else {
      return `I see you've walked ${recentSteps.toLocaleString()} steps recently. Consider gradually increasing your daily walks. Even a 10-minute walk can boost your energy and mood! 💪`
    }
  }

  if (lowerMessage.includes('calories') || lowerMessage.includes('burn')) {
    const recentCalories = context.recentMetrics?.[0]?.calories_burned || 0
    return `You've burned ${recentCalories} calories in your recent activity. ${context.trends}. Remember, consistency is key for maintaining a healthy metabolism! 🔥`
  }

  if (lowerMessage.includes('lab') || lowerMessage.includes('results') || lowerMessage.includes('markers')) {
    const markerCount = context.labMarkers?.length || 0
    if (markerCount > 0) {
      const recentMarker = context.labMarkers?.[0]
      return `I can see you have ${markerCount} lab markers tracked. Your most recent marker shows ${recentMarker?.marker_name}: ${recentMarker?.value} ${recentMarker?.unit}. Always discuss lab results with your healthcare provider for proper interpretation. 📊`
    } else {
      return `I don't see any lab results uploaded yet. You can upload your lab reports in the dashboard for personalized insights about your biomarkers. 🧪`
    }
  }

  if (lowerMessage.includes('trend') || lowerMessage.includes('progress')) {
    return `Based on your recent data: ${context.trends}. Your health journey is unique - small consistent improvements lead to big results over time! 📈`
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `Hello! I'm your HealthOS assistant. I can help you understand your fitness data, lab results, and health trends. What would you like to know about your health today? 👋`
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return `I can help you with:
• 📊 Analyzing your fitness metrics (steps, calories, active minutes)
• 🧪 Understanding your lab results and biomarkers
• 📈 Tracking health trends over time
• 💡 Providing personalized health insights
• 🎯 Setting realistic health goals

What specific area would you like to explore?`
  }

  // Default response
  return `I understand you're asking about "${message}". While I'm still learning, I can help you analyze your fitness data, lab results, and health trends. Try asking about your steps, calories, lab markers, or recent progress! 🤖💙`
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