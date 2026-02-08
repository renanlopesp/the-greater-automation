# Feature Specification: Settings & Auth

**Feature Branch**: `006-settings-auth`
**Created**: 2026-02-07
**Status**: Draft
**Input**: Phase 6 of DEVELOPMENT_SPEC.md -- Settings dialog, Auth pages, Landing page
**Depends on**: `001-foundation` (Supabase clients, auth middleware, profiles/teams/app_connections tables, database.types.ts)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Auth Pages (Priority: P1)

As a new or returning user, I need login and signup pages with email/password forms and Google OAuth so that I can create an account, authenticate, and be redirected to the dashboard securely.

**Why this priority**: Without auth pages, no user can enter the application. The login and signup flows are the gate to every other feature in Relay. The OAuth callback handler completes the Google sign-in loop, and the landing page redirect ensures users always arrive at the right place. Nothing else in the app is usable until users can authenticate.

**Independent Test**: Can be fully tested by navigating to `/login`, submitting credentials, verifying redirect to `/dashboard`. Then logging out, navigating to `/signup`, creating a new account, verifying redirect to `/dashboard`. Then testing Google OAuth by clicking "Sign in with Google", completing the Google flow, verifying the callback creates/links a profile and redirects to `/dashboard`. The landing page (`/`) can be tested by visiting it while unauthenticated (redirect to `/login`) and authenticated (redirect to `/dashboard`).

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to `/login`, **Then** they see a centered card with: Relay logo, "Log in to Relay" heading, email input field, password input field, "Log in" submit button, an "or" horizontal divider, "Sign in with Google" button with Google icon, and a "Don't have an account? Sign up" link.
2. **Given** the login page, **When** the user enters a valid email and correct password and clicks "Log in", **Then** Supabase `signInWithPassword` is called, a session cookie is set, and the user is redirected to `/dashboard`.
3. **Given** the login page, **When** the user enters an invalid email format (e.g., "notanemail"), **Then** client-side validation displays "Please enter a valid email address" below the email field before any network request.
4. **Given** the login page, **When** the user enters a password shorter than 8 characters, **Then** client-side validation displays "Password must be at least 8 characters" below the password field.
5. **Given** the login page, **When** the user enters a valid email but wrong password, **Then** Supabase returns an error and the form displays "Invalid email or password" as a general error message (not field-specific, to avoid leaking which field is wrong).
6. **Given** the login page, **When** the user clicks "Sign in with Google", **Then** `supabase.auth.signInWithOAuth({ provider: 'google' })` is called, which redirects the browser to Google's OAuth consent screen with the callback URL set to `/auth/callback`.
7. **Given** the user completes Google OAuth consent, **When** Google redirects to `/auth/callback` with an authorization code, **Then** the route handler exchanges the code for a session via `supabase.auth.exchangeCodeForSession(code)`, sets session cookies, and redirects to `/dashboard`.
8. **Given** the user completes Google OAuth for the first time, **When** the callback processes, **Then** a new profile row is created in the `profiles` table (via the database trigger on `auth.users`), and the user lands on `/dashboard`.
9. **Given** a returning Google OAuth user, **When** the callback processes, **Then** the existing profile is linked (no duplicate), and the user lands on `/dashboard`.
10. **Given** an unauthenticated user, **When** they navigate to `/signup`, **Then** they see a centered card with: Relay logo, "Create your Relay account" heading, full name input field, email input field, password input field, "Create account" submit button, an "or" divider, "Sign in with Google" button, and an "Already have an account? Log in" link.
11. **Given** the signup page, **When** the user fills in all fields with valid data (name non-empty, email valid format, password >= 8 chars) and clicks "Create account", **Then** Supabase `signUp` is called with email, password, and `data: { full_name }`, a session is created, and the user is redirected to `/dashboard`.
12. **Given** the signup page, **When** the user leaves the name field empty, **Then** client-side validation displays "Name is required" below the name field.
13. **Given** the signup page, **When** the user enters an email that already exists, **Then** Supabase returns an error and the form displays "An account with this email already exists" as a form-level error.
14. **Given** an authenticated user, **When** they navigate to `/login` or `/signup`, **Then** they are immediately redirected to `/dashboard`.
15. **Given** any user, **When** they navigate to `/` (root landing page), **Then** the server checks auth state: if authenticated, redirect to `/dashboard`; if unauthenticated, redirect to `/login`.

---

### User Story 2 - Settings Dialog (Priority: P2)

As an authenticated user, I need a settings dialog with a sidebar navigation and a searchable list of 100+ app integrations so that I can manage my connected apps, find new integrations, and access account/workspace configuration.

**Why this priority**: The settings dialog is the hub for all configuration in Relay. The "Manage apps" view is the default and most frequently accessed section, as connecting third-party apps is core to Relay's workflow automation. This depends on auth (US1) being in place so the user is logged in.

**Independent Test**: Can be tested by opening the settings dialog (via sidebar "Apps" icon or avatar dropdown "Settings"), verifying the modal appears with correct dimensions, verifying sidebar navigation sections are present, verifying "Manage apps" is active by default with a searchable list of app integrations, and verifying each app row has a logo, name, and "Connect" button.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any dashboard page, **When** they trigger the settings dialog (clicking "Apps" in the sidebar or "Settings" in avatar dropdown), **Then** a modal dialog opens centered on screen with `max-w-5xl` width and `max-h-[80vh]` height.
2. **Given** the settings dialog is open, **When** the user looks at the left side, **Then** they see a vertical sidebar navigation with two sections: "PERSONAL" (containing: Account, Notifications, Manage apps) and "WORKSPACE" (containing: General, Members, Billing).
3. **Given** the settings dialog opens, **When** no section was previously selected, **Then** "Manage apps" is the active/default section, highlighted in the sidebar.
4. **Given** "Manage apps" is the active section, **When** the user looks at the main content area, **Then** they see a search input at the top (placeholder: "Search apps...") and a scrollable list of app integrations below it.
5. **Given** the app integrations list, **When** it renders, **Then** each row displays: an app logo/icon (32x32px, rounded), the app name, and a "Connect" button (blue variant). Some Google-related apps (Gmail, Google Sheets, Google Drive, Google Calendar) show a "Sign in with Google" variant button instead.
6. **Given** the app integrations list, **When** fully rendered, **Then** it contains at least 20 apps displayed in alphabetical order. The list is scrollable within the dialog content area using a ScrollArea component.
7. **Given** the search input in "Manage apps", **When** the user types "slack", **Then** the list filters in real-time to show only apps whose names match the query (case-insensitive). When cleared, the full list returns.
8. **Given** the search input, **When** the user types a query that matches no apps (e.g., "xyznonexistent"), **Then** the list shows an empty state: "No apps found matching your search."
9. **Given** the user clicks "Connect" on an app row, **When** the click is processed, **Then** the button transitions to a loading/connecting state (this is a placeholder for actual OAuth flow in future phases; for now, a toast notification "Connection flow coming soon" is acceptable).
10. **Given** the settings dialog is open, **When** the user clicks a different section in the sidebar (e.g., "Account"), **Then** the main content area switches to that section's content and the sidebar highlights the new active section.
11. **Given** the settings dialog is open, **When** the user presses Escape or clicks outside the dialog, **Then** the dialog closes.
12. **Given** the settings dialog is open, **When** the user clicks the X (close) button in the top-right corner, **Then** the dialog closes.

---

### User Story 3 - Settings Sections (Priority: P3)

As an authenticated user, I need form-based settings pages for Account, Notifications, Workspace General, Members, and Billing so that I can manage my personal preferences and workspace configuration.

**Why this priority**: These are secondary configuration screens. The application is fully usable without them (users can authenticate and manage apps), but they provide important personalization and administration capabilities. They depend on the settings dialog shell (US2) being in place.

**Independent Test**: Can be tested by opening the settings dialog, navigating to each section via the sidebar, and verifying the correct form fields and controls render for each section with appropriate labels and input types.

**Acceptance Scenarios**:

1. **Given** the user navigates to "Account" in the settings sidebar, **When** the section renders, **Then** they see form fields for: avatar upload area (circular, showing current avatar or initials fallback), full name input (pre-filled with current value), email display (read-only, showing current email), and a "Save changes" button.
2. **Given** the Account section, **When** the user changes their full name and clicks "Save changes", **Then** the profile is updated in the `profiles` table via Supabase, a success toast appears, and the sidebar/avatar reflect the updated name.
3. **Given** the Account section, **When** the user clicks the avatar area, **Then** a file picker opens allowing them to select an image file (accept: image/png, image/jpeg, image/gif, max 2MB).
4. **Given** the user navigates to "Notifications" in the settings sidebar, **When** the section renders, **Then** they see toggle switches for notification preferences: "Email notifications" (on/off), "Workflow run failures" (on/off), "Weekly activity digest" (on/off).
5. **Given** the user navigates to "General" under WORKSPACE, **When** the section renders, **Then** they see form fields for: workspace name input (pre-filled), workspace slug (read-only, derived from name), and a "Save changes" button.
6. **Given** the user navigates to "Members" under WORKSPACE, **When** the section renders, **Then** they see a list of current team members showing: avatar, name, email, role badge (Owner/Admin/Member), and an "Invite member" button at the top.
7. **Given** the Members section, **When** the team has only one member (the current user), **Then** that member is displayed with the "Owner" role badge and no remove/role-change actions (cannot remove sole owner).
8. **Given** the user navigates to "Billing" under WORKSPACE, **When** the section renders, **Then** they see: current plan name (e.g., "Free"), usage summary (steps used / limit, AI credits used / limit as progress bars), and a "Upgrade plan" button (placeholder).

---

### Edge Cases

- **Wrong password on login**: Form must display "Invalid email or password" without specifying which field is incorrect to prevent account enumeration attacks.
- **Duplicate email on signup**: Supabase may return different error codes for existing email with password vs. OAuth. The form should display "An account with this email already exists" for all cases, and suggest logging in instead.
- **OAuth error**: If Google OAuth returns an error (user denies consent, network failure), the callback route must redirect to `/login?error=oauth_error` and the login page must display "Authentication failed. Please try again." when that query param is present.
- **Expired OAuth callback code**: If the authorization code in the callback URL has expired (older than ~10 minutes), `exchangeCodeForSession` will fail. The callback must redirect to `/login?error=expired_code` with an appropriate message.
- **OAuth callback without code**: If `/auth/callback` is accessed without a `code` query parameter, redirect to `/login` immediately.
- **Settings dialog on mobile**: On viewports < 640px, the settings dialog should become full-screen or near-full-screen. The sidebar navigation should stack above the content area or be collapsible.
- **App connection failure**: If a "Connect" button action fails (network error, provider error), display a toast with a clear error message and revert the button to its original state.
- **Search with special characters**: The app search input should handle special characters (e.g., "C++", "C#", ampersands) without breaking the filter.
- **Empty profile data**: If user profile has no full_name, the Account settings should display the email as a fallback and not crash.
- **Avatar upload too large**: If the user selects an image > 2MB, display a validation error "Image must be less than 2MB" without uploading.
- **Avatar upload wrong format**: If the user selects a non-image file, display "Please select a PNG, JPEG, or GIF image."
- **Concurrent settings updates**: If two browser tabs update the same setting, the last write wins. No conflict resolution is needed but updates should not corrupt data.
- **Member invite with existing email**: Inviting a user who is already a team member should show "This user is already a member of this workspace."
- **Session expiry during settings edit**: If the session expires while the user is editing settings, the next save attempt should redirect to login rather than silently failing.
- **Form submission while pending**: All submit buttons must disable while a request is in flight to prevent double submissions.

## App Integrations Data _(reference)_

The following apps MUST be included in the Manage Apps list. Each entry requires: `id` (string slug), `name` (display name), `logoUrl` (path to logo image or placeholder icon name), `category` (for potential filtering), and `authType` ("oauth" | "api_key" | "google").

| #   | App Name           | Slug            | Category           | Auth Type |
| --- | ------------------ | --------------- | ------------------ | --------- |
| 1   | Gmail              | gmail           | Email              | google    |
| 2   | Slack              | slack           | Communication      | oauth     |
| 3   | Notion             | notion          | Productivity       | oauth     |
| 4   | HubSpot            | hubspot         | CRM                | oauth     |
| 5   | Salesforce         | salesforce      | CRM                | oauth     |
| 6   | Jira               | jira            | Project Management | oauth     |
| 7   | GitHub             | github          | Development        | oauth     |
| 8   | Linear             | linear          | Project Management | oauth     |
| 9   | Asana              | asana           | Project Management | oauth     |
| 10  | Trello             | trello          | Project Management | oauth     |
| 11  | Airtable           | airtable        | Productivity       | oauth     |
| 12  | Google Sheets      | google-sheets   | Productivity       | google    |
| 13  | Google Drive       | google-drive    | Storage            | google    |
| 14  | Dropbox            | dropbox         | Storage            | oauth     |
| 15  | OneDrive           | onedrive        | Storage            | oauth     |
| 16  | Zoom               | zoom            | Communication      | oauth     |
| 17  | Microsoft Teams    | microsoft-teams | Communication      | oauth     |
| 18  | Discord            | discord         | Communication      | oauth     |
| 19  | Stripe             | stripe          | Finance            | oauth     |
| 20  | Shopify            | shopify         | E-commerce         | oauth     |
| 21  | Google Calendar    | google-calendar | Productivity       | google    |
| 22  | Outlook            | outlook         | Email              | oauth     |
| 23  | Mailchimp          | mailchimp       | Marketing          | oauth     |
| 24  | Intercom           | intercom        | Support            | oauth     |
| 25  | Zendesk            | zendesk         | Support            | oauth     |
| 26  | Twilio             | twilio          | Communication      | api_key   |
| 27  | SendGrid           | sendgrid        | Email              | api_key   |
| 28  | Figma              | figma           | Design             | oauth     |
| 29  | Miro               | miro            | Design             | oauth     |
| 30  | Calendly           | calendly        | Scheduling         | oauth     |
| 31  | Typeform           | typeform        | Forms              | oauth     |
| 32  | Webflow            | webflow         | Website            | oauth     |
| 33  | WordPress          | wordpress       | Website            | oauth     |
| 34  | Supabase           | supabase        | Database           | api_key   |
| 35  | PostgreSQL         | postgresql      | Database           | api_key   |
| 36  | MongoDB            | mongodb         | Database           | api_key   |
| 37  | Firebase           | firebase        | Database           | api_key   |
| 38  | AWS S3             | aws-s3          | Storage            | api_key   |
| 39  | Cloudflare         | cloudflare      | Infrastructure     | api_key   |
| 40  | Vercel             | vercel          | Infrastructure     | oauth     |
| 41  | Netlify            | netlify         | Infrastructure     | oauth     |
| 42  | Amplitude          | amplitude       | Analytics          | api_key   |
| 43  | Mixpanel           | mixpanel        | Analytics          | api_key   |
| 44  | Segment            | segment         | Analytics          | api_key   |
| 45  | Datadog            | datadog         | Monitoring         | api_key   |
| 46  | PagerDuty          | pagerduty       | Monitoring         | oauth     |
| 47  | Confluence         | confluence      | Documentation      | oauth     |
| 48  | ClickUp            | clickup         | Project Management | oauth     |
| 49  | Monday.com         | monday          | Project Management | oauth     |
| 50  | Basecamp           | basecamp        | Project Management | oauth     |
| 51  | Freshdesk          | freshdesk       | Support            | api_key   |
| 52  | Pipedrive          | pipedrive       | CRM                | oauth     |
| 53  | Copper             | copper          | CRM                | api_key   |
| 54  | QuickBooks         | quickbooks      | Finance            | oauth     |
| 55  | Xero               | xero            | Finance            | oauth     |
| 56  | PayPal             | paypal          | Finance            | oauth     |
| 57  | Square             | square          | Finance            | oauth     |
| 58  | Loom               | loom            | Communication      | oauth     |
| 59  | Notion AI          | notion-ai       | AI                 | oauth     |
| 60  | OpenAI             | openai          | AI                 | api_key   |
| 61  | Anthropic          | anthropic       | AI                 | api_key   |
| 62  | X (Twitter)        | twitter         | Social Media       | oauth     |
| 63  | LinkedIn           | linkedin        | Social Media       | oauth     |
| 64  | Facebook           | facebook        | Social Media       | oauth     |
| 65  | Instagram          | instagram       | Social Media       | oauth     |
| 66  | YouTube            | youtube         | Social Media       | google    |
| 67  | TikTok             | tiktok          | Social Media       | oauth     |
| 68  | Reddit             | reddit          | Social Media       | oauth     |
| 69  | Pinterest          | pinterest       | Social Media       | oauth     |
| 70  | WhatsApp Business  | whatsapp        | Communication      | api_key   |
| 71  | Telegram           | telegram        | Communication      | api_key   |
| 72  | GitLab             | gitlab          | Development        | oauth     |
| 73  | Bitbucket          | bitbucket       | Development        | oauth     |
| 74  | CircleCI           | circleci        | Development        | oauth     |
| 75  | Docker Hub         | docker-hub      | Development        | api_key   |
| 76  | npm                | npm             | Development        | api_key   |
| 77  | Sentry             | sentry          | Monitoring         | oauth     |
| 78  | Grafana            | grafana         | Monitoring         | api_key   |
| 79  | Elasticsearch      | elasticsearch   | Search             | api_key   |
| 80  | Algolia            | algolia         | Search             | api_key   |
| 81  | Brevo (Sendinblue) | brevo           | Marketing          | api_key   |
| 82  | ActiveCampaign     | activecampaign  | Marketing          | api_key   |
| 83  | ConvertKit         | convertkit      | Marketing          | api_key   |
| 84  | Zapier             | zapier          | Automation         | oauth     |
| 85  | Make (Integromat)  | make            | Automation         | oauth     |
| 86  | Google Ads         | google-ads      | Advertising        | google    |
| 87  | Facebook Ads       | facebook-ads    | Advertising        | oauth     |
| 88  | Snowflake          | snowflake       | Database           | api_key   |
| 89  | BigQuery           | bigquery        | Database           | google    |
| 90  | Redshift           | redshift        | Database           | api_key   |
| 91  | Tableau            | tableau         | Analytics          | oauth     |
| 92  | Power BI           | power-bi        | Analytics          | oauth     |
| 93  | Looker             | looker          | Analytics          | google    |
| 94  | Coda               | coda            | Productivity       | oauth     |
| 95  | SmartSheet         | smartsheet      | Productivity       | oauth     |
| 96  | Box                | box             | Storage            | oauth     |
| 97  | Evernote           | evernote        | Productivity       | oauth     |
| 98  | Todoist            | todoist         | Productivity       | oauth     |
| 99  | 1Password          | 1password       | Security           | api_key   |
| 100 | Okta               | okta            | Security           | oauth     |
| 101 | Auth0              | auth0           | Security           | oauth     |
| 102 | Plaid              | plaid           | Finance            | api_key   |
| 103 | WooCommerce        | woocommerce     | E-commerce         | api_key   |
| 104 | Magento            | magento         | E-commerce         | api_key   |
| 105 | Gong               | gong            | Sales              | oauth     |

## Requirements _(mandatory)_

### Functional Requirements

**Auth Pages**

- **FR-001**: System MUST provide a login page at `/login` with email input, password input, "Log in" submit button, "or" divider, "Sign in with Google" OAuth button, and a link to `/signup`.
- **FR-002**: System MUST provide a signup page at `/signup` with full name input, email input, password input, "Create account" submit button, "or" divider, "Sign in with Google" OAuth button, and a link to `/login`.
- **FR-003**: Login form MUST validate email format (valid email regex) and password length (minimum 8 characters) on the client side before submitting.
- **FR-004**: Signup form MUST validate name (non-empty, trimmed), email format, and password length on the client side before submitting.
- **FR-005**: Login MUST call `supabase.auth.signInWithPassword({ email, password })` and handle success (redirect to `/dashboard`) and error (display error message) cases.
- **FR-006**: Signup MUST call `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` and handle success (redirect to `/dashboard`) and error cases.
- **FR-007**: Both auth pages MUST provide a "Sign in with Google" button that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`.
- **FR-008**: System MUST provide an OAuth callback route handler at `/auth/callback` (`route.ts`) that reads the `code` query parameter, calls `supabase.auth.exchangeCodeForSession(code)`, and redirects to `/dashboard` on success or `/login?error=<type>` on failure.
- **FR-009**: The landing page at `/` MUST check auth state server-side and redirect to `/dashboard` (authenticated) or `/login` (unauthenticated).
- **FR-010**: Auth pages MUST redirect authenticated users to `/dashboard` (no accessing login/signup when already logged in).
- **FR-011**: Form error messages for authentication failures MUST be generic ("Invalid email or password") to prevent account enumeration.
- **FR-012**: Auth pages MUST display error messages from query parameters (e.g., `?error=oauth_error`) when redirected from the callback handler.

**Settings Dialog**

- **FR-013**: System MUST provide a `SettingsDialog` component that opens as a modal with `max-w-5xl` width and `max-h-[80vh]` height.
- **FR-014**: Settings dialog MUST have a left sidebar navigation with two labeled sections: "PERSONAL" (Account, Notifications, Manage apps) and "WORKSPACE" (General, Members, Billing).
- **FR-015**: "Manage apps" MUST be the default active section when the dialog opens.
- **FR-016**: Manage apps view MUST display a search input (placeholder: "Search apps...") followed by a scrollable list of app integrations.
- **FR-017**: Each app integration row MUST display: app logo/icon (32x32px rounded), app name, and a "Connect" button (default variant) or "Sign in with Google" button (for apps with `authType: "google"`).
- **FR-018**: App integrations list MUST be sorted alphabetically by app name.
- **FR-019**: App search MUST filter the list in real-time (case-insensitive substring match on app name) as the user types.
- **FR-020**: App search with no matches MUST display "No apps found matching your search."
- **FR-021**: Settings dialog MUST close when pressing Escape, clicking outside, or clicking the close (X) button.

**Settings Sections**

- **FR-022**: Account section MUST display: circular avatar area (click to upload, showing current avatar or initials fallback), full name input (pre-filled), email display (read-only), and "Save changes" button.
- **FR-023**: Account avatar upload MUST accept image/png, image/jpeg, image/gif with a maximum file size of 2MB.
- **FR-024**: Notifications section MUST display toggle switches for: "Email notifications", "Workflow run failures", "Weekly activity digest".
- **FR-025**: Workspace General section MUST display: workspace name input (pre-filled, editable) and workspace slug (read-only, derived from name).
- **FR-026**: Members section MUST display a list of team members with avatar, name, email, and role badge (Owner/Admin/Member), plus an "Invite member" button.
- **FR-027**: Billing section MUST display: current plan name, usage summary with progress bars (steps, AI credits), and an "Upgrade plan" button.

**Session Management**

- **FR-028**: Auth MUST use `@supabase/ssr` for cookie-based session management, setting `sb-access-token` and `sb-refresh-token` cookies via the server client.
- **FR-029**: The auth middleware (from 001-foundation) MUST intercept all protected routes and validate/refresh sessions before allowing access.
- **FR-030**: All auth form submit buttons MUST disable while a request is in flight to prevent double submissions.
- **FR-031**: All settings form submit buttons MUST disable while a save request is in flight.

### Key Entities

- **Profile**: User identity fields relevant to auth and account settings. Fields: `id` (uuid), `email` (text), `full_name` (text), `avatar_url` (text). Source: `profiles` table. Used in: login/signup (creation), account settings (update).
- **Team**: Workspace identity for settings. Fields: `id` (uuid), `name` (text), `slug` (text), `avatar_url` (text). Source: `teams` table. Used in: workspace general settings, members list.
- **TeamMember**: User-to-team relationship with role. Fields: `team_id` (uuid), `user_id` (uuid), `role` (text: owner/admin/member). Source: `team_members` table. Used in: members settings section.
- **AppConnection**: Third-party app integration state. Fields: `id` (uuid), `user_id` (uuid), `team_id` (uuid), `app_name` (text), `app_logo_url` (text), `status` (text: connected/disconnected/error). Source: `app_connections` table. Used in: manage apps (to show connected state).
- **AppIntegration** (client-side only): Static app catalog entry. Fields: `id` (string), `name` (string), `logoUrl` (string), `category` (string), `authType` ("oauth" | "api_key" | "google"). Source: constant array in `src/lib/data/app-integrations.ts`. Used in: manage apps list rendering.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can complete the full signup flow (fill form, submit, land on `/dashboard`) within 3 seconds on a standard connection.
- **SC-002**: A returning user can complete the login flow (fill form, submit, land on `/dashboard`) within 2 seconds.
- **SC-003**: Google OAuth flow completes end-to-end (click button > Google consent > callback > `/dashboard`) without errors.
- **SC-004**: The landing page (`/`) redirects to the correct destination within one server roundtrip.
- **SC-005**: Settings dialog opens within 100ms of trigger click and renders all sidebar sections.
- **SC-006**: App integrations list displays all 105 apps in alphabetical order without layout jank or scroll stutter.
- **SC-007**: App search filters results in real-time (< 50ms per keystroke) for the full 105-app list.
- **SC-008**: All six settings sections (Account, Notifications, Manage apps, General, Members, Billing) render their respective content when selected.
- **SC-009**: `bun run build` completes with zero errors after all auth and settings files are created.
- **SC-010**: `bun run lint` passes with zero warnings on all new files.
- **SC-011**: Client-side form validation catches all invalid inputs before network requests are made.
- **SC-012**: All interactive elements (form inputs, buttons, dialog, sidebar nav) are keyboard-accessible.
