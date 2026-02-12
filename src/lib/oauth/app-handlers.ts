import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface AppExecutionResult {
  success: boolean
  app_id: string
  action: string
  result?: unknown
  error?: string
}

/**
 * Main entry point - routes to the correct app handler
 */
export async function executeAppAction(
  config: AppStepConfig,
  accessToken: string
): Promise<AppExecutionResult> {
  const { app_id, action, inputs } = config

  try {
    switch (app_id) {
      case 'github':
        return await executeGitHubAction(action, inputs, accessToken)
      case 'notion':
        return await executeNotionAction(action, inputs, accessToken)
      case 'slack':
        return await executeSlackAction(action, inputs, accessToken)
      case 'linkedin':
        return await executeLinkedInAction(action, inputs, accessToken)
      case 'discord':
        return await executeDiscordAction(action, inputs, accessToken)
      default:
        return {
          success: false,
          app_id,
          action,
          error: `Unknown app_id: ${app_id}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      app_id,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * GitHub API Handler
 */
async function executeGitHubAction(
  action: string,
  inputs: Record<string, unknown>,
  accessToken: string
): Promise<AppExecutionResult> {
  const baseUrl = 'https://api.github.com'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  try {
    let response: Response
    let result: unknown

    switch (action) {
      case 'create_issue': {
        const { owner, repo, title, body, labels } = inputs
        if (!owner || !repo || !title) {
          return {
            success: false,
            app_id: 'github',
            action,
            error: 'Missing required fields: owner, repo, title',
          }
        }

        response = await fetch(`${baseUrl}/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title,
            body: body || '',
            labels:
              typeof labels === 'string'
                ? labels
                    .split(',')
                    .map((l: string) => l.trim())
                    .filter(Boolean)
                : labels || [],
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'github',
            action,
            error: `GitHub API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'create_pr_comment': {
        const { owner, repo, pull_number, body } = inputs
        if (!owner || !repo || !pull_number || !body) {
          return {
            success: false,
            app_id: 'github',
            action,
            error: 'Missing required fields: owner, repo, pull_number, body',
          }
        }

        response = await fetch(`${baseUrl}/repos/${owner}/${repo}/issues/${pull_number}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ body }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'github',
            action,
            error: `GitHub API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'list_repos': {
        const per_page = inputs.per_page || 30
        response = await fetch(`${baseUrl}/user/repos?per_page=${per_page}&sort=updated`, {
          headers,
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'github',
            action,
            error: `GitHub API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'star_repo': {
        const { owner, repo } = inputs
        if (!owner || !repo) {
          return {
            success: false,
            app_id: 'github',
            action,
            error: 'Missing required fields: owner, repo',
          }
        }

        response = await fetch(`${baseUrl}/user/starred/${owner}/${repo}`, {
          method: 'PUT',
          headers,
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'github',
            action,
            error: `GitHub API error: ${response.status} ${response.statusText}`,
          }
        }

        result = { starred: true }
        break
      }

      default:
        return {
          success: false,
          app_id: 'github',
          action,
          error: `Unknown GitHub action: ${action}`,
        }
    }

    return {
      success: true,
      app_id: 'github',
      action,
      result,
    }
  } catch (error) {
    return {
      success: false,
      app_id: 'github',
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Notion API Handler
 */
async function executeNotionAction(
  action: string,
  inputs: Record<string, unknown>,
  accessToken: string
): Promise<AppExecutionResult> {
  const baseUrl = 'https://api.notion.com/v1'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  try {
    let response: Response
    let result: unknown

    switch (action) {
      case 'create_page': {
        const { parent_id, title, content } = inputs
        if (!parent_id || !title) {
          return {
            success: false,
            app_id: 'notion',
            action,
            error: 'Missing required fields: parent_id, title',
          }
        }

        response = await fetch(`${baseUrl}/pages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: { database_id: parent_id },
            properties: {
              title: {
                title: [{ text: { content: title } }],
              },
            },
            children: content
              ? [
                  {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                      rich_text: [{ text: { content: content as string } }],
                    },
                  },
                ]
              : [],
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'notion',
            action,
            error: `Notion API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'update_page': {
        const { page_id, properties } = inputs
        if (!page_id || !properties) {
          return {
            success: false,
            app_id: 'notion',
            action,
            error: 'Missing required fields: page_id, properties',
          }
        }

        response = await fetch(`${baseUrl}/pages/${page_id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ properties }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'notion',
            action,
            error: `Notion API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'search': {
        const { query, filter } = inputs
        response = await fetch(`${baseUrl}/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: query || '',
            filter: filter || {},
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'notion',
            action,
            error: `Notion API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'query_database': {
        const { database_id, filter } = inputs
        if (!database_id) {
          return {
            success: false,
            app_id: 'notion',
            action,
            error: 'Missing required field: database_id',
          }
        }

        response = await fetch(`${baseUrl}/databases/${database_id}/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filter: filter || {},
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'notion',
            action,
            error: `Notion API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      default:
        return {
          success: false,
          app_id: 'notion',
          action,
          error: `Unknown Notion action: ${action}`,
        }
    }

    return {
      success: true,
      app_id: 'notion',
      action,
      result,
    }
  } catch (error) {
    return {
      success: false,
      app_id: 'notion',
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Slack API Handler
 */
async function executeSlackAction(
  action: string,
  inputs: Record<string, unknown>,
  accessToken: string
): Promise<AppExecutionResult> {
  const baseUrl = 'https://slack.com/api'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  try {
    let response: Response
    let result: unknown

    switch (action) {
      case 'send_message': {
        const { channel, text, thread_ts } = inputs
        if (!channel || !text) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: 'Missing required fields: channel, text',
          }
        }

        response = await fetch(`${baseUrl}/chat.postMessage`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            channel,
            text,
            ...(thread_ts ? { thread_ts } : {}),
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: `Slack API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        const slackResponse = result as { ok?: boolean; error?: string }
        if (slackResponse.ok === false) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: `Slack API error: ${slackResponse.error || 'unknown'}`,
          }
        }
        break
      }

      case 'send_dm': {
        const { user_id, text } = inputs
        if (!user_id || !text) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: 'Missing required fields: user_id, text',
          }
        }

        response = await fetch(`${baseUrl}/chat.postMessage`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            channel: user_id,
            text,
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: `Slack API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        const slackResponse2 = result as { ok?: boolean; error?: string }
        if (slackResponse2.ok === false) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: `Slack API error: ${slackResponse2.error || 'unknown'}`,
          }
        }
        break
      }

      case 'create_channel': {
        const { name, is_private } = inputs
        if (!name) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: 'Missing required field: name',
          }
        }

        response = await fetch(`${baseUrl}/conversations.create`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name,
            is_private: is_private || false,
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: `Slack API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        const slackResponse3 = result as { ok?: boolean; error?: string }
        if (slackResponse3.ok === false) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: `Slack API error: ${slackResponse3.error || 'unknown'}`,
          }
        }
        break
      }

      case 'list_channels': {
        const limit = inputs.limit || 100
        response = await fetch(`${baseUrl}/conversations.list?limit=${limit}`, { headers })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'slack',
            action,
            error: `Slack API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      default:
        return {
          success: false,
          app_id: 'slack',
          action,
          error: `Unknown Slack action: ${action}`,
        }
    }

    return {
      success: true,
      app_id: 'slack',
      action,
      result,
    }
  } catch (error) {
    return {
      success: false,
      app_id: 'slack',
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * LinkedIn API Handler
 */
async function executeLinkedInAction(
  action: string,
  inputs: Record<string, unknown>,
  accessToken: string
): Promise<AppExecutionResult> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': '202401',
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }

  try {
    let response: Response
    let result: unknown

    // Get user URN for author field
    const getUserUrn = async (): Promise<string> => {
      const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', { headers })

      if (!userInfoResponse.ok) {
        throw new Error(
          `Failed to get user info: ${userInfoResponse.status} ${userInfoResponse.statusText}`
        )
      }

      const userInfo = await userInfoResponse.json()
      return `urn:li:person:${userInfo.sub}`
    }

    switch (action) {
      case 'create_post': {
        const { text, visibility } = inputs
        if (!text) {
          return {
            success: false,
            app_id: 'linkedin',
            action,
            error: 'Missing required field: text',
          }
        }

        const authorUrn = await getUserUrn()

        response = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            author: authorUrn,
            commentary: text,
            visibility: visibility || 'PUBLIC',
            distribution: {
              feedDistribution: 'MAIN_FEED',
              targetEntities: [],
              thirdPartyDistributionChannels: [],
            },
            lifecycleState: 'PUBLISHED',
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'linkedin',
            action,
            error: `LinkedIn API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'share_article': {
        const { description, url, title, visibility } = inputs
        if (!url) {
          return {
            success: false,
            app_id: 'linkedin',
            action,
            error: 'Missing required field: url',
          }
        }

        const authorUrn = await getUserUrn()

        response = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            author: authorUrn,
            commentary: (description as string) || '',
            visibility: visibility || 'PUBLIC',
            distribution: {
              feedDistribution: 'MAIN_FEED',
              targetEntities: [],
              thirdPartyDistributionChannels: [],
            },
            content: {
              article: {
                source: url,
                title: title || url,
              },
            },
            lifecycleState: 'PUBLISHED',
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'linkedin',
            action,
            error: `LinkedIn API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      default:
        return {
          success: false,
          app_id: 'linkedin',
          action,
          error: `Unknown LinkedIn action: ${action}`,
        }
    }

    return {
      success: true,
      app_id: 'linkedin',
      action,
      result,
    }
  } catch (error) {
    return {
      success: false,
      app_id: 'linkedin',
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Discord API Handler
 */
async function executeDiscordAction(
  action: string,
  inputs: Record<string, unknown>,
  accessToken: string
): Promise<AppExecutionResult> {
  const baseUrl = 'https://discord.com/api/v10'
  const headers = {
    Authorization: `Bot ${accessToken}`,
    'Content-Type': 'application/json',
  }

  try {
    let response: Response
    let result: unknown

    switch (action) {
      case 'send_message': {
        const { channel_id, content } = inputs
        if (!channel_id || !content) {
          return {
            success: false,
            app_id: 'discord',
            action,
            error: 'Missing required fields: channel_id, content',
          }
        }

        response = await fetch(`${baseUrl}/channels/${channel_id}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'discord',
            action,
            error: `Discord API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'send_embed': {
        const { channel_id, title, description, color, url } = inputs
        if (!channel_id || !title) {
          return {
            success: false,
            app_id: 'discord',
            action,
            error: 'Missing required fields: channel_id, title',
          }
        }

        response = await fetch(`${baseUrl}/channels/${channel_id}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            embeds: [
              {
                title,
                description: description || '',
                color:
                  typeof color === 'string'
                    ? parseInt((color as string).replace('#', ''), 16) || 0x5865f2
                    : color || 0x5865f2,
                ...(url ? { url } : {}),
              },
            ],
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'discord',
            action,
            error: `Discord API error: ${response.status} ${response.statusText}`,
          }
        }

        result = await response.json()
        break
      }

      case 'create_thread': {
        const { channel_id, name, message } = inputs
        if (!channel_id || !name) {
          return {
            success: false,
            app_id: 'discord',
            action,
            error: 'Missing required fields: channel_id, name',
          }
        }

        // Create thread
        response = await fetch(`${baseUrl}/channels/${channel_id}/threads`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name,
            type: 11, // PUBLIC_THREAD
          }),
        })

        if (!response.ok) {
          return {
            success: false,
            app_id: 'discord',
            action,
            error: `Discord API error: ${response.status} ${response.statusText}`,
          }
        }

        const thread = await response.json()

        // Send initial message if provided
        if (message) {
          await fetch(`${baseUrl}/channels/${thread.id}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: message }),
          })
        }

        result = thread
        break
      }

      default:
        return {
          success: false,
          app_id: 'discord',
          action,
          error: `Unknown Discord action: ${action}`,
        }
    }

    return {
      success: true,
      app_id: 'discord',
      action,
      result,
    }
  } catch (error) {
    return {
      success: false,
      app_id: 'discord',
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
