'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'S'], mac: ['⌘', 'S'], description: 'Save workflow' },
  { keys: ['Ctrl', 'Z'], mac: ['⌘', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], mac: ['⌘', '⇧', 'Z'], description: 'Redo' },
  { keys: ['Delete'], mac: ['⌫'], description: 'Delete selected step' },
  { keys: ['Backspace'], mac: ['⌫'], description: 'Delete selected step' },
  { keys: ['Esc'], mac: ['Esc'], description: 'Deselect step' },
  { keys: ['?'], mac: ['?'], description: 'Show keyboard shortcuts' },
]

export default function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Boost your productivity with these shortcuts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-muted-foreground text-sm">{shortcut.description}</span>
              <div className="flex gap-1">
                {(isMac ? shortcut.mac : shortcut.keys).map((key, i) => (
                  <kbd key={i} className="bg-muted rounded border px-2 py-1 text-xs font-semibold">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
