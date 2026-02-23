'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StoreNameStepProps {
  value: string
  onChange: (value: string) => void
}

export function StoreNameStep({ value, onChange }: StoreNameStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">What&apos;s your store name?</h2>
        <p className="text-muted-foreground">This name will appear in your reports and alerts.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="store-name">Store name</Label>
        <Input
          id="store-name"
          placeholder="e.g. Fashion Express, TechStore, Pet & Co"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          maxLength={100}
        />
      </div>
    </div>
  )
}
