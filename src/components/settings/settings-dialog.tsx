'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import SettingsSidebar, { type SettingsSection } from '@/components/settings/settings-sidebar'
import ManageAppsSection from '@/components/settings/manage-apps-section'
import AccountSection from '@/components/settings/account-section'
import NotificationsSection from '@/components/settings/notifications-section'
import GeneralSection from '@/components/settings/general-section'
import MembersSection from '@/components/settings/members-section'
import BillingSection from '@/components/settings/billing-section'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSection?: SettingsSection
  profile: { fullName: string; email: string; avatarUrl: string | null }
  team: { name: string; slug: string } | null
  usage: {
    stepsUsed: number
    stepsLimit: number
    aiCreditsUsed: number
    aiCreditsLimit: number
  } | null
  members: { id: string; fullName: string; email: string; role: 'owner' | 'admin' | 'member' }[]
}

export default function SettingsDialog({
  open,
  onOpenChange,
  defaultSection = 'manage-apps',
  profile,
  team,
  usage,
  members,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(defaultSection)

  function renderSection() {
    switch (activeSection) {
      case 'account':
        return (
          <AccountSection
            fullName={profile.fullName}
            email={profile.email}
            avatarUrl={profile.avatarUrl}
          />
        )
      case 'notifications':
        return <NotificationsSection />
      case 'manage-apps':
        return <ManageAppsSection />
      case 'general':
        return <GeneralSection name={team?.name ?? ''} slug={team?.slug ?? ''} />
      case 'members':
        return <MembersSection members={members} />
      case 'billing':
        return (
          <BillingSection
            stepsUsed={usage?.stepsUsed ?? 0}
            stepsLimit={usage?.stepsLimit ?? 0}
            aiCreditsUsed={usage?.aiCreditsUsed ?? 0}
            aiCreditsLimit={usage?.aiCreditsLimit ?? 0}
          />
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your account and workspace settings
        </DialogDescription>
        <div className="flex h-[70vh]">
          <SettingsSidebar activeSection={activeSection} onSelect={setActiveSection} />
          <div className="flex-1 overflow-auto">{renderSection()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
