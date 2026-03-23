# Data Model: New Layout + Onboarding Flow

## Entity Changes

This feature is primarily UI — most data models already exist from `038-single-agent-skills`. Changes are additive.

## Modified Entities

### skills (expanded fields)

Add columns to support the rich skill detail page:

| Field            | Type   | Constraints  | Description                                                                                                        |
| ---------------- | ------ | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| emoji            | text   | nullable     | Emoji icon for the skill card (e.g. "📅", "🎯")                                                                    |
| stats            | jsonb  | default '[]' | Key metrics displayed as stats bar (e.g. `[{"value":"30+","label":"dates mapped"}]`)                               |
| what_it_does     | jsonb  | default '[]' | List of actions with frequency badge (e.g. `[{"action":"Analyzes catalog","frequency":"Setup"}]`)                  |
| expected_results | text[] | default '{}' | List of expected outcomes                                                                                          |
| config_schema    | jsonb  | nullable     | Configuration options (autonomy level, briefing advance, custom options)                                           |
| connected_skills | jsonb  | default '[]' | Skills that communicate with this skill (e.g. `[{"slug":"campaign-engine","reason":"Receives briefing at D-60"}]`) |
| outputs          | jsonb  | default '[]' | Available outputs (e.g. `[{"title":"Full Year Calendar","description":"All dates for 2026"}]`)                     |

### skills — category expansion

Add new category value to the check constraint:

```
'foundation', 'campaign', 'content', 'retention', 'analytics', 'ads', 'operations', 'scale', 'cart', 'social'
```

### skill_category_labels (code-only, not DB)

PT-BR label mapping in `src/data/skills.ts`:

| Slug       | PT-BR Label               |
| ---------- | ------------------------- |
| cart       | Carrinho & Conversão      |
| retention  | Retenção & Churn          |
| campaign   | Marketing & Campanhas     |
| ads        | Ads & Performance         |
| analytics  | Analytics & Inteligência  |
| scale      | Atendimento & Experiência |
| foundation | Produto & Catálogo        |
| social     | Redes Sociais             |
| operations | Visibilidade & IA         |
| content    | Content                   |

## New Entities

### brand_dna (preparation — visual only)

Schema already defined in `docs/SNEW_CMO_GAP_ANALYSIS.md`. For this feature we create the table but populate with mock data for the onboarding Brand DNA page.

| Field              | Type        | Description                         |
| ------------------ | ----------- | ----------------------------------- |
| id                 | uuid        | PK                                  |
| team_id            | uuid        | FK → teams                          |
| store_name         | text        |                                     |
| niche              | text        |                                     |
| average_ticket     | numeric     |                                     |
| platform           | text        |                                     |
| tone               | text        | Description of brand tone           |
| audience           | text        | Target audience                     |
| words_to_use       | text[]      | Words that align with brand         |
| words_to_avoid     | text[]      | Words to avoid                      |
| positioning        | text        | Market positioning insight          |
| strengths          | jsonb       | Array of strength insights          |
| alerts             | jsonb       | Array of alert/opportunity insights |
| opportunities      | jsonb       | Array of identified opportunities   |
| revenue_projection | jsonb       | `{ current, projected, delta }`     |
| is_confirmed       | boolean     | User has reviewed and confirmed     |
| created_at         | timestamptz |                                     |

### app_catalog (code-only, not DB)

Static definition of connectable apps in `src/data/apps.ts`:

| Field       | Type   | Description       |
| ----------- | ------ | ----------------- |
| slug        | string | Unique identifier |
| name        | string | Display name      |
| emoji       | string | Emoji icon        |
| description | string | What the app does |
| category    | string | App category      |

13 apps: shopify, gmail, google-analytics, meta-ads, google-ads, klaviyo, slack, notion, airtable, stripe, hubspot, whatsapp-business, telegram.

## Migrations Needed

1. `alter_skills_add_detail_columns` — Add emoji, stats, what_it_does, expected_results, config_schema, connected_skills, outputs to skills table
2. `alter_skills_expand_categories` — Update category check constraint to include 'cart' and 'social'
3. `create_brand_dna_table` — Create brand_dna table (empty, for visual feature; real data in Fase 1)
4. `update_skills_with_detail_data` — Populate new columns for existing skills with data from prototype

## No Schema Changes

- `conversations`, `conversation_messages` — unchanged
- `skill_executions` — unchanged
- `agents` — unchanged (deprecated)
