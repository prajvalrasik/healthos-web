'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, Minus, Activity, Heart, Zap, Target } from 'lucide-react'

interface TrendData {
  fitnessHistory: Array<{
    date: string
    steps: number
    calories: number
    activeMinutes: number
    distance: number
  }>
  labTrends: Array<{
    markerName: string
    category: string
    unit: string
    history: Array<{
      date: string
      value: number
      status: string
    }>
    trend: 'improving' | 'stable' | 'declining' | 'unknown'
    prediction?: {
      nextValue: number
      confidence: number
      recommendation: string
    }
  }>
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

interface TrendsCardProps {
  userId: string
}

// Consistent date formatter that works the same on server and client
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}/${year}`
}

export default function TrendsCard({ userId }: TrendsCardProps) {
  const [trends, setTrends] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30')
  const [selectedView, setSelectedView] = useState<'fitness' | 'labs' | 'insights'>('fitness')
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchTrends()
    }
  }, [userId, selectedPeriod, mounted])

  const fetchTrends = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/health/trends?userId=${userId}&days=${selectedPeriod}`)
      const data = await response.json()
      
      if (data.success) {
        setTrends(data.trends)
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600 bg-green-50'
      case 'declining': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-100 text-green-800'
      case 'borderline': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Trends & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Trends & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!trends) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">No trend data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Trends & Analytics
          </CardTitle>
          
          {/* Period Selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['7', '30', '90'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="text-xs"
              >
                {period}d
              </Button>
            ))}
          </div>
        </div>

        {/* View Selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(['fitness', 'labs', 'insights'] as const).map((view) => (
            <Button
              key={view}
              variant={selectedView === view ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView(view)}
              className="text-xs capitalize"
            >
              {view}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Health Score */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">Overall Health Score</h3>
            {getTrendIcon(trends.insights.overallHealth.trend)}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-blue-600">
              {trends.insights.overallHealth.score}
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${trends.insights.overallHealth.score}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Key factors: {trends.insights.overallHealth.keyFactors.join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* Fitness View */}
        {selectedView === 'fitness' && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Fitness Trends
            </h3>
            
            {trends.fitnessHistory.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends.fitnessHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatDate}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={formatFullDate}
                      formatter={(value: any, name: string) => [
                        typeof value === 'number' ? value.toLocaleString() : value,
                        name === 'steps' ? 'Steps' : 
                        name === 'calories' ? 'Calories' :
                        name === 'activeMinutes' ? 'Active Minutes' : 'Distance (km)'
                      ]}
                    />
                    <Area type="monotone" dataKey="steps" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="calories" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No fitness data available for the selected period
              </div>
            )}

            {/* Fitness Insights */}
            <div className="space-y-2">
              {trends.insights.fitnessInsights.map((insight, index) => (
                <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                  <p className="text-sm text-blue-800">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Labs View */}
        {selectedView === 'labs' && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Lab Marker Trends
            </h3>
            
            {trends.labTrends.length > 0 ? (
              <div className="grid gap-4">
                {trends.labTrends.map((labTrend, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{labTrend.markerName}</h4>
                        <p className="text-xs text-gray-500">{labTrend.category} • {labTrend.unit}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getTrendColor(labTrend.trend)}`}>
                        {getTrendIcon(labTrend.trend)}
                        {labTrend.trend}
                      </div>
                    </div>

                    {labTrend.history.length > 1 && (
                      <div className="h-20 mb-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={labTrend.history}>
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                            <Tooltip 
                              labelFormatter={formatFullDate}
                              formatter={(value: any) => [value, labTrend.markerName]}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Latest Status */}
                    {labTrend.history.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Latest: {labTrend.history[labTrend.history.length - 1].value} {labTrend.unit}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(labTrend.history[labTrend.history.length - 1].status)}`}>
                          {labTrend.history[labTrend.history.length - 1].status}
                        </span>
                      </div>
                    )}

                    {/* Prediction */}
                    {labTrend.prediction && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">
                          Predicted next value: <span className="font-medium">{labTrend.prediction.nextValue} {labTrend.unit}</span>
                          <span className="ml-2">({Math.round(labTrend.prediction.confidence * 100)}% confidence)</span>
                        </div>
                        <p className="text-xs text-gray-700">{labTrend.prediction.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No lab data available for the selected period
              </div>
            )}

            {/* Lab Insights */}
            <div className="space-y-2">
              {trends.insights.labInsights.map((insight, index) => (
                <div key={index} className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                  <p className="text-sm text-green-800">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights View */}
        {selectedView === 'insights' && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Health Insights & Recommendations
            </h3>
            
            <div className="grid gap-4">
              {/* Fitness Insights */}
              {trends.insights.fitnessInsights.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-600 mb-2">🏃‍♂️ Activity & Fitness</h4>
                  <div className="space-y-2">
                    {trends.insights.fitnessInsights.map((insight, index) => (
                      <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                        <p className="text-sm text-blue-800">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab Insights */}
              {trends.insights.labInsights.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">🧪 Biomarker Analysis</h4>
                  <div className="space-y-2">
                    {trends.insights.labInsights.map((insight, index) => (
                      <div key={index} className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                        <p className="text-sm text-green-800">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions & Recommendations */}
              {trends.labTrends.some(trend => trend.prediction) && (
                <div>
                  <h4 className="font-medium text-purple-600 mb-2">🔮 Predictive Insights</h4>
                  <div className="space-y-3">
                    {trends.labTrends
                      .filter(trend => trend.prediction)
                      .map((trend, index) => (
                        <div key={index} className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded">
                          <h5 className="font-medium text-purple-800 text-sm">{trend.markerName}</h5>
                          <p className="text-sm text-purple-700 mt-1">{trend.prediction!.recommendation}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 