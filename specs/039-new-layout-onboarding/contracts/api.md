# API Contracts: New Layout + Onboarding Flow

## No New API Routes

This feature is primarily UI. All data comes from existing tables via Supabase client queries. No new API routes needed.

## Modified Queries

### fetchTeamSkills (expanded)

Returns additional fields for skill detail:

```typescript
// Already exists in src/lib/queries/skills.ts
// Select now includes: emoji, stats, what_it_does, expected_results,
// config_schema, connected_skills, outputs
```

### fetchActiveSkillsForSidebar

New lightweight query for the sidebar:

```typescript
async function fetchActiveSkillsForSidebar(
  supabase: Client,
  teamId: string
): Promise<Array<{ slug: string; name: string; emoji: string | null }>>
```

### fetchBrandDNA

New query for the Brand DNA page:

```typescript
async function fetchBrandDNA(supabase: Client, teamId: string): Promise<BrandDNA | null>
```

## New Server Actions

### updateSkillConfig

Saves skill configuration changes (autonomy level, briefing advance):

```typescript
async function updateSkillConfig(
  teamId: string,
  slug: string,
  config: Record<string, unknown>
): Promise<void>
```

### completeOnboarding

Marks onboarding as complete, activates selected skills:

```typescript
async function completeOnboarding(
  teamId: string,
  selectedSkillSlugs: string[],
  brandDnaId?: string
): Promise<void>
```

## Client Hooks

### useActiveSkillsForSidebar

Lightweight hook for sidebar active skills:

```typescript
function useActiveSkillsForSidebar(): {
  skills: Array<{ slug: string; name: string; emoji: string | null }>
  isLoading: boolean
}
```

### useActivityFeed

Hook for the home page activity feed:

```typescript
function useActivityFeed(): {
  items: ActivityItem[]
  isLoading: boolean
}

type ActivityItem = {
  id: string
  type: 'warning' | 'running' | 'completed'
  description: string
  action?: { label: string; href: string }
  skillSlug?: string
  timestamp: string
}
```

### useBrandDNA

Hook for Brand DNA page:

```typescript
function useBrandDNA(): {
  brandDna: BrandDNA | null
  isLoading: boolean
}
```

## Page Routes

| Route                   | Type            | Layout                     | Description                         |
| ----------------------- | --------------- | -------------------------- | ----------------------------------- |
| `/`                     | Server + Client | Dashboard (sidebar+topbar) | Home with ask bar, activity, skills |
| `/skills`               | Server + Client | Dashboard                  | Skills library with filters         |
| `/skills/[slug]`        | Server + Client | Dashboard                  | Skill detail                        |
| `/apps`                 | Server + Client | Dashboard                  | Apps catalog                        |
| `/history`              | Server + Client | Dashboard                  | Chat history                        |
| `/onboarding`           | Client          | Onboarding (fullscreen)    | Welcome                             |
| `/onboarding/connect`   | Client          | Onboarding                 | Platform selection                  |
| `/onboarding/analyzing` | Client          | Onboarding                 | Analysis progress                   |
| `/onboarding/brand-dna` | Client          | Onboarding                 | Brand DNA results                   |
