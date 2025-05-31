// Test script to validate data flow
const testUserId = 'bdf76f3b-e1cf-4e84-a25e-f6997fb9ca6d' // Replace with actual user ID
const baseUrl = 'http://localhost:3000'

async function testDataFlow() {
  console.log('🧪 Testing HealthOS Data Flow...\n')

  // Test 1: Health Snapshot API
  console.log('1️⃣ Testing Health Snapshot API...')
  try {
    const response = await fetch(`${baseUrl}/api/health/snapshot?userId=${testUserId}`)
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('✅ Health Snapshot API working')
      console.log(`   Health Score: ${data.snapshot.healthScore}`)
      console.log(`   Steps Today: ${data.snapshot.fitness.stepsToday}`)
      console.log(`   Calories Today: ${data.snapshot.fitness.caloriesToday}`)
      console.log(`   Lab Highlights: ${data.snapshot.labHighlights.length} items`)
    } else {
      console.log('❌ Health Snapshot API failed:', data.error)
    }
  } catch (error) {
    console.log('❌ Health Snapshot API error:', error.message)
  }

  console.log('')

  // Test 2: Chart Data API
  console.log('2️⃣ Testing Chart Data API...')
  try {
    const response = await fetch(`${baseUrl}/api/health/chart-data?userId=${testUserId}&days=7`)
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('✅ Chart Data API working')
      console.log(`   Days: ${data.chartData.length}`)
      console.log(`   Days with data: ${data.summary.daysWithData}`)
      console.log(`   Average steps: ${data.summary.averageSteps.toFixed(0)}`)
      console.log(`   Total steps this week: ${data.chartData.reduce((sum, item) => sum + item.steps, 0)}`)
    } else {
      console.log('❌ Chart Data API failed:', data.error)
    }
  } catch (error) {
    console.log('❌ Chart Data API error:', error.message)
  }

  console.log('')

  // Test 3: Google Fit Sync API (will likely fail without proper auth)
  console.log('3️⃣ Testing Google Fit Sync API...')
  try {
    const response = await fetch(`${baseUrl}/api/google-fit/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: testUserId })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Google Fit Sync API working')
      console.log(`   Records stored: ${data.recordsStored}`)
      console.log(`   Record count: ${data.recordCount}`)
    } else {
      console.log('⚠️ Google Fit Sync API expected failure:', data.error)
      console.log('   (This is normal if Google Fit is not connected)')
    }
  } catch (error) {
    console.log('❌ Google Fit Sync API error:', error.message)
  }

  console.log('')
  console.log('🏁 Data flow test completed!')
}

// Run the test
testDataFlow().catch(console.error) 