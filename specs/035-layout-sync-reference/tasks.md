# 035 — Layout Sync: Tasks

**Branch**: `030-agent-modal-real-integration` | **Spec**: `spec.md` | **Plan**: `plan.md`

---

## Phase 1: Home Page

### Task 1.1: Simplify Greeting Section

- **File**: `src/components/home/greeting-section-new.tsx`
- **Action**: Replace dynamic greeting + scenario selector with centered heading
- **Details**:
  - Heading: `"o que voce quer resolver hoje?"` (text-2xl+ font-medium, centered)
  - Subtitle: `"3 agentes ativos · ultima atividade ha 2h"` (text-sm text-muted-foreground, centered)
  - Remove scenario dropdown, MetricsCards import, and all scenario logic
- **Depends on**: None
- [x] Done

### Task 1.2: Update Home Client Layout

- **File**: `src/components/home/home-client-new.tsx`
- **Action**: Remove MetricsCards and scenario selector, restructure section order
- **Details**:
  - Remove `MetricsCards` component and `scenarios` import
  - Section order: GreetingSection → AskBar → IntentCards → CoworkerRecommendation → ConnectAppsSection → CoworkersInAction → OpportunitiesSection
  - All sections inside `max-w-5xl mx-auto` container
- **Depends on**: 1.1
- [x] Done

### Task 1.3: Create IntentCards Carousel

- **File**: `src/components/home/intent-cards.tsx` (NEW)
- **Action**: Port IntentCards from reference (`/home/Projects/snew-agent-mind/src/components/IntentCards.tsx`)
- **Details**:
  - 12 cards, 3 per page, 4 pages total
  - Card: colored thumbnail (aspect-video) + emoji → dot + category → title → "N co-workers" footer
  - Pagination dots (active=w-3, inactive=w-1) + prev/next arrow buttons
  - Click opens modal with coworker list, "ver todos no catalogo" link
  - Adapt: React Router `useNavigate` → Next.js `useRouter`, remove `InstallWizardModal` dependency for now
- **Depends on**: None
- [x] Done

### Task 1.4: Create Connect Apps Section

- **File**: `src/components/home/connect-apps-section.tsx` (NEW)
- **Action**: Create "Conecte seus apps" section for home page
- **Details**:
  - Header: "Conecte seus apps" h2 + "ver todos" link button (navigates to /apps)
  - 4 app rows: Shopify (connected), Meta Ads (connected), Google Analytics (disconnected), Gmail (disconnected)
  - Each row: logo/emoji + name + "Conectado"/"Desconectado" badge (green/gray) + description + chevron
  - Mock data inline or from `src/data/apps.ts`
- **Depends on**: None
- [x] Done

### Task 1.5: Update CoworkersInAction Card Format

- **File**: `src/components/home/coworkers-in-action.tsx`
- **Action**: Match reference card format
- **Details**:
  - Horizontal scroll container with 5 agent cards + "Adicionar co-worker" link
  - Card structure: avatar (img) + name → summary paragraph → "Resultado recente" label + value
  - Mock agents: Carrinho Abandonado, Sales Analyst, Retencao, Customer Service, Marketing Agent
  - "Adicionar co-worker" card: Plus icon + link to /agents (discover)
  - Each card clickable (existing drawer behavior or navigate)
- **Depends on**: None
- [x] Done

### Task 1.6: Update Opportunities Section

- **File**: `src/components/home/opportunities-section.tsx`
- **Action**: Match reference format
- **Details**:
  - 3 opportunity cards, vertical list
  - Card: avatar + agent name header → description paragraph + value badge (colored)
  - Mock: Sales Analyst "~R$3.200", Competitors "Risco alto", Analytics "+R$1.800"
- **Depends on**: None
- [x] Done

### Task 1.7: Update AskBar

- **File**: `src/components/home/ask-bar.tsx`
- **Action**: Match placeholder and suggestion pills
- **Details**:
  - Placeholder: `'Pergunte algo sobre sua loja... ex: "quais clientes nao compram ha 60 dias?"'`
  - 3 suggestion pills below: "Quais carrinhos tem maior chance de conversao?", "Aprovar sequencia WhatsApp de recuperacao", "Quais clientes estao em risco de churn?"
  - Send arrow button (ArrowUp icon in circle)
- **Depends on**: None
- [x] Done

---

## Phase 2: Layout Shell

### Task 2.1: Add TopBar Buttons

- **File**: `src/components/dashboard-shell-new.tsx` (or new `top-bar.tsx`)
- **Action**: Add Feedback, Suporte, Folder, and notification dot to TopBar area
- **Details**:
  - After sidebar toggle: spacer → "Feedback" button (h-7 px-2.5 text-[11px] border rounded-lg) → "Suporte" button (same) → vertical divider (w-px h-5 bg-border mx-1) → Folder icon button → Bell icon with dot (w-1.5 h-1.5 rounded-full bg-foreground)
  - Buttons right-aligned before avatar
- **Depends on**: None
- [x] Done

### Task 2.2: Avatar Dropdown

- **File**: `src/components/dashboard-shell-new.tsx`
- **Action**: Add workspace selector + language/theme to avatar dropdown
- **Details**:
  - Avatar shows initials (e.g., user first+last initial) in circle
  - Dropdown: Workspace row (logo + name + "Lite" badge + check) → "New workspace" → divider → Account Settings → Theme (chevron) → Language (badge EN/PT-BR + chevron with picker) → divider → Logout
  - Use existing settings dialog for Account Settings
- **Depends on**: None
- [x] Done

### Task 2.3: Verify Sidebar

- **File**: `src/components/app-sidebar-new.tsx`
- **Action**: Verify colors, animations, credits section match reference
- **Details**:
  - Background: match `#FBFCFD` (verify `bg-sidebar` CSS var)
  - Collapsed: 56px, icon tooltips
  - Expanded: 240px, "Snew" text + credits + Upgrade button
  - Active state: `bg-accent text-foreground font-medium`
  - Transition: `duration-300 ease-in-out`
- **Depends on**: None
- [x] Done

---

## Phase 3: Secondary Pages

### Task 3.1: Update Apps Page

- **File**: `src/components/apps/apps-client.tsx`
- **Action**: Simplify to 2-column emoji grid matching reference
- **Details**:
  - Title: "Apps" + subtitle "Connect your tools so co-workers can act on your data. N connected."
  - Security note: ShieldCheck icon + "Credentials are encrypted..." row
  - Search: rounded-2xl muted bg input
  - Grid: 2-column, each cell: emoji (text-2xl) + name (text-sm font-medium) + Connected pill or Connect button
  - Connected: checkmark + "Connected" pill (hover shows "Disconnect")
  - 12 apps matching reference (add emoji field to AppIntegration type)
- **Depends on**: None
- [x] Done

### Task 3.2: Update History Page

- **File**: `src/app/(dashboard)/history/page.tsx` + new client component
- **Action**: Match reference grouped conversation list
- **Details**:
  - Title: "History" + "N conversations" subtitle
  - Search input (rounded-2xl muted bg)
  - Grouped by date: "Today", "Yesterday", dated groups
  - Each row: title (left) + date (right) + more menu on hover (MoreHorizontal icon)
  - Menu: Share (with Private/Public visibility submenu) + Delete (red)
  - Mock: 5 conversations from reference data
  - Max width: `max-w-3xl mx-auto`
- **Depends on**: None
- [x] Done

### Task 3.3: Update Notifications Page

- **File**: `src/app/(dashboard)/notifications/page.tsx` + new client component
- **Action**: Match reference notification list with detail drawer
- **Details**:
  - Title: "Notifications" + "Actions recommended by your co-workers"
  - "Mark all as read" button (CheckCheck icon, top right)
  - Sections: "New · N" (unread) + "Earlier" (read, opacity-70)
  - Card: category badge (colored by category) + title (font-semibold) + reasoning text + unread dot
  - Category colors: Customer Service (blue hsl(220)), Marketing (purple hsl(280)), Competitors (amber hsl(35)), Analytics (green hsl(150))
  - Click opens Sheet (shadcn) with: category badge + coworker + urgency, title, "Why this matters" section, "Suggested action" CTA card, Take action + Dismiss buttons
  - Mock: 6 notifications (4 unread, 2 read)
- **Depends on**: None
- [x] Done

### Task 3.4: Update New Chat Empty State

- **File**: `src/app/(dashboard)/chat/page.tsx` or related client component
- **Action**: Match reference centered empty state
- **Details**:
  - Centered vertically: Bot icon in black circle (w-10 h-10) → "What can I help you with?" h2 → subtitle → 4 suggestion pill buttons
  - Bottom-fixed textarea: "Ask Snew anything..." with send button
  - Suggestions: "What drove the most revenue for Minha Loja this week?", "Which products have the highest return rate?", "Are there customers at risk of churning?", "What are competitors doing that I should react to?"
- **Depends on**: None
- [x] Done

### Task 3.5: Update Discover/Co-Workers Page

- **File**: `src/components/discover/discover-client.tsx`
- **Action**: Match reference title, tabs, and card format
- **Details**:
  - Title: "Co-Workers" (not "Agents")
  - Subtitle: "Instale especialistas para trabalhar dentro do Snew. N ativos."
  - Search: "Buscar agentes..." rounded-2xl muted bg
  - Tabs: Todos (count), Ativos (count), Recomendados (count) + Categoria dropdown
  - 3-column grid cards: avatar + name + green dot (if active) + description
  - Cards are tall (~200px) with hover state, clickable
  - Click non-installed → detail modal (already exists or port from reference)
  - Click installed → navigate to `/agents/{id}` (existing behavior)
- **Depends on**: None
- [x] Done

---

## Phase 4: Polish & Verification

### Task 4.1: Visual Comparison

- **Action**: Compare each page against reference screenshots
- **Details**: Open relay on localhost:3000 and reference on localhost:8080 side-by-side, verify pixel-level parity
- **Depends on**: All Phase 1-3 tasks
- [x] Done

### Task 4.2: Test Interactive Elements

- **Action**: Click every interactive element and verify behavior
- **Details**: Intent card modal, coworker cards, notification drawer, history menus, chat flow, sidebar collapse/expand, avatar dropdown
- **Depends on**: 4.1
- [x] Done

### Task 4.3: Build Verification

- **Action**: Run `bun run build` and `bun run lint` — zero errors
- **Depends on**: 4.2
- [x] Done
