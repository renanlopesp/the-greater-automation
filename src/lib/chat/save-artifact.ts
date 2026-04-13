// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = any

/**
 * Save artifact from MCP tool result to tasks.artifact_data.
 * Existing artifact becomes history entry; new artifact replaces current.
 */
export async function saveArtifact(
  serviceClient: ServiceClient,
  taskId: string,
  artifact: unknown
): Promise<void> {
  try {
    const a = artifact as { type?: string; title?: string; html?: string; data?: unknown }
    if (!a || typeof a !== 'object') return

    const { data: current } = await serviceClient
      .from('tasks')
      .select('artifact_data')
      .eq('id', taskId)
      .single()

    type HistoryEntry = { title: string; html: string; timestamp: string }
    type ArtifactData = {
      type?: string
      title?: string
      html?: string
      data?: unknown
      history?: HistoryEntry[]
    }

    const currentData = (current?.artifact_data ?? null) as ArtifactData | null
    const history: HistoryEntry[] = currentData?.history ?? []

    if (currentData?.html && currentData?.title) {
      history.unshift({
        title: currentData.title,
        html: currentData.html,
        timestamp: new Date().toISOString(),
      })
    }

    await serviceClient
      .from('tasks')
      .update({
        artifact_type: 'chat-data',
        artifact_data: { ...a, history: history.slice(0, 10) },
        skill_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
  } catch (err) {
    console.error('[chat] saveArtifact failed:', err)
  }
}
