import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WebhookTriggerConfigForm } from '../webhook-trigger-config'
import type { WebhookTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

vi.mock('@/lib/workflow-editor/webhook-utils', () => ({
  buildWebhookUrl: vi.fn((token: string) => `http://localhost:3000/api/workflows/webhook/${token}`),
}))

describe('WebhookTriggerConfigForm', () => {
  const defaultConfig: WebhookTriggerConfig = {
    url: '',
    method: 'POST',
    response_status: 200,
  }

  const configWithTokenAndSecret: WebhookTriggerConfig = {
    ...defaultConfig,
    webhook_token: 'test-token-123',
    secret: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  }

  const mockOnUpdate = vi.fn()
  const mockWriteText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    mockOnUpdate.mockClear()
    mockWriteText.mockClear()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
  })

  it('shows "Publish to generate" messages when no token or secret', () => {
    render(<WebhookTriggerConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('Publique a automação para gerar a URL do webhook')).toBeInTheDocument()
    expect(
      screen.getByText('Publique a automação para gerar uma chave secreta')
    ).toBeInTheDocument()
  })

  it('shows webhook URL when token exists', () => {
    render(<WebhookTriggerConfigForm config={configWithTokenAndSecret} onUpdate={mockOnUpdate} />)

    const urlInput = screen.getByDisplayValue(
      'http://localhost:3000/api/workflows/webhook/test-token-123'
    )
    expect(urlInput).toBeInTheDocument()
    expect(urlInput).toHaveAttribute('readonly')
  })

  it('shows secret as password field by default', () => {
    render(<WebhookTriggerConfigForm config={configWithTokenAndSecret} onUpdate={mockOnUpdate} />)

    const secretInput = screen.getByDisplayValue(configWithTokenAndSecret.secret!)
    expect(secretInput).toHaveAttribute('type', 'password')
    expect(secretInput).toHaveAttribute('readonly')
  })

  it('toggles secret visibility', async () => {
    const user = userEvent.setup()
    render(<WebhookTriggerConfigForm config={configWithTokenAndSecret} onUpdate={mockOnUpdate} />)

    const secretInput = screen.getByDisplayValue(configWithTokenAndSecret.secret!)
    expect(secretInput).toHaveAttribute('type', 'password')

    const showButton = screen.getByTitle('Mostrar segredo')
    await user.click(showButton)

    expect(secretInput).toHaveAttribute('type', 'text')
  })

  it('copies secret to clipboard', () => {
    render(<WebhookTriggerConfigForm config={configWithTokenAndSecret} onUpdate={mockOnUpdate} />)

    const copyButton = screen.getByTitle('Copiar segredo')
    fireEvent.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith(configWithTokenAndSecret.secret)
  })

  it('regenerates secret on click', async () => {
    const user = userEvent.setup()
    // Mock crypto.getRandomValues
    const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i
      return arr
    })
    vi.stubGlobal('crypto', { ...crypto, getRandomValues: mockGetRandomValues })

    render(<WebhookTriggerConfigForm config={configWithTokenAndSecret} onUpdate={mockOnUpdate} />)

    const regenButton = screen.getByTitle('Gerar nova chave')
    await user.click(regenButton)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: expect.any(String),
        encrypted_secret: undefined,
      })
    )
    // Verify the generated secret is a 64-char hex string
    const call = mockOnUpdate.mock.calls[0][0]
    expect(call.secret).toHaveLength(64)
    expect(call.secret).toMatch(/^[0-9a-f]+$/)

    vi.unstubAllGlobals()
  })

  it('renders method select with correct value', () => {
    render(<WebhookTriggerConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('Método')).toBeInTheDocument()
    // There are 2 comboboxes (method + status code), method is the first one
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes[0]).toHaveTextContent('POST')
  })

  it('renders response status code as select with 200 OK', () => {
    render(<WebhookTriggerConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('Código de status da resposta')).toBeInTheDocument()
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes[1]).toHaveTextContent('200 OK')
  })

  it('renders status code 201 when configured', () => {
    const config201: WebhookTriggerConfig = {
      ...defaultConfig,
      response_status: 201,
    }

    render(<WebhookTriggerConfigForm config={config201} onUpdate={mockOnUpdate} />)

    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes[1]).toHaveTextContent('201 Created')
  })

  it('copies webhook URL to clipboard', () => {
    render(<WebhookTriggerConfigForm config={configWithTokenAndSecret} onUpdate={mockOnUpdate} />)

    const copyButton = screen.getByTitle('Copiar URL')
    fireEvent.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith(
      'http://localhost:3000/api/workflows/webhook/test-token-123'
    )
  })

  it('shows label "Secret key" without "(optional)"', () => {
    render(<WebhookTriggerConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('Chave secreta')).toBeInTheDocument()
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument()
  })
})
