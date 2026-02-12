import { createServerClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/oauth/token-manager'
import { encryptSecret } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface ProviderUserInfo {
  accountLabel: string
  accountId: string
}

async function fetchUserInfo(
  provider: string,
  accessToken: string,
  tokenResponse: { team?: { name?: string; id?: string } }
): Promise<ProviderUserInfo> {
  let userInfoUrl: string
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  }

  switch (provider) {
    case 'github':
      userInfoUrl = 'https://api.github.com/user'
      break
    case 'slack':
      // Slack returns team info directly in the token response
      return {
        accountLabel: tokenResponse.team?.name || 'Slack Workspace',
        accountId: tokenResponse.team?.id || '',
      }
    case 'notion':
      userInfoUrl = 'https://api.notion.com/v1/users/me'
      headers['Notion-Version'] = '2022-06-28'
      break
    case 'linkedin':
      userInfoUrl = 'https://api.linkedin.com/v2/userinfo'
      break
    case 'discord':
      userInfoUrl = 'https://discord.com/api/users/@me'
      break
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }

  const response = await fetch(userInfoUrl, { headers })

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`)
  }

  const data = await response.json()

  switch (provider) {
    case 'github':
      return {
        accountLabel: data.login || 'GitHub User',
        accountId: String(data.id || ''),
      }
    case 'notion':
      return {
        accountLabel: data.name || 'Notion User',
        accountId: data.id || '',
      }
    case 'linkedin':
      return {
        accountLabel: data.name || 'LinkedIn User',
        accountId: data.sub || '',
      }
    case 'discord':
      return {
        accountLabel: data.username || 'Discord User',
        accountId: String(data.id || ''),
      }
    default:
      return { accountLabel: 'Unknown', accountId: '' }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  try {
    const supabase = await createServerClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?error=unauthorized`
      )
    }

    // Get user's team
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (teamError || !teamMember) {
      console.error('Failed to fetch user team:', teamError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?error=no_team`
      )
    }

    // Validate state parameter
    const cookieStore = await cookies()
    const storedState = cookieStore.get(`oauth_state_${provider}`)?.value

    if (!state || !storedState || state !== storedState) {
      // Delete the state cookie
      cookieStore.delete(`oauth_state_${provider}`)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?error=invalid_state&provider=${provider}`
      )
    }

    // Delete the state cookie (one-time use)
    cookieStore.delete(`oauth_state_${provider}`)

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?error=no_code&provider=${provider}`
      )
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(provider, code)

    // Fetch user info from provider
    const userInfo = await fetchUserInfo(
      provider,
      tokenResponse.access_token,
      tokenResponse as unknown as { team?: { name?: string; id?: string } }
    )

    // Encrypt tokens
    const encryptedAccessToken = encryptSecret(tokenResponse.access_token)
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encryptSecret(tokenResponse.refresh_token)
      : null

    // Calculate token expiration
    const tokenExpiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null

    // Upsert connection (update if exists, insert if new)
    const { error: upsertError } = await supabase.from('app_connections').upsert(
      {
        user_id: user.id,
        team_id: teamMember.team_id,
        app_id: provider,
        provider: 'oauth2',
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        scopes: tokenResponse.scope ? tokenResponse.scope.split(' ') : [],
        account_label: userInfo.accountLabel,
        account_id: userInfo.accountId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,app_id',
      }
    )

    if (upsertError) {
      console.error('Failed to save connection:', upsertError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?error=save_failed&provider=${provider}`
      )
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?connected=${provider}`
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?error=oauth_failed&provider=${provider}`
    )
  }
}
