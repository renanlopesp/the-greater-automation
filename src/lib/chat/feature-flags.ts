/**
 * Returns true if the hybrid chat engine should handle this team's chat requests.
 * Hybrid is enabled when:
 *   - `FEATURE_HYBRID_CHAT=true` is set globally, OR
 *   - `FEATURE_HYBRID_CHAT_TEAM_IDS` contains the team id.
 */
export function isHybridChatEnabled(teamId: string): boolean {
  if (process.env.FEATURE_HYBRID_CHAT === 'true') return true
  const list = process.env.FEATURE_HYBRID_CHAT_TEAM_IDS ?? ''
  if (!list) return false
  return list
    .split(',')
    .map((s) => s.trim())
    .includes(teamId)
}
