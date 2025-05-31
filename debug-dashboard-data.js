// Debug script to check dashboard data
const testUserId = 'bdf76f3b-e1cf-4e84-a25e-f6997fb9ca6d'
const baseUrl = 'http://localhost:3000'

async function debugDashboardData() {
  console.log('🔍 Debugging Dashboard Data...\n')

  // Check Health Snapshot API in detail
  console.log('📊 Health Snapshot API Details:')
  try {
    const response = await fetch(`${baseUrl}/api/health/snapshot?userId=${testUserId}`)
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Health Snapshot Response:')
      console.log('   Health Score:', data.snapshot.healthScore)
      console.log('   Steps Today:', data.snapshot.fitness.stepsToday)
      console.log('   Calories Today:', data.snapshot.fitness.caloriesToday)
      console.log('   Active Minutes Today:', data.snapshot.fitness.activeMinutesToday)
      console.log('   Distance Today:', data.snapshot.fitness.distanceToday)
      console.log('   Trends - Steps Change:', data.snapshot.trends.stepsChange)
      console.log('   Trends - Weekly Avg Steps:', data.snapshot.trends.weeklyAverage.steps)
      console.log('   Lab Highlights Count:', data.snapshot.labHighlights.length)
      console.log('   Last Updated:', data.snapshot.lastUpdated)
    }
  } catch (error) {
    console.log('❌ Health Snapshot Error:', error.message)
  }

  console.log('\n📈 Chart Data API Details:')
  try {
    const response = await fetch(`${baseUrl}/api/health/chart-data?userId=${testUserId}&days=7`)
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Chart Data Response:')
      console.log('   Total Days:', data.summary.totalDays)
      console.log('   Days with Data:', data.summary.daysWithData)
      console.log('   Average Steps:', data.summary.averageSteps.toFixed(0))
      console.log('   Average Calories:', data.summary.averageCalories.toFixed(0))
      console.log('   Chart Data Array Length:', data.chartData.length)
      
      console.log('\n   Daily Breakdown:')
      data.chartData.forEach((day, index) => {
        console.log(`     Day ${index + 1} (${day.day}): ${day.steps} steps, ${day.calories} calories, ${day.activeMinutes} active min`)
      })
      
      const totalSteps = data.chartData.reduce((sum, item) => sum + item.steps, 0)
      console.log(`\n   📊 Total Steps in Chart Data: ${totalSteps}`)
      console.log(`   📊 Has Meaningful Data: ${totalSteps > 0}`)
    }
  } catch (error) {
    console.log('❌ Chart Data Error:', error.message)
  }

  console.log('\n🏁 Debug completed!')
}

debugDashboardData().catch(console.error) 