# Feature Specification: Home Page Layout Redesign V2

**Feature Branch**: `feat/layout-redesign-v2`
**Created**: 2026-03-30
**Status**: Draft
**Prototype**: `~/Projects/snew-ai-core/` (Vite app at `localhost:8080`)
**Input**: Pixel-perfect reproduction of the new Home page from the snew-ai-core prototype into the relay Next.js app. All data is mock for now.

---

## Overview

Replace the current Home/Dashboard page (`/dashboard`) with a new design that centers around a **chat-first experience** with contextual skill suggestions. The new layout features:

1. **Rotating hero greeting** with animated text cycling
2. **Chat input** with suggestion chips
3. **Activity feed** ("O que o Snew fez pela sua loja") with 3 horizontal cards
4. **Skill actions grid** ("What Snew can do for you") with category filter tabs and 12 gradient cards

The sidebar and top bar remain structurally similar to the current implementation but with adjustments to match the prototype (nav item "Tarefas" addition, sidebar skill shortcuts with orb icons, credits section).

---

## Design System — BRAND DNA (from `snew-ai-core/src/config/designSystem.tsx`)

### Base UI Tokens

| Token       | Hex       | CSS Variable         |
| ----------- | --------- | -------------------- |
| `white`     | `#FFFFFF` | —                    |
| `surface`   | `#F8F8F6` | `--background`       |
| `border`    | `#E8E6E0` | `--border`           |
| `borderHov` | `#D0CEC8` | —                    |
| `ink`       | `#1A1916` | `--foreground`       |
| `inkMuted`  | `#6B6860` | `--muted-foreground` |
| `inkDim`    | `#A8A49C` | —                    |

### Font

- **Family**: `Inter, system-ui, -apple-system, sans-serif`

### 5 Gradient Families

Each family has: `card` (linear-gradient for cards), `bubble` (radial-gradient for orb avatars), `ink` (text color), `seed` (SVG filter turbulence seed).

| Family       | Card Gradient                                                    | Bubble Gradient                                                                       | Ink       |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------- |
| **sageHaze** | `linear-gradient(158deg, #D0D8CC 0%, #E4ECD8 50%, #ECF0DC 100%)` | `radial-gradient(circle at 62% 38%, #E8F0DC, #B8CCA8 28%, #8CB898 55%, #A8C8B0 100%)` | `#3A4A3A` |
| **duskRose** | `linear-gradient(145deg, #E0D0E0 0%, #F4D0C4 50%, #E8D0D8 100%)` | `radial-gradient(circle at 38% 38%, #F8D8E8, #E898C0 28%, #C870A8 55%, #9868C8 100%)` | `#5A3A4A` |
| **aurora**   | `linear-gradient(150deg, #C8DCD8 0%, #E4D8E4 45%, #F0DDD0 100%)` | `radial-gradient(circle at 60% 35%, #D8F0EC, #70D8C0 28%, #88C0E8 58%, #C0A8F0 100%)` | `#3A5A58` |
| **mist**     | `linear-gradient(155deg, #DCE8EC 0%, #F2EDE8 50%, #D8E4EA 100%)` | `radial-gradient(circle at 40% 62%, #E0EEF4, #98C8DC 32%, #B8D8EC 60%, #D8E8F4 100%)` | `#3A4A50` |
| **blueDusk** | `linear-gradient(160deg, #D4E0EA 0%, #F0E4D8 50%, #D8E0EA 100%)` | `radial-gradient(circle at 55% 35%, #E0ECF8, #90B8D8 30%, #A8C8E8 58%, #D8C8E0 100%)` | `#3A4A5A` |

### Category → Gradient Family Mapping

```ts
const CATEGORY_GRADIENT: Record<string, BrandGradientKey> = {
  'Seasonal Calendar': 'sageHaze',
  Copywriter: 'mist',
  'Image Generator': 'aurora',
  'Social Asset Creator': 'aurora',
  'Video Script Creator': 'duskRose',
  'Retention Engine': 'blueDusk',
  'Inventory Manager': 'sageHaze',
  'Post-Purchase': 'aurora',
  'Ops Pilot': 'mist',
  'Brand DNA': 'mist', // same as Copywriter
}
```

### BubbleAvatar Component

Each sidebar skill shortcut and some card elements use a **BubbleAvatar** — a holographic sphere effect:

```
Structure:
├── Container (circle, size x size)
│   ├── Organic texture layer (bubble gradient + SVG feTurbulence filter, opacity 0.35)
│   ├── Main gradient layer (bubble gradient)
│   │   └── Specular highlight (ellipse, white radial-gradient, rotated -15deg)
│   └── Iridescent border (1px solid rgba(255,255,255,0.25))
```

SVG Filters (inject once in layout):

```html
<svg width="0" height="0" style="position:absolute">
  <filter id="snew-f-sageHaze">
    <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="2" />
    <feDisplacementMap in="SourceGraphic" scale="12" />
  </filter>
  <filter id="snew-f-duskRose">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7" />
    <feDisplacementMap in="SourceGraphic" scale="10" />
  </filter>
  <filter id="snew-f-aurora">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="14" />
    <feDisplacementMap in="SourceGraphic" scale="14" />
  </filter>
  <filter id="snew-f-mist">
    <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="21" />
    <feDisplacementMap in="SourceGraphic" scale="11" />
  </filter>
  <filter id="snew-f-blueDusk">
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="33" />
    <feDisplacementMap in="SourceGraphic" scale="13" />
  </filter>
</svg>
```

Float animation durations per family: sageHaze `3.2s`, duskRose `3.7s`, aurora `2.9s`, mist `3.5s`, blueDusk `3.1s`.

### Spacing & Layout

- **Page background**: `rgb(251, 251, 249)` / `hsl(var(--background))`
- **Content max-width**: `880px` (increased from current `720px`)
- **Content padding**: `64px 32px 48px`
- **Section gap**: `64px`
- **Content auto-centered** with equal margin on both sides

---

## User Scenarios & Testing

### User Story 1 - Home Hero & Chat Input (Priority: P1)

A user lands on the Home page and sees a **rotating hero greeting** that cycles through contextual messages, a prominent **chat textarea** with placeholder text, and **3 suggestion chips** below. Typing and pressing Enter navigates to `/chat?q=<message>`.

**Acceptance Scenarios**:

1. **Given** the user loads `/dashboard`, **When** the page renders, **Then** they see a centered hero text that animates/rotates between messages like "Pergunte qualquer coisa sobre sua loja.", "O que fazemos juntos hoje?", "Sua loja. Suas vendas. Eu cuido do resto.", "Como posso ajudar a Milkes a vender mais?"
2. **Given** the hero section renders, **When** the user sees the chat input, **Then** it shows a textarea with placeholder "Pergunte sobre campanhas, copies, assets, dados..." inside a rounded container with subtle shadow.
3. **Given** the chat input is visible, **When** the user types a message and presses Enter, **Then** they are navigated to `/chat?q=<encoded_message>`.
4. **Given** the suggestion chips render, **When** the user clicks one, **Then** they are navigated to `/chat?q=<chip_text>`.

#### Pixel-Perfect Specs — Hero Title

| Property    | Value                                               |
| ----------- | --------------------------------------------------- |
| Font size   | `20px`                                              |
| Font weight | `500`                                               |
| Color       | `rgb(44, 42, 37)`                                   |
| Text align  | `center`                                            |
| Line height | `30px`                                              |
| Animation   | Text cycling/rotation (cross-fade between messages) |

**Rotating messages** (from prototype, cycles every 5 seconds with cross-fade via framer-motion `AnimatePresence`):

```ts
const HEADLINES = [
  'O que sua loja precisa hoje?',
  'Como posso ajudar a Milkes a vender mais?',
  'Sua loja. Suas vendas. Eu cuido do resto.',
  'O que fazemos juntos hoje?',
  'Pergunte qualquer coisa sobre sua loja.',
]
```

**Animation**: `AnimatePresence mode="wait"`, `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`, `transition={{ duration: 0.2 }}`. Container has `minHeight: 30` to prevent layout shift. Starts at random index.

#### Pixel-Perfect Specs — Chat Input

| Property              | Value                                                                |
| --------------------- | -------------------------------------------------------------------- |
| **Outer container**   |                                                                      |
| Max width             | `680px`                                                              |
| Display               | `flex`, column, gap `24px`                                           |
| **Input wrapper**     |                                                                      |
| Background            | `rgb(251, 251, 249)`                                                 |
| Border                | `1px solid rgb(227, 225, 222)`                                       |
| Border radius         | `16px`                                                               |
| Box shadow            | `rgba(0,0,0,0.04) 0px 2px 8px 0px, rgba(0,0,0,0.02) 0px 0px 0px 1px` |
| Width                 | `680px` (max-width, responsive)                                      |
| **Textarea**          |                                                                      |
| Font size             | `14px`                                                               |
| Font weight           | `400`                                                                |
| Padding               | `16px 20px 12px`                                                     |
| Placeholder color     | `rgb(153, 149, 143)` (muted-foreground)                              |
| Rows                  | `2` (auto-expand)                                                    |
| **Send button**       |                                                                      |
| Size                  | `32px x 32px`                                                        |
| Border radius         | `9999px` (full circle)                                               |
| Background (empty)    | `rgb(244, 243, 241)`                                                 |
| Color (empty)         | `rgb(153, 149, 143)`                                                 |
| Background (has text) | `rgb(44, 42, 38)` (foreground)                                       |
| Color (has text)      | `rgb(251, 251, 249)` (background)                                    |
| Icon                  | `ArrowUp`, `16px`                                                    |
| Position              | Bottom-right of input wrapper                                        |

#### Pixel-Perfect Specs — Suggestion Chips

| Property      | Value                            |
| ------------- | -------------------------------- |
| Font size     | `13px`                           |
| Font weight   | `400`                            |
| Color         | `rgb(107, 103, 96)`              |
| Border        | `1px solid rgb(229, 227, 220)`   |
| Border radius | `100px` (pill)                   |
| Padding       | `6px 16px`                       |
| Line height   | `19.5px`                         |
| Layout        | `flex-wrap`, centered, gap `8px` |

**Chip texts** (mock):

```ts
const SUGGESTIONS = [
  'Quais são as melhores oportunidades sazonais?',
  'Mostrar o briefing desta semana',
  'Quais skills devo ativar?',
]
```

---

### User Story 2 - Activity Feed Section (Priority: P1)

Below a horizontal divider, the user sees a section titled "O que o Snew fez pela sua loja" with **3 horizontal activity cards** showing recent actions the AI performed.

**Acceptance Scenarios**:

1. **Given** the activity section renders, **When** the user views it, **Then** they see a centered title "O que o Snew fez pela sua loja" and 3 cards in a horizontal row.
2. **Given** the activity cards render, **When** the user clicks one, **Then** they navigate to the relevant detail (e.g., skill execution, conversation).

#### Pixel-Perfect Specs — Section Title

| Property      | Value             |
| ------------- | ----------------- |
| Font size     | `18px`            |
| Font weight   | `600`             |
| Color         | `rgb(44, 42, 38)` |
| Text align    | `center`          |
| Margin bottom | `6px`             |
| Line height   | `27px`            |

#### Pixel-Perfect Specs — Activity Cards

| Property      | Value                                                |
| ------------- | ---------------------------------------------------- |
| **Container** | 3-column grid, gap `12px`                            |
| **Card**      |                                                      |
| Background    | `var(--artifact-bg, #f7f6f3)` / `rgb(247, 246, 243)` |
| Border        | `1px solid rgb(227, 225, 222)`                       |
| Border radius | `16px`                                               |
| Padding       | `20px`                                               |
| Min height    | `100px`                                              |
| Cursor        | `pointer`                                            |
| **Card text** |                                                      |
| Font size     | `14px`                                               |
| Font weight   | `500`                                                |
| Color         | `rgb(44, 42, 38)`                                    |
| Line height   | ~`19.6px`                                            |

**Mock activity data** (from prototype `AutonomousSection` — cards are clickable, open a modal with detailed results):

```ts
interface AutonomousCard {
  id: string
  badge: string // time label e.g. "há 2h"
  title: string // main text shown on card
  description: string // secondary text shown on card
  skill: string // skill name with emoji e.g. "📅 Seasonal Calendar"
  borderColor: string // left border accent (green: #16A34A, amber: #D97706)
  modalContent: {
    summary: string[] // paragraphs of context
    results: { label: string; value: string }[] // key-value results table
    feedbackQuestion: string // AI asking for user feedback
    extra?: { label: string; items: string[] } // optional extra section
  }
}

const AUTONOMOUS_CARDS: AutonomousCard[] = [
  {
    id: 'a1',
    badge: 'há 2h',
    title: 'Campanha de Páscoa publicada em 3 canais',
    description: '1.247 e-mails, 89 WhatsApp VIP, Instagram às 10:00',
    skill: '📅 Seasonal Calendar',
    borderColor: '#16A34A',
    modalContent: {
      /* ... detailed results ... */
    },
  },
  {
    id: 'a2',
    badge: 'há 4h',
    title: '3 carrinhos recuperados esta madrugada',
    description: 'R$ 687 recuperados. 3 de 8 converteram.',
    skill: '🔄 Post-Purchase',
    borderColor: '#16A34A',
    modalContent: {
      /* ... detailed results ... */
    },
  },
  {
    id: 'a3',
    badge: 'há 6h',
    title: 'Review negativo respondido em 23 min',
    description: 'Atraso na entrega. Resposta empática enviada.',
    skill: '⭐ Review Collector',
    borderColor: '#16A34A',
    modalContent: {
      /* ... detailed results ... */
    },
  },
]
```

> **Note**: The prototype shows 3 visible cards but has more data (including "Estoque baixo: Body Bordado"). For the mock implementation, show the first 3 cards. The click-to-expand modal is **out of scope** for Phase 1 — just show the cards as clickable containers.

---

### User Story 3 - Skill Actions Grid (Priority: P1)

Below another divider, the user sees "What Snew can do for you" with **category filter tabs** and a **3-column grid of 12 gradient action cards**. Each card has a skill name label, a description, and a unique gradient background based on the skill type.

**Acceptance Scenarios**:

1. **Given** the skill actions section renders, **When** the user views it, **Then** they see a title, 5 filter tabs (All, Campaigns, Content, Analytics, Retention), and a 3x4 grid of gradient cards.
2. **Given** all 12 cards render, **When** the user views the cards, **Then** each shows a skill name (small uppercase label) and a description (larger text), with the correct gradient background.
3. **Given** the filter tabs render, **When** the user clicks "Campaigns", **Then** only campaign-related cards are shown.
4. **Given** a skill card is visible, **When** the user clicks it, **Then** they navigate to the relevant skill page or start a chat action.

#### Pixel-Perfect Specs — Section Title

| Property    | Value             |
| ----------- | ----------------- |
| Font size   | `16px`            |
| Font weight | `500`             |
| Color       | `rgb(44, 42, 38)` |
| Text align  | `center`          |

#### Pixel-Perfect Specs — Filter Tabs

| Property                     | Value                                             |
| ---------------------------- | ------------------------------------------------- |
| **Container**                | `flex`, gap `8px`, centered, margin-bottom `20px` |
| **Active tab (e.g., "All")** |                                                   |
| Font size                    | `13px`                                            |
| Font weight                  | `500`                                             |
| Color                        | `rgb(251, 251, 249)` (white text)                 |
| Background                   | `rgb(44, 42, 38)` (dark)                          |
| Border                       | `1px solid rgb(44, 42, 38)`                       |
| Border radius                | `100px`                                           |
| Padding                      | `6px 16px`                                        |
| **Inactive tab**             |                                                   |
| Font size                    | `13px`                                            |
| Font weight                  | `400`                                             |
| Color                        | `rgb(153, 149, 143)` (muted)                      |
| Background                   | transparent                                       |
| Border                       | `1px solid rgb(227, 225, 222)`                    |
| Border radius                | `100px`                                           |
| Padding                      | `6px 16px`                                        |

**Tab items**:

```ts
const FILTER_TABS = ['All', 'Campaigns', 'Content', 'Analytics', 'Retention']
```

#### Pixel-Perfect Specs — Skill Action Cards Grid

| Property              | Value                                                 |
| --------------------- | ----------------------------------------------------- |
| Display               | `grid`                                                |
| Grid template columns | `repeat(3, 1fr)`                                      |
| Gap                   | `16px`                                                |
| Max width             | `816px` (fits within 880px content area with padding) |

#### Pixel-Perfect Specs — Skill Action Card

| Property                          | Value                                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Border radius                     | `20px`                                                                                                                                                                                                     |
| Overflow                          | `hidden`                                                                                                                                                                                                   |
| Min height                        | `220px`                                                                                                                                                                                                    |
| Background                        | `grad.card` (from BRAND gradient family)                                                                                                                                                                   |
| Background size                   | `200% 200%`                                                                                                                                                                                                |
| Background position               | `0% 0%` (default), `100% 100%` (hover)                                                                                                                                                                     |
| Transition                        | `background-position 0.9s ease`                                                                                                                                                                            |
| Display                           | `flex`, `flex-direction: column`                                                                                                                                                                           |
| Cursor                            | `pointer`                                                                                                                                                                                                  |
| **Text area (top)**               |                                                                                                                                                                                                            |
| Padding                           | `28px 28px 0`                                                                                                                                                                                              |
| **Skill name label**              |                                                                                                                                                                                                            |
| Font size                         | `10px`                                                                                                                                                                                                     |
| Font weight                       | `600`                                                                                                                                                                                                      |
| Letter spacing                    | `0.04em` (`0.4px`)                                                                                                                                                                                         |
| Color                             | `grad.ink` with `opacity: 0.5`                                                                                                                                                                             |
| Margin bottom                     | `10px`                                                                                                                                                                                                     |
| **Description text**              |                                                                                                                                                                                                            |
| Font size                         | `17px`                                                                                                                                                                                                     |
| Font weight                       | `500`                                                                                                                                                                                                      |
| Letter spacing                    | `-0.01em` (`-0.17px`)                                                                                                                                                                                      |
| Line height                       | `1.25` (`21.25px`)                                                                                                                                                                                         |
| Color                             | `grad.ink`                                                                                                                                                                                                 |
| **Decorative glow area (bottom)** |                                                                                                                                                                                                            |
| Flex                              | `1`                                                                                                                                                                                                        |
| Margin top                        | `20px`                                                                                                                                                                                                     |
| Min height                        | `100px`                                                                                                                                                                                                    |
| Position                          | `relative`, `overflow: hidden`                                                                                                                                                                             |
| Glow 1                            | `position: absolute; bottom: -30%; left: 50%; transform: translateX(-50%); width: 80%; height: 120%; border-radius: 50%; background: radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)` |
| Glow 2                            | `position: absolute; top: 10%; right: -10%; width: 60%; height: 60%; border-radius: 50%; background: radial-gradient(ellipse, rgba(255,255,255,0.25) 0%, transparent 65%)`                                 |

#### Gradient Themes (from BRAND.gradients — see Design System section above)

Uses the **category → gradient family** mapping. Each card calls `getGradient(card.skill)` to resolve the gradient and ink color.

#### Mock Skill Actions Data (from prototype `CARDS` array)

```ts
type FilterTab = 'all' | 'campaigns' | 'content' | 'analytics' | 'retention'

interface ActionCard {
  id: string
  title: string
  skill: string // skill name — maps to gradient via CATEGORY_GRADIENT
  skillDot: string // hex color for dot indicator
  badge?: { label: string; color: 'red' | 'amber' | 'green' | 'gray' }
  category: FilterTab[] // can belong to multiple categories
  route: string
}

const CARDS: ActionCard[] = [
  {
    id: 'c1',
    title: 'Gerar campanha completa de Dia das Mães',
    skill: 'Seasonal Calendar',
    skillDot: '#F97316',
    badge: { label: 'URGENTE', color: 'red' },
    category: ['campaigns'],
    route: '/chat?q=...',
  },
  {
    id: 'c2',
    title: 'Criar assets visuais pra Páscoa',
    skill: 'Image Generator',
    skillDot: '#A855F7',
    category: ['campaigns', 'content'],
    route: '/chat?q=...',
  },
  {
    id: 'c3',
    title: 'Escrever copies de Dia das Mães pra 6 canais',
    skill: 'Copywriter',
    skillDot: '#3B82F6',
    category: ['content'],
    route: '/chat?q=...',
  },
  {
    id: 'c4',
    title: 'Ver calendário sazonal 2026 com 10 datas',
    skill: 'Seasonal Calendar',
    skillDot: '#F97316',
    badge: { label: '3 precisam de ação', color: 'amber' },
    category: ['campaigns'],
    route: '/chat?q=...',
  },
  {
    id: 'c5',
    title: 'Ativar fluxo pós-venda automático',
    skill: 'Post-Purchase',
    skillDot: '#22C55E',
    badge: { label: 'NOVO', color: 'green' },
    category: ['retention'],
    route: '/chat?q=...',
  },
  {
    id: 'c6',
    title: 'Ver relatório de performance semanal',
    skill: 'Ops Pilot',
    skillDot: '#64748B',
    category: ['analytics'],
    route: '/chat?q=...',
  },
  {
    id: 'c7',
    title: 'Gerar script de Reels: bastidores do bordado',
    skill: 'Video Script Creator',
    skillDot: '#EC4899',
    category: ['content'],
    route: '/chat?q=...',
  },
  {
    id: 'c8',
    title: 'Preparar campanha de Dia dos Namorados',
    skill: 'Seasonal Calendar',
    skillDot: '#F97316',
    badge: { label: 'D-83', color: 'gray' },
    category: ['campaigns'],
    route: '/chat?q=...',
  },
  {
    id: 'c9',
    title: 'Reengajar 47 clientes em risco de churn',
    skill: 'Retention Engine',
    skillDot: '#06B6D4',
    category: ['retention'],
    route: '/chat?q=...',
  },
  {
    id: 'c10',
    title: 'Revisar identidade e tom de voz da marca',
    skill: 'Brand DNA',
    skillDot: '#8B5CF6',
    category: ['analytics'],
    route: '/settings/brand-dna',
  },
  {
    id: 'c11',
    title: 'Planejar Black Friday com exclusividade',
    skill: 'Seasonal Calendar',
    skillDot: '#F97316',
    badge: { label: 'D-250', color: 'gray' },
    category: ['campaigns'],
    route: '/chat?q=...',
  },
  {
    id: 'c12',
    title: 'Verificar estoque antes da campanha',
    skill: 'Inventory Manager',
    skillDot: '#64748B',
    category: ['analytics'],
    route: '/chat?q=...',
  },
]
```

**Badge colors** (optional pill on card):

```ts
const BADGE_COLORS = {
  red: { bg: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' },
  amber: { bg: 'hsl(38 92% 50% / 0.12)', color: 'hsl(38 92% 40%)' },
  green: { bg: 'hsl(var(--green) / 0.12)', color: 'hsl(var(--green))' },
  gray: { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' },
}
```

> **Note for Phase 1 (mock)**: Badges are visible in the full prototype but the current collapsed view (no preview thumbnails) hides them. Include the badge data in the types but rendering badges is optional for Phase 1.

#### Footer Text

| Property   | Value                                 |
| ---------- | ------------------------------------- |
| Text       | "Mostrando {count} ações disponíveis" |
| Font size  | `13px` (estimated)                    |
| Color      | muted-foreground                      |
| Text align | `center`                              |
| Margin top | `16px`                                |

---

### User Story 4 - Dividers Between Sections (Priority: P1)

Horizontal dividers separate the Hero/Chat, Activity, and Skills sections.

**Acceptance Scenarios**:

1. **Given** the page renders, **When** the user scrolls, **Then** they see subtle horizontal lines (`<hr>`) between each major section.

| Property                            | Value                                             |
| ----------------------------------- | ------------------------------------------------- |
| Border                              | `1px solid rgb(227, 225, 222)` or `border-border` |
| Full width within content container |

---

### User Story 5 - Sidebar Adjustments (Priority: P2)

The sidebar gains a "Tarefas" nav item and the sidebar skill shortcuts show **orb icons** (20px colored radial-gradient circles).

**Changes from current sidebar**:

| Current                                    | New                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Nav: Home, New Chat, Skills, Apps, History | Nav: Home, New Chat, Skills, **Tarefas**, Apps (icons: `Home`, `Plus`, `Cpu`, `ClipboardList`, `AppWindow` from lucide-react) |
| Skill shortcuts: emoji prefix              | Skill shortcuts: **gradient orb** 20px circles                                                                                |
| No credits section bottom                  | **Credits display** + **Upgrade button** at bottom                                                                            |
| "History" nav item                         | **Removed** from main nav (moved to secondary)                                                                                |

#### Sidebar Skill Shortcuts — Orb Styles

| Property      | Value                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Size          | `20px x 20px`                                                                                                                             |
| Border radius | `50%` / `9999px`                                                                                                                          |
| Background    | `radial-gradient(circle at 62% 38%, rgb(232,240,220), rgb(184,204,168) 28%, rgb(140,184,152) 55%, rgb(168,200,176) 100%)` (green variant) |
| Has highlight | Small `9px x 7px` ellipse overlay with `radial-gradient(rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)`           |

**Mock sidebar skills**:

```ts
const SIDEBAR_SKILLS = [
  { name: 'Seasonal Calendar', orb: 'green' },
  { name: 'Copywriter', orb: 'blue' },
  { name: 'Image Generator', orb: 'teal' },
  { name: 'Social Asset Creator', orb: 'rose' },
]
```

#### Credits Section (sidebar bottom)

| Property          | Value                   |
| ----------------- | ----------------------- |
| Container padding | `12px`                  |
| Display           | `flex`, gap `8px`       |
| Icon              | small credit/coin icon  |
| Text              | "847 credits remaining" |
| Upgrade button    | pill style              |

---

### User Story 6 - Header Adjustments (Priority: P2)

The header simplifies from the current version.

**Changes from current header**:

| Current                                                   | New                                           |
| --------------------------------------------------------- | --------------------------------------------- |
| Feedback, Support, Theme toggle, Notifications, User menu | **Notifications bell** + **User avatar** only |
| Full button set                                           | Minimal right-aligned                         |

#### Header Specs

| Property              | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| Height                | `48px`                                                                          |
| Background            | `rgb(251, 251, 249)`                                                            |
| Border bottom         | **none** (clean edge, unlike current `border-b`)                                |
| Layout                | `flex`, right-aligned content                                                   |
| **Notification bell** |                                                                                 |
| Size                  | `32px x 32px` (`w-8 h-8`)                                                       |
| Border radius         | `8px` (`rounded-lg`)                                                            |
| Red dot               | `6px x 6px`, `#e24b4a`, `1.5px` background-colored border, positioned top-right |
| **User avatar**       |                                                                                 |
| Size                  | `28px x 28px` (`w-7 h-7`)                                                       |
| Border radius         | `50%` (circle)                                                                  |
| Background            | `hsl(217 70% 55%)` (blue)                                                       |
| Text                  | White, `11px`, `font-semibold`, user initials (e.g. "JP")                       |

---

## Page Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ [Sidebar 56px] │ [Header 48px]                      │
│                │─────────────────────────────────────│
│ Logo "S"       │                                     │
│ ─── nav ───    │    [Main — scrollable]              │
│ Home           │                                     │
│ New Chat       │   ┌─ max-width 880px, centered ─┐  │
│ Skills         │   │                              │  │
│ Tarefas        │   │  Hero title (rotating)       │  │
│ Apps           │   │                              │  │
│ ─── skills ─── │   │  ┌── Chat input 680px ──┐   │  │
│ ● Seasonal     │   │  │ textarea + send btn   │   │  │
│ ● Copywriter   │   │  └──────────────────────┘   │  │
│ ● Image Gen    │   │  [chip] [chip] [chip]        │  │
│ ● Social       │   │                              │  │
│                │   │  ────── divider ──────        │  │
│                │   │                              │  │
│                │   │  "O que o Snew fez..."        │  │
│ ─── bottom ─── │   │  [card] [card] [card]        │  │
│ 847 credits    │   │                              │  │
│ [Upgrade]      │   │  ────── divider ──────        │  │
│ ⚙ Settings     │   │                              │  │
│                │   │  "What Snew can do..."        │  │
│                │   │  [All][Campaigns][Content]..  │  │
│                │   │  ┌─────┬─────┬─────┐         │  │
│                │   │  │card │card │card │  x4 rows │  │
│                │   │  └─────┴─────┴─────┘         │  │
│                │   │  "Mostrando 12 ações..."     │  │
│                │   └──────────────────────────┘   │  │
└─────────────────────────────────────────────────────┘
```

---

## Component Mapping (Current → New)

| Current Component                              | Action      | New Component                                             |
| ---------------------------------------------- | ----------- | --------------------------------------------------------- |
| `src/app/(dashboard)/dashboard/page.tsx`       | **Replace** | New Home page with 4 sections                             |
| `src/components/home/ask-bar-new.tsx`          | **Update**  | Match new input specs (680px, shadow, border-radius 16px) |
| `src/components/home/quick-suggestions.tsx`    | **Update**  | Match new chip specs (13px, padding 6px 16px)             |
| `src/components/home/activity-feed.tsx`        | **Replace** | New 3-card horizontal layout (not list)                   |
| `src/components/home/active-skills-row.tsx`    | **Replace** | New gradient grid with filter tabs                        |
| `src/components/home/greeting-section-new.tsx` | **Update**  | Rotating hero text animation                              |
| `src/components/layout/app-sidebar-new.tsx`    | **Update**  | Add Tarefas nav, orb skill icons, credits                 |
| `src/components/layout/top-bar.tsx`            | **Update**  | Simplify to notification + avatar only                    |
| N/A                                            | **Create**  | `src/components/home/skill-actions-grid.tsx`              |
| N/A                                            | **Create**  | `src/components/home/hero-rotating-title.tsx`             |
| N/A                                            | **Create**  | `src/components/home/activity-cards.tsx`                  |

---

## Files to Create/Modify

### New Files

1. `src/config/design-system.ts` — BRAND tokens, gradient families, `getGradient()`, `BubbleAvatar` component, SVG filters
2. `src/components/home/hero-rotating-title.tsx` — Animated rotating hero text (framer-motion)
3. `src/components/home/activity-cards.tsx` — 3 horizontal activity cards (AutonomousSection)
4. `src/components/home/skill-actions-grid.tsx` — Filter tabs + 12 gradient cards grid with decorative glow

### Modified Files

5. `src/app/(dashboard)/dashboard/page.tsx` — New layout structure (maxWidth 880px, 4 sections)
6. `src/components/home/ask-bar-new.tsx` — Adjust to 680px, new shadow/border specs, input type change
7. `src/components/home/quick-suggestions.tsx` — Update chip styles (13px, 6px 16px padding)
8. `src/components/layout/app-sidebar-new.tsx` — Add Tarefas nav, orb icons, credits section
9. `src/components/layout/top-bar.tsx` — Simplify to notifications + avatar only
10. `src/components/layout/sidebar-skill-pills.tsx` — BubbleAvatar orbs instead of emoji text
11. `src/app/(dashboard)/layout.tsx` or `src/components/dashboard-shell-new.tsx` — Inject SVG filters once

### No Changes Needed

- `src/app/globals.css` — Theme tokens already compatible (may need `@keyframes snew-float` added)

---

## Non-Functional Requirements

- **All data is mock** — hardcoded arrays, no API calls
- **Server Components** where possible (hero, activity, skills grid are static mock data)
- **"use client"** only for: chat input (state), filter tabs (state), rotating title (animation)
- **No new dependencies** — `framer-motion` (v12.33+), lucide-react, cn(), Tailwind CSS v4 all already installed
- **Responsive**: Content max-width `880px`, centered; sidebar collapses to `56px`
- **Scroll**: Main content area scrolls vertically; sidebar and header are fixed

---

## Out of Scope

- Real data fetching (API routes, Supabase queries)
- Chat functionality beyond navigation to `/chat?q=`
- Sidebar expand/collapse behavior changes (keep current)
- Other pages (Skills, Chat, Apps, History)
- Dark mode adjustments (match current theme system)
- Mobile responsive breakpoints (prototype has `max-md:grid-cols-2 max-sm:grid-cols-1` but not required for Phase 1)
- Activity card detail modals (click → expand with results table, feedback question) — Phase 2
- Card preview thumbnails (campaign images, charts, calendar) inside skill cards — Phase 2
- Badge rendering on skill cards — Phase 2
- AI-generated card thumbnails (`SmartCardThumb` / avatar system) — Phase 2

## Implementation Notes

- The prototype uses inline `style={{}}` extensively. The relay implementation should use **Tailwind classes** where possible and only `style={{}}` for dynamic gradient values.
- The `getGradient(skill)` function is the key design system primitive — it resolves a skill name to its gradient family and returns `{ card, bubble, ink, seed }`.
- The `BubbleAvatar` component renders a holographic sphere with 3 layers (organic texture, main gradient + highlight, iridescent border). It uses SVG `feTurbulence` + `feDisplacementMap` filters that must be injected once in the DOM.
- Filter tab state uses `useState<FilterTab>('all')` with client-side filtering — no server round-trip.
- Card hover effect: `backgroundPosition` transitions from `0% 0%` to `100% 100%` over `0.9s ease` on the `200% 200%` background-size. This creates a subtle gradient shift.
- The prototype uses `framer-motion` `AnimatePresence mode="popLayout"` for skill card filter transitions (`initial={{ opacity: 0, scale: 0.97 }}`, `animate={{ opacity: 1, scale: 1 }}`, `exit={{ opacity: 0, scale: 0.97 }}`, `transition={{ duration: 0.18 }}`).
- Dividers between sections are simple `<div>` with `height: 1px; background: hsl(var(--border))` — not `<hr>` elements.
