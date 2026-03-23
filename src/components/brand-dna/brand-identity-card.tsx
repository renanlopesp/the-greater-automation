interface BrandIdentityCardProps {
  description: string
  onViewAssets?: () => void
}

export function BrandIdentityCard({ description, onViewAssets }: BrandIdentityCardProps) {
  return (
    <div className="mb-6">
      <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
        Identidade da marca
      </span>
      <p
        className="text-muted-foreground mb-4 text-[14px] leading-relaxed"
        style={{ lineHeight: 1.6 }}
      >
        {description}
      </p>
      {onViewAssets && (
        <button
          onClick={onViewAssets}
          className="text-primary text-[12px] font-medium transition-opacity hover:opacity-70"
        >
          ver assets →
        </button>
      )}
    </div>
  )
}
