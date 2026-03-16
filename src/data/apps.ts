export interface AppIntegration {
  id: string
  name: string
  emoji: string
  logoUrl?: string
  category?: string
  description: string
  connected: boolean
  authType?: 'oauth' | 'api_key' | 'none'
  isNative?: boolean
}

export const apps: AppIntegration[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    emoji: '\u{1F6D2}',
    description: 'E-commerce platform for orders, products, and customers.',
    connected: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    emoji: '\u{1F4E7}',
    description: 'Email campaigns, notifications, and customer communication.',
    connected: true,
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    emoji: '\u{1F4CA}',
    description: 'Website traffic, conversion tracking, and audience insights.',
    connected: true,
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    emoji: '\u{1F4E3}',
    description: 'Facebook and Instagram advertising campaigns and reporting.',
    connected: true,
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    emoji: '\u{1F50D}',
    description: 'Search and display advertising campaigns.',
    connected: false,
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    emoji: '\u{1F4E8}',
    description: 'Email and SMS marketing automation platform.',
    connected: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    emoji: '\u{1F4AC}',
    description: 'Team messaging, alerts, and workflow notifications.',
    connected: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    emoji: '\u{1F4DD}',
    description: 'Knowledge base, documentation, and project management.',
    connected: false,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    emoji: '\u{1F4CB}',
    description: 'Spreadsheet-database hybrid for structured data management.',
    connected: false,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    emoji: '\u{1F4B3}',
    description: 'Payment processing, subscriptions, and financial reporting.',
    connected: false,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    emoji: '\u{1F4D8}',
    description: 'CRM, marketing automation, and sales pipeline management.',
    connected: false,
  },
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business',
    emoji: '\u{1F4F1}',
    description: 'Customer messaging, automated responses, and broadcast lists.',
    connected: true,
  },
]
