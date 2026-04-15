-- Seed initial skills for all existing teams
-- Maps the 28 agent catalog entries + 3 foundation skills to the skills table
-- Skills that correspond to installed agents (via agent_type) get status 'active'

insert into public.skills (team_id, slug, name, description, category, phase, icon, color, dependencies, status, is_native, requires_connections)
select
  t.id as team_id,
  s.slug,
  s.name,
  s.description,
  s.category,
  s.phase,
  s.icon,
  s.color,
  s.dependencies,
  -- Mark as 'active' if there's an installed agent with matching agent_type
  case
    when exists (
      select 1 from public.agents a
      where a.team_id = t.id
        and a.agent_type is not null
        and a.agent_type = s.legacy_agent_type
    ) then 'active'
    else 'available'
  end as status,
  s.is_native,
  s.requires_connections
from public.teams t
cross join (
  values
    -- Retention skills
    ('customer-service', 'Customer Service', 'Turn support into retention. Detects at-risk customers and automates personalized outreach.', 'retention', 3, 'headphones', '#5BA87B', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('upsell-retention', 'Upsell & Retention', 'Identifies cross-sell and upsell opportunities based on purchase history.', 'retention', 3, 'trending-up', '#5BA87B', '{}'::text[], false, '{nuvemshop}'::text[], 'carrinho-conversao'),
    ('review-reputation', 'Review & Reputation', 'Automates review collection and manages reputation across channels.', 'retention', 4, 'star', '#5BA87B', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('churn-prediction', 'Churn Prediction', 'Predicts which customers are likely to churn and triggers preventive actions.', 'retention', 3, 'alert-triangle', '#5BA87B', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('vip-relationship', 'VIP Relationship', 'Manages high-value customer relationships with personalized touchpoints.', 'retention', 3, 'crown', '#5BA87B', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('retention-booster', 'Retention Booster', 'Identifies churn risks and suggests retention flows.', 'retention', 3, 'shield', '#5BA87B', '{}'::text[], false, '{nuvemshop}'::text[], null),
    -- Analytics skills
    ('sentiment-intelligence', 'Sentiment Intelligence', 'Analyzes customer sentiment across all touchpoints.', 'analytics', 3, 'smile', '#9B6BC4', '{}'::text[], false, '{}'::text[], null),
    ('competitor-watch', 'Competitor Watch', 'Monitors competitor pricing, messaging shifts and campaign activity.', 'analytics', 4, 'eye', '#9B6BC4', '{}'::text[], false, '{}'::text[], null),
    ('pricing-intelligence', 'Pricing Intelligence', 'Tracks competitor pricing and recommends dynamic pricing adjustments.', 'analytics', 4, 'dollar-sign', '#9B6BC4', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('market-gap-finder', 'Market Gap Finder', 'Identifies underserved niches and product gaps.', 'analytics', 4, 'compass', '#9B6BC4', '{}'::text[], false, '{}'::text[], null),
    ('share-of-voice', 'Share of Voice Tracker', 'Measures brand visibility vs competitors across channels.', 'analytics', 4, 'bar-chart-2', '#9B6BC4', '{}'::text[], false, '{}'::text[], null),
    ('revenue-intelligence', 'Revenue Intelligence', 'Analyzes revenue signals and prioritizes growth opportunities.', 'analytics', 3, 'trending-up', '#9B6BC4', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('cohort-analyzer', 'Cohort Analyzer', 'Breaks down customer behavior by acquisition cohort.', 'analytics', 3, 'users', '#9B6BC4', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('funnel-diagnostics', 'Funnel Diagnostics', 'Pinpoints where customers drop off in the conversion funnel.', 'analytics', 3, 'filter', '#9B6BC4', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('attribution-mapper', 'Attribution Mapper', 'Maps real impact of each marketing channel using multi-touch attribution.', 'analytics', 3, 'git-branch', '#9B6BC4', '{}'::text[], false, '{}'::text[], null),
    -- Campaign skills
    ('conversion-optimizer', 'Conversion Optimizer', 'Identifies friction in product pages and checkout to improve conversion.', 'campaign', 2, 'target', '#D7733E', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('email-performance', 'Email Performance', 'Optimizes email campaigns by analyzing open rates and subscriber behavior.', 'campaign', 2, 'mail', '#D7733E', '{}'::text[], false, '{mailchimp}'::text[], null),
    -- Content skills
    ('content-engine', 'Content Engine', 'Generates and schedules content ideas based on trends and audience signals.', 'content', 2, 'pen-tool', '#648EE9', '{brand-dna}'::text[], false, '{}'::text[], null),
    -- Ads skills
    ('ad-waste-detector', 'Ad Waste Detector', 'Detects inefficient ad spend and performance leaks.', 'ads', 4, 'alert-circle', '#D7733E', '{}'::text[], false, '{}'::text[], null),
    -- Operations skills
    ('store-audit-scanner', 'Store Audit Scanner', 'Scans your store for UX issues, performance bottlenecks and SEO gaps.', 'operations', 4, 'search', '#648EE9', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('checkout-auditor', 'Checkout Auditor', 'Audits the checkout flow for friction and abandonment triggers.', 'operations', 4, 'shopping-cart', '#648EE9', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('data-quality-guard', 'Data Quality Guard', 'Validates tracking, tagging, and data integrity across platforms.', 'operations', 4, 'shield-check', '#648EE9', '{}'::text[], false, '{}'::text[], null),
    ('compliance-scanner', 'Compliance Scanner', 'Checks your store for legal, privacy, and accessibility compliance.', 'operations', 4, 'check-circle', '#648EE9', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('task-prioritizer', 'Task Prioritizer', 'Ranks your backlog by estimated revenue impact.', 'operations', 3, 'list-ordered', '#648EE9', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('weekly-briefing', 'Weekly Briefing', 'Generates a concise weekly summary of key changes and opportunities.', 'operations', 3, 'file-text', '#648EE9', '{}'::text[], false, '{nuvemshop}'::text[], null),
    ('workflow-automator', 'Workflow Automator', 'Connects your tools and automates repetitive operational tasks.', 'operations', 3, 'zap', '#648EE9', '{}'::text[], false, '{}'::text[], null),
    ('inventory-alerts', 'Inventory Alerts', 'Monitors stock levels and velocity to prevent stockouts.', 'operations', 3, 'package', '#648EE9', '{}'::text[], false, '{nuvemshop}'::text[], null),
    -- Foundation skills (Phase 1)
    ('brand-dna', 'Brand DNA', 'Analyzes your store to extract brand identity, tone of voice, and positioning.', 'foundation', 1, 'fingerprint', '#648EE9', '{}'::text[], true, '{nuvemshop}'::text[], null),
    ('copywriter', 'Copywriter', 'Generates on-brand copy for any channel using Brand DNA as quality filter.', 'campaign', 1, 'pen-line', '#D7733E', '{brand-dna}'::text[], false, '{}'::text[], null),
    ('seasonal-calendar', 'Seasonal Calendar', 'Maps 30+ seasonal dates, generates briefings, and triggers the Copywriter.', 'campaign', 1, 'calendar', '#D7733E', '{brand-dna,copywriter}'::text[], false, '{nuvemshop}'::text[], null)
) as s(slug, name, description, category, phase, icon, color, dependencies, is_native, requires_connections, legacy_agent_type)
on conflict (team_id, slug) do nothing;
