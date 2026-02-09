'use client'

import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface AddStepButtonProps {
  onClick: () => void
}

export default function AddStepButton({ onClick }: AddStepButtonProps) {
  return (
    <Card className="w-full max-w-[520px] gap-0 rounded-lg py-0 shadow-sm">
      <button
        type="button"
        onClick={onClick}
        className="text-primary hover:bg-muted/20 flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        Add step
      </button>
    </Card>
  )
}
