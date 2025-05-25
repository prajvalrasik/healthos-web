'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function FitSyncButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleConnect = () => {
    // Google OAuth URL for Fit API access
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '')
    googleAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/google-fit/exchange`)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')

    window.location.href = googleAuthUrl.toString()
  }

  const handleSync = async () => {
    if (!user) {
      alert('Please sign in first')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/google-fit/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log('🔍 SYNC SUCCESS DEBUG:')
        console.log('📊 Google Fit raw data:', result.data)
        console.log('💾 Records stored:', result.recordsStored)
        console.log('📈 Record count:', result.recordCount)
        
        setLastSync(new Date().toLocaleString())
        alert(`Sync successful! Found ${result.recordCount} daily records, stored ${result.recordsStored} in database. Check console for details.`)
      } else {
        if (result.error?.includes('not connected')) {
          alert('Please connect Google Fit first')
        } else {
          alert(`Sync failed: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Sync failed: Network error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-3">
      <Button 
        onClick={handleConnect} 
        variant="outline" 
        className="px-4 py-2.5 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-slate-700 hover:text-red-700 transition-all duration-300 flex items-center gap-2 font-semibold shadow-sm hover:shadow-md"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.017 11.986c0-.264-.24-.47-.54-.47h-4.26c-.3 0-.54.206-.54.47v4.28c0 .264.24.47.54.47h4.26c.3 0 .54-.206.54-.47v-4.28zm8.95-4.49c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75zm-17.934 0c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75z"/>
        </svg>
        Connect
      </Button>
      <Button 
        onClick={handleSync} 
        disabled={isLoading}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Data
          </>
        )}
      </Button>
      {lastSync && (
        <div className="flex items-center text-xs text-emerald-700 bg-emerald-100 px-3 py-2 rounded-xl font-semibold shadow-sm">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {lastSync}
        </div>
      )}
    </div>
  )
} 