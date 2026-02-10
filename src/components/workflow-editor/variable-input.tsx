'use client'

import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { VariablePicker } from './variable-picker'

interface VariableInputProps {
  value: string
  onChange: (value: string) => void
  currentStepPosition: number
  multiline?: boolean
  placeholder?: string
  label?: string
}

export function VariableInput({
  value,
  onChange,
  currentStepPosition,
  multiline = false,
  placeholder,
  label,
}: VariableInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPosition, setCursorPosition] = useState<number>(0)

  const handleInsertVariable = (variable: string) => {
    const insertText = `{{${variable}}}`
    const ref = multiline ? textareaRef.current : inputRef.current

    if (ref) {
      const start = ref.selectionStart || cursorPosition
      const end = ref.selectionEnd || cursorPosition
      const newValue = value.substring(0, start) + insertText + value.substring(end)

      onChange(newValue)

      // Set cursor position after the inserted variable
      setTimeout(() => {
        const newCursorPos = start + insertText.length
        ref.setSelectionRange(newCursorPos, newCursorPos)
        ref.focus()
      }, 0)
    } else {
      // Fallback: append to end
      onChange(value + insertText)
    }
  }

  const handleInputChange = (newValue: string) => {
    onChange(newValue)
  }

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart || 0)
  }

  const InputComponent = multiline ? Textarea : Input

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative flex items-start gap-2">
        <InputComponent
          ref={(multiline ? textareaRef : inputRef) as never}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onSelect={handleSelect}
          placeholder={placeholder}
          className="flex-1"
        />
        <div className="shrink-0">
          <VariablePicker
            currentStepPosition={currentStepPosition}
            onInsert={handleInsertVariable}
          />
        </div>
      </div>
    </div>
  )
}
