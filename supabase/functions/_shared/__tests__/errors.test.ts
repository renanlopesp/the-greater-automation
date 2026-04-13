import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { failTask, log } from '../errors.ts'

Deno.test('failTask writes skill_status=failed + error payload to tasks', async () => {
  const calls: Array<{ table: string; update: unknown; where: unknown }> = []

  // Mock Supabase client
  const supabase = {
    from(table: string) {
      return {
        update(data: unknown) {
          return {
            eq(col: string, val: unknown) {
              calls.push({ table, update: data, where: { col, val } })
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  } as unknown as Parameters<typeof failTask>[0]

  await failTask(supabase, 'task-123', 'generate', 'boom')

  assertEquals(calls.length, 1)
  assertEquals(calls[0].table, 'tasks')
  const update = calls[0].update as Record<string, unknown>
  assertEquals(update.skill_status, 'failed')
  const meta = update.metadata as { error: { stage: string; message: string } }
  assertEquals(meta.error.stage, 'generate')
  assertEquals(meta.error.message, 'boom')
  assertEquals(calls[0].where, { col: 'id', val: 'task-123' })
})

Deno.test('log outputs structured key=value pairs', () => {
  const original = console.log
  let captured = ''
  console.log = (...args: unknown[]) => {
    captured = args.join(' ')
  }
  try {
    log('test-tag', { foo: 'bar', count: 3 })
  } finally {
    console.log = original
  }
  assertEquals(captured.includes('[test-tag]'), true)
  assertEquals(captured.includes('foo='), true)
  assertEquals(captured.includes('count='), true)
})
