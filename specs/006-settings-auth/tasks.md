# Task List: Settings & Auth

**Feature Branch**: `006-settings-auth`
**Created**: 2026-02-07
**Spec**: `specs/006-settings-auth/spec.md`
**Plan**: `specs/006-settings-auth/plan.md`
**Depends on**: `001-foundation`

---

## Phase 1: Setup

### Task 1.1: Create auth route group and layout
- [ ] Create `src/app/(auth)/layout.tsx` as a Server Component
- [ ] Layout renders a centered container (flex, items-center, justify-center, min-h-screen, bg-muted/50)
- [ ] Layout includes the Relay logo at the top center (blue rounded square with "R")
- [ ] Layout checks auth state via Supabase server client; if authenticated, `redirect("/dashboard")`
- [ ] Layout renders `{children}` inside a card-like container (max-w-md, w-full)
- [ ] Verify: visiting `/login` while unauthenticated shows the centered layout with logo

### Task 1.2: Install required shadcn components
- [ ] Run `bunx shadcn@latest add dialog scroll-area switch badge separator avatar progress` (skip any already installed)
- [ ] Verify: all component files exist in `src/components/ui/`
- [ ] Verify: `bun run build` passes with zero errors

### Task 1.3: Create schema and action directories
- [ ] Create `src/lib/schemas/` directory
- [ ] Create `src/lib/actions/` directory
- [ ] Create `src/lib/data/` directory
- [ ] Create `src/components/auth/` directory
- [ ] Create `src/components/settings/` directory
- [ ] Verify: all directories exist

---

## Phase 2: Foundational (Zod Schemas & Auth Actions)

### Task 2.1: Create auth Zod schemas
- [ ] Create `src/lib/schemas/auth.ts`
- [ ] Define `loginSchema`: email (required, valid email format), password (required, min 8 chars)
- [ ] Define `signupSchema`: fullName (required, trimmed), email (required, valid format), password (required, min 8 chars)
- [ ] Export `LoginFormValues` and `SignupFormValues` inferred types
- [ ] Verify: import schemas in a test file, validate that valid inputs pass and invalid inputs produce correct error messages

### Task 2.2: Create settings Zod schemas
- [ ] Create `src/lib/schemas/settings.ts`
- [ ] Define `accountSettingsSchema`: fullName (required, trimmed)
- [ ] Define `workspaceSettingsSchema`: name (required, trimmed)
- [ ] Export inferred types: `AccountSettingsValues`, `WorkspaceSettingsValues`
- [ ] Verify: schemas compile without errors

### Task 2.3: Create auth server actions
- [ ] Create `src/lib/actions/auth.ts` with `"use server"` directive
- [ ] Define `AuthActionResult` type: `{ error?: string }`
- [ ] Implement `loginAction(formData: FormData)`: parse with loginSchema, call `supabase.auth.signInWithPassword`, return `{ error }` on failure, `redirect("/dashboard")` on success
- [ ] Implement `signupAction(formData: FormData)`: parse with signupSchema, call `supabase.auth.signUp` with `data: { full_name }`, return `{ error }` on failure, redirect on success
- [ ] Implement `signOutAction()`: call `supabase.auth.signOut()`, redirect to `/login`
- [ ] Implement `signInWithGoogleAction()`: call `supabase.auth.signInWithOAuth({ provider: "google" })`, redirect to the returned URL
- [ ] Error messages: "Invalid email or password" for login failures, "An account with this email already exists" for duplicate signups
- [ ] Verify: actions compile without TypeScript errors

### Task 2.4: Create settings server actions
- [ ] Create `src/lib/actions/settings.ts` with `"use server"` directive
- [ ] Implement `updateProfileAction(formData: FormData)`: parse with accountSettingsSchema, update `profiles` table, return result
- [ ] Implement `updateWorkspaceAction(formData: FormData)`: parse with workspaceSettingsSchema, update `teams` table, return result
- [ ] Verify: actions compile without TypeScript errors

---

## Phase 3: US1 -- Auth Pages

### Task 3.1: Create OAuth button component
- [ ] Create `src/components/auth/oauth-button.tsx` with `"use client"` directive
- [ ] Render a full-width button with Google icon (Lucide or inline SVG) and "Sign in with Google" text
- [ ] On click, call `signInWithGoogleAction` server action
- [ ] Show loading state (disabled + spinner) while pending
- [ ] Verify: button renders with correct text and icon

### Task 3.2: Create auth error message component
- [ ] Create `src/components/auth/auth-error-message.tsx` with `"use client"` directive
- [ ] Use `useSearchParams()` to read `?error=` query parameter
- [ ] Map error codes to user-friendly messages: `oauth_error` -> "Authentication failed. Please try again.", `expired_code` -> "Authentication session expired. Please try again."
- [ ] Render a destructive-styled alert/banner when an error param is present
- [ ] Render nothing when no error param
- [ ] Verify: renders correct message for each error code, renders nothing for no error

### Task 3.3: Create login form component
- [ ] Create `src/components/auth/login-form.tsx` with `"use client"` directive
- [ ] Use `react-hook-form` with `zodResolver(loginSchema)`
- [ ] Render: email `<Input>` with label, password `<Input type="password">` with label, "Log in" `<Button>` (full width)
- [ ] Render: `<Separator>` with "or" text centered
- [ ] Render: `<OAuthButton />`
- [ ] Render: "Don't have an account? [Sign up](/signup)" link below
- [ ] On submit: call `loginAction` server action, display returned `error` as a form-level error alert
- [ ] Disable submit button while pending (`useFormStatus` or local state)
- [ ] Show field-level validation errors below each input
- [ ] Verify: form renders all fields, validates on submit, shows errors, submits to server action

### Task 3.4: Create login page
- [ ] Create `src/app/(auth)/login/page.tsx` as a Server Component
- [ ] Export metadata: `{ title: "Log in - Relay" }`
- [ ] Render: heading "Log in to Relay", `<AuthErrorMessage />`, `<LoginForm />`
- [ ] Verify: visiting `/login` shows the full login form inside the auth layout

### Task 3.5: Create signup form component
- [ ] Create `src/components/auth/signup-form.tsx` with `"use client"` directive
- [ ] Use `react-hook-form` with `zodResolver(signupSchema)`
- [ ] Render: full name `<Input>` with label, email `<Input>` with label, password `<Input type="password">` with label, "Create account" `<Button>` (full width)
- [ ] Render: `<Separator>` with "or" text centered
- [ ] Render: `<OAuthButton />`
- [ ] Render: "Already have an account? [Log in](/login)" link below
- [ ] On submit: call `signupAction` server action, display returned `error` as form-level error
- [ ] Disable submit button while pending
- [ ] Show field-level validation errors below each input
- [ ] Verify: form renders all fields including name, validates, submits correctly

### Task 3.6: Create signup page
- [ ] Create `src/app/(auth)/signup/page.tsx` as a Server Component
- [ ] Export metadata: `{ title: "Sign up - Relay" }`
- [ ] Render: heading "Create your Relay account", `<AuthErrorMessage />`, `<SignupForm />`
- [ ] Verify: visiting `/signup` shows the full signup form inside the auth layout

### Task 3.7: Create OAuth callback route handler
- [ ] Create `src/app/auth/callback/route.ts` (NOT inside `(auth)` group -- this is `/auth/callback`, not `/(auth)/callback`)
- [ ] Export `async function GET(request: Request)`
- [ ] Read `code` query parameter from `request.url`
- [ ] If no `code`, redirect to `/login`
- [ ] Create Supabase server client
- [ ] Call `supabase.auth.exchangeCodeForSession(code)`
- [ ] On success: redirect to `/dashboard`
- [ ] On error: redirect to `/login?error=oauth_error`
- [ ] Wrap in try/catch: any unhandled error redirects to `/login?error=oauth_error`
- [ ] Verify: route handler compiles, handles missing code param, handles exchange errors

### Task 3.8: Update landing page with auth redirect
- [ ] Modify `src/app/page.tsx` to be a Server Component that checks auth state
- [ ] Create Supabase server client, call `supabase.auth.getUser()`
- [ ] If authenticated (user exists): `redirect("/dashboard")`
- [ ] If unauthenticated: `redirect("/login")`
- [ ] Verify: visiting `/` redirects to `/login` when not logged in, redirects to `/dashboard` when logged in

---

## Phase 4: US2 -- Settings Dialog

### Task 4.1: Create app integrations data file
- [ ] Create `src/lib/data/app-integrations.ts`
- [ ] Define `AppAuthType`, `AppCategory`, and `AppIntegration` types
- [ ] Define `APP_INTEGRATIONS` constant array with all 105 app entries from the spec
- [ ] Each entry has: `id` (slug), `name`, `logoUrl` (placeholder path), `category`, `authType`
- [ ] Sort array alphabetically by `name` using `.sort((a, b) => a.name.localeCompare(b.name))`
- [ ] Verify: array has 105 entries, types compile, entries are sorted

### Task 4.2: Create settings sidebar component
- [ ] Create `src/components/settings/settings-sidebar.tsx`
- [ ] Accept props: `activeSection: string`, `onSelect: (section: string) => void`
- [ ] Define settings sections as a constant: `PERSONAL` group (account, notifications, manage-apps) and `WORKSPACE` group (general, members, billing)
- [ ] Render two labeled groups ("PERSONAL", "WORKSPACE") with nav items using `<button>` elements
- [ ] Active section item has `bg-muted` background and bold text
- [ ] Non-active items have hover state (`hover:bg-muted/50`)
- [ ] Sidebar width: `w-56` with padding and border-right
- [ ] Verify: renders all 6 sections in 2 groups, highlights active section, calls onSelect on click

### Task 4.3: Create app integration row component
- [ ] Create `src/components/settings/app-integration-row.tsx`
- [ ] Accept props: `app: AppIntegration`, `onConnect: (appId: string) => void`
- [ ] Render row with: `<Avatar>` (32x32, `<AvatarImage src={app.logoUrl}>` + `<AvatarFallback>` with first letter of app name and color derived from name), app name text, and action button on the right
- [ ] If `app.authType === "google"`: render "Sign in with Google" button (outline variant with Google icon)
- [ ] Otherwise: render "Connect" button (default variant, blue)
- [ ] Row layout: flex, items-center, justify-between, padding, border-bottom
- [ ] Verify: renders logo fallback, name, correct button variant based on authType

### Task 4.4: Create manage apps section component
- [ ] Create `src/components/settings/manage-apps-section.tsx`
- [ ] Import `APP_INTEGRATIONS` from data file
- [ ] Maintain search query state (`useState`)
- [ ] Filter apps using `useMemo`: case-insensitive substring match on `app.name`
- [ ] Render: section heading "Manage apps", search `<Input>` (placeholder: "Search apps..."), `<ScrollArea>` containing filtered app rows
- [ ] When search has no results: display "No apps found matching your search." centered text
- [ ] On "Connect" click: show toast "Connection flow coming soon" via sonner
- [ ] Verify: all 105 apps render in alphabetical order, search filters in real-time, empty state shows

### Task 4.5: Create settings dialog shell
- [ ] Create `src/components/settings/settings-dialog.tsx` with `"use client"` directive
- [ ] Accept props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `defaultSection?: string`
- [ ] Maintain `activeSection` state, initialized to `defaultSection ?? "manage-apps"`
- [ ] Render `<Dialog>` with `<DialogContent className="max-w-5xl max-h-[80vh] p-0 overflow-hidden">`
- [ ] Inside: flex container with `<SettingsSidebar>` on left and content area on right
- [ ] Content area switches based on `activeSection`: "manage-apps" -> `<ManageAppsSection>`, others -> placeholder `<div>` with section name (to be implemented in Phase 5)
- [ ] Dialog has `<DialogTitle>` set to "Settings" (visually hidden or in header) for accessibility
- [ ] Verify: dialog opens/closes, sidebar nav switches sections, manage apps is default

### Task 4.6: Export settings dialog for use by other components
- [ ] Create `src/components/settings/index.ts` barrel export file
- [ ] Export `SettingsDialog` component
- [ ] Export `SettingsSection` type (union of section slugs)
- [ ] Verify: can import `{ SettingsDialog }` from `@/components/settings`

---

## Phase 5: US3 -- Settings Sections

### Task 5.1: Create account section
- [ ] Create `src/components/settings/account-section.tsx` with `"use client"` directive
- [ ] Use `react-hook-form` with `zodResolver(accountSettingsSchema)`
- [ ] Render: section heading "Account"
- [ ] Render: circular avatar area (80x80, clickable, shows current avatar or initials fallback)
- [ ] On avatar click: trigger hidden `<input type="file" accept="image/png,image/jpeg,image/gif">`
- [ ] Validate file: max 2MB, must be image type. Show toast on validation error.
- [ ] Render: full name `<Input>` (pre-filled from profile data), email `<Input>` (read-only, disabled, showing current email)
- [ ] Render: "Save changes" `<Button>`, disabled while no changes or while submitting
- [ ] On submit: call `updateProfileAction`, show success toast, handle errors
- [ ] Verify: renders all fields, pre-fills data, validates, submits, shows toast feedback

### Task 5.2: Create notifications section
- [ ] Create `src/components/settings/notifications-section.tsx` with `"use client"` directive
- [ ] Render: section heading "Notifications"
- [ ] Render three rows, each with: label text, description text, and `<Switch>` toggle on the right
  - "Email notifications" / "Receive email notifications for important updates"
  - "Workflow run failures" / "Get notified when a workflow run fails"
  - "Weekly activity digest" / "Receive a weekly summary of your workspace activity"
- [ ] All switches default to "on" (checked)
- [ ] On toggle: show toast "Notification preference updated" (placeholder -- no backend persistence yet)
- [ ] Verify: renders three toggle rows, switches toggle on/off, toast appears

### Task 5.3: Create workspace general section
- [ ] Create `src/components/settings/general-section.tsx` with `"use client"` directive
- [ ] Use `react-hook-form` with `zodResolver(workspaceSettingsSchema)`
- [ ] Render: section heading "General"
- [ ] Render: workspace name `<Input>` (pre-filled from team data, editable)
- [ ] Render: workspace slug `<Input>` (read-only, disabled, derived from team slug)
- [ ] Render: "Save changes" `<Button>`, disabled while no changes or while submitting
- [ ] On submit: call `updateWorkspaceAction`, show success toast
- [ ] Verify: renders fields, pre-fills, validates, submits

### Task 5.4: Create members section
- [ ] Create `src/components/settings/members-section.tsx` with `"use client"` directive
- [ ] Render: section heading "Members", "Invite member" `<Button>` (outline variant) in header row
- [ ] Render: list of team members, each row showing: `<Avatar>` (32x32), member name, member email (muted text), role `<Badge>` (Owner/Admin/Member)
- [ ] Owner badge: default variant. Admin badge: secondary variant. Member badge: outline variant.
- [ ] "Invite member" button click: show toast "Invite flow coming soon" (placeholder)
- [ ] If no members data, show the current user as the sole member with Owner role
- [ ] Verify: renders member rows with avatars and role badges, invite button shows toast

### Task 5.5: Create billing section
- [ ] Create `src/components/settings/billing-section.tsx` with `"use client"` directive
- [ ] Render: section heading "Billing"
- [ ] Render: current plan card with plan name "Free" (or from data), plan description
- [ ] Render: usage section with two `<Progress>` bars:
  - "Steps": `steps_used / steps_limit` with count label (e.g., "750 / 1,000")
  - "AI Credits": `ai_credits_used / ai_credits_limit` with count label (e.g., "25.00 / 100.00")
- [ ] Render: "Upgrade plan" `<Button>` (default variant), click shows toast "Upgrade flow coming soon"
- [ ] Verify: renders plan info, progress bars with correct percentages, upgrade button

### Task 5.6: Wire all sections into settings dialog
- [ ] Update `src/components/settings/settings-dialog.tsx` to import and render all section components
- [ ] Replace placeholder `<div>` elements with actual section components
- [ ] Pass relevant data (profile, team, usage, members) as props to each section
- [ ] Handle the case where data is not yet loaded (loading state or defaults)
- [ ] Verify: clicking each sidebar item renders the correct section content

---

## Phase 6: Polish

### Task 6.1: Responsive auth pages
- [ ] Auth layout renders correctly on mobile (< 640px): full-width card, adequate padding
- [ ] Auth layout renders correctly on tablet (640px-1024px): centered card
- [ ] Auth layout renders correctly on desktop (> 1024px): centered card with comfortable spacing
- [ ] All form inputs are touch-friendly (min height 44px for mobile)
- [ ] Verify: test at 375px, 768px, and 1440px viewport widths

### Task 6.2: Responsive settings dialog
- [ ] On mobile (< 640px): dialog becomes full-screen or near-full-screen
- [ ] On mobile: sidebar navigation stacks above content or becomes a horizontal scrollable tab bar
- [ ] On tablet+: dialog uses `max-w-5xl` with sidebar on left
- [ ] ScrollArea in manage apps section works correctly at all sizes
- [ ] Verify: test at 375px, 768px, and 1440px viewport widths

### Task 6.3: Keyboard accessibility
- [ ] All form inputs are reachable via Tab key in logical order
- [ ] Submit buttons can be triggered via Enter key
- [ ] Settings dialog can be closed via Escape key
- [ ] Settings sidebar items are focusable and activatable via Enter/Space
- [ ] `<Dialog>` traps focus correctly (built into shadcn/Radix)
- [ ] Auth page links (Sign up / Log in) are keyboard accessible
- [ ] Verify: navigate through entire auth flow and settings dialog using only keyboard

### Task 6.4: Loading and error states
- [ ] Login form: submit button shows spinner and "Logging in..." text while pending
- [ ] Signup form: submit button shows spinner and "Creating account..." text while pending
- [ ] OAuth button: shows spinner and disables while redirecting
- [ ] Settings save buttons: show spinner and "Saving..." text while pending
- [ ] All error states display user-friendly messages (no raw error codes)
- [ ] Network failures show generic "Something went wrong. Please try again." toast
- [ ] Verify: all buttons show correct pending states, error messages are friendly

### Task 6.5: Final build verification
- [ ] Run `bun run build` -- must complete with zero errors
- [ ] Run `bun run lint` -- must pass with zero warnings on all new files
- [ ] Verify no `"use client"` directives on Server Components
- [ ] Verify no server-only imports in client components
- [ ] Verify all imports use `@/` path alias
- [ ] Verify all `className` compositions use `cn()` from `@/lib/utils`
- [ ] Verify no hardcoded colors -- all use Tailwind theme tokens / CSS variables
- [ ] Verify no `any` types in TypeScript

---

## Phase 7: Testing

**Purpose**: Unit tests for auth components, Zod schemas, settings sections. E2e tests for auth flows and settings dialog.

**Prerequisites**: 001-foundation Phase 6 (Vitest, Playwright, Prettier, Husky) must be complete.

### Unit Tests (Vitest + Testing Library)

- [ ] **T7.1** [P] Write unit tests for auth Zod schemas at `src/lib/schemas/__tests__/auth.test.ts`:
  - Test loginSchema: valid email+password passes, invalid email fails, short password fails
  - Test signupSchema: valid data passes, missing fullName fails, invalid email fails

- [ ] **T7.2** [P] Write unit tests for settings Zod schemas at `src/lib/schemas/__tests__/settings.test.ts`:
  - Test accountSettingsSchema: valid fullName passes, empty/whitespace fails
  - Test workspaceSettingsSchema: valid name passes, empty fails

- [ ] **T7.3** [P] Write unit tests for LoginForm at `src/components/auth/__tests__/login-form.test.tsx`:
  - Render form, verify email and password inputs render
  - Verify submit button is present
  - Submit with empty fields, verify validation errors appear
  - Verify "Sign up" link renders with correct href

- [ ] **T7.4** [P] Write unit tests for SignupForm at `src/components/auth/__tests__/signup-form.test.tsx`:
  - Render form, verify fullName, email, password inputs render
  - Submit with empty fields, verify validation errors appear
  - Verify "Log in" link renders with correct href

- [ ] **T7.5** [P] Write unit tests for AuthErrorMessage at `src/components/auth/__tests__/auth-error-message.test.tsx`:
  - Mock useSearchParams with error=oauth_error, verify error message renders
  - Mock useSearchParams with no error, verify nothing renders

- [ ] **T7.6** [P] Write unit tests for ManageAppsSection at `src/components/settings/__tests__/manage-apps-section.test.tsx`:
  - Render component, verify app list renders (check a few app names)
  - Type in search, verify filtering works
  - Search with no matches, verify empty state message

- [ ] **T7.7** [P] Write unit tests for SettingsDialog at `src/components/settings/__tests__/settings-dialog.test.tsx`:
  - Render with open=true, verify dialog renders
  - Verify sidebar sections render (PERSONAL, WORKSPACE groups)
  - Click a sidebar item, verify content area switches

### End-to-End Tests (Playwright)

- [ ] **T7.8** Write e2e test at `e2e/auth.test.ts`:
  - Navigate to `/`, verify redirect to `/login`
  - On `/login`, verify form renders with email, password, Google OAuth button
  - Submit with invalid credentials, verify error message appears
  - Click "Sign up" link, verify navigation to `/signup`
  - On `/signup`, verify form renders with fullName, email, password fields

- [ ] **T7.9** Write e2e test at `e2e/settings.test.ts`:
  - While authenticated, open settings dialog (via sidebar avatar dropdown)
  - Verify "Manage apps" section is default, app list renders
  - Search for an app, verify filtering
  - Click "Account" sidebar item, verify account section renders
  - Click "Notifications" sidebar item, verify toggle switches render
  - Close dialog via Escape, verify dialog closes

- [ ] **T7.10** Run `bun run test` and `bun run test:e2e` -- fix any failures.

**Checkpoint**: All unit tests pass. All e2e tests pass. Auth flow and settings dialog are fully tested.
