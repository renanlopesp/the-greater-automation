/**
 * 6 inline SVG icons for Home feature cards.
 * Ported 1:1 from snew-ai-core SnewStudioHomePage.tsx lines 604-687.
 * Each icon is exactly 36x36, using literal colors from the original
 * design (pastel fills with outlined strokes + small green/solid check).
 *
 * Server Components — no interactivity needed.
 */

export function IconGerarImagem() {
  return (
    <svg width="36" height="36" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect
        x="8"
        y="10"
        width="28"
        height="22"
        rx="4"
        fill="#E8E4FF"
        stroke="#C4BBFF"
        strokeWidth="1.5"
      />
      <circle cx="14" cy="17" r="3" fill="#9B8FFF" />
      <path
        d="M8 27l7-6 5 5 4-3 8 7"
        stroke="#9B8FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="28" y="22" width="16" height="16" rx="4" fill="#4ADE80" opacity="0.9" />
      <path
        d="M32 30l3 3 5-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCriarVideo() {
  return (
    <svg width="36" height="36" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect
        x="6"
        y="13"
        width="28"
        height="22"
        rx="5"
        fill="#FFE4E1"
        stroke="#FFBDB5"
        strokeWidth="1.5"
      />
      <polygon points="16,19 16,31 27,25" fill="#FF6B5B" />
      <circle cx="38" cy="22" r="5" fill="#FF6B5B" opacity="0.85" />
      <path
        d="M35.5 22l2 2 3-3"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCarrossel() {
  return (
    <svg width="36" height="36" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect
        x="4"
        y="14"
        width="18"
        height="24"
        rx="4"
        fill="#FEF3C7"
        stroke="#FCD34D"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <rect
        x="17"
        y="11"
        width="18"
        height="28"
        rx="5"
        fill="#FEF3C7"
        stroke="#F59E0B"
        strokeWidth="1.5"
      />
      <rect
        x="30"
        y="14"
        width="18"
        height="24"
        rx="4"
        fill="#FEF3C7"
        stroke="#FCD34D"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <circle cx="26" cy="38" r="1.5" fill="#F59E0B" />
      <circle cx="31" cy="38" r="1.5" fill="#FCD34D" />
      <circle cx="21" cy="38" r="1.5" fill="#FCD34D" />
    </svg>
  )
}

export function IconEscreverCopy() {
  return (
    <svg width="36" height="36" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect
        x="8"
        y="8"
        width="26"
        height="34"
        rx="5"
        fill="#E0F2FE"
        stroke="#7DD3FC"
        strokeWidth="1.5"
      />
      <path
        d="M14 18h14M14 23h14M14 28h10"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="36" cy="34" r="9" fill="#0EA5E9" />
      <path
        d="M32 34l3 3 5-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCampanha() {
  return (
    <svg width="36" height="36" viewBox="0 0 52 52" fill="none" aria-hidden>
      <circle cx="26" cy="24" r="16" fill="#FCE7F3" stroke="#F9A8D4" strokeWidth="1.5" />
      <path
        d="M18 24l5 5 11-11"
        stroke="#EC4899"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="12" r="7" fill="#FDE68A" stroke="#FCD34D" strokeWidth="1.5" />
      <path
        d="M35.5 12l2 2 3-3"
        stroke="#92400E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconRelatorio() {
  return (
    <svg width="36" height="36" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect
        x="8"
        y="6"
        width="28"
        height="36"
        rx="5"
        fill="#F0FDF4"
        stroke="#86EFAC"
        strokeWidth="1.5"
      />
      <rect x="14" y="26" width="4" height="10" rx="2" fill="#4ADE80" />
      <rect x="21" y="20" width="4" height="16" rx="2" fill="#22C55E" />
      <rect x="28" y="15" width="4" height="21" rx="2" fill="#16A34A" />
      <circle cx="38" cy="14" r="8" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5" />
      <path
        d="M35 14l2 2 4-4"
        stroke="#16A34A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
