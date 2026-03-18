'use client'

import { useState, useTransition } from 'react'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { approveMessage } from '@/lib/actions/modules'
import type { MessageApprovalOutput } from '@/lib/modules/output-schemas'

interface ArtifactApprovalProps {
  runOutputId: string
  data: MessageApprovalOutput
}

function formatScheduledFor(isoString: string): string {
  try {
    const date = new Date(isoString)
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    const day = date.toLocaleDateString('pt-BR', { weekday: 'long' })
    return `${day} ${hours}h${mins}`
  } catch {
    return isoString
  }
}

export default function ArtifactApproval({ runOutputId, data }: ArtifactApprovalProps) {
  const [isPending, startTransition] = useTransition()
  const [approved, setApproved] = useState(data.status === 'approved' || data.status === 'sent')
  const [error, setError] = useState<string | null>(null)

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveMessage(runOutputId)
      if (result.success) {
        setApproved(true)
      } else {
        setError(result.error ?? 'Erro ao aprovar mensagem')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* WhatsApp preview bubble */}
      <div className="mx-auto max-w-xs">
        <div className="overflow-hidden rounded-xl shadow-sm">
          {/* Green header */}
          <div className="bg-[#075E54] px-4 py-2">
            <p className="text-sm font-semibold text-white">{data.store_name}</p>
          </div>

          {/* Message body */}
          <div className="bg-[#DCF8C6] px-4 py-3 dark:bg-[#1a3a2a]">
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {data.template}
            </p>
            {/* Timestamp + checkmarks */}
            <div className="mt-1.5 flex items-center justify-end gap-1">
              <span className="text-muted-foreground text-[10px]">
                {formatScheduledFor(data.scheduled_for)}
              </span>
              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recipient count */}
      <p className="text-center text-sm">
        Enviar para <strong>{data.recipient_count} clientes</strong>
      </p>

      {/* Error */}
      {error && (
        <p className="text-destructive rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs dark:border-red-900/40 dark:bg-red-900/10">
          {error}
        </p>
      )}

      {/* Action buttons */}
      {approved ? (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-center dark:bg-green-900/10">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Mensagem aprovada e agendada
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="w-full" onClick={handleApprove} disabled={isPending}>
            {isPending
              ? 'Aprovando...'
              : `Aprovar e agendar para ${formatScheduledFor(data.scheduled_for)}`}
          </Button>
          <Button variant="outline" className="w-full" disabled={isPending}>
            Editar mensagem antes de enviar
          </Button>
        </div>
      )}
    </div>
  )
}
