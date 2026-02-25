'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, Loader2, MessageCircle, Unlink } from 'lucide-react'

type LinkStatus =
  | { status: 'not_linked' }
  | { status: 'pending'; linkId: string }
  | {
      status: 'linked'
      linkId: string
      telegramUsername: string | null
      conversationId: string | null
      createdAt: string
    }

export default function MessagingPage() {
  const [code, setCode] = useState<string | null>(null)
  const [instructions, setInstructions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: linkStatus = null } = useQuery<LinkStatus>({
    queryKey: ['messaging-link'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/link')
      const data = (await res.json()) as LinkStatus
      // Stop polling when linked
      if (data.status === 'linked') setCode(null)
      return data
    },
    refetchInterval: code ? 3000 : false,
    refetchIntervalInBackground: false,
  })

  async function handleGenerateCode() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/link', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate code')
        return
      }
      setCode(data.code)
      setInstructions(data.instructions)
      queryClient.invalidateQueries({ queryKey: ['messaging-link'] })
    } catch {
      setError('Failed to generate code')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleUnlink() {
    setIsUnlinking(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/link', { method: 'DELETE' })
      if (!res.ok) {
        setError('Failed to unlink')
        return
      }
      queryClient.setQueryData(['messaging-link'], { status: 'not_linked' })
      setCode(null)
    } catch {
      setError('Failed to unlink')
    } finally {
      setIsUnlinking(false)
    }
  }

  function handleCopyCode() {
    if (!code) return
    navigator.clipboard.writeText(`/link ${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!linkStatus) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 pt-12 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Messaging</h1>
        <p className="text-muted-foreground text-sm">
          Connect your Telegram to manage your entire workspace from anywhere
        </p>
      </div>

      {/* Linked state */}
      {linkStatus.status === 'linked' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="size-5" />
                Telegram Connected
              </CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
            <CardDescription>
              Your Telegram is linked to your workspace. You can manage agents, workflows, and
              skills directly from Telegram.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="bg-muted rounded-lg p-4 text-sm">
              {linkStatus.telegramUsername && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram</span>
                  <span className="font-medium">@{linkStatus.telegramUsername}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Linked</span>
                <span className="font-medium">
                  {new Date(linkStatus.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={isUnlinking}
              className="text-destructive"
            >
              {isUnlinking ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 size-4" />
              )}
              Unlink Telegram
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Not linked / Pending states */}
      {(linkStatus.status === 'not_linked' || linkStatus.status === 'pending') && (
        <Card>
          <CardHeader>
            <CardTitle>Link your Telegram</CardTitle>
            <CardDescription>
              Connect your Telegram account to manage your workspace via chat — create agents,
              workflows, check integrations, and more.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Verification code */}
            {code && (
              <div className="flex flex-col gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">Your verification code</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-3xl font-bold tracking-widest">{code}</code>
                    <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                      {copied ? (
                        <Check className="size-4 text-green-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Instructions</p>
                  <ol className="text-muted-foreground list-inside list-decimal text-sm">
                    {instructions.map((step) => (
                      <li key={step} className="py-0.5">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="text-primary size-4 animate-spin" />
                  <span className="text-muted-foreground">Waiting for verification...</span>
                </div>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
          <CardFooter className="justify-end">
            {!code ? (
              <Button onClick={handleGenerateCode} disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Generate Code
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setCode(null)}>
                Cancel
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
