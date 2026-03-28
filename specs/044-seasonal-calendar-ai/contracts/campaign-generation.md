# Contract: Calendar & Campaign Generation API

**Feature**: 044-seasonal-calendar-ai
**Date**: 2026-03-27 (v2 — personalized calendar)

## POST `/api/skills/seasonal-calendar/generate-calendar`

Generate a personalized seasonal calendar for a store based on brand DNA and products.

### Request

```typescript
{
  year?: number      // defaults to current year. Next year if explicitly requested.
}
```

### Response (200 OK)

```typescript
{
  executionId: string
  calendar: PersonalizedCalendar // See data-model.md
  durationMs: number
}
```

### Error Responses

| Status | Body                                                               | When                         |
| ------ | ------------------------------------------------------------------ | ---------------------------- |
| 400    | `{ error: "Brand DNA not found. Complete brand analysis first." }` | No brand_dna record for team |
| 401    | `{ error: "Unauthorized" }`                                        | No valid session             |
| 500    | `{ error: "Calendar generation failed", details: string }`         | AI generation error          |

### Flow

1. Authenticate user, resolve teamId
2. Fetch brand DNA (niche, audience, positioning, opportunities, average_ticket) — error if missing
3. Fetch store products (categories, names) — optional, empty array if none
4. Get current date for time-awareness
5. Upsert `skill_executions` record (status=running, input={type:"calendar", year})
6. Call `generateCalendar(brandDna, products, currentDate, year)` via `generateObject()`
7. Update execution record (status=completed, output=calendar)
8. Return calendar data

---

## POST `/api/skills/seasonal-calendar/generate`

Generate a full campaign for a specific date from the personalized calendar.

### Request

```typescript
{
  dateId: string // e.g. "dia-das-maes-2026"
  dateName: string // e.g. "Dia das Mães"
}
```

### Response (200 OK)

```typescript
{
  executionId: string
  campaign: FullCampaign
  durationMs: number
}
```

### Error Responses

| Status | Body                                                       | When                |
| ------ | ---------------------------------------------------------- | ------------------- |
| 400    | `{ error: "dateId is required" }`                          | Missing dateId      |
| 400    | `{ error: "Brand DNA not found." }`                        | No brand_dna record |
| 401    | `{ error: "Unauthorized" }`                                | No valid session    |
| 500    | `{ error: "Campaign generation failed", details: string }` | AI error            |

### Flow

1. Authenticate user, resolve teamId
2. Fetch brand DNA — error if missing
3. Fetch store products — optional
4. Fetch skill record for `seasonal-calendar` (for skill_id)
5. Upsert `skill_executions` record (status=running, input={type:"campaign", dateId, dateName})
6. Call `generateCampaign(date, brandDna, products)` via `generateObject()`
7. Update execution record (status=completed, output=campaign)
8. Return campaign data

---

## POST `/api/skills/seasonal-calendar/regenerate`

Regenerate a single section of an existing campaign, or the full concept.

### Request

```typescript
{
  dateId: string
  sectionType: 'concept' | 'products' | 'copies' | 'email' | 'assets' | 'video' | 'timeline'
}
```

### Response (200 OK)

```typescript
{
  executionId: string
  campaign: FullCampaign // Full campaign with the specified section regenerated
  durationMs: number
}
```

### Error Responses

| Status | Body                                                | When                  |
| ------ | --------------------------------------------------- | --------------------- |
| 400    | `{ error: "dateId and sectionType are required" }`  | Missing fields        |
| 404    | `{ error: "No campaign found for this date" }`      | No existing execution |
| 401    | `{ error: "Unauthorized" }`                         | No valid session      |
| 500    | `{ error: "Regeneration failed", details: string }` | AI error              |

### Flow

1. Authenticate user, resolve teamId
2. Fetch existing campaign for this dateId — 404 if missing
3. Fetch brand DNA
4. If `sectionType === 'concept'`: call full `generateCampaign` (cascade)
5. Else: call `regenerateSection(sectionType, existingCampaign, brandDna)`
6. Merge regenerated section into existing campaign
7. Update execution record
8. Return updated campaign

---

## Server Actions

### `loadCalendar(teamId: string, year?: number)`

```typescript
// Output
PersonalizedCalendar | null
```

Query: latest completed execution where `input->>'type'='calendar' AND input->>'year'=<year>`

### `loadTeamCampaigns(teamId: string)`

```typescript
// Output
Record<string, FullCampaign> // keyed by dateId
```

Query: all completed executions where `input->>'type'='campaign'`

### `loadCampaign(teamId: string, dateId: string)`

```typescript
// Output
FullCampaign | null
```

Query: latest completed execution where `input->>'type'='campaign' AND input->>'dateId'=<dateId>`

---

## AI Generation Functions

### `generateCalendar(brandDna, products, currentDate, year)`

```typescript
// Input
brandDna: {
  ;(niche, audience, positioning, opportunities, average_ticket, tone)
}
products: Array<{ name; category; price }>
currentDate: Date
year: number

// Output
PersonalizedCalendar // Validated by Zod schema
```

**Prompt strategy**:

- Use `brand_dna.opportunities` as seed dates (already AI-identified for this niche)
- Add universal commercial dates filtered by niche relevance
- Add niche-specific micro-dates based on product categories and audience
- Filter out dates that have already passed (based on currentDate)
- Estimate revenue per date: `average_ticket × estimated_orders_multiplier`
- Sort chronologically, assign priority (high/medium/low)

**Model**: `gpt-5.2`
**Expected latency**: 5-10 seconds
**Token estimate**: ~1-2k output tokens

### `generateCampaign(date, brandDna, products)` (unchanged)

**Model**: `gpt-5.2`
**Expected latency**: 10-20 seconds
**Token estimate**: ~3-5k output tokens

### `regenerateSection(sectionType, existingCampaign, brandDna)` (unchanged)

**Model**: `gpt-5.2`
**Expected latency**: 3-8 seconds
**Token estimate**: ~500-1.5k output tokens
