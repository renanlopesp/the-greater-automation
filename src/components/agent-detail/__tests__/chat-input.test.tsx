import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatInput from '../chat-input'

describe('ChatInput', () => {
  it('renders with agent name in placeholder', () => {
    render(<ChatInput agentName="Snew Agent" />)
    expect(screen.getByPlaceholderText('Chat with Snew Agent...')).toBeInTheDocument()
  })

  it('updates as the user types', () => {
    render(<ChatInput agentName="Agent" />)
    const input = screen.getByPlaceholderText('Chat with Agent...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hello' } })
    expect(input.value).toBe('Hello')
  })

  it('clears input on Enter key', () => {
    render(<ChatInput agentName="Agent" />)
    const input = screen.getByPlaceholderText('Chat with Agent...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('')
  })
})
