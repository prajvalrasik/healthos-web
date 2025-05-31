// Test script for Google Fit sync API
const testUserId = 'bdf76f3b-e1cf-4e84-a25e-f6997fb9ca6d' // Replace with actual user ID

async function testGoogleFitSync() {
  try {
    console.log('Testing Google Fit sync API...')
    
    const response = await fetch('http://localhost:3000/api/google-fit/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: testUserId })
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)

    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('✅ Sync successful!')
      console.log('Records stored:', data.recordsStored)
      console.log('Record count:', data.recordCount)
    } else {
      console.log('❌ Sync failed:', data.error)
    }

  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
}

testGoogleFitSync() 