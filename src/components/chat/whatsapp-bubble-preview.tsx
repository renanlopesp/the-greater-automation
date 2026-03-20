import { Smartphone } from 'lucide-react'

interface WhatsAppBubblePreviewProps {
  header?: string
  body: string
  footer?: string
  cta?: string
}

export function WhatsAppBubblePreview({ header, body, footer, cta }: WhatsAppBubblePreviewProps) {
  return (
    <div className="border-border bg-muted/20 mx-auto w-full max-w-[260px] overflow-hidden rounded-[24px] border shadow-sm">
      {/* Green header bar */}
      <div className="flex items-center gap-2 bg-[#075e54] px-3 pt-2.5 pb-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Smartphone className="h-3 w-3 text-white/80" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] leading-tight font-medium text-white">Loja Online</p>
          <p className="text-[9px] leading-tight text-white/60">via WhatsApp Business</p>
        </div>
      </div>

      {/* Chat background */}
      <div className="min-h-[120px] bg-[#ece5dd] px-2.5 py-3">
        {/* White message bubble */}
        <div className="max-w-[92%] rounded-[10px] rounded-tl-[3px] bg-white px-2.5 py-2 shadow-sm">
          {header && (
            <p className="mb-0.5 text-[10px] leading-snug font-semibold text-[#1a1a1a]">{header}</p>
          )}
          <p className="text-[11px] leading-relaxed whitespace-pre-line text-[#1a1a1a]">{body}</p>
          {footer && <p className="mt-1 text-[9px] leading-snug text-[#888]">{footer}</p>}
          {/* Timestamp + checkmarks */}
          <p className="mt-1 text-right text-[9px] text-[#999]">11:42 ✓✓</p>
        </div>

        {/* Optional CTA button */}
        {cta && (
          <div className="mt-1.5 max-w-[92%] rounded-[10px] bg-white px-2.5 py-1.5 shadow-sm">
            <p className="text-center text-[11px] font-medium text-[#075e54]">{cta}</p>
          </div>
        )}
      </div>
    </div>
  )
}
