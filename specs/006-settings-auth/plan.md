# Implementation Plan: Settings & Auth

**Feature Branch**: `006-settings-auth`
**Created**: 2026-02-07
**Spec**: `specs/006-settings-auth/spec.md`
**Depends on**: `001-foundation` (Supabase clients, auth middleware, profiles/teams/app_connections tables)

## Technical Context

### Dependencies Required

**Already installed (via 001-foundation)**:
- `@supabase/supabase-js` -- Supabase client SDK
- `@supabase/ssr` -- Cookie-based session management for Next.js
- `react-hook-form` -- Form state management
- `zod` -- Schema validation
- `@hookform/resolvers` -- Zod resolver for react-hook-form
- `sonner` -- Toast notifications

**shadcn/ui components required** (install if not already present):
- `dialog` -- Settings modal container
- `tabs` -- Settings section switching (alternative to custom sidebar)
- `input` -- Form text fields
- `button` -- Submit, connect, OAuth buttons
- `label` -- Form field labels
- `separator` -- "or" divider on auth pages
- `avatar` -- User avatar display
- `scroll-area` -- Scrollable app integrations list
- `switch` -- Notification toggle preferences
- `badge` -- Role badges in members list
- `card` -- Auth page card container
- `progress` -- Usage bars in billing section
- `tooltip` -- Optional hover info

**Already available**: `button`, `card`, `input`, `label` (confirmed in `src/components/ui/`).

### Supabase Auth Architecture

```
Browser                     Next.js Server                  Supabase
  |                              |                              |
  |-- Login form submit -------->|                              |
  |                              |-- signInWithPassword ------->|
  |                              |<-- session + tokens ---------|
  |                              |-- Set cookies (access+refresh)|
  |<-- Redirect /dashboard ------|                              |
  |                              |                              |
  |-- Google OAuth click ------->|                              |
  |<-- Redirect to Google -------|                              |
  |-- Google consent ----------->|         (Google)             |
  |<-- Redirect /auth/callback --|                              |
  |                              |-- exchangeCodeForSession --->|
  |                              |<-- session + tokens ---------|
  |                              |-- Set cookies               |
  |<-- Redirect /dashboard ------|                              |
```

**Key architectural decisions**:

1. **Server Actions for auth**: Login and signup forms use Next.js Server Actions (`"use server"` functions) to keep Supabase credentials server-side. The forms themselves are client components (for interactivity) that call server actions.
2. **Cookie-based sessions**: `@supabase/ssr`'s `createServerClient` handles cookie get/set/remove automatically. The middleware (from 001-foundation) refreshes tokens on every request.
3. **OAuth callback as Route Handler**: The `/auth/callback/route.ts` is a GET route handler that reads the `code` param and exchanges it server-side.
4. **No client-side Supabase auth**: All auth operations (signIn, signUp, signOut, exchangeCode) happen server-side to prevent token leakage.

### Constitution Check

- **App Router first**: Auth pages use the `(auth)` route group with a shared layout. Settings dialog is a reusable component.
- **Server Components by default**: Auth pages (`page.tsx`) are Server Components that render client form components. The landing page redirect is entirely server-side. The OAuth callback is a server Route Handler.
- **"use client" only when necessary**: Auth forms need `"use client"` for react-hook-form state, onChange handlers, and loading states. Settings dialog needs `"use client"` for dialog open/close state, sidebar navigation state, search input state, and scroll behavior.
- **shadcn/ui**: All form elements, dialogs, avatars, switches, badges use shadcn components.
- **Tailwind v4**: All styling via utility classes, no custom CSS. Theme variables from `globals.css`.
- **TypeScript strict**: All forms have Zod schemas. All props are typed. No `any`.
- **YAGNI**: No email verification flow (Supabase handles it). No password reset page (defer to later). No actual OAuth app connections (just UI with placeholder actions). No member invite modal (just the button for now).

## Form Schemas (Zod)

### Login Schema

```typescript
// src/lib/schemas/auth.ts
import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
})

export type LoginFormValues = z.infer<typeof loginSchema>
```

### Signup Schema

```typescript
export const signupSchema = z.object({
  fullName: z
    .string()
    .min(1, "Name is required")
    .transform((val) => val.trim()),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
})

export type SignupFormValues = z.infer<typeof signupSchema>
```

### Account Settings Schema

```typescript
// src/lib/schemas/settings.ts
import { z } from "zod"

export const accountSettingsSchema = z.object({
  fullName: z
    .string()
    .min(1, "Name is required")
    .transform((val) => val.trim()),
})

export type AccountSettingsValues = z.infer<typeof accountSettingsSchema>
```

### Workspace Settings Schema

```typescript
export const workspaceSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .transform((val) => val.trim()),
})

export type WorkspaceSettingsValues = z.infer<typeof workspaceSettingsSchema>
```

## Settings Dialog Component Tree

```
<SettingsDialog>                               "use client", manages open/close + active section
  <Dialog>                                     shadcn Dialog
    <DialogContent className="max-w-5xl max-h-[80vh]">
      <div className="flex h-full">
        <SettingsSidebar>                       Left nav, receives activeSection + onSelect
          <div>PERSONAL</div>
            <SidebarItem>Account</SidebarItem>
            <SidebarItem>Notifications</SidebarItem>
            <SidebarItem active>Manage apps</SidebarItem>
          <div>WORKSPACE</div>
            <SidebarItem>General</SidebarItem>
            <SidebarItem>Members</SidebarItem>
            <SidebarItem>Billing</SidebarItem>
        </SettingsSidebar>
        <div className="flex-1 overflow-hidden">
          {activeSection === "manage-apps" && <ManageAppsSection />}
          {activeSection === "account" && <AccountSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "general" && <GeneralSection />}
          {activeSection === "members" && <MembersSection />}
          {activeSection === "billing" && <BillingSection />}
        </div>
      </div>
    </DialogContent>
  </Dialog>
</SettingsDialog>
```

## App Integrations Data Structure

```typescript
// src/lib/data/app-integrations.ts

export type AppAuthType = "oauth" | "api_key" | "google"

export type AppCategory =
  | "Email"
  | "Communication"
  | "Productivity"
  | "CRM"
  | "Project Management"
  | "Development"
  | "Storage"
  | "Finance"
  | "E-commerce"
  | "Marketing"
  | "Support"
  | "Design"
  | "Scheduling"
  | "Forms"
  | "Website"
  | "Database"
  | "Infrastructure"
  | "Analytics"
  | "Monitoring"
  | "Search"
  | "Advertising"
  | "Automation"
  | "AI"
  | "Social Media"
  | "Security"
  | "Sales"
  | "Documentation"

export interface AppIntegration {
  id: string
  name: string
  logoUrl: string          // path to logo or Lucide icon name as fallback
  category: AppCategory
  authType: AppAuthType
}

export const APP_INTEGRATIONS: AppIntegration[] = [
  { id: "gmail", name: "Gmail", logoUrl: "/logos/gmail.svg", category: "Email", authType: "google" },
  { id: "slack", name: "Slack", logoUrl: "/logos/slack.svg", category: "Communication", authType: "oauth" },
  // ... 105 entries total, sorted alphabetically by name
].sort((a, b) => a.name.localeCompare(b.name))
```

**Logo strategy**: Use placeholder colored circle with first letter of app name as fallback. Actual logos can be added to `public/logos/` later. The component renders an `<Avatar>` with `<AvatarImage>` (attempts logo URL) and `<AvatarFallback>` (first letter + background color derived from app name hash).

## Auth Actions Architecture

```typescript
// src/lib/actions/auth.ts
"use server"

import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { loginSchema, signupSchema } from "@/lib/schemas/auth"

export type AuthActionResult = {
  error?: string
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  // 1. Parse & validate with Zod
  // 2. Call supabase.auth.signInWithPassword
  // 3. On error: return { error: "Invalid email or password" }
  // 4. On success: redirect("/dashboard")
}

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  // 1. Parse & validate with Zod
  // 2. Call supabase.auth.signUp with data: { full_name }
  // 3. On error: return { error: appropriate message }
  // 4. On success: redirect("/dashboard")
}

export async function signOutAction(): Promise<void> {
  // 1. Call supabase.auth.signOut()
  // 2. redirect("/login")
}

export async function signInWithGoogleAction(): Promise<void> {
  // 1. Call supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
  // 2. redirect(data.url) -- Supabase returns the Google OAuth URL
}
```

## File Structure

```
src/
├── app/
│   ├── page.tsx                              # Landing page (server redirect)
│   ├── (auth)/
│   │   ├── layout.tsx                        # Auth layout (centered card container)
│   │   ├── login/
│   │   │   └── page.tsx                      # Login page (server component + client form)
│   │   └── signup/
│   │       └── page.tsx                      # Signup page (server component + client form)
│   └── auth/
│       └── callback/
│           └── route.ts                      # OAuth callback route handler (GET)
├── components/
│   ├── auth/
│   │   ├── login-form.tsx                    # "use client" - login form with react-hook-form
│   │   ├── signup-form.tsx                   # "use client" - signup form with react-hook-form
│   │   ├── oauth-button.tsx                  # "use client" - Google OAuth button
│   │   └── auth-error-message.tsx            # "use client" - reads ?error param, shows alert
│   ├── settings/
│   │   ├── settings-dialog.tsx               # "use client" - dialog shell + section router
│   │   ├── settings-sidebar.tsx              # Settings nav sidebar (PERSONAL + WORKSPACE)
│   │   ├── manage-apps-section.tsx           # Search + app list
│   │   ├── app-integration-row.tsx           # Single app row (logo + name + connect)
│   │   ├── account-section.tsx               # Account form (name, email, avatar)
│   │   ├── notifications-section.tsx         # Notification toggles
│   │   ├── general-section.tsx               # Workspace general settings form
│   │   ├── members-section.tsx               # Team members list
│   │   └── billing-section.tsx               # Plan + usage display
│   └── ui/                                   # shadcn components (already present + new ones)
├── lib/
│   ├── actions/
│   │   ├── auth.ts                           # Server actions: login, signup, signOut, signInWithGoogle
│   │   └── settings.ts                       # Server actions: updateProfile, updateWorkspace
│   ├── schemas/
│   │   ├── auth.ts                           # Zod: loginSchema, signupSchema
│   │   └── settings.ts                       # Zod: accountSettingsSchema, workspaceSettingsSchema
│   └── data/
│       └── app-integrations.ts               # Static app integrations array (105 entries)
```

## Key Implementation Notes

1. **Auth layout (`src/app/(auth)/layout.tsx`)**: Minimal layout with centered content, Relay logo at top, muted background. No sidebar. Check if user is already authenticated and redirect to `/dashboard` if so.

2. **Login/Signup pages as Server Components**: The `page.tsx` files are Server Components that render the client form component. This keeps the page itself server-rendered and only the interactive form is client-side.

3. **Form submission pattern**: Client components use `react-hook-form` with Zod validation for instant client-side feedback, then call Server Actions for the actual auth operation. The Server Action returns `{ error?: string }` which the client component displays.

4. **Settings dialog trigger**: The dialog is controlled via props (`open` + `onOpenChange`). Parent components (sidebar "Apps" button, avatar dropdown "Settings") manage the open state. Default section can be passed as a prop (`defaultSection?: SettingsSection`).

5. **App integrations search**: Pure client-side filtering. The full 105-item array is imported statically. `useMemo` with the search query dependency filters the list. No server calls needed.

6. **Avatar upload flow**: Click avatar > file input (hidden, triggered programmatically) > validate type/size client-side > upload to Supabase Storage bucket > update `profiles.avatar_url` with the public URL > refresh UI.

7. **Environment variables needed** (from 001-foundation):
   - `NEXT_PUBLIC_SUPABASE_URL` -- Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Supabase anonymous key
   - `NEXT_PUBLIC_SITE_URL` -- Application URL for OAuth redirect (e.g., `http://localhost:3000` in dev)

8. **Google OAuth setup prerequisites**: A Google OAuth app must be configured in the Google Cloud Console with the Supabase callback URL. The Supabase dashboard must have Google provider enabled with the client ID and secret. This is external configuration, not code.
