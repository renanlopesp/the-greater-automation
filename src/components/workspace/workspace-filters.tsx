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
          placeholder="Buscar na área de trabalho"
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
          <SelectValue placeholder="Criado por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Criado por</SelectItem>
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
          <SelectItem value="draft">Rascunho</SelectItem>
          <SelectItem value="published">Publicado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.type || undefined}
        onValueChange={(v) => onFiltersChange({ type: v === 'all' ? '' : v })}
      >
        <SelectTrigger size="sm" className="bg-background w-full sm:w-[100px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tipo</SelectItem>
          <SelectItem value="agent">Agentes</SelectItem>
          <SelectItem value="workflow">Automações</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
