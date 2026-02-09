'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface WorkspaceFiltersState {
  search: string
  createdBy: string
  status: string
  type: string
}

interface WorkspaceFiltersProps {
  filters: WorkspaceFiltersState
  onFiltersChange: (filters: Partial<WorkspaceFiltersState>) => void
  teamMembers: { id: string; full_name: string | null }[]
}

export default function WorkspaceFilters({
  filters,
  onFiltersChange,
  teamMembers,
}: WorkspaceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search workspace"
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          className="bg-background h-8 w-full pl-9 sm:w-[320px]"
        />
      </div>

      <Select
        value={filters.createdBy || undefined}
        onValueChange={(v) => onFiltersChange({ createdBy: v === 'all' ? '' : v })}
      >
        <SelectTrigger size="sm" className="bg-background w-full sm:w-[140px]">
          <SelectValue placeholder="Created by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Created by</SelectItem>
          {teamMembers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name ?? 'Unknown'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status || undefined}
        onValueChange={(v) => onFiltersChange({ status: v === 'all' ? '' : v })}
      >
        <SelectTrigger size="sm" className="bg-background w-full sm:w-[110px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="published">Published</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.type || undefined}
        onValueChange={(v) => onFiltersChange({ type: v === 'all' ? '' : v })}
      >
        <SelectTrigger size="sm" className="bg-background w-full sm:w-[100px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Type</SelectItem>
          <SelectItem value="agent">Agents</SelectItem>
          <SelectItem value="workflow">Workflows</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
