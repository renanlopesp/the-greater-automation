import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TriggerBlock from '@/components/workflow-editor/trigger-block'

describe('TriggerBlock', () => {
  it('renders "Add trigger" when trigger is null', () => {
    render(<TriggerBlock trigger={null} onAddTrigger={() => {}} onClickTrigger={() => {}} />)
    expect(screen.getByText('Add trigger')).toBeInTheDocument()
  })

  it('calls onAddTrigger when clicking empty block', () => {
    const onAdd = vi.fn()
    render(<TriggerBlock trigger={null} onAddTrigger={onAdd} onClickTrigger={() => {}} />)
    fireEvent.click(screen.getByText('Add trigger'))
    expect(onAdd).toHaveBeenCalled()
  })

  it('renders trigger name when trigger is set', () => {
    render(
      <TriggerBlock
        trigger={{ type: 'manual', config: { run_inputs: [] } }}
        onAddTrigger={() => {}}
        onClickTrigger={() => {}}
      />
    )
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('Click to run')).toBeInTheDocument()
  })

  it('calls onClickTrigger when clicking set trigger', () => {
    const onClick = vi.fn()
    render(
      <TriggerBlock
        trigger={{ type: 'manual', config: { run_inputs: [] } }}
        onAddTrigger={() => {}}
        onClickTrigger={onClick}
      />
    )
    fireEvent.click(screen.getByText('Manual'))
    expect(onClick).toHaveBeenCalled()
  })
})
