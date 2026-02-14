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

// Mock agent skills hook (needs QueryClientProvider otherwise)
vi.mock('@/hooks/use-agent-skills', () => ({
  useInvalidateAgentSkills: () => vi.fn(),
}))

const mockLegacySkills = [
  {
    id: '1',
    name: 'Email Summarizer',
    description: null,
    source: 'manual',
    last_run_at: null,
    workflow_id: 'wf-1',
    workflow: { name: 'Email Flow', emoji: '📧' },
    action_template: null,
  },
  {
    id: '2',
    name: 'Data Processor',
    description: null,
    source: 'manual',
    last_run_at: new Date(Date.now() - 3_600_000).toISOString(),
    workflow_id: 'wf-2',
    workflow: { name: 'Data Pipeline', emoji: '🔄' },
    action_template: null,
  },
]

const mockRuleSkills = [
  {
    id: '3',
    name: 'Test Ping',
    description: 'Sends a ping notification',
    source: 'rule',
    last_run_at: null,
    workflow: null,
    trigger_config: { type: 'manual' },
    conditions: [],
    actions: [{ type: 'notify', channel: 'internal', message: 'Pong!' }],
    is_enabled: true,
    execution_mode: 'auto',
    run_count: 0,
  },
  {
    id: '4',
    name: 'Daily Standup',
    description: 'Scheduled reminder',
    source: 'rule',
    last_run_at: new Date(Date.now() - 3_600_000).toISOString(),
    workflow: null,
    trigger_config: { type: 'scheduled', cron_expression: '0 9 * * 1-5' },
    conditions: [{ field: 'body.team', operator: 'equals', value: 'engineering' }],
    actions: [{ type: 'notify', channel: 'slack', message: 'Standup time!' }],
    is_enabled: true,
    execution_mode: 'auto',
    run_count: 5,
  },
]

describe('SkillsList', () => {
  it('renders legacy skill cards with names and emojis', () => {
    render(<SkillsList skills={mockLegacySkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Email Summarizer')).toBeInTheDocument()
    expect(screen.getByText('Data Processor')).toBeInTheDocument()
    expect(screen.getByText('📧')).toBeInTheDocument()
    expect(screen.getByText('🔄')).toBeInTheDocument()
  })

  it('shows "Never ran" for skills with null last_run_at', () => {
    render(<SkillsList skills={mockLegacySkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Never ran')).toBeInTheDocument()
  })

  it('shows relative time for legacy skills with last_run_at', () => {
    render(<SkillsList skills={mockLegacySkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText(/ago/)).toBeInTheDocument()
  })

  it('renders rule-based skills with trigger icons', () => {
    render(<SkillsList skills={mockRuleSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Test Ping')).toBeInTheDocument()
    expect(screen.getByText('Daily Standup')).toBeInTheDocument()
  })

  it('shows "Run" button for manual trigger skills', () => {
    render(<SkillsList skills={mockRuleSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Run')).toBeInTheDocument()
  })

  it('shows enable/disable toggle for rule skills', () => {
    render(<SkillsList skills={mockRuleSkills} agentId="agent-1" teamId="team-1" />)
    const toggles = screen.getAllByRole('switch', { name: 'Toggle skill' })
    expect(toggles.length).toBeGreaterThan(0)
  })

  it('shows condition count badge when conditions exist', () => {
    render(<SkillsList skills={mockRuleSkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('1 condition')).toBeInTheDocument()
  })

  it('renders default emoji when legacy skill has no workflow', () => {
    const skills = [
      {
        id: '5',
        name: 'Orphan Skill',
        description: null,
        source: 'manual',
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
        id: '6',
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

  it('shows help text to create skills via chat', () => {
    render(<SkillsList skills={mockLegacySkills} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('Chat with your agent to create new skills')).toBeInTheDocument()
  })

  it('shows empty state when no skills', () => {
    render(<SkillsList skills={[]} agentId="agent-1" teamId="team-1" />)
    expect(screen.getByText('No skills yet')).toBeInTheDocument()
    expect(screen.getByText('Chat with your agent to create new skills')).toBeInTheDocument()
  })
})
