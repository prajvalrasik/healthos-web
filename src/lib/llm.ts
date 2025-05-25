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
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const markers = JSON.parse(cleanContent)
      
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
      console.error('Failed to parse Gemini response as JSON:', content)
      throw new Error('Invalid JSON response from Gemini')
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
 * Generate chat response with RAG context
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