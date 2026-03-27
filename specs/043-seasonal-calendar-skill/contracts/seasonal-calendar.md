# Contract: Seasonal Calendar Artifact

## Server Action: seedSeasonalCalendar

```typescript
/** Seeds the Seasonal Calendar skill for a team */
async function seedSeasonalCalendar(teamId: string): Promise<void>
```

Upserts a skill record with:

- slug: "seasonal-calendar"
- name: "Seasonal Calendar"
- category: "marketing-campanhas"
- emoji: "📅"
- status: "active"
- is_native: true

## Server Action: fetchSkillsAction (existing)

Already implemented. Returns skills from DB (no static fallback).

## Static Data Functions

```typescript
/** Get all seasonal dates */
function getSeasonalDates(): SeasonalDate[]

/** Get campaign data for a specific date */
function getCampaignData(dateId: string): Campaign | null

/** Get product tag display config (label, bg color, text color) */
function productTagConfig(tag: ProductTag): { label: string; bg: string; color: string }
```

## Calendar Artifact Levels

### Level 1: Date List

- Input: `SeasonalDate[]`
- Renders: Scrollable list of date rows
- Action: Click row → navigate to Level 2

### Level 2: Campaign Detail

- Input: `SeasonalDate` + `Campaign`
- Renders: Concept card + product suggestions + 6 section nav items
- Actions: Click section → navigate to Level 3, Click "Regenerar" → cycle concept

### Level 3: Section Content

- Input: Section type + `Campaign`
- Renders: Section-specific content cards
- Actions: Copy, Edit, Regenerate per item

## Section Types

| Section               | Data Source       | Items               |
| --------------------- | ----------------- | ------------------- |
| Produtos selecionados | campaign.products | Product cards       |
| E-mail template       | campaign.email    | Email preview       |
| Copies por canal      | campaign.copies   | Channel copy cards  |
| Assets visuais        | campaign.assets   | Asset preview cards |
| Script de vídeo       | campaign.videos   | Script cards        |
| Timeline de disparo   | campaign.timeline | Timeline milestones |
