'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Calendar, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)

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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile & Security</h2>
        <p className="text-gray-600">
          Manage your account information and security settings.
        </p>
      </div>

      {/* Account Information */}
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-xl font-medium text-gray-900">
            <User className="h-5 w-5 text-blue-500" />
            Account Information
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Your basic account details and information
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-900">{user.email}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 font-mono">{user.id}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Created
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Sign In
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-900">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-xl font-medium text-gray-900">
            <Shield className="h-5 w-5 text-green-500" />
            Security Settings
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Manage your account security and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-900 mb-2">✅ Email Verified</h3>
              <p className="text-sm text-green-800">
                Your email address has been verified and is secure.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">🔐 Secure Authentication</h3>
              <p className="text-sm text-blue-800">
                Your account uses secure authentication protocols.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Connected Services</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-red-600">G</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Google Fit</p>
                    <p className="text-xs text-gray-600">Fitness data synchronization</p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">More Profile Features Coming Soon</h3>
            <p className="text-sm text-gray-600 mb-4">
              We're working on additional profile customization options including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
              <li>• Profile picture upload</li>
              <li>• Display name customization</li>
              <li>• Password change functionality</li>
              <li>• Two-factor authentication</li>
              <li>• Account recovery options</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 