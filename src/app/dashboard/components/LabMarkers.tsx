'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Check, AlertCircle, Trash2, RefreshCw } from 'lucide-react'

interface LabReport {
  id: string
  user_id: string
  filename: string
  file_url: string
  uploaded_at: string
  processed: boolean
}

interface LabMarker {
  id: string
  lab_report_id: string
  marker_name: string
  value: number
  unit: string
  taken_at: string
  created_at: string
  lab_reports?: {
    filename: string
    uploaded_at: string
  }
}

export default function LabMarkers() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [labReports, setLabReports] = useState<LabReport[]>([])
  const [labMarkers, setLabMarkers] = useState<LabMarker[]>([])
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch data when component mounts
  useEffect(() => {
    fetchLabReports()
    fetchLabMarkers()
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadStatus({ type: 'error', message: 'Please select a PDF file' })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'File size must be less than 10MB' })
      return
    }

    await uploadPDF(file)
  }

  const uploadPDF = async (file: File) => {
    setIsUploading(true)
    setUploadStatus(null)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${timestamp}-${file.name}`
      const filePath = `reports/${user.id}/${filename}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('lab-reports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lab-reports')
        .getPublicUrl(filePath)

      // Save lab report record to database
      const { error: dbError } = await supabase
        .from('lab_reports')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_url: publicUrl,
          file_path: filePath,
          processed: false
        })
        .select()
        .single()

      if (dbError) {
        throw dbError
      }

      setUploadStatus({ 
        type: 'success', 
        message: `${file.name} uploaded successfully! Processing will begin shortly.` 
      })
      
      // Refresh the reports list
      await fetchLabReports()
      await fetchLabMarkers()
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.'
      console.error('Upload error:', errorMessage)
      setUploadStatus({ 
        type: 'error', 
        message: errorMessage 
      })
    } finally {
      setIsUploading(false)
    }
  }

  const fetchLabReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching lab reports:', error)
      } else {
        setLabReports(data || [])
        console.log('Lab reports fetched successfully:', data)
      }
    } catch (error) {
      console.error('Error fetching lab reports:', error)
    }
  }

  const fetchLabMarkers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch lab markers without join for now (simpler approach)
      const { data, error } = await supabase
        .from('lab_markers')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching lab markers:', error)
      } else {
        setLabMarkers(data || [])
        console.log('Lab markers fetched successfully:', data)
      }
    } catch (error) {
      console.error('Error fetching lab markers:', error)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const processLabReport = async (reportId: string) => {
    setIsProcessing(reportId)
    
    try {
      const response = await fetch('/api/process-lab-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `Processing complete! Found ${result.markersFound} lab markers.`
        })
        
        // Refresh the data
        await fetchLabReports()
        await fetchLabMarkers()
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process lab report'
      console.error('Processing error:', errorMessage)
      setUploadStatus({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const deleteLabReport = async (reportId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This will also remove all extracted markers from this report.`)) {
      return
    }

    try {
      const response = await fetch('/api/lab-reports/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      })

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `"${filename}" deleted successfully.`
        })
        
        // Refresh the data
        await fetchLabReports()
        await fetchLabMarkers()
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete report'
      console.error('Delete error:', errorMessage)
      setUploadStatus({
        type: 'error',
        message: errorMessage
      })
    }
  }

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-500">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                Upload Lab Report
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 font-medium">
                Upload your lab results in PDF format for automatic marker extraction
              </CardDescription>
            </div>
            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
              AI Processing
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Professional Upload Status */}
          {uploadStatus && (
            <div className={`p-4 rounded-lg border transition-all duration-300 ${
              uploadStatus.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {uploadStatus.type === 'success' ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium flex-1">{uploadStatus.message}</span>
                <button 
                  onClick={() => setUploadStatus(null)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1 transition-colors"
                  aria-label="Close upload status message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Upload Dropzone */}
          <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer group hover:shadow-lg"
               onClick={triggerFileInput}>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <p className="text-xl font-bold text-slate-900 mb-3">
              Drop your lab report here
            </p>
            <p className="text-sm text-slate-600 mb-8 font-medium">
              or click to browse files
            </p>
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                triggerFileInput()
              }}
              disabled={isUploading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose PDF File
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-4">
              Maximum file size: 10MB • Supported format: PDF
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload lab report PDF file"
          />
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                Recent Reports
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 font-medium">
                Your uploaded lab reports and processing status
              </CardDescription>
            </div>
            <div className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
              File Manager
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {labReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-500 font-medium">No lab reports uploaded yet</p>
              <p className="text-sm text-slate-400 mt-1">Upload your first report to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {labReports.map((report) => (
                <div 
                  key={report.id} 
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 rounded-xl transition-all duration-300 border border-slate-200 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">{report.filename}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(report.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.processed ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 font-medium">
                          <Check className="h-3 w-3" />
                          Processed
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteLabReport(report.id, report.filename)}
                          className="text-xs px-2 py-1 h-7 text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200"
                          aria-label={`Delete report ${report.filename}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 font-medium">
                          <RefreshCw className="h-3 w-3" />
                          Pending
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processLabReport(report.id)}
                          disabled={isProcessing === report.id}
                          className="text-xs px-3 py-1 h-7 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                        >
                          {isProcessing === report.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              Processing...
                            </>
                          ) : (
                            'Process Now'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteLabReport(report.id, report.filename)}
                          className="text-xs px-2 py-1 h-7 text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200"
                          aria-label={`Delete report ${report.filename}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Markers */}
      <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Extracted Lab Markers
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 font-medium">
                Automatically extracted biomarkers from your reports ({labMarkers.length} total)
              </CardDescription>
            </div>
            <div className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
              Analytics
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {labMarkers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">No lab markers extracted yet</p>
              <p className="text-sm text-slate-400 mt-1">Upload a lab report to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {labMarkers.map((marker, index) => (
                <div 
                  key={marker.id} 
                  className={`p-6 bg-gradient-to-br ${
                    index % 3 === 0 ? 'from-blue-50 to-indigo-50 border-blue-200' :
                    index % 3 === 1 ? 'from-emerald-50 to-teal-50 border-emerald-200' :
                    'from-purple-50 to-pink-50 border-purple-200'
                  } border rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-slate-900 text-sm leading-tight">{marker.marker_name}</p>
                      <div className={`w-3 h-3 rounded-full ${
                        index % 3 === 0 ? 'bg-blue-500' :
                        index % 3 === 1 ? 'bg-emerald-500' :
                        'bg-purple-500'
                      }`}></div>
                    </div>
                    <div className="text-center py-2">
                      <p className="text-3xl font-bold text-slate-900">
                        {marker.value}
                      </p>
                      <p className="text-sm text-slate-600 font-medium mt-1">{marker.unit}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200">
                      <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Lab Report
                      </span>
                      <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0v-4m4-4h8m-4-4v8" />
                        </svg>
                        {new Date(marker.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 