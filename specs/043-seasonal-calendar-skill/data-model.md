# Data Model: Seasonal Calendar Skill

## Existing Entities (no changes needed)

### Skill (table: `skills`)

Already exists. The Seasonal Calendar will be a row in this table.

| Field                | Type       | Notes                   |
| -------------------- | ---------- | ----------------------- |
| id                   | uuid       | Primary key             |
| team_id              | uuid       | FK to teams             |
| slug                 | text       | "seasonal-calendar"     |
| name                 | text       | "Seasonal Calendar"     |
| description          | text       | Skill description       |
| category             | text       | "marketing-campanhas"   |
| emoji                | text       | "📅"                    |
| status               | text       | "active" or "available" |
| phase                | int        | 1                       |
| is_native            | bool       | true                    |
| requires_connections | text[]     | []                      |
| created_at           | timestampz | Auto                    |
| updated_at           | timestampz | Auto                    |

## New Static Types (TypeScript only, no DB tables)

### SeasonalDate

Represents a single date in the seasonal calendar.

| Field          | Type                                       | Notes                       |
| -------------- | ------------------------------------------ | --------------------------- |
| id             | string                                     | Unique identifier           |
| name           | string                                     | "Dia das Mães"              |
| month          | string                                     | "MAY"                       |
| day            | number                                     | 11                          |
| date           | string                                     | "11 mai"                    |
| potentialValue | string                                     | "R$ 78k"                    |
| status         | "done" \| "active" \| "ready" \| "pending" | Campaign preparation status |

### CampaignConcept

The creative concept for a seasonal date campaign.

| Field       | Type      | Notes                                        |
| ----------- | --------- | -------------------------------------------- |
| slogan      | string    | "A memória mais bonita que você pode dar..." |
| description | string    | Positioning description                      |
| products    | Product[] | Up to 3 suggested products                   |
| alternates  | Array     | Up to 2 alternate concepts for regeneration  |

### Product

A product suggested for a campaign.

| Field | Type       | Notes                                                                               |
| ----- | ---------- | ----------------------------------------------------------------------------------- |
| name  | string     | "Kit Presente Completo"                                                             |
| price | string     | "R$ 289"                                                                            |
| tag   | ProductTag | "best-seller" \| "liberar-estoque" \| "cross-sell" \| "lancamento" \| "alta-margem" |

### ChannelCopy

Copy text for a specific marketing channel.

| Field   | Type   | Notes                            |
| ------- | ------ | -------------------------------- |
| channel | string | "WhatsApp VIP", "Instagram", etc |
| timing  | string | "D-7", "D-1", "D-0"              |
| text    | string | The copy content                 |
| product | string | Optional featured product        |

### Campaign

Full campaign data for a seasonal date.

| Field        | Type            | Notes                      |
| ------------ | --------------- | -------------------------- |
| concept      | CampaignConcept | The creative concept       |
| copies       | ChannelCopy[]   | Copies per channel         |
| emailSubject | string          | Email subject line         |
| emailPreview | string          | Email preview text         |
| assets       | Asset[]         | Visual assets (4 types)    |
| videoScripts | VideoScript[]   | Video scripts (2 versions) |
| timeline     | TimelineItem[]  | D-45 to D-Day milestones   |

### Asset

A visual asset for the campaign.

| Field | Type   | Notes                                           |
| ----- | ------ | ----------------------------------------------- |
| type  | string | "Stories 9:16", "Feed 1:1", "Banner", "Meta Ad" |
| label | string | Display label                                   |

### VideoScript

A video script for the campaign.

| Field    | Type   | Notes                    |
| -------- | ------ | ------------------------ |
| title    | string | "Reels 30s", "Reels 60s" |
| duration | string | "30s", "60s"             |
| script   | string | The script content       |

### TimelineItem

A milestone in the campaign dispatch timeline.

| Field     | Type    | Notes                      |
| --------- | ------- | -------------------------- |
| label     | string  | "D-45", "D-15", etc        |
| action    | string  | What happens at this point |
| completed | boolean | Whether this step is done  |

## Entity Relationships

```
Skill (DB)
  └── has many SeasonalDate (static)
        └── has one Campaign (static)
              ├── has one CampaignConcept
              │     └── has many Product
              ├── has many ChannelCopy
              ├── has many Asset
              ├── has many VideoScript
              └── has many TimelineItem
```

## State Transitions

### SeasonalDate.status

```
pending → ready → active → done
```

- **pending**: Date not yet worked on, no campaign plan
- **ready**: Campaign plan generated, awaiting review
- **active**: Campaign in progress, content being dispatched
- **done**: Campaign completed, results available

```

```
