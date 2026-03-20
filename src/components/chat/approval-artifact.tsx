'use client'

import { useState } from 'react'
import { Users, CheckCircle2, XCircle, Minus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WhatsAppBubblePreview } from './whatsapp-bubble-preview'
import { useLanguage } from '@/contexts/language-context'

interface Recipient {
  id: string
  name: string
  active: boolean
}

interface MessageTemplate {
  header?: string
  body: string
  footer?: string
  cta?: string
}

export interface ApprovalArtifactProps {
  recipients: Recipient[]
  messageTemplate: MessageTemplate
  meta?: Array<{ label: string; value: string }>
  onApprove?: (recipientIds: string[]) => void
  onReject?: () => void
}

type ApprovalState = 'pending' | 'approved' | 'rejected'

export function ApprovalArtifact({
  recipients,
  messageTemplate,
  meta,
  onApprove,
  onReject,
}: ApprovalArtifactProps) {
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [approvalState, setApprovalState] = useState<ApprovalState>('pending')
  const [approvedCount, setApprovedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()
  const isEn = t('nav.home') === 'Home'

  const activeRecipients = recipients.filter((r) => !removedIds.has(r.id))

  function toggleRecipient(id: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleApprove() {
    if (activeRecipients.length === 0) return
    setLoading(true)
    try {
      const ids = activeRecipients.map((r) => r.id)
      const res = await fetch('/api/approvals/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: crypto.randomUUID(),
          recipientIds: ids,
          action: 'approve',
        }),
      })
      if (res.ok) {
        setApprovedCount(ids.length)
        setApprovalState('approved')
        onApprove?.(ids)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await fetch('/api/approvals/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: crypto.randomUUID(),
          recipientIds: [],
          action: 'reject',
        }),
      })
      setApprovalState('rejected')
      onReject?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      {/* Two-column: recipients + preview — stacked on mobile */}
      <div className="divide-border border-border grid grid-cols-1 divide-y border-b md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* Left — recipients list */}
        <div className="flex flex-col">
          <div className="border-border/50 flex items-center justify-between border-b px-4 pt-3 pb-2">
            <div className="flex items-center gap-1.5">
              <Users className="text-muted-foreground h-3 w-3" />
              <span className="text-foreground/70 text-[11px] font-medium">
                {isEn ? 'Recipients' : 'Destinatários'}
              </span>
            </div>
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {activeRecipients.length}/{recipients.length}
            </span>
          </div>
          <div className="max-h-[320px] flex-1 overflow-y-auto">
            {recipients.map((r) => {
              const removed = removedIds.has(r.id)
              return (
                <div
                  key={r.id}
                  className={cn(
                    'group border-border/50 flex items-center gap-2 border-b px-4 py-2.5 transition-colors last:border-0',
                    removed ? 'opacity-40' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-[12px] leading-tight font-medium',
                        removed ? 'text-muted-foreground line-through' : 'text-foreground/80'
                      )}
                    >
                      {r.name}
                    </p>
                  </div>
                  {approvalState === 'pending' && (
                    <button
                      onClick={() => toggleRecipient(r.id)}
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                        removed
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                          : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100'
                      )}
                      title={
                        removed ? (isEn ? 'Re-include' : 'Reincluir') : isEn ? 'Remove' : 'Remover'
                      }
                    >
                      {removed ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : (
                        <Minus className="h-2.5 w-2.5" />
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — message preview */}
        <div className="flex flex-col">
          <div className="border-border/50 border-b px-4 pt-3 pb-2">
            <span className="text-foreground/70 text-[11px] font-medium">
              {isEn ? 'Preview' : 'Pré-visualização'}
            </span>
          </div>
          <div className="px-4 py-4">
            <WhatsAppBubblePreview
              header={messageTemplate.header}
              body={messageTemplate.body}
              footer={messageTemplate.footer}
              cta={messageTemplate.cta}
            />
          </div>
        </div>
      </div>

      {/* Meta */}
      {meta && meta.length > 0 && (
        <div className="border-border border-b px-5 py-4">
          <div className="border-border overflow-hidden rounded-xl border">
            {meta.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 text-[12px]',
                  i < meta.length - 1 ? 'border-border border-b' : ''
                )}
              >
                <span className="text-muted-foreground">{m.label}</span>
                <span className="text-foreground/70 font-medium">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {approvalState === 'pending' && (
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={handleApprove}
            disabled={activeRecipients.length === 0 || loading}
            className="bg-foreground text-background flex h-9 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isEn
              ? `Approve for ${activeRecipients.length} ${activeRecipients.length === 1 ? 'recipient' : 'recipients'}`
              : `Aprovar para ${activeRecipients.length} ${activeRecipients.length === 1 ? 'destinatário' : 'destinatários'}`}
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="text-muted-foreground border-border hover:bg-muted flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] transition-colors disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            {isEn ? 'Reject' : 'Rejeitar'}
          </button>
        </div>
      )}

      {approvalState === 'approved' && (
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <CheckCircle2 className="text-foreground/60 h-4 w-4" />
          <span className="text-foreground/60 text-[13px]">
            {isEn
              ? `Campaign approved — sending started for ${approvedCount} contacts`
              : `Campanha aprovada — envio iniciado para ${approvedCount} contatos`}
          </span>
        </div>
      )}

      {approvalState === 'rejected' && (
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <XCircle className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-[13px]">
            {isEn ? 'Campaign rejected' : 'Campanha rejeitada'}
          </span>
        </div>
      )}
    </div>
  )
}
