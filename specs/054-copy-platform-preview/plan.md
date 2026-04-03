# Implementation Plan: Copy Platform Preview

**Branch**: `054-copy-platform-preview` | **Date**: 2026-04-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/054-copy-platform-preview/spec.md`

## Summary

Replace plain text cards in the campaign copies section with platform-specific visual mockups (WhatsApp chat bubbles, Instagram post preview, Meta Ad card, SMS message bubble). Purely UI change — no API or data model modifications.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: React 19, Tailwind CSS v4, shadcn/ui, lucide-react (icons)
**Storage**: N/A — no data changes
**Testing**: Visual verification via Playwright
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Mockups render instantly (<100ms), no additional network requests
**Constraints**: UI-only change, must not alter CampaignCopy data structure
**Scale/Scope**: 5 channel types, 1 component file modified

## Constitution Check

| Principle                      | Status | Notes                                                              |
| ------------------------------ | ------ | ------------------------------------------------------------------ |
| I. Next.js App Router First    | PASS   | No route changes. Component already client-side.                   |
| II. shadcn/ui Component System | PASS   | Using Tailwind classes. Mockups are custom styled divs.            |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind classes and CSS variables.                |
| IV. TypeScript Strict Mode     | PASS   | No type changes needed. CampaignCopy interface unchanged.          |
| V. Simplicity and YAGNI        | PASS   | Single component change. Mockups are simple HTML/CSS — no library. |
| VI. Supabase as Backend        | PASS   | No backend changes.                                                |

All gates pass.

## Project Structure

### Source Code (files to modify)

```text
src/
└── components/chat/artifacts/
    └── seasonal-calendar-artifact.tsx   # MODIFY: CopiesSection — replace plain cards with platform mockups
```

## Key Design Decisions

### 1. Channel Detection by String Matching

Match channel names using `includes()` for robustness:

- `channel.includes('WhatsApp')` → WhatsApp mockup
- `channel.includes('Instagram')` → Instagram mockup
- `channel.includes('Meta')` → Meta Ad mockup
- `channel.includes('SMS')` → SMS mockup
- Default → current plain card (fallback)

### 2. Platform Mockups as Inline Components

Each mockup is a simple function component returning styled HTML. No separate files — keep them in the CopiesSection function or as small helper functions in the same file. This follows YAGNI — one component, one file.

### 3. No External Dependencies

All mockup visuals use Tailwind classes + lucide-react icons (already in the project). No new packages needed. Platform icons (WhatsApp, Instagram, Meta) use simple SVG or lucide approximations.

### 4. Store Name from Campaign Data

The campaign `concept.slogan` or a generic "Sua Loja" is used for platform headers. No additional data fetching.
