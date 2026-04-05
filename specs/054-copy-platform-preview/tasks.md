# Tasks: Copy Platform Preview

**Input**: Design documents from `/specs/054-copy-platform-preview/`
**Organization**: Single-file UI change. All work in `seasonal-calendar-artifact.tsx`.

---

## Phase 1: Setup

- [ ] T001 Read current CopiesSection component and understand the channel/timing/text data structure in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx`

---

## Phase 2: Foundational — Channel Detection

- [ ] T002 Create channel detection helper function that maps channel name to platform type (whatsapp, instagram, meta, sms, unknown) using string matching in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx`

---

## Phase 3: User Story 1 — WhatsApp Preview (P1)

- [ ] T003 [US1] Create WhatsApp mockup renderer in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — green chat bubble (#dcf8c6), rounded corners, timestamp, double checkmarks, store name header with WhatsApp green accent

---

## Phase 4: User Story 2 — Instagram + Meta Ad Preview (P2)

- [ ] T004 [P] [US2] Create Instagram Caption mockup renderer in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — post header (avatar + store name), image placeholder, action icons (heart, comment, share, bookmark), caption with colored hashtags
- [ ] T005 [P] [US3] Create Meta Ad mockup renderer in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — ad card with store name + "Patrocinado" sublabel, ad text, gray CTA bar with "Saiba Mais" button

---

## Phase 5: User Story 4 — SMS Preview (P3)

- [ ] T006 [US4] Create SMS mockup renderer in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — gray bubble (#e5e5ea), left-aligned, phone-style timestamp

---

## Phase 6: Integration

- [ ] T007 Update CopiesSection to route each copy to the correct mockup renderer based on channel detection, with fallback to current plain card for unknown channels in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx`

---

## Phase 7: Polish

- [ ] T008 Run `bun run build` to verify zero errors
- [ ] T009 Visual verification via Playwright — navigate to copies section, verify all 5 channel types render with platform mockups

---

## Dependencies

- T002 depends on T001
- T003-T006 can run in parallel after T002
- T007 depends on T003-T006
- T008-T009 depend on T007

## Notes

- Total: 9 tasks, single file modified
- All mockups use Tailwind classes + lucide-react icons — no new dependencies
