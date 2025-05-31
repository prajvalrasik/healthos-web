// Test Lab Upload API Directly
const testUserId = 'bdf76f3b-e1cf-4e84-a25e-f6997fb9ca6d'
const baseUrl = 'http://localhost:3001'

async function testLabUploadDirect() {
  console.log('🧪 TESTING LAB UPLOAD API DIRECTLY')
  console.log('===================================\n')

  try {
    // Create a simple text file to test upload
    const mockContent = 'LABORATORY TEST REPORT\nHemoglobin: 14.5 g/dL\nRBC Count: 4.79 million/cmm'
    const blob = new Blob([mockContent], { type: 'application/pdf' })
    
    // Create FormData
    const formData = new FormData()
    formData.append('file', blob, 'test-report.pdf')
    formData.append('userId', testUserId)
    
    console.log('📤 Sending request to /api/process-lab-report')
    console.log('   Method: POST')
    console.log('   Content-Type: multipart/form-data')
    console.log('   File size:', blob.size, 'bytes')
    console.log('   User ID:', testUserId)
    
    const response = await fetch(`${baseUrl}/api/process-lab-report`, {
      method: 'POST',
      body: formData
    })
    
    console.log('\n📥 Response received:')
    console.log('   Status:', response.status, response.statusText)
    console.log('   Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('   Raw response:', responseText)
    
    try {
      const responseJson = JSON.parse(responseText)
      console.log('   Parsed response:', responseJson)
      
      if (responseJson.error) {
        console.log('\n❌ API Error Details:')
        console.log('   Error message:', responseJson.error)
        
        // Check for specific error types
        if (responseJson.error.includes('lab report record')) {
          console.log('   🔍 This is a database insert error')
        } else if (responseJson.error.includes('JSON')) {
          console.log('   🔍 This is a JSON parsing error')
        } else if (responseJson.error.includes('upload')) {
          console.log('   🔍 This is a file upload error')
        }
      } else {
        console.log('\n✅ Success!')
        console.log('   Report ID:', responseJson.reportId)
        console.log('   Markers found:', responseJson.markersFound)
      }
      
    } catch (parseError) {
      console.log('   ❌ Could not parse response as JSON')
      console.log('   Parse error:', parseError.message)
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Also test a simple GET request to make sure the server is working
async function testBasicAPI() {
  console.log('\n🔧 TESTING BASIC API ACCESS')
  console.log('============================\n')
  
  try {
    const response = await fetch(`${baseUrl}/api/test`)
    const data = await response.text()
    console.log('✅ Basic API test successful')
    console.log('   Response:', data)
  } catch (error) {
    console.log('❌ Basic API test failed:', error.message)
  }
}

// Run tests
async function runTests() {
  await testBasicAPI()
  await testLabUploadDirect()
}

runTests() 