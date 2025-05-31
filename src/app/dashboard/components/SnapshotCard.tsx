'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface HealthSnapshot {
  fitness: {
    stepsToday: number
    caloriesToday: number
    activeMinutesToday: number
    distanceToday: number
    stepsGoal: number
    caloriesGoal: number
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

interface SnapshotCardProps {
  userId: string
}

// Consistent time formatter to prevent hydration mismatch
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${displayHours}:${displayMinutes} ${ampm}`
}

export default function SnapshotCard({ userId }: SnapshotCardProps) {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchSnapshot()
    }
  }, [userId, mounted])

  const fetchSnapshot = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/health/snapshot?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setSnapshot(data.snapshot)
      } else {
        setError(data.error || 'Failed to load snapshot')
      }
    } catch (err) {
      setError('Failed to load health snapshot')
      console.error('Snapshot fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Today's Health Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-600">Loading your health data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Today's Health Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-600">Loading your health data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !snapshot) {
    return (
      <Card className="bg-gradient-to-br from-red-50 to-pink-100 border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Today's Health Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">⚠️ Unable to load snapshot</div>
            <p className="text-slate-600 text-sm mb-4">{error}</p>
            <Button onClick={fetchSnapshot} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-emerald-600 bg-emerald-100'
      case 'normal': return 'text-blue-600 bg-blue-100'
      case 'borderline': return 'text-yellow-600 bg-yellow-100'
      case 'high':
      case 'low': return 'text-red-600 bg-red-100'
      default: return 'text-slate-600 bg-slate-100'
    }
  }

  const getTrendIcon = (change: number) => {
    if (change > 5) return '📈'
    if (change < -5) return '📉'
    return '➡️'
  }

  const getTrendColor = (change: number) => {
    if (change > 5) return 'text-emerald-600'
    if (change < -5) return 'text-red-600'
    return 'text-slate-600'
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-none shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
            Today's Health Snapshot
          </CardTitle>
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getHealthScoreBg(snapshot.healthScore)} ${getHealthScoreColor(snapshot.healthScore)}`}>
            {snapshot.healthScore}/100
          </div>
        </div>
        <p className="text-slate-600 text-sm">
          Last updated: {formatTime(snapshot.lastUpdated)}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fitness Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Steps */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Steps</span>
              <span className="text-xs">{getTrendIcon(snapshot.trends.stepsChange)}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">
              {snapshot.fitness.stepsToday.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">
              Goal: {snapshot.fitness.stepsGoal.toLocaleString()}
            </div>
            <div className={`text-xs font-medium ${getTrendColor(snapshot.trends.stepsChange)}`}>
              {snapshot.trends.stepsChange > 0 ? '+' : ''}{snapshot.trends.stepsChange}% vs last 3 days
            </div>
          </div>

          {/* Calories */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Calories</span>
              <span className="text-xs">{getTrendIcon(snapshot.trends.caloriesChange)}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">
              {snapshot.fitness.caloriesToday}
            </div>
            <div className="text-xs text-slate-500">
              Goal: {snapshot.fitness.caloriesGoal}
            </div>
            <div className={`text-xs font-medium ${getTrendColor(snapshot.trends.caloriesChange)}`}>
              {snapshot.trends.caloriesChange > 0 ? '+' : ''}{snapshot.trends.caloriesChange}% vs last 3 days
            </div>
          </div>

          {/* Active Minutes */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Active</span>
              <span className="text-xs">⏱️</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">
              {snapshot.fitness.activeMinutesToday}
            </div>
            <div className="text-xs text-slate-500">
              minutes
            </div>
            <div className="text-xs text-slate-600">
              Weekly avg: {snapshot.trends.weeklyAverage.activeMinutes}min
            </div>
          </div>

          {/* Distance */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Distance</span>
              <span className="text-xs">🚶‍♂️</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">
              {snapshot.fitness.distanceToday}
            </div>
            <div className="text-xs text-slate-500">
              kilometers
            </div>
            <div className="text-xs text-slate-600">
              Steps/km: {snapshot.fitness.distanceToday > 0 ? Math.round(snapshot.fitness.stepsToday / snapshot.fitness.distanceToday) : 0}
            </div>
          </div>
        </div>

        {/* Lab Highlights */}
        {snapshot.labHighlights.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span>🧪</span>
              Recent Lab Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {snapshot.labHighlights.slice(0, 4).map((lab, index) => (
                <div key={index} className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{lab.marker_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lab.status)}`}>
                      {lab.status}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">
                    {lab.value} {lab.unit}
                  </div>
                  <div className="text-xs text-slate-500">
                    {lab.category} • {new Date(lab.taken_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Score Summary */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Overall Health Score</h3>
            <div className={`text-2xl font-bold ${getHealthScoreColor(snapshot.healthScore)}`}>
              {snapshot.healthScore}/100
            </div>
          </div>
          
          {/* Score Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                snapshot.healthScore >= 80 ? 'bg-emerald-500' :
                snapshot.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${snapshot.healthScore}%` }}
            ></div>
          </div>

          <div className="text-xs text-slate-600">
            Based on fitness activity, lab results, and recent trends
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSnapshot}
            className="flex-1 bg-white/50 hover:bg-white/80 border-white/50"
          >
            <span className="mr-1">🔄</span>
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 bg-white/50 hover:bg-white/80 border-white/50"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          >
            <span className="mr-1">💬</span>
            Ask AI
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 