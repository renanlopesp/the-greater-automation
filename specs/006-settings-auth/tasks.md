# Task List: Settings & Auth

**Feature Branch**: `006-settings-auth`
**Created**: 2026-02-07
**Spec**: `specs/006-settings-auth/spec.md`
**Plan**: `specs/006-settings-auth/plan.md`
**Depends on**: `001-foundation`

---

## Phase 1: Setup

### Task 1.1: Create auth route group and layout

- [x] Create `src/app/(auth)/layout.tsx` as a Server Component
- [x] Layout renders a centered container (flex, items-center, justify-center, min-h-screen, bg-muted/50)
- [x] Layout includes the Relay logo at the top center (blue rounded square with "R")
- [x] Layout checks auth state via Supabase server client; if authenticated, `redirect("/dashboard")`
- [x] Layout renders `{children}` inside a card-like container (max-w-md, w-full)
- [x] Verify: visiting `/login` while unauthenticated shows the centered layout with logo

### Task 1.2: Install required shadcn components

- [x] Run `bunx shadcn@latest add dialog scroll-area switch badge separator avatar progress` (skip any already installed)
- [x] Verify: all component files exist in `src/components/ui/`
- [x] Verify: `bun run build` passes with zero errors

### Task 1.3: Create schema and action directories

- [x] Create `src/lib/schemas/` directory
- [x] Create `src/lib/actions/` directory
- [x] Create `src/lib/data/` directory
- [x] Create `src/components/auth/` directory
- [x] Create `src/components/settings/` directory
- [x] Verify: all directories exist

---

## Phase 2: Foundational (Zod Schemas & Auth Actions)

### Task 2.1: Create auth Zod schemas

- [x] Create `src/lib/schemas/auth.ts`
- [x] Define `loginSchema`: email (required, valid email format), password (required, min 8 chars)
- [x] Define `signupSchema`: fullName (required, trimmed), email (required, valid format), password (required, min 8 chars)
- [x] Export `LoginFormValues` and `SignupFormValues` inferred types
- [x] Verify: import schemas in a test file, validate that valid inputs pass and invalid inputs produce correct error messages

### Task 2.2: Create settings Zod schemas

- [x] Create `src/lib/schemas/settings.ts`
- [x] Define `accountSettingsSchema`: fullName (required, trimmed)
- [x] Define `workspaceSettingsSchema`: name (required, trimmed)
- [x] Export inferred types: `AccountSettingsValues`, `WorkspaceSettingsValues`
- [x] Verify: schemas compile without errors

### Task 2.3: Create auth server actions

- [x] Create `src/lib/actions/auth.ts` with `"use server"` directive
- [x] Define `AuthActionResult` type: `{ error?: string }`
- [x] Implement `loginAction(formData: FormData)`: parse with loginSchema, call `supabase.auth.signInWithPassword`, return `{ error }` on failure, `redirect("/dashboard")` on success
- [x] Implement `signupAction(formData: FormData)`: parse with signupSchema, call `supabase.auth.signUp` with `data: { full_name }`, return `{ error }` on failure, redirect on success
- [x] Implement `signOutAction()`: call `supabase.auth.signOut()`, redirect to `/login`
- [x] Implement `signInWithGoogleAction()`: call `supabase.auth.signInWithOAuth({ provider: "google" })`, redirect to the returned URL
- [x] Error messages: "Invalid email or password" for login failures, "An account with this email already exists" for duplicate signups
- [x] Verify: actions compile without TypeScript errors

### Task 2.4: Create settings server actions

- [x] Create `src/lib/actions/settings.ts` with `"use server"` directive
- [x] Implement `updateProfileAction(formData: FormData)`: parse with accountSettingsSchema, update `profiles` table, return result
- [x] Implement `updateWorkspaceAction(formData: FormData)`: parse with workspaceSettingsSchema, update `teams` table, return result
- [x] Verify: actions compile without TypeScript errors

---

## Phase 3: US1 -- Auth Pages

### Task 3.1: Create OAuth button component

- [x] Create `src/components/auth/oauth-button.tsx` with `"use client"` directive
- [x] Render a full-width button with Google icon (Lucide or inline SVG) and "Sign in with Google" text
- [x] On click, call `signInWithGoogleAction` server action
- [x] Show loading state (disabled + spinner) while pending
- [x] Verify: button renders with correct text and icon

### Task 3.2: Create auth error message component

- [x] Create `src/components/auth/auth-error-message.tsx` with `"use client"` directive
- [x] Use `useSearchParams()` to read `?error=` query parameter
- [x] Map error codes to user-friendly messages: `oauth_error` -> "Authentication failed. Please try again.", `expired_code` -> "Authentication session expired. Please try again."
- [x] Render a destructive-styled alert/banner when an error param is present
- [x] Render nothing when no error param
- [x] Verify: renders correct message for each error code, renders nothing for no error

### Task 3.3: Create login form component

- [x] Create `src/components/auth/login-form.tsx` with `"use client"` directive
- [x] Use `react-hook-form` with `zodResolver(loginSchema)`
- [x] Render: email `<Input>` with label, password `<Input type="password">` with label, "Log in" `<Button>` (full width)
- [x] Render: `<Separator>` with "or" text centered
- [x] Render: `<OAuthButton />`
- [x] Render: "Don't have an account? [Sign up](/signup)" link below
- [x] On submit: call `loginAction` server action, display returned `error` as a form-level error alert
- [x] Disable submit button while pending (`useFormStatus` or local state)
- [x] Show field-level validation errors below each input
- [x] Verify: form renders all fields, validates on submit, shows errors, submits to server action

### Task 3.4: Create login page

- [x] Create `src/app/(auth)/login/page.tsx` as a Server Component
- [x] Export metadata: `{ title: "Log in - Relay" }`
- [x] Render: heading "Log in to Relay", `<AuthErrorMessage />`, `<LoginForm />`
- [x] Verify: visiting `/login` shows the full login form inside the auth layout

### Task 3.5: Create signup form component

- [x] Create `src/components/auth/signup-form.tsx` with `"use client"` directive
- [x] Use `react-hook-form` with `zodResolver(signupSchema)`
- [x] Render: full name `<Input>` with label, email `<Input>` with label, password `<Input type="password">` with label, "Create account" `<Button>` (full width)
- [x] Render: `<Separator>` with "or" text centered
- [x] Render: `<OAuthButton />`
- [x] Render: "Already have an account? [Log in](/login)" link below
- [x] On submit: call `signupAction` server action, display returned `error` as form-level error
- [x] Disable submit button while pending
- [x] Show field-level validation errors below each input
- [x] Verify: form renders all fields including name, validates, submits correctly

### Task 3.6: Create signup page

- [x] Create `src/app/(auth)/signup/page.tsx` as a Server Component
- [x] Export metadata: `{ title: "Sign up - Relay" }`
- [x] Render: heading "Create your Relay account", `<AuthErrorMessage />`, `<SignupForm />`
- [x] Verify: visiting `/signup` shows the full signup form inside the auth layout

### Task 3.7: Create OAuth callback route handler

- [x] Create `src/app/auth/callback/route.ts` (NOT inside `(auth)` group -- this is `/auth/callback`, not `/(auth)/callback`)
- [x] Export `async function GET(request: Request)`
- [x] Read `code` query parameter from `request.url`
- [x] If no `code`, redirect to `/login`
- [x] Create Supabase server client
- [x] Call `supabase.auth.exchangeCodeForSession(code)`
- [x] On success: redirect to `/dashboard`
- [x] On error: redirect to `/login?error=oauth_error`
- [x] Wrap in try/catch: any unhandled error redirects to `/login?error=oauth_error`
- [x] Verify: route handler compiles, handles missing code param, handles exchange errors

### Task 3.8: Update landing page with auth redirect

- [x] Modify `src/app/page.tsx` to be a Server Component that checks auth state
- [x] Create Supabase server client, call `supabase.auth.getUser()`
- [x] If authenticated (user exists): `redirect("/dashboard")`
- [x] If unauthenticated: `redirect("/login")`
- [x] Verify: visiting `/` redirects to `/login` when not logged in, redirects to `/dashboard` when logged in

---

## Phase 4: US2 -- Settings Dialog

### Task 4.1: Create app integrations data file

- [x] Create `src/lib/data/app-integrations.ts`
- [x] Define `AppAuthType`, `AppCategory`, and `AppIntegration` types
- [x] Define `APP_INTEGRATIONS` constant array with all 105 app entries from the spec
- [x] Each entry has: `id` (slug), `name`, `logoUrl` (placeholder path), `category`, `authType`
- [x] Sort array alphabetically by `name` using `.sort((a, b) => a.name.localeCompare(b.name))`
- [x] Verify: array has 105 entries, types compile, entries are sorted

### Task 4.2: Create settings sidebar component

- [x] Create `src/components/settings/settings-sidebar.tsx`
- [x] Accept props: `activeSection: string`, `onSelect: (section: string) => void`
- [x] Define settings sections as a constant: `PERSONAL` group (account, notifications, manage-apps) and `WORKSPACE` group (general, members, billing)
- [x] Render two labeled groups ("PERSONAL", "WORKSPACE") with nav items using `<button>` elements
- [x] Active section item has `bg-muted` background and bold text
- [x] Non-active items have hover state (`hover:bg-muted/50`)
- [x] Sidebar width: `w-56` with padding and border-right
- [x] Verify: renders all 6 sections in 2 groups, highlights active section, calls onSelect on click

### Task 4.3: Create app integration row component

- [x] Create `src/components/settings/app-integration-row.tsx`
- [x] Accept props: `app: AppIntegration`, `onConnect: (appId: string) => void`
- [x] Render row with: `<Avatar>` (32x32, `<AvatarImage src={app.logoUrl}>` + `<AvatarFallback>` with first letter of app name and color derived from name), app name text, and action button on the right
- [x] If `app.authType === "google"`: render "Sign in with Google" button (outline variant with Google icon)
- [x] Otherwise: render "Connect" button (default variant, blue)
- [x] Row layout: flex, items-center, justify-between, padding, border-bottom
- [x] Verify: renders logo fallback, name, correct button variant based on authType

### Task 4.4: Create manage apps section component

- [x] Create `src/components/settings/manage-apps-section.tsx`
- [x] Import `APP_INTEGRATIONS` from data file
- [x] Maintain search query state (`useState`)
- [x] Filter apps using `useMemo`: case-insensitive substring match on `app.name`
- [x] Render: section heading "Manage apps", search `<Input>` (placeholder: "Search apps..."), `<ScrollArea>` containing filtered app rows
- [x] When search has no results: display "No apps found matching your search." centered text
- [x] On "Connect" click: show toast "Connection flow coming soon" via sonner
- [x] Verify: all 105 apps render in alphabetical order, search filters in real-time, empty state shows

### Task 4.5: Create settings dialog shell

- [x] Create `src/components/settings/settings-dialog.tsx` with `"use client"` directive
- [x] Accept props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `defaultSection?: string`
- [x] Maintain `activeSection` state, initialized to `defaultSection ?? "manage-apps"`
- [x] Render `<Dialog>` with `<DialogContent className="max-w-5xl max-h-[80vh] p-0 overflow-hidden">`
- [x] Inside: flex container with `<SettingsSidebar>` on left and content area on right
- [x] Content area switches based on `activeSection`: "manage-apps" -> `<ManageAppsSection>`, others -> placeholder `<div>` with section name (to be implemented in Phase 5)
- [x] Dialog has `<DialogTitle>` set to "Settings" (visually hidden or in header) for accessibility
- [x] Verify: dialog opens/closes, sidebar nav switches sections, manage apps is default

### Task 4.6: Export settings dialog for use by other components

- [x] Create `src/components/settings/index.ts` barrel export file
- [x] Export `SettingsDialog` component
- [x] Export `SettingsSection` type (union of section slugs)
- [x] Verify: can import `{ SettingsDialog }` from `@/components/settings`

---

## Phase 5: US3 -- Settings Sections

### Task 5.1: Create account section

- [x] Create `src/components/settings/account-section.tsx` with `"use client"` directive
- [x] Use `react-hook-form` with `zodResolver(accountSettingsSchema)`
- [x] Render: section heading "Account"
- [x] Render: circular avatar area (80x80, clickable, shows current avatar or initials fallback)
- [x] On avatar click: trigger hidden `<input type="file" accept="image/png,image/jpeg,image/gif">`
- [x] Validate file: max 2MB, must be image type. Show toast on validation error.
- [x] Render: full name `<Input>` (pre-filled from profile data), email `<Input>` (read-only, disabled, showing current email)
- [x] Render: "Save changes" `<Button>`, disabled while no changes or while submitting
- [x] On submit: call `updateProfileAction`, show success toast, handle errors
- [x] Verify: renders all fields, pre-fills data, validates, submits, shows toast feedback

### Task 5.2: Create notifications section

- [x] Create `src/components/settings/notifications-section.tsx` with `"use client"` directive
- [x] Render: section heading "Notifications"
- [x] Render three rows, each with: label text, description text, and `<Switch>` toggle on the right
  - "Email notifications" / "Receive email notifications for important updates"
  - "Workflow run failures" / "Get notified when a workflow run fails"
  - "Weekly activity digest" / "Receive a weekly summary of your workspace activity"
- [x] All switches default to "on" (checked)
- [x] On toggle: show toast "Notification preference updated" (placeholder -- no backend persistence yet)
- [x] Verify: renders three toggle rows, switches toggle on/off, toast appears

### Task 5.3: Create workspace general section

- [x] Create `src/components/settings/general-section.tsx` with `"use client"` directive
- [x] Use `react-hook-form` with `zodResolver(workspaceSettingsSchema)`
- [x] Render: section heading "General"
- [x] Render: workspace name `<Input>` (pre-filled from team data, editable)
- [x] Render: workspace slug `<Input>` (read-only, disabled, derived from team slug)
- [x] Render: "Save changes" `<Button>`, disabled while no changes or while submitting
- [x] On submit: call `updateWorkspaceAction`, show success toast
- [x] Verify: renders fields, pre-fills, validates, submits

### Task 5.4: Create members section

- [x] Create `src/components/settings/members-section.tsx` with `"use client"` directive
- [x] Render: section heading "Members", "Invite member" `<Button>` (outline variant) in header row
- [x] Render: list of team members, each row showing: `<Avatar>` (32x32), member name, member email (muted text), role `<Badge>` (Owner/Admin/Member)
- [x] Owner badge: default variant. Admin badge: secondary variant. Member badge: outline variant.
- [x] "Invite member" button click: show toast "Invite flow coming soon" (placeholder)
- [x] If no members data, show the current user as the sole member with Owner role
- [x] Verify: renders member rows with avatars and role badges, invite button shows toast

### Task 5.5: Create billing section

- [x] Create `src/components/settings/billing-section.tsx` with `"use client"` directive
- [x] Render: section heading "Billing"
- [x] Render: current plan card with plan name "Free" (or from data), plan description
- [x] Render: usage section with two `<Progress>` bars:
  - "Steps": `steps_used / steps_limit` with count label (e.g., "750 / 1,000")
  - "AI Credits": `ai_credits_used / ai_credits_limit` with count label (e.g., "25.00 / 100.00")
- [x] Render: "Upgrade plan" `<Button>` (default variant), click shows toast "Upgrade flow coming soon"
- [x] Verify: renders plan info, progress bars with correct percentages, upgrade button

### Task 5.6: Wire all sections into settings dialog

- [x] Update `src/components/settings/settings-dialog.tsx` to import and render all section components
- [x] Replace placeholder `<div>` elements with actual section components
- [x] Pass relevant data (profile, team, usage, members) as props to each section
- [x] Handle the case where data is not yet loaded (loading state or defaults)
- [x] Verify: clicking each sidebar item renders the correct section content

---

## Phase 6: Polish

### Task 6.1: Responsive auth pages

- [x] Auth layout renders correctly on mobile (< 640px): full-width card, adequate padding
- [x] Auth layout renders correctly on tablet (640px-1024px): centered card
- [x] Auth layout renders correctly on desktop (> 1024px): centered card with comfortable spacing
- [x] All form inputs are touch-friendly (min height 44px for mobile)
- [x] Verify: test at 375px, 768px, and 1440px viewport widths

### Task 6.2: Responsive settings dialog

- [x] On mobile (< 640px): dialog becomes full-screen or near-full-screen
- [x] On mobile: sidebar navigation stacks above content or becomes a horizontal scrollable tab bar
- [x] On tablet+: dialog uses `max-w-5xl` with sidebar on left
- [x] ScrollArea in manage apps section works correctly at all sizes
- [x] Verify: test at 375px, 768px, and 1440px viewport widths

### Task 6.3: Keyboard accessibility

- [x] All form inputs are reachable via Tab key in logical order
- [x] Submit buttons can be triggered via Enter key
- [x] Settings dialog can be closed via Escape key
- [x] Settings sidebar items are focusable and activatable via Enter/Space
- [x] `<Dialog>` traps focus correctly (built into shadcn/Radix)
- [x] Auth page links (Sign up / Log in) are keyboard accessible
- [x] Verify: navigate through entire auth flow and settings dialog using only keyboard

### Task 6.4: Loading and error states

- [x] Login form: submit button shows spinner and "Logging in..." text while pending
- [x] Signup form: submit button shows spinner and "Creating account..." text while pending
- [x] OAuth button: shows spinner and disables while redirecting
- [x] Settings save buttons: show spinner and "Saving..." text while pending
- [x] All error states display user-friendly messages (no raw error codes)
- [x] Network failures show generic "Something went wrong. Please try again." toast
- [x] Verify: all buttons show correct pending states, error messages are friendly

### Task 6.5: Final build verification

- [x] Run `bun run build` -- must complete with zero errors
- [x] Run `bun run lint` -- must pass with zero warnings on all new files
- [x] Verify no `"use client"` directives on Server Components
- [x] Verify no server-only imports in client components
- [x] Verify all imports use `@/` path alias
- [x] Verify all `className` compositions use `cn()` from `@/lib/utils`
- [x] Verify no hardcoded colors -- all use Tailwind theme tokens / CSS variables
- [x] Verify no `any` types in TypeScript

---

## Phase 7: Testing

**Purpose**: Unit tests for auth components, Zod schemas, settings sections. E2e tests for auth flows and settings dialog.

**Prerequisites**: 001-foundation Phase 6 (Vitest, Playwright, Prettier, Husky) must be complete.

### Unit Tests (Vitest + Testing Library)

- [x] **T7.1** [P] Write unit tests for auth Zod schemas at `src/lib/schemas/__tests__/auth.test.ts`:
  - Test loginSchema: valid email+password passes, invalid email fails, short password fails
  - Test signupSchema: valid data passes, missing fullName fails, invalid email fails

- [x] **T7.2** [P] Write unit tests for settings Zod schemas at `src/lib/schemas/__tests__/settings.test.ts`:
  - Test accountSettingsSchema: valid fullName passes, empty/whitespace fails
  - Test workspaceSettingsSchema: valid name passes, empty fails

- [x] **T7.3** [P] Write unit tests for LoginForm at `src/components/auth/__tests__/login-form.test.tsx`:
  - Render form, verify email and password inputs render
  - Verify submit button is present
  - Submit with empty fields, verify validation errors appear
  - Verify "Sign up" link renders with correct href

- [x] **T7.4** [P] Write unit tests for SignupForm at `src/components/auth/__tests__/signup-form.test.tsx`:
  - Render form, verify fullName, email, password inputs render
  - Submit with empty fields, verify validation errors appear
  - Verify "Log in" link renders with correct href

- [x] **T7.5** [P] Write unit tests for AuthErrorMessage at `src/components/auth/__tests__/auth-error-message.test.tsx`:
  - Mock useSearchParams with error=oauth_error, verify error message renders
  - Mock useSearchParams with no error, verify nothing renders

- [x] **T7.6** [P] Write unit tests for ManageAppsSection at `src/components/settings/__tests__/manage-apps-section.test.tsx`:
  - Render component, verify app list renders (check a few app names)
  - Type in search, verify filtering works
  - Search with no matches, verify empty state message

- [x] **T7.7** [P] Write unit tests for SettingsDialog at `src/components/settings/__tests__/settings-dialog.test.tsx`:
  - Render with open=true, verify dialog renders
  - Verify sidebar sections render (PERSONAL, WORKSPACE groups)
  - Click a sidebar item, verify content area switches

### End-to-End Tests (Playwright)

- [x] **T7.8** Write e2e test at `e2e/auth.test.ts`:
  - Navigate to `/`, verify redirect to `/login`
  - On `/login`, verify form renders with email, password, Google OAuth button
  - Submit with invalid credentials, verify error message appears
  - Click "Sign up" link, verify navigation to `/signup`
  - On `/signup`, verify form renders with fullName, email, password fields

- [x] **T7.9** Write e2e test at `e2e/settings.test.ts`:
  - While authenticated, open settings dialog (via sidebar avatar dropdown)
  - Verify "Manage apps" section is default, app list renders
  - Search for an app, verify filtering
  - Click "Account" sidebar item, verify account section renders
  - Click "Notifications" sidebar item, verify toggle switches render
  - Close dialog via Escape, verify dialog closes

- [x] **T7.10** Run `bun run test` and `bun run test:e2e` -- fix any failures.

**Checkpoint**: All unit tests pass. All e2e tests pass. Auth flow and settings dialog are fully tested.
