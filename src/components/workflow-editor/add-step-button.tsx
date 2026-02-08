'use client'

import { Plus } from 'lucide-react'

interface AddStepButtonProps {
  onClick: () => void
}

export default function AddStepButton({ onClick }: AddStepButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-muted-foreground/25 hover:border-primary hover:text-primary text-muted-foreground mx-auto flex max-w-[400px] items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-3 text-sm transition-colors"
    >
      <Plus className="h-4 w-4" />
      Add step
    </button>
  )
}
