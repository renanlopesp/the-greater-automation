'use client'

import { useState } from 'react'
import { useArtifactNav } from '@/components/skill-workspace/artifact-nav-context'
import { getCampaignData, type SeasonalDate } from '@/data/campaign-data'
import { CalendarLevel1 } from './calendar-level1'
import { CalendarLevel2 } from './calendar-level2'
import { CalendarLevel3 } from './calendar-level3'

export default function CalendarArtifact() {
  const nav = useArtifactNav()
  const [selectedDate, setSelectedDate] = useState<SeasonalDate | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  function handleSelectDate(date: SeasonalDate) {
    setSelectedDate(date)
    nav.push(date.name)
  }

  function handleSelectSection(sectionType: string) {
    setSelectedSection(sectionType)
    nav.push(sectionType)
  }

  // depth 0 or 1 → list
  if (nav.depth <= 1) {
    return <CalendarLevel1 onSelectDate={handleSelectDate} />
  }

  // depth 2 → campaign detail
  if (nav.depth === 2 && selectedDate) {
    const campaign = getCampaignData(selectedDate.id)
    return (
      <CalendarLevel2
        date={selectedDate}
        campaign={campaign}
        onSelectSection={handleSelectSection}
      />
    )
  }

  // depth 3 → section content
  if (nav.depth >= 3 && selectedDate && selectedSection) {
    const campaign = getCampaignData(selectedDate.id)
    if (campaign) {
      return <CalendarLevel3 sectionType={selectedSection} campaign={campaign} />
    }
  }

  // fallback
  return <CalendarLevel1 onSelectDate={handleSelectDate} />
}
