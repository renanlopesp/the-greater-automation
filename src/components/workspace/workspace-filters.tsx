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
  onFiltersChange: (filters: WorkspaceFiltersState) => void
  teamMembers: { id: string; full_name: string | null }[]
}

export default function WorkspaceFilters({
  filters,
  onFiltersChange,
  teamMembers,
}: WorkspaceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.createdBy}
        onValueChange={(v) => onFiltersChange({ ...filters, createdBy: v })}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Created by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All members</SelectItem>
          {teamMembers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name ?? 'Unknown'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="published">Published</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(v) => onFiltersChange({ ...filters, type: v })}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="agent">Agents</SelectItem>
          <SelectItem value="workflow">Workflows</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
