// Unified Health Score Calculation Library
// Used by both snapshot and trends APIs to ensure consistency

interface FitnessData {
  stepsToday?: number
  caloriesToday?: number
  activeMinutesToday?: number
  avgSteps?: number // for trends calculation
  avgActiveMinutes?: number
}

interface LabData {
  status: string
  markerName: string
  value: number
  unit: string
}

interface TrendData {
  stepsChange?: number
  caloriesChange?: number
  improvingCount?: number
  decliningCount?: number
  totalMarkers?: number
}

/**
 * Unified Health Score Calculation (0-100)
 * 
 * Breakdown:
 * - Fitness Activity: 40 points
 * - Lab Results: 40 points  
 * - Trends/Improvements: 20 points
 */
export function calculateUnifiedHealthScore(
  fitness: FitnessData,
  labData: LabData[],
  trends: TrendData = {}
): number {
  let score = 0

  // 1. FITNESS COMPONENT (40 points max)
  const steps = fitness.stepsToday ?? fitness.avgSteps ?? 0
  const activeMinutes = fitness.activeMinutesToday ?? fitness.avgActiveMinutes ?? 0
  
  // Steps: 25 points max (based on 10,000 step goal)
  const stepsScore = Math.min((steps / 10000) * 25, 25)
  score += stepsScore
  
  // Active minutes: 15 points max (based on 30 min goal)
  const activeScore = Math.min((activeMinutes / 30) * 15, 15)
  score += activeScore

  // 2. LAB RESULTS COMPONENT (40 points max)
  let labScore = 30 // Default baseline if no lab data
  
  if (labData.length > 0) {
    const totalLabPoints = labData.reduce((sum, lab) => {
      const status = lab.status.toLowerCase()
      
      switch (status) {
        case 'optimal': return sum + 10
        case 'normal': return sum + 8
        case 'borderline': return sum + 5
        case 'high':
        case 'low': return sum + 2
        default: return sum + 6
      }
    }, 0)
    
    // Average lab score (0-10 scale) then convert to 40-point scale
    const avgLabScore = totalLabPoints / labData.length
    labScore = Math.min(avgLabScore * 4, 40)
  }
  
  score += labScore

  // 3. TRENDS COMPONENT (20 points max)
  let trendScore = 10 // Default neutral score
  
  // For snapshot API (using recent changes)
  if (trends.stepsChange !== undefined && trends.caloriesChange !== undefined) {
    trendScore = 0
    if (trends.stepsChange > 0) trendScore += 10
    if (trends.caloriesChange > 0) trendScore += 10
  }
  
  // For trends API (using improving vs declining markers) 
  else if (trends.improvingCount !== undefined && trends.decliningCount !== undefined && trends.totalMarkers !== undefined) {
    if (trends.totalMarkers > 0) {
      const netImprovement = trends.improvingCount - trends.decliningCount
      const trendRatio = netImprovement / trends.totalMarkers
      // Scale from -20 to +20, then shift to 0-20 range
      trendScore = Math.max(0, Math.min(20, 10 + (trendRatio * 10)))
    }
  }
  
  score += trendScore

  return Math.min(Math.round(score), 100)
}

/**
 * Assess marker status consistently
 */
export function assessMarkerStatus(markerName: string, value: number, unit: string): 'optimal' | 'borderline' | 'high' | 'low' | 'normal' {
  const name = markerName.toLowerCase()
  
  if (name.includes('hemoglobin')) {
    if (value >= 12 && value <= 16) return 'optimal'
    if (value < 12) return 'low'
    return 'high'
  }
  
  if (name.includes('glucose') && unit.includes('mg/dL')) {
    if (value >= 70 && value <= 100) return 'optimal'
    if (value >= 100 && value <= 125) return 'borderline'
    if (value < 70) return 'low'
    return 'high'
  }
  
  if (name.includes('cholesterol') && unit.includes('mg/dL')) {
    if (value < 200) return 'optimal'
    if (value < 240) return 'borderline'
    return 'high'
  }
  
  if (name.includes('hdl') && unit.includes('mg/dL')) {
    if (value >= 60) return 'optimal'
    if (value >= 40) return 'normal'
    return 'low'
  }
  
  if (name.includes('ldl') && unit.includes('mg/dL')) {
    if (value < 100) return 'optimal'
    if (value < 130) return 'normal'
    if (value < 160) return 'borderline'
    return 'high'
  }
  
  if (name.includes('hba1c') && unit.includes('%')) {
    if (value < 5.7) return 'optimal'
    if (value < 6.5) return 'borderline'
    return 'high'
  }
  
  return 'normal'
}

/**
 * Categorize marker consistently
 */
export function categorizeMarker(markerName: string): string {
  const name = markerName.toLowerCase()
  
  if (name.includes('hemoglobin') || name.includes('hematocrit') || name.includes('rbc') || name.includes('wbc')) {
    return 'Blood Count'
  }
  if (name.includes('cholesterol') || name.includes('hdl') || name.includes('ldl') || name.includes('triglyceride')) {
    return 'Lipid Profile'
  }
  if (name.includes('glucose') || name.includes('hba1c') || name.includes('insulin')) {
    return 'Metabolic'
  }
  if (name.includes('tsh') || name.includes('t3') || name.includes('t4')) {
    return 'Thyroid'
  }
  
  return 'Other'
} 