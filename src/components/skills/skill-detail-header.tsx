'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { activateSkill, deactivateSkill } from '@/lib/actions/skills'
import { useRouter } from 'next/navigation'

interface SkillDetailHeaderProps {
  teamId: string
  slug: string
  name: string
  description: string
  emoji: string
  colorBg: string
  isActive: boolean
}

export default function SkillDetailHeader({
  teamId,
  slug,
  name,
  description,
  emoji,
  colorBg,
  isActive: initialIsActive,
}: SkillDetailHeaderProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isActive, setIsActive] = useState(initialIsActive)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  function handleActivate() {
    startTransition(async () => {
      await activateSkill(slug)
      setIsActive(true)
      router.refresh()
    })
  }

  function handleDeactivateRequest() {
    setShowDeactivateConfirm(true)
  }

  function handleDeactivateConfirm() {
    startTransition(async () => {
      await deactivateSkill(slug)
      setIsActive(false)
      setShowDeactivateConfirm(false)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Back */}
      <Link
        href="/skills"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{ background: colorBg }}
          >
            {emoji}
          </div>
          <div>
            <h1 className="text-foreground text-2xl font-medium">{name}</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Activate / Deactivate */}
        <div className="shrink-0">
          {isActive ? (
            showDeactivateConfirm ? (
              <div className="border-border bg-background flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm">
                <span className="text-muted-foreground text-sm">Deactivate?</span>
                <button
                  onClick={handleDeactivateConfirm}
                  disabled={isPending}
                  className="text-destructive text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeactivateRequest}
                disabled={isPending}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50'
                )}
                style={{
                  borderColor: 'var(--green)',
                  color: 'var(--green)',
                  background: 'var(--green-bg)',
                }}
              >
                <Check className="h-4 w-4" />
                Active
              </button>
            )
          ) : (
            <button
              onClick={handleActivate}
              disabled={isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--blue)' }}
            >
              Activate skill
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
