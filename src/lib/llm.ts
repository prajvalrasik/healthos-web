// LLM utility functions for health data processing

interface LabMarker {
  marker: string
  value: number
  unit: string
}

interface FitMetric {
  date: string;
  steps: number;
  calories_burned: number;
  active_minutes: number;
}

interface LabMarkerData {
  marker: string;
  value: number;
  unit: string;
  taken_at: string;
}

/**
 * Generate embeddings using OpenAI API
 */
export async function embed(text: string): Promise<number[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

/**
 * Extract lab markers from PDF text using Google Gemini (free tier)
 */
export async function extractLabMarkersWithGemini(pdfText: string): Promise<LabMarker[]> {
  const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
  
  if (!geminiApiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set')
  }

  const prompt = `Extract lab markers from this lab report text. Return only a JSON array of objects with this exact structure:
[{"marker": "marker_name", "value": numeric_value, "unit": "unit_string"}]

Rules:
- Only extract numeric lab values with clear units
- Standardize marker names (e.g., "Hemoglobin" not "HGB")
- Use standard units (e.g., "g/dL" not "g/dl")
- Skip reference ranges and non-numeric values
- Return empty array if no valid markers found

Lab report text:
${pdfText}

JSON array only:`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API Error Details:', errorText)
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error(`Gemini rate limited. Try again in a few minutes. Status: ${response.status}`)
      }
      
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    
    if (!content) {
      throw new Error('No content returned from Gemini')
    }

    // Parse JSON response
    try {
      // Clean up the response (remove markdown code blocks if present)
      let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      
      // Handle common Gemini response issues
      if (cleanContent.includes('```')) {
        // Extract content between any code blocks
        const codeBlockMatch = cleanContent.match(/```[\s\S]*?```/)
        if (codeBlockMatch) {
          cleanContent = codeBlockMatch[0].replace(/```[a-z]*\n?|\n?```/g, '').trim()
        }
      }
      
      // Check if response starts with valid JSON
      if (!cleanContent.startsWith('[') && !cleanContent.startsWith('{')) {
        console.error('Response does not start with valid JSON:', cleanContent.substring(0, 100))
        throw new Error('Response is not valid JSON format')
      }
      
      // Try to fix common JSON issues
      cleanContent = cleanContent
        .replace(/'/g, '"')  // Replace single quotes with double quotes
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      
      const markers = JSON.parse(cleanContent)
      
      // Validate the response structure
      if (!Array.isArray(markers)) {
        console.error('Response is not an array:', typeof markers)
        throw new Error('Response is not an array')
      }

      // If empty array, that's valid
      if (markers.length === 0) {
        console.log('Gemini returned empty array - no markers found')
        return []
      }

      // Validate each marker object
      const validMarkers = markers.filter((marker: unknown): marker is LabMarker => {
        if (typeof marker !== 'object' || marker === null) {
          console.warn('Invalid marker object:', marker)
          return false
        }
        
        const m = marker as Record<string, unknown>
        
        if (!('marker' in m) || !('value' in m) || !('unit' in m)) {
          console.warn('Missing required fields in marker:', marker)
          return false
        }
        
        if (typeof m.marker !== 'string' || typeof m.value !== 'number' || typeof m.unit !== 'string') {
          console.warn('Invalid field types in marker:', marker)
          return false
        }
        
        if (m.marker.trim() === '' || m.unit.trim() === '') {
          console.warn('Empty marker name or unit:', marker)
          return false
        }
        
        if (isNaN(m.value) || !isFinite(m.value)) {
          console.warn('Invalid value in marker:', marker)
          return false
        }
        
        return true
      })

      console.log(`Gemini extraction: ${markers.length} raw markers, ${validMarkers.length} valid markers`)
      return validMarkers
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', {
        error: parseError,
        content: content.substring(0, 500),
        fullContent: content
      })
      throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
    }

  } catch (error) {
    console.error('Error extracting lab markers with Gemini:', error)
    throw error
  }
}

/**
 * Extract lab markers from PDF text using OpenAI (original function)
 */
export async function extractLabMarkers(pdfText: string): Promise<LabMarker[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const prompt = `
Extract lab markers from the following lab report text. Return a JSON array of objects with the following structure:
{ "marker": "marker_name", "value": numeric_value, "unit": "unit_string" }

Rules:
- Only extract numeric lab values with clear units
- Standardize marker names (e.g., "Total Cholesterol" not "CHOL TOTAL")
- Convert units to standard forms (e.g., "mg/dL" not "mg/dl")
- Skip reference ranges, dates, and non-numeric values
- Return empty array if no valid markers found

Lab report text:
${pdfText}

Return only valid JSON array:
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a medical lab report parser. Return only valid JSON arrays of lab markers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()
    
    if (!content) {
      throw new Error('No content returned from OpenAI')
    }

    // Parse JSON response
    try {
      const markers = JSON.parse(content)
      
      // Validate the response structure
      if (!Array.isArray(markers)) {
        throw new Error('Response is not an array')
      }

      // Validate each marker object
      const validMarkers = markers.filter((marker: unknown): marker is LabMarker => 
        typeof marker === 'object' &&
        marker !== null &&
        'marker' in marker &&
        'value' in marker &&
        'unit' in marker &&
        typeof (marker as LabMarker).marker === 'string' &&
        typeof (marker as LabMarker).value === 'number' &&
        typeof (marker as LabMarker).unit === 'string' &&
        (marker as LabMarker).marker.trim() !== '' &&
        (marker as LabMarker).unit.trim() !== ''
      )

      return validMarkers
    } catch {
      console.error('Failed to parse OpenAI response as JSON:', content)
      throw new Error('Invalid JSON response from OpenAI')
    }

  } catch (error) {
    console.error('Error extracting lab markers with OpenAI:', error)
    throw error
  }
}

/**
 * Extract lab markers with fallback: Gemini -> Regex (OpenAI removed)
 */
export async function extractLabMarkersWithFallback(pdfText: string): Promise<LabMarker[]> {
  // Try Gemini first (free tier)
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    try {
      console.log('Trying Gemini extraction...')
      const markers = await extractLabMarkersWithGemini(pdfText)
      console.log('Gemini extraction successful:', markers.length, 'markers found')
      return markers
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('Gemini extraction failed:', errorMessage)
    }
  } else {
    console.log('No Gemini API key found')
  }

  // If Gemini fails, throw error to trigger regex fallback
  throw new Error('Gemini extraction failed or no API key available')
}

/**
 * Generate chat response with RAG context (OpenAI)
 */
export async function chat(
  userMessage: string, 
  context: {
    fitData?: FitMetric[]
    labMarkers?: LabMarkerData[]
    similarMessages?: string[]
  }
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  // Build context string
  let contextString = ''
  
  if (context.fitData && context.fitData.length > 0) {
    contextString += '\n\nRecent Fitness Data:\n'
    context.fitData.forEach(metric => {
      contextString += `${metric.date}: ${metric.steps} steps, ${metric.calories_burned} calories, ${metric.active_minutes} active minutes\n`
    })
  }

  if (context.labMarkers && context.labMarkers.length > 0) {
    contextString += '\n\nRecent Lab Results:\n'
    context.labMarkers.forEach(marker => {
      contextString += `${marker.marker}: ${marker.value} ${marker.unit} (${marker.taken_at})\n`
    })
  }

  if (context.similarMessages && context.similarMessages.length > 0) {
    contextString += '\n\nSimilar Previous Conversations:\n'
    context.similarMessages.forEach(msg => {
      contextString += `- ${msg}\n`
    })
  }

  const systemPrompt = `
You are a helpful health assistant with access to the user's fitness and lab data. 
Provide personalized health insights based on their data.

Guidelines:
- Be encouraging and supportive
- Reference specific data points when relevant
- Suggest actionable health improvements
- Recommend consulting healthcare providers for medical concerns
- Keep responses concise but informative
${contextString}
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.'

  } catch (error) {
    console.error('Error generating chat response:', error)
    throw error
  }
}

/**
 * Generate chat response with RAG context using Gemini
 */
export async function chatWithGemini(
  userMessage: string, 
  context: {
    recentMetrics?: Array<{
      user_id: string
      date: string
      steps: number
      distance_meters: number
      calories_burned: number
      active_minutes: number
    }>
    labMarkers?: Array<{
      id: string
      user_id: string
      marker_name: string
      value: number
      unit: string
      created_at: string
    }>
    trends?: string
    recentChats?: Array<{
      user_message: string
      ai_response: string
      created_at: string
    }>
  }
): Promise<string> {
  const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
  
  if (!geminiApiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set')
  }

  // Enhanced context building with structured analysis
  const healthProfile = buildComprehensiveHealthProfile(context)
  const prompt = buildSystematicHealthPrompt(userMessage, healthProfile)

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent health advice
          maxOutputTokens: 600, // Increased for more detailed responses
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini Chat API Error Details:', errorText)
      
      if (response.status === 429) {
        throw new Error(`Gemini rate limited. Try again in a few minutes. Status: ${response.status}`)
      }
      
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    
    if (!content) {
      throw new Error('No content returned from Gemini')
    }

    return content

  } catch (error) {
    console.error('Error generating chat response with Gemini:', error)
    throw error
  }
}

/**
 * Build comprehensive health profile from user data
 */
function buildComprehensiveHealthProfile(context: {
  recentMetrics?: Array<{
    user_id: string
    date: string
    steps: number
    distance_meters: number
    calories_burned: number
    active_minutes: number
  }>
  labMarkers?: Array<{
    id: string
    user_id: string
    marker_name: string
    value: number
    unit: string
    created_at: string
  }>
  trends?: string
  recentChats?: Array<{
    user_message: string
    ai_response: string
    created_at: string
  }>
}): string {
  let profile = "=== HEALTH PROFILE ===\n"
  
  // Fitness Analytics Section
  if (context.recentMetrics && context.recentMetrics.length > 0) {
    profile += "\n📊 FITNESS ANALYTICS (Last 7 Days):\n"
    
    const metrics = context.recentMetrics
    const avgSteps = Math.round(metrics.reduce((sum, m) => sum + m.steps, 0) / metrics.length)
    const avgCalories = Math.round(metrics.reduce((sum, m) => sum + m.calories_burned, 0) / metrics.length)
    const avgActiveMinutes = Math.round(metrics.reduce((sum, m) => sum + m.active_minutes, 0) / metrics.length)
    const totalDistance = Math.round(metrics.reduce((sum, m) => sum + m.distance_meters, 0) / 1000 * 10) / 10
    
    profile += `• Daily Average: ${avgSteps.toLocaleString()} steps, ${avgCalories} calories, ${avgActiveMinutes} active minutes\n`
    profile += `• Total Distance: ${totalDistance} km over ${metrics.length} days\n`
    profile += `• Activity Level: ${classifyActivityLevel(avgSteps, avgActiveMinutes)}\n`
    
    // Recent daily breakdown
    profile += "\nDaily Breakdown:\n"
    metrics.slice(0, 5).forEach(metric => {
      const date = new Date(metric.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      profile += `  ${date}: ${metric.steps.toLocaleString()} steps, ${metric.calories_burned} cal, ${metric.active_minutes}min active\n`
    })
    
    // Trends analysis
    if (context.trends) {
      profile += `\n📈 Trends: ${context.trends}\n`
    }
  } else {
    profile += "\n📊 FITNESS DATA: No recent fitness data available\n"
  }
  
  // Lab Results Section
  if (context.labMarkers && context.labMarkers.length > 0) {
    profile += "\n🧪 LAB RESULTS ANALYSIS:\n"
    
    // Group markers by category
    const markerCategories = categorizeLabMarkers(context.labMarkers)
    
    Object.entries(markerCategories).forEach(([category, markers]) => {
      if (markers.length > 0) {
        profile += `\n${category}:\n`
        markers.forEach(marker => {
          const date = new Date(marker.created_at).toLocaleDateString()
          const status = assessMarkerStatus(marker.marker_name, marker.value, marker.unit)
          profile += `  • ${marker.marker_name}: ${marker.value} ${marker.unit} (${date}) - ${status}\n`
        })
      }
    })
  } else {
    profile += "\n🧪 LAB RESULTS: No lab data available\n"
  }
  
  // Recent Conversation Context
  if (context.recentChats && context.recentChats.length > 0) {
    profile += "\n💬 RECENT CONVERSATION CONTEXT:\n"
    profile += "Recent topics discussed:\n"
    
    context.recentChats.slice(0, 3).forEach((chat, index) => {
      const date = new Date(chat.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      // Extract key topics from recent conversations
      const userQuery = chat.user_message.substring(0, 60) + (chat.user_message.length > 60 ? '...' : '')
      profile += `  ${index + 1}. ${date}: "${userQuery}"\n`
    })
    
    profile += "\nNote: Consider conversation continuity when responding.\n"
  } else {
    profile += "\n💬 CONVERSATION CONTEXT: This appears to be a new conversation\n"
  }
  
  return profile
}

/**
 * Classify activity level based on steps and active minutes
 */
function classifyActivityLevel(avgSteps: number, avgActiveMinutes: number): string {
  if (avgSteps >= 10000 && avgActiveMinutes >= 30) {
    return "Highly Active (Excellent)"
  } else if (avgSteps >= 7500 && avgActiveMinutes >= 20) {
    return "Active (Good)"
  } else if (avgSteps >= 5000 && avgActiveMinutes >= 15) {
    return "Moderately Active (Fair)"
  } else {
    return "Low Activity (Needs Improvement)"
  }
}

/**
 * Categorize lab markers by health domain
 */
function categorizeLabMarkers(markers: Array<{
  marker_name: string
  value: number
  unit: string
  created_at: string
}>): Record<string, typeof markers> {
  const categories: Record<string, typeof markers> = {
    "Blood Count": [],
    "Lipid Profile": [],
    "Metabolic Panel": [],
    "Liver Function": [],
    "Kidney Function": [],
    "Thyroid Function": [],
    "Other Markers": []
  }
  
  markers.forEach(marker => {
    const name = marker.marker_name.toLowerCase()
    if (name.includes('hemoglobin') || name.includes('hematocrit') || name.includes('rbc') || name.includes('wbc') || name.includes('platelet')) {
      categories["Blood Count"].push(marker)
    } else if (name.includes('cholesterol') || name.includes('triglyceride') || name.includes('hdl') || name.includes('ldl')) {
      categories["Lipid Profile"].push(marker)
    } else if (name.includes('glucose') || name.includes('hba1c') || name.includes('insulin')) {
      categories["Metabolic Panel"].push(marker)
    } else if (name.includes('alt') || name.includes('ast') || name.includes('bilirubin') || name.includes('alp')) {
      categories["Liver Function"].push(marker)
    } else if (name.includes('creatinine') || name.includes('urea') || name.includes('gfr')) {
      categories["Kidney Function"].push(marker)
    } else if (name.includes('tsh') || name.includes('t3') || name.includes('t4')) {
      categories["Thyroid Function"].push(marker)
    } else {
      categories["Other Markers"].push(marker)
    }
  })
  
  return categories
}

/**
 * Assess marker status (simplified assessment)
 */
function assessMarkerStatus(markerName: string, value: number, unit: string): string {
  const name = markerName.toLowerCase()
  
  // Basic reference ranges (simplified)
  if (name.includes('hemoglobin')) {
    return value >= 12 && value <= 16 ? "Normal" : value < 12 ? "Low" : "High"
  } else if (name.includes('glucose') && unit.includes('mg/dL')) {
    return value >= 70 && value <= 100 ? "Normal" : value < 70 ? "Low" : "High"
  } else if (name.includes('cholesterol') && unit.includes('mg/dL')) {
    return value < 200 ? "Optimal" : value < 240 ? "Borderline" : "High"
  }
  
  return "See Reference Range"
}

/**
 * Build systematic health prompt with examples and structured approach
 */
function buildSystematicHealthPrompt(userMessage: string, healthProfile: string): string {
  return `You are HealthOS Assistant, an AI health companion that provides personalized insights based on user health data. You have access to comprehensive fitness metrics and lab results.

=== CORE PRINCIPLES ===
1. Always prioritize user safety and well-being
2. Provide evidence-based, actionable insights
3. Reference specific data points from the user's profile
4. Encourage healthy behaviors and positive reinforcement
5. Always recommend consulting healthcare providers for medical concerns
6. Never diagnose or prescribe - only provide insights and suggestions

=== RESPONSE FRAMEWORK ===
Structure your responses using this pattern:
1. Acknowledge the user's question with empathy
2. Reference specific data from their health profile
3. Provide actionable insights or recommendations
4. Include encouragement and positive reinforcement
5. Add appropriate medical disclaimers when relevant

=== EXAMPLE INTERACTIONS ===

User: "How are my steps looking?"
Assistant: "Looking at your recent activity, you're averaging 8,500 steps daily, which is fantastic! 🚶‍♂️ You're consistently above the recommended 7,500 steps and close to the gold standard of 10,000. Your Tuesday showed particularly strong performance with 9,200 steps. To reach that 10K goal, consider adding a 10-minute walk after lunch - that could add about 1,000-1,500 steps to your daily count. Keep up the excellent momentum!"

User: "Should I be worried about my cholesterol?"
Assistant: "Your recent cholesterol reading of 195 mg/dL is actually in the optimal range (under 200 mg/dL) - that's great news! 🎉 Combined with your active lifestyle averaging 8,500 steps daily, you're doing excellent work for your cardiovascular health. To maintain these good levels, continue your current activity routine and consider heart-healthy foods like oats, nuts, and fatty fish. However, always discuss any concerns about cholesterol with your healthcare provider for personalized medical advice."

User: "I feel tired lately, what could it be?"
Assistant: "I understand fatigue can be concerning. Looking at your recent data, I notice your activity has been consistent at 8,500 steps daily, which suggests good energy expenditure. However, fatigue can have many causes that go beyond fitness data - including sleep quality, stress, nutrition, or underlying health conditions. I'd strongly recommend discussing this with your healthcare provider, especially if the fatigue persists. They can review your lab work and overall health comprehensively. In the meantime, ensure you're getting 7-9 hours of quality sleep and staying hydrated."

=== SAFETY PROTOCOLS ===
- Never provide medical diagnoses
- Always recommend healthcare provider consultation for medical concerns
- Flag any concerning patterns for professional review
- Emphasize that this is not medical advice
- Be especially cautious with lab result interpretations

=== USER'S CURRENT HEALTH PROFILE ===
${healthProfile}

=== USER'S QUESTION ===
"${userMessage}"

=== YOUR RESPONSE ===
Provide a helpful, personalized response following the framework above. Be encouraging, reference specific data points, and maintain appropriate medical disclaimers. Keep the response conversational yet professional.`
}

/**
 * Generate chat response with fallback: Gemini -> Rule-based
 */
export async function chatWithFallback(
  userMessage: string,
  context: {
    recentMetrics?: Array<{
      user_id: string
      date: string
      steps: number
      distance_meters: number
      calories_burned: number
      active_minutes: number
    }>
    labMarkers?: Array<{
      id: string
      user_id: string
      marker_name: string
      value: number
      unit: string
      created_at: string
    }>
    trends?: string
    recentChats?: Array<{
      user_message: string
      ai_response: string
      created_at: string
    }>
  }
): Promise<string> {
  // Try Gemini first
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    try {
      console.log('Trying Gemini chat...')
      const response = await chatWithGemini(userMessage, context)
      console.log('Gemini chat successful')
      return response
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('Gemini chat failed:', errorMessage)
    }
  } else {
    console.log('No Gemini API key found for chat')
  }

  // Fallback to rule-based system
  console.log('Falling back to rule-based chat')
  return generateRuleBasedResponse(userMessage, context)
}

/**
 * Rule-based response system (fallback)
 */
function generateRuleBasedResponse(
  message: string,
  context: {
    recentMetrics?: Array<{
      steps: number
      calories_burned: number
    }>
    labMarkers?: Array<{
      marker_name: string
      value: number
      unit: string
    }>
    trends?: string
  }
): string {
  const lowerMessage = message.toLowerCase()
  
  // Health insights based on context
  if (lowerMessage.includes('steps') || lowerMessage.includes('walking')) {
    const recentSteps = context.recentMetrics?.[0]?.steps || 0
    if (recentSteps > 8000) {
      return `Great job! You've been walking ${recentSteps.toLocaleString()} steps recently. You're exceeding the recommended 8,000 steps per day. Keep up the excellent work! 🚶‍♂️✨`
    } else if (recentSteps > 5000) {
      return `You're doing well with ${recentSteps.toLocaleString()} steps recently. Try to aim for 8,000+ steps daily for optimal health benefits. Maybe take a walk after meals? 🌟`
    } else {
      return `I see you've walked ${recentSteps.toLocaleString()} steps recently. Consider gradually increasing your daily walks. Even a 10-minute walk can boost your energy and mood! 💪`
    }
  }

  if (lowerMessage.includes('calories') || lowerMessage.includes('burn')) {
    const recentCalories = context.recentMetrics?.[0]?.calories_burned || 0
    return `You've burned ${recentCalories} calories in your recent activity. ${context.trends}. Remember, consistency is key for maintaining a healthy metabolism! 🔥`
  }

  if (lowerMessage.includes('lab') || lowerMessage.includes('results') || lowerMessage.includes('markers')) {
    const markerCount = context.labMarkers?.length || 0
    if (markerCount > 0) {
      const recentMarker = context.labMarkers?.[0]
      return `I can see you have ${markerCount} lab markers tracked. Your most recent marker shows ${recentMarker?.marker_name}: ${recentMarker?.value} ${recentMarker?.unit}. Always discuss lab results with your healthcare provider for proper interpretation. 📊`
    } else {
      return `I don't see any lab results uploaded yet. You can upload your lab reports in the dashboard for personalized insights about your biomarkers. 🧪`
    }
  }

  if (lowerMessage.includes('trend') || lowerMessage.includes('progress')) {
    return `Based on your recent data: ${context.trends}. Your health journey is unique - small consistent improvements lead to big results over time! 📈`
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `Hello! I'm your HealthOS assistant. I can help you understand your fitness data, lab results, and health trends. What would you like to know about your health today? 👋`
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return `I can help you with:
• 📊 Analyzing your fitness metrics (steps, calories, active minutes)
• 🧪 Understanding your lab results and biomarkers
• 📈 Tracking health trends over time
• 💡 Providing personalized health insights
• 🎯 Setting realistic health goals

What specific area would you like to explore?`
  }

  // Default response
  return `I understand you're asking about "${message}". While I'm still learning, I can help you analyze your fitness data, lab results, and health trends. Try asking about your steps, calories, lab markers, or recent progress! 🤖💙`
} 