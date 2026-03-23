import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { fetchSkillBySlug, fetchActiveSkills, type SkillRow } from '@/lib/queries/skills'
import { skills as skillRegistry } from '@/data/skills'

type Client = SupabaseClient<Database>

export interface SkillContext {
  slug: string
  name: string
  description: string | null
  systemPrompt: string | null
  tools: string[]
  knowledge: string[]
  dependencies: string[]
  requiredConnections: string[]
}

/**
 * Load a single skill's execution context.
 * Combines DB state (per-team) with code registry (definition).
 */
export async function loadSkill(
  supabase: Client,
  teamId: string,
  slug: string
): Promise<SkillContext | null> {
  // Try DB first (has per-team state + any custom prompts)
  const dbSkill = await fetchSkillBySlug(supabase, teamId, slug)

  // Fall back to code registry for the detailed definition
  const registrySkill = skillRegistry.find((s) => s.slug === slug)

  if (!dbSkill && !registrySkill) return null

  return {
    slug,
    name: dbSkill?.name ?? registrySkill?.name ?? slug,
    description: dbSkill?.description ?? registrySkill?.description ?? null,
    systemPrompt: dbSkill?.system_prompt ?? registrySkill?.detailedDescription ?? null,
    tools: Array.isArray(dbSkill?.tools) ? (dbSkill.tools as string[]) : [],
    knowledge: Array.isArray(dbSkill?.knowledge) ? (dbSkill.knowledge as string[]) : [],
    dependencies: dbSkill?.dependencies ?? registrySkill?.dependencies ?? [],
    requiredConnections: dbSkill?.requires_connections ?? registrySkill?.requiredConnections ?? [],
  }
}

export interface OrchestratorSkillSummary {
  slug: string
  name: string
  description: string | null
  category: string
  status: string
  dependencies: string[]
  requiredConnections: string[]
}

/**
 * Load all active skills for the orchestrator system prompt.
 * Returns lightweight summaries (not full context — that's loaded on demand).
 */
export async function loadSkillsForOrchestrator(
  supabase: Client,
  teamId: string
): Promise<OrchestratorSkillSummary[]> {
  const activeSkills = await fetchActiveSkills(supabase, teamId)

  return activeSkills.map((skill: SkillRow) => ({
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    status: skill.status,
    dependencies: skill.dependencies ?? [],
    requiredConnections: skill.requires_connections ?? [],
  }))
}

/**
 * Validate that a skill can be executed:
 * - Must be active
 * - Dependencies must be active
 * - Required connections must be present
 */
export async function validateSkillExecution(
  supabase: Client,
  teamId: string,
  slug: string,
  connectedApps: string[] = []
): Promise<{ valid: boolean; error?: string }> {
  const dbSkill = await fetchSkillBySlug(supabase, teamId, slug)

  if (!dbSkill) {
    return { valid: false, error: `Skill '${slug}' not found` }
  }

  if (dbSkill.status !== 'active') {
    return { valid: false, error: `Skill '${slug}' is not active. Activate it first.` }
  }

  // Check dependencies
  if (dbSkill.dependencies && dbSkill.dependencies.length > 0) {
    for (const dep of dbSkill.dependencies) {
      const depSkill = await fetchSkillBySlug(supabase, teamId, dep)
      if (!depSkill || depSkill.status !== 'active') {
        return { valid: false, error: `Skill '${slug}' requires '${dep}' to be active` }
      }
    }
  }

  // Check required connections
  if (dbSkill.requires_connections && dbSkill.requires_connections.length > 0) {
    for (const conn of dbSkill.requires_connections) {
      if (!connectedApps.includes(conn)) {
        return { valid: false, error: `Skill '${slug}' requires ${conn} connection` }
      }
    }
  }

  return { valid: true }
}
