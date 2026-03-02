'use client'

import { FolderOpen, ChevronRight, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WorkspaceFolder, FolderTreeNode } from '@/lib/queries/workspace'

interface FolderSidebarProps {
  folders: WorkspaceFolder[]
  folderTree: FolderTreeNode[]
  currentFolderId: string | null
  onNavigate: (folderId: string | null) => void
  onCreateFolder: () => void
  onDeleteFolder: (folderId: string) => void
  onRenameFolder?: (folderId: string) => void
}

function FolderNode({
  node,
  depth,
  currentFolderId,
  folders,
  onNavigate,
  onDeleteFolder,
  onRenameFolder,
}: {
  node: FolderTreeNode
  depth: number
  currentFolderId: string | null
  folders: WorkspaceFolder[]
  onNavigate: (folderId: string | null) => void
  onDeleteFolder: (folderId: string) => void
  onRenameFolder?: (folderId: string) => void
}) {
  const isActive = currentFolderId === node.id
  const folder = folders.find((f) => f.id === node.id)
  const workflowCount = folder?.workflow_count ?? 0

  return (
    <>
      <div
        className={cn(
          'group flex w-full items-center gap-2 rounded-md py-1.5 pr-1 text-sm transition-colors',
          'hover:bg-accent',
          isActive && 'bg-accent font-medium'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <button
          onClick={() => onNavigate(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {node.children.length > 0 ? (
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <FolderOpen className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
          <span className="text-muted-foreground ml-auto text-xs">{workflowCount}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground ml-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {onRenameFolder && (
              <DropdownMenuItem onClick={() => onRenameFolder(node.id)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteFolder(node.id)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {node.children.map((child) => (
        <FolderNode
          key={child.id}
          node={child}
          depth={depth + 1}
          currentFolderId={currentFolderId}
          folders={folders}
          onNavigate={onNavigate}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
        />
      ))}
    </>
  )
}

export function FolderSidebar({
  folders,
  folderTree,
  currentFolderId,
  onNavigate,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: FolderSidebarProps) {
  return (
    <div className="bg-background flex w-56 shrink-0 flex-col rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Folders
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateFolder}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto p-2">
        <button
          onClick={() => onNavigate(null)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            'hover:bg-accent',
            currentFolderId === null && 'bg-accent font-medium'
          )}
        >
          <span className="w-3.5 shrink-0" />
          <FolderOpen className="text-muted-foreground h-4 w-4 shrink-0" />
          <span>Todos os itens</span>
        </button>
        {folderTree.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            depth={0}
            currentFolderId={currentFolderId}
            folders={folders}
            onNavigate={onNavigate}
            onDeleteFolder={onDeleteFolder}
            onRenameFolder={onRenameFolder}
          />
        ))}
        {folderTree.length === 0 && (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">Nenhuma pasta ainda</p>
        )}
      </div>
    </div>
  )
}
