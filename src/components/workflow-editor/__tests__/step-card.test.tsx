import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StepCard from '@/components/workflow-editor/step-card'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'

const mockStep: WorkflowStep = {
  id: 's1',
  type: 'ai',
  name: 'AI Transform',
  position: 0,
  config: {
    ai_action: 'summarize',
    prompt_template: 'test',
    output_format: 'text',
    temperature: 0.7,
    max_tokens: 1000,
  },
}

describe('StepCard', () => {
  it('renders step number and name', () => {
    render(
      <StepCard
        step={mockStep}
        stepNumber={1}
        isSelected={false}
        stepId="s1"
        onClick={() => {}}
        isFirst
        isLast
        onMoveUp={() => {}}
        onMoveDown={() => {}}
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('AI Transform')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(
      <StepCard
        step={mockStep}
        stepNumber={1}
        isSelected={false}
        stepId="s1"
        onClick={onClick}
        isFirst
        isLast
        onMoveUp={() => {}}
        onMoveDown={() => {}}
      />
    )
    fireEvent.click(screen.getByText('AI Transform'))
    expect(onClick).toHaveBeenCalledWith('s1')
  })

  it('applies selected ring class', () => {
    const { container } = render(
      <StepCard
        step={mockStep}
        stepNumber={1}
        isSelected={true}
        stepId="s1"
        onClick={() => {}}
        isFirst
        isLast
        onMoveUp={() => {}}
        onMoveDown={() => {}}
      />
    )
    const card = container.querySelector('.ring-2')
    expect(card).toBeTruthy()
  })
})
