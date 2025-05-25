import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    return NextResponse.json({ 
      message: 'Supabase connection successful',
      user: user || null,
      authenticated: !!user
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to connect to Supabase',
      details: error 
    }, { status: 500 })
  }
} 