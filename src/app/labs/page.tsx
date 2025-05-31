'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface LabMarker {
  name: string
  value: number
  unit: string
  range: string
  status: 'normal' | 'high' | 'low'
  date: string
}

export default function LabsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [labData, setLabData] = useState<LabMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'normal' | 'abnormal'>('all')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Get current user first
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await fetchLabData(user.id)
      }
    }
    getUser()
  }, [])

  const fetchLabData = async (userId: string) => {
    try {
      // First try to fetch real lab data from API
      const response = await fetch(`/api/health/snapshot?userId=${userId}`)
      const data = await response.json()

      if (data.success && data.snapshot?.labHighlights) {
        // Convert API format to component format
        const convertedData: LabMarker[] = data.snapshot.labHighlights.map((lab: any) => ({
          name: lab.marker_name,
          value: lab.value,
          unit: lab.unit,
          range: '<200', // You'd get this from the API or a lookup
          status: lab.status === 'optimal' || lab.status === 'normal' ? 'normal' : 
                 lab.status === 'high' ? 'high' : 'low',
          date: new Date(lab.taken_at).toISOString().split('T')[0]
        }))
        setLabData(convertedData)
      } else {
        // Fallback to mock data if no real data
        const mockLabData: LabMarker[] = [
          { name: 'Total Cholesterol', value: 185, unit: 'mg/dL', range: '<200', status: 'normal', date: '2024-01-15' },
          { name: 'LDL Cholesterol', value: 95, unit: 'mg/dL', range: '<100', status: 'normal', date: '2024-01-15' },
          { name: 'HDL Cholesterol', value: 45, unit: 'mg/dL', range: '>40', status: 'normal', date: '2024-01-15' },
          { name: 'Triglycerides', value: 225, unit: 'mg/dL', range: '<150', status: 'high', date: '2024-01-15' },
          { name: 'Glucose', value: 92, unit: 'mg/dL', range: '70-100', status: 'normal', date: '2024-01-15' },
          { name: 'Hemoglobin A1c', value: 5.2, unit: '%', range: '<5.7', status: 'normal', date: '2024-01-15' },
          { name: 'Blood Pressure (Systolic)', value: 128, unit: 'mmHg', range: '<120', status: 'high', date: '2024-01-10' },
          { name: 'Blood Pressure (Diastolic)', value: 78, unit: 'mmHg', range: '<80', status: 'normal', date: '2024-01-10' },
          { name: 'Vitamin D', value: 28, unit: 'ng/mL', range: '30-100', status: 'low', date: '2024-01-08' },
          { name: 'TSH', value: 2.1, unit: 'mIU/L', range: '0.4-4.0', status: 'normal', date: '2024-01-08' },
        ]
        setLabData(mockLabData)
      }
    } catch (error) {
      console.error('Error fetching lab data:', error)
      // Show mock data on error
      const mockLabData: LabMarker[] = [
        { name: 'Total Cholesterol', value: 185, unit: 'mg/dL', range: '<200', status: 'normal', date: '2024-01-15' },
        { name: 'LDL Cholesterol', value: 95, unit: 'mg/dL', range: '<100', status: 'normal', date: '2024-01-15' },
        { name: 'HDL Cholesterol', value: 45, unit: 'mg/dL', range: '>40', status: 'normal', date: '2024-01-15' },
        { name: 'Triglycerides', value: 225, unit: 'mg/dL', range: '<150', status: 'high', date: '2024-01-15' },
        { name: 'Glucose', value: 92, unit: 'mg/dL', range: '70-100', status: 'normal', date: '2024-01-15' },
        { name: 'Hemoglobin A1c', value: 5.2, unit: '%', range: '<5.7', status: 'normal', date: '2024-01-15' },
        { name: 'Blood Pressure (Systolic)', value: 128, unit: 'mmHg', range: '<120', status: 'high', date: '2024-01-10' },
        { name: 'Blood Pressure (Diastolic)', value: 78, unit: 'mmHg', range: '<80', status: 'normal', date: '2024-01-10' },
        { name: 'Vitamin D', value: 28, unit: 'ng/mL', range: '30-100', status: 'low', date: '2024-01-08' },
        { name: 'TSH', value: 2.1, unit: 'mIU/L', range: '0.4-4.0', status: 'normal', date: '2024-01-08' },
      ]
      setLabData(mockLabData)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      alert('Please upload a PDF or image file')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)

      // Upload file
      const response = await fetch('/api/process-lab-report', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert('Lab report uploaded successfully! Processing in progress...')
        
        // Refresh lab data after a short delay to allow processing
        setTimeout(() => {
          if (user) fetchLabData(user.id)
        }, 2000)
      } else {
        const error = await response.json()
        alert(error.message || 'Upload failed. Please try again.')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 bg-green-100'
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'low':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'high':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )
      case 'low':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )
      default:
        return null
    }
  }

  const filteredData = filter === 'all' 
    ? labData 
    : filter === 'normal' 
      ? labData.filter(lab => lab.status === 'normal')
      : labData.filter(lab => lab.status !== 'normal')

  const abnormalCount = labData.filter(lab => lab.status !== 'normal').length

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="px-4 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
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
          <h1 className="text-2xl font-semibold text-gray-900">Lab Results</h1>
          <p className="text-gray-600 mt-1">Your latest biomarker analysis</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Markers</p>
                <p className="text-2xl font-semibold text-gray-900">{labData.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Normal Range</p>
                <p className="text-2xl font-semibold text-green-600">{labData.length - abnormalCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Needs Attention</p>
                <p className="text-2xl font-semibold text-red-600">{abnormalCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All Results
            </button>
            <button
              onClick={() => setFilter('normal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'normal'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Normal Range
            </button>
            <button
              onClick={() => setFilter('abnormal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'abnormal'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Needs Attention
            </button>
          </div>
        </div>

        {/* Lab Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredData.map((lab, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">{lab.name}</h3>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lab.status)}`}>
                  {getStatusIcon(lab.status)}
                  <span className="capitalize">{lab.status}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-semibold text-gray-900">{lab.value}</span>
                  <span className="text-sm text-gray-500">{lab.unit}</span>
                </div>
                
                <div className="text-xs text-gray-500">
                  Normal range: {lab.range} {lab.unit}
                </div>
                
                <div className="text-xs text-gray-400">
                  Tested: {new Date(lab.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredData.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No lab results found</h3>
            <p className="text-sm text-gray-500">
              {filter === 'all' ? 'No lab results available' : `No ${filter} results found`}
            </p>
          </div>
        )}

        {/* Upload New Lab Report */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload New Lab Report</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload your lab results to track your health markers over time
            </p>
            
            {uploading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Processing your lab report...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Supports PDF and image files up to 10MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 