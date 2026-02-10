'use client'

import { FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { FolderTreeNode } from '@/lib/queries/workspace'

interface FolderTreePickerProps {
  tree: FolderTreeNode[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function TreeNode({
  node,
  selectedId,
  onSelect,
}: {
  node: FolderTreeNode
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.id

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? expanded : undefined}
    >
      <button
        type="button"
        className={cn(
          'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          isSelected && 'bg-accent font-medium'
        )}
        style={{ paddingLeft: `${(node.depth + 1) * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 p-0.5"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        <FolderOpen className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && expanded && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FolderTreePicker({ tree, selectedId, onSelect }: FolderTreePickerProps) {
  return (
    <div role="tree" aria-label="Folder tree" className="max-h-[300px] overflow-y-auto">
      <button
        type="button"
        className={cn(
          'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          selectedId === null && 'bg-accent font-medium'
        )}
        onClick={() => onSelect(null)}
      >
        <span className="w-4.5" />
        <FolderOpen className="text-muted-foreground h-4 w-4 shrink-0" />
        <span>Root (no folder)</span>
      </button>
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  )
}
