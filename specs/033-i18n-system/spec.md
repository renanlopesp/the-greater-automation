# Feature Specification: Internationalization (i18n) System

**Feature Branch**: `033-i18n-system`
**Created**: 2026-03-10
**Status**: Draft
**Input**: User description: "Internationalization system with cookie-based language storage, type-safe translations, and language switcher UI"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Hydration-Safe Language Provider (Priority: P1)

The system provides a language context that works correctly with server-side rendering. The user's language preference is stored in a cookie so that both server and client render the same language, eliminating hydration mismatches. On first visit, the system defaults to pt-BR. All existing `t()` calls continue to work without changes.

**Why this priority**: This is the foundation — without a working, hydration-safe language provider, no other i18n feature can function correctly. It also fixes the current broken state where language was hardcoded.

**Independent Test**: Can be tested by visiting any page and confirming that server-rendered HTML matches client-rendered HTML (no hydration warnings in console), and that all `t()` keys resolve to pt-BR text.

**Acceptance Scenarios**:

1. **Given** a first-time visitor with no language cookie, **When** they load any page, **Then** the page renders in pt-BR with no hydration mismatch warnings in the browser console.
2. **Given** a user with a `lang=en-US` cookie, **When** they load any page, **Then** the page renders in English with no hydration mismatch.
3. **Given** an existing component using `t("nav.home")`, **When** the language is pt-BR, **Then** it renders "Início"; **When** the language is en-US, **Then** it renders "Home".

---

### User Story 2 - Complete Translation Coverage (Priority: P2)

Every user-visible string in the application uses the `t()` translation function instead of hardcoded text. Both pt-BR and en-US have complete dictionaries covering all pages: navigation, dashboard, agents, history, apps, notifications, settings, auth, empty states, error messages, button labels, tooltips, and placeholders.

**Why this priority**: Without complete translation dictionaries, the language switcher would show a mix of translated and untranslated text, creating a broken experience.

**Independent Test**: Can be tested by switching to en-US and navigating through all pages — every visible string should be in English with no Portuguese fragments remaining.

**Acceptance Scenarios**:

1. **Given** the language is set to en-US, **When** a user navigates through dashboard, agents, history, apps, and notifications pages, **Then** all visible text is in English.
2. **Given** the language is set to pt-BR, **When** a user navigates through all pages, **Then** all visible text is in Portuguese with correct accents and diacritics.
3. **Given** a developer adds a new translation key, **When** the key is missing from one language dictionary, **Then** the system provides a compile-time warning (type safety).

---

### User Story 3 - Language Switcher UI (Priority: P3)

Users can change their language preference through a language selector in the user dropdown menu (top-bar). The selector shows the current language and allows switching between available languages. The change persists across sessions via cookie and the page updates immediately without a full browser reload.

**Why this priority**: This is the user-facing control that enables the feature. It depends on the provider (US1) and translations (US2) being complete first.

**Independent Test**: Can be tested by clicking the language option in the dropdown menu and verifying the entire page updates to the selected language.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** they open the user dropdown, **Then** they see a language option showing the current language (e.g., "Português" or "English").
2. **Given** the user clicks the language option, **When** they select a different language, **Then** all visible text on the page updates to the new language without a full page reload.
3. **Given** the user switches to en-US and closes the browser, **When** they return later, **Then** the app loads in English (preference persisted in cookie).

---

### Edge Cases

- What happens when a translation key is missing from the active language dictionary? The system falls back to the key name itself (e.g., `"nav.home"` displayed as-is) and logs a warning in development.
- What happens when the language cookie contains an unsupported value (e.g., `lang=fr-FR`)? The system falls back to pt-BR (the default language).
- What happens with dynamic content from the database (e.g., agent names, descriptions)? Database content is NOT translated — only UI chrome/labels are translated. Database content displays as stored.
- What happens during the initial server render before hydration? The server reads the cookie and renders the correct language, so there is no flash of wrong language.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store the user's language preference in a cookie accessible to both server and client rendering.
- **FR-002**: System MUST default to pt-BR when no language preference is set.
- **FR-003**: System MUST support exactly two languages initially: pt-BR and en-US.
- **FR-004**: System MUST provide a `t(key)` function that returns the translated string for the active language.
- **FR-005**: System MUST ensure the translation dictionary is type-safe — referencing a non-existent key produces a compile-time error.
- **FR-006**: System MUST render the same language on server and client (no hydration mismatch).
- **FR-007**: System MUST provide a language switcher in the user dropdown menu.
- **FR-008**: System MUST update all visible text when the language changes, without requiring a full page reload.
- **FR-009**: System MUST persist the language choice across browser sessions.
- **FR-010**: System MUST NOT translate database-sourced content (agent names, descriptions, workflow names). Only UI labels and static text are translated.
- **FR-011**: System MUST fall back to pt-BR if the cookie contains an unsupported language code.
- **FR-012**: System MUST include complete translations for all pages: navigation, dashboard, agents, history, apps, notifications, empty states, error messages, form labels, button labels, tooltips, and placeholders.

### Key Entities

- **Language Preference**: The user's chosen language (pt-BR or en-US), stored as a cookie value, readable by both server and client.
- **Translation Dictionary**: A structured key-value map for each supported language, organized by page/section namespace (e.g., `nav.*`, `dashboard.*`, `agents.*`). Must be complete for both languages.
- **Translation Key**: A dot-notation string identifier (e.g., `"nav.home"`, `"dashboard.greeting"`) that maps to a translated string in each language dictionary.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero hydration mismatch warnings in the browser console on any page, regardless of selected language.
- **SC-002**: 100% of user-visible UI strings (excluding database content) use the translation system — no hardcoded text in components.
- **SC-003**: Users can switch languages and see the full page update in under 1 second, without a browser reload.
- **SC-004**: Language preference persists across browser sessions — returning users see the app in their previously selected language.
- **SC-005**: Adding a new translation key to one language but not the other produces a compile-time type error, preventing incomplete translations from shipping.

## Assumptions

- Only two languages are needed initially (pt-BR and en-US). Adding more languages in the future should be straightforward but is not in scope.
- Database content (agent names, descriptions, store data, workflow names) is NOT translated. This feature covers UI chrome only.
- The existing `useLanguage()` hook API and `t(key)` pattern will be preserved — consumers don't need to change their calling convention.
- Cookie-based storage is sufficient; no user profile/database column is needed for language preference.
- The language switcher will be in the existing user dropdown menu, not a standalone component.

## Out of Scope

- Automatic language detection based on browser `Accept-Language` header (can be added later).
- Right-to-left (RTL) language support.
- Pluralization rules or interpolation with variables (simple key-value mapping is sufficient for current needs).
- Translation of database content or user-generated content.
- Translation management UI or integration with external translation services (e.g., Crowdin, Lokalise).
