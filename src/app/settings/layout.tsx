'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Settings, Shield, Bell, User } from 'lucide-react'

const settingsNavigation = [
  {
    name: 'Profile & Security',
    href: '/settings/profile',
    icon: User,
    description: 'Manage your account details and security'
  },
  {
    name: 'Data & Privacy',
    href: '/settings/privacy',
    icon: Shield,
    description: 'Control your data and privacy settings'
  },
  {
    name: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Configure your notification preferences',
    disabled: true
  }
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Manage your account preferences and privacy settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {settingsNavigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.disabled ? '#' : item.href}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                          ${isActive 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : item.disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                        onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : ''}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {item.disabled && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
} 