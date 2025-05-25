'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AccountSettingsProps {
  user: User
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')

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
        body: JSON.stringify({ userId: user.id }),
      })

      const result = await response.json()

      if (response.ok) {
        alert('Account data has been marked for deletion. You will be signed out.')
        // Sign out the user
        await supabase.auth.signOut()
        window.location.href = '/'
      } else {
        throw new Error(result.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-red-200">
      <CardHeader className="p-5">
        <CardTitle className="flex items-center gap-2 text-xl font-medium text-red-900">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Account Settings
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Manage your account and data privacy settings
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        {/* Account Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Account Information</h3>
          <p className="text-sm text-gray-600">Email: {user.email}</p>
          <p className="text-sm text-gray-600">User ID: {user.id}</p>
          <p className="text-sm text-gray-600">
            Created: {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Data Privacy */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">Data Privacy</h3>
          <p className="text-sm text-blue-800">
            Your health data is encrypted and stored securely. Only you have access to your personal health information.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </h3>
          <p className="text-sm text-red-800 mb-4">
            Permanently delete your account and all associated health data. This action cannot be undone.
          </p>
          
          {!showConfirmation ? (
            <Button
              onClick={() => setShowConfirmation(true)}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-900">
                Type "DELETE" to confirm account deletion:
              </p>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmationText !== 'DELETE'}
                  className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
                <Button
                  onClick={() => {
                    setShowConfirmation(false)
                    setConfirmationText('')
                  }}
                  variant="outline"
                  className="border-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 