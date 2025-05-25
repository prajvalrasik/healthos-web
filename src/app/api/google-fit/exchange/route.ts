import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Extract code from URL query parameters
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const state = url.searchParams.get('state') // This should contain user ID

    // Handle OAuth error (user denied permission)
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard?error=oauth_denied', request.url))
    }

    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url))
    }

    if (!state) {
      console.error('No state parameter received - cannot identify user')
      return NextResponse.redirect(new URL('/dashboard?error=invalid_state', request.url))
    }

    // Create server-side Supabase client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Use the state parameter as user ID (this should be set when initiating OAuth)
    const userId = state

    // Exchange code for tokens with Google
    const redirectUri = `${url.origin}/api/google-fit/exchange`
    
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
        redirect_uri: redirectUri,
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
        id: userId,
        google_refresh_token: tokenData.refresh_token,
        updated_at: new Date().toISOString(),
      })

    if (updateError) {
      console.error('Failed to store refresh token:', updateError)
      return NextResponse.redirect(new URL('/dashboard?error=database_error', request.url))
    }

    console.log('Google Fit connected successfully for user:', userId)
    
    // Redirect back to dashboard with success
    return NextResponse.redirect(new URL('/dashboard?connected=true', request.url))

  } catch (error) {
    console.error('OAuth exchange error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=server_error', request.url))
  }
} 