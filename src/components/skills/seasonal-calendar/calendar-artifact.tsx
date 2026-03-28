'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useArtifactNav } from '@/components/skill-workspace/artifact-nav-context'
import type { FullCampaign, SeasonalDate } from '@/data/campaign-data'
import type { PersonalizedCalendar, PersonalizedDate } from '@/lib/ai/seasonal-campaign-generator'
import type { UseMutationResult } from '@tanstack/react-query'
import { CalendarLevel1 } from './calendar-level1'

const CalendarLevel2 = dynamic(() =>
  import('./calendar-level2').then((m) => ({ default: m.CalendarLevel2 }))
)
const CalendarLevel3 = dynamic(() =>
  import('./calendar-level3').then((m) => ({ default: m.CalendarLevel3 }))
)

interface CalendarArtifactProps {
  calendar: PersonalizedCalendar | null
  campaigns: Record<string, FullCampaign>
  isLoadingCalendar: boolean
  generateCalendar: UseMutationResult<unknown, Error, number | undefined>
  generateCampaign: UseMutationResult<unknown, Error, { dateId: string; dateName: string }>
  regenerateSection: UseMutationResult<unknown, Error, { dateId: string; sectionType: string }>
  isGeneratingCalendar: boolean
  isGeneratingCampaign: boolean
  isRegenerating: boolean
}

/** Convert a PersonalizedDate to a SeasonalDate shape for Level2/Level3 compatibility */
function toSeasonalDate(pd: PersonalizedDate): SeasonalDate {
  return {
    id: pd.id,
    name: pd.name,
    month: pd.month,
    day: parseInt(pd.day, 10),
    date: pd.displayDate,
    potentialValue: pd.potentialValue,
    status: 'pending',
  }
}

export default function CalendarArtifact({
  calendar,
  campaigns,
  isLoadingCalendar,
  generateCalendar,
  generateCampaign,
  regenerateSection,
  isGeneratingCalendar,
  isGeneratingCampaign,
  isRegenerating,
}: CalendarArtifactProps) {
  const nav = useArtifactNav()
  const [selectedDate, setSelectedDate] = useState<PersonalizedDate | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [brandDnaError, setBrandDnaError] = useState(false)
  const [campaignGenerationError, setCampaignGenerationError] = useState(false)
  const hasAutoTriggered = useRef(false)

  // Auto-trigger calendar generation on first render if no calendar exists
  useEffect(() => {
    if (!isLoadingCalendar && !calendar && !hasAutoTriggered.current && !isGeneratingCalendar) {
      hasAutoTriggered.current = true
      generateCalendar.mutate(undefined, {
        onError: (err) => {
          if (err.message?.toLowerCase().includes('brand dna')) {
            setBrandDnaError(true)
          }
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingCalendar, calendar, isGeneratingCalendar])

  function handleSelectDate(date: PersonalizedDate) {
    setSelectedDate(date)
    setCampaignGenerationError(false)
    nav.push(date.name)
  }

  function handleSelectSection(sectionType: string) {
    setSelectedSection(sectionType)
    nav.push(sectionType)
  }

  function handleGenerateCampaign() {
    if (!selectedDate) return
    setCampaignGenerationError(false)
    generateCampaign.mutate(
      { dateId: selectedDate.id, dateName: selectedDate.name },
      { onError: () => setCampaignGenerationError(true) }
    )
  }

  function handleRegenerateSection() {
    if (selectedDate && selectedSection) {
      regenerateSection.mutate({ dateId: selectedDate.id, sectionType: selectedSection })
    }
  }

  function handleRegenerateConcept() {
    if (selectedDate) {
      regenerateSection.mutate({ dateId: selectedDate.id, sectionType: 'concept' })
    }
  }

  // Brand DNA guard
  if (brandDnaError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="text-4xl">🧬</span>
        <h3 className="text-foreground text-lg font-medium">Análise de marca necessária</h3>
        <p className="text-muted-foreground max-w-sm text-sm">
          Para gerar um calendário personalizado, primeiro precisamos analisar o DNA da sua marca.
        </p>
      </div>
    )
  }

  // depth 0 or 1 → list
  if (nav.depth <= 1) {
    return (
      <CalendarLevel1
        dates={calendar?.dates ?? []}
        campaigns={campaigns}
        isLoadingCalendar={isLoadingCalendar || isGeneratingCalendar}
        calendar={calendar ?? null}
        generateCalendar={generateCalendar}
        onSelectDate={handleSelectDate}
      />
    )
  }

  // depth 2 → campaign detail
  if (nav.depth === 2 && selectedDate) {
    const campaign = campaigns[selectedDate.id] ?? null
    const seasonalDate = toSeasonalDate(selectedDate)
    return (
      <CalendarLevel2
        date={seasonalDate}
        campaign={campaign}
        onSelectSection={handleSelectSection}
        onGenerateCampaign={handleGenerateCampaign}
        onRegenerateConcept={handleRegenerateConcept}
        isGenerating={isGeneratingCampaign}
        isRegeneratingConcept={isRegenerating}
        generationError={campaignGenerationError}
      />
    )
  }

  // depth 3 → section content
  if (nav.depth >= 3 && selectedDate && selectedSection) {
    const campaign = campaigns[selectedDate.id] ?? null
    if (campaign) {
      return (
        <CalendarLevel3
          sectionType={selectedSection}
          campaign={campaign}
          onRegenerate={handleRegenerateSection}
          isRegenerating={isRegenerating}
        />
      )
    }
  }

  // fallback
  return (
    <CalendarLevel1
      dates={calendar?.dates ?? []}
      campaigns={campaigns}
      isLoadingCalendar={isLoadingCalendar || isGeneratingCalendar}
      calendar={calendar ?? null}
      generateCalendar={generateCalendar}
      onSelectDate={handleSelectDate}
    />
  )
}
