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

export interface RunsFiltersState {
  search: string
  status: string
  workflowId: string
}

interface RunsFiltersProps {
  filters: RunsFiltersState
  onFiltersChange: (filters: RunsFiltersState) => void
  workflows: { id: string; name: string }[]
}

export default function RunsFilters({ filters, onFiltersChange, workflows }: RunsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder="Search runs..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-[200px] pl-9"
        />
      </div>
      <Select
        value={filters.status}
        onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="running">Running</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.workflowId}
        onValueChange={(v) => onFiltersChange({ ...filters, workflowId: v })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All workflows" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All workflows</SelectItem>
          {workflows.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
