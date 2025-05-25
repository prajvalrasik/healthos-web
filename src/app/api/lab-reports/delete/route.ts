import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
  try {
    const { reportId } = await request.json()
    
    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // First, get the report to verify it exists and get file path
    const { data: report, error: reportError } = await supabase
      .from('lab_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Delete associated lab markers first (due to foreign key constraint)
    const { error: markersError } = await supabase
      .from('lab_markers')
      .delete()
      .eq('lab_report_id', reportId)

    if (markersError) {
      console.error('Error deleting lab markers:', markersError)
      return NextResponse.json({ error: 'Failed to delete lab markers' }, { status: 500 })
    }

    // Delete the file from storage
    if (report.file_path) {
      const { error: storageError } = await supabase.storage
        .from('lab-reports')
        .remove([report.file_path])
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the report record
    const { error: reportDeleteError } = await supabase
      .from('lab_reports')
      .delete()
      .eq('id', reportId)

    if (reportDeleteError) {
      console.error('Error deleting report:', reportDeleteError)
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Report and associated data deleted successfully'
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete report'
    console.error('Delete error:', errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 