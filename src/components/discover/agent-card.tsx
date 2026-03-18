'use client'

import Link from 'next/link'
import type { Agent } from '@/data/agents'
import type { AvatarMap } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'
import { FEATURE_FLAGS } from '@/lib/feature-flags'

// Typical outcomes per agent (matches reference)
const typicalOutcomes: Record<string, string> = {
  'customer-service':
    'Reduces response time by up to 60% and resolves repetitive support questions automatically.',
  'upsell-retention':
    'Increases average order value by 15–30% through automated cross-sell and upsell flows.',
  'review-reputation':
    'Increases review volume by 40–60% and improves average star rating within 30 days.',
  'churn-prediction':
    'Reduces preventable churn by 25–40% through early intervention on at-risk accounts.',
  'vip-relationship':
    'Increases VIP retention by 20–35% through automated personalized milestone campaigns.',
  'sentiment-intelligence':
    'Surfaces hidden customer risks in real time across support, reviews, and social.',
  'conversion-optimizer':
    'Improves checkout conversion by identifying friction points and recommending targeted fixes.',
  'retention-booster':
    'Reduces churn rate by 15–30% through data-driven automated retention workflows.',
  'ad-waste-detector':
    'Reduces wasted ad spend by 20–40% by detecting underperforming campaigns and budget leaks.',
  'content-engine':
    'Drives consistent content output aligned to trending topics and audience intent signals.',
  'email-performance':
    'Improves email engagement by 15–30% through segment-specific optimization and A/B testing.',
  'competitor-watch':
    'Detects competitor price drops and new campaigns before they impact your sales.',
  'pricing-intelligence':
    'Keeps pricing competitive while protecting margin through real-time market signals.',
  'market-gap-finder':
    'Surfaces first-mover product opportunities in underserved niches before competitors act.',
  'share-of-voice':
    'Benchmarks brand visibility vs competitors and identifies channels with growth potential.',
  'revenue-intelligence':
    'Identifies hidden growth opportunities in traffic, products, and customer segments.',
  'cohort-analyzer':
    'Reveals which acquisition channels produce the highest-quality customers over time.',
  'funnel-diagnostics':
    'Pinpoints the exact step where revenue is lost and surfaces actionable fixes.',
  'attribution-mapper':
    'Maps true ROI across all channels so budget flows to what actually drives revenue.',
  'store-audit-scanner':
    'Delivers a prioritized health report covering UX, SEO, speed, and conversion blockers.',
  'checkout-auditor':
    'Identifies checkout friction reducing conversion and recommends targeted improvements.',
  'data-quality-guard':
    'Detects tracking gaps and attribution errors that cause flawed reporting decisions.',
  'compliance-scanner':
    'Flags GDPR, CCPA, and platform policy violations before they become legal risks.',
  'task-prioritizer':
    'Surfaces the highest-impact actions across all agents so nothing critical is missed.',
  'weekly-briefing':
    'Delivers a curated weekly summary of performance and key actions to the right people.',
  'workflow-automator':
    'Automates cross-tool workflows triggered by store events, reducing manual operations.',
  'inventory-alerts':
    'Prevents stockouts by triggering reorder alerts before inventory reaches critical levels.',
}

interface AgentCardProps {
  agent: Agent
  isActive?: boolean
  isInstalled?: boolean
  installedAgentPageId?: string
  avatars?: AvatarMap
  onOpenWizard?: (agentId: string, agentName: string) => void
}

export default function AgentCard({
  agent,
  isActive,
  isInstalled,
  installedAgentPageId,
  avatars,
  onOpenWizard,
}: AgentCardProps) {
  const avatarSrc = avatars?.[agent.id]
  const outcome = typicalOutcomes[agent.id]

  const card = (
    <div className="group border-border bg-background hover:border-foreground/50 flex cursor-pointer flex-col rounded-2xl border transition-colors">
      <div className="flex flex-1 flex-col gap-3 p-7">
        {/* Avatar + Name + Active dot */}
        <div className="flex items-center gap-2.5">
          <CoworkerAvatar src={avatarSrc} name={agent.name} size="xs" />
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <p className="text-foreground text-sm leading-tight font-medium">{agent.name}</p>
            {isActive && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                />
              </span>
            )}
            {isInstalled && !isActive && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                Instalado
              </span>
            )}
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
          {agent.description}
        </p>

        {/* Typical Outcome — always occupies space, visible only on hover */}
        {FEATURE_FLAGS.MOCK_TYPICAL_OUTCOMES && (
          <div
            className={`border-border mt-auto border-t pt-4 transition-opacity duration-200 ${
              outcome ? 'opacity-0 group-hover:opacity-100' : 'invisible'
            }`}
          >
            <p className="text-muted-foreground/60 mb-1.5 text-[11px]">Typical outcome</p>
            <p className="text-muted-foreground line-clamp-3 text-[13px] leading-relaxed">
              {outcome}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  if (isActive) {
    return <Link href={`/agents/${agent.id}`}>{card}</Link>
  }

  // If this agent type is installed (module-based), link to the installed agent page
  if (isInstalled && installedAgentPageId) {
    return <Link href={`/agents/${installedAgentPageId}`}>{card}</Link>
  }

  if (onOpenWizard) {
    return (
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onOpenWizard(agent.id, agent.name)}
      >
        {card}
      </button>
    )
  }

  return card
}
