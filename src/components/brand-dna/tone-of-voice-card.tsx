interface ToneOfVoiceCardProps {
  description: string
  wordsToUse: string[]
  wordsToAvoid: string[]
}

export function ToneOfVoiceCard({ description, wordsToUse, wordsToAvoid }: ToneOfVoiceCardProps) {
  return (
    <div className="mb-6">
      <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
        Tom de voz
      </span>
      <p
        className="text-muted-foreground mb-3 text-[14px] leading-relaxed"
        style={{ lineHeight: 1.6 }}
      >
        {description}
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-[12px] font-medium">Usar:</span>
          {wordsToUse.map((w) => (
            <span
              key={w}
              className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700"
            >
              {w}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-[12px] font-medium">Evitar:</span>
          {wordsToAvoid.map((w) => (
            <span
              key={w}
              className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
