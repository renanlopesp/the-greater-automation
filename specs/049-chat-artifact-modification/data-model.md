# Data Model: Chat-Driven Artifact Modification

## Entities

### Task (existing — no schema changes)

| Field           | Type        | Description                                  |
| --------------- | ----------- | -------------------------------------------- |
| id              | UUID        | Primary key                                  |
| team_id         | UUID        | FK to teams                                  |
| user_id         | UUID        | FK to auth.users                             |
| title           | TEXT        | Task title (from initial message)            |
| status          | TEXT        | active, completed                            |
| active_skill    | TEXT        | Currently running skill slug                 |
| skill_status    | TEXT        | idle, running, completed, failed             |
| artifact_type   | TEXT        | Type of artifact (e.g., 'seasonal-calendar') |
| artifact_data   | JSONB       | Full artifact content (calendar + campaigns) |
| conversation_id | UUID        | FK to conversations                          |
| initial_message | TEXT        | First user message                           |
| created_at      | TIMESTAMPTZ |                                              |
| updated_at      | TIMESTAMPTZ |                                              |

### Artifact Data Structure (JSONB — seasonal-calendar)

```
artifact_data: {
  dates: PersonalizedDate[]
  year: number
  summary: string
  campaigns: Record<string, FullCampaign>  // keyed by date.id
}
```

### PersonalizedDate

| Field            | Type   | Description                                   |
| ---------------- | ------ | --------------------------------------------- |
| id               | string | Unique identifier (e.g., "dia-das-maes-2026") |
| name             | string | Display name ("Dia das Mães")                 |
| date             | string | ISO date ("2026-05-10")                       |
| displayDate      | string | Human-readable ("10 de Maio")                 |
| month            | string | Month abbreviation ("Mai")                    |
| day              | string | Day number ("10")                             |
| emoji            | string | Representative emoji                          |
| type             | string | "universal" or "niche"                        |
| priority         | string | "high", "medium", "low"                       |
| estimatedRevenue | number | Potential revenue in BRL                      |
| relevanceReason  | string | Why this date matters for the brand           |

### FullCampaign

| Field            | Type   | Description                         |
| ---------------- | ------ | ----------------------------------- |
| concept          | Object | { slogan, description, products[] } |
| copies           | Array  | { channel, timing, text }[]         |
| selectedProducts | Array  | { name, price, tag, stock? }[]      |
| emailSubject     | string | Email subject line                  |
| emailPreview     | string | Email preview text                  |
| assets           | Array  | { label, ratio, bg }[]              |
| videoScripts     | Array  | { title, duration, content }[]      |
| timeline         | Array  | { day, actions[] }[]                |

## State Transitions

### Campaign Status (per date)

```
No campaign → generate_campaign → Campaign exists (Gerada)
Campaign exists → clear_campaigns → No campaign (Pendente)
Campaign exists → generate_campaign → Campaign replaced (Gerada)
```

### Date Lifecycle

```
Date in list → remove_dates → Date removed (gone from list + campaign)
Date in list → filter_dates (not included) → Date removed
Date in list → filter_dates (included) → Date preserved
```

## Tool Operations as Data Mutations

| Operation         | Reads                                    | Mutates              | Persists      |
| ----------------- | ---------------------------------------- | -------------------- | ------------- |
| generate_campaign | artifact_data, brand_dna, store_products | campaigns[dateId]    | artifact_data |
| filter_dates      | artifact_data.dates                      | dates[], campaigns{} | artifact_data |
| remove_dates      | artifact_data.dates                      | dates[], campaigns{} | artifact_data |
| clear_campaigns   | artifact_data.campaigns                  | campaigns{}          | artifact_data |
