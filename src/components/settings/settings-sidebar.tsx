'use client'

import { cn } from '@/lib/utils'

export type SettingsSection =
  | 'account'
  | 'notifications'
  | 'manage-apps'
  | 'general'
  | 'members'
  | 'billing'

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSelect: (section: SettingsSection) => void
}

const SECTIONS: { group: string; items: { id: SettingsSection; label: string }[] }[] = [
  {
    group: 'PERSONAL',
    items: [
      { id: 'account', label: 'Account' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'manage-apps', label: 'Manage apps' },
    ],
  },
  {
    group: 'WORKSPACE',
    items: [
      { id: 'general', label: 'General' },
      { id: 'members', label: 'Members' },
      { id: 'billing', label: 'Billing' },
    ],
  },
]

export default function SettingsSidebar({ activeSection, onSelect }: SettingsSidebarProps) {
  return (
    <nav className="border-border flex w-full shrink-0 flex-col gap-6 border-b p-4 sm:w-56 sm:border-r sm:border-b-0">
      {SECTIONS.map((group) => (
        <div key={group.group} className="flex flex-col gap-1">
          <span className="text-muted-foreground px-2 text-xs font-medium">{group.group}</span>
          {group.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                activeSection === item.id ? 'bg-muted font-medium' : 'hover:bg-muted/50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}
