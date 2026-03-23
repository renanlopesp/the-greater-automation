# Quickstart: Single Agent + Skills Migration

## Prerequisites

- Supabase project running (production: `djohaxwfketlsjurwqne`)
- Node/bun installed
- Current branch: `038-single-agent-skills`

## Development Flow

### 1. Run migrations

```bash
# Apply new tables (skills, skill_executions) + seed data
supabase db push
```

### 2. Verify skill registry

After migration, verify skills are seeded:

```sql
SELECT slug, name, category, status FROM skills WHERE team_id = '<your-team-id>' ORDER BY category, name;
```

Should return 34 rows (one per former agent definition).

### 3. Test chat with skills

```bash
bun dev
```

1. Open `http://localhost:3000/chat`
2. Send a message that would previously trigger SNEW_ASK_AGENT (e.g., "write a copy for Instagram")
3. Verify Snew responds directly without delegation
4. Check `skill_executions` table for the execution record

### 4. Test dashboard

1. Open `http://localhost:3000` (dashboard)
2. Verify skills grid shows instead of agent cards
3. Click a skill card → skill detail page
4. Verify no references to "agents" or "co-workers" in the UI

## Key Files to Watch

| File                           | What changed                                |
| ------------------------------ | ------------------------------------------- |
| `src/data/skills.ts`           | NEW — skill registry (replaces agents.ts)   |
| `src/lib/ai/platform-tools.ts` | SNEW*\*\_AGENT tools → SNEW*\*\_SKILL tools |
| `src/app/api/chat/route.ts`    | Loads skills instead of agents              |
| `src/lib/ai/skill-loader.ts`   | NEW — loads skill context for chat          |
| `src/lib/ai/skill-executor.ts` | NEW — executes skills and tracks results    |
| `src/hooks/use-skills.ts`      | NEW — replaces use-agents.ts                |
| `src/components/skills/`       | NEW — skill UI components                   |
| `supabase/migrations/`         | NEW — skills + skill_executions tables      |

## Verification Checklist

- [ ] `bun run build` passes with zero errors
- [ ] `bun run lint` passes with zero warnings
- [ ] Chat responds using skills (no SNEW_ASK_AGENT calls)
- [ ] Dashboard shows skill cards grouped by category
- [ ] Sidebar shows "Skills" section (no agent links)
- [ ] Command menu finds skills
- [ ] Skill executions are tracked in database
- [ ] No "agents", "co-workers" text in UI
- [ ] Legacy conversation data is still accessible
