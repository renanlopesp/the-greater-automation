export type AppAuthType = 'oauth' | 'api_key' | 'google'

export type AppCategory =
  | 'AI'
  | 'Advertising'
  | 'Analytics'
  | 'Automation'
  | 'CRM'
  | 'Communication'
  | 'Database'
  | 'Design'
  | 'Development'
  | 'Documentation'
  | 'E-commerce'
  | 'Email'
  | 'Finance'
  | 'Forms'
  | 'Infrastructure'
  | 'Marketing'
  | 'Monitoring'
  | 'Productivity'
  | 'Project Management'
  | 'Sales'
  | 'Scheduling'
  | 'Search'
  | 'Security'
  | 'Social Media'
  | 'Storage'
  | 'Support'
  | 'Website'

export interface AppIntegration {
  id: string
  name: string
  logoUrl: string
  category: AppCategory
  authType: AppAuthType
}

export const APP_INTEGRATIONS: AppIntegration[] = [
  { id: '1password', name: '1Password', logoUrl: '', category: 'Security', authType: 'api_key' },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    logoUrl: '',
    category: 'Marketing',
    authType: 'api_key',
  },
  { id: 'airtable', name: 'Airtable', logoUrl: '', category: 'Productivity', authType: 'oauth' },
  { id: 'algolia', name: 'Algolia', logoUrl: '', category: 'Search', authType: 'api_key' },
  { id: 'amplitude', name: 'Amplitude', logoUrl: '', category: 'Analytics', authType: 'api_key' },
  { id: 'anthropic', name: 'Anthropic', logoUrl: '', category: 'AI', authType: 'api_key' },
  { id: 'asana', name: 'Asana', logoUrl: '', category: 'Project Management', authType: 'oauth' },
  { id: 'auth0', name: 'Auth0', logoUrl: '', category: 'Security', authType: 'oauth' },
  { id: 'aws-s3', name: 'AWS S3', logoUrl: '', category: 'Storage', authType: 'api_key' },
  {
    id: 'basecamp',
    name: 'Basecamp',
    logoUrl: '',
    category: 'Project Management',
    authType: 'oauth',
  },
  { id: 'bigquery', name: 'BigQuery', logoUrl: '', category: 'Database', authType: 'google' },
  { id: 'bitbucket', name: 'Bitbucket', logoUrl: '', category: 'Development', authType: 'oauth' },
  { id: 'box', name: 'Box', logoUrl: '', category: 'Storage', authType: 'oauth' },
  {
    id: 'brevo',
    name: 'Brevo (Sendinblue)',
    logoUrl: '',
    category: 'Marketing',
    authType: 'api_key',
  },
  { id: 'calendly', name: 'Calendly', logoUrl: '', category: 'Scheduling', authType: 'oauth' },
  { id: 'circleci', name: 'CircleCI', logoUrl: '', category: 'Development', authType: 'oauth' },
  {
    id: 'clickup',
    name: 'ClickUp',
    logoUrl: '',
    category: 'Project Management',
    authType: 'oauth',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    logoUrl: '',
    category: 'Infrastructure',
    authType: 'api_key',
  },
  { id: 'coda', name: 'Coda', logoUrl: '', category: 'Productivity', authType: 'oauth' },
  {
    id: 'confluence',
    name: 'Confluence',
    logoUrl: '',
    category: 'Documentation',
    authType: 'oauth',
  },
  { id: 'convertkit', name: 'ConvertKit', logoUrl: '', category: 'Marketing', authType: 'api_key' },
  { id: 'copper', name: 'Copper', logoUrl: '', category: 'CRM', authType: 'api_key' },
  { id: 'datadog', name: 'Datadog', logoUrl: '', category: 'Monitoring', authType: 'api_key' },
  { id: 'discord', name: 'Discord', logoUrl: '', category: 'Communication', authType: 'oauth' },
  {
    id: 'docker-hub',
    name: 'Docker Hub',
    logoUrl: '',
    category: 'Development',
    authType: 'api_key',
  },
  { id: 'dropbox', name: 'Dropbox', logoUrl: '', category: 'Storage', authType: 'oauth' },
  {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    logoUrl: '',
    category: 'Search',
    authType: 'api_key',
  },
  { id: 'evernote', name: 'Evernote', logoUrl: '', category: 'Productivity', authType: 'oauth' },
  { id: 'facebook', name: 'Facebook', logoUrl: '', category: 'Social Media', authType: 'oauth' },
  {
    id: 'facebook-ads',
    name: 'Facebook Ads',
    logoUrl: '',
    category: 'Advertising',
    authType: 'oauth',
  },
  { id: 'figma', name: 'Figma', logoUrl: '', category: 'Design', authType: 'oauth' },
  { id: 'firebase', name: 'Firebase', logoUrl: '', category: 'Database', authType: 'api_key' },
  { id: 'freshdesk', name: 'Freshdesk', logoUrl: '', category: 'Support', authType: 'api_key' },
  { id: 'github', name: 'GitHub', logoUrl: '', category: 'Development', authType: 'oauth' },
  { id: 'gitlab', name: 'GitLab', logoUrl: '', category: 'Development', authType: 'oauth' },
  { id: 'gmail', name: 'Gmail', logoUrl: '', category: 'Email', authType: 'google' },
  { id: 'gong', name: 'Gong', logoUrl: '', category: 'Sales', authType: 'oauth' },
  {
    id: 'google-ads',
    name: 'Google Ads',
    logoUrl: '',
    category: 'Advertising',
    authType: 'google',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    logoUrl: '',
    category: 'Productivity',
    authType: 'google',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    logoUrl: '',
    category: 'Storage',
    authType: 'google',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    logoUrl: '',
    category: 'Productivity',
    authType: 'google',
  },
  { id: 'grafana', name: 'Grafana', logoUrl: '', category: 'Monitoring', authType: 'api_key' },
  { id: 'hubspot', name: 'HubSpot', logoUrl: '', category: 'CRM', authType: 'oauth' },
  { id: 'instagram', name: 'Instagram', logoUrl: '', category: 'Social Media', authType: 'oauth' },
  { id: 'intercom', name: 'Intercom', logoUrl: '', category: 'Support', authType: 'oauth' },
  { id: 'jira', name: 'Jira', logoUrl: '', category: 'Project Management', authType: 'oauth' },
  { id: 'linear', name: 'Linear', logoUrl: '', category: 'Project Management', authType: 'oauth' },
  { id: 'linkedin', name: 'LinkedIn', logoUrl: '', category: 'Social Media', authType: 'oauth' },
  { id: 'looker', name: 'Looker', logoUrl: '', category: 'Analytics', authType: 'google' },
  { id: 'loom', name: 'Loom', logoUrl: '', category: 'Communication', authType: 'oauth' },
  { id: 'magento', name: 'Magento', logoUrl: '', category: 'E-commerce', authType: 'api_key' },
  { id: 'mailchimp', name: 'Mailchimp', logoUrl: '', category: 'Marketing', authType: 'oauth' },
  { id: 'make', name: 'Make (Integromat)', logoUrl: '', category: 'Automation', authType: 'oauth' },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    logoUrl: '',
    category: 'Communication',
    authType: 'oauth',
  },
  { id: 'miro', name: 'Miro', logoUrl: '', category: 'Design', authType: 'oauth' },
  { id: 'mixpanel', name: 'Mixpanel', logoUrl: '', category: 'Analytics', authType: 'api_key' },
  {
    id: 'monday',
    name: 'Monday.com',
    logoUrl: '',
    category: 'Project Management',
    authType: 'oauth',
  },
  { id: 'mongodb', name: 'MongoDB', logoUrl: '', category: 'Database', authType: 'api_key' },
  { id: 'netlify', name: 'Netlify', logoUrl: '', category: 'Infrastructure', authType: 'oauth' },
  { id: 'notion', name: 'Notion', logoUrl: '', category: 'Productivity', authType: 'oauth' },
  { id: 'notion-ai', name: 'Notion AI', logoUrl: '', category: 'AI', authType: 'oauth' },
  { id: 'npm', name: 'npm', logoUrl: '', category: 'Development', authType: 'api_key' },
  { id: 'okta', name: 'Okta', logoUrl: '', category: 'Security', authType: 'oauth' },
  { id: 'onedrive', name: 'OneDrive', logoUrl: '', category: 'Storage', authType: 'oauth' },
  { id: 'openai', name: 'OpenAI', logoUrl: '', category: 'AI', authType: 'api_key' },
  { id: 'outlook', name: 'Outlook', logoUrl: '', category: 'Email', authType: 'oauth' },
  { id: 'pagerduty', name: 'PagerDuty', logoUrl: '', category: 'Monitoring', authType: 'oauth' },
  { id: 'paypal', name: 'PayPal', logoUrl: '', category: 'Finance', authType: 'oauth' },
  { id: 'pinterest', name: 'Pinterest', logoUrl: '', category: 'Social Media', authType: 'oauth' },
  { id: 'pipedrive', name: 'Pipedrive', logoUrl: '', category: 'CRM', authType: 'oauth' },
  { id: 'plaid', name: 'Plaid', logoUrl: '', category: 'Finance', authType: 'api_key' },
  { id: 'postgresql', name: 'PostgreSQL', logoUrl: '', category: 'Database', authType: 'api_key' },
  { id: 'power-bi', name: 'Power BI', logoUrl: '', category: 'Analytics', authType: 'oauth' },
  { id: 'quickbooks', name: 'QuickBooks', logoUrl: '', category: 'Finance', authType: 'oauth' },
  { id: 'reddit', name: 'Reddit', logoUrl: '', category: 'Social Media', authType: 'oauth' },
  { id: 'redshift', name: 'Redshift', logoUrl: '', category: 'Database', authType: 'api_key' },
  { id: 'salesforce', name: 'Salesforce', logoUrl: '', category: 'CRM', authType: 'oauth' },
  { id: 'segment', name: 'Segment', logoUrl: '', category: 'Analytics', authType: 'api_key' },
  { id: 'sendgrid', name: 'SendGrid', logoUrl: '', category: 'Email', authType: 'api_key' },
  { id: 'sentry', name: 'Sentry', logoUrl: '', category: 'Monitoring', authType: 'oauth' },
  { id: 'shopify', name: 'Shopify', logoUrl: '', category: 'E-commerce', authType: 'oauth' },
  { id: 'slack', name: 'Slack', logoUrl: '', category: 'Communication', authType: 'oauth' },
  {
    id: 'smartsheet',
    name: 'SmartSheet',
    logoUrl: '',
    category: 'Productivity',
    authType: 'oauth',
  },
  { id: 'snowflake', name: 'Snowflake', logoUrl: '', category: 'Database', authType: 'api_key' },
  { id: 'square', name: 'Square', logoUrl: '', category: 'Finance', authType: 'oauth' },
  { id: 'stripe', name: 'Stripe', logoUrl: '', category: 'Finance', authType: 'oauth' },
  { id: 'supabase', name: 'Supabase', logoUrl: '', category: 'Database', authType: 'api_key' },
  { id: 'tableau', name: 'Tableau', logoUrl: '', category: 'Analytics', authType: 'oauth' },
  { id: 'telegram', name: 'Telegram', logoUrl: '', category: 'Communication', authType: 'api_key' },
  { id: 'tiktok', name: 'TikTok', logoUrl: '', category: 'Social Media', authType: 'oauth' },
  { id: 'todoist', name: 'Todoist', logoUrl: '', category: 'Productivity', authType: 'oauth' },
  { id: 'trello', name: 'Trello', logoUrl: '', category: 'Project Management', authType: 'oauth' },
  { id: 'twilio', name: 'Twilio', logoUrl: '', category: 'Communication', authType: 'api_key' },
  { id: 'twitter', name: 'X (Twitter)', logoUrl: '', category: 'Social Media', authType: 'oauth' },
  { id: 'typeform', name: 'Typeform', logoUrl: '', category: 'Forms', authType: 'oauth' },
  { id: 'vercel', name: 'Vercel', logoUrl: '', category: 'Infrastructure', authType: 'oauth' },
  { id: 'webflow', name: 'Webflow', logoUrl: '', category: 'Website', authType: 'oauth' },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    logoUrl: '',
    category: 'Communication',
    authType: 'api_key',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    logoUrl: '',
    category: 'E-commerce',
    authType: 'api_key',
  },
  { id: 'wordpress', name: 'WordPress', logoUrl: '', category: 'Website', authType: 'oauth' },
  { id: 'xero', name: 'Xero', logoUrl: '', category: 'Finance', authType: 'oauth' },
  { id: 'youtube', name: 'YouTube', logoUrl: '', category: 'Social Media', authType: 'google' },
  { id: 'zapier', name: 'Zapier', logoUrl: '', category: 'Automation', authType: 'oauth' },
  { id: 'zendesk', name: 'Zendesk', logoUrl: '', category: 'Support', authType: 'oauth' },
  { id: 'zoom', name: 'Zoom', logoUrl: '', category: 'Communication', authType: 'oauth' },
]
