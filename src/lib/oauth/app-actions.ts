/**
 * App Action Registry
 *
 * Defines available actions for each connected app with input/output schemas.
 * Used by the workflow editor to build step configurations and validate connections.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface AppActionInput {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'url'
  placeholder: string
  required: boolean
  description?: string
  options?: { label: string; value: string }[]
}

export interface AppActionOutput {
  key: string
  label: string
  type: string
}

export interface AppAction {
  id: string
  name: string
  description: string
  inputs: AppActionInput[]
  outputs: AppActionOutput[]
}

export interface AppDefinition {
  id: string
  name: string
  iconSlug: string
  description: string
  actions: AppAction[]
}

// ============================================================================
// App Definitions
// ============================================================================

const GITHUB_DEFINITION: AppDefinition = {
  id: 'github',
  name: 'GitHub',
  iconSlug: 'github',
  description: 'Collaborate on code, issues, and pull requests',
  actions: [
    {
      id: 'create_issue',
      name: 'Create Issue',
      description: 'Create a new issue in a repository',
      inputs: [
        {
          key: 'owner',
          label: 'Owner',
          type: 'text',
          placeholder: 'octocat',
          required: true,
          description: 'Repository owner username or organization',
        },
        {
          key: 'repo',
          label: 'Repository',
          type: 'text',
          placeholder: 'hello-world',
          required: true,
          description: 'Repository name',
        },
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          placeholder: 'Issue title',
          required: true,
        },
        {
          key: 'body',
          label: 'Body',
          type: 'textarea',
          placeholder: 'Issue description',
          required: false,
        },
        {
          key: 'labels',
          label: 'Labels',
          type: 'text',
          placeholder: 'bug, enhancement',
          required: false,
          description: 'Comma-separated list of labels',
        },
      ],
      outputs: [
        { key: 'issue_number', label: 'Issue Number', type: 'number' },
        { key: 'issue_url', label: 'Issue URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
    {
      id: 'create_pr_comment',
      name: 'Create PR Comment',
      description: 'Add a comment to a pull request',
      inputs: [
        {
          key: 'owner',
          label: 'Owner',
          type: 'text',
          placeholder: 'octocat',
          required: true,
        },
        {
          key: 'repo',
          label: 'Repository',
          type: 'text',
          placeholder: 'hello-world',
          required: true,
        },
        {
          key: 'pull_number',
          label: 'Pull Request Number',
          type: 'number',
          placeholder: '123',
          required: true,
        },
        {
          key: 'body',
          label: 'Comment',
          type: 'textarea',
          placeholder: 'Your comment',
          required: true,
        },
      ],
      outputs: [
        { key: 'comment_id', label: 'Comment ID', type: 'number' },
        { key: 'comment_url', label: 'Comment URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
    {
      id: 'list_repos',
      name: 'List Repositories',
      description: 'Get a list of repositories for the authenticated user',
      inputs: [
        {
          key: 'per_page',
          label: 'Results Per Page',
          type: 'number',
          placeholder: '30',
          required: false,
          description: 'Number of results per page (max 100)',
        },
      ],
      outputs: [
        { key: 'repositories', label: 'Repositories', type: 'array' },
        { key: 'total_count', label: 'Total Count', type: 'number' },
      ],
    },
    {
      id: 'star_repo',
      name: 'Star Repository',
      description: 'Star a repository',
      inputs: [
        {
          key: 'owner',
          label: 'Owner',
          type: 'text',
          placeholder: 'octocat',
          required: true,
        },
        {
          key: 'repo',
          label: 'Repository',
          type: 'text',
          placeholder: 'hello-world',
          required: true,
        },
      ],
      outputs: [
        { key: 'success', label: 'Success', type: 'boolean' },
        { key: 'starred_at', label: 'Starred At', type: 'datetime' },
      ],
    },
  ],
}

const NOTION_DEFINITION: AppDefinition = {
  id: 'notion',
  name: 'Notion',
  iconSlug: 'notion',
  description: 'Create and manage pages, databases, and content',
  actions: [
    {
      id: 'create_page',
      name: 'Create Page',
      description: 'Create a new page in a database or as a child page',
      inputs: [
        {
          key: 'parent_id',
          label: 'Parent ID',
          type: 'text',
          placeholder: 'abc123...',
          required: true,
          description: 'Database or page ID',
        },
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          placeholder: 'Page title',
          required: true,
        },
        {
          key: 'content',
          label: 'Content',
          type: 'textarea',
          placeholder: 'Page content',
          required: false,
        },
      ],
      outputs: [
        { key: 'page_id', label: 'Page ID', type: 'string' },
        { key: 'page_url', label: 'Page URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
    {
      id: 'update_page',
      name: 'Update Page',
      description: 'Update page properties',
      inputs: [
        {
          key: 'page_id',
          label: 'Page ID',
          type: 'text',
          placeholder: 'abc123...',
          required: true,
        },
        {
          key: 'properties',
          label: 'Properties',
          type: 'textarea',
          placeholder: '{"Status": {"status": {"name": "Done"}}}',
          required: true,
          description: 'JSON object with properties to update',
        },
      ],
      outputs: [
        { key: 'page_id', label: 'Page ID', type: 'string' },
        { key: 'updated_at', label: 'Updated At', type: 'datetime' },
      ],
    },
    {
      id: 'search',
      name: 'Search',
      description: 'Search for pages or databases',
      inputs: [
        {
          key: 'query',
          label: 'Query',
          type: 'text',
          placeholder: 'Search term',
          required: true,
        },
        {
          key: 'filter',
          label: 'Filter',
          type: 'select',
          placeholder: 'Select type',
          required: false,
          options: [
            { label: 'Page', value: 'page' },
            { label: 'Database', value: 'database' },
          ],
        },
      ],
      outputs: [
        { key: 'results', label: 'Results', type: 'array' },
        { key: 'has_more', label: 'Has More', type: 'boolean' },
      ],
    },
    {
      id: 'query_database',
      name: 'Query Database',
      description: 'Query a database with optional filters',
      inputs: [
        {
          key: 'database_id',
          label: 'Database ID',
          type: 'text',
          placeholder: 'abc123...',
          required: true,
        },
        {
          key: 'filter',
          label: 'Filter',
          type: 'textarea',
          placeholder: '{"property": "Status", "status": {"equals": "Done"}}',
          required: false,
          description: 'JSON filter object',
        },
      ],
      outputs: [
        { key: 'results', label: 'Results', type: 'array' },
        { key: 'has_more', label: 'Has More', type: 'boolean' },
      ],
    },
  ],
}

const SLACK_DEFINITION: AppDefinition = {
  id: 'slack',
  name: 'Slack',
  iconSlug: 'slack',
  description: 'Send messages and manage channels',
  actions: [
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a message to a channel',
      inputs: [
        {
          key: 'channel',
          label: 'Channel',
          type: 'text',
          placeholder: '#general or C1234567890',
          required: true,
          description: '#channel or channel ID',
        },
        {
          key: 'text',
          label: 'Message',
          type: 'textarea',
          placeholder: 'Your message',
          required: true,
        },
        {
          key: 'thread_ts',
          label: 'Thread Timestamp',
          type: 'text',
          placeholder: '1234567890.123456',
          required: false,
          description: 'Reply to thread',
        },
      ],
      outputs: [
        { key: 'message_ts', label: 'Message Timestamp', type: 'string' },
        { key: 'channel_id', label: 'Channel ID', type: 'string' },
      ],
    },
    {
      id: 'send_dm',
      name: 'Send Direct Message',
      description: 'Send a direct message to a user',
      inputs: [
        {
          key: 'user_id',
          label: 'User ID',
          type: 'text',
          placeholder: 'U1234567890',
          required: true,
        },
        {
          key: 'text',
          label: 'Message',
          type: 'textarea',
          placeholder: 'Your message',
          required: true,
        },
      ],
      outputs: [
        { key: 'message_ts', label: 'Message Timestamp', type: 'string' },
        { key: 'channel_id', label: 'DM Channel ID', type: 'string' },
      ],
    },
    {
      id: 'create_channel',
      name: 'Create Channel',
      description: 'Create a new channel',
      inputs: [
        {
          key: 'name',
          label: 'Channel Name',
          type: 'text',
          placeholder: 'new-channel',
          required: true,
        },
        {
          key: 'is_private',
          label: 'Private',
          type: 'select',
          placeholder: 'Select privacy',
          required: false,
          options: [
            { label: 'Public', value: 'no' },
            { label: 'Private', value: 'yes' },
          ],
        },
      ],
      outputs: [
        { key: 'channel_id', label: 'Channel ID', type: 'string' },
        { key: 'channel_name', label: 'Channel Name', type: 'string' },
      ],
    },
    {
      id: 'list_channels',
      name: 'List Channels',
      description: 'Get a list of channels',
      inputs: [
        {
          key: 'limit',
          label: 'Limit',
          type: 'number',
          placeholder: '100',
          required: false,
          description: 'Number of channels to return',
        },
      ],
      outputs: [
        { key: 'channels', label: 'Channels', type: 'array' },
        { key: 'total_count', label: 'Total Count', type: 'number' },
      ],
    },
  ],
}

const LINKEDIN_DEFINITION: AppDefinition = {
  id: 'linkedin',
  name: 'LinkedIn',
  iconSlug: 'linkedin',
  description: 'Share posts and articles professionally',
  actions: [
    {
      id: 'create_post',
      name: 'Create Post',
      description: 'Create a new post on LinkedIn',
      inputs: [
        {
          key: 'text',
          label: 'Post Content',
          type: 'textarea',
          placeholder: 'Share your thoughts...',
          required: true,
          description: 'Max 3000 characters',
        },
        {
          key: 'visibility',
          label: 'Visibility',
          type: 'select',
          placeholder: 'Select visibility',
          required: false,
          options: [
            { label: 'Public', value: 'PUBLIC' },
            { label: 'Connections Only', value: 'CONNECTIONS' },
          ],
        },
      ],
      outputs: [
        { key: 'post_id', label: 'Post ID', type: 'string' },
        { key: 'post_url', label: 'Post URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
    {
      id: 'share_article',
      name: 'Share Article',
      description: 'Share an article with optional commentary',
      inputs: [
        {
          key: 'url',
          label: 'Article URL',
          type: 'url',
          placeholder: 'https://example.com/article',
          required: true,
        },
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          placeholder: 'Article title',
          required: false,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Your commentary',
          required: false,
        },
        {
          key: 'visibility',
          label: 'Visibility',
          type: 'select',
          placeholder: 'Select visibility',
          required: false,
          options: [
            { label: 'Public', value: 'PUBLIC' },
            { label: 'Connections Only', value: 'CONNECTIONS' },
          ],
        },
      ],
      outputs: [
        { key: 'post_id', label: 'Post ID', type: 'string' },
        { key: 'post_url', label: 'Post URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
  ],
}

const DISCORD_DEFINITION: AppDefinition = {
  id: 'discord',
  name: 'Discord',
  iconSlug: 'discord',
  description: 'Send messages and manage Discord servers',
  actions: [
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a message to a channel',
      inputs: [
        {
          key: 'channel_id',
          label: 'Channel ID',
          type: 'text',
          placeholder: '123456789012345678',
          required: true,
        },
        {
          key: 'content',
          label: 'Message',
          type: 'textarea',
          placeholder: 'Your message',
          required: true,
        },
      ],
      outputs: [
        { key: 'message_id', label: 'Message ID', type: 'string' },
        { key: 'message_url', label: 'Message URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
    {
      id: 'send_embed',
      name: 'Send Embed',
      description: 'Send a rich embed message',
      inputs: [
        {
          key: 'channel_id',
          label: 'Channel ID',
          type: 'text',
          placeholder: '123456789012345678',
          required: true,
        },
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          placeholder: 'Embed title',
          required: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Embed description',
          required: false,
        },
        {
          key: 'color',
          label: 'Color',
          type: 'text',
          placeholder: '#5865F2',
          required: false,
          description: 'Hex color code',
        },
        {
          key: 'url',
          label: 'URL',
          type: 'url',
          placeholder: 'https://example.com',
          required: false,
        },
      ],
      outputs: [
        { key: 'message_id', label: 'Message ID', type: 'string' },
        { key: 'message_url', label: 'Message URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
    {
      id: 'create_thread',
      name: 'Create Thread',
      description: 'Create a new thread in a channel',
      inputs: [
        {
          key: 'channel_id',
          label: 'Channel ID',
          type: 'text',
          placeholder: '123456789012345678',
          required: true,
        },
        {
          key: 'name',
          label: 'Thread Name',
          type: 'text',
          placeholder: 'Discussion topic',
          required: true,
        },
        {
          key: 'message',
          label: 'Initial Message',
          type: 'textarea',
          placeholder: 'Start the conversation',
          required: false,
        },
      ],
      outputs: [
        { key: 'thread_id', label: 'Thread ID', type: 'string' },
        { key: 'thread_url', label: 'Thread URL', type: 'url' },
        { key: 'created_at', label: 'Created At', type: 'datetime' },
      ],
    },
  ],
}

// ============================================================================
// Registry
// ============================================================================

const APP_REGISTRY: Record<string, AppDefinition> = {
  github: GITHUB_DEFINITION,
  notion: NOTION_DEFINITION,
  slack: SLACK_DEFINITION,
  linkedin: LINKEDIN_DEFINITION,
  discord: DISCORD_DEFINITION,
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the full definition for an app
 */
export function getAppDefinition(appId: string): AppDefinition | undefined {
  return APP_REGISTRY[appId]
}

/**
 * Get all actions for an app
 */
export function getAppActions(appId: string): AppAction[] {
  const app = APP_REGISTRY[appId]
  return app?.actions ?? []
}

/**
 * Get a specific action for an app
 */
export function getAppAction(appId: string, actionId: string): AppAction | undefined {
  const actions = getAppActions(appId)
  return actions.find((action) => action.id === actionId)
}

/**
 * Get all app definitions
 */
export function getAllAppDefinitions(): AppDefinition[] {
  return Object.values(APP_REGISTRY)
}

/**
 * Get list of connectable app IDs
 */
export function getConnectableAppIds(): string[] {
  return ['github', 'notion', 'slack', 'linkedin', 'discord']
}
