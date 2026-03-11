export interface Coworker {
  id: string
  name: string
  category: CoworkerCategory
  emoji: string
  description: string
  tools: string[]
  tags: string[]
}

export type CoworkerCategory =
  | 'Customer Service'
  | 'Marketing'
  | 'Competitors'
  | 'Analytics'
  | 'Audit'
  | 'Productivity'

export const coworkerCategories: CoworkerCategory[] = [
  'Customer Service',
  'Marketing',
  'Competitors',
  'Analytics',
  'Audit',
  'Productivity',
]

export const categoryDescriptions: Record<CoworkerCategory, string> = {
  'Customer Service': 'Retain customers, reduce refunds, and automate outreach.',
  Marketing: 'Optimize campaigns, content, and conversion flows.',
  Competitors: 'Track competitor moves, pricing, and market gaps.',
  Analytics: 'Understand revenue, cohorts, funnels, and attribution.',
  Audit: 'Scan for UX, performance, compliance, and data issues.',
  Productivity: 'Automate operations, prioritize tasks, and stay informed.',
}

export const categoryEmojis: Record<CoworkerCategory, string> = {
  'Customer Service': '\u{1F4AC}',
  Marketing: '\u{1F4E3}',
  Competitors: '\u{1F52D}',
  Analytics: '\u{1F4CA}',
  Audit: '\u{1F50D}',
  Productivity: '\u{26A1}',
}

export const coworkerCatalog: Coworker[] = [
  // ── Customer Service ──────────────────────────────────────────
  {
    id: 'customer-service',
    name: 'Customer Service',
    category: 'Customer Service',
    emoji: '\u{1F4AC}',
    description:
      'Turn support into retention. Detects at-risk customers and automates personalized outreach.',
    tools: ['Shopify', 'Gmail', 'Web Search'],
    tags: ['Retention', 'Automation', 'Outreach'],
  },
  {
    id: 'upsell-retention',
    name: 'Upsell & Retention',
    category: 'Customer Service',
    emoji: '\u{1F3AF}',
    description:
      'Identifies cross-sell and upsell opportunities based on purchase history and behavior.',
    tools: ['Shopify', 'Gmail'],
    tags: ['Upsell', 'Retention', 'LTV'],
  },
  {
    id: 'review-reputation',
    name: 'Review & Reputation',
    category: 'Customer Service',
    emoji: '\u2B50',
    description:
      'Automates review collection, monitors sentiment, and manages reputation across channels.',
    tools: ['Shopify', 'Gmail', 'Web Search'],
    tags: ['Reviews', 'Reputation', 'Sentiment'],
  },
  {
    id: 'churn-prediction',
    name: 'Churn Prediction',
    category: 'Customer Service',
    emoji: '\u{1F4C9}',
    description: 'Predicts which customers are likely to churn and triggers preventive actions.',
    tools: ['Shopify', 'Gmail', 'Google Analytics'],
    tags: ['Churn', 'Prediction', 'Prevention'],
  },
  {
    id: 'vip-relationship',
    name: 'VIP Relationship',
    category: 'Customer Service',
    emoji: '\u{1F451}',
    description: 'Manages high-value customer relationships with personalized touchpoints.',
    tools: ['Shopify', 'Gmail'],
    tags: ['VIP', 'Relationship', 'Loyalty'],
  },
  {
    id: 'sentiment-intelligence',
    name: 'Sentiment Intelligence',
    category: 'Customer Service',
    emoji: '\u{1F9E0}',
    description: 'Analyzes customer sentiment across all touchpoints to surface hidden risks.',
    tools: ['Web Search', 'Gmail', 'Google Analytics'],
    tags: ['Sentiment', 'Intelligence', 'NPS'],
  },

  // ── Marketing ─────────────────────────────────────────────────
  {
    id: 'conversion-optimizer',
    name: 'Conversion Optimizer',
    category: 'Marketing',
    emoji: '\u{1F4C8}',
    description: 'Identifies friction in product pages and checkout to improve conversion rate.',
    tools: ['Shopify', 'Web Search', 'Google Analytics'],
    tags: ['Conversion', 'CRO', 'Optimization'],
  },
  {
    id: 'retention-booster',
    name: 'Retention Booster',
    category: 'Marketing',
    emoji: '\u{1F504}',
    description: 'Identifies churn risks and triggers automated retention flows.',
    tools: ['Shopify', 'Gmail', 'Google Analytics'],
    tags: ['Retention', 'Automation', 'Email'],
  },
  {
    id: 'ad-waste-detector',
    name: 'Ad Waste Detector',
    category: 'Marketing',
    emoji: '\u{1F6A8}',
    description: 'Detects inefficient ad spend and performance leaks across campaigns.',
    tools: ['Meta Ads', 'Google Analytics'],
    tags: ['Ads', 'ROAS', 'Optimization'],
  },
  {
    id: 'content-engine',
    name: 'Content Engine',
    category: 'Marketing',
    emoji: '\u270D\uFE0F',
    description:
      'Generates and schedules content ideas based on trending topics and audience signals.',
    tools: ['Web Search', 'Gmail', 'Google Analytics'],
    tags: ['Content', 'SEO', 'Social'],
  },
  {
    id: 'email-performance',
    name: 'Email Performance',
    category: 'Marketing',
    emoji: '\u{1F4E7}',
    description: 'Optimizes email campaigns by analyzing open rates and subscriber behavior.',
    tools: ['Gmail', 'Google Analytics', 'Shopify'],
    tags: ['Email', 'Campaigns', 'Engagement'],
  },

  // ── Competitors ───────────────────────────────────────────────
  {
    id: 'competitor-watch',
    name: 'Competitor Watch',
    category: 'Competitors',
    emoji: '\u{1F441}',
    description: 'Monitors competitor pricing, messaging shifts, and campaign activity.',
    tools: ['Web Search', 'Meta Ads', 'Google Analytics'],
    tags: ['Competitors', 'Monitoring', 'Alerts'],
  },
  {
    id: 'pricing-intelligence',
    name: 'Pricing Intelligence',
    category: 'Competitors',
    emoji: '\u{1F4B0}',
    description: 'Tracks competitor pricing in real time and recommends adjustments.',
    tools: ['Web Search', 'Shopify'],
    tags: ['Pricing', 'Intelligence', 'Margin'],
  },
  {
    id: 'market-gap-finder',
    name: 'Market Gap Finder',
    category: 'Competitors',
    emoji: '\u{1F5FA}',
    description: 'Identifies underserved niches and product gaps by analyzing competitor catalogs.',
    tools: ['Web Search', 'Google Analytics', 'Shopify'],
    tags: ['Market', 'Opportunities', 'Products'],
  },
  {
    id: 'share-of-voice',
    name: 'Share of Voice',
    category: 'Competitors',
    emoji: '\u{1F4E1}',
    description:
      'Measures your brand visibility vs competitors across search, social, and paid channels.',
    tools: ['Web Search', 'Meta Ads', 'Google Analytics'],
    tags: ['Brand', 'Visibility', 'Benchmarks'],
  },

  // ── Analytics ─────────────────────────────────────────────────
  {
    id: 'revenue-intelligence',
    name: 'Revenue Intelligence',
    category: 'Analytics',
    emoji: '\u{1F4B9}',
    description: 'Analyzes revenue signals and prioritizes growth opportunities.',
    tools: ['Shopify', 'Google Analytics'],
    tags: ['Revenue', 'Growth', 'Forecasting'],
  },
  {
    id: 'cohort-analyzer',
    name: 'Cohort Analyzer',
    category: 'Analytics',
    emoji: '\u{1F9E9}',
    description:
      'Breaks down customer behavior by acquisition cohort to reveal retention patterns.',
    tools: ['Shopify', 'Google Analytics'],
    tags: ['Cohorts', 'Retention', 'LTV'],
  },
  {
    id: 'funnel-diagnostics',
    name: 'Funnel Diagnostics',
    category: 'Analytics',
    emoji: '\u{1F52C}',
    description: 'Pinpoints exactly where customers drop off in your conversion funnel and why.',
    tools: ['Shopify', 'Google Analytics'],
    tags: ['Funnel', 'Drop-off', 'UX'],
  },
  {
    id: 'attribution-mapper',
    name: 'Attribution Mapper',
    category: 'Analytics',
    emoji: '\u{1F5C2}',
    description: 'Maps revenue attribution across channels to identify true ROI drivers.',
    tools: ['Meta Ads', 'Google Analytics', 'Shopify'],
    tags: ['Attribution', 'ROI', 'Channels'],
  },

  // ── Audit ─────────────────────────────────────────────────────
  {
    id: 'store-audit-scanner',
    name: 'Store Audit Scanner',
    category: 'Audit',
    emoji: '\u{1F3EA}',
    description: 'Full store health check covering UX, speed, SEO, and conversion blockers.',
    tools: ['Shopify', 'Web Search', 'Google Analytics'],
    tags: ['Audit', 'UX', 'Performance'],
  },
  {
    id: 'checkout-auditor',
    name: 'Checkout Auditor',
    category: 'Audit',
    emoji: '\u{1F6D2}',
    description: 'Deep-dives into checkout friction, trust signals, and payment UX.',
    tools: ['Shopify', 'Google Analytics'],
    tags: ['Checkout', 'Friction', 'Conversion'],
  },
  {
    id: 'data-quality-guard',
    name: 'Data Quality Guard',
    category: 'Audit',
    emoji: '\u{1F6E1}',
    description: 'Detects tracking gaps, data inconsistencies, and attribution errors.',
    tools: ['Google Analytics', 'Shopify'],
    tags: ['Data', 'Quality', 'Tracking'],
  },
  {
    id: 'compliance-scanner',
    name: 'Compliance Scanner',
    category: 'Audit',
    emoji: '\u{1F4CB}',
    description: 'Scans for GDPR, CCPA, and platform policy compliance issues.',
    tools: ['Web Search', 'Shopify'],
    tags: ['Compliance', 'GDPR', 'Legal'],
  },

  // ── Productivity ──────────────────────────────────────────────
  {
    id: 'task-prioritizer',
    name: 'Task Prioritizer',
    category: 'Productivity',
    emoji: '\u2705',
    description: 'Surfaces and ranks the highest-impact actions across all agents.',
    tools: ['Web Search', 'Gmail'],
    tags: ['Tasks', 'Prioritization', 'Focus'],
  },
  {
    id: 'weekly-briefing',
    name: 'Weekly Briefing',
    category: 'Productivity',
    emoji: '\u{1F4F0}',
    description: 'Delivers a curated weekly summary of store performance and key actions.',
    tools: ['Shopify', 'Gmail', 'Google Analytics'],
    tags: ['Reports', 'Summary', 'Automation'],
  },
  {
    id: 'workflow-automator',
    name: 'Workflow Automator',
    category: 'Productivity',
    emoji: '\u2699\uFE0F',
    description: 'Builds and automates cross-tool workflows triggered by store events.',
    tools: ['Shopify', 'Gmail', 'Web Search'],
    tags: ['Automation', 'Workflows', 'Triggers'],
  },
  {
    id: 'inventory-alerts',
    name: 'Inventory Alerts',
    category: 'Productivity',
    emoji: '\u{1F4E6}',
    description: 'Monitors stock levels and triggers reorder alerts before stockouts.',
    tools: ['Shopify'],
    tags: ['Inventory', 'Alerts', 'Operations'],
  },
]
