/**
 * Skill Registry — Single Agent + Skills Architecture
 *
 * Each entry defines a capability that Snew (the single orchestrator agent) can activate.
 * Replaces the multi-agent catalog (src/data/agents.ts).
 *
 * Skills are seeded into the `skills` table per team. The code registry is the source
 * of truth for definitions; the DB tracks per-team state (active/inactive).
 */

export interface SkillDefinition {
  slug: string
  name: string
  emoji: string
  description: string
  detailedDescription: string
  category: SkillCategory
  phase: 1 | 2 | 3 | 4
  icon: string
  color: string
  dependencies: string[]
  requiredConnections: string[]
  tags: string[]
  /** True = native orchestrator capability (runs automatically) */
  isNative?: boolean
  /** Maps to a legacy agent type in the module registry (e.g. 'carrinho-conversao') */
  legacyAgentType?: string
}

export type SkillCategory =
  | 'foundation'
  | 'campaign'
  | 'content'
  | 'retention'
  | 'analytics'
  | 'ads'
  | 'operations'
  | 'scale'
  | 'cart'
  | 'social'

export const skillCategories: SkillCategory[] = [
  'foundation',
  'campaign',
  'content',
  'retention',
  'analytics',
  'ads',
  'operations',
  'scale',
  'cart',
  'social',
]

export const skillCategoryLabels: Record<SkillCategory, string> = {
  foundation: 'Foundation',
  campaign: 'Marketing & Campanhas',
  content: 'Produto & Catálogo',
  retention: 'Retenção & Churn',
  analytics: 'Analytics & Inteligência',
  ads: 'Ads & Performance',
  operations: 'Visibilidade & IA',
  scale: 'Atendimento & Experiência',
  cart: 'Carrinho & Conversão',
  social: 'Redes Sociais',
}

export const skills: SkillDefinition[] = [
  // ── Retention ────────────────────────────────────────────────
  {
    slug: 'customer-service',
    name: 'Customer Service',
    emoji: '💬',
    description:
      'Turn support into retention. Detects at-risk customers and automates personalized outreach via WhatsApp and Email.',
    detailedDescription:
      'Helps e-commerce teams improve customer relationships, reduce churn and refunds, increase LTV, and automate outreach with AI-generated messages.\n\nWhat it analyzes:\n• Delivery delays and negative sentiment signals\n• Refund risk patterns and root causes\n• Post-delivery review opportunities\n• Inactive customer segments (no repurchase in 60+ days)\n• NPS scores and customer satisfaction trends\n\nWhat actions it generates:\n• Proactive delivery delay messages (WhatsApp)\n• Post-delivery follow-up flows (WhatsApp)\n• Review request campaigns (Email/WhatsApp)\n• VIP thank-you and early access offers (Email)\n• Inactive customer winback sequences (Email)\n• Refund request recovery flows (WhatsApp)\n• Low NPS rescue outreach (WhatsApp)',
    category: 'retention',
    phase: 3,
    icon: 'headphones',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Customer Service', 'Retention', 'Automation'],
  },
  {
    slug: 'upsell-retention',
    name: 'Upsell & Retention',
    emoji: '💎',
    description:
      'Identifies cross-sell and upsell opportunities based on purchase history and browsing behavior.',
    detailedDescription:
      'Analyzes customer purchase patterns and engagement signals to surface high-probability upsell and cross-sell opportunities.\n\nWhat it analyzes:\n• Purchase history and product affinity\n• Browsing behavior and wishlist activity\n• Cart abandonment patterns\n• Customer lifetime value tiers\n\nWhat actions it generates:\n• Personalized product recommendations (Email/WhatsApp)\n• Bundle and upgrade offers for repeat buyers\n• Post-purchase upsell sequences\n• Loyalty milestone reward triggers',
    category: 'cart',
    phase: 3,
    icon: 'trending-up',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Customer Service', 'Upsell', 'Retention'],
    legacyAgentType: 'carrinho-conversao',
  },
  {
    slug: 'review-reputation',
    name: 'Review & Reputation',
    emoji: '⭐',
    description:
      'Automates review collection, monitors sentiment, and manages reputation across channels.',
    detailedDescription:
      'Proactively collects reviews from satisfied customers and monitors brand sentiment to protect and grow your reputation.\n\nWhat it analyzes:\n• Post-delivery satisfaction signals\n• Existing review sentiment and ratings\n• Social media mentions and feedback\n• Competitor review benchmarks\n\nWhat actions it generates:\n• Timed review request flows (Email/WhatsApp)\n• Negative review response drafts\n• Review incentive campaigns for low-review products\n• Reputation health reports',
    category: 'retention',
    phase: 4,
    icon: 'star',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Customer Service', 'Reviews', 'Reputation'],
  },
  {
    slug: 'churn-prediction',
    name: 'Churn Prediction',
    emoji: '🛡️',
    description:
      'Predicts which customers are likely to churn and triggers preventive actions before they leave.',
    detailedDescription:
      'Uses behavioral signals to identify customers at risk of leaving and automatically initiates retention workflows.\n\nWhat it analyzes:\n• Purchase frequency decline patterns\n• Engagement drop-off signals (email opens, site visits)\n• Support ticket sentiment trends\n• Cohort-based churn benchmarks\n\nWhat actions it generates:\n• Early warning alerts for high-value customers\n• Automated win-back sequences\n• Personalized incentive offers\n• Escalation triggers for VIP accounts',
    category: 'retention',
    phase: 3,
    icon: 'alert-triangle',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Customer Service', 'Churn', 'Prediction'],
  },
  {
    slug: 'vip-relationship',
    name: 'VIP Relationship',
    emoji: '👑',
    description:
      'Manages high-value customer relationships with personalized touchpoints and exclusive experiences.',
    detailedDescription:
      'Ensures your most valuable customers feel recognized and prioritized through automated but deeply personalized engagement.\n\nWhat it analyzes:\n• Top-tier customer spending patterns\n• Purchase anniversaries and milestones\n• Support interaction history\n• Product preferences and brand loyalty signals\n\nWhat actions it generates:\n• Personalized thank-you messages\n• Early access and exclusive offer campaigns\n• Birthday and milestone celebrations\n• Priority support routing recommendations',
    category: 'retention',
    phase: 3,
    icon: 'crown',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Customer Service', 'VIP', 'Relationship'],
  },
  {
    slug: 'sentiment-intelligence',
    name: 'Sentiment Intelligence',
    emoji: '😊',
    description:
      'Analyzes customer sentiment across all touchpoints to surface hidden risks and opportunities.',
    detailedDescription:
      'Processes customer interactions across support tickets, reviews, social media, and surveys to build a real-time sentiment map.\n\nWhat it analyzes:\n• Support ticket tone and resolution satisfaction\n• Review sentiment by product and category\n• Social media brand mentions\n• NPS and CSAT survey responses\n\nWhat actions it generates:\n• Sentiment trend reports and alerts\n• Product-level sentiment breakdowns\n• Escalation triggers for negative sentiment spikes\n• Positive sentiment amplification campaigns',
    category: 'analytics',
    phase: 3,
    icon: 'smile',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Customer Service', 'Sentiment', 'Intelligence'],
  },

  // ── Campaign ─────────────────────────────────────────────────
  {
    slug: 'conversion-optimizer',
    name: 'Conversion Optimizer',
    emoji: '🎯',
    description:
      'Identifies friction in product pages, checkout and messaging to improve conversion rate.',
    detailedDescription:
      "Continuously analyzes your store's product pages, checkout flow, and messaging to identify friction points that hurt conversion rates.\n\nWhat it analyzes:\n• Product page layout, copy, and CTA placement\n• Checkout funnel drop-off points\n• Pricing presentation and trust signals\n• Mobile vs desktop conversion gaps\n\nWhat actions it generates:\n• Prioritized list of UX improvements\n• A/B test suggestions for high-impact pages\n• Copy rewrites for underperforming CTAs\n• Checkout flow simplification recommendations",
    category: 'campaign',
    phase: 2,
    icon: 'target',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Marketing', 'Optimization', 'Automation'],
  },
  {
    slug: 'retention-booster',
    name: 'Retention Booster',
    emoji: '🛡️',
    description: 'Identifies churn risks and suggests retention flows.',
    detailedDescription:
      'Analyzes customer behavior patterns to identify at-risk customers and generate automated retention strategies.\n\nWhat it analyzes:\n• Purchase frequency and recency patterns\n• Customer engagement signals\n• Email open and click rates\n• Product return and complaint data\n\nWhat actions it generates:\n• Win-back email sequences\n• Loyalty program recommendations\n• Personalized offer strategies\n• Customer segment-specific retention flows',
    category: 'retention',
    phase: 3,
    icon: 'shield',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Marketing', 'Automation', 'Optimization'],
  },
  {
    slug: 'ad-waste-detector',
    name: 'Ad Waste Detector',
    emoji: '⚡',
    description: 'Detects inefficient ad spend and performance leaks.',
    detailedDescription:
      'Monitors your advertising campaigns across platforms to identify wasted spend and optimization opportunities.\n\nWhat it analyzes:\n• Campaign ROAS and cost per acquisition\n• Audience targeting efficiency\n• Creative fatigue and ad frequency\n• Attribution gaps and tracking issues\n\nWhat actions it generates:\n• Budget reallocation recommendations\n• Underperforming campaign pause suggestions\n• Audience refinement strategies\n• Creative refresh priorities',
    category: 'ads',
    phase: 4,
    icon: 'alert-circle',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: [],
    tags: ['Marketing', 'Optimization', 'Monitoring'],
  },
  {
    slug: 'content-engine',
    name: 'Content Engine',
    emoji: '📲',
    description:
      'Generates and schedules content ideas based on trending topics, product launches, and audience signals.',
    detailedDescription:
      'Monitors trends, competitor content, and audience engagement to generate high-impact content strategies.\n\nWhat it analyzes:\n• Trending topics in your niche\n• Competitor content performance\n• Audience engagement patterns\n• Product launch calendars\n\nWhat actions it generates:\n• Content calendar with topic suggestions\n• Email newsletter drafts\n• Social media post ideas with copy\n• Blog post outlines optimized for SEO',
    category: 'social',
    phase: 2,
    icon: 'pen-tool',
    color: '#648EE9',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Marketing', 'Content', 'Automation'],
  },
  {
    slug: 'email-performance',
    name: 'Email Performance',
    emoji: '📩',
    description:
      'Optimizes email campaigns by analyzing open rates, click-throughs, and subscriber behavior.',
    detailedDescription:
      'Continuously monitors your email marketing metrics and suggests data-driven improvements.\n\nWhat it analyzes:\n• Open rates and click-through rates by segment\n• Subject line performance patterns\n• Send time optimization\n• Unsubscribe and spam triggers\n\nWhat actions it generates:\n• Subject line A/B test suggestions\n• Segment-specific send time recommendations\n• List hygiene and re-engagement flows\n• Template performance comparisons',
    category: 'campaign',
    phase: 2,
    icon: 'mail',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: ['mailchimp'],
    tags: ['Marketing', 'Email', 'Optimization'],
  },

  // ── Analytics ────────────────────────────────────────────────
  {
    slug: 'competitor-watch',
    name: 'Competitor Watch',
    emoji: '👁️',
    description: 'Monitors competitor pricing, messaging shifts and campaign activity.',
    detailedDescription:
      "Keeps a constant eye on your competitors' digital presence, tracking changes in pricing, messaging, and advertising strategies.\n\nWhat it analyzes:\n• Competitor product pricing and promotions\n• Landing page and messaging changes\n• Ad creative and spend patterns\n• New product launches and positioning\n\nWhat actions it generates:\n• Price adjustment recommendations\n• Counter-messaging strategies\n• Opportunity alerts when competitors pull back\n• Market positioning reports",
    category: 'analytics',
    phase: 4,
    icon: 'eye',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Competitors', 'Monitoring', 'Automation'],
  },
  {
    slug: 'pricing-intelligence',
    name: 'Pricing Intelligence',
    emoji: '💰',
    description:
      'Tracks competitor pricing in real time and recommends dynamic pricing adjustments.',
    detailedDescription:
      'Monitors competitor prices across products and categories to help you stay competitive without sacrificing margin.\n\nWhat it analyzes:\n• Competitor price changes by SKU/category\n• Promotional cadence and discount depth\n• Price elasticity signals from your own data\n• Market positioning gaps\n\nWhat actions it generates:\n• Dynamic pricing recommendations\n• Promotional timing suggestions\n• Margin optimization alerts\n• Price-match opportunity flags',
    category: 'analytics',
    phase: 4,
    icon: 'dollar-sign',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Competitors', 'Pricing', 'Intelligence'],
  },
  {
    slug: 'market-gap-finder',
    name: 'Market Gap Finder',
    emoji: '🧭',
    description:
      'Identifies underserved niches and product gaps by analyzing competitor catalogs and demand signals.',
    detailedDescription:
      'Scans competitor product catalogs, customer search behavior, and market trends to surface unmet demand.\n\nWhat it analyzes:\n• Competitor product catalog coverage\n• Search demand vs available supply\n• Customer review complaints about missing features\n• Trending categories and emerging niches\n\nWhat actions it generates:\n• Product opportunity reports\n• Category expansion recommendations\n• Feature gap analysis for existing products\n• Demand forecasts for new opportunities',
    category: 'analytics',
    phase: 4,
    icon: 'compass',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Competitors', 'Market', 'Opportunities'],
  },
  {
    slug: 'share-of-voice',
    name: 'Share of Voice Tracker',
    emoji: '📊',
    description:
      'Measures your brand visibility vs competitors across search, social, and paid channels.',
    detailedDescription:
      'Benchmarks your brand presence against competitors across digital channels.\n\nWhat it analyzes:\n• Organic search visibility and rankings\n• Paid ad impression share\n• Social media mention volume\n• Content reach and engagement comparison\n\nWhat actions it generates:\n• Channel-specific visibility gap reports\n• Content and SEO priority recommendations\n• Ad spend allocation suggestions\n• Brand awareness campaign triggers',
    category: 'analytics',
    phase: 4,
    icon: 'bar-chart-2',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Competitors', 'Brand', 'Monitoring'],
  },
  {
    slug: 'revenue-intelligence',
    name: 'Revenue Intelligence',
    emoji: '📈',
    description: 'Analyzes revenue signals and prioritizes growth opportunities.',
    detailedDescription:
      'Aggregates data from multiple sources to surface actionable revenue insights and growth opportunities.\n\nWhat it analyzes:\n• Revenue trends by product, channel, and segment\n• Customer acquisition cost and payback periods\n• Seasonal patterns and demand forecasting\n• Cross-sell and upsell opportunities\n\nWhat actions it generates:\n• Revenue growth playbooks\n• Budget reallocation recommendations\n• Product bundling strategies\n• Channel optimization priorities',
    category: 'analytics',
    phase: 3,
    icon: 'trending-up',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Revenue', 'Growth'],
  },
  {
    slug: 'cohort-analyzer',
    name: 'Cohort Analyzer',
    emoji: '👥',
    description:
      'Breaks down customer behavior by acquisition cohort to reveal retention and spending patterns.',
    detailedDescription:
      'Segments customers by when they were acquired and tracks their behavior over time.\n\nWhat it analyzes:\n• Retention curves by acquisition month\n• Revenue per cohort over time\n• Channel-specific cohort quality\n• Seasonal acquisition impact\n\nWhat actions it generates:\n• Cohort health scorecards\n• Acquisition channel quality rankings\n• Retention improvement recommendations by cohort\n• LTV projections for recent cohorts',
    category: 'analytics',
    phase: 3,
    icon: 'users',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Cohorts', 'Retention'],
  },
  {
    slug: 'funnel-diagnostics',
    name: 'Funnel Diagnostics',
    emoji: '🔍',
    description: 'Pinpoints exactly where customers drop off in your conversion funnel and why.',
    detailedDescription:
      'Maps your entire customer journey from first visit to purchase and identifies the biggest leaks.\n\nWhat it analyzes:\n• Step-by-step funnel conversion rates\n• Drop-off patterns by device, segment, and source\n• Page-level engagement metrics\n• Checkout friction indicators\n\nWhat actions it generates:\n• Prioritized leak-fix recommendations\n• A/B test hypotheses for high-drop steps\n• Device-specific optimization tasks\n• Funnel benchmark comparisons',
    category: 'analytics',
    phase: 3,
    icon: 'filter',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Funnel', 'Optimization'],
  },
  {
    slug: 'attribution-mapper',
    name: 'Attribution Mapper',
    emoji: '🗺️',
    description:
      'Maps the real impact of each marketing channel on revenue using multi-touch attribution models.',
    detailedDescription:
      'Goes beyond last-click to show which channels truly drive revenue.\n\nWhat it analyzes:\n• Multi-touch customer journeys\n• Channel assist and conversion roles\n• Time-to-conversion by channel\n• Incremental lift per channel\n\nWhat actions it generates:\n• Channel-level ROI scorecards\n• Budget reallocation recommendations\n• Undervalued channel alerts\n• Attribution model comparison reports',
    category: 'analytics',
    phase: 3,
    icon: 'git-branch',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Analytics', 'Attribution', 'Channels'],
  },

  // ── Operations ───────────────────────────────────────────────
  {
    slug: 'store-audit-scanner',
    name: 'Store Audit Scanner',
    emoji: '🔎',
    description: 'Scans your store for UX issues, performance bottlenecks and SEO gaps.',
    detailedDescription:
      'Performs comprehensive audits of your e-commerce store, identifying technical and UX issues that impact performance.\n\nWhat it analyzes:\n• Page load speed and Core Web Vitals\n• SEO meta tags, structured data, and indexing\n• Mobile responsiveness and usability\n• Broken links and 404 errors\n\nWhat actions it generates:\n• Prioritized fix list by impact severity\n• SEO optimization recommendations\n• Performance improvement tasks\n• Accessibility compliance checklist',
    category: 'operations',
    phase: 4,
    icon: 'search',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Audit', 'SEO', 'Performance'],
  },
  {
    slug: 'checkout-auditor',
    name: 'Checkout Auditor',
    emoji: '✅',
    description: 'Audits the checkout flow for friction, trust gaps, and abandonment triggers.',
    detailedDescription:
      'Focuses specifically on the purchase completion experience to maximize checkout conversion.\n\nWhat it analyzes:\n• Payment method availability and failure rates\n• Shipping cost and time presentation\n• Trust signal placement (security badges, policies)\n• Form field friction and error rates\n\nWhat actions it generates:\n• Checkout simplification recommendations\n• Payment method optimization suggestions\n• Trust signal placement improvements\n• Shipping transparency enhancements',
    category: 'operations',
    phase: 4,
    icon: 'shopping-cart',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Audit', 'Checkout', 'Optimization'],
  },
  {
    slug: 'data-quality-guard',
    name: 'Data Quality Guard',
    emoji: '🔒',
    description:
      'Validates tracking, tagging, and data integrity across your analytics and ad platforms.',
    detailedDescription:
      'Ensures your data infrastructure is accurate and complete so decisions are based on trustworthy numbers.\n\nWhat it analyzes:\n• Analytics tracking code implementation\n• Conversion pixel accuracy\n• UTM parameter consistency\n• Data discrepancies between platforms\n\nWhat actions it generates:\n• Tracking error alerts and fixes\n• Tag audit reports\n• Data reconciliation recommendations\n• Implementation checklists for new campaigns',
    category: 'operations',
    phase: 4,
    icon: 'shield-check',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: [],
    tags: ['Audit', 'Data', 'Quality'],
  },
  {
    slug: 'compliance-scanner',
    name: 'Compliance Scanner',
    emoji: '✅',
    description: 'Checks your store for legal, privacy, and accessibility compliance issues.',
    detailedDescription:
      'Reviews your store against privacy regulations, accessibility standards, and legal requirements.\n\nWhat it analyzes:\n• GDPR and LGPD consent mechanisms\n• Cookie policy and tracking disclosure\n• Accessibility (WCAG) compliance\n• Terms, privacy policy, and refund policy completeness\n\nWhat actions it generates:\n• Compliance gap reports\n• Cookie consent implementation tasks\n• Accessibility fix priorities\n• Policy template recommendations',
    category: 'operations',
    phase: 4,
    icon: 'check-circle',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Audit', 'Compliance', 'Privacy'],
  },
  {
    slug: 'task-prioritizer',
    name: 'Task Prioritizer',
    emoji: '📋',
    description:
      'Ranks your backlog by estimated revenue impact so you always work on what matters most.',
    detailedDescription:
      'Scores and ranks your optimization backlog based on estimated revenue impact and implementation effort.\n\nWhat it analyzes:\n• Pending tasks and their expected outcomes\n• Historical impact of similar changes\n• Implementation complexity and dependencies\n• Current performance bottlenecks\n\nWhat actions it generates:\n• Impact-ranked task lists\n• Quick-win identification\n• Resource allocation recommendations\n• Weekly focus area suggestions',
    category: 'operations',
    phase: 3,
    icon: 'list-ordered',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Productivity', 'Prioritization', 'Efficiency'],
  },
  {
    slug: 'weekly-briefing',
    name: 'Weekly Briefing',
    emoji: '📰',
    description:
      'Generates a concise weekly summary of key changes, risks, and opportunities across your store.',
    detailedDescription:
      'Compiles the most important signals from all your data sources into a digestible weekly report.\n\nWhat it analyzes:\n• Week-over-week metric changes\n• New signals and emerging risks\n• Automation performance results\n• Competitor activity summary\n\nWhat actions it generates:\n• Executive summary with key takeaways\n• Top 3 actions for the coming week\n• Risk alerts requiring attention\n• Win celebrations and progress tracking',
    category: 'operations',
    phase: 3,
    icon: 'file-text',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Productivity', 'Reporting', 'Automation'],
  },
  {
    slug: 'workflow-automator',
    name: 'Workflow Automator',
    emoji: '⚙️',
    description: 'Connects your tools and automates repetitive operational tasks across platforms.',
    detailedDescription:
      'Identifies repetitive manual tasks and creates automated workflows to save time.\n\nWhat it analyzes:\n• Repetitive manual processes\n• Cross-platform data transfer needs\n• Notification and alert patterns\n• Reporting cadence requirements\n\nWhat actions it generates:\n• Automated workflow suggestions\n• Cross-platform sync configurations\n• Alert and notification rules\n• Scheduled report setups',
    category: 'operations',
    phase: 3,
    icon: 'zap',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: [],
    tags: ['Productivity', 'Workflow', 'Automation'],
  },
  {
    slug: 'inventory-alerts',
    name: 'Inventory Alerts',
    emoji: '📦',
    description:
      'Monitors stock levels and velocity to prevent stockouts and overstock situations.',
    detailedDescription:
      'Tracks product stock levels against sales velocity to ensure optimal inventory management.\n\nWhat it analyzes:\n• Current stock levels vs sales velocity\n• Seasonal demand patterns\n• Supplier lead times\n• Overstock and slow-moving inventory\n\nWhat actions it generates:\n• Restock alerts before stockouts\n• Overstock markdown recommendations\n• Demand forecast updates\n• Supplier order timing suggestions',
    category: 'operations',
    phase: 3,
    icon: 'package',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Productivity', 'Inventory', 'Alerts'],
  },

  // ── Foundation (Phase 1 — to be implemented) ─────────────────
  // These are placeholder definitions for Fase 1 skills.
  // They will be fully implemented in the 038+ branches.
  {
    slug: 'brand-dna',
    name: 'Brand DNA',
    emoji: '✨',
    description:
      'Analyzes your store URL, catalog, and social media to extract brand identity, tone of voice, and positioning. Feeds all other skills.',
    detailedDescription:
      'The foundational capability that makes everything on-brand. Extracts visual identity (palette, typography, photography style), voice & tone (words to use/avoid, CTA style, emoji policy), audience profile, and market positioning from your store and social presence.\n\nRuns automatically when you connect your store. All generation skills (Copywriter, Content Engine, Campaign Generator) use Brand DNA as their quality filter.',
    category: 'foundation',
    phase: 1,
    icon: 'fingerprint',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Foundation', 'Brand', 'Identity'],
    isNative: true,
  },
  {
    slug: 'copywriter',
    name: 'Copywriter',
    emoji: '✍️',
    description:
      'Generates on-brand copy for any channel (email, WhatsApp, SMS, ads, social, push) using Brand DNA as quality filter.',
    detailedDescription:
      'The most fundamental generation skill. Takes a briefing and produces messaging central + channel-specific copies that respect your brand voice, vocabulary limits, and channel constraints (SMS 160 chars, push 100 chars).\n\nGenerates 12-15 copies per briefing across all channels. Supports A/B subject line variations. Every copy passes through the Brand DNA filter before output.',
    category: 'campaign',
    phase: 1,
    icon: 'pen-line',
    color: '#D7733E',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Campaign', 'Copy', 'Content'],
  },
  {
    slug: 'seasonal-calendar',
    name: 'Seasonal Calendar',
    emoji: '📅',
    description:
      'Maps 30+ seasonal dates relevant to your niche, generates briefings at D-60, and triggers the Copywriter for each campaign.',
    detailedDescription:
      'Analyzes your catalog and sales history to infer your niche, then maps 30+ seasonal dates (general + niche-specific) ranked by revenue potential. Generates campaign briefings automatically 60 days before each date, with progressive alerts at D-45, D-30, and D-15.\n\nConnects to the Copywriter to generate campaign copies for each briefing. The "wow moment" of the product — connect your store and see your entire year planned in seconds.',
    category: 'campaign',
    phase: 1,
    icon: 'calendar',
    color: '#D7733E',
    dependencies: ['brand-dna', 'copywriter'],
    requiredConnections: ['nuvemshop'],
    tags: ['Campaign', 'Calendar', 'Seasonal'],
  },

  // ── New skills: Campaign ──────────────────────────────────────
  {
    slug: 'email-sequencer',
    name: 'Email Sequencer',
    emoji: '📩',
    description:
      'Builds multi-step email sequences triggered by customer behavior for automated nurturing and conversion.',
    detailedDescription:
      'Creates intelligent email sequences that adapt to customer actions and guide them through the purchase journey.\n\nWhat it analyzes:\n• Customer lifecycle stage and behavior\n• Email engagement history\n• Purchase intent signals\n• Segment-level conversion patterns\n\nWhat actions it generates:\n• Onboarding email sequences for new subscribers\n• Abandoned cart follow-up chains\n• Post-purchase nurture flows\n• Re-engagement sequences for inactive contacts',
    category: 'campaign',
    phase: 2,
    icon: 'mail',
    color: '#D7733E',
    dependencies: ['brand-dna'],
    requiredConnections: ['mailchimp'],
    tags: ['Campaign', 'Email', 'Automation'],
  },
  {
    slug: 'sms-scheduler',
    name: 'SMS Scheduler',
    emoji: '💬',
    description:
      'Plans and sends targeted SMS campaigns at the optimal time for each customer segment.',
    detailedDescription:
      'Maximizes SMS engagement by sending the right message to the right customer at the right moment.\n\nWhat it analyzes:\n• Customer time zone and engagement windows\n• SMS open and conversion history\n• Segment purchase readiness signals\n• Opt-in and compliance status\n\nWhat actions it generates:\n• Promotional SMS blasts with optimal send times\n• Transactional SMS for order and shipping updates\n• Restock and flash sale alerts\n• Birthday and loyalty milestone messages',
    category: 'campaign',
    phase: 2,
    icon: 'message-square',
    color: '#D7733E',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Campaign', 'SMS', 'Automation'],
  },

  // ── New skills: Social ────────────────────────────────────────
  {
    slug: 'hashtag-generator',
    name: 'Hashtag Generator',
    emoji: '#️⃣',
    description:
      'Generates optimized hashtag sets for each post to maximize organic reach on Instagram and TikTok.',
    detailedDescription:
      'Analyzes your niche, content, and platform trends to recommend hashtags that drive discovery.\n\nWhat it analyzes:\n• Content topic and visual theme\n• Platform-specific hashtag performance\n• Niche vs broad hashtag mix\n• Competitor hashtag strategies\n\nWhat actions it generates:\n• Curated hashtag sets by post type\n• Trending hashtag alerts for your niche\n• Hashtag performance reports\n• Rotation strategies to avoid shadowbanning',
    category: 'social',
    phase: 2,
    icon: 'hash',
    color: '#648EE9',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Social', 'Hashtags', 'Reach'],
  },
  {
    slug: 'influencer-finder',
    name: 'Influencer Finder',
    emoji: '🤝',
    description:
      'Identifies micro and macro influencers in your niche with authentic engagement metrics.',
    detailedDescription:
      'Surfaces influencer partnerships that align with your brand values and audience demographics.\n\nWhat it analyzes:\n• Influencer audience overlap with your customers\n• Engagement rate and authenticity signals\n• Content style alignment with brand DNA\n• Past partnership performance benchmarks\n\nWhat actions it generates:\n• Ranked influencer shortlists by fit score\n• Outreach message templates\n• Partnership brief suggestions\n• ROI estimation per influencer tier',
    category: 'social',
    phase: 3,
    icon: 'users',
    color: '#648EE9',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Social', 'Influencer', 'Partnerships'],
  },

  // ── New skills: Cart ──────────────────────────────────────────
  {
    slug: 'upsell-recommender',
    name: 'Upsell Recommender',
    emoji: '💎',
    description:
      'Suggests personalized upsell and cross-sell products at the right moment in the purchase journey.',
    detailedDescription:
      'Uses purchase history and real-time cart data to surface the most relevant upgrade and add-on recommendations.\n\nWhat it analyzes:\n• Current cart contents and customer history\n• Product affinity and co-purchase patterns\n• Price sensitivity by customer tier\n• Inventory availability and margin optimization\n\nWhat actions it generates:\n• Real-time product recommendation widgets\n• Post-purchase upsell email sequences\n• Bundle offer suggestions\n• Threshold-based free shipping incentives',
    category: 'cart',
    phase: 2,
    icon: 'trending-up',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Cart', 'Upsell', 'Revenue'],
  },
  {
    slug: 'checkout-optimizer',
    name: 'Checkout Optimizer',
    emoji: '🛒',
    description:
      'Reduces checkout abandonment by identifying and fixing friction points in real time.',
    detailedDescription:
      'Continuously monitors checkout flow metrics to surface and resolve conversion-killing friction.\n\nWhat it analyzes:\n• Step-by-step checkout drop-off rates\n• Payment failure patterns\n• Form field completion issues\n• Device and browser-specific failures\n\nWhat actions it generates:\n• Friction point fix recommendations\n• Payment method expansion suggestions\n• Guest checkout optimization tasks\n• Mobile checkout improvement priorities',
    category: 'cart',
    phase: 2,
    icon: 'shopping-cart',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Cart', 'Checkout', 'Conversion'],
  },

  // ── New skills: Analytics ─────────────────────────────────────
  {
    slug: 'segment-builder',
    name: 'Segment Builder',
    emoji: '📊',
    description:
      'Creates dynamic customer segments based on behavior, purchase history, and engagement signals.',
    detailedDescription:
      'Builds precise audience segments that power personalized campaigns and retention flows.\n\nWhat it analyzes:\n• RFM (Recency, Frequency, Monetary) scores\n• Behavioral tags from site and email interactions\n• Product category affinity\n• Lifecycle stage and risk indicators\n\nWhat actions it generates:\n• Named segment definitions with criteria\n• Segment size and revenue potential estimates\n• Campaign targeting recommendations per segment\n• Automated segment refresh schedules',
    category: 'analytics',
    phase: 2,
    icon: 'pie-chart',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Segments', 'Personalization'],
  },
]
