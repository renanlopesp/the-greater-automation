# Quickstart: New Layout + Onboarding Flow

## Prerequisites

- Branch `038-single-agent-skills` merged (skills table exists)
- Supabase running with skills seeded
- `bun dev` running

## Development Flow

### 1. Apply migrations

```bash
supabase db push
```

### 2. Start dev server

```bash
bun dev
```

### 3. Verify new layout

1. Open `http://localhost:3000`
2. Verify icon sidebar (5 nav items) + topbar renders
3. Click sidebar logo to toggle expand/collapse
4. Check active skills in sidebar footer
5. Resize browser to mobile width — verify overlay sidebar

### 4. Verify home page

1. Open `http://localhost:3000` (home)
2. Verify ask bar is centered with placeholder text
3. Verify 3 quick suggestion pills below
4. Verify Activity section with items
5. Verify Active Skills pills at bottom

### 5. Verify skills page

1. Open `http://localhost:3000/skills`
2. Verify sidebar filters (All/Active/Recommended + PT-BR categories)
3. Click a category filter → verify grid updates
4. Type in search → verify filtering works
5. Verify skill cards have emoji, name, description, Active badge

### 6. Verify skill detail

1. Click a skill card → `/skills/seasonal-calendar`
2. Verify all sections: About, stats, What it does, Expected result, Configuration, Required connections, Connected skills, Outputs

### 7. Verify onboarding

1. Open `http://localhost:3000/onboarding`
2. Verify fullscreen (no sidebar)
3. Click "Connect your store" → `/onboarding/connect`
4. Click platform → `/onboarding/analyzing`
5. Wait for animation → `/onboarding/brand-dna`
6. Verify Brand DNA page sections
7. Click "Começar com essas habilidades"

### 8. Verify apps page

1. Open `http://localhost:3000/apps`
2. Verify 13 app cards with emoji, name, description
3. Type in search → verify filtering

## Reference

- Prototype: `/home/renanl/Projects/snew-ai-core/` (run with `npm run dev` on port 8080)
- Screenshots: `ref-home.png`, `ref-skills.png`, `ref-skill-detail-seasonal.png`, `ref-onboarding.png`, `ref-onboarding-connect.png`, `ref-onboarding-analyzing.png`, `ref-onboarding-brand-dna.png`

## Verification Checklist

- [ ] Sidebar renders with 5 nav items (icon-only mode)
- [ ] Sidebar expands/collapses on logo click
- [ ] Active skills show in sidebar footer with emoji
- [ ] TopBar shows Feedback, Support, notifications, avatar
- [ ] Home has ask bar, suggestions, activity, active skills
- [ ] Skills page has filter sidebar, search, card grid
- [ ] Skill detail shows all 8 sections
- [ ] Onboarding flow works end-to-end (4 steps)
- [ ] Brand DNA page shows all sections from prototype
- [ ] Apps page shows 13 apps with search
- [ ] Mobile responsive (sidebar overlay)
- [ ] `bun run build` passes
- [ ] `bun run lint` passes (no new warnings)
- [ ] Zero references to "agents" or "co-workers"
