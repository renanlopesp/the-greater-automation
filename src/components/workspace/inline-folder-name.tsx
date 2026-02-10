'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { renameFolder } from '@/lib/actions/workspace'

interface InlineFolderNameProps {
  folderId: string
  name: string
}

export function InlineFolderName({ folderId, name }: InlineFolderNameProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  async function handleSave() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== name) {
      const result = await renameFolder(folderId, trimmed)
      if (result.error) {
        toast.error(result.error)
        setEditValue(name)
      }
    } else {
      setEditValue(name)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') {
            setEditValue(name)
            setIsEditing(false)
          }
        }}
        onBlur={handleSave}
        className="bg-background focus:ring-ring h-7 w-full rounded border px-1.5 text-sm font-semibold outline-none focus:ring-1"
        maxLength={100}
      />
    )
  }

  return (
    <span
      className="text-sm font-semibold"
      onDoubleClick={() => {
        setEditValue(name)
        setIsEditing(true)
      }}
    >
      {name}
    </span>
  )
}
