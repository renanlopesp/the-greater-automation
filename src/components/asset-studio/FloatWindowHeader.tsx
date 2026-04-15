'use client'

import React from 'react'
import { X } from 'lucide-react'

interface FloatWindowHeaderProps {
  title: string
  onClose: () => void
  onDragStart: (e: React.MouseEvent) => void
}

export const FloatWindowHeader: React.FC<FloatWindowHeaderProps> = ({
  title,
  onClose,
  onDragStart,
}) => (
  <div
    className="float-window-title"
    onMouseDown={(e) => {
      if ((e.target as HTMLElement).closest('button')) return
      onDragStart(e)
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px 8px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      userSelect: 'none',
    }}
  >
    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{title}</span>
    <button
      onClick={onClose}
      style={{
        background: 'none',
        border: 'none',
        padding: 2,
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.5)',
        display: 'flex',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
    >
      <X size={15} />
    </button>
  </div>
)
