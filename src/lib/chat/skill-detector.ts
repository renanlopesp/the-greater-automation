import type { HybridChatRequest, ChatRouterDecision } from './types'
import type { UIMessage } from 'ai'

function extractUserText(body: HybridChatRequest): string {
  if (body.message) return body.message
  if (body.messages) {
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const msg = body.messages[i]
      if (msg.role !== 'user') continue
      const parts = msg.parts
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (
            typeof part === 'object' &&
            part !== null &&
            'type' in part &&
            (part as { type: string }).type === 'text' &&
            'text' in part
          ) {
            return (part as { type: string; text: string }).text
          }
        }
      }
    }
  }
  return ''
}

const KEYWORD_RE = /\b(calend[áa]rio|seasonal|campanha sazonal)\b/i

export function detectMode(
  body: HybridChatRequest,
  activeSkills: Array<{ slug: string; status: string }>
): ChatRouterDecision {
  if (body.skill_slug && body.skill_slug.length > 0) {
    const found = activeSkills.find((s) => s.slug === body.skill_slug && s.status === 'active')
    if (found) return { mode: 'skill', slug: body.skill_slug }
    console.warn('[chat] unknown skill_slug:', body.skill_slug)
  }

  const text = extractUserText(body)
  if (KEYWORD_RE.test(text)) {
    const calSkill = activeSkills.find(
      (s) => s.slug === 'seasonal-calendar' && s.status === 'active'
    )
    if (calSkill) return { mode: 'skill', slug: 'seasonal-calendar' }
  }

  return { mode: 'chat', model: body.model }
}
