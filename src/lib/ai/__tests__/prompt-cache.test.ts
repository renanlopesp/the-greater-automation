import { describe, it, expect } from 'vitest'
import { buildCachedSystemBlock, buildCachedToolsBlock } from '../prompt-cache'

describe('buildCachedSystemBlock', () => {
  it('returns text block with ephemeral cache_control', () => {
    expect(buildCachedSystemBlock('hello')).toEqual({
      type: 'text',
      text: 'hello',
      cache_control: { type: 'ephemeral' },
    })
  })
})

describe('buildCachedToolsBlock', () => {
  it('returns empty array for empty input', () => {
    expect(buildCachedToolsBlock([])).toEqual([])
  })

  it('applies cache_control to the single tool', () => {
    const tool = { name: 'a', input_schema: { type: 'object' as const } }
    const result = buildCachedToolsBlock([tool])
    expect(result[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('applies cache_control only to the last tool', () => {
    const toolA = { name: 'a', input_schema: { type: 'object' as const } }
    const toolB = { name: 'b', input_schema: { type: 'object' as const } }
    const toolC = { name: 'c', input_schema: { type: 'object' as const } }
    const result = buildCachedToolsBlock([toolA, toolB, toolC])
    expect(result[0].cache_control).toBeUndefined()
    expect(result[1].cache_control).toBeUndefined()
    expect(result[2].cache_control).toEqual({ type: 'ephemeral' })
  })
})
