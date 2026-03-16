# Contract: Layout Shell Components

## AppSidebarNew

**Location**: `src/components/app-sidebar-new.tsx`
**Type**: Client component (`"use client"`)

### Props

```typescript
interface AppSidebarNewProps {
  collapsed: boolean
  onToggleCollapse: () => void
  activePath: string // Current route pathname
}
```

### Behavior

- **Expanded width**: 240px. **Collapsed width**: 56px.
- **Logo**: "S" character, 48px height area at top.
- **Navigation items** (5 total):
  | Label | Icon (lucide) | Route |
  | --- | --- | --- |
  | Home | `Home` | `/dashboard` |
  | New Chat | `Plus` | `/chat` |
  | Co-workers | `Briefcase` | `/agents` |
  | Apps | `LayoutGrid` | `/apps` |
  | History | `Clock` | `/history` |
- **Active state**: Accent background + different icon weight on matching route.
- **Bottom section**: Credits display ("847 credits remaining") + "Upgrade" button. When collapsed, only upgrade icon visible.
- **Transition**: 300ms ease width animation.
- **Mobile**: Hidden by default. When triggered, overlays as fixed panel with backdrop (z-40 backdrop, z-50 sidebar).

### Events

- `onToggleCollapse()`: Called when collapse toggle is clicked.
- Navigation: Uses Next.js `useRouter().push()` or `<Link>`.

---

## TopBar

**Location**: `src/components/top-bar.tsx`
**Type**: Client component (`"use client"`)

### Props

```typescript
interface TopBarProps {
  onToggleSidebar: () => void // Mobile sidebar toggle
  sidebarCollapsed: boolean
}
```

### Behavior

- **Height**: 48px, fixed/sticky at top of content area.
- **Left section**: Sidebar toggle button (desktop: expand/collapse, mobile: open overlay).
- **Center/Right actions**:
  - "Feedback" button (text only)
  - "Documentos" button (text only)
  - "Perguntar" button (with refresh icon)
  - Folder icon button
  - Notifications bell with unread count badge (red dot)
  - Avatar dropdown "JP" (initials)
- **Avatar dropdown menu**:
  - Workspace name
  - Settings
  - Theme toggle (light/dark via next-themes)
  - Language switcher (EN / PT-BR)
  - Logout

### Events

- `onToggleSidebar()`: Sidebar toggle.
- Language switch: Calls `setLanguage()` from LanguageContext.
- Theme: Calls `setTheme()` from next-themes.

---

## DashboardShellNew

**Location**: `src/components/dashboard-shell-new.tsx`
**Type**: Client component (`"use client"`)

### Props

```typescript
interface DashboardShellNewProps {
  children: React.ReactNode
}
```

### Behavior

- Composes `AppSidebarNew` + `TopBar` + main content area.
- Manages sidebar collapsed state (localStorage `sidebar_collapsed`).
- Manages mobile sidebar open/close state.
- Wraps children with `LanguageProvider`.
- Layout: `flex` row — sidebar (fixed width) + content column (flex-1).
- Content column: TopBar (sticky top) + scrollable main area.

### Rendering

```
┌──────┬─────────────────────────────┐
│      │ TopBar (48px, sticky)       │
│ Side │─────────────────────────────│
│ bar  │                             │
│      │ Main Content (scrollable)   │
│      │ {children}                  │
│      │                             │
└──────┴─────────────────────────────┘
```
