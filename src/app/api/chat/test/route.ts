import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'Chat API is working!',
    timestamp: new Date().toISOString(),
    features: [
      'RAG-powered health insights',
      'Fitness data analysis',
      'Lab results interpretation',
      'Health trend tracking'
    ]
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({
      received: body,
      echo: `Test response for: ${body.message || 'No message provided'}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }
} 