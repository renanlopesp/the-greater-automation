'use client'

import { Image as ImageIcon, Type, FileText, X } from 'lucide-react'
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProductImages } from '@/hooks/use-product-images'

interface BrandFont {
  name: string
  usage: string
  category: string
}

interface BrandText {
  type: string
  label: string
  content: string
}

interface ColorSwatch {
  hex: string
  label: string
}

interface AssetsDrawerProps {
  open: boolean
  onClose: () => void
  storeName: string
  colorPalette?: ColorSwatch[]
  fonts?: BrandFont[]
  brandTexts?: BrandText[]
}

const FALLBACK_FONTS: BrandFont[] = [
  { name: 'System Default', usage: 'Titulos e headings', category: 'sans-serif' },
  { name: 'System Default', usage: 'Corpo e UI', category: 'sans-serif' },
]

const FALLBACK_SWATCHES: ColorSwatch[] = [
  { hex: '#F4E8D0', label: 'Vanilla' },
  { hex: '#E8D5C0', label: 'Nude' },
  { hex: '#D4B896', label: 'Caramelo' },
  { hex: '#F5F0EB', label: 'Off-white' },
  { hex: '#C9A87C', label: 'Dourado suave' },
]

export function AssetsDrawer({
  open,
  onClose,
  storeName,
  colorPalette = [],
  fonts = [],
  brandTexts = [],
}: AssetsDrawerProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <SheetContent side="right" showCloseButton={false} className="w-[360px] p-0 sm:max-w-[360px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <span className="text-foreground block text-[14px] font-semibold">
              Assets da {storeName}
            </span>
            <span className="text-muted-foreground text-[12px]">Extraidos do site e Instagram</span>
          </div>
          <SheetClose asChild>
            <button
              onClick={onClose}
              className="text-muted-foreground transition-opacity hover:opacity-70"
            >
              <X size={16} />
              <span className="sr-only">Fechar</span>
            </button>
          </SheetClose>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="imagens" className="flex h-[calc(100%-72px)] flex-col">
          <TabsList variant="line" className="w-full justify-start gap-4 border-b px-5">
            <TabsTrigger value="imagens" className="px-0 text-[13px]">
              <ImageIcon size={14} />
              Imagens
            </TabsTrigger>
            <TabsTrigger value="fontes" className="px-0 text-[13px]">
              <Type size={14} />
              Fontes
            </TabsTrigger>
            <TabsTrigger value="textos" className="px-0 text-[13px]">
              <FileText size={14} />
              Textos
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="imagens" className="mt-0 p-5">
              <ImagensTab />
            </TabsContent>
            <TabsContent value="fontes" className="mt-0 p-5">
              <FontesTab fonts={fonts} colorPalette={colorPalette} />
            </TabsContent>
            <TabsContent value="textos" className="mt-0 p-5">
              <TextosTab brandTexts={brandTexts} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// ─── Imagens Tab ──────────────────────────────────────────────────────────────

function ImagensTab() {
  const { images, isLoading } = useProductImages()

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="bg-muted aspect-square animate-pulse rounded-lg" />
            <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
            <div className="bg-muted h-2.5 w-1/2 animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <ImageIcon size={32} className="text-muted-foreground opacity-40" />
        <p className="text-muted-foreground text-[13px]">Nenhuma imagem de produto encontrada.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((img) => (
        <div key={img.name} className="flex flex-col gap-1.5">
          <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.productName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <span className="text-muted-foreground truncate text-[11px]">{img.name}</span>
          <span className="text-muted-foreground text-[10px] opacity-60">{img.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Fontes Tab ───────────────────────────────────────────────────────────────

function FontesTab({ fonts, colorPalette }: { fonts: BrandFont[]; colorPalette: ColorSwatch[] }) {
  const displayFonts = fonts.length > 0 ? fonts : FALLBACK_FONTS
  const displayPalette = colorPalette.length > 0 ? colorPalette : FALLBACK_SWATCHES

  return (
    <div className="flex flex-col gap-4">
      {displayFonts.map((font) => (
        <div key={`${font.name}-${font.usage}`} className="rounded-xl border p-4">
          <p className="text-foreground mb-1 text-[18px] font-medium">Aa Bb Cc</p>
          <p className="text-foreground text-[13px] font-semibold">{font.name}</p>
          <p className="text-muted-foreground text-[12px]">{font.usage}</p>
        </div>
      ))}

      <div className="rounded-xl border p-4">
        <p className="text-foreground mb-3 text-[13px] font-semibold">Paleta de cores</p>
        <div className="flex gap-2">
          {displayPalette.map((s) => (
            <div
              key={s.hex}
              title={`${s.label} · ${s.hex}`}
              className="h-8 w-8 flex-shrink-0 rounded-lg"
              style={{
                background: s.hex,
                border: '1px solid var(--border)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Textos Tab ───────────────────────────────────────────────────────────────

function TextosTab({ brandTexts }: { brandTexts: BrandText[] }) {
  if (brandTexts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <FileText size={32} className="text-muted-foreground opacity-40" />
        <p className="text-muted-foreground text-[13px]">Textos de marca ainda nao disponíveis.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {brandTexts.map((text, i) => (
        <div key={`${text.type}-${i}`} className="rounded-xl border p-4">
          <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
            {text.label}
          </p>
          <p className="text-foreground text-[13px] leading-relaxed">{text.content}</p>
        </div>
      ))}
    </div>
  )
}
