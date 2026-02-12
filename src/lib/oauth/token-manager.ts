import type { SupabaseClient } from '@supabase/supabase-js'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { getOAuthProvider, getRedirectUri } from './providers'

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope?: string
}

/**
 * Exchange an OAuth authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(appId: string, code: string): Promise<TokenResponse> {
  const provider = getOAuthProvider(appId)
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${appId}`)
  }

  const clientId = process.env[provider.clientIdEnvVar]
  const clientSecret = process.env[provider.clientSecretEnvVar]
  if (!clientId || !clientSecret) {
    throw new Error(`OAuth provider ${appId} is not configured`)
  }

  const redirectUri = getRedirectUri(appId)

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new Error('No access_token in token response')
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type || 'Bearer',
    scope: data.scope,
  }
}

/**
 * Refresh an expired OAuth access token using a refresh token.
 */
export async function refreshAccessToken(
  appId: string,
  refreshToken: string
): Promise<TokenResponse> {
  const provider = getOAuthProvider(appId)
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${appId}`)
  }

  if (!provider.supportsRefresh) {
    throw new Error(`Provider ${appId} does not support token refresh`)
  }

  const clientId = process.env[provider.clientIdEnvVar]
  const clientSecret = process.env[provider.clientSecretEnvVar]
  if (!clientId || !clientSecret) {
    throw new Error(`OAuth provider ${appId} is not configured`)
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to refresh access token: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new Error('No access_token in refresh response')
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_in: data.expires_in,
    token_type: data.token_type || 'Bearer',
    scope: data.scope,
  }
}

/**
 * Get a valid access token for a connection, refreshing if expired.
 */
export async function getValidAccessToken(
  connectionId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: connection, error } = await supabase
    .from('app_connections')
    .select('app_id, access_token, refresh_token, token_expires_at')
    .eq('id', connectionId)
    .single()

  if (error || !connection) {
    throw new Error(`Connection not found: ${connectionId}`)
  }

  const now = new Date()
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null

  // If token is still valid (has >5 min remaining), return it
  if (expiresAt && expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return decryptSecret(connection.access_token)
  }

  // Token is expired or about to expire - refresh it
  const provider = getOAuthProvider(connection.app_id)
  if (!provider || !provider.supportsRefresh) {
    // Provider doesn't support refresh - return the existing token
    return decryptSecret(connection.access_token)
  }

  if (!connection.refresh_token) {
    throw new Error(`No refresh token available for connection ${connectionId}`)
  }

  const refreshToken = decryptSecret(connection.refresh_token)
  const tokenResponse = await refreshAccessToken(connection.app_id, refreshToken)

  // Update the connection with new tokens
  const newExpiresAt = tokenResponse.expires_in
    ? new Date(now.getTime() + tokenResponse.expires_in * 1000)
    : null

  await supabase
    .from('app_connections')
    .update({
      access_token: encryptSecret(tokenResponse.access_token),
      refresh_token: tokenResponse.refresh_token
        ? encryptSecret(tokenResponse.refresh_token)
        : connection.refresh_token,
      token_expires_at: newExpiresAt?.toISOString(),
    })
    .eq('id', connectionId)

  return tokenResponse.access_token
}
