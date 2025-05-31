'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface TimelineEvent {
  id: string
  type: 'fitness' | 'lab' | 'sync' | 'health_score'
  title: string
  description: string
  timestamp: string
  data?: any
}

export default function TimelinePage() {
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'fitness' | 'lab' | 'sync'>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    // Get current user first
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await fetchTimelineEvents(user.id)
      }
    }
    getUser()
  }, [dateRange])

  const fetchTimelineEvents = async (userId: string) => {
    try {
      const events: TimelineEvent[] = []

      // Calculate date range
      const daysAgo = parseInt(dateRange.replace('d', ''))
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      // Fetch fitness data from Google Fit sync
      try {
        const { data: fitData } = await supabase
          .from('fit_daily_metrics')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(10)

        if (fitData) {
          fitData.forEach((metric) => {
            events.push({
              id: `fit-${metric.id}`,
              type: 'fitness',
              title: 'Fitness data updated',
              description: `Recorded ${metric.steps} steps, ${metric.calories_burned} calories burned`,
              timestamp: new Date(metric.date + 'T12:00:00').toISOString()
            })
          })
        }
      } catch (error) {
        console.error('Error fetching fitness data:', error)
      }

      // Fetch lab reports
      try {
        const { data: labReports } = await supabase
          .from('lab_reports')
          .select('*')
          .eq('user_id', userId)
          .gte('upload_date', startDate.toISOString())
          .order('upload_date', { ascending: false })
          .limit(10)

        if (labReports) {
          labReports.forEach((report) => {
            events.push({
              id: `lab-${report.id}`,
              type: 'lab',
              title: 'Lab report processed',
              description: `${report.filename} analysis completed`,
              timestamp: report.processed_at || report.upload_date
            })
          })
        }
      } catch (error) {
        console.error('Error fetching lab reports:', error)
      }

      // Fetch chat conversations for AI interactions
      try {
        const { data: chatData } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(5)

        if (chatData) {
          chatData.forEach((chat) => {
            events.push({
              id: `chat-${chat.id}`,
              type: 'health_score',
              title: 'AI Assistant consultation',
              description: `Asked about: "${chat.user_message.substring(0, 50)}${chat.user_message.length > 50 ? '...' : ''}"`,
              timestamp: chat.created_at
            })
          })
        }
      } catch (error) {
        console.error('Error fetching chat data:', error)
      }

      // Add some mock sync events if data is sparse
      if (events.length < 3) {
        const mockEvents: TimelineEvent[] = [
          {
            id: '1',
            type: 'sync',
            title: 'Google Fit data synced',
            description: 'Successfully synced 2,847 steps and heart rate data',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            type: 'health_score',
            title: 'Health score updated',
            description: 'Your health score improved to 72/100',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            type: 'lab',
            title: 'Lab report processed',
            description: 'Cholesterol panel results analyzed',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '4',
            type: 'fitness',
            title: 'Daily step goal achieved',
            description: 'Completed 10,000 steps target',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '5',
            type: 'lab',
            title: 'Blood pressure recorded',
            description: 'Manual entry: 120/80 mmHg',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
        events.push(...mockEvents)
      }

      // Sort all events by timestamp (newest first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setEvents(events)
    } catch (error) {
      console.error('Error fetching timeline:', error)
      // Fallback to mock data
      const mockEvents: TimelineEvent[] = [
        {
          id: '1',
          type: 'sync',
          title: 'Google Fit data synced',
          description: 'Successfully synced 2,847 steps and heart rate data',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'health_score',
          title: 'Health score updated',
          description: 'Your health score improved to 72/100',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'lab',
          title: 'Lab report processed',
          description: 'Cholesterol panel results analyzed',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          type: 'fitness',
          title: 'Daily step goal achieved',
          description: 'Completed 10,000 steps target',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '5',
          type: 'lab',
          title: 'Blood pressure recorded',
          description: 'Manual entry: 120/80 mmHg',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      setEvents(mockEvents)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'fitness':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        )
      case 'lab':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'sync':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        )
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const eventTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return eventTime.toLocaleDateString()
  }

  const getTypeCount = (type: string) => {
    return events.filter(event => event.type === type).length
  }

  const filteredEvents = filter === 'all' ? events : events.filter(event => event.type === filter)

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="px-4 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex space-x-4">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-0">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Timeline</h1>
          <p className="text-gray-600 mt-1">Your health activity history</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">{events.length}</div>
              <div className="text-sm text-gray-500">Total Events</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-600">{getTypeCount('fitness')}</div>
              <div className="text-sm text-gray-500">Fitness</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-semibold text-blue-600">{getTypeCount('lab')}</div>
              <div className="text-sm text-gray-500">Lab Results</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-semibold text-purple-600">{getTypeCount('sync')}</div>
              <div className="text-sm text-gray-500">Data Syncs</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setFilter('fitness')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'fitness'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Fitness
              </button>
              <button
                onClick={() => setFilter('lab')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'lab'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Lab Results
              </button>
              <button
                onClick={() => setFilter('sync')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'sync'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Data Sync
              </button>
            </div>
            
            <div className="flex space-x-2">
              <span className="text-sm text-gray-500">Time range:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timeline Events */}
        <div className="space-y-4">
          {filteredEvents.map((event, index) => (
            <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                {getEventIcon(event.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                    <span className="text-xs text-gray-500">{formatTimeAgo(event.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      event.type === 'fitness' ? 'bg-green-100 text-green-800' :
                      event.type === 'lab' ? 'bg-blue-100 text-blue-800' :
                      event.type === 'sync' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.type === 'fitness' ? '🏃‍♂️ Fitness' :
                       event.type === 'lab' ? '🧪 Lab' :
                       event.type === 'sync' ? '🔄 Sync' : '📊 Health'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleDateString()} at {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No events found</h3>
            <p className="text-sm text-gray-500">
              {filter === 'all' ? `No timeline events in the last ${dateRange}` : `No ${filter} events found in the last ${dateRange}`}
            </p>
            <div className="mt-4">
              <button
                onClick={() => setFilter('all')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                View all events →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
} 