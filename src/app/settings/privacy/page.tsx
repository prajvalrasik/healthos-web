'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Download, Trash2, Shield, Info, ExternalLink, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function DataPrivacyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) {
        window.location.href = '/'
      }
    }
    getUser()
  }, [])

  const handleExportData = async () => {
    if (!user) return

    setIsExporting(true)
    setExportStatus(null)

    try {
      const response = await fetch('/api/health/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        // Trigger download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `healthos-data-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setExportStatus({
          type: 'success',
          message: 'Your health data has been downloaded successfully!'
        })
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus({
        type: 'error',
        message: 'Failed to export data. Please try again.'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/health/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      })

      const result = await response.json()

      if (response.ok) {
        // Redirect to deletion countdown page
        window.location.href = '/settings/deletion-scheduled'
      } else {
        throw new Error(result.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data & Privacy</h2>
        <p className="text-gray-600">
          Control how your health data is stored, used, and managed. Your privacy is our priority.
        </p>
      </div>

      {/* Export Status */}
      {exportStatus && (
        <div className={`p-4 rounded-lg ${
          exportStatus.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {exportStatus.type === 'success' ? (
              <Download className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span>{exportStatus.message}</span>
            <button 
              onClick={() => setExportStatus(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Data Export Section */}
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-xl font-medium text-gray-900">
            <Download className="h-5 w-5 text-blue-500" />
            Download My Health Data
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Export a complete copy of your health data in JSON format. This includes your fitness metrics, lab results, and chat history.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">What's included in your export:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Profile information and account details</li>
              <li>• Fitness metrics (steps, calories, active minutes)</li>
              <li>• Lab reports and extracted biomarkers</li>
              <li>• Chat conversations with health assistant</li>
              <li>• Export metadata and summary statistics</li>
            </ul>
          </div>
          
          <Button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download My Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-xl font-medium text-gray-900">
            <Shield className="h-5 w-5 text-green-500" />
            How We Protect Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-900 mb-2">🔒 Encryption</h3>
              <p className="text-sm text-green-800">
                All your health data is encrypted both in transit and at rest using industry-standard AES-256 encryption.
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">🛡️ Access Control</h3>
              <p className="text-sm text-blue-800">
                Only you can access your data. We use row-level security to ensure complete data isolation.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-2">📋 Compliance</h3>
              <p className="text-sm text-purple-800">
                We follow GDPR, HIPAA, and other privacy regulations to protect your health information.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-medium text-orange-900 mb-2">🗑️ Data Retention</h3>
              <p className="text-sm text-orange-800">
                Deleted data is kept for 7 days for recovery, then permanently removed from our systems.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
            <Link 
              href="/privacy-policy" 
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Privacy Policy <ExternalLink className="h-3 w-3" />
            </Link>
            <Link 
              href="/data-handling" 
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Data Handling Guide <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion Section */}
      <Card className="bg-white rounded-2xl shadow-sm border border-red-200">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-xl font-medium text-red-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete My Account
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Permanently remove your account and all associated health data. This action cannot be undone after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900 mb-1">Before you delete your account:</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Download your health data using the export feature above</li>
                  <li>• You'll have 7 days to cancel the deletion if you change your mind</li>
                  <li>• After 7 days, all your data will be permanently removed</li>
                  <li>• This action cannot be undone once the grace period expires</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowDeleteModal(true)}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Your Account?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete your account and all health data after a 7-day grace period.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-900">7-Day Grace Period</span>
                </div>
                <p className="text-xs text-red-800">
                  Your account will be scheduled for deletion. You can cancel this within 7 days.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "DELETE" to confirm:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setConfirmationText('')
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmationText !== 'DELETE'}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 