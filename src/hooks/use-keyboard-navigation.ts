'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'

interface UseKeyboardNavigationOptions {
  itemCount: number
  onOpen: (index: number) => void
  onDelete: (index: number) => void
  onSelect: (index: number) => void
}

export function useKeyboardNavigation({
  itemCount,
  onOpen,
  onDelete,
  onSelect,
}: UseKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (itemCount === 0) return

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, itemCount - 1))
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < itemCount) {
            onOpen(focusedIndex)
          }
          break
        }
        case 'Delete':
        case 'Backspace': {
          if (focusedIndex >= 0 && focusedIndex < itemCount) {
            onDelete(focusedIndex)
          }
          break
        }
        case 'Escape': {
          setFocusedIndex(-1)
          break
        }
        case ' ': {
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < itemCount) {
            onSelect(focusedIndex)
          }
          break
        }
      }
    },
    [itemCount, focusedIndex, onOpen, onDelete, onSelect]
  )

  return { focusedIndex, setFocusedIndex, onKeyDown }
}
