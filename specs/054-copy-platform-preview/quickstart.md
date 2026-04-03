# Quickstart: Copy Platform Preview

## Prerequisites

- `bun dev` running
- A campaign with generated copies (Copies section showing "Gerado")

## Testing the Feature

### 1. Navigate to Copies

1. Open the seasonal calendar
2. Click on a campaign with generated copies (e.g., Black Friday)
3. Click the "Copies" section

### 2. Verify WhatsApp Mockups

1. "WhatsApp VIP" and "WhatsApp Geral" copies should render as green chat bubbles
2. Each bubble should have: store name header, message text, timestamp, checkmarks
3. Click "Copiar" — only the message text should be in clipboard

### 3. Verify Instagram Caption Mockup

1. "Instagram Caption" copy should render as an Instagram post preview
2. Should show: profile header, image placeholder, action icons, caption text
3. Hashtags should appear in accent color

### 4. Verify Meta Ad Mockup

1. "Meta Ad" copy should render as an ad card
2. Should show: profile header with "Patrocinado" label, ad text, CTA button

### 5. Verify SMS Mockup

1. "SMS" copy should render as a gray message bubble
2. Simple phone-style layout

### 6. Verify Fallback

1. If a copy has an unrecognized channel name, it should render as a plain card (current style)

### 7. Verify Responsive

1. Resize window to mobile width — mockups should still be readable

## Key File

| File                                                           | Role                    |
| -------------------------------------------------------------- | ----------------------- |
| `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` | CopiesSection component |
