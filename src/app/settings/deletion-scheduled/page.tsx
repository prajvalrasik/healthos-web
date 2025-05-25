'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Clock, RotateCcw, Download, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function DeletionScheduledPage() {
  const [user, setUser] = useState<User | null>(null)
  const [daysLeft, setDaysLeft] = useState(7)
  const [isCancelling, setIsCancelling] = useState(false)
  const [deletionDate, setDeletionDate] = useState<string>('')

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) {
        window.location.href = '/'
        return
      }

      // Check if user is actually scheduled for deletion
      try {
        const response = await fetch(`/api/health/delete?userId=${user.id}`)
        const result = await response.json()
        
        if (!result.isDeleted) {
          // User is not scheduled for deletion, redirect to settings
          window.location.href = '/settings/privacy'
          return
        }

        // Calculate days left
        if (result.deletedAt) {
          const deletedDate = new Date(result.deletedAt)
          const finalDeletionDate = new Date(deletedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          const now = new Date()
          const timeLeft = finalDeletionDate.getTime() - now.getTime()
          const daysRemaining = Math.max(0, Math.ceil(timeLeft / (24 * 60 * 60 * 1000)))
          
          setDaysLeft(daysRemaining)
          setDeletionDate(finalDeletionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }))
        }
      } catch (error) {
        console.error('Error checking deletion status:', error)
      }
    }
    getUser()
  }, [])

  const handleCancelDeletion = async () => {
    if (!user) return

    setIsCancelling(true)
    try {
      // For now, we'll create a simple cancel endpoint
      // In a real app, you'd have a dedicated cancel deletion API
      const response = await fetch('/api/health/cancel-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        alert('Account deletion has been cancelled successfully!')
        window.location.href = '/dashboard'
      } else {
        throw new Error('Failed to cancel deletion')
      }
    } catch (error) {
      console.error('Cancel deletion error:', error)
      alert('Failed to cancel deletion. Please contact support.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleExportData = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/health/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `healthos-data-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/settings/privacy"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {/* Main Card */}
        <Card className="bg-white rounded-2xl shadow-lg border border-red-200">
          <CardHeader className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-900 mb-2">
              Account Deletion Scheduled
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your account and all health data will be permanently deleted in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-0 space-y-6">
            {/* Countdown */}
            <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">Days until permanent deletion</span>
              </div>
              <div className="text-4xl font-bold text-red-600 mb-2">{daysLeft}</div>
              <p className="text-sm text-red-800">
                Final deletion: {deletionDate}
              </p>
            </div>

            {/* What happens next */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">What happens next:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Grace Period ({daysLeft} days left)</p>
                    <p className="text-xs text-gray-600">You can still cancel the deletion and restore your account</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-red-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Permanent Deletion</p>
                    <p className="text-xs text-gray-600">All your data will be permanently removed from our systems</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCancelDeletion}
                  disabled={isCancelling}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                >
                  {isCancelling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Cancel Deletion
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleExportData}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download My Data
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Need help? Contact our support team before your data is permanently deleted.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Important Information</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Your account is currently inaccessible to prevent new data creation</li>
                <li>• You can still download your existing data during the grace period</li>
                <li>• Cancelling deletion will immediately restore full access to your account</li>
                <li>• After {daysLeft} days, this action cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 