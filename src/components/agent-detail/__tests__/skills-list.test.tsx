import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SkillsList from '../skills-list'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// Mock server action
vi.mock('@/lib/actions/agent-skills', () => ({
  removeSkill: vi.fn(),
}))

// Mock AddSkillDialog to avoid complex client-side dependency
vi.mock('@/components/agent-detail/add-skill-dialog', () => ({
  default: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}))

const mockSkills = [
  {
    id: '1',
    name: 'Email Summarizer',
    description: null,
    source: null,
    last_run_at: null,
    workflow_id: 'wf-1',
    workflow: { name: 'Email Flow', emoji: '📧' },
    action_template: null,
  },
  {
    id: '2',
    name: 'Data Processor',
    description: null,
    source: null,
    last_run_at: new Date(Date.now() - 3_600_000).toISOString(),
    workflow_id: 'wf-2',
    workflow: { name: 'Data Pipeline', emoji: '🔄' },
    action_template: null,
  },
]

describe('SkillsList', () => {
  it('renders skill cards with names', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Email Summarizer')).toBeInTheDocument()
    expect(screen.getByText('Data Processor')).toBeInTheDocument()
  })

  it('renders workflow emojis', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('📧')).toBeInTheDocument()
    expect(screen.getByText('🔄')).toBeInTheDocument()
  })

  it('shows "Never ran" for skills with null last_run_at', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Never ran')).toBeInTheDocument()
  })

  it('shows relative time for skills with last_run_at', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText(/ago/)).toBeInTheDocument()
  })

  it('renders "New skill" button', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('New skill')).toBeInTheDocument()
  })

  it('renders default emoji when workflow is null', () => {
    const skills = [
      {
        id: '3',
        name: 'Orphan Skill',
        description: null,
        source: null,
        last_run_at: null,
        workflow_id: null,
        workflow: null,
        action_template: null,
      },
    ]
    render(<SkillsList skills={skills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('🔧')).toBeInTheDocument()
  })

  it('renders dynamic skills with Dynamic badge', () => {
    const skills = [
      {
        id: '4',
        name: 'Quick Bug Report',
        description: 'Create GitHub issue',
        source: 'dynamic',
        last_run_at: null,
        workflow_id: null,
        workflow: null,
        action_template: { action: 'GITHUB_CREATE_ISSUE' },
      },
    ]
    render(<SkillsList skills={skills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Quick Bug Report')).toBeInTheDocument()
    expect(screen.getByText('Dynamic')).toBeInTheDocument()
    expect(screen.getByText('Create GitHub issue')).toBeInTheDocument()
  })
})
