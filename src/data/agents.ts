export interface Agent {
  id: string
  name: string
  category: AgentCategory
  description: string
  detailedDescription: string
  tools: string[]
  tags: string[]
  /** Maps to an installable agent type in the module registry (e.g. 'carrinho-conversao') */
  agentType?: string
}

export type AgentCategory =
  | 'All'
  | 'Customer Service'
  | 'Marketing'
  | 'Competitors'
  | 'Analytics'
  | 'Audit'
  | 'Productivity'

export const agentCategories: AgentCategory[] = [
  'All',
  'Customer Service',
  'Marketing',
  'Competitors',
  'Analytics',
  'Audit',
  'Productivity',
]

export const agents: Agent[] = [
  // ── Customer Service ──────────────────────────────────────────
  {
    id: 'customer-service',
    name: 'Customer Service Agent',
    category: 'Customer Service',
    description:
      'Turn support into retention. Detects at-risk customers and automates personalized outreach via WhatsApp and Email.',
    detailedDescription:
      'The Customer Service Agent helps e-commerce teams improve customer relationships, reduce churn and refunds, increase LTV, and automate outreach with AI-generated messages.\n\nWhat it analyzes:\n• Delivery delays and negative sentiment signals\n• Refund risk patterns and root causes\n• Post-delivery review opportunities\n• Inactive customer segments (no repurchase in 60+ days)\n• NPS scores and customer satisfaction trends\n\nWhat actions it generates:\n• Proactive delivery delay messages (WhatsApp)\n• Post-delivery follow-up flows (WhatsApp)\n• Review request campaigns (Email/WhatsApp)\n• VIP thank-you and early access offers (Email)\n• Inactive customer winback sequences (Email)\n• Refund request recovery flows (WhatsApp)\n• Low NPS rescue outreach (WhatsApp)\n\nExpected outcomes:\n• 20-35% reduction in refund rate\n• 15-25% increase in repeat purchase rate\n• Higher NPS and customer satisfaction\n• Estimated LTV uplift of 12-18%',
    tools: ['Shopify', 'Gmail', 'Web Search'],
    tags: ['Customer Service', 'Retention', 'Automation'],
  },
  {
    id: 'upsell-retention',
    name: 'Upsell & Retention Agent',
    category: 'Customer Service',
    description:
      'Identifies cross-sell and upsell opportunities based on purchase history and browsing behavior.',
    detailedDescription:
      'The Upsell & Retention Agent analyzes customer purchase patterns and engagement signals to surface high-probability upsell and cross-sell opportunities.\n\nWhat it analyzes:\n• Purchase history and product affinity\n• Browsing behavior and wishlist activity\n• Cart abandonment patterns\n• Customer lifetime value tiers\n\nWhat actions it generates:\n• Personalized product recommendations (Email/WhatsApp)\n• Bundle and upgrade offers for repeat buyers\n• Post-purchase upsell sequences\n• Loyalty milestone reward triggers\n\nExpected outcomes:\n• 15-30% increase in average order value\n• Higher repeat purchase frequency\n• Improved customer lifetime value',
    tools: ['Shopify', 'Gmail', 'Web Search'],
    tags: ['Customer Service', 'Upsell', 'Retention'],
    agentType: 'carrinho-conversao',
  },
  {
    id: 'review-reputation',
    name: 'Review & Reputation Agent',
    category: 'Customer Service',
    description:
      'Automates review collection, monitors sentiment, and manages reputation across channels.',
    detailedDescription:
      'The Review & Reputation Agent proactively collects reviews from satisfied customers and monitors brand sentiment to protect and grow your reputation.\n\nWhat it analyzes:\n• Post-delivery satisfaction signals\n• Existing review sentiment and ratings\n• Social media mentions and feedback\n• Competitor review benchmarks\n\nWhat actions it generates:\n• Timed review request flows (Email/WhatsApp)\n• Negative review response drafts\n• Review incentive campaigns for low-review products\n• Reputation health reports\n\nExpected outcomes:\n• 40-60% increase in review volume\n• Higher average star rating\n• Faster response to negative feedback',
    tools: ['Shopify', 'Gmail', 'Web Search'],
    tags: ['Customer Service', 'Reviews', 'Reputation'],
  },
  {
    id: 'churn-prediction',
    name: 'Churn Prediction Agent',
    category: 'Customer Service',
    description:
      'Predicts which customers are likely to churn and triggers preventive actions before they leave.',
    detailedDescription:
      'The Churn Prediction Agent uses behavioral signals to identify customers at risk of leaving and automatically initiates retention workflows.\n\nWhat it analyzes:\n• Purchase frequency decline patterns\n• Engagement drop-off signals (email opens, site visits)\n• Support ticket sentiment trends\n• Cohort-based churn benchmarks\n\nWhat actions it generates:\n• Early warning alerts for high-value customers\n• Automated win-back sequences\n• Personalized incentive offers\n• Escalation triggers for VIP accounts\n\nExpected outcomes:\n• 25-40% reduction in preventable churn\n• Earlier intervention on at-risk accounts\n• Data-driven retention budget allocation',
    tools: ['Shopify', 'Gmail', 'Google Analytics'],
    tags: ['Customer Service', 'Churn', 'Prediction'],
  },
  {
    id: 'vip-relationship',
    name: 'VIP Relationship Agent',
    category: 'Customer Service',
    description:
      'Manages high-value customer relationships with personalized touchpoints and exclusive experiences.',
    detailedDescription:
      'The VIP Relationship Agent ensures your most valuable customers feel recognized and prioritized through automated but deeply personalized engagement.\n\nWhat it analyzes:\n• Top-tier customer spending patterns\n• Purchase anniversaries and milestones\n• Support interaction history\n• Product preferences and brand loyalty signals\n\nWhat actions it generates:\n• Personalized thank-you messages\n• Early access and exclusive offer campaigns\n• Birthday and milestone celebrations\n• Priority support routing recommendations\n\nExpected outcomes:\n• 20-35% increase in VIP retention rate\n• Higher brand advocacy and referrals\n• Increased share of wallet from top customers',
    tools: ['Shopify', 'Gmail', 'Web Search'],
    tags: ['Customer Service', 'VIP', 'Relationship'],
  },
  {
    id: 'sentiment-intelligence',
    name: 'Sentiment Intelligence Agent',
    category: 'Customer Service',
    description:
      'Analyzes customer sentiment across all touchpoints to surface hidden risks and opportunities.',
    detailedDescription:
      'The Sentiment Intelligence Agent processes customer interactions across support tickets, reviews, social media, and surveys to build a real-time sentiment map.\n\nWhat it analyzes:\n• Support ticket tone and resolution satisfaction\n• Review sentiment by product and category\n• Social media brand mentions\n• NPS and CSAT survey responses\n\nWhat actions it generates:\n• Sentiment trend reports and alerts\n• Product-level sentiment breakdowns\n• Escalation triggers for negative sentiment spikes\n• Positive sentiment amplification campaigns\n\nExpected outcomes:\n• Real-time visibility into customer mood\n• Faster response to emerging issues\n• Data-driven product and service improvements',
    tools: ['Web Search', 'Gmail', 'Google Analytics'],
    tags: ['Customer Service', 'Sentiment', 'Intelligence'],
  },

  // ── Marketing ─────────────────────────────────────────────────
  {
    id: 'conversion-optimizer',
    name: 'Conversion Optimizer',
    category: 'Marketing',
    description:
      'Identifies friction in product pages, checkout and messaging to improve conversion rate.',
    detailedDescription:
      "The Conversion Optimizer agent continuously analyzes your store's product pages, checkout flow, and messaging to identify friction points that hurt conversion rates.\n\nWhat it analyzes:\n• Product page layout, copy, and CTA placement\n• Checkout funnel drop-off points\n• Pricing presentation and trust signals\n• Mobile vs desktop conversion gaps\n\nWhat actions it generates:\n• Prioritized list of UX improvements\n• A/B test suggestions for high-impact pages\n• Copy rewrites for underperforming CTAs\n• Checkout flow simplification recommendations\n\nExpected outcomes:\n• 10-25% improvement in conversion rate within 30 days\n• Reduced cart abandonment\n• Higher average order value",
    tools: ['Shopify', 'Web Search', 'Google Analytics'],
    tags: ['Marketing', 'Optimization', 'Automation'],
  },
  {
    id: 'retention-booster',
    name: 'Retention Booster',
    category: 'Marketing',
    description: 'Identifies churn risks and suggests retention flows.',
    detailedDescription:
      'Retention Booster analyzes customer behavior patterns to identify at-risk customers and generate automated retention strategies.\n\nWhat it analyzes:\n• Purchase frequency and recency patterns\n• Customer engagement signals\n• Email open and click rates\n• Product return and complaint data\n\nWhat actions it generates:\n• Win-back email sequences\n• Loyalty program recommendations\n• Personalized offer strategies\n• Customer segment-specific retention flows\n\nExpected outcomes:\n• Reduced churn rate by 15-30%\n• Increased customer lifetime value\n• Higher repeat purchase rate',
    tools: ['Shopify', 'Gmail', 'Google Analytics'],
    tags: ['Marketing', 'Automation', 'Optimization'],
  },
  {
    id: 'ad-waste-detector',
    name: 'Ad Waste Detector',
    category: 'Marketing',
    description: 'Detects inefficient ad spend and performance leaks.',
    detailedDescription:
      'Ad Waste Detector monitors your advertising campaigns across platforms to identify wasted spend and optimization opportunities.\n\nWhat it analyzes:\n• Campaign ROAS and cost per acquisition\n• Audience targeting efficiency\n• Creative fatigue and ad frequency\n• Attribution gaps and tracking issues\n\nWhat actions it generates:\n• Budget reallocation recommendations\n• Underperforming campaign pause suggestions\n• Audience refinement strategies\n• Creative refresh priorities\n\nExpected outcomes:\n• 20-40% reduction in wasted ad spend\n• Improved ROAS across campaigns\n• Better budget utilization',
    tools: ['Meta Ads', 'Google Analytics', 'Web Search'],
    tags: ['Marketing', 'Optimization', 'Monitoring'],
  },
  {
    id: 'content-engine',
    name: 'Content Engine',
    category: 'Marketing',
    description:
      'Generates and schedules content ideas based on trending topics, product launches, and audience signals.',
    detailedDescription:
      'The Content Engine agent monitors trends, competitor content, and audience engagement to generate high-impact content strategies.\n\nWhat it analyzes:\n• Trending topics in your niche\n• Competitor content performance\n• Audience engagement patterns\n• Product launch calendars\n\nWhat actions it generates:\n• Content calendar with topic suggestions\n• Email newsletter drafts\n• Social media post ideas with copy\n• Blog post outlines optimized for SEO\n\nExpected outcomes:\n• Consistent content output\n• Higher engagement rates\n• Improved organic traffic',
    tools: ['Web Search', 'Gmail', 'Google Analytics'],
    tags: ['Marketing', 'Content', 'Automation'],
  },
  {
    id: 'email-performance',
    name: 'Email Performance Agent',
    category: 'Marketing',
    description:
      'Optimizes email campaigns by analyzing open rates, click-throughs, and subscriber behavior.',
    detailedDescription:
      'The Email Performance Agent continuously monitors your email marketing metrics and suggests data-driven improvements.\n\nWhat it analyzes:\n• Open rates and click-through rates by segment\n• Subject line performance patterns\n• Send time optimization\n• Unsubscribe and spam triggers\n\nWhat actions it generates:\n• Subject line A/B test suggestions\n• Segment-specific send time recommendations\n• List hygiene and re-engagement flows\n• Template performance comparisons\n\nExpected outcomes:\n• 15-30% improvement in email engagement\n• Reduced unsubscribe rates\n• Higher revenue per email sent',
    tools: ['Gmail', 'Google Analytics', 'Shopify'],
    tags: ['Marketing', 'Email', 'Optimization'],
  },

  // ── Competitors ───────────────────────────────────────────────
  {
    id: 'competitor-watch',
    name: 'Competitor Watch',
    category: 'Competitors',
    description: 'Monitors competitor pricing, messaging shifts and campaign activity.',
    detailedDescription:
      "Competitor Watch keeps a constant eye on your competitors' digital presence, tracking changes in pricing, messaging, and advertising strategies.\n\nWhat it analyzes:\n• Competitor product pricing and promotions\n• Landing page and messaging changes\n• Ad creative and spend patterns\n• New product launches and positioning\n\nWhat actions it generates:\n• Price adjustment recommendations\n• Counter-messaging strategies\n• Opportunity alerts when competitors pull back\n• Market positioning reports\n\nExpected outcomes:\n• Faster response to competitive threats\n• Better pricing strategy\n• Improved market positioning",
    tools: ['Web Search', 'Meta Ads', 'Google Analytics'],
    tags: ['Competitors', 'Monitoring', 'Automation'],
  },
  {
    id: 'pricing-intelligence',
    name: 'Pricing Intelligence',
    category: 'Competitors',
    description:
      'Tracks competitor pricing in real time and recommends dynamic pricing adjustments.',
    detailedDescription:
      'Pricing Intelligence monitors competitor prices across products and categories to help you stay competitive without sacrificing margin.\n\nWhat it analyzes:\n• Competitor price changes by SKU/category\n• Promotional cadence and discount depth\n• Price elasticity signals from your own data\n• Market positioning gaps\n\nWhat actions it generates:\n• Dynamic pricing recommendations\n• Promotional timing suggestions\n• Margin optimization alerts\n• Price-match opportunity flags\n\nExpected outcomes:\n• Optimized pricing for margin and volume\n• Faster response to competitor price moves\n• Better promotional ROI',
    tools: ['Web Search', 'Shopify', 'Google Analytics'],
    tags: ['Competitors', 'Pricing', 'Intelligence'],
  },
  {
    id: 'market-gap-finder',
    name: 'Market Gap Finder',
    category: 'Competitors',
    description:
      'Identifies underserved niches and product gaps by analyzing competitor catalogs and demand signals.',
    detailedDescription:
      'The Market Gap Finder scans competitor product catalogs, customer search behavior, and market trends to surface unmet demand.\n\nWhat it analyzes:\n• Competitor product catalog coverage\n• Search demand vs available supply\n• Customer review complaints about missing features\n• Trending categories and emerging niches\n\nWhat actions it generates:\n• Product opportunity reports\n• Category expansion recommendations\n• Feature gap analysis for existing products\n• Demand forecasts for new opportunities\n\nExpected outcomes:\n• First-mover advantage in underserved niches\n• Data-driven product development\n• Reduced risk on new launches',
    tools: ['Web Search', 'Google Analytics', 'Shopify'],
    tags: ['Competitors', 'Market', 'Opportunities'],
  },
  {
    id: 'share-of-voice',
    name: 'Share of Voice Tracker',
    category: 'Competitors',
    description:
      'Measures your brand visibility vs competitors across search, social, and paid channels.',
    detailedDescription:
      'The Share of Voice Tracker benchmarks your brand presence against competitors across digital channels.\n\nWhat it analyzes:\n• Organic search visibility and rankings\n• Paid ad impression share\n• Social media mention volume\n• Content reach and engagement comparison\n\nWhat actions it generates:\n• Channel-specific visibility gap reports\n• Content and SEO priority recommendations\n• Ad spend allocation suggestions\n• Brand awareness campaign triggers\n\nExpected outcomes:\n• Clear competitive visibility benchmarks\n• Targeted investment in underperforming channels\n• Growing brand awareness over time',
    tools: ['Web Search', 'Meta Ads', 'Google Analytics'],
    tags: ['Competitors', 'Brand', 'Monitoring'],
  },

  // ── Analytics ─────────────────────────────────────────────────
  {
    id: 'revenue-intelligence',
    name: 'Revenue Intelligence',
    category: 'Analytics',
    description: 'Analyzes revenue signals and prioritizes growth opportunities.',
    detailedDescription:
      'Revenue Intelligence aggregates data from multiple sources to surface actionable revenue insights and growth opportunities.\n\nWhat it analyzes:\n• Revenue trends by product, channel, and segment\n• Customer acquisition cost and payback periods\n• Seasonal patterns and demand forecasting\n• Cross-sell and upsell opportunities\n\nWhat actions it generates:\n• Revenue growth playbooks\n• Budget reallocation recommendations\n• Product bundling strategies\n• Channel optimization priorities\n\nExpected outcomes:\n• Data-driven revenue decisions\n• Optimized marketing spend allocation\n• Identified untapped revenue streams',
    tools: ['Shopify', 'Google Analytics', 'Web Search'],
    tags: ['Analytics', 'Revenue', 'Growth'],
  },
  {
    id: 'cohort-analyzer',
    name: 'Cohort Analyzer',
    category: 'Analytics',
    description:
      'Breaks down customer behavior by acquisition cohort to reveal retention and spending patterns.',
    detailedDescription:
      'The Cohort Analyzer segments customers by when they were acquired and tracks their behavior over time.\n\nWhat it analyzes:\n• Retention curves by acquisition month\n• Revenue per cohort over time\n• Channel-specific cohort quality\n• Seasonal acquisition impact\n\nWhat actions it generates:\n• Cohort health scorecards\n• Acquisition channel quality rankings\n• Retention improvement recommendations by cohort\n• LTV projections for recent cohorts\n\nExpected outcomes:\n• Clear understanding of customer quality trends\n• Better acquisition budget allocation\n• Early warning on deteriorating cohorts',
    tools: ['Shopify', 'Google Analytics'],
    tags: ['Analytics', 'Cohorts', 'Retention'],
  },
  {
    id: 'funnel-diagnostics',
    name: 'Funnel Diagnostics',
    category: 'Analytics',
    description: 'Pinpoints exactly where customers drop off in your conversion funnel and why.',
    detailedDescription:
      'Funnel Diagnostics maps your entire customer journey from first visit to purchase and identifies the biggest leaks.\n\nWhat it analyzes:\n• Step-by-step funnel conversion rates\n• Drop-off patterns by device, segment, and source\n• Page-level engagement metrics\n• Checkout friction indicators\n\nWhat actions it generates:\n• Prioritized leak-fix recommendations\n• A/B test hypotheses for high-drop steps\n• Device-specific optimization tasks\n• Funnel benchmark comparisons\n\nExpected outcomes:\n• Reduced funnel leakage\n• Higher end-to-end conversion rates\n• Clear ROI on optimization efforts',
    tools: ['Google Analytics', 'Shopify', 'Web Search'],
    tags: ['Analytics', 'Funnel', 'Optimization'],
  },
  {
    id: 'attribution-mapper',
    name: 'Attribution Mapper',
    category: 'Analytics',
    description:
      'Maps the real impact of each marketing channel on revenue using multi-touch attribution models.',
    detailedDescription:
      'The Attribution Mapper goes beyond last-click to show which channels truly drive revenue.\n\nWhat it analyzes:\n• Multi-touch customer journeys\n• Channel assist and conversion roles\n• Time-to-conversion by channel\n• Incremental lift per channel\n\nWhat actions it generates:\n• Channel-level ROI scorecards\n• Budget reallocation recommendations\n• Undervalued channel alerts\n• Attribution model comparison reports\n\nExpected outcomes:\n• Accurate understanding of channel value\n• Optimized marketing spend\n• Reduced wasted ad budget',
    tools: ['Google Analytics', 'Meta Ads', 'Shopify'],
    tags: ['Analytics', 'Attribution', 'Channels'],
  },

  // ── Audit ─────────────────────────────────────────────────────
  {
    id: 'store-audit-scanner',
    name: 'Store Audit Scanner',
    category: 'Audit',
    description: 'Scans your store for UX issues, performance bottlenecks and SEO gaps.',
    detailedDescription:
      'The Store Audit Scanner performs comprehensive audits of your e-commerce store, identifying technical and UX issues that impact performance.\n\nWhat it analyzes:\n• Page load speed and Core Web Vitals\n• SEO meta tags, structured data, and indexing\n• Mobile responsiveness and usability\n• Broken links and 404 errors\n\nWhat actions it generates:\n• Prioritized fix list by impact severity\n• SEO optimization recommendations\n• Performance improvement tasks\n• Accessibility compliance checklist\n\nExpected outcomes:\n• Improved search rankings\n• Faster page load times\n• Better user experience scores',
    tools: ['Shopify', 'Web Search', 'Google Analytics'],
    tags: ['Audit', 'SEO', 'Performance'],
  },
  {
    id: 'checkout-auditor',
    name: 'Checkout Auditor',
    category: 'Audit',
    description: 'Audits the checkout flow for friction, trust gaps, and abandonment triggers.',
    detailedDescription:
      'The Checkout Auditor focuses specifically on the purchase completion experience to maximize checkout conversion.\n\nWhat it analyzes:\n• Payment method availability and failure rates\n• Shipping cost and time presentation\n• Trust signal placement (security badges, policies)\n• Form field friction and error rates\n\nWhat actions it generates:\n• Checkout simplification recommendations\n• Payment method optimization suggestions\n• Trust signal placement improvements\n• Shipping transparency enhancements\n\nExpected outcomes:\n• 10-20% reduction in cart abandonment\n• Higher checkout completion rate\n• Increased customer confidence',
    tools: ['Shopify', 'Google Analytics', 'Web Search'],
    tags: ['Audit', 'Checkout', 'Optimization'],
  },
  {
    id: 'data-quality-guard',
    name: 'Data Quality Guard',
    category: 'Audit',
    description:
      'Validates tracking, tagging, and data integrity across your analytics and ad platforms.',
    detailedDescription:
      'The Data Quality Guard ensures your data infrastructure is accurate and complete so decisions are based on trustworthy numbers.\n\nWhat it analyzes:\n• Analytics tracking code implementation\n• Conversion pixel accuracy\n• UTM parameter consistency\n• Data discrepancies between platforms\n\nWhat actions it generates:\n• Tracking error alerts and fixes\n• Tag audit reports\n• Data reconciliation recommendations\n• Implementation checklists for new campaigns\n\nExpected outcomes:\n• Trustworthy data for decision-making\n• Reduced attribution errors\n• Accurate ROI measurement',
    tools: ['Google Analytics', 'Meta Ads', 'Web Search'],
    tags: ['Audit', 'Data', 'Quality'],
  },
  {
    id: 'compliance-scanner',
    name: 'Compliance Scanner',
    category: 'Audit',
    description: 'Checks your store for legal, privacy, and accessibility compliance issues.',
    detailedDescription:
      'The Compliance Scanner reviews your store against privacy regulations, accessibility standards, and legal requirements.\n\nWhat it analyzes:\n• GDPR and LGPD consent mechanisms\n• Cookie policy and tracking disclosure\n• Accessibility (WCAG) compliance\n• Terms, privacy policy, and refund policy completeness\n\nWhat actions it generates:\n• Compliance gap reports\n• Cookie consent implementation tasks\n• Accessibility fix priorities\n• Policy template recommendations\n\nExpected outcomes:\n• Reduced legal risk\n• Better accessibility scores\n• Customer trust and transparency',
    tools: ['Web Search', 'Shopify'],
    tags: ['Audit', 'Compliance', 'Privacy'],
  },

  // ── Productivity ──────────────────────────────────────────────
  {
    id: 'task-prioritizer',
    name: 'Task Prioritizer',
    category: 'Productivity',
    description:
      'Ranks your backlog by estimated revenue impact so you always work on what matters most.',
    detailedDescription:
      'The Task Prioritizer scores and ranks your optimization backlog based on estimated revenue impact and implementation effort.\n\nWhat it analyzes:\n• Pending tasks and their expected outcomes\n• Historical impact of similar changes\n• Implementation complexity and dependencies\n• Current performance bottlenecks\n\nWhat actions it generates:\n• Impact-ranked task lists\n• Quick-win identification\n• Resource allocation recommendations\n• Weekly focus area suggestions\n\nExpected outcomes:\n• Focus on highest-ROI activities\n• Reduced time on low-impact tasks\n• Faster path to revenue growth',
    tools: ['Shopify', 'Google Analytics'],
    tags: ['Productivity', 'Prioritization', 'Efficiency'],
  },
  {
    id: 'weekly-briefing',
    name: 'Weekly Briefing Agent',
    category: 'Productivity',
    description:
      'Generates a concise weekly summary of key changes, risks, and opportunities across your store.',
    detailedDescription:
      'The Weekly Briefing Agent compiles the most important signals from all your data sources into a digestible weekly report.\n\nWhat it analyzes:\n• Week-over-week metric changes\n• New signals and emerging risks\n• Automation performance results\n• Competitor activity summary\n\nWhat actions it generates:\n• Executive summary with key takeaways\n• Top 3 actions for the coming week\n• Risk alerts requiring attention\n• Win celebrations and progress tracking\n\nExpected outcomes:\n• Stay informed in 5 minutes per week\n• Never miss a critical signal\n• Consistent strategic awareness',
    tools: ['Google Analytics', 'Shopify', 'Gmail'],
    tags: ['Productivity', 'Reporting', 'Automation'],
  },
  {
    id: 'workflow-automator',
    name: 'Workflow Automator',
    category: 'Productivity',
    description: 'Connects your tools and automates repetitive operational tasks across platforms.',
    detailedDescription:
      'The Workflow Automator identifies repetitive manual tasks and creates automated workflows to save time.\n\nWhat it analyzes:\n• Repetitive manual processes\n• Cross-platform data transfer needs\n• Notification and alert patterns\n• Reporting cadence requirements\n\nWhat actions it generates:\n• Automated workflow suggestions\n• Cross-platform sync configurations\n• Alert and notification rules\n• Scheduled report setups\n\nExpected outcomes:\n• Hours saved per week on manual tasks\n• Fewer human errors in processes\n• Faster response to critical events',
    tools: ['Shopify', 'Gmail', 'Google Analytics'],
    tags: ['Productivity', 'Workflow', 'Automation'],
  },
  {
    id: 'inventory-alerts',
    name: 'Inventory Alerts Agent',
    category: 'Productivity',
    description:
      'Monitors stock levels and velocity to prevent stockouts and overstock situations.',
    detailedDescription:
      'The Inventory Alerts Agent tracks product stock levels against sales velocity to ensure optimal inventory management.\n\nWhat it analyzes:\n• Current stock levels vs sales velocity\n• Seasonal demand patterns\n• Supplier lead times\n• Overstock and slow-moving inventory\n\nWhat actions it generates:\n• Restock alerts before stockouts\n• Overstock markdown recommendations\n• Demand forecast updates\n• Supplier order timing suggestions\n\nExpected outcomes:\n• Fewer lost sales from stockouts\n• Reduced capital tied in overstock\n• Optimized inventory turnover',
    tools: ['Shopify', 'Google Analytics'],
    tags: ['Productivity', 'Inventory', 'Alerts'],
  },
]
