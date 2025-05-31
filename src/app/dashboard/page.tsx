'use client'

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'
import type { User } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface HealthMetrics {
  healthScore: number
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
  lastUpdated: string
}

interface RealStepsTrendData {
  day: string
  steps: number
  calories: number
  activeMinutes: number
  date: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [stepsTrendData, setStepsTrendData] = useState<RealStepsTrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [hasRealData, setHasRealData] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  useEffect(() => {
    // Get current user first
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await fetchHealthMetrics(user.id)
        await fetchStepsTrendData(user.id)
        await checkGoogleFitConnection(user.id)
      }
    }
    getUser()
  }, [])

  const checkGoogleFitConnection = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', userId)
        .single()
      
      setIsConnected(!!data?.google_refresh_token)
    } catch (error) {
      console.error('Error checking Google Fit connection:', error)
    }
  }

  const fetchStepsTrendData = async (userId: string) => {
    try {
      // Use the new chart data API endpoint
      const response = await fetch(`/api/health/chart-data?userId=${userId}&days=7`)
      const data = await response.json()

      if (data.success && data.chartData) {
        setStepsTrendData(data.chartData)
        console.log('Chart data loaded:', data.summary)
        
        // Check if we have meaningful data (not all zeros)
        const totalSteps = data.chartData.reduce((sum: number, item: any) => sum + item.steps, 0)
        const hasMeaningfulData = totalSteps > 0 || data.summary.daysWithData > 0
        setHasRealData(hasMeaningfulData)
        
        if (hasMeaningfulData) {
          setLastSyncTime(new Date().toISOString())
        }
      } else {
        console.log('Chart data API failed, using fallback')
        // Fallback to some default data if API fails
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const fallbackData = days.map((day, index) => ({
          day,
          steps: 0,
          calories: 0,
          activeMinutes: 0,
          date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }))
        setStepsTrendData(fallbackData)
        setHasRealData(false)
      }
    } catch (error) {
      console.error('Error fetching steps trend data:', error)
      // Set empty fallback data
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const fallbackData = days.map((day, index) => ({
        day,
        steps: 0,
        calories: 0,
        activeMinutes: 0,
        date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }))
      setStepsTrendData(fallbackData)
      setHasRealData(false)
    }
  }

  const fetchHealthMetrics = async (userId: string) => {
    try {
      const response = await fetch(`/api/health/snapshot?userId=${userId}`)
      const data = await response.json()
      
      if (data.success && data.snapshot) {
        setMetrics(data.snapshot)
        
        // Check if we have real fitness data
        const fitness = data.snapshot.fitness
        const hasRealFitnessData = fitness.stepsToday > 0 || fitness.caloriesToday > 0 || fitness.activeMinutesToday > 0
        console.log('Health snapshot loaded. Has real fitness data:', hasRealFitnessData, fitness)
        
        // Update hasRealData state based on meaningful fitness data
        if (hasRealFitnessData) {
          setHasRealData(true)
          setLastSyncTime(new Date().toISOString())
        }
      } else {
        console.log('Health snapshot API failed, using defaults')
        // Set default metrics structure matching API response
        setMetrics({
          healthScore: 0,
          fitness: {
            stepsToday: 0,
            caloriesToday: 0,
            activeMinutesToday: 0,
            distanceToday: 0,
            stepsGoal: 10000,
            caloriesGoal: 400,
            dataDate: '',
            isCurrentDay: false
          },
          labHighlights: [],
          trends: {
            stepsChange: 0,
            caloriesChange: 0,
            weeklyAverage: {
              steps: 0,
              calories: 0,
              activeMinutes: 0
            }
          },
          lastUpdated: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error fetching health metrics:', error)
      // Set default metrics on error
      setMetrics({
        healthScore: 0,
        fitness: {
          stepsToday: 0,
          caloriesToday: 0,
          activeMinutesToday: 0,
          distanceToday: 0,
          stepsGoal: 10000,
          caloriesGoal: 400,
          dataDate: '',
          isCurrentDay: false
        },
        labHighlights: [],
        trends: {
          stepsChange: 0,
          caloriesChange: 0,
          weeklyAverage: {
            steps: 0,
            calories: 0,
            activeMinutes: 0
          }
        },
        lastUpdated: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGoogleFit = () => {
    if (!user) return
    
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '')
    googleAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/google-fit/exchange`)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')
    googleAuthUrl.searchParams.set('state', user.id) // Pass user ID for identification

    window.location.href = googleAuthUrl.toString()
  }

  const handleSyncGoogleFit = async () => {
    if (!user) return
    
    setIsSyncing(true)
    try {
      // Fixed: Send userId in request body, not query parameter
      const response = await fetch('/api/google-fit/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Sync successful:', result)
        
        // Show user feedback about sync results
        if (result.recordsStored > 0) {
          alert(`✅ Sync successful! Updated ${result.recordsStored} days of data.`)
        } else {
          alert('ℹ️ Sync completed, but no new data was found.')
        }
        
        // Refresh metrics and trend data after sync
        await fetchHealthMetrics(user.id)
        await fetchStepsTrendData(user.id)
      } else {
        const error = await response.json()
        console.error('Sync failed:', error)
        
        // Handle expired token specifically
        if (response.status === 401 && error.action === 'reconnect_required') {
          setIsConnected(false) // This will show the "Connect Google Fit" button instead
          alert('🔄 Your Google Fit connection has expired. Please reconnect your account.')
        } else {
          alert(`❌ Sync failed: ${error.error}`)
        }
      }
    } catch (error) {
      console.error('Error syncing Google Fit:', error)
      alert('❌ Sync failed: Network error')
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  // Safe access with fallbacks
  const healthScore = metrics?.healthScore || 0
  const fitness = metrics?.fitness || {
    stepsToday: 0,
    caloriesToday: 0,
    activeMinutesToday: 0,
    distanceToday: 0,
    stepsGoal: 10000,
    caloriesGoal: 400,
    dataDate: '',
    isCurrentDay: false
  }
  const labHighlights = metrics?.labHighlights || []
  const trends = metrics?.trends || {
    stepsChange: 0,
    caloriesChange: 0,
    weeklyAverage: { steps: 0, calories: 0, activeMinutes: 0 }
  }

  const stepsProgress = fitness.stepsGoal > 0 ? (fitness.stepsToday / fitness.stepsGoal) * 100 : 0
  const caloriesProgress = fitness.caloriesGoal > 0 ? (fitness.caloriesToday / fitness.caloriesGoal) * 100 : 0

  const getTrendIcon = (change: number) => {
    if (change > 5) return '↗️'
    if (change < -5) return '↘️'
    return '→'
  }

  const getTrendColor = (change: number) => {
    if (change > 5) return 'text-green-600'
    if (change < -5) return 'text-red-600'
    return 'text-gray-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-100 text-green-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'borderline': return 'bg-yellow-100 text-yellow-800'
      case 'high':
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-0">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {user.email?.split('@')[0]}</h1>
          <p className="text-gray-600 mt-1">Your health overview at a glance</p>
        </div>

        {/* Daily Metrics Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Daily Metrics</h2>
              {fitness.dataDate && (
                <p className="text-sm text-gray-500">
                  {fitness.isCurrentDay 
                    ? `Today (${new Date(fitness.dataDate).toLocaleDateString()})`
                    : `Latest data from ${new Date(fitness.dataDate).toLocaleDateString()}`
                  }
                </p>
              )}
            </div>
            {!fitness.isCurrentDay && fitness.dataDate && (
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                Showing yesterday's data
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Steps */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Steps</h3>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {fitness.stepsToday.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Goal: {fitness.stepsGoal.toLocaleString()}</p>
                </div>
                <span className={`text-sm font-medium ${getTrendColor(trends.stepsChange)}`}>
                  {getTrendIcon(trends.stepsChange)} {Math.abs(trends.stepsChange)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gray-900 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(stepsProgress, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Activity</h3>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {fitness.activeMinutesToday} min
                  </p>
                  <p className="text-sm text-gray-500">Goal: 60 min</p>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {Math.round((fitness.activeMinutesToday / 60) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gray-900 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((fitness.activeMinutesToday / 60) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Calories */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Calories</h3>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {fitness.caloriesToday}
                  </p>
                  <p className="text-sm text-gray-500">Goal: {fitness.caloriesGoal}</p>
                </div>
                <span className={`text-sm font-medium ${getTrendColor(trends.caloriesChange)}`}>
                  {getTrendIcon(trends.caloriesChange)} {Math.abs(trends.caloriesChange)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gray-900 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(caloriesProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Score and Recent Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Health Score */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Health Score</h2>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-semibold text-gray-900">
                    {healthScore}
                  </span>
                  <span className="text-gray-500 text-lg">/100</span>
                </div>
              </div>
              <div className="w-24 h-24 relative">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f3f4f6"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#374151"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthScore / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Recent Highlights */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Highlights</h3>
            {labHighlights.length > 0 ? (
              <div className="space-y-3">
                {labHighlights.slice(0, 3).map((lab, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{lab.marker_name}</span>
                      <p className="text-xs text-gray-500">{lab.category}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900">{lab.value} {lab.unit}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lab.status)}`}>
                        {lab.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📋</div>
                <p className="text-gray-500 text-sm">No recent lab data available</p>
                <a href="/labs" className="text-sm text-gray-700 hover:text-gray-900 mt-2 inline-block">
                  Upload your first lab report →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Steps Trend Chart - Now using real data */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Steps Trend (Last 7 Days)</h3>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-2xl font-semibold text-gray-900">
                  {fitness.stepsToday.toLocaleString()}
                </span>
                <span className={`text-sm font-medium ${getTrendColor(trends.stepsChange)}`}>
                  Last 7 Days {getTrendIcon(trends.stepsChange)}{Math.abs(trends.stepsChange)}%
                </span>
              </div>
            </div>
            {!isConnected && (
              <button
                onClick={handleConnectGoogleFit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Connect Google Fit
              </button>
            )}
            {isConnected && (
              <button
                onClick={handleSyncGoogleFit}
                disabled={isSyncing}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stepsTrendData}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis hide />
                <Line
                  type="monotone"
                  dataKey="steps"
                  stroke="#374151"
                  strokeWidth={2}
                  dot={{ fill: '#374151', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#374151' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Assistant Teaser */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-start space-x-6">
            {/* AI Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Health Assistant</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Get personalized insights about your health trends, lab results, and activity patterns. 
                Ask questions like "How has my activity improved this month?" or "What do my recent lab results indicate?"
              </p>
              
              {/* Example Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>"What's my average daily steps?"</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>"How are my lab results trending?"</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>"Show me my health improvements"</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>"Any health recommendations?"</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <a 
                href="/ai-assistant"
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Start Conversation
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 