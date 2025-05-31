// Debug Lab Reports Schema
const { createClient } = require('@supabase/supabase-js')

// Use environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixqjqjqjqjqjqjqjqjqj.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

console.log('Environment check:')
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('SERVICE_KEY:', supabaseKey ? 'Set' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugLabSchema() {
  console.log('\n🔍 DEBUGGING LAB REPORTS SCHEMA')
  console.log('================================\n')

  try {
    // Check if lab_reports table exists by trying to select from it
    console.log('1. Testing lab_reports table access...')
    const { data: testSelect, error: selectError } = await supabase
      .from('lab_reports')
      .select('*')
      .limit(1)

    if (selectError) {
      console.log('❌ Cannot access lab_reports table:', selectError.message)
      console.log('   This might mean the table doesn\'t exist')
    } else {
      console.log('✅ lab_reports table exists and is accessible')
      console.log('   Sample data count:', testSelect?.length || 0)
    }

    // Try a simple insert test
    console.log('\n2. Testing simple insert...')
    const testData = {
      user_id: 'bdf76f3b-e1cf-4e84-a25e-f6997fb9ca6d',
      file_name: 'test.pdf',
      file_path: 'test/test.pdf',
      file_size: 1000,
      uploaded_at: new Date().toISOString(),
      processed: false
    }

    console.log('   Test data:', testData)

    const { data: insertResult, error: insertError } = await supabase
      .from('lab_reports')
      .insert(testData)
      .select()

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message)
      console.log('   Error code:', insertError.code)
      console.log('   Error details:', insertError.details)
      console.log('   Error hint:', insertError.hint)
    } else {
      console.log('✅ Insert successful:', insertResult)
      
      // Clean up test record
      if (insertResult && insertResult[0]) {
        await supabase
          .from('lab_reports')
          .delete()
          .eq('id', insertResult[0].id)
        console.log('🧹 Test record cleaned up')
      }
    }

    // Check existing lab_reports
    console.log('\n3. Checking existing lab_reports...')
    const { data: existingReports, error: reportsError } = await supabase
      .from('lab_reports')
      .select('*')
      .limit(5)

    if (reportsError) {
      console.log('❌ Error fetching reports:', reportsError.message)
    } else {
      console.log(`📄 Found ${existingReports?.length || 0} existing lab reports`)
      if (existingReports && existingReports.length > 0) {
        console.log('   Sample report:', existingReports[0])
      }
    }

    // Check lab_markers table too
    console.log('\n4. Checking lab_markers table...')
    const { data: markers, error: markersError } = await supabase
      .from('lab_markers')
      .select('*')
      .limit(3)

    if (markersError) {
      console.log('❌ Error accessing lab_markers:', markersError.message)
    } else {
      console.log(`📊 Found ${markers?.length || 0} lab markers`)
      if (markers && markers.length > 0) {
        console.log('   Sample marker:', markers[0])
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  }
}

debugLabSchema() 