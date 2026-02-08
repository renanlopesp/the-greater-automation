import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatInput from '../chat-input'

describe('ChatInput', () => {
  it('renders with agent name in placeholder', () => {
    render(<ChatInput agentName="Relay Agent" />)
    expect(screen.getByPlaceholderText('Chat with Relay Agent...')).toBeInTheDocument()
  })

  it('send button is disabled when input is empty', () => {
    render(<ChatInput agentName="Agent" />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('send button is enabled when input has text', () => {
    render(<ChatInput agentName="Agent" />)
    const input = screen.getByPlaceholderText('Chat with Agent...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('clears input on button click', () => {
    render(<ChatInput agentName="Agent" />)
    const input = screen.getByPlaceholderText('Chat with Agent...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hello' } })
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(input.value).toBe('')
  })

  it('clears input on Enter key', () => {
    render(<ChatInput agentName="Agent" />)
    const input = screen.getByPlaceholderText('Chat with Agent...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('')
  })
})
