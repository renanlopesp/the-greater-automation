'use client'

import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const MAX_STARTERS = 4

interface StarterEditorProps {
  starters: string[]
  onChange: (starters: string[]) => void
}

export default function StarterEditor({ starters, onChange }: StarterEditorProps) {
  function handleUpdate(index: number, value: string) {
    const next = [...starters]
    next[index] = value
    onChange(next)
  }

  function handleRemove(index: number) {
    onChange(starters.filter((_, i) => i !== index))
  }

  function handleAdd() {
    if (starters.length < MAX_STARTERS) {
      onChange([...starters, ''])
    }
  }

  return (
    <div className="space-y-2">
      {starters.map((starter, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={starter}
            onChange={(e) => handleUpdate(index, e.target.value)}
            placeholder={`Starter ${index + 1}`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
            onClick={() => handleRemove(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {starters.length < MAX_STARTERS && (
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add starter
        </Button>
      )}
    </div>
  )
}
