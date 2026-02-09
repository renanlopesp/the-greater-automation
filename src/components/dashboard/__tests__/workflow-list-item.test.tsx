import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WorkflowListItem from '@/components/dashboard/workflow-list-item'

describe('WorkflowListItem', () => {
  const mockWorkflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    emoji: '🚀',
    status: 'published' as const,
    is_starred: false,
    updated_at: '2026-02-07T10:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  }

  it('renders workflow name', () => {
    render(<WorkflowListItem workflow={mockWorkflow} />)
    expect(screen.getByText('Test Workflow')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<WorkflowListItem workflow={mockWorkflow} />)
    expect(screen.getByText('Published')).toBeInTheDocument()
  })
})
