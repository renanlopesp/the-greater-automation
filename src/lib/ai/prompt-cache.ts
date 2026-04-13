import type Anthropic from '@anthropic-ai/sdk'

type TextBlockParam = Anthropic.Messages.TextBlockParam
type Tool = Anthropic.Messages.Tool

/**
 * Build a system-prompt content block with ephemeral prompt caching.
 * Use as the `system` argument of `anthropic.messages.stream({ system: [buildCachedSystemBlock(prompt)], ... })`.
 */
export function buildCachedSystemBlock(text: string): TextBlockParam {
  return {
    type: 'text',
    text,
    cache_control: { type: 'ephemeral' },
  }
}

/**
 * Apply ephemeral cache_control to the LAST tool definition in the list.
 * Per Anthropic docs, caching the last tool caches every preceding tool block.
 */
export function buildCachedToolsBlock(tools: Tool[]): Tool[] {
  if (tools.length === 0) return tools
  return tools.map((tool, i) =>
    i === tools.length - 1 ? { ...tool, cache_control: { type: 'ephemeral' } } : tool
  )
}
