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
  { keys: ['Ctrl', 'S'], mac: ['⌘', 'S'], description: 'Salvar automação' },
  { keys: ['Ctrl', 'Z'], mac: ['⌘', 'Z'], description: 'Desfazer' },
  { keys: ['Ctrl', 'Shift', 'Z'], mac: ['⌘', '⇧', 'Z'], description: 'Refazer' },
  { keys: ['Delete'], mac: ['⌫'], description: 'Excluir etapa selecionada' },
  { keys: ['Backspace'], mac: ['⌫'], description: 'Excluir etapa selecionada' },
  { keys: ['Esc'], mac: ['Esc'], description: 'Desselecionar etapa' },
  { keys: ['?'], mac: ['?'], description: 'Mostrar atalhos de teclado' },
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
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>Aumente sua produtividade com estes atalhos.</DialogDescription>
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
