# Data Model: Home Page Layout Redesign V2

> **Note**: This feature uses entirely mock (hardcoded) data. No database tables, API routes, or Supabase queries are involved. This document defines the TypeScript types for the mock data structures.

## Types

### BrandGradientKey

```ts
type BrandGradientKey = 'sageHaze' | 'duskRose' | 'aurora' | 'mist' | 'blueDusk'
```

### GradientFamily

```ts
interface GradientFamily {
  name: string // Human-readable name (e.g., "Sage Haze")
  card: string // CSS linear-gradient for card backgrounds
  bubble: string // CSS radial-gradient for BubbleAvatar orbs
  ink: string // Hex color for text on this gradient
  seed: number // SVG feTurbulence seed for organic texture
}
```

### FilterTab

```ts
type FilterTab = 'all' | 'campaigns' | 'content' | 'analytics' | 'retention'
```

### ActionCard

```ts
interface ActionCard {
  id: string
  title: string // Description text (e.g., "Gerar campanha completa de Dia das Mães")
  skill: string // Skill name — maps to gradient via CATEGORY_GRADIENT
  skillDot: string // Hex color for dot indicator
  badge?: {
    label: string
    color: 'red' | 'amber' | 'green' | 'gray'
  }
  category: FilterTab[] // Can belong to multiple categories
  route: string // Navigation target on click
}
```

### AutonomousCard

```ts
interface AutonomousCard {
  id: string
  badge: string // Time label (e.g., "há 2h")
  title: string // Main text on card
  description: string // Secondary text
  skill: string // Skill name with emoji
  borderColor: string // Left border accent color
}
```

### BubbleAvatarProps

```ts
interface BubbleAvatarProps {
  skillName: string // Maps to gradient family via CATEGORY_GRADIENT
  size?: number // Default: 44px (sidebar: 20px)
  animated?: boolean // Default: true (float animation)
}
```

## Entity Relationships

```
BRAND.gradients (5 families)
  ↓ resolved by
BRAND.categoryGradient (skill name → family key)
  ↓ used by
getGradient(skillName) → GradientFamily
  ↓ consumed by
ActionCard.skill → card background + ink color
BubbleAvatar.skillName → orb gradient
```

## No Database Changes

This feature does not create, modify, or query any database tables. All data is hardcoded in TypeScript files.
