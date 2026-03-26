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
import StoreSection from '@/components/settings/store-section'
import MessagingSection from '@/components/settings/messaging-section'
import { useSettingsData } from '@/hooks/use-settings-data'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSection?: SettingsSection
  profile: { fullName: string; email: string; avatarUrl: string | null }
  team: { name: string; slug: string } | null
  teamId?: string
  currentUserId: string
}

export default function SettingsDialog({
  open,
  onOpenChange,
  defaultSection = 'manage-apps',
  profile,
  team,
  teamId,
  currentUserId,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(defaultSection)
  const [prevDefault, setPrevDefault] = useState(defaultSection)
  if (defaultSection !== prevDefault) {
    setPrevDefault(defaultSection)
    setActiveSection(defaultSection)
  }

  const { data: settings } = useSettingsData(open)

  const usage = settings?.usage ?? null
  const planData = settings?.planData ?? null
  const members = settings?.members ?? []
  const invitations = settings?.invitations ?? []
  const currentUserRole = settings?.currentUserRole ?? 'member'
  const storeData = settings?.storeData ?? null

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
        return <ManageAppsSection teamId={teamId} planFeatures={planData?.features} />
      case 'general':
        return <GeneralSection name={team?.name ?? ''} slug={team?.slug ?? ''} />
      case 'members':
        return (
          <MembersSection
            members={members}
            invitations={invitations}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            planData={planData}
          />
        )
      case 'billing':
        return (
          <BillingSection
            teamId={teamId}
            stepsUsed={usage?.stepsUsed ?? 0}
            stepsLimit={usage?.stepsLimit ?? 0}
            aiCreditsUsed={usage?.aiCreditsUsed ?? 0}
            aiCreditsLimit={usage?.aiCreditsLimit ?? 0}
            planData={planData}
          />
        )
      case 'messaging':
        return <MessagingSection />
      case 'store':
        return <StoreSection storeData={storeData} teamId={teamId} />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your account and workspace settings
        </DialogDescription>
        <div className="flex h-[70dvh] flex-col sm:flex-row">
          <SettingsSidebar activeSection={activeSection} onSelect={setActiveSection} />
          <div className="flex-1 overflow-auto">{renderSection()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
