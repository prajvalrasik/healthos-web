// Test Lab Upload API Fix
const testUserId = 'bdf76f3b-e1cf-4e84-a25e-f6997fb9ca6d'
const baseUrl = 'http://localhost:3001'

async function testLabUpload() {
  console.log('🧪 TESTING LAB UPLOAD API FIX')
  console.log('==============================\n')

  try {
    // Create a mock PDF file for testing
    const mockPdfContent = `
    LABORATORY TEST REPORT
    Patient: Test Patient
    
    Test Results:
    Hemoglobin: 14.5 g/dL
    RBC Count: 4.79 million/cmm
    Hematocrit: 43.3 %
    WBC Count: 10570 /cmm
    `
    
    const blob = new Blob([mockPdfContent], { type: 'application/pdf' })
    const file = new File([blob], 'test-lab-report.pdf', { type: 'application/pdf' })
    
    // Create FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', testUserId)
    
    console.log('📤 Uploading test lab report...')
    console.log('   File name:', file.name)
    console.log('   File size:', file.size, 'bytes')
    console.log('   User ID:', testUserId)
    
    // Test the upload
    const response = await fetch(`${baseUrl}/api/process-lab-report`, {
      method: 'POST',
      body: formData
    })
    
    console.log('📥 Response received:')
    console.log('   Status:', response.status, response.statusText)
    console.log('   Content-Type:', response.headers.get('content-type'))
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Upload successful!')
      console.log('   Message:', result.message)
      console.log('   Report ID:', result.reportId)
      console.log('   Markers found:', result.markersFound)
      
      if (result.markers && result.markers.length > 0) {
        console.log('   Extracted markers:')
        result.markers.forEach((marker, index) => {
          console.log(`     ${index + 1}. ${marker.marker}: ${marker.value} ${marker.unit}`)
        })
      }
      
      console.log('\n🎉 LAB UPLOAD API IS WORKING CORRECTLY!')
      
    } else {
      const error = await response.text()
      console.log('❌ Upload failed:')
      console.log('   Error:', error)
      
      // Check if it's the old JSON parsing error
      if (error.includes('JSON') || error.includes('minus sign')) {
        console.log('   🔍 This looks like the old JSON parsing error - API needs more fixes')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    
    if (error.message.includes('fetch')) {
      console.log('   💡 Make sure the development server is running on port 3001')
    }
  }
}

// Run the test
testLabUpload() 