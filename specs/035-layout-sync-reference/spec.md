# 035 — Layout Sync with Reference App (snew-agent-mind)

## Overview

Synchronize the Relay project layout and UI to match the reference app at `localhost:8080` (`/home/Projects/snew-agent-mind/`). The reference is a Vite+React 18 prototype; Relay is a Next.js 16 production app. The goal is pixel-level parity on all pages using mock data where real data isn't available yet.

**Branch**: `030-agent-modal-real-integration` (current, no branch change)
**Approach**: Mock data first, real data integration on demand later.

---

## Page-by-Page Comparison

### 1. HOME PAGE (Reference `/` → Relay `/dashboard`)

#### 1.1 Header Section

| Aspect            | Reference                                                     | Relay (Current)                                          | Action                                                    |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Heading           | `"o que você quer resolver hoje?"` centered, ~2xl font-medium | Dynamic greeting with scenario dropdown ("Bom dia, ...") | **REPLACE**: Use reference centered heading with subtitle |
| Subtitle          | `"3 agentes ativos · última atividade há 2h"`                 | Scenario-based sub text                                  | **REPLACE**: Static subtitle matching reference           |
| Metrics cards     | **None**                                                      | 5 metric cards row (active agents, executions, etc.)     | **REMOVE**: Remove MetricsCards from home                 |
| Scenario selector | **None**                                                      | Dropdown switching between 4 demo scenarios              | **REMOVE**: Remove scenario selector                      |

#### 1.2 AskBar Section

| Aspect           | Reference                                                                                                                                      | Relay (Current)                | Action                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout           | Textarea with placeholder + send arrow, 3 suggestion pills below                                                                               | Similar AskBar component       | **ADJUST**: Match placeholder text `"Pergunte algo sobre sua loja… ex: \"quais clientes não compram há 60 dias?\""` and 3 suggestion pills below |
| Suggestion pills | `"Quais carrinhos têm maior chance de conversão?"`, `"Aprovar sequência WhatsApp de recuperação"`, `"Quais clientes estão em risco de churn?"` | May have different suggestions | **UPDATE**: Match exact suggestion text                                                                                                          |

#### 1.3 Intent Cards Carousel (NEW)

| Aspect         | Reference                                                                                                        | Relay (Current)    | Action                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------- |
| Component      | 3-column card carousel, 12 cards total, 4 pages, pagination dots + prev/next arrows                              | **Does not exist** | **CREATE**: New `IntentCards` component |
| Card structure | Colored thumbnail (aspect-video) with emoji → dot + category label → title → "N co-workers" footer with border-t | N/A                | Port from reference `IntentCards.tsx`   |
| Card modal     | Click opens modal with coworker list, install wizard integration                                                 | N/A                | Port modal component                    |
| Pagination     | Dots (active=w-3 bg-foreground/40, inactive=w-1 bg-muted-foreground/25)                                          | N/A                | Match reference dots                    |

#### 1.4 Co-worker Recomendado Section

| Aspect     | Reference                                                          | Relay (Current)                          | Action                                            |
| ---------- | ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------- |
| Layout     | Avatar (img) + Name + "Inativo" badge + long description paragraph | Similar CoworkerRecommendation component | **VERIFY**: Match avatar, badge, and text styling |
| Card style | `rounded-xl bg-muted/50 hover:bg-muted/70` clickable               | May differ                               | **ADJUST**: Match styling                         |

#### 1.5 Conecte Seus Apps Section (NEW on Home)

| Aspect     | Reference                                                                                        | Relay (Current)            | Action                               |
| ---------- | ------------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------ |
| Section    | "Conecte seus apps" heading + "ver todos" link → 4 app rows                                      | **Does not exist on home** | **CREATE**: New section on home page |
| App row    | Logo/emoji + name + "Conectado"/"Desconectado" badge + description + chevron                     | N/A                        | Create component                     |
| Apps shown | Shopify (connected), Meta Ads (connected), Google Analytics (disconnected), Gmail (disconnected) | N/A                        | Mock data                            |

#### 1.6 Co-workers em Acao Section

| Aspect         | Reference                                                                         | Relay (Current)            | Action                                     |
| -------------- | --------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------ |
| Layout         | Horizontal scroll, 5 agent cards + "Adicionar co-worker" link card                | Exists (CoworkersInAction) | **ADJUST**: Match exact card format        |
| Card structure | Avatar + Name header → long summary paragraph → "Resultado recente" label + value | Different card format      | **UPDATE**: Match reference card structure |
| Agents shown   | Carrinho Abandonado, Sales Analyst, Retencao, Customer Service, Marketing Agent   | From DB or mock            | Use mock data matching reference           |
| Add card       | `+ Adicionar co-worker` link to `/discover`                                       | May not exist              | **ADD**: "Adicionar co-worker" card at end |

#### 1.7 Oportunidades Detectadas Section

| Aspect         | Reference                                                                  | Relay (Current)               | Action                      |
| -------------- | -------------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| Layout         | 3 opportunity cards, vertical list                                         | Exists (OpportunitiesSection) | **ADJUST**: Match format    |
| Card structure | Avatar + Agent name header → description paragraph + value badge (colored) | Different format              | **UPDATE**: Match reference |
| Value badges   | `"~R$3.200"`, `"Risco alto"`, `"+R$1.800"`                                 | Different values              | **UPDATE**: Mock data       |

---

### 2. SIDEBAR

| Aspect            | Reference                                             | Relay (Current)          | Action                               |
| ----------------- | ----------------------------------------------------- | ------------------------ | ------------------------------------ |
| Background        | `backgroundColor: "#FBFCFD"`                          | `bg-sidebar` CSS var     | **VERIFY**: Match color              |
| Logo collapsed    | `"S"` text in black rounded-md square (w-6 h-6)       | SVG icon in black square | **KEEP**: Relay uses SVG, acceptable |
| Logo expanded     | `"Snew"` text (text-sm font-semibold)                 | `"Snew"` text with SVG   | **OK**: Already matches              |
| Nav items         | Home, New Chat, Co-workers, Apps, History             | Same items               | **OK**: Matches                      |
| Nav icons         | Home, Plus, Bot, LayoutGrid, Clock                    | Same icons               | **OK**: Matches                      |
| Active state      | `bg-accent text-foreground font-medium`               | Similar                  | **VERIFY**: Match exactly            |
| Collapsed width   | 56px                                                  | 56px                     | **OK**: Matches                      |
| Expanded width    | 240px                                                 | 240px                    | **OK**: Matches                      |
| Credits section   | Zap icon + "847 credits remaining" + "Upgrade" button | Credits from usage data  | **OK**: Similar pattern              |
| Collapsed credits | Zap icon in bordered button with tooltip              | Similar                  | **VERIFY**: Match                    |
| Animation         | `transition-[width] duration-300 ease-in-out`         | Same                     | **OK**: Matches                      |

---

### 3. TOP BAR

| Aspect            | Reference                                                                                          | Relay (Current)                  | Action                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| Height            | `h-[48px]`                                                                                         | May differ                       | **VERIFY**: Match 48px                                                          |
| Toggle button     | PanelLeft icon, `"Expandir sidebar"/"Recolher sidebar"` title                                      | Similar                          | **OK**                                                                          |
| Feedback button   | `"Feedback"` outlined small button (h-7 px-2.5 text-[11px])                                        | **Does not exist**               | **ADD**: Feedback button                                                        |
| Suporte button    | `"Suporte"` outlined small button                                                                  | **Does not exist**               | **ADD**: Suporte button                                                         |
| Divider           | `w-px h-5 bg-border mx-1`                                                                          | May not exist                    | **ADD**: Vertical divider                                                       |
| Folder button     | Folder icon button                                                                                 | **Does not exist**               | **ADD**: Folder button                                                          |
| Notification bell | Bell icon with dot badge (`w-1.5 h-1.5 rounded-full bg-foreground`)                                | Exists, may differ               | **ADJUST**: Match dot style                                                     |
| User avatar       | `"JP"` initials in circle, dropdown with workspace selector                                        | Avatar image, different dropdown | **ADJUST**: Add workspace selector, language switcher, theme option to dropdown |
| Avatar dropdown   | Workspace name + "Lite" badge + check, New workspace, Settings, Theme, Language (EN/PT-BR), Logout | Different content                | **UPDATE**: Match dropdown items                                                |

---

### 4. NEW CHAT PAGE (Reference `/new-chat` → Relay `/chat`)

| Aspect      | Reference                                                                                                      | Relay (Current)                        | Action                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| Empty state | Centered Bot icon in black circle (w-10 h-10) + "What can I help you with?" h2 + subtitle + 4 suggestion pills | Different or redirects to orchestrator | **CREATE/UPDATE**: Match empty state       |
| Subtitle    | "Ask anything about your store — Snew routes your question to the right co-workers."                           | May differ                             | **UPDATE**: Match text                     |
| Suggestions | 4 pill buttons with store-specific questions                                                                   | May differ                             | **UPDATE**: Match pills                    |
| Input       | Bottom-fixed textarea "Ask Snew anything..." with send button                                                  | May differ                             | **UPDATE**: Match input position and style |
| Chat flow   | Messages with Bot avatar, typing indicator, follow-up suggestions, artifact chips, coworker suggestion cards   | May partially exist                    | **UPDATE**: Match chat UX                  |

---

### 5. CO-WORKERS / DISCOVER PAGE (Reference `/discover` → Relay `/agents`)

| Aspect         | Reference                                                                                                       | Relay (Current)               | Action                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| Title          | `"Co-Workers"` (h1, text-2xl font-medium)                                                                       | May say "Agents" or different | **UPDATE**: Use "Co-Workers"                                              |
| Subtitle       | `"Instale especialistas para trabalhar dentro do Snew. 4 ativos."`                                              | Different text                | **UPDATE**: Match                                                         |
| Search         | `"Buscar agentes..."` rounded-2xl muted bg                                                                      | Different style               | **UPDATE**: Match search style                                            |
| Tabs           | `Todos (136)`, `Ativos (4)`, `Recomendados (6)` + Categoria dropdown                                            | Different filtering           | **UPDATE**: Add tab-style filters                                         |
| Card grid      | 3-column grid, each card: avatar + name + active dot + description, large clickable area ~200px height          | Different card format         | **UPDATE**: Match card format                                             |
| Card structure | Avatar (CoworkerAvatar) + name (text-sm font-medium) + green dot (if active) + description (text-sm text-muted) | Different                     | **UPDATE**: Match                                                         |
| Card count     | 136 total coworkers in catalog                                                                                  | 27 agents                     | **UPDATE**: Expand data to match reference (use mock from `coworkers.ts`) |

---

### 6. APPS PAGE (Reference `/apps` → Relay `/apps`)

| Aspect          | Reference                                                                                                                | Relay (Current)                     | Action                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------- |
| Title           | `"Apps"`                                                                                                                 | Same                                | **OK**                                                    |
| Subtitle        | `"Connect your tools so co-workers can act on your data. 2 connected."`                                                  | Similar                             | **ADJUST**: Match exact text                              |
| Security notice | ShieldCheck icon + "Credentials are encrypted..." in bordered row                                                        | May exist                           | **VERIFY**: Match styling                                 |
| Search          | Rounded-2xl muted bg input                                                                                               | May differ                          | **ADJUST**: Match style                                   |
| Grid            | 2-column, each cell: emoji + name + Connected/Connect button                                                             | May have logo images and categories | **SIMPLIFY**: Match reference 2-col emoji-based layout    |
| Connected state | Checkmark + "Connected" pill, hover → "Disconnect" button                                                                | Different interaction               | **UPDATE**: Match hover behavior                          |
| App count       | 12 apps (Shopify, Gmail, GA, Meta Ads, Google Ads, Klaviyo, Slack, Notion, Airtable, Stripe, HubSpot, WhatsApp Business) | 11 apps with real connection logic  | **KEEP**: Real connection logic, add missing apps as mock |

---

### 7. HISTORY PAGE (Reference `/history` → Relay `/history`)

| Aspect     | Reference                                                                                                                                          | Relay (Current)              | Action                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------- |
| Title      | `"History"` (text-2xl font-medium)                                                                                                                 | May differ                   | **UPDATE**: Match                  |
| Subtitle   | `"5 conversations"`                                                                                                                                | May differ                   | **UPDATE**: Match format           |
| Search     | `"Search chats..."` rounded-2xl muted bg                                                                                                           | May differ                   | **UPDATE**: Match                  |
| Grouping   | By date: "Today", "Yesterday", "Mar 28"                                                                                                            | May differ                   | **UPDATE**: Match grouping         |
| Row format | Title (left) + date (right) + more menu on hover                                                                                                   | May differ                   | **UPDATE**: Match row format       |
| Row menu   | Share (with visibility: Private/Public submenu) + Delete                                                                                           | May differ                   | **UPDATE**: Match menu items       |
| Max width  | `max-w-3xl mx-auto`                                                                                                                                | May differ                   | **UPDATE**: Match width constraint |
| Mock data  | 5 chats: "Win-back campaign strategy", "Competitor pricing analysis", "Checkout drop-off review", "Weekend revenue insights", "Ad waste breakdown" | May have different/real data | **ADD**: Mock data fallback        |

---

### 8. NOTIFICATIONS PAGE (Reference `/notifications` → Relay `/notifications`)

| Aspect            | Reference                                                                                                              | Relay (Current)         | Action                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------- |
| Title             | `"Notifications"` (text-2xl font-medium)                                                                               | May differ              | **UPDATE**: Match                      |
| Subtitle          | `"Actions recommended by your co-workers"`                                                                             | May differ              | **UPDATE**: Match                      |
| Mark all read     | `CheckCheck` icon + "Mark all as read" button (top right)                                                              | May differ              | **UPDATE**: Match                      |
| Sections          | "New · 4" and "Earlier"                                                                                                | May differ              | **UPDATE**: Unread/read grouping       |
| Notification card | Category badge (colored) + title (font-semibold) + reasoning text + unread dot                                         | May differ              | **UPDATE**: Match card format          |
| Category colors   | Customer Service (blue hsl(220)), Marketing (purple hsl(280)), Competitors (amber hsl(35)), Analytics (green hsl(150)) | May differ              | **UPDATE**: Match colors               |
| Detail drawer     | Sheet/drawer with category, coworker, urgency, title, reasoning, CTA, action buttons                                   | May not exist           | **CREATE**: Notification detail drawer |
| Mock data         | 6 notifications (4 unread, 2 read) from Conversion Optimizer, Competitor Watch, Customer Service, Revenue Intelligence | May have different data | **ADD**: Mock data                     |

---

## Mock Data Requirements

### Home Page Mock Data

```typescript
// Intent Cards: Port from reference IntentCards.tsx (12 cards)
// Co-worker recommendation: Marketing Agent, "Inativo", R$8.400/mês description
// Apps section: 4 apps (Shopify connected, Meta Ads connected, GA disconnected, Gmail disconnected)
// Co-workers in action: 5 agents with summaries and "Resultado recente" values
// Opportunities: 3 cards with agent, description, value badge
```

### Coworker Catalog

Port `coworkers.ts` from reference (150+ coworkers) as extended mock data for the discover page.

### Notifications

6 mock notifications with category colors and urgency levels.

### History

5 mock chat conversations grouped by date.

---

## Files to Create/Modify

### New Files

1. `src/components/home/intent-cards.tsx` — Carousel component (port from reference)
2. `src/components/home/connect-apps-section.tsx` — Apps preview on home
3. `src/data/coworkers-catalog.ts` — Extended coworker catalog (150+ entries)
4. `src/data/notifications-mock.ts` — Mock notifications data
5. `src/data/history-mock.ts` — Mock chat history data

### Modified Files

1. `src/components/home/home-client-new.tsx` — Remove MetricsCards/scenarios, add IntentCards + ConnectApps
2. `src/components/home/greeting-section-new.tsx` — Simplify to centered heading + subtitle
3. `src/components/home/coworkers-in-action.tsx` — Match reference card format
4. `src/components/home/opportunities-section.tsx` — Match reference format
5. `src/components/home/ask-bar.tsx` — Match placeholder and suggestion pills
6. `src/components/home/coworker-recommendation.tsx` — Match reference styling
7. `src/components/dashboard-shell-new.tsx` — Update TopBar area (add Feedback/Suporte buttons)
8. `src/components/app-sidebar-new.tsx` — Verify/adjust colors
9. `src/components/apps/apps-client.tsx` — Simplify to 2-col emoji grid
10. `src/app/(dashboard)/history/page.tsx` — Update to match reference
11. `src/app/(dashboard)/notifications/page.tsx` — Update to match reference
12. `src/app/(dashboard)/chat/page.tsx` — Update empty state to match reference
13. `src/components/discover/discover-client.tsx` — Update to match reference tabs + card format

---

## Implementation Priority

### Phase 1: Home Page (Highest Visual Impact)

1. Simplify greeting to centered heading + subtitle
2. Remove MetricsCards and scenario selector
3. Create IntentCards carousel
4. Add ConnectApps section
5. Update CoworkersInAction card format
6. Update Opportunities card format

### Phase 2: Layout Shell (Sidebar + TopBar)

7. Add Feedback/Suporte buttons to TopBar
8. Add Folder + notification dot to TopBar
9. Update avatar dropdown (workspace, language, theme)
10. Verify sidebar colors/animations

### Phase 3: Secondary Pages

11. Update Apps page to 2-col emoji grid
12. Update History page to match reference
13. Update Notifications page to match reference
14. Update New Chat empty state
15. Update Discover/Co-workers page

### Phase 4: Polish

16. Verify all spacing, typography, colors
17. Test collapsed/expanded sidebar states
18. Verify mobile responsiveness
19. Dark mode verification

---

## Interactive Elements Audit (All Clicks Verified)

### 9. INSTALLED AGENT PAGE (Reference `/installed/:coworkerId`)

This is a **new page type** not present in Relay. When clicking an active coworker (from home or discover), it navigates to a 2-panel layout.

**Left Panel — Chat:**

- Avatar (CoworkerAvatar) + "Chat with {name} — give instructions, ask for reports, or adjust its behaviour."
- 4 suggestion pill buttons (contextual per agent)
- Textarea input "Message {name}..." with send button
- Bot avatar (black circle) for assistant messages
- User messages right-aligned with gray bubble

**Right Panel — 4 Tabs:**

| Tab            | Content                                                                                                                                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hoje**       | Avatar + name + category, summary paragraph, 3 KPI metric cards (large number + label + delta), Action log timeline (dot + description + time badge, some with colored "agora"/"e-mail"/"PDF"/"Pendente" tags)                                                                                 |
| **resultados** | 3 metric cards (value + label + delta), "Receita em risco" value, "Generated files" list (4 files: PDF 1.4MB, CSV 76KB, Chart 310KB, Chart 240KB — each with title, type badge, size, description, date, copy/share/download buttons)                                                          |
| **configurar** | Configuration form: Run schedule (select: hourly/6h/daily/weekly), Notification channel (select: in-app/email/slack), Auto-execute actions (toggle switch), Escalation threshold (select: low/medium/high), Connected tools (pill badges: Shopify/Gmail/WhatsApp), "Save changes" black button |
| **conexoes**   | Connected sources list (dot + name + "Active" label), "Add connection" button with Plus icon                                                                                                                                                                                                   |

**TopBar changes on this page:**

- Back button (ChevronLeft)
- Agent name + dropdown arrow (click shows "Editar Co-worker" option)

### 10. COWORKER DETAIL MODAL (from Discover page, non-installed)

When clicking a non-installed coworker card on `/discover`:

- **Full-screen modal** with backdrop blur
- Avatar (large, centered) + Name + Category subtitle
- Description paragraph
- **3 KPI metric cards** (e.g., "+35% retencao VIP", "3x frequencia de compra", "100% toque personalizado")
- **3 skill blocks** with emoji + description (e.g., "👑 Identifica e segmenta VIPs")
- **"Recomendado para"** section with tag pills (e.g., "base com 500+ clientes", "ticket medio alto")
- **"Ativar {name}"** black CTA button + subtitle ("Primeiros clientes VIP segmentados em menos de 2h")

### 11. INSTALL WIZARD (2-step flow from Ativar button)

**Step 1 — Plan Preview:**

- Avatar + Name + Category (same as modal header)
- 4 numbered action steps, each with:
  - Step number in circle
  - Title (bold)
  - Description
  - Timing badge: "Ao ativar", "Automatico", "Continuo", "Semanal"
- Clock icon + ETA text at bottom
- **"Proximo: Conexoes e canais >"** black CTA button

**Step 2 — Connections & Channels:**

- "Integracoes necessarias": Green checkmark + "Todas as integracoes necessarias estao ativas."
- "Onde deseja receber": 4 channel cards (WhatsApp, Telegram, E-mail, Slack) with emoji icons — selectable
- **"Ativar {name}"** black CTA button + "Voce pode pausar ou desativar a qualquer momento."

**Close Confirmation Dialog:**

- Warning icon + "Tem certeza?" + "Seu progresso sera perdido."
- "Continuar" (ghost) + "Fechar" (outlined) buttons

### 12. INTENT CARD MODAL (from Home page carousel)

When clicking an intent card:

- Category dot + pill text + title + description
- **Coworker list** with avatars, name, "ativo" badge (if installed), description, arrow icon
- "ver todos no catalogo →" link at bottom
- X close button

### 13. CHAT FLOW (New Chat page after sending message)

**Message sent:**

- User bubble right-aligned (rounded-2xl, bg-muted)
- Bot avatar (black circle with Bot icon) + reply text (left-aligned, no bubble)
- **Artifact chips** below reply: icon + title buttons (e.g., "Analise de conversao", "Plano de acao", "Script de analise")
- **Follow-ups** section: "Follow-ups" label + 4 suggestion rows with CornerDownRight icon in bordered list

**TopBar after first message:**

- Shows truncated chat title with dropdown arrow
- Dropdown has: Favoritar, Mudar o nome, Mudar projeto, Remover do projeto, divider, Apagar (red)

### 14. ARTIFACT PANEL (from clicking artifact chip in chat)

- **Resizable right panel** with drag handle ("Arraste para redimensionar")
- **Header**: Title + version badge "v1 · Recente" + Copy/Expand/Collapse buttons
- **Tabs**: hoje (icon), resultados (icon), configurar (icon), conexoes (icon)
- **Content**: Data table with Metrica | Valor | Variacao columns
- Positive/negative delta coloring (green/red)

### 15. AVATAR DROPDOWN (verified)

- Workspace row: "S" logo + "Milkes" name + "Lite" green badge + checkmark
- "+ New workspace" button
- Divider
- Account Settings (Settings icon)
- Theme (Palette icon + chevron)
- Language (Globe icon + "EN"/"PT-BR" badge + chevron → expands to English/Portugues picker with checkmark)
- Divider
- Logout (LogOut icon)

---

## Screenshots Captured

All screenshots saved to `screenshots/` directory:

- `ref-home-1440.png` — Home page full (1440x900)
- `ref-sidebar-expanded.png` — Sidebar expanded state
- `ref-new-chat.png` — New Chat empty state
- `ref-discover.png` — Co-Workers catalog (Todos tab)
- `ref-discover-ativos.png` — Co-Workers catalog (Ativos tab)
- `ref-apps.png` — Apps page
- `ref-history.png` — History page
- `ref-notifications.png` — Notifications page
- `ref-intent-card-modal.png` — Intent card click modal
- `ref-coworker-modal.png` — Coworker detail modal (non-installed)
- `ref-install-wizard-step1.png` — Install wizard step 1
- `ref-install-wizard-step2.png` — Install wizard step 2
- `ref-install-confirm-close.png` — Install wizard close confirmation
- `ref-installed-agent.png` — Installed agent page (hoje tab)
- `ref-agent-resultados.png` — Installed agent (resultados tab)
- `ref-agent-configurar.png` — Installed agent (configurar tab)
- `ref-agent-conexoes.png` — Installed agent (conexoes tab)
- `ref-avatar-dropdown.png` — Avatar dropdown menu
- `ref-notification-detail.png` — Notification detail drawer
- `ref-chat-with-reply.png` — Chat with reply + artifacts + follow-ups
- `ref-chat-artifact-panel.png` — Chat with artifact panel open

---

## Success Criteria

- [ ] Home page matches reference screenshot pixel-for-pixel
- [ ] Sidebar matches in both collapsed and expanded states
- [ ] TopBar has Feedback, Suporte, Folder, Bell with dot, avatar dropdown
- [ ] Intent Cards carousel works with 12 cards, 4 pages
- [ ] Apps page shows 2-column emoji grid
- [ ] History page shows grouped conversations with search
- [ ] Notifications page shows categorized notifications with detail drawer
- [ ] New Chat page shows centered empty state with Bot icon
- [ ] All pages use mock data where real data not available
- [ ] No regressions on existing real-data integrations
