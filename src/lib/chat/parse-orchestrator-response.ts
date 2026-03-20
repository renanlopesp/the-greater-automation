import type { ParsedOrchestratorResponse, CoworkerReference, Artifact } from '@/types/artifacts'

const COWORKER_RE = /<!--\s*snew:coworker\s+([\s\S]*?)\s*-->/g
const FOLLOWUPS_RE = /<!--\s*snew:followups\s+([\s\S]*?)\s*-->/g
const ARTIFACT_RE = /<!--\s*snew:artifact\s+([\s\S]*?)\s*-->/g
const ALL_MARKERS_RE = /<!--\s*snew:\w+\s+[\s\S]*?-->/g

export function parseOrchestratorResponse(raw: string): ParsedOrchestratorResponse {
  let coworker: CoworkerReference | undefined
  const followUps: string[] = []
  const artifacts: Artifact[] = []

  // Extract coworker markers
  for (const match of raw.matchAll(COWORKER_RE)) {
    try {
      coworker = JSON.parse(match[1]) as CoworkerReference
    } catch {
      /* skip malformed */
    }
  }

  // Extract follow-up markers
  for (const match of raw.matchAll(FOLLOWUPS_RE)) {
    try {
      const parsed = JSON.parse(match[1]) as string[]
      followUps.push(...parsed)
    } catch {
      /* skip malformed */
    }
  }

  // Extract artifact markers
  for (const match of raw.matchAll(ARTIFACT_RE)) {
    try {
      artifacts.push(JSON.parse(match[1]) as Artifact)
    } catch {
      /* skip malformed */
    }
  }

  // Strip all markers from visible text
  const text = raw.replace(ALL_MARKERS_RE, '').trim()

  return { text, coworker, followUps, artifacts }
}
