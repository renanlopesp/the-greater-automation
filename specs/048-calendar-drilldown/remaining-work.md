# Remaining Work — Calendar Drill-Down + Task-Based Architecture

## Status: 19 commits pushed on `feat/task-based-architecture`

## What Works

- Dashboard → ask bar → creates task → redirects to /chat/task/[id]
- Chat functional (streaming AI response via orchestrator)
- Programmatic skill dispatch (calendar request → generateCalendar → artifact panel)
- Level 1: Calendar date list with Ativo/Pendente badges, month+day, revenue
- Level 2: Campaign detail with concept card, products, 6 section rows
- Level 3: Section content (copies, products, email, assets, video, timeline)
- Campaign generation via "Gerar Campanha" button
- Campaigns persist to task.artifact_data via PATCH /api/tasks/[id]
- /tarefas page with task history
- Sidebar: Home, New Task, Tarefas, Skills, Apps
- Skills page: browse-only (old workspace preserved for comparison)

## What Needs Improvement

### Level 2 Header

- Add month + display date to header (e.g., "Mai · 10 de Maio" above the date name)
- Use estimatedRevenue from the calendar date, not sum of product prices
- Consider adding the date's relevanceReason as a subtitle

### Level 2 Concept Card

- The concept card looks good but could be slightly larger/more prominent
- Product thumbnails are gray boxes — could show colored placeholders based on product tag

### Level 3 Section Content

- Timeline section may show corrupted data (Chinese spam) from AI generation — need output validation
- Section headers could be more prominent
- "Copiar" buttons on copies should actually copy to clipboard

### Chat UX

- No loading indicator while AI is processing (before streaming starts)
- Chat header still says "New task" — should update to task title after first response
- Follow-up suggestions (Acompanhamentos) should relate to the calendar task specifically

### General Polish

- Dark mode: verify all new components adapt correctly
- Responsive: artifact panel should handle narrow viewports
- Error states: better messaging when skill execution fails
- Navigation: clicking browser back should go from Level 3 → Level 2 → Level 1 (history.pushState)

### Old Workspace

- /skills/seasonal-calendar currently shows the OLD workspace layout (user wants it for comparison)
- When comparison is done, switch to browse-only page with "Ask Snew" CTA

### Future: More Skills

- Only seasonal-calendar has real artifact rendering
- Other skills (copywriter, image-generator, etc.) need their own artifact components
- The generic JSON view is a placeholder
