/**
 * Feature flags for controlling mock/placeholder content.
 *
 * Set to `false` to hide sections that still use hardcoded mock data.
 * Once real data integration is done, remove the flag check and this entry.
 */
export const FEATURE_FLAGS = {
  /** Home — "Co-workers em ação" cards with hardcoded summaries and results */
  MOCK_COWORKERS_IN_ACTION: true,

  /** Home — "Oportunidades detectadas" with hardcoded opportunities + drawer */
  MOCK_OPPORTUNITIES: true,

  /** Home — "Co-worker recomendado" hardcoded Marketing Agent recommendation */
  MOCK_COWORKER_RECOMMENDATION: true,

  /** Home — "Conecte seus apps" hardcoded 4-app list */
  MOCK_CONNECT_APPS: true,

  /** Home — Intent cards carousel with hardcoded categories */
  MOCK_INTENT_CARDS: true,

  /** Home — Greeting subtitle "3 agentes ativos · última atividade há 2h" */
  MOCK_GREETING_STATS: true,

  /** Agent workspace — "hoje" tab with hardcoded activity log, stats, files */
  MOCK_AGENT_WORKSPACE: false,

  /** History — Hardcoded conversation list */
  MOCK_HISTORY: true,

  /** Notifications — Hardcoded notification items + detail drawer */
  MOCK_NOTIFICATIONS: true,

  /** Discover — Install wizard modal with hardcoded pitch data per agent */
  MOCK_INSTALL_WIZARD: true,

  /** Discover — "Typical outcome" hover text on agent cards */
  MOCK_TYPICAL_OUTCOMES: true,

  /** Discover — Entire Co-Workers catalog page uses static data/agents.ts instead of DB.
   *  Active filter is broken (DB UUIDs vs catalog slugs). Needs real integration. */
  MOCK_DISCOVER_CATALOG: true,
} as const
