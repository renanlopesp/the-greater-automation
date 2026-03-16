# 035 — Layout Sync: Implementation Plan

**Branch**: `030-agent-modal-real-integration` | **Date**: 2026-03-15 | **Spec**: `specs/035-layout-sync-reference/spec.md`

## Technical Context

| Aspect     | Decision                                               |
| ---------- | ------------------------------------------------------ |
| Framework  | Next.js 16 App Router (existing)                       |
| Styling    | Tailwind CSS v4 + OKLCH CSS variables                  |
| Components | shadcn/ui (new-york) + custom components               |
| Data       | Mock data in `src/data/` files — no DB changes         |
| State      | React state (useState) for local UI; no Zustand needed |
| Routing    | Existing App Router routes, no new routes needed       |
| i18n       | Existing `language-context.tsx` with `t()` function    |

## Constitution Check

| Principle                | Status | Notes                                       |
| ------------------------ | ------ | ------------------------------------------- |
| I. App Router First      | PASS   | All pages already in `src/app/(dashboard)/` |
| II. shadcn/ui System     | PASS   | Will use shadcn Sheet, Dialog, Tabs, etc.   |
| III. Tailwind v4 + OKLCH | PASS   | All colors via CSS variables                |
| IV. TypeScript Strict    | PASS   | All new code in strict TS                   |
| V. Simplicity/YAGNI      | PASS   | Mock data approach, minimal abstractions    |
| VI. Supabase Backend     | N/A    | No DB changes in this task                  |

## Architecture

### Data Layer

All mock data lives in `src/data/` files. No database changes. Components accept optional props for real data and fall back to mock data when not provided. This preserves existing real-data integrations while adding visual parity.

### Component Strategy

- **Port & Adapt**: Reference components are React 18 + React Router. We adapt to Next.js patterns (Link, usePathname, Server/Client components).
- **Shared UI**: Intent cards, connect apps section, and notification cards are new client components.
- **Existing Modifications**: Home page components are refactored in-place to match reference layout.

### File Organization

```
src/
├── data/
│   ├── home-dashboard.ts     # MODIFY: simplify greeting, add intent cards data
│   ├── apps.ts               # MODIFY: add emoji field, match reference catalog
│   ├── coworkers-catalog.ts  # NEW: 150+ coworker mock data (from reference)
│   ├── notifications-mock.ts # NEW: 6 mock notifications with categories
│   └── history-mock.ts       # NEW: 5 mock chat conversations
├── components/
│   ├── home/
│   │   ├── home-client-new.tsx      # MODIFY: restructure sections
│   │   ├── greeting-section-new.tsx # MODIFY: centered heading
│   │   ├── intent-cards.tsx         # NEW: carousel component
│   │   ├── connect-apps-section.tsx # NEW: apps preview on home
│   │   ├── coworkers-in-action.tsx  # MODIFY: match card format
│   │   ├── opportunities-section.tsx # MODIFY: match card format
│   │   ├── ask-bar.tsx              # MODIFY: match suggestions
│   │   └── coworker-recommendation.tsx # MODIFY: match styling
│   ├── dashboard-shell-new.tsx # MODIFY: add TopBar buttons
│   ├── top-bar-new.tsx         # NEW or MODIFY: TopBar with Feedback/Suporte/dropdown
│   ├── apps/apps-client.tsx    # MODIFY: 2-col emoji grid
│   ├── discover/discover-client.tsx # MODIFY: tabs + card format
│   ├── notifications/notifications-client.tsx # NEW: notification list + drawer
│   ├── history/history-client.tsx # NEW: grouped history list
│   └── chat/new-chat-client.tsx   # MODIFY: empty state
```

## Phases

### Phase 1: Home Page (Highest Visual Impact)

Restructure the home page to match reference exactly. This is the most-seen page and creates immediate visual alignment.

**Changes:**

1. Simplify greeting to centered "o que voce quer resolver hoje?" + subtitle
2. Remove MetricsCards component usage and scenario selector
3. Create IntentCards carousel (12 cards, 3 per page, pagination)
4. Create ConnectAppsSection (4 apps from mock data)
5. Update CoworkersInAction to match reference card format (avatar + summary + "Resultado recente")
6. Update OpportunitiesSection to match reference format (avatar + agent + description + value badge)
7. Update AskBar placeholder and suggestion pills

### Phase 2: Layout Shell (Sidebar + TopBar)

Add missing TopBar elements and verify sidebar matches reference.

**Changes:** 8. Add Feedback + Suporte buttons to TopBar 9. Add Folder icon button + vertical divider 10. Update notification bell dot style 11. Add avatar dropdown with workspace selector, theme, language picker 12. Verify sidebar colors and animations

### Phase 3: Secondary Pages

Update all secondary pages to match reference layout.

**Changes:** 13. Update Apps page to 2-column emoji grid with simplified layout 14. Update History page to grouped conversation list with search 15. Update Notifications page with categorized cards + detail drawer 16. Update New Chat empty state (Bot icon, suggestions) 17. Update Discover/Co-Workers page (title, tabs, card format)

### Phase 4: Polish & Verification

18. Visual comparison against screenshots
19. Test collapsed/expanded sidebar
20. Verify all interactive elements work
21. Ensure no regressions on real-data integrations
