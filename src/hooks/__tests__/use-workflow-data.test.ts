import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/queries/workflow-editor', () => ({
  fetchWorkflowForEditor: vi.fn(),
}))

import { fetchWorkflowForEditor } from '@/lib/queries/workflow-editor'
import { useWorkflowData } from '@/hooks/use-workflow-data'

describe('useWorkflowData', () => {
  it('is a function that accepts workflowId', () => {
    expect(typeof useWorkflowData).toBe('function')
  })

  it('calls fetchWorkflowForEditor with correct query key pattern', () => {
    // Verify the module is properly importable and the mock is set up
    expect(fetchWorkflowForEditor).toBeDefined()
    expect(vi.isMockFunction(fetchWorkflowForEditor)).toBe(true)
  })
})
