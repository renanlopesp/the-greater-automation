# Feature Specification: Calendar Drill-Down in Artifact Panel

**Feature Branch**: `feat/task-based-architecture` (continues existing)
**Created**: 2026-03-31
**Status**: Draft
**Reference**: Existing `src/components/skills/seasonal-calendar/calendar-level2.tsx` + `calendar-level3.tsx`
**Input**: When user clicks a date in the Seasonal Calendar artifact, show campaign detail (Level 2) and section content (Level 3) inside the same artifact panel.

---

## Overview

Add drill-down navigation to the `SeasonalCalendarArtifact` in the artifact panel:

- **Level 1** (existing): Calendar date list with dots + revenue + chevron
- **Level 2** (new): Campaign detail — concept card, products, 6 expandable sections
- **Level 3** (new): Section content — Copies, Products, E-mail, Assets, Script, Timeline

When a user clicks a date → generate campaign via `generateCampaign()` → show Level 2. When user clicks a section → show Level 3 with full content.

All happens inside the artifact panel (right side). Chat panel is unaffected.

---

## User Scenarios

### US1 — Click Date → Generate Campaign (P0)

User clicks a date row (e.g., "Dia das Mães") in Level 1. System generates the full campaign and shows Level 2.

**Acceptance:**

1. Click date → show skeleton loading in artifact panel
2. Call `generateCampaign({ dateId, dateName })` → generates `FullCampaign`
3. Save campaign to `tasks.artifact_data.campaigns[dateId]`
4. Render Level 2: header + concept card + 6 section rows
5. Breadcrumb "< Calendário Sazonal 2026" at top to go back

### US2 — Campaign Detail View (Level 2) (P0)

User sees the full campaign detail with concept and section navigation.

**Level 2 layout:**

```
< Calendário Sazonal 2026         [breadcrumb back]

Mai · 10 de Maio
Dia das Mães
[Pendente] R$ 4.946,7

CONCEITO DA CAMPANHA               ↻ Regenerar
┌──────────────────────────────────────────────┐
│ "Estilo e funcionalidade para o melhor       │
│  presente."                                   │
│                                               │
│ No Dia das Mães, nossa campanha destaca...   │
│                                               │
│ PRODUTOS SUGERIDOS                            │
│ [img] Camiseta Básica Preta R$49.9  Best-seller │
│ [img] Calça Jeans Slim R$129.9    Alta margem │
│ [img] Jaqueta Corta-Vento R$199.9 Liberar estoque │
└──────────────────────────────────────────────┘

📋 Produtos          4 selecionados    >
📧 E-mail            1 template        >
💬 Copies            5 canais          >
🖼 Assets            4 formatos        >
🎬 Script            2 roteiros        >
⏰ Timeline          6 fases           >
```

### US3 — Section Content View (Level 3) (P1)

User clicks a section row → sees full content with regenerate option.

**6 sections:**

| Section      | Content                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Produtos** | 3-6 products with name, price, tag badge (best-seller, alta-margem, etc.), optional stock                                                       |
| **E-mail**   | Subject line (max 60 chars) + preview text (80-100 chars)                                                                                       |
| **Copies**   | 5 channel cards: WhatsApp VIP, WhatsApp Geral, Instagram, Meta Ad, SMS — each with timing + copy text + "Copiar"                                |
| **Assets**   | 4 visual asset cards in 2-col grid: Stories 9:16, Feed 1:1, Banner E-mail 3:1, Stories Meta Ad — each with CSS gradient preview + label + ratio |
| **Script**   | 2 video scripts: Reels 30s + Reels 60s — each with title, duration badge, content text                                                          |
| **Timeline** | 6 phases: D-45, D-30, D-15, D-7, D-1/D-3, D-Day — each with day badge + 3-5 action items                                                        |

### US4 — Regenerate Section (P1)

User clicks "Regenerar" on concept or a section → regenerates just that part.

**Acceptance:**

1. Click "Regenerar" → show skeleton overlay on that section
2. Call `regenerateSection({ dateId, sectionType })` → generates new data for that section only
3. Merge into existing campaign data
4. Update artifact_data in task
5. Re-render with new content

### US5 — Breadcrumb Navigation (P0)

User can navigate back at each level.

**Acceptance:**

1. Level 2 → click "< Calendário Sazonal 2026" → back to Level 1 (date list)
2. Level 3 → click "< Dia das Mães" → back to Level 2 (campaign detail)

---

## Data Model

### FullCampaign (from existing `src/data/campaign-data.ts`)

```ts
interface FullCampaign {
  intro: string
  concept: {
    slogan: string
    description: string
    products: CampaignProduct[]
    alternates: { slogan: string; description: string }[]
  }
  selectedProducts: CampaignProduct[]
  emailSubject: string
  emailPreview: string
  copies: CampaignCopy[] // 5: WhatsApp VIP/Geral, Instagram, Meta Ad, SMS
  assets: CampaignAsset[] // 4: Stories, Feed, Banner, Stories Ad
  videoScripts: CampaignVideoScript[] // 2: Reels 30s, 60s
  timeline: CampaignTimelineItem[] // 6: D-45 to D-Day
}

interface CampaignProduct {
  name: string
  price: number
  tag: ProductTag
  stock?: number
}
interface CampaignCopy {
  channel: string
  timing: string
  text: string
}
interface CampaignAsset {
  label: string
  ratio: string
  bg: string
}
interface CampaignVideoScript {
  title: string
  duration: string
  content: string
}
interface CampaignTimelineItem {
  day: string
  actions: string[]
}
```

### tasks.artifact_data structure (extended)

```ts
{
  // Level 1 data (PersonalizedCalendar)
  year: number,
  dates: PersonalizedDate[],
  summary: { ... },

  // Level 2 data (campaigns, keyed by dateId)
  campaigns: {
    "dia-das-maes-2026": FullCampaign,
    "dia-dos-namorados-2026": FullCampaign,
    ...
  }
}
```

---

## Architecture

### Navigation State (inside artifact panel)

Simple stack-based navigation managed by `useState` in the artifact component:

```ts
type ArtifactView =
  | { level: 1 }
  | { level: 2; dateId: string; dateName: string }
  | { level: 3; dateId: string; dateName: string; sectionType: SectionType }

type SectionType = 'products' | 'email' | 'copies' | 'assets' | 'video' | 'timeline'
```

### Campaign Generation Flow

```
User clicks date in Level 1
  → SeasonalCalendarArtifact sets view = { level: 2, dateId, dateName }
  → If campaigns[dateId] exists → render immediately
  → If not → POST /api/skills/seasonal-calendar/generate { dateId, dateName }
     → Show skeleton while generating (~10-15s)
     → Save result to tasks.artifact_data.campaigns[dateId]
     → Render Level 2
```

### Section Regeneration Flow

```
User clicks "Regenerar" on a section
  → POST /api/skills/seasonal-calendar/regenerate { dateId, sectionType }
  → Show skeleton overlay on section (~5-10s)
  → Merge result into campaigns[dateId]
  → Update tasks.artifact_data
  → Re-render
```

---

## Files to Create/Modify

### Modify

1. `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — Add Level 2/3 rendering, navigation state, campaign generation
2. `src/app/api/chat/route.ts` — After generating calendar, also update artifact_data structure to support campaigns key

### Keep (reuse AI logic)

3. `src/lib/ai/seasonal-campaign-generator.ts` — `generateCampaign()`, `regenerateSection()` already work
4. `src/app/api/skills/seasonal-calendar/generate/route.ts` — Existing API for campaign generation
5. `src/app/api/skills/seasonal-calendar/regenerate/route.ts` — Existing API for section regeneration
6. `src/data/campaign-data.ts` — FullCampaign types

### Reuse Components (from old calendar)

7. `src/components/skills/seasonal-calendar/shared.tsx` — StatusBadge, ProductThumb, ProductTagBadge

---

## Phases

### Phase 1: Level 2 — Campaign Detail

- Add navigation state to SeasonalCalendarArtifact
- Click date → show skeleton → call generateCampaign API → render concept card + section list
- Breadcrumb back to Level 1
- Save campaign to tasks.artifact_data.campaigns[dateId]

### Phase 2: Level 3 — Section Content

- Click section row → render full section content (Copies, Products, E-mail, Assets, Script, Timeline)
- Breadcrumb back to Level 2
- Regenerate button per section

### Phase 3: Polish

- Loading states (skeletons)
- Error handling
- Visual QA vs old layout
