'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Trash2 } from 'lucide-react'

interface SnewclawActionsProps {
  instanceId: string
  status: string
}

export default function SnewclawActions({ instanceId, status }: SnewclawActionsProps) {
  const router = useRouter()
  const [isDestroying, setIsDestroying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDestroy() {
    setIsDestroying(true)
    setError(null)
    try {
      const res = await fetch(`/api/snewclaw/${instanceId}/destroy`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => 'Destroy failed')
        setError(text)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Destroy failed')
    } finally {
      setIsDestroying(false)
    }
  }

  const isDestroyDisabled = isDestroying || status === 'destroying' || status === 'provisioning'

  return (
    <div className="flex items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isDestroyDisabled}>
            {isDestroying ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Destroy
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destroy agent instance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your agent instance, including its data volume. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDestroy()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Destroy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
