export interface OAuthProviderConfig {
  id: string
  name: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnvVar: string
  clientSecretEnvVar: string
  extraAuthorizeParams?: Record<string, string>
  supportsRefresh: boolean
}

const PROVIDERS: OAuthProviderConfig[] = [
  {
    id: 'github',
    name: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user'],
    clientIdEnvVar: 'GITHUB_CLIENT_ID',
    clientSecretEnvVar: 'GITHUB_CLIENT_SECRET',
    supportsRefresh: false,
  },
  {
    id: 'notion',
    name: 'Notion',
    authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    clientIdEnvVar: 'NOTION_CLIENT_ID',
    clientSecretEnvVar: 'NOTION_CLIENT_SECRET',
    extraAuthorizeParams: { owner: 'user' },
    supportsRefresh: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'channels:manage', 'users:read', 'im:write'],
    clientIdEnvVar: 'SLACK_CLIENT_ID',
    clientSecretEnvVar: 'SLACK_CLIENT_SECRET',
    supportsRefresh: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'w_member_social'],
    clientIdEnvVar: 'LINKEDIN_CLIENT_ID',
    clientSecretEnvVar: 'LINKEDIN_CLIENT_SECRET',
    supportsRefresh: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    authorizeUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: ['bot', 'guilds', 'messages.read'],
    clientIdEnvVar: 'DISCORD_CLIENT_ID',
    clientSecretEnvVar: 'DISCORD_CLIENT_SECRET',
    supportsRefresh: true,
  },
]

/**
 * Get OAuth provider configuration by app ID.
 */
export function getOAuthProvider(appId: string): OAuthProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === appId)
}

/**
 * Get all OAuth provider configurations.
 */
export function getAllOAuthProviders(): OAuthProviderConfig[] {
  return PROVIDERS
}

/**
 * Build the OAuth callback redirect URI for a given app.
 */
export function getRedirectUri(appId: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${siteUrl}/api/auth/${appId}/callback`
}

/**
 * Check if a provider is configured (env vars are set).
 */
export function isProviderConfigured(appId: string): boolean {
  const provider = getOAuthProvider(appId)
  if (!provider) return false
  const clientId = process.env[provider.clientIdEnvVar]
  const clientSecret = process.env[provider.clientSecretEnvVar]
  return Boolean(clientId && clientSecret)
}

/**
 * Build the full OAuth authorization URL with all required parameters.
 */
export function buildAuthorizeUrl(appId: string, state: string): string | null {
  const provider = getOAuthProvider(appId)
  if (!provider || !isProviderConfigured(appId)) return null

  const clientId = process.env[provider.clientIdEnvVar]
  if (!clientId) return null

  const redirectUri = getRedirectUri(appId)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
  })

  if (provider.scopes.length > 0) {
    params.set('scope', provider.scopes.join(' '))
  }

  if (provider.extraAuthorizeParams) {
    for (const [key, value] of Object.entries(provider.extraAuthorizeParams)) {
      params.set(key, value)
    }
  }

  return `${provider.authorizeUrl}?${params.toString()}`
}
