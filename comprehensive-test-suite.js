// Comprehensive HealthOS Data Flow Test Suite
const testUserId = 'bdf76f3b-e1cf-4e84-a25e-f6997fb9ca6d'
const baseUrl = 'http://localhost:3000'

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
}

// Helper functions
function logTest(name, status, message, data = null) {
  const result = { name, status, message, data, timestamp: new Date().toISOString() }
  testResults.details.push(result)
  
  if (status === 'PASS') {
    testResults.passed++
    console.log(`✅ ${name}: ${message}`)
  } else if (status === 'FAIL') {
    testResults.failed++
    console.log(`❌ ${name}: ${message}`)
  } else if (status === 'WARN') {
    testResults.warnings++
    console.log(`⚠️ ${name}: ${message}`)
  }
  
  if (data) {
    console.log(`   Data:`, data)
  }
}

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    if (body) options.body = JSON.stringify(body)
    
    const response = await fetch(`${baseUrl}${endpoint}`, options)
    const data = await response.json()
    
    return {
      success: response.ok,
      status: response.status,
      data: data,
      response: response
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    }
  }
}

// Test Suite Functions

async function testDatabaseConnectivity() {
  console.log('\n🔍 Testing Database Connectivity...')
  
  const result = await testAPI('/api/test-db')
  
  if (result.success) {
    const tables = result.data.tables
    const env = result.data.environment
    
    // Check required tables
    const requiredTables = ['profiles', 'fit_daily_metrics', 'lab_markers', 'lab_reports', 'chat_conversations']
    
    for (const table of requiredTables) {
      if (tables[table]?.exists) {
        logTest(`DB-${table}`, 'PASS', `Table exists with ${tables[table].count} records`)
      } else {
        logTest(`DB-${table}`, 'FAIL', `Table missing or inaccessible: ${tables[table]?.error}`)
      }
    }
    
    // Check environment variables
    Object.entries(env).forEach(([key, value]) => {
      if (value) {
        logTest(`ENV-${key}`, 'PASS', 'Environment variable configured')
      } else {
        logTest(`ENV-${key}`, 'FAIL', 'Environment variable missing')
      }
    })
  } else {
    logTest('DB-Connection', 'FAIL', `Database connection failed: ${result.error}`)
  }
}

async function testHealthAPIs() {
  console.log('\n🏥 Testing Health APIs...')
  
  // Test Health Snapshot API
  const snapshotResult = await testAPI(`/api/health/snapshot?userId=${testUserId}`)
  
  if (snapshotResult.success && snapshotResult.data.success) {
    const snapshot = snapshotResult.data.snapshot
    
    logTest('API-Health-Snapshot', 'PASS', 'Health snapshot API working')
    
    // Validate data structure
    if (typeof snapshot.healthScore === 'number') {
      logTest('Data-HealthScore', 'PASS', `Health score: ${snapshot.healthScore}`)
    } else {
      logTest('Data-HealthScore', 'FAIL', 'Health score is not a number')
    }
    
    // Check fitness data
    const fitness = snapshot.fitness
    if (fitness) {
      logTest('Data-Fitness', 'PASS', `Steps: ${fitness.stepsToday}, Calories: ${fitness.caloriesToday}`)
      
      // Data quality checks
      if (fitness.stepsToday > 0 || fitness.caloriesToday > 0) {
        logTest('Data-Fitness-Quality', 'PASS', 'Has meaningful fitness data')
      } else {
        logTest('Data-Fitness-Quality', 'WARN', 'Fitness data appears to be zeros - may need sync')
      }
    } else {
      logTest('Data-Fitness', 'FAIL', 'Fitness data missing')
    }
    
    // Check lab highlights
    if (Array.isArray(snapshot.labHighlights)) {
      logTest('Data-Labs', 'PASS', `${snapshot.labHighlights.length} lab highlights`)
    } else {
      logTest('Data-Labs', 'FAIL', 'Lab highlights not an array')
    }
    
  } else {
    logTest('API-Health-Snapshot', 'FAIL', `Snapshot API failed: ${snapshotResult.data?.error}`)
  }
  
  // Test Chart Data API
  const chartResult = await testAPI(`/api/health/chart-data?userId=${testUserId}&days=7`)
  
  if (chartResult.success && chartResult.data.success) {
    const chartData = chartResult.data.chartData
    const summary = chartResult.data.summary
    
    logTest('API-Chart-Data', 'PASS', 'Chart data API working')
    logTest('Data-Chart-Days', 'PASS', `${chartData.length} days of data`)
    
    const totalSteps = chartData.reduce((sum, item) => sum + item.steps, 0)
    if (totalSteps > 0) {
      logTest('Data-Chart-Quality', 'PASS', `Total steps: ${totalSteps}`)
    } else {
      logTest('Data-Chart-Quality', 'WARN', 'Chart data shows zero steps - may need sync')
    }
  } else {
    logTest('API-Chart-Data', 'FAIL', `Chart API failed: ${chartResult.data?.error}`)
  }
  
  // Test Trends API
  const trendsResult = await testAPI(`/api/health/trends?userId=${testUserId}&days=30`)
  
  if (trendsResult.success && trendsResult.data.success) {
    const trends = trendsResult.data.trends
    logTest('API-Health-Trends', 'PASS', 'Trends API working')
    logTest('Data-Trends-Fitness', 'PASS', `${trends.fitnessHistory.length} fitness history records`)
    logTest('Data-Trends-Labs', 'PASS', `${trends.labTrends.length} lab trends`)
  } else {
    logTest('API-Health-Trends', 'FAIL', `Trends API failed: ${trendsResult.data?.error}`)
  }
}

async function testGoogleFitIntegration() {
  console.log('\n🏃 Testing Google Fit Integration...')
  
  // Test Google Fit Sync
  const syncResult = await testAPI('/api/google-fit/sync', 'POST', { userId: testUserId })
  
  if (syncResult.success) {
    logTest('API-GoogleFit-Sync', 'PASS', `Sync successful: ${syncResult.data.recordsStored} records stored`)
  } else if (syncResult.status === 400 || syncResult.status === 401) {
    logTest('API-GoogleFit-Sync', 'WARN', `Expected failure: ${syncResult.data.error}`)
  } else {
    logTest('API-GoogleFit-Sync', 'FAIL', `Unexpected sync failure: ${syncResult.data?.error}`)
  }
  
  // Test Google Fit Exchange endpoint exists
  const exchangeTest = await testAPI('/api/google-fit/exchange?code=test')
  logTest('API-GoogleFit-Exchange', exchangeTest.status !== 404 ? 'PASS' : 'FAIL', 
         exchangeTest.status !== 404 ? 'Exchange endpoint exists' : 'Exchange endpoint missing')
}

async function testChatSystem() {
  console.log('\n💬 Testing Chat System...')
  
  // Test Chat API
  const chatResult = await testAPI('/api/chat', 'POST', { 
    message: 'Test health question',
    userId: testUserId 
  })
  
  if (chatResult.success) {
    logTest('API-Chat', 'PASS', 'Chat API working')
    if (chatResult.data.response) {
      logTest('Data-Chat-Response', 'PASS', 'AI response generated')
    } else {
      logTest('Data-Chat-Response', 'FAIL', 'No AI response generated')
    }
  } else {
    logTest('API-Chat', 'FAIL', `Chat API failed: ${chatResult.data?.error}`)
  }
  
  // Test Chat Test endpoint
  const chatTestResult = await testAPI('/api/chat/test')
  
  if (chatTestResult.success) {
    logTest('API-Chat-Test', 'PASS', 'Chat test endpoint working')
  } else {
    logTest('API-Chat-Test', 'FAIL', 'Chat test endpoint failed')
  }
}

async function testDataManagement() {
  console.log('\n📋 Testing Data Management...')
  
  // Test Data Export
  const exportResult = await testAPI('/api/health/export', 'POST', { userId: testUserId })
  
  if (exportResult.success) {
    logTest('API-Data-Export', 'PASS', 'Data export working')
  } else {
    logTest('API-Data-Export', 'FAIL', `Export failed: ${exportResult.data?.error}`)
  }
  
  // Test Deletion Status Check
  const deleteCheckResult = await testAPI(`/api/health/delete?userId=${testUserId}`)
  
  if (deleteCheckResult.success) {
    logTest('API-Delete-Check', 'PASS', `Deletion status: ${deleteCheckResult.data.isDeleted ? 'Scheduled' : 'Active'}`)
  } else {
    logTest('API-Delete-Check', 'FAIL', `Delete check failed: ${deleteCheckResult.data?.error}`)
  }
}

async function testDataConsistency() {
  console.log('\n🔄 Testing Data Consistency...')
  
  // Fetch data from multiple endpoints and compare
  const [snapshotResult, chartResult] = await Promise.all([
    testAPI(`/api/health/snapshot?userId=${testUserId}`),
    testAPI(`/api/health/chart-data?userId=${testUserId}&days=7`)
  ])
  
  if (snapshotResult.success && chartResult.success) {
    const snapshotSteps = snapshotResult.data.snapshot.fitness.stepsToday
    const chartTotalSteps = chartResult.data.chartData.reduce((sum, item) => sum + item.steps, 0)
    
    // Check if today's steps from snapshot appear in chart data
    const todayInChart = chartResult.data.chartData[chartResult.data.chartData.length - 1]?.steps || 0
    
    logTest('Consistency-Steps-Today', 
           Math.abs(snapshotSteps - todayInChart) < 100 ? 'PASS' : 'WARN',
           `Snapshot: ${snapshotSteps}, Chart: ${todayInChart}`)
    
    logTest('Consistency-Chart-Total', 'PASS', `Chart shows ${chartTotalSteps} total steps over 7 days`)
  }
}

async function testEndpointAvailability() {
  console.log('\n🌐 Testing Endpoint Availability...')
  
  const endpoints = [
    '/api/test',
    '/api/test-db', 
    '/api/health/snapshot',
    '/api/health/chart-data',
    '/api/health/trends',
    '/api/health/export',
    '/api/health/delete',
    '/api/health/cancel-deletion',
    '/api/chat',
    '/api/chat/test',
    '/api/google-fit/sync',
    '/api/process-lab-report'
  ]
  
  for (const endpoint of endpoints) {
    const result = await testAPI(endpoint + (endpoint.includes('?') ? '&' : '?') + 'test=1')
    
    if (result.status === 404) {
      logTest(`Endpoint-${endpoint}`, 'FAIL', 'Endpoint not found')
    } else if (result.status >= 200 && result.status < 500) {
      logTest(`Endpoint-${endpoint}`, 'PASS', `Available (${result.status})`)
    } else {
      logTest(`Endpoint-${endpoint}`, 'WARN', `Server error (${result.status})`)
    }
  }
}

async function generateDataQualityReport() {
  console.log('\n📊 Generating Data Quality Report...')
  
  const snapshotResult = await testAPI(`/api/health/snapshot?userId=${testUserId}`)
  const chartResult = await testAPI(`/api/health/chart-data?userId=${testUserId}&days=7`)
  
  if (snapshotResult.success && chartResult.success) {
    const snapshot = snapshotResult.data.snapshot
    const chartData = chartResult.data.chartData
    
    // Data quality metrics
    const qualityMetrics = {
      fitnessDataAvailable: snapshot.fitness.stepsToday > 0 || snapshot.fitness.caloriesToday > 0,
      labDataAvailable: snapshot.labHighlights.length > 0,
      chartDataComplete: chartData.length === 7,
      weeklyStepsTotal: chartData.reduce((sum, item) => sum + item.steps, 0),
      daysWithStepsData: chartData.filter(item => item.steps > 0).length,
      healthScoreValid: snapshot.healthScore >= 0 && snapshot.healthScore <= 100,
      lastDataDate: snapshot.fitness.dataDate || 'Unknown'
    }
    
    console.log('\n📈 DATA QUALITY METRICS:')
    Object.entries(qualityMetrics).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`)
    })
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:')
    if (!qualityMetrics.fitnessDataAvailable) {
      console.log('   - Connect and sync Google Fit to get real fitness data')
    }
    if (!qualityMetrics.labDataAvailable) {
      console.log('   - Upload lab reports to get health insights')
    }
    if (qualityMetrics.daysWithStepsData < 5) {
      console.log('   - Sync more historical data for better trends')
    }
  }
}

// Main test execution
async function runComprehensiveTest() {
  console.log('🧪 HEALTHOS COMPREHENSIVE TEST SUITE')
  console.log('=====================================\n')
  
  try {
    await testDatabaseConnectivity()
    await testEndpointAvailability()
    await testHealthAPIs()
    await testGoogleFitIntegration()
    await testChatSystem()
    await testDataManagement()
    await testDataConsistency()
    await generateDataQualityReport()
    
  } catch (error) {
    console.error('❌ Test suite execution error:', error)
  }
  
  // Final results
  console.log('\n🏁 TEST RESULTS SUMMARY')
  console.log('======================')
  console.log(`✅ Passed: ${testResults.passed}`)
  console.log(`❌ Failed: ${testResults.failed}`)
  console.log(`⚠️ Warnings: ${testResults.warnings}`)
  console.log(`📊 Total Tests: ${testResults.details.length}`)
  
  const successRate = (testResults.passed / testResults.details.length * 100).toFixed(1)
  console.log(`📈 Success Rate: ${successRate}%`)
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    testResults.details.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`)
    })
  }
  
  if (testResults.warnings > 0) {
    console.log('\n⚠️ WARNINGS:')
    testResults.details.filter(t => t.status === 'WARN').forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`)
    })
  }
  
  console.log('\n📋 Test completed at:', new Date().toISOString())
  return testResults
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error) 