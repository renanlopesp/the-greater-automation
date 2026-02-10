'use client'

import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { WorkspaceFolder } from '@/lib/queries/workspace'

interface FolderBreadcrumbProps {
  currentFolderId: string
  folders: WorkspaceFolder[]
  onNavigate: (folderId: string | null) => void
}

export function FolderBreadcrumb({ currentFolderId, folders, onNavigate }: FolderBreadcrumbProps) {
  // Build path from current folder to root
  const path: WorkspaceFolder[] = []
  let current = folders.find((f) => f.id === currentFolderId)
  while (current) {
    path.unshift(current)
    current = current.parent_id ? folders.find((f) => f.id === current!.parent_id) : undefined
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink className="cursor-pointer" onClick={() => onNavigate(null)}>
            Workspace
          </BreadcrumbLink>
        </BreadcrumbItem>
        {path.map((folder, i) => {
          const isLast = i === path.length - 1
          return (
            <Fragment key={folder.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink className="cursor-pointer" onClick={() => onNavigate(folder.id)}>
                    {folder.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
