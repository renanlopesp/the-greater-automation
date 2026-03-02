'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SharingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
}

export default function SharingDialog({ open, onOpenChange, workflowId }: SharingDialogProps) {
  const [accessLevel, setAccessLevel] = useState<'private' | 'team' | 'public'>('private')
  const [copied, setCopied] = useState(false)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/workflows/${workflowId}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar automação</DialogTitle>
          <DialogDescription>Controle quem pode acessar e editar esta automação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Nível de acesso</Label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="access"
                  value="private"
                  checked={accessLevel === 'private'}
                  onChange={() => setAccessLevel('private')}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Privado</div>
                  <div className="text-muted-foreground text-xs">Somente você pode acessar</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="access"
                  value="team"
                  checked={accessLevel === 'team'}
                  onChange={() => setAccessLevel('team')}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Equipe</div>
                  <div className="text-muted-foreground text-xs">
                    Sua equipe pode visualizar e editar
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="access"
                  value="public"
                  checked={accessLevel === 'public'}
                  onChange={() => setAccessLevel('public')}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Público</div>
                  <div className="text-muted-foreground text-xs">Qualquer pessoa com o link</div>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-url">Link de compartilhamento</Label>
            <div className="flex gap-2">
              <Input id="share-url" value={shareUrl} readOnly className="flex-1" />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {accessLevel === 'team' && (
            <div className="space-y-2">
              <Label>Membros da equipe</Label>
              <div className="text-muted-foreground rounded-md border p-3 text-sm">
                Gerenciamento de membros em breve...
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
