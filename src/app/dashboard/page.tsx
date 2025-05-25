'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import FitSyncButton from './components/FitSyncButton'
import LabMarkers from './components/LabMarkers'
import HealthChat from './components/HealthChat'
import type { User } from '@supabase/supabase-js'

// Lazy-load Timeline component (Task 4.4)
const Timeline = dynamic(() => import('./components/Timeline'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
      <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
      <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
    </div>
  )
})

interface FitMetric {
  id: string
  date: string
  steps: number
  distance_meters: number
  calories_burned: number
  active_minutes: number
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [fitMetrics, setFitMetrics] = useState<FitMetric[]>([])
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Check URL parameters for OAuth results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const connected = urlParams.get('connected')
    const error = urlParams.get('error')

    if (connected === 'true') {
      setStatusMessage({ type: 'success', message: 'Google Fit connected successfully!' })
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        oauth_denied: 'OAuth permission denied',
        no_code: 'No authorization code received',
        not_authenticated: 'Please sign in first',
        token_exchange_failed: 'Failed to exchange tokens with Google',
        database_error: 'Failed to save connection',
        server_error: 'Server error occurred'
      }
      setStatusMessage({ 
        type: 'error', 
        message: errorMessages[error] || 'Connection failed' 
      })
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  // Fetch fit metrics from database
  const fetchFitMetrics = useCallback(async () => {
    if (!user) return
    
    setIsLoadingMetrics(true)
    try {
      const { data, error } = await supabase
        .from('fit_daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(7)

      if (error) {
        console.error('Error fetching fit metrics:', error)
      } else {
        setFitMetrics(data || [])
        console.log('Fit metrics fetched:', data) // Task 4.1 requirement
      }
    } catch (error) {
      console.error('Error fetching fit metrics:', error)
    } finally {
      setIsLoadingMetrics(false)
    }
  }, [user])

  useEffect(() => {
    // Check current auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (!session) {
        window.location.href = '/'
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) {
        window.location.href = '/'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch metrics when user is available
  useEffect(() => {
    if (user) {
      fetchFitMetrics()
    }
  }, [user, fetchFitMetrics])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) alert(error.message)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
              {/* Modern Glassmorphism Navbar */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-slate-200/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left: Logo + Brand */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">HealthOS</h1>
                <p className="text-xs text-slate-500 font-medium">Personal Health Intelligence</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* User Avatar + Status */}
              <div className="flex items-center space-x-2">
                              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                  <span className="text-sm font-bold text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-slate-500">Online</p>
                </div>
              </div>
              
              {/* Settings Dropdown */}
              <div className="relative group">
                <Button 
                  variant="outline" 
                  className="px-3 py-1.5 rounded-lg border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-2 transition-all duration-200"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline text-sm font-medium text-slate-700">Settings</span>
                </Button>
                
                {/* Professional Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-1">
                    <a 
                      href="/settings/profile" 
                      className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">Profile & Security</span>
                    </a>
                    <a 
                      href="/settings/privacy" 
                      className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="font-medium">Data & Privacy</span>
                    </a>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Status Messages */}
      {statusMessage && (
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <div className={`p-3 rounded-lg border transition-all duration-300 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="text-sm font-medium">{statusMessage.message}</span>
              </div>
              <button 
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1 transition-colors"
                aria-label="Close message"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Health Timeline Section */}
          <div className="lg:col-span-8">
            <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      Health Timeline
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600 font-medium">Track your fitness journey over time</CardDescription>
                  </div>
                  <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    Live Data
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Google Fit Sync Section */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100/50 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.017 11.986c0-.264-.24-.47-.54-.47h-4.26c-.3 0-.54.206-.54.47v4.28c0 .264.24.47.54.47h4.26c.3 0 .54-.206.54-.47v-4.28zm8.95-4.49c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75zm-17.934 0c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Google Fit Integration</p>
                      <p className="text-xs text-slate-600 font-medium">Sync your latest fitness data</p>
                    </div>
                  </div>
                  <FitSyncButton />
                </div>

                {/* Charts Section */}
                <div className="bg-white rounded-lg p-6 border border-slate-100">
                  <Timeline metrics={fitMetrics} isLoading={isLoadingMetrics} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health Assistant */}
          <div className="lg:col-span-4">
            <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                      </div>
                      Health Assistant
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600 font-medium">AI-powered health insights</CardDescription>
                  </div>
                  <div className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    AI Powered
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <HealthChat />
              </CardContent>
            </Card>
          </div>
      </div>

        {/* Lab Reports Section */}
        <div className="mt-6">
          <LabMarkers />
        </div>
      </div>
    </div>
  )
} 