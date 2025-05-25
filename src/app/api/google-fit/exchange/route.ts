import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Extract code from URL query parameters
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    // Handle OAuth error (user denied permission)
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard?error=oauth_denied', request.url))
    }

    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url))
    }

    // Get server-side Supabase client with cookies
    const supabase = await createServerSupabaseClient()
    
    // Get current user from session/cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('User not authenticated:', authError)
      return NextResponse.redirect(new URL('/?error=not_authenticated', request.url))
    }

    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/dashboard?error=token_exchange_failed', request.url))
    }

    // Store refresh token in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        google_refresh_token: tokenData.refresh_token,
        updated_at: new Date().toISOString(),
      })

    if (updateError) {
      console.error('Failed to store refresh token:', updateError)
      return NextResponse.redirect(new URL('/dashboard?error=database_error', request.url))
    }

    console.log('Google Fit connected successfully for user:', user.email)
    
    // Redirect back to dashboard with success
    return NextResponse.redirect(new URL('/dashboard?connected=true', request.url))

  } catch (error) {
    console.error('OAuth exchange error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=server_error', request.url))
  }
} 