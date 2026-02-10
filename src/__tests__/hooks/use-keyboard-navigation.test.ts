import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation'
import type { KeyboardEvent } from 'react'

function makeKeyEvent(key: string): KeyboardEvent {
  return { key, preventDefault: vi.fn() } as unknown as KeyboardEvent
}

describe('useKeyboardNavigation', () => {
  const defaultOpts = {
    itemCount: 5,
    onOpen: vi.fn(),
    onDelete: vi.fn(),
    onSelect: vi.fn(),
  }

  it('ArrowDown increments focused index', () => {
    const { result } = renderHook(() => useKeyboardNavigation(defaultOpts))
    act(() => {
      result.current.onKeyDown(makeKeyEvent('ArrowDown'))
    })
    expect(result.current.focusedIndex).toBe(0)
    act(() => {
      result.current.onKeyDown(makeKeyEvent('ArrowDown'))
    })
    expect(result.current.focusedIndex).toBe(1)
  })

  it('ArrowUp decrements focused index', () => {
    const { result } = renderHook(() => useKeyboardNavigation(defaultOpts))
    act(() => {
      result.current.setFocusedIndex(3)
    })
    act(() => {
      result.current.onKeyDown(makeKeyEvent('ArrowUp'))
    })
    expect(result.current.focusedIndex).toBe(2)
  })

  it('clamps index to bounds', () => {
    const { result } = renderHook(() => useKeyboardNavigation(defaultOpts))
    // Should not go below 0
    act(() => {
      result.current.onKeyDown(makeKeyEvent('ArrowUp'))
    })
    expect(result.current.focusedIndex).toBe(0)

    // Should not exceed itemCount - 1
    act(() => {
      result.current.setFocusedIndex(4)
    })
    act(() => {
      result.current.onKeyDown(makeKeyEvent('ArrowDown'))
    })
    expect(result.current.focusedIndex).toBe(4)
  })

  it('Enter calls onOpen with focused index', () => {
    const onOpen = vi.fn()
    const { result } = renderHook(() => useKeyboardNavigation({ ...defaultOpts, onOpen }))
    act(() => {
      result.current.setFocusedIndex(2)
    })
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Enter'))
    })
    expect(onOpen).toHaveBeenCalledWith(2)
  })

  it('Delete calls onDelete with focused index', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useKeyboardNavigation({ ...defaultOpts, onDelete }))
    act(() => {
      result.current.setFocusedIndex(1)
    })
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'))
    })
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it('Space calls onSelect with focused index', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useKeyboardNavigation({ ...defaultOpts, onSelect }))
    act(() => {
      result.current.setFocusedIndex(3)
    })
    act(() => {
      result.current.onKeyDown(makeKeyEvent(' '))
    })
    expect(onSelect).toHaveBeenCalledWith(3)
  })

  it('Escape clears focused index', () => {
    const { result } = renderHook(() => useKeyboardNavigation(defaultOpts))
    act(() => {
      result.current.setFocusedIndex(2)
    })
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Escape'))
    })
    expect(result.current.focusedIndex).toBe(-1)
  })

  it('does nothing when itemCount is 0', () => {
    const onOpen = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ ...defaultOpts, itemCount: 0, onOpen })
    )
    act(() => {
      result.current.onKeyDown(makeKeyEvent('ArrowDown'))
    })
    expect(result.current.focusedIndex).toBe(-1)
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Enter'))
    })
    expect(onOpen).not.toHaveBeenCalled()
  })
})
