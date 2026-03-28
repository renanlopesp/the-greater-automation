# Data Model: Seasonal Calendar AI Integration

**Feature**: 044-seasonal-calendar-ai
**Date**: 2026-03-27 (v2 — personalized calendar)

## Existing Tables (No Changes)

### `skill_executions`

Used to store both personalized calendars and generated campaigns. No schema changes needed.

**Calendar records** (one per team per year):

| Column         | Type               | Usage                                     |
| -------------- | ------------------ | ----------------------------------------- |
| `skill_id`     | uuid (FK → skills) | Links to the seasonal-calendar skill      |
| `team_id`      | uuid (FK → teams)  | Team that owns this calendar              |
| `input`        | jsonb              | `{ "type": "calendar", "year": 2026 }`    |
| `output`       | jsonb              | `PersonalizedCalendar` object (see below) |
| `status`       | text               | `running` → `completed` or `failed`       |
| `triggered_by` | text               | `user`                                    |

**Campaign records** (one per team per date):

| Column         | Type               | Usage                                                   |
| -------------- | ------------------ | ------------------------------------------------------- |
| `skill_id`     | uuid (FK → skills) | Links to the seasonal-calendar skill                    |
| `team_id`      | uuid (FK → teams)  | Team that owns this campaign                            |
| `input`        | jsonb              | `{ "type": "campaign", "dateId": "dia-das-maes-2026" }` |
| `output`       | jsonb              | `FullCampaign` object (see below)                       |
| `status`       | text               | `running` → `completed` or `failed`                     |
| `triggered_by` | text               | `user` or `auto`                                        |

**Query patterns**:

- Load calendar: `WHERE skill_id=<sc> AND team_id=<team> AND input->>'type'='calendar' AND input->>'year'=<year> AND status='completed' ORDER BY created_at DESC LIMIT 1`
- Load all campaigns: `WHERE skill_id=<sc> AND team_id=<team> AND input->>'type'='campaign' AND status='completed'`
- Load one campaign: `WHERE skill_id=<sc> AND team_id=<team> AND input->>'type'='campaign' AND input->>'dateId'=<dateId> AND status='completed' ORDER BY created_at DESC LIMIT 1`

### `brand_dna`

Read-only input for both calendar and campaign generation. Key fields:

| Field            | Calendar Usage                                                         | Campaign Usage               |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------- |
| `niche`          | Select relevant dates for market segment                               | Contextualize campaign theme |
| `audience`       | Filter dates by target demographic                                     | Target messaging             |
| `positioning`    | Choose appropriate date types                                          | Guide creative direction     |
| `tone`           | —                                                                      | Match brand voice in copies  |
| `words_to_use`   | —                                                                      | Include in generated text    |
| `words_to_avoid` | —                                                                      | Exclude from generated text  |
| `opportunities`  | **Seed dates** — already contains AI-identified seasonal opportunities | Revenue estimates            |
| `average_ticket` | Estimate revenue potential per date                                    | Product selection            |

### `store_products`

Read-only input. Key fields:

| Field        | Calendar Usage                                            | Campaign Usage                  |
| ------------ | --------------------------------------------------------- | ------------------------------- |
| `name`       | Identify niche-specific dates from product categories     | Product suggestions             |
| `price`      | Revenue estimates                                         | Display in campaign             |
| `image_url`  | —                                                         | Product thumbnails              |
| `category`   | Detect niche dates (e.g., pet products → Dia dos Animais) | Filter relevant products        |
| `cost_price` | —                                                         | Prioritize high-margin products |

## New TypeScript Types

### `PersonalizedCalendar`

```typescript
{
  year: number                           // 2026
  generatedAt: string                    // ISO timestamp
  dates: PersonalizedDate[]              // 10-20 dates, chronologically ordered
  summary: {
    totalDates: number
    totalPotentialRevenue: number         // Sum of all date estimates
    nextActionableDate: string | null     // ID of the nearest future date without campaign
  }
  nextYearSuggested: boolean             // true if >70% dates have passed
}
```

### `PersonalizedDate`

```typescript
{
  id: string // "dia-das-maes-2026" (unique per year)
  name: string // "Dia das Mães"
  emoji: string // "💐"
  date: string // "2026-05-11" (ISO date for sorting/comparison)
  displayDate: string // "11 de Maio"
  month: string // "Mai"
  day: string // "11"
  type: 'universal' | 'niche' // Whether it's a universal or niche-specific date
  relevanceReason: string // "Alta demanda para moda feminina no período"
  estimatedRevenue: number // R$ value based on average_ticket + niche
  potentialValue: string // "R$ 85.000" (formatted display)
  priority: 'high' | 'medium' | 'low' // AI-determined priority for this store
  daysUntil: number // Computed client-side from current date
  status: 'past' | 'upcoming' | 'generated' // Derived: past if date < today, generated if campaign exists, else upcoming
}
```

### `FullCampaign` (unchanged from v1)

```typescript
{
  intro: string
  concept: CampaignConcept
  selectedProducts: CampaignProduct[]
  copies: CampaignCopy[]
  emailSubject: string
  emailPreview: string
  assets: CampaignAsset[]
  videoScripts: CampaignVideoScript[]
  timeline: CampaignTimelineItem[]
}
```

Sub-types (`CampaignConcept`, `CampaignProduct`, `CampaignCopy`, `CampaignAsset`, `CampaignVideoScript`, `CampaignTimelineItem`) remain unchanged from existing `campaign-data.ts`.

## State Transitions

### Calendar Lifecycle

```
(no calendar) → [user opens skill] → generating → completed | failed
completed → [user clicks "Regenerate Calendar"] → generating → completed | failed
completed → [>70% dates passed] → show "Generate Next Year" banner
```

### Date Status (Derived, computed client-side)

```
PersonalizedDate.date < today → "past"
PersonalizedDate.date >= today AND campaign exists → "generated"
PersonalizedDate.date >= today AND no campaign → "upcoming"
```

### Campaign Generation Flow

```
(no campaign for date) → [user clicks Generate] → running → completed | failed
completed → [user clicks Regenerate Section] → running → completed | failed
completed → [user clicks Regenerate Concept] → running → completed | failed
```

## Data Flow

```
Brand DNA + Store Products + Current Date
            ↓
    generateCalendar()          → PersonalizedCalendar (saved to skill_executions)
            ↓
    User selects a date
            ↓
    generateCampaign()          → FullCampaign (saved to skill_executions)
            ↓
    User wants to iterate
            ↓
    regenerateSection()         → Partial<FullCampaign> (merged + saved)
```
