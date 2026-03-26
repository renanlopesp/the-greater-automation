'use client'

import { useState, useCallback, useRef } from 'react'

type StepStatus = {
  step: number
  status: 'pending' | 'running' | 'completed' | 'error'
  message: string
  count?: number
}

const INITIAL_STEPS: StepStatus[] = [
  { step: 1, status: 'pending', message: 'Sincronizando produtos...' },
  { step: 2, status: 'pending', message: 'Analisando identidade visual...' },
  { step: 3, status: 'pending', message: 'Gerando Brand DNA...' },
  { step: 4, status: 'pending', message: 'Mapeando oportunidades sazonais...' },
]

export function useOnboardingAnalysis() {
  const [steps, setSteps] = useState<StepStatus[]>(INITIAL_STEPS)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brandDnaId, setBrandDnaId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setIsComplete(false)

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/onboarding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to start analysis')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ') && currentEvent) {
            const data = JSON.parse(line.slice(6)) as Record<string, unknown>

            if (currentEvent === 'step') {
              setSteps((prev) =>
                prev.map((s) =>
                  s.step === (data.step as number) ? { ...s, ...(data as Partial<StepStatus>) } : s
                )
              )
            } else if (currentEvent === 'done') {
              setBrandDnaId(data.brandDnaId as string)
              setIsComplete(true)
            } else if (currentEvent === 'error') {
              setError(data.message as string)
            }
            currentEvent = ''
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    }
  }, [])

  const retry = useCallback(() => {
    setSteps(INITIAL_STEPS)
    setError(null)
    setIsComplete(false)
    setBrandDnaId(null)
    start()
  }, [start])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { steps, isComplete, error, brandDnaId, start, retry, cancel }
}
