'use client'
// Ported verbatim from snew-ai-core prototype (spec 066); `any` usage is
// inherited and scheduled for cleanup in a dedicated refactor pass.
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
// RULE: Never use fontWeight 700 or "bold" for UI text elements (labels, buttons, headings, descriptions).
// Use 600 (semi-bold) for headings and important labels. Use 500 for secondary labels. Use 400 for body text.
// Exception: canvas text elements controlled by the user (textbox, copy) may use any weight.
import { createPortal } from 'react-dom'
import {
  X,
  Save,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  RotateCcw,
  ChevronRight as ChevronRightSmall,
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Layers,
  Sparkles,
  ScanLine,
  RefreshCw,
  Square,
  Trash2,
  Package,
  ArrowRight,
  Heart,
  Zap,
  Smile,
  Timer,
  Star,
  Tag,
  Crown,
  HelpCircle,
  Users,
  Image as ImageIcon,
  Plus,
  LayoutGrid,
  MessageSquare,
  Type,
  Palette,
  List,
  Pencil,
  Search,
  Code,
  Copy,
  Edit2,
  Video,
  Play,
  Camera,
  Pen,
  Box,
  Layout,
  Move,
  Maximize2,
  Share2,
  Calendar as CalendarIcon,
  Upload,
  ChevronsLeft,
} from 'lucide-react'
// mp4-muxer removed — video export uses MediaRecorder (WebM) for maximum compatibility
import { saveScheduledPosts, loadScheduledPosts, type ScheduledPost } from '@/lib/studio-calendar'
import { useProductCatalog } from '@/hooks/useProductCatalog'
import { StudioChatPanel, type StudioChatPanelRef } from './StudioChatPanel'
import { ImageUploadPanel } from './ImageUploadPanel'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { studioSupabase as supabase } from '@/lib/supabase/studio-client'
import { uploadDataUrlToStorage } from '@/lib/studio/upload-data-url'
import { useStudioSession } from '@/lib/studio/session-context'
import html2canvas from 'html2canvas'
import { seasonalCalendar } from '@/data/seasonalCalendar'
import { seasonalL3Content } from '@/data/seasonalL3Content'
import { loadImageStyles, type ImageStyleOption } from '@/config/imageStyles'
import { useFloatWindow } from '@/hooks/useFloatWindow'
import { FloatWindowHeader } from './FloatWindowHeader'
import {
  loadStoreContext,
  loadBrandReferencesBase64,
  type StoreContext,
} from '@/lib/studio/store-context'
import { buildKBInline, buildBrandContextBody } from '@/config/storeContext'
import { getHistoryKey } from '@/lib/historyKey'

// RULE: Never use emoji characters anywhere in this file. Use lucide-react icons or unicode symbols (✦ ✓ ↻ ▣ ◈) only.

const GLOBAL_NEGATIVE_PROMPT = [
  // ← PRIORIDADE MÁXIMA: sem texto na imagem
  'text in image',
  'letters',
  'words',
  'typography',
  'font overlay',
  'text overlay',
  'graphic text',
  'magazine text',
  'editorial text',
  'vertical text',
  'diagonal text',
  'headline text',
  'title text',
  'watermark',
  'logo',
  'signature',
  'branding overlay',
  'caption',
  'subtitle',
  'label text',
  'price tag text',
  // Materiais proibidos
  'chrome',
  'metallic sheen',
  'polished metal',
  'steel surface',
  'marble',
  'polished stone',
  'glossy surface',
  'shiny surface',
  'specular highlight',
  'lens flare',
  'glowing edges',
  'neon glow',
  'glass reflection',
  'mirror reflection',
  'iridescent',
  'holographic',
  'gold foil',
  'glitter',
  'sparkle',
  // Estética proibida
  'oversaturated',
  'neon colors',
  'vibrant pop colors',
  'hyper vivid',
  'HDR glow',
  'bloom effect',
  'heavy vignette',
  'stock photo smile',
  'stock photography pose',
  'generic stock look',
  'corporate stock image',
  'overly perfect lighting',
  // Técnico
  'illustration',
  'watercolor',
  'painting',
  'cartoon',
  'digital art',
  '3d render',
  'CGI',
  'vector art',
].join(', ')

const GLOBAL_STYLE_BASE = [
  'Editorial photography with personality and character.',
  'Natural organic materials — raw wood, unpolished stone, dried botanicals, linen, terracotta.',
  'Muted earthy color palette: warm sand, sage green, clay, linen white, warm stone.',
  'Low saturation, film-like color grade.',
  'Soft directional natural light — gentle shadows, not harsh or rigid.',
  'Slight film grain texture. Authentic imperfection.',
  'No stock photo aesthetic. No corporate polish. No perfect symmetry.',
  'Photorealistic, magazine editorial quality.',
].join(' ')

const IMAGE_MODELS = [
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    badge: 'Recomendado',
    time: '~15s',
    description: 'Melhor para referências visuais — padrão',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    badge: 'Premium',
    time: '~30s',
    description: 'Máxima qualidade e fidelidade',
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    badge: null,
    time: '~10s',
    description: 'Rápido, boa qualidade',
  },
]

/* ── Visual DNA ── */
const VISUAL_DNA_KEY = 'snew:visual-dna'

interface VisualDNARef {
  id: string
  category: string
  imageUrl: string
  imageBase64: string
  label: string
  isActive: boolean
  weight: number
}

const DNA_SYSTEM_INSTRUCTION = `The first images provided are visual style references from our brand DNA library.
Use them to guide: composition style, lighting quality, color palette, emotional tone, and overall aesthetic.
Do NOT copy these images — use them only as visual direction.
The final image must match this visual standard while featuring the requested subject.`

const loadVisualDNA = (): VisualDNARef[] => {
  try {
    const raw = localStorage.getItem(VISUAL_DNA_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const buildDNAParts = (): string[] => {
  // Visual DNA desabilitado — estava causando alucinações com produtos de sessões anteriores
  return []
}

const ASPECT_RATIOS = [
  {
    id: '9:16',
    label: '9:16',
    sublabel: 'Social story',
    width: 1080,
    height: 1920,
    supportsCarousel: true,
  },
  {
    id: '1:1',
    label: '1:1',
    sublabel: 'Square',
    width: 1080,
    height: 1080,
    supportsCarousel: true,
  },
  {
    id: '4:5',
    label: '4:5',
    sublabel: 'Social post',
    width: 1080,
    height: 1350,
    supportsCarousel: true,
  },
  {
    id: '16:9',
    label: '16:9',
    sublabel: 'Widescreen',
    width: 1920,
    height: 1080,
    supportsCarousel: false,
  },
  {
    id: '2:3',
    label: '2:3',
    sublabel: 'Portrait',
    width: 1080,
    height: 1620,
    supportsCarousel: true,
  },
  {
    id: '3:4',
    label: '3:4',
    sublabel: 'Traditional',
    width: 1080,
    height: 1440,
    supportsCarousel: true,
  },
  {
    id: '1:2',
    label: '1:2',
    sublabel: 'Vertical',
    width: 1080,
    height: 2160,
    supportsCarousel: true,
  },
  {
    id: '2:1',
    label: '2:1',
    sublabel: 'Horizontal',
    width: 2160,
    height: 1080,
    supportsCarousel: false,
  },
  {
    id: '3:2',
    label: '3:2',
    sublabel: 'Standard',
    width: 1620,
    height: 1080,
    supportsCarousel: true,
  },
  {
    id: '4:3',
    label: '4:3',
    sublabel: 'Classic',
    width: 1440,
    height: 1080,
    supportsCarousel: true,
  },
]

const AspectRatioIcon = ({ ratio }: { ratio: string }) => {
  const dims: Record<string, { w: number; h: number }> = {
    '9:16': { w: 9, h: 16 },
    '1:1': { w: 14, h: 14 },
    '4:5': { w: 11, h: 14 },
    '16:9': { w: 16, h: 9 },
    '2:3': { w: 10, h: 15 },
    '3:4': { w: 11, h: 15 },
    '1:2': { w: 8, h: 16 },
    '2:1': { w: 16, h: 8 },
    '3:2': { w: 15, h: 10 },
    '4:3': { w: 15, h: 11 },
  }
  const d = dims[ratio] ?? { w: 14, h: 14 }
  const scale = 16 / Math.max(d.w, d.h)
  return (
    <div
      style={{
        width: 18,
        height: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: Math.round(d.w * scale),
          height: Math.round(d.h * scale),
          border: '1.5px solid currentColor',
          borderRadius: 2,
          opacity: 0.7,
        }}
      />
    </div>
  )
}

import { STUDIO_PRODUCT_SEEDS } from '@/config/studioProducts'

const DEMO_PRODUCTS = STUDIO_PRODUCT_SEEDS.map((product) => ({
  id: product.product_id,
  name: product.name,
  sku: product.sku,
  image: product.image,
}))

import {
  FontCategorySelector,
  ALL_FONTS,
  getFontFamilyById,
  type FontOption,
} from './FontCategorySelector'

const FONT_OPTIONS = ALL_FONTS

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Monsieur+La+Doulaise&family=Kapakana&family=Pinyon+Script&family=Lexend:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Onest:wght@300;400;500;600;700&family=Dongle:wght@300;400;700&family=Gochi+Hand&family=Meow+Script&family=Pangolin&family=Scope+One&family=Playfair+Display+SC:wght@400;700&family=Playfair+Display:wght@400;500;700&family=DM+Serif+Display&family=Fraunces:wght@300;400;700&family=Cormorant+Garamond:wght@300;400;600&family=Lora:wght@400;500;700&family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;700&family=Raleway:wght@300;400;500;700&family=Bebas+Neue&family=Oswald:wght@300;400;500;700&family=Anton&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&display=swap'

const OVERLAY_PRESETS = [
  {
    id: 'none',
    label: 'Sem overlay',
    type: 'solid' as const,
    color: '#000000',
    opacity: 0,
    position: 'bottom' as const,
    preview: 'transparent',
  },
  {
    id: 'subtle',
    label: 'Sutil',
    type: 'gradient' as const,
    color: '#000000',
    opacity: 0.35,
    position: 'bottom' as const,
    preview: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
  },
  {
    id: 'medium',
    label: 'Médio',
    type: 'gradient' as const,
    color: '#000000',
    opacity: 0.6,
    position: 'bottom' as const,
    preview: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
  },
  {
    id: 'strong',
    label: 'Forte',
    type: 'solid' as const,
    color: '#000000',
    opacity: 0.65,
    position: 'full' as const,
    preview: 'rgba(0,0,0,0.65)',
  },
  {
    id: 'warm',
    label: 'Quente',
    type: 'gradient' as const,
    color: '#3D1A00',
    opacity: 0.6,
    position: 'bottom' as const,
    preview: 'linear-gradient(to top, rgba(61,26,0,0.6), transparent)',
  },
]

/* ── Art Styles ── */
interface ArtStyle {
  id: string
  name: string
  description: string
  preview: string
  category?: 'photo' | 'illustration' | '3d' | 'design'
  isBrandDna?: boolean
  font: string
  textCase: 'normal' | 'uppercase' | 'capitalize'
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800' | '900'
  textColor: string
  ctaColor: string
  ctaTextColor: string
  ctaRadius: string
  overlayType: 'gradient' | 'solid'
  overlayColor: string
  overlayOpacity: number
  overlayPosition: 'bottom' | 'top' | 'full'
  textHAlign: 'left' | 'center' | 'right'
  textVAlign: 'bottom' | 'center' | 'top'
  letterSpacing: string
  imageStyle: string
  headingSize: 'sm' | 'md' | 'lg' | 'xl'
  enableAttributes?: boolean
  enablePrice?: boolean
  thumbnailUrl?: string
}

interface ProductAttribute {
  id: string
  icon: string
  label: string
}

const HEADING_SIZE_MAP: Record<string, number> = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
}

const ART_STYLES: ArtStyle[] = [
  {
    id: 'brand-dna',
    name: 'Brand DNA',
    description: 'Consistência de marca em todo criativo',
    category: 'photo',
    preview: 'linear-gradient(135deg, #1A1A1A, #333333)',
    isBrandDna: true,
    font: 'playfair',
    textCase: 'normal',
    fontWeight: '500',
    textColor: '#FFFFFF',
    ctaColor: '#D4A064',
    ctaTextColor: '#FFFFFF',
    ctaRadius: '8px',
    overlayType: 'gradient',
    overlayColor: '#000000',
    overlayOpacity: 0.45,
    overlayPosition: 'bottom',
    textHAlign: 'left',
    textVAlign: 'bottom',
    letterSpacing: '0em',
    imageStyle: 'lifestyle product photography, brand aesthetic',
    headingSize: 'lg',
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Alto ticket médio, produto como herói',
    category: 'photo',
    preview: 'linear-gradient(135deg, #F5F0E8, #E8E0D0)',
    font: 'cormorant',
    textCase: 'normal',
    fontWeight: '400',
    textColor: '#FFFFFF',
    ctaColor: 'transparent',
    ctaTextColor: '#FFFFFF',
    ctaRadius: '0px',
    overlayType: 'gradient',
    overlayColor: '#1A1008',
    overlayOpacity: 0.3,
    overlayPosition: 'bottom',
    textHAlign: 'left',
    textVAlign: 'bottom',
    letterSpacing: '0.01em',
    imageStyle: 'minimalist product photography, negative space, soft neutral background',
    headingSize: 'xl',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Para de rolar. Atenção imediata no feed',
    category: 'illustration',
    preview: 'linear-gradient(135deg, #1A1A1A, #333)',
    font: 'bebas',
    textCase: 'uppercase',
    fontWeight: '600',
    textColor: '#FFFFFF',
    ctaColor: '#FFFFFF',
    ctaTextColor: '#1A1A1A',
    ctaRadius: '4px',
    overlayType: 'solid',
    overlayColor: '#000000',
    overlayOpacity: 0.5,
    overlayPosition: 'full',
    textHAlign: 'center',
    textVAlign: 'center',
    letterSpacing: '0.04em',
    imageStyle: 'dramatic product photography, high contrast, dark moody background',
    headingSize: 'xl',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'UGC feel. Prova social que converte',
    category: 'illustration',
    preview: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
    font: 'fraunces',
    textCase: 'normal',
    fontWeight: '500',
    textColor: '#FFFFFF',
    ctaColor: '#FF6B35',
    ctaTextColor: '#FFFFFF',
    ctaRadius: '999px',
    overlayType: 'gradient',
    overlayColor: '#2D1A00',
    overlayOpacity: 0.45,
    overlayPosition: 'bottom',
    textHAlign: 'left',
    textVAlign: 'bottom',
    letterSpacing: '0em',
    imageStyle: 'casual lifestyle photography, natural light, warm tones',
    headingSize: 'lg',
  },
  {
    id: 'modern',
    name: 'Moderno',
    description: 'Lançamento, tech e produto novo',
    category: '3d',
    preview: 'linear-gradient(135deg, #0F0F23, #1A1A3E)',
    font: 'space-grotesk',
    textCase: 'normal',
    fontWeight: '500',
    textColor: '#FFFFFF',
    ctaColor: '#6366F1',
    ctaTextColor: '#FFFFFF',
    ctaRadius: '8px',
    overlayType: 'gradient',
    overlayColor: '#050518',
    overlayOpacity: 0.6,
    overlayPosition: 'full',
    textHAlign: 'left',
    textVAlign: 'center',
    letterSpacing: '-0.01em',
    imageStyle: 'modern clean product photography, geometric composition, cool tones',
    headingSize: 'lg',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Aspiracional. Eleva o valor percebido',
    category: 'photo',
    preview: 'linear-gradient(135deg, #F0EDE8, #D4C9B8)',
    font: 'dm-serif',
    textCase: 'normal',
    fontWeight: '400',
    textColor: '#FFFFFF',
    ctaColor: 'rgba(255,255,255,0.15)',
    ctaTextColor: '#FFFFFF',
    ctaRadius: '0px',
    overlayType: 'gradient',
    overlayColor: '#0A0806',
    overlayOpacity: 0.55,
    overlayPosition: 'bottom',
    textHAlign: 'center',
    textVAlign: 'bottom',
    letterSpacing: '0.08em',
    imageStyle: 'editorial fashion photography, high-end magazine style',
    headingSize: 'xl',
  },
  {
    id: 'urgency',
    name: 'Urgência',
    description: 'Escassez, prazo e oferta relâmpago',
    category: 'design',
    preview: 'linear-gradient(135deg, #DC2626, #991B1B)',
    font: 'inter',
    textCase: 'uppercase',
    fontWeight: '600',
    textColor: '#FFFFFF',
    ctaColor: '#FACC15',
    ctaTextColor: '#1A1A1A',
    ctaRadius: '6px',
    overlayType: 'solid',
    overlayColor: '#1A0000',
    overlayOpacity: 0.65,
    overlayPosition: 'full',
    textHAlign: 'center',
    textVAlign: 'center',
    letterSpacing: '0.03em',
    imageStyle: 'product photography with urgency, vivid colors, promotional style',
    headingSize: 'lg',
    enablePrice: true,
  },
  {
    id: 'warm',
    name: 'Quente',
    description: 'Presente, datas especiais, apelo emocional',
    category: 'photo',
    preview: 'linear-gradient(135deg, #7C2D12, #C2410C)',
    font: 'playfair',
    textCase: 'normal',
    fontWeight: '500',
    textColor: '#FFF8F0',
    ctaColor: '#D4A064',
    ctaTextColor: '#FFFFFF',
    ctaRadius: '999px',
    overlayType: 'gradient',
    overlayColor: '#3D1500',
    overlayOpacity: 0.55,
    overlayPosition: 'bottom',
    textHAlign: 'center',
    textVAlign: 'bottom',
    letterSpacing: '0.01em',
    imageStyle: 'warm cozy lifestyle photography, golden hour light, warm amber tones',
    headingSize: 'lg',
  },
  {
    id: 'dark-luxury',
    name: 'Dark Luxury',
    description: 'Premium. Justifica preço alto sem desconto',
    category: 'design',
    preview: 'linear-gradient(135deg, #0A0A0A, #1C1408)',
    font: 'cormorant',
    textCase: 'normal',
    fontWeight: '300',
    textColor: '#D4A064',
    ctaColor: '#D4A064',
    ctaTextColor: '#0A0A0A',
    ctaRadius: '0px',
    overlayType: 'solid',
    overlayColor: '#050505',
    overlayOpacity: 0.7,
    overlayPosition: 'full',
    textHAlign: 'left',
    textVAlign: 'center',
    letterSpacing: '0.12em',
    imageStyle: 'dark luxury product photography, black background, gold accents',
    headingSize: 'xl',
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Atributos + foto. Informa e converte',
    category: 'photo',
    preview: 'linear-gradient(135deg, #0A0A0A, #1A1A2E)',
    font: 'inter',
    textCase: 'normal',
    fontWeight: '600',
    textColor: '#FFFFFF',
    ctaColor: '#FFFFFF',
    ctaTextColor: '#1A1A1A',
    ctaRadius: '6px',
    overlayType: 'solid',
    overlayColor: '#0A0A0A',
    overlayOpacity: 0.55,
    overlayPosition: 'full',
    textHAlign: 'right',
    textVAlign: 'bottom',
    letterSpacing: '0em',
    imageStyle:
      'person using product confidently, clean lifestyle photography, natural light, side space for text overlay',
    headingSize: 'lg',
    enableAttributes: true,
  },
]

const getFontFamily = (id: string) => getFontFamilyById(id)

/* ── Color Picker Dropdown ── */
function ColorPickerDropdown({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (color: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => inputRef.current?.click()}
        title={`Cor do ${label}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 30,
          padding: '0 10px 0 6px',
          borderRadius: 8,
          border: '1.5px solid #E2E2E2',
          background: '#FFFFFF',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#999')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E2E2')}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: value,
            flexShrink: 0,
            border: '1px solid rgba(0,0,0,0.12)',
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.03em' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#AAA',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
          }}
        >
          {value.toUpperCase()}
        </span>
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          padding: 0,
          border: 'none',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

/* ── TextSectionModal — inline mini modal for text editing with AI ── */
function TextSectionModal({
  role,
  fieldKey,
  value,
  onChange,
  onClose,
  campaignContext,
}: {
  role: string
  fieldKey: 'heading' | 'description' | 'cta'
  value: string
  onChange: (v: string) => void
  onClose: () => void
  campaignContext: { title: string; product: string; brandContext?: any }
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isGenerating, setIsGenerating] = useState(false)
  const [toneOpen, setToneOpen] = useState(false)

  const handleGenerate = async (toneId: string) => {
    setIsGenerating(true)
    setToneOpen(false)
    try {
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          action: 'regenerate',
          field: fieldKey,
          currentValue: localValue,
          tone: toneId,
          campaign: campaignContext,
        },
      })
      if (error) throw error
      if (data?.text) setLocalValue(data.text)
    } catch (err) {
      console.error('Generate error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="float-text-modal" onClick={(e) => e.stopPropagation()}>
      <div className="float-text-modal-input-row">
        <textarea
          className="float-text-modal-textarea"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          rows={fieldKey === 'description' ? 3 : 2}
          autoFocus
        />
        <div className="float-sparkle-wrapper">
          <button
            className="float-sparkle-btn"
            onClick={() => setToneOpen((v) => !v)}
            disabled={isGenerating}
            title="Gerar com IA"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          </button>
          {toneOpen && (
            <div className="float-sparkle-dropdown">
              {[
                { id: 'emocional', emoji: '♡', label: 'Emocional' },
                { id: 'urgencia', emoji: '⚡', label: 'Urgente' },
                { id: 'humoristico', emoji: '◡', label: 'Divertido' },
                { id: 'aspiracional', emoji: '✦', label: 'Elegante' },
                { id: 'direto', emoji: '→', label: 'Direto' },
              ].map((t) => (
                <button
                  key={t.id}
                  className="float-sparkle-tone"
                  onClick={() => handleGenerate(t.id)}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="float-text-modal-actions">
        <button className="float-text-modal-cancel" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="float-text-modal-apply"
          onClick={() => {
            onChange(localValue)
            onClose()
          }}
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}

/* ── ImageGenItem — clickable row with optional thumbnail ── */
const ImageGenItem = ({
  label,
  value,
  thumbUrl,
  active,
  onClick,
}: {
  label: string
  value: string
  thumbUrl?: string
  active: boolean
  onClick: () => void
}) => (
  <button className={`ig-item-row ${active ? 'active' : ''}`} onClick={onClick}>
    {thumbUrl && (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 7,
          overflow: 'hidden',
          flexShrink: 0,
          border: '1.5px solid rgba(255,255,255,0.15)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        <img
          src={thumbUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )}
    <div className="ig-item-text">
      <span className="ig-item-label">{label}</span>
      <span className="ig-item-value">{value}</span>
    </div>
    <ChevronRight size={14} className="ig-item-chevron" />
  </button>
)

/* ── ContentItem — row with eye toggle for canvas visibility ── */
const ContentItem = ({
  label,
  value,
  active,
  visible,
  disabled = false,
  onToggleVisible,
  onClick,
}: {
  label: string
  value: string
  active: boolean
  visible: boolean
  disabled?: boolean
  onToggleVisible: () => void
  onClick: () => void
}) => (
  <div className={`ig-content-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}>
    <button
      className={`ig-eye-btn ${visible && !disabled ? 'on' : 'off'}`}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onToggleVisible()
      }}
      disabled={disabled}
      title={visible ? 'Ocultar no canvas' : 'Mostrar no canvas'}
    >
      {visible && !disabled ? <Eye size={13} /> : <EyeOff size={13} />}
    </button>
    <button className="ig-content-main" onClick={onClick} disabled={disabled}>
      <div className="ig-item-content">
        <span className="ig-item-label">{label}</span>
        {value && !disabled && (
          <span className="ig-item-value" title={value}>
            {value}
          </span>
        )}
        {disabled && <span className="ig-item-disabled-hint">desabilitado — texto na imagem</span>}
      </div>
      <ChevronRight size={14} className="ig-item-chevron" />
    </button>
  </div>
)

/* ── ImageGenTextSubPanel — text editing sub-panel with AI tones ── */
function ImageGenTextSubPanel({
  fieldKey,
  value,
  onChange,
  onClose,
  campaignContext,
  headingInImage,
  onToggleHeadingInImage,
}: {
  fieldKey: 'heading' | 'description' | 'cta'
  value: string
  onChange: (v: string) => void
  onClose: () => void
  campaignContext: { title: string; product: string; brandContext?: any }
  headingInImage?: boolean
  onToggleHeadingInImage?: (v: boolean) => void
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isGenerating, setIsGenerating] = useState(false)

  const labelMap: Record<string, string> = {
    heading: 'Heading',
    description: 'Description',
    cta: 'Call to action',
  }

  const tones = [
    { id: 'emocional', emoji: '♡', label: 'Emocional' },
    { id: 'urgencia', emoji: '⚡', label: 'Urgente' },
    { id: 'humoristico', emoji: '◡', label: 'Divertido' },
    { id: 'aspiracional', emoji: '✦', label: 'Elegante' },
    { id: 'direto', emoji: '→', label: 'Direto' },
    { id: 'promocional', emoji: '%', label: 'Promoção' },
    { id: 'escassez', emoji: '⏱', label: 'Escassez' },
    { id: 'surpresa', emoji: '✦', label: 'Surpreenda-me' },
  ]

  const handleGenerate = async (toneId: string) => {
    setIsGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          action: 'regenerate',
          field: fieldKey,
          currentValue: localValue,
          tone: toneId,
          campaign: campaignContext,
        },
      })
      if (error) throw error
      if (data?.text) setLocalValue(data.text)
    } catch (err) {
      console.error('Generate error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="ig-subpanel-content">
      <p className="ig-subpanel-title">{labelMap[fieldKey]}</p>

      {/* Toggle "Gerar na imagem" — only for Heading */}
      {fieldKey === 'heading' && onToggleHeadingInImage && (
        <label className={`ig-in-image-toggle ${headingInImage ? 'active' : ''}`}>
          <input
            type="checkbox"
            checked={headingInImage ?? false}
            onChange={(e) => onToggleHeadingInImage(e.target.checked)}
          />
          <span className="toggle-track" />
          <div className="ig-in-image-info">
            <span className="ig-in-image-label">Gerar na imagem</span>
            <span className="ig-in-image-hint">
              {headingInImage
                ? 'Texto renderizado pelo Gemini · desc e CTA desabilitados'
                : 'Heading será renderizado diretamente na imagem gerada'}
            </span>
          </div>
        </label>
      )}

      <textarea
        className="ig-text-textarea"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        rows={fieldKey === 'description' ? 4 : 3}
        autoFocus
      />
      <p className="ig-subpanel-section-label">Estilo</p>
      <div className="ig-tone-grid">
        {tones.map((t) => (
          <button
            key={t.id}
            className="ig-tone-btn"
            onClick={() => handleGenerate(t.id)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <>
                {t.emoji} {t.label}
              </>
            )}
          </button>
        ))}
      </div>
      <button
        className="ig-apply-btn"
        onClick={() => {
          onChange(localValue)
          onClose()
        }}
      >
        Aplicar
      </button>
    </div>
  )
}

const GradientIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect width="13" height="13" rx="2" fill="url(#ovGrad)" />
    <defs>
      <linearGradient id="ovGrad" x1="0" y1="13" x2="0" y2="0">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
)

const hex2rgb = (hex: string | undefined | null): string => {
  if (!hex || typeof hex !== 'string') return '0, 0, 0'
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return `${r}, ${g}, ${b}`
}

const buildOverlayStyle = (
  type: 'gradient' | 'solid',
  color: string,
  opacity: number,
  position: 'bottom' | 'top' | 'full'
): React.CSSProperties => {
  const rgb = hex2rgb(color)
  if (type === 'solid') {
    return { position: 'absolute', inset: 0, background: `rgba(${rgb}, ${opacity})` }
  }
  const gradientMap = {
    bottom: `linear-gradient(to top, rgba(${rgb}, ${opacity}) 0%, rgba(${rgb}, ${opacity * 0.6}) 40%, transparent 75%)`,
    top: `linear-gradient(to bottom, rgba(${rgb}, ${opacity}) 0%, rgba(${rgb}, ${opacity * 0.6}) 40%, transparent 75%)`,
    full: `linear-gradient(to top, rgba(${rgb}, ${opacity}) 0%, rgba(${rgb}, ${opacity * 0.3}) 50%, rgba(${rgb}, ${opacity}) 100%)`,
  }
  return { position: 'absolute', inset: 0, background: gradientMap[position] }
}

const TEXT_COLOR_PRESETS = ['#FFFFFF', '#1A1A1A', '#F5F0E8', '#D4A064']
const CTA_COLOR_PRESETS = ['#FFFFFF', '#1A1A1A', '#D4A064', '#4CAF7D', '#E63946']

export interface AssetCreatorData {
  campaignTitle: string
  product: string
  productImageUrl?: string
  copyText: string
  selectedTone?: string
  selectedAngle?: string
  focusChannel?: string
  autoPrompt?: string
  restoreChatMessages?: any[]
  styleId?: string | null
  styleName?: string | null
  styleDesc?: string | null
  restoreGallery?: { id: string; url: string }[]
  restoreActiveGalleryId?: string | null
  restoreAssetHistory?: any[]
}

interface Props {
  data: AssetCreatorData
  onClose: () => void
  embedded?: boolean
  initialBoardMode?: boolean
}

const TONE_OPTIONS = [
  { id: 'direto', label: 'Direto', emoji: '→', icon: <ArrowRight size={14} /> },
  { id: 'emocional', label: 'Emocional', emoji: '♡', icon: <Heart size={14} /> },
  { id: 'urgencia', label: 'Urgência', emoji: '⚡', icon: <Zap size={14} color="#F59E0B" /> },
  { id: 'aspiracional', label: 'Aspiracional', emoji: '✦', icon: <Sparkles size={14} /> },
  { id: 'humoristico', label: 'Bem-humorado', emoji: '◡', icon: <Smile size={14} /> },
  { id: 'escassez', label: 'Escassez', emoji: '⏱', icon: <Timer size={14} /> },
  { id: 'prova-social', label: 'Prova social', emoji: '★', icon: <Star size={14} /> },
  { id: 'promocao', label: 'Promoção', emoji: '%', icon: <Tag size={14} /> },
  { id: 'exclusividade', label: 'Exclusividade', emoji: '◈', icon: <Crown size={14} /> },
  { id: 'curiosidade', label: 'Curiosidade', emoji: '?', icon: <HelpCircle size={14} /> },
]

const CREATIVE_PRESETS = [
  {
    id: 'script-warm',
    triggers: [
      'warm',
      'lifestyle',
      'baby',
      'family',
      'soft',
      'natural',
      'golden',
      'cozy',
      'emotional',
      'pastel',
    ],
    font: 'dancing-script',
    color: '#2C1810',
    size: 38,
    shadow: '0 2px 12px rgba(44,24,16,0.25)',
    label: 'Script Quente',
  },
  {
    id: 'script-elegant',
    triggers: [
      'elegant',
      'luxury',
      'premium',
      'aesthetic',
      'fashion',
      'editorial',
      'marble',
      'linen',
      'beige',
      'cream',
    ],
    font: 'great-vibes',
    color: '#1A1209',
    size: 44,
    shadow: '0 1px 8px rgba(26,18,9,0.2)',
    label: 'Script Elegante',
  },
  {
    id: 'serif-editorial',
    triggers: [
      'editorial',
      'magazine',
      'product hero',
      'advertising',
      'campaign',
      'bold composition',
      'dark background',
    ],
    font: 'playfair',
    color: '#FFFFFF',
    size: 36,
    shadow: '0 2px 16px rgba(0,0,0,0.6), 0 0 32px rgba(0,0,0,0.3)',
    label: 'Serif Editorial',
  },
  {
    id: 'serif-clean',
    triggers: [
      'white background',
      'clean',
      'ecommerce',
      'studio',
      'minimal',
      'product only',
      'retail',
    ],
    font: 'dm-serif',
    color: '#1A1A1A',
    size: 32,
    shadow: 'none',
    label: 'Serif Clean',
  },
  {
    id: 'bold-display',
    triggers: [
      'bold',
      'contrast',
      'urgency',
      'promotion',
      'vivid',
      'graphic',
      'dark',
      'dramatic lighting',
    ],
    font: 'bebas',
    color: '#FFFFFF',
    size: 52,
    shadow: '0 3px 0px rgba(0,0,0,0.9), 0 6px 20px rgba(0,0,0,0.5)',
    label: 'Bold Display',
  },
  {
    id: 'handwritten-casual',
    triggers: [
      'candid',
      'authentic',
      'ugc',
      'casual',
      'outdoor',
      'film grain',
      'person',
      'real people',
      'street',
    ],
    font: 'gochi-hand',
    color: '#FFFFFF',
    size: 34,
    shadow: '0 2px 8px rgba(0,0,0,0.5)',
    label: 'Handwritten',
  },
]

/* ── SelectableText — Figma-style: single click = select, double click = edit ── */
const SelectableText = ({
  fieldKey,
  value,
  onChange,
  style,
  isCta = false,
  selectedElement,
  editingElement,
  setSelectedElement,
  setEditingElement,
}: {
  fieldKey: 'heading' | 'description' | 'cta'
  value: string
  onChange: (v: string) => void
  style: React.CSSProperties
  isCta?: boolean
  selectedElement: string | null
  editingElement: string | null
  setSelectedElement: (v: any) => void
  setEditingElement: (v: any) => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const isSelected = selectedElement === fieldKey
  const isEditing = editingElement === fieldKey
  const [prevValue, setPrevValue] = useState(value)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditing) {
      setSelectedElement(fieldKey)
      setEditingElement(null)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPrevValue(value)
    setSelectedElement(fieldKey)
    setEditingElement(fieldKey)
    setTimeout(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }, 0)
  }

  const handleBlur = () => {
    const newValue = ref.current?.innerText?.trim() ?? value
    onChange(newValue)
    setEditingElement(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBlur()
    }
    if (e.key === 'Escape') {
      if (ref.current) ref.current.innerText = prevValue
      setEditingElement(null)
    }
  }

  return (
    <div
      ref={ref}
      data-field={fieldKey}
      className={`selectable-text ${isSelected && !isEditing ? 'element-selected' : ''} ${isEditing ? 'element-editing' : ''} ${isCta ? 'is-cta' : ''}`}
      style={style}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onBlur={isEditing ? handleBlur : undefined}
      onKeyDown={handleKeyDown}
    >
      {isEditing ? undefined : value}
    </div>
  )
}

/* ── CopyField with Sparkle dropdown + Versions ── */
function CopyField({
  label,
  optional,
  value,
  onChange,
  visible,
  onToggle,
  multiline,
  placeholder,
  fieldKey,
  campaignContext,
}: {
  label: string
  optional?: boolean
  value: string
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => void
  visible: boolean
  onToggle: () => void
  multiline?: boolean
  placeholder?: string
  fieldKey: 'heading' | 'description' | 'cta'
  campaignContext: { title: string; product: string; brandContext?: any }
}) {
  const [sparkleOpen, setSparkleOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [versions, setVersions] = useState<string[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSparkleOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelectTone = async (toneId: string) => {
    setSparkleOpen(false)
    setIsGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          action: 'regenerate',
          field: fieldKey,
          currentValue: value,
          tone: toneId,
          campaign: campaignContext,
        },
      })
      if (error) throw error
      if (data?.text) onChange({ target: { value: data.text } })
    } catch (err) {
      console.error('Regenerate error:', err)
      toast.error('Erro ao regenerar texto')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleVersions = async () => {
    setIsGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          action: 'versions',
          field: fieldKey,
          tone: 'direto',
          campaign: campaignContext,
          count: 4,
        },
      })
      if (error) throw error
      if (data?.versions) {
        setVersions(data.versions)
        setShowVersions(true)
      }
    } catch (err) {
      console.error('Versions error:', err)
      toast.error('Erro ao gerar versões')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Label row: label + versions + sparkle + eye */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span style={fieldLabelStyle}>
          {label}
          {optional && (
            <span
              style={{
                fontWeight: 400,
                textTransform: 'none' as const,
                color: '#BBB',
                letterSpacing: 0,
                marginLeft: 4,
              }}
            >
              opcional
            </span>
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} ref={dropdownRef}>
          {/* Versions button */}
          <button
            onClick={handleVersions}
            disabled={isGenerating}
            title="Gerar versões"
            style={fieldIconBtnStyle}
          >
            {isGenerating && !sparkleOpen ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Layers size={13} />
            )}
          </button>

          {/* Sparkle — tone dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSparkleOpen((v) => !v)}
              disabled={isGenerating}
              title="Reescrever com tom"
              style={{
                ...fieldIconBtnStyle,
                color: sparkleOpen ? '#1A1A1A' : undefined,
                background: sparkleOpen ? '#F2F2F2' : undefined,
              }}
            >
              {isGenerating && sparkleOpen ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
            </button>

            {sparkleOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: 280,
                  background: '#FFFFFF',
                  border: '1.5px solid #E8E8E8',
                  borderRadius: 10,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                  overflow: 'hidden',
                  zIndex: 20,
                  animation: 'dropIn 0.15s ease',
                  padding: 6,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTone(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: 12,
                      color: '#333',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      fontFamily: 'inherit',
                      transition: 'background 0.12s',
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      style={{
                        width: 16,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {t.icon}
                    </span>
                    <span style={{ fontWeight: 500 }}>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Eye toggle */}
          <button
            onClick={onToggle}
            title={visible ? 'Ocultar' : 'Mostrar'}
            style={{ ...fieldIconBtnStyle, color: visible ? '#555' : '#DDD' }}
          >
            {visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>
      </div>

      {/* Input */}
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange as any}
          rows={2}
          style={{ ...inputStyle, resize: 'none' as const, lineHeight: 1.5, minHeight: 56 }}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange as any}
          style={inputStyle}
        />
      )}

      {/* Versions panel */}
      {showVersions && versions.length > 0 && (
        <div
          style={{
            marginTop: 6,
            border: '1.5px solid #E2E2E2',
            borderRadius: 10,
            overflow: 'hidden',
            background: '#FFFFFF',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#F7F7F7',
              borderBottom: '1px solid #EBEBEB',
              fontSize: 11,
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            <span>{versions.length} versões</span>
            <button
              onClick={() => setShowVersions(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#999',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          </div>
          {versions.map((v, i) => (
            <button
              key={i}
              onClick={() => {
                onChange({ target: { value: v } })
                setShowVersions(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderBottom: i < versions.length - 1 ? '1px solid #F0F0F0' : 'none',
                background: '#FFFFFF',
                textAlign: 'left' as const,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <span style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.4, flex: 1 }}>{v}</span>
              <span
                className="version-use-label"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  opacity: 0,
                  flexShrink: 0,
                  transition: 'opacity 0.15s',
                }}
              >
                Usar
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Toolbar button ── */
function TbBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: 'none',
        background: active ? '#1A1A1A' : 'transparent',
        color: active ? '#FFFFFF' : '#777',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ── FigmaPanel — collapsible panel ── */
function FigmaPanel({
  id,
  label,
  icon,
  highlighted = false,
  defaultOpen = false,
  children,
  selectedElement,
  targetElements,
}: {
  id: string
  label: string
  icon: React.ReactNode
  highlighted?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
  selectedElement?: string | null
  targetElements?: string[]
}) {
  const [open, setOpen] = useState(defaultOpen)

  // Auto-open when selectedElement matches — syncs external selection to
  // internal open state so clicking a canvas element reveals its controls.
  useEffect(() => {
    if (selectedElement && targetElements?.includes(selectedElement)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external prop into local UI state
      setOpen(true)
    }
  }, [selectedElement, targetElements])

  return (
    <div
      style={{
        borderBottom: '1px solid #F0F0F0',
        background: highlighted ? '#F7F5FF' : 'transparent',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '12px 20px',
          background: highlighted ? '#F0EDFF' : 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left' as const,
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => {
          if (!highlighted) e.currentTarget.style.background = '#FAFAFA'
        }}
        onMouseLeave={(e) => {
          if (!highlighted) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ color: highlighted ? '#5B21B6' : '#888', display: 'flex' }}>{icon}</span>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            color: highlighted ? '#5B21B6' : '#333',
          }}
        >
          {label}
        </span>
        <Plus
          size={13}
          style={{
            color: '#CCC',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(45deg)' : 'none',
          }}
        />
      </button>
      {open && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  )
}

interface FreeReviewCard {
  id: string
  reviewText: string
  reviewerName: string
  rating: number
  xRel: number
  yRel: number
  widthRel: number
}

interface FreeCountdownWidget {
  id: string
  label: string
  endsAt: number
  xRel: number
  yRel: number
  widthRel: number
}

interface FreePriceWidget {
  id: string
  originalPrice: string
  discountPrice: string
  discountBadge: string
  ctaLabel: string
  xRel: number
  yRel: number
  widthRel: number
}

interface FreeSocialProofWidget {
  id: string
  count: string
  label: string
  xRel: number
  yRel: number
  widthRel: number
}

/* ═══ MOCKUP MODAL ═══ */
const InstagramFeedMockup = ({ imageUrl, legenda }: { imageUrl: string; legenda?: string }) => (
  <div
    style={{
      width: '100%',
      maxWidth: 380,
      background: '#FFF',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>minhaloja</div>
        <div style={{ fontSize: 11, color: '#888' }}>Patrocinado</div>
      </div>
      <span style={{ marginLeft: 'auto', fontSize: 20, color: '#888' }}>···</span>
    </div>
    <div
      style={{ width: '100%', aspectRatio: '1/1', background: `url(${imageUrl}) center/cover` }}
    />
    <div style={{ padding: '10px 14px', display: 'flex', gap: 16 }}>
      <span style={{ fontSize: 22 }}>♡</span>
      <span style={{ fontSize: 22 }}>◎</span>
      <span style={{ fontSize: 22 }}>↗</span>
    </div>
    {legenda ? (
      <div style={{ padding: '0 14px 14px', fontSize: 13, color: '#333', lineHeight: 1.4 }}>
        <span style={{ fontWeight: 600 }}>minhaloja </span>
        {legenda.slice(0, 120)}
        {legenda.length > 120 ? '... mais' : ''}
      </div>
    ) : (
      <div style={{ padding: '0 14px 14px', fontSize: 13 }}>
        <span style={{ fontWeight: 600 }}>minhaloja</span> Confira nosso novo produto ✦
      </div>
    )}
  </div>
)

const InstagramStoryMockup = ({ imageUrl }: { imageUrl: string }) => (
  <div
    style={{
      width: 220,
      height: 390,
      borderRadius: 24,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      flexShrink: 0,
    }}
  >
    <div style={{ width: '100%', height: '100%', background: `url(${imageUrl}) center/cover` }} />
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 12px' }}>
      <div
        style={{
          height: 2,
          background: 'rgba(255,255,255,0.6)',
          borderRadius: 2,
          marginBottom: 10,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(45deg,#f09433,#bc1888)',
            border: '2px solid #FFF',
            flexShrink: 0,
          }}
        />
        <span style={{ color: '#FFF', fontSize: 12, fontWeight: 600 }}>minhaloja</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>agora</span>
      </div>
    </div>
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 20,
          padding: '7px 24px',
          color: '#FFF',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Deslize para cima ↑
      </div>
    </div>
  </div>
)

const LinkedInMockup = ({ imageUrl, legenda }: { imageUrl: string; legenda?: string }) => (
  <div
    style={{
      width: '100%',
      maxWidth: 380,
      background: '#FFF',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 4,
          background: '#0077B5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          fontWeight: 600,
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        M
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Minha Loja</div>
        <div style={{ fontSize: 12, color: '#888' }}>3.420 seguidores · Patrocinado</div>
      </div>
    </div>
    {legenda && (
      <div style={{ padding: '0 14px 10px', fontSize: 13, color: '#333', lineHeight: 1.5 }}>
        {legenda.slice(0, 100)}
        {legenda.length > 100 ? '...' : ''}
      </div>
    )}
    <div
      style={{ width: '100%', aspectRatio: '4/3', background: `url(${imageUrl}) center/cover` }}
    />
    <div style={{ padding: '10px 14px 14px', borderTop: '1px solid #F0F0F0' }}>
      <div style={{ display: 'flex', gap: 20 }}>
        {['▲ Curtir', '◎ Comentar', '↗ Compartilhar'].map((a) => (
          <span key={a} style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>
            {a}
          </span>
        ))}
      </div>
    </div>
  </div>
)

const WhatsAppMockup = ({ imageUrl, legenda }: { imageUrl: string; legenda?: string }) => (
  <div
    style={{
      width: 300,
      background: '#E5DDD5',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }}
  >
    <div
      style={{
        background: '#075E54',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{ width: 36, height: 36, borderRadius: '50%', background: '#128C7E', flexShrink: 0 }}
      />
      <div style={{ color: '#FFF' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Minha Loja</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>online</div>
      </div>
    </div>
    <div style={{ padding: 16, display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          background: '#DCF8C6',
          borderRadius: '8px 0 8px 8px',
          overflow: 'hidden',
          maxWidth: 240,
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{ width: 240, aspectRatio: '1/1', background: `url(${imageUrl}) center/cover` }}
        />
        {legenda && (
          <div style={{ padding: '8px 10px', fontSize: 12, color: '#333', lineHeight: 1.4 }}>
            {legenda.slice(0, 80)}
            {legenda.length > 80 ? '...' : ''}
          </div>
        )}
        <div style={{ padding: '0 10px 8px', fontSize: 10, color: '#888', textAlign: 'right' }}>
          09:41 ✓✓
        </div>
      </div>
    </div>
  </div>
)

/* ═══ PUBLISH MODAL (unified mockup + legenda) ═══ */
function PublishModal({
  imageUrl,
  product,
  campaign,
  onClose,
  onSchedule,
}: {
  imageUrl: string
  product: string
  campaign: string
  onClose: () => void
  onSchedule: (data: { platform: string; legenda: string }) => void
}) {
  const [platform, setPlatform] = useState<
    'instagram-feed' | 'instagram-story' | 'linkedin' | 'whatsapp'
  >('instagram-feed')
  const [legenda, setLegenda] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const platforms = [
    { id: 'instagram-feed' as const, label: 'Instagram Feed', icon: '▣' },
    { id: 'instagram-story' as const, label: 'Stories / Reels', icon: '▶' },
    { id: 'linkedin' as const, label: 'LinkedIn', icon: '◆' },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: '◎' },
  ]

  const tones = [
    { id: 'direct', icon: '→', label: 'Direto' },
    { id: 'emotional', icon: '♡', label: 'Emocional' },
    { id: 'urgent', icon: '⚡', label: 'Urgência' },
    { id: 'aspirational', icon: '✦', label: 'Aspiracional' },
    { id: 'promotional', icon: '%', label: 'Promoção' },
    { id: 'scarcity', icon: '◎', label: 'Escassez' },
    { id: 'social_proof', icon: '★', label: 'Prova social' },
    { id: 'exclusive', icon: '◆', label: 'Exclusividade' },
    { id: 'curiosity', icon: '?', label: 'Curiosidade' },
    { id: 'humorous', icon: '◡', label: 'Bem-humorado' },
  ]

  const platformForApi =
    platform === 'instagram-feed' || platform === 'instagram-story' ? 'instagram' : platform

  const handleGenerate = async (toneId: string) => {
    setIsGenerating(true)
    try {
      const { data: fnData, error } = await supabase.functions.invoke('generate-legenda', {
        body: { product, campaign, tone: toneId, platform: platformForApi },
      })
      if (error) throw error
      setLegenda(fnData?.text?.trim() ?? '')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar legenda')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(legenda)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1100,
          height: 'calc(100vh - 48px)',
          maxHeight: 860,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '16px 24px',
            borderBottom: '1px solid #F0F0F0',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1A1A1A',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Publicar
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${platform === p.id ? '#1A1A1A' : 'transparent'}`,
                  background: platform === p.id ? '#1A1A1A' : 'transparent',
                  fontSize: 12,
                  fontWeight: 500,
                  color: platform === p.id ? '#FFF' : '#666',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  fontFamily: 'inherit',
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              padding: 4,
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — two columns */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left — Mockup */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: '#F8F8F8',
              borderRight: '1px solid #F0F0F0',
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              overflowY: 'auto',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 12,
                marginTop: 0,
              }}
            >
              Preview
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                flex: 1,
              }}
            >
              {platform === 'instagram-feed' && (
                <InstagramFeedMockup imageUrl={imageUrl} legenda={legenda} />
              )}
              {platform === 'instagram-story' && <InstagramStoryMockup imageUrl={imageUrl} />}
              {platform === 'linkedin' && <LinkedInMockup imageUrl={imageUrl} legenda={legenda} />}
              {platform === 'whatsapp' && <WhatsAppMockup imageUrl={imageUrl} legenda={legenda} />}
            </div>
          </div>

          {/* Right — Legenda */}
          <div
            style={{
              width: 380,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              gap: 14,
              overflowY: 'auto',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 0,
                marginTop: 0,
              }}
            >
              Legenda
            </p>

            {platform === 'instagram-story' ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 8,
                  color: '#AAA',
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                <span style={{ fontSize: 32 }}>▶</span>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#888', margin: 0 }}>
                  Stories e Reels não utilizam legenda.
                </p>
                <p style={{ fontSize: 12, color: '#AAA', margin: 0 }}>O visual fala por si só.</p>
              </div>
            ) : (
              <>
                {/* Tone grid — 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {tones.map((t) => (
                    <button
                      key={t.id}
                      disabled={isGenerating}
                      onClick={() => handleGenerate(t.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '7px 10px',
                        borderRadius: 7,
                        border: '1px solid #EBEBEB',
                        background: '#FAFAFA',
                        fontSize: 12,
                        color: '#444',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                        textAlign: 'left' as const,
                        fontFamily: 'inherit',
                        opacity: isGenerating ? 0.4 : 1,
                      }}
                    >
                      {isGenerating ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <>
                          <span style={{ fontSize: 12, color: '#888', width: 14, flexShrink: 0 }}>
                            {t.icon}
                          </span>
                          {t.label}
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  value={legenda}
                  onChange={(e) => setLegenda(e.target.value)}
                  placeholder="Selecione um tom para gerar a legenda, ou escreva diretamente..."
                  rows={8}
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid #E8E8E8',
                    borderRadius: 10,
                    fontSize: 13,
                    lineHeight: 1.6,
                    resize: 'none',
                    color: '#1A1A1A',
                    background: '#FAFAFA',
                    minHeight: 160,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />

                <button
                  onClick={handleCopy}
                  style={{
                    height: 40,
                    borderRadius: 10,
                    border: '1.5px solid #E2E2E2',
                    background: '#FFF',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    transition: 'all 0.12s',
                    fontFamily: 'inherit',
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={13} /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copiar legenda
                    </>
                  )}
                </button>
              </>
            )}

            {/* Agendar — always visible */}
            <button
              onClick={() => onSchedule({ platform, legenda })}
              style={{
                height: 42,
                borderRadius: 10,
                border: 'none',
                background: '#1A1A1A',
                color: '#FFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'all 0.12s',
                fontFamily: 'inherit',
                marginTop: 'auto',
              }}
            >
              <CalendarIcon size={13} /> Agendar publicação
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ SCHEDULE MODAL ═══ */
function ScheduleModal({
  imageUrl,
  legenda,
  onClose,
  onScheduled,
}: {
  imageUrl: string
  legenda: string
  onClose: () => void
  onScheduled: (post: ScheduledPost) => void
}) {
  const [platform, setPlatform] = useState('instagram')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [scheduled, setScheduled] = useState(false)

  const bestTimes: Record<string, { day: string; time: string; note: string }[]> = {
    instagram: [
      { day: 'Seg–Sex', time: '18:00–20:00', note: 'Maior engajamento' },
      { day: 'Sábado', time: '10:00–12:00', note: 'Bom alcance' },
    ],
    linkedin: [
      { day: 'Ter–Qui', time: '07:00–09:00', note: 'Profissionais ativos' },
      { day: 'Ter–Qui', time: '17:00–18:00', note: 'Pós-expediente' },
    ],
    whatsapp: [
      { day: 'Seg–Sex', time: '12:00–13:00', note: 'Horário de almoço' },
      { day: 'Seg–Sex', time: '19:00–21:00', note: 'Noite' },
    ],
  }

  const platforms = [
    { id: 'instagram', label: 'Instagram', icon: '▣' },
    { id: 'linkedin', label: 'LinkedIn', icon: '◆' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '◎' },
  ]

  const handleSchedule = () => {
    if (!date || !time) return
    const post: ScheduledPost = {
      id: `post-${Date.now()}`,
      imageUrl,
      legenda,
      platform: platform as any,
      date,
      time,
      status: 'scheduled',
      campaign: '',
    }
    setScheduled(true)
    setTimeout(() => onScheduled(post), 1000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFF',
          borderRadius: 16,
          padding: 24,
          width: 400,
          maxWidth: '90vw',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
            Agendar publicação
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
          >
            <X size={15} />
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 10,
            background: '#F8F8F8',
            borderRadius: 8,
          }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }}
          />
          {legenda && (
            <p style={{ fontSize: 12, color: '#666', lineHeight: 1.4, margin: 0 }}>
              {legenda.slice(0, 80)}...
            </p>
          )}
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#888',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Rede social
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: `1.5px solid ${platform === p.id ? '#1A1A1A' : '#E2E2E2'}`,
                  background: platform === p.id ? '#1A1A1A' : '#FFF',
                  fontSize: 12,
                  fontWeight: 500,
                  color: platform === p.id ? '#FFF' : '#555',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#888',
              display: 'block',
              marginBottom: 6,
            }}
          >
            ✦ Melhor horário para {platform}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(bestTimes[platform] || []).map((bt, i) => (
              <button
                key={i}
                onClick={() => {
                  const today = new Date()
                  setDate(today.toISOString().split('T')[0])
                  setTime(bt.time.split('–')[0])
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #E8E8E8',
                  background: '#FFF',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  transition: 'all 0.12s',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#333', minWidth: 70 }}>
                  {bt.day}
                </span>
                <span style={{ fontSize: 12, color: '#555' }}>{bt.time}</span>
                <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>{bt.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#888',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Data e hora
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #E2E2E2',
                fontSize: 13,
                background: '#FAFAFA',
                color: '#1A1A1A',
                fontFamily: 'inherit',
              }}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: 100,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #E2E2E2',
                fontSize: 13,
                background: '#FAFAFA',
                color: '#1A1A1A',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
        <button
          onClick={handleSchedule}
          disabled={!date || !time || scheduled}
          style={{
            width: '100%',
            height: 38,
            borderRadius: 8,
            border: 'none',
            background: '#1A1A1A',
            color: '#FFF',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: 'inherit',
            marginTop: 4,
            opacity: !date || !time || scheduled ? 0.35 : 1,
          }}
        >
          {scheduled ? (
            <>
              <Check size={14} /> Agendado!
            </>
          ) : (
            <>
              <CalendarIcon size={14} /> Confirmar agendamento
            </>
          )}
        </button>
      </div>
    </div>
  )
}

const figmaLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#AAA',
}

interface FreeTextBox {
  id: string
  text: string
  xRel: number
  yRel: number
  fontSizeRel: number
  color: string
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  boxWidthRel: number
  textShadow?: string
  x?: number
  y?: number
  fontSize?: number
  boxWidth?: number
}

interface FreeProductCard {
  id: string
  productId: string
  xRel: number
  yRel: number
  widthRel: number
  heightRel: number
}

const FreeTextBoxComponent = ({
  box,
  canvasW,
  canvasH,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onBlur,
  onDelete,
  onUpdate,
  onOpenGen,
  onDuplicate,
  onApplyCreative,
  isApplyingCreative,
}: {
  box: FreeTextBox
  canvasW: number
  canvasH: number
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onBlur: (text: string) => void
  onDelete: () => void
  onUpdate: (patch: Partial<FreeTextBox>) => void
  onOpenGen: () => void
  onDuplicate: () => void
  onApplyCreative?: () => void
  isApplyingCreative?: boolean
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)

  const px = {
    x: Math.round((box.xRel ?? 0.06) * canvasW),
    y: Math.round((box.yRel ?? 0.5) * canvasH),
    fontSize: Math.max(8, Math.round((box.fontSizeRel ?? 0.06) * canvasW)),
    boxWidth: Math.round((box.boxWidthRel ?? 0.88) * canvasW),
  }

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()

    const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
    if (!frame) return
    const cr = frame.getBoundingClientRect()
    const offsetX = e.clientX - cr.left - px.x
    const offsetY = e.clientY - cr.top - px.y

    const move = (ev: MouseEvent) => {
      const cr2 = frame.getBoundingClientRect()
      const ww = wrapRef.current?.offsetWidth ?? px.boxWidth
      const wh = wrapRef.current?.offsetHeight ?? 40
      const newX = Math.max(0, Math.min(cr2.width - ww, ev.clientX - cr2.left - offsetX))
      const newY = Math.max(0, Math.min(cr2.height - wh, ev.clientY - cr2.top - offsetY))
      onUpdate({
        xRel: newX / cr2.width,
        yRel: newY / cr2.height,
      })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleCornerMouseDown = (e: React.MouseEvent, corner: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = wrapRef.current?.offsetWidth ?? px.boxWidth
    const move = (ev: MouseEvent) => {
      const dx = corner === 'tr' || corner === 'br' ? ev.clientX - startX : startX - ev.clientX
      const W =
        document.querySelector<HTMLElement>('[data-canvas-frame]')?.getBoundingClientRect().width ??
        canvasW
      const newFontPx = Math.max(
        8,
        Math.min(400, Math.round(px.fontSize + (dx / startW) * px.fontSize))
      )
      onUpdate({ fontSizeRel: newFontPx / W })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleSideMouseDown = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWRel = box.boxWidthRel ?? 0.88
    const startXRel = box.xRel ?? 0.06
    const move = (ev: MouseEvent) => {
      const W =
        document.querySelector<HTMLElement>('[data-canvas-frame]')?.getBoundingClientRect().width ??
        canvasW
      const dx = ev.clientX - startX
      if (side === 'right') {
        onUpdate({ boxWidthRel: Math.max(0.05, startWRel + dx / W) })
      } else {
        const newWRel = Math.max(0.05, startWRel - dx / W)
        onUpdate({ boxWidthRel: newWRel, xRel: startXRel + (startWRel - newWRel) })
      }
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const H = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    background: '#18A0FB',
    border: '2px solid #FFF',
    zIndex: 25,
    ...extra,
  })

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => {
        e.stopPropagation()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
      style={{
        position: 'absolute',
        left: px.x,
        top: px.y,
        width: px.boxWidth,
        overflow: 'visible',
        fontFamily: box.fontFamily,
        fontSize: px.fontSize,
        fontWeight: 400,
        color: box.color,
        lineHeight: 1.25,
        zIndex: 10,
        userSelect: 'none',
        cursor: isEditing ? 'text' : 'move',
        textShadow: box.textShadow ?? 'none',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          overflow: 'hidden',
          width: '100%',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          textAlign: box.textAlign,
        }}
      >
        {box.text === '...' ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="textbox-loading-label">inserindo texto</span>
            <span className="textbox-cursor" />
          </div>
        ) : (
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              if (isEditing) onBlur(e.currentTarget.innerText || box.text)
            }}
            onKeyDown={(e) => {
              if (!isEditing) return
              e.stopPropagation()
              if (e.key === 'Escape') e.currentTarget.blur()
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            ref={(el) => {
              if (isEditing && el) {
                setTimeout(() => {
                  el.focus()
                  const r = document.createRange()
                  const s = window.getSelection()
                  r.selectNodeContents(el)
                  r.collapse(false)
                  s?.removeAllRanges()
                  s?.addRange(r)
                }, 10)
              }
            }}
            style={{
              outline: 'none',
              display: 'block',
              minHeight: '1em',
              fontFamily: box.fontFamily,
              fontSize: 'inherit',
              fontWeight: 'inherit',
              color: 'inherit',
            }}
          >
            {box.text}
          </div>
        )}
      </div>

      {isSelected && !isEditing && box.text !== '...' && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -1,
              border: '1.5px solid #18A0FB',
              borderRadius: 2,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
          <div
            data-handle="true"
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 6px',
              whiteSpace: 'nowrap',
              zIndex: 30,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {[
              {
                label: '✦ Gerar',
                action: onOpenGen,
                style: { color: 'rgba(255,255,255,0.9)', paddingRight: 8 },
              },
              { label: '⧉', action: onDuplicate, style: { color: 'rgba(255,255,255,0.65)' } },
              { label: '✕', action: onDelete, style: { color: 'rgba(255,255,255,0.65)' } },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  btn.action()
                }}
                style={{
                  height: 26,
                  minWidth: 26,
                  padding: '0 6px',
                  border: 'none',
                  borderRadius: 4,
                  background: 'transparent',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Inter',sans-serif",
                  ...btn.style,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {(
            [
              ['tl', { top: -5, left: -5, cursor: 'nw-resize' }],
              ['tr', { top: -5, right: -5, cursor: 'ne-resize' }],
              ['bl', { bottom: -5, left: -5, cursor: 'sw-resize' }],
              ['br', { bottom: -5, right: -5, cursor: 'se-resize' }],
            ] as [string, React.CSSProperties][]
          ).map(([k, s]) => (
            <div
              key={k}
              data-handle="true"
              onMouseDown={(e) => handleCornerMouseDown(e, k)}
              style={H({ width: 10, height: 10, borderRadius: 2, ...s })}
            />
          ))}
          {(
            [
              [
                'left',
                { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' },
              ],
              [
                'right',
                { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' },
              ],
            ] as ['left' | 'right', React.CSSProperties][]
          ).map(([k, s]) => (
            <div
              key={k}
              data-handle="true"
              onMouseDown={(e) => handleSideMouseDown(e, k)}
              style={H({ width: 10, height: 22, borderRadius: 3, ...s })}
            />
          ))}
        </>
      )}
    </div>
  )
}

const FreeProductCardComponent = ({
  card,
  product,
  canvasW,
  canvasH,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
  onChangeProd,
}: {
  card: FreeProductCard
  product: { id: string; name: string; image: string } | undefined
  canvasW: number
  canvasH: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdate: (patch: Partial<FreeProductCard>) => void
  onChangeProd: () => void
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const px = {
    x: Math.round(card.xRel * canvasW),
    y: Math.round(card.yRel * canvasH),
    w: Math.round(card.widthRel * canvasW),
    h: Math.round(card.heightRel * canvasH),
  }

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()

    const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
    if (!frame) return
    const cr = frame.getBoundingClientRect()
    const offsetX = e.clientX - cr.left - px.x
    const offsetY = e.clientY - cr.top - px.y

    const move = (ev: MouseEvent) => {
      const cr2 = frame.getBoundingClientRect()
      const wh = wrapRef.current?.offsetHeight ?? px.h ?? 80
      const newX = Math.max(0, Math.min(cr2.width - px.w, ev.clientX - cr2.left - offsetX))
      const newY = Math.max(0, Math.min(cr2.height - wh, ev.clientY - cr2.top - offsetY))
      onUpdate({ xRel: newX / cr2.width, yRel: newY / cr2.height })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const startW = card.widthRel
    const startH = card.heightRel
    const move = (ev: MouseEvent) => {
      const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
      if (!frame) return
      const W = frame.getBoundingClientRect().width
      const H = frame.getBoundingClientRect().height
      onUpdate({
        widthRel: Math.max(0.15, startW + (ev.clientX - startX) / W),
        heightRel: Math.max(0.1, startH + (ev.clientY - startY) / H),
      })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const imgSize = Math.round(px.h * 0.68)
  const fontSize = Math.max(9, Math.round(px.w * 0.09))

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      style={{
        position: 'absolute',
        left: px.x,
        top: px.y,
        width: px.w,
        height: px.h,
        cursor: 'move',
        zIndex: 11,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FFFFFF',
          borderRadius: Math.round(px.w * 0.06),
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: imgSize,
            background: '#F5F5F5',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {product?.image && (
            <img
              src={product.image}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${Math.round(px.h * 0.03)}px ${Math.round(px.w * 0.06)}px`,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontSize,
              fontWeight: 500,
              color: '#1A1A1A',
              textAlign: 'center',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {product?.name ?? 'Selecionar produto'}
          </span>
        </div>
      </div>

      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -2,
              border: '1.5px solid #18A0FB',
              borderRadius: Math.round(px.w * 0.06) + 2,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
          <div
            data-handle="true"
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 6px',
              whiteSpace: 'nowrap',
              zIndex: 30,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChangeProd()
              }}
              style={{
                height: 26,
                padding: '0 8px',
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                fontFamily: "'Inter',sans-serif",
              }}
            >
              ↺ Produto
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              style={{
                height: 26,
                width: 26,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          <div
            data-handle="true"
            onMouseDown={handleResizeMouseDown}
            style={{
              position: 'absolute',
              bottom: -5,
              right: -5,
              width: 10,
              height: 10,
              borderRadius: 2,
              background: '#18A0FB',
              border: '2px solid #FFF',
              cursor: 'se-resize',
              zIndex: 25,
            }}
          />
        </>
      )}
    </div>
  )
}

const FreeReviewCardComponent = ({
  card,
  canvasW,
  canvasH,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onBlur,
  onDelete,
  onUpdate,
}: {
  card: FreeReviewCard
  canvasW: number
  canvasH: number
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onBlur: (patch: Partial<FreeReviewCard>) => void
  onDelete: () => void
  onUpdate: (patch: Partial<FreeReviewCard>) => void
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)

  const px = {
    x: Math.round(card.xRel * canvasW),
    y: Math.round(card.yRel * canvasH),
    w: Math.round(card.widthRel * canvasW),
  }

  const fontSize = Math.max(10, Math.round(px.w * 0.052))
  const nameFontSize = Math.max(9, Math.round(px.w * 0.04))
  const starSize = Math.max(10, Math.round(px.w * 0.052))
  const padding = Math.round(px.w * 0.06)
  const radius = Math.round(px.w * 0.05)

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()

    const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
    if (!frame) return
    const cr = frame.getBoundingClientRect()
    const offsetX = e.clientX - cr.left - px.x
    const offsetY = e.clientY - cr.top - px.y

    const move = (ev: MouseEvent) => {
      const cr2 = frame.getBoundingClientRect()
      const wh = wrapRef.current?.offsetHeight ?? 80
      const newX = Math.max(0, Math.min(cr2.width - px.w, ev.clientX - cr2.left - offsetX))
      const newY = Math.max(0, Math.min(cr2.height - wh, ev.clientY - cr2.top - offsetY))
      onUpdate({ xRel: newX / cr2.width, yRel: newY / cr2.height })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleSideResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWRel = card.widthRel
    const move = (ev: MouseEvent) => {
      const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
      if (!frame) return
      const W = frame.getBoundingClientRect().width
      onUpdate({ widthRel: Math.max(0.2, startWRel + (ev.clientX - startX) / W) })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => {
        e.stopPropagation()
        if (!isEditing) onSelect()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
      style={{
        position: 'absolute',
        left: px.x,
        top: px.y,
        width: px.w,
        cursor: isEditing ? 'default' : 'move',
        zIndex: 11,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.96)',
          borderRadius: radius,
          padding,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: Math.round(px.w * 0.03),
        }}
      >
        {/* Stars */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              data-handle={isEditing ? 'true' : undefined}
              onClick={(e) => {
                if (isEditing) {
                  e.stopPropagation()
                  onUpdate({ rating: star })
                }
              }}
              style={{
                fontSize: starSize,
                lineHeight: 1,
                color: star <= card.rating ? '#F59E0B' : '#E5E7EB',
                cursor: isEditing ? 'pointer' : 'inherit',
              }}
            >
              ★
            </span>
          ))}
        </div>

        {/* Review text */}
        <div
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={(e) => {
            if (isEditing)
              onBlur({ reviewText: e.currentTarget.innerText?.trim() || card.reviewText })
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
          style={{
            fontSize,
            lineHeight: 1.45,
            color: '#1A1A1A',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            outline: 'none',
            borderBottom: isEditing ? '1px dashed rgba(24,160,251,0.4)' : 'none',
          }}
        >
          {card.reviewText}
        </div>

        {/* Reviewer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(px.w * 0.025) }}>
          <div
            style={{
              width: Math.round(nameFontSize * 1.8),
              height: Math.round(nameFontSize * 1.8),
              borderRadius: '50%',
              background: '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: nameFontSize * 0.75,
              fontWeight: 600,
              color: '#6B7280',
              flexShrink: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {card.reviewerName.charAt(0).toUpperCase()}
          </div>
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              if (isEditing)
                onBlur({ reviewerName: e.currentTarget.innerText?.trim() || card.reviewerName })
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
              if (e.key === 'Escape') e.currentTarget.blur()
            }}
            style={{
              fontSize: nameFontSize,
              fontWeight: 600,
              color: '#374151',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              borderBottom: isEditing ? '1px dashed rgba(24,160,251,0.4)' : 'none',
            }}
          >
            {card.reviewerName}
          </div>
          <span
            style={{
              fontSize: nameFontSize * 0.85,
              color: '#10B981',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            ✓ verificado
          </span>
        </div>
      </div>

      {/* Selection outline */}
      {isSelected && !isEditing && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -2,
              border: '1.5px solid #18A0FB',
              borderRadius: radius + 2,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
          <div
            data-handle="true"
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 6px',
              whiteSpace: 'nowrap',
              zIndex: 30,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              style={{
                height: 26,
                padding: '0 8px',
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                fontFamily: "'Inter',sans-serif",
              }}
            >
              ✎ Editar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              style={{
                height: 26,
                width: 26,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          <div
            data-handle="true"
            onMouseDown={handleSideResizeMouseDown}
            style={{
              position: 'absolute',
              top: '50%',
              right: -5,
              transform: 'translateY(-50%)',
              width: 10,
              height: 22,
              borderRadius: 3,
              background: '#18A0FB',
              border: '2px solid #FFF',
              cursor: 'ew-resize',
              zIndex: 25,
            }}
          />
        </>
      )}

      {isEditing && (
        <div
          style={{
            position: 'absolute',
            inset: -2,
            border: '1.5px dashed #18A0FB',
            borderRadius: radius + 2,
            pointerEvents: 'none',
            zIndex: 15,
          }}
        />
      )}
    </div>
  )
}

// ── FreeCountdownWidgetComponent ──
const FreeCountdownWidgetComponent = ({
  widget,
  canvasW,
  canvasH,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: {
  widget: FreeCountdownWidget
  canvasW: number
  canvasH: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdate: (patch: Partial<FreeCountdownWidget>) => void
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, widget.endsAt - Date.now())
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [widget.endsAt])

  const px = {
    x: Math.round(widget.xRel * canvasW),
    y: Math.round(widget.yRel * canvasH),
    w: Math.round(widget.widthRel * canvasW),
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const numFontSize = Math.max(14, Math.round(px.w * 0.13))
  const labelFontSize = Math.max(8, Math.round(px.w * 0.038))
  const padding = Math.round(px.w * 0.04)
  const radius = Math.round(px.w * 0.04)
  const gap = Math.round(px.w * 0.02)

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
    if (!frame) return
    const cr = frame.getBoundingClientRect()
    const offsetX = e.clientX - cr.left - px.x
    const offsetY = e.clientY - cr.top - px.y
    const move = (ev: MouseEvent) => {
      const cr2 = frame.getBoundingClientRect()
      const wh = wrapRef.current?.offsetHeight ?? 60
      onUpdate({
        xRel: Math.max(0, Math.min(cr2.width - px.w, ev.clientX - cr2.left - offsetX)) / cr2.width,
        yRel: Math.max(0, Math.min(cr2.height - wh, ev.clientY - cr2.top - offsetY)) / cr2.height,
      })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const units = [
    { value: timeLeft.h, label: 'horas' },
    { value: timeLeft.m, label: 'min' },
    { value: timeLeft.s, label: 'seg' },
  ]

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      style={{
        position: 'absolute',
        left: px.x,
        top: px.y,
        width: px.w,
        cursor: 'move',
        zIndex: 11,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: '#1A1A1A',
          borderRadius: radius,
          padding,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: gap,
        }}
      >
        <span
          style={{
            fontSize: labelFontSize,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: "'Inter',sans-serif",
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
          }}
        >
          {widget.label}
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: gap * 1.5,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {units.map((u, i) => (
            <React.Fragment key={u.label}>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
              >
                <div
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: Math.round(radius * 0.6),
                    padding: `${Math.round(padding * 0.4)}px ${Math.round(padding * 0.7)}px`,
                    minWidth: Math.round(px.w * 0.18),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: numFontSize,
                      fontWeight: 600,
                      color: '#FFFFFF',
                      fontFamily: "'Inter',sans-serif",
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}
                  >
                    {pad(u.value)}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: labelFontSize * 0.9,
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: "'Inter',sans-serif",
                  }}
                >
                  {u.label}
                </span>
              </div>
              {i < 2 && (
                <span
                  style={{
                    fontSize: numFontSize,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1,
                    marginBottom: Math.round(labelFontSize * 1.2),
                  }}
                >
                  :
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -2,
              border: '1.5px solid #18A0FB',
              borderRadius: radius + 2,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
          <div
            data-handle="true"
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 6px',
              whiteSpace: 'nowrap',
              zIndex: 30,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdate({ endsAt: Date.now() + 2 * 60 * 60 * 1000 })
              }}
              style={{
                height: 26,
                padding: '0 8px',
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                fontFamily: "'Inter',sans-serif",
              }}
            >
              ↺ Reset
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              style={{
                height: 26,
                width: 26,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── FreePriceWidgetComponent ──
const FreePriceWidgetComponent = ({
  widget,
  canvasW,
  canvasH,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: {
  widget: FreePriceWidget
  canvasW: number
  canvasH: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdate: (patch: Partial<FreePriceWidget>) => void
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const px = {
    x: Math.round(widget.xRel * canvasW),
    y: Math.round(widget.yRel * canvasH),
    w: Math.round(widget.widthRel * canvasW),
  }
  const padding = Math.round(px.w * 0.05)
  const radius = Math.round(px.w * 0.04)
  const originalSize = Math.max(9, Math.round(px.w * 0.045))
  const discountSize = Math.max(16, Math.round(px.w * 0.1))
  const badgeSize = Math.max(8, Math.round(px.w * 0.038))
  const ctaSize = Math.max(10, Math.round(px.w * 0.048))

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
    if (!frame) return
    const cr = frame.getBoundingClientRect()
    const offsetX = e.clientX - cr.left - px.x
    const offsetY = e.clientY - cr.top - px.y
    const move = (ev: MouseEvent) => {
      const cr2 = frame.getBoundingClientRect()
      const wh = wrapRef.current?.offsetHeight ?? 80
      onUpdate({
        xRel: Math.max(0, Math.min(cr2.width - px.w, ev.clientX - cr2.left - offsetX)) / cr2.width,
        yRel: Math.max(0, Math.min(cr2.height - wh, ev.clientY - cr2.top - offsetY)) / cr2.height,
      })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      style={{
        position: 'absolute',
        left: px.x,
        top: px.y,
        width: px.w,
        cursor: 'move',
        zIndex: 11,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.96)',
          borderRadius: radius,
          padding,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: padding,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(px.w * 0.02) }}>
            <span
              style={{
                fontSize: originalSize,
                color: '#999',
                textDecoration: 'line-through',
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {widget.originalPrice}
            </span>
            <span
              style={{
                fontSize: badgeSize,
                fontWeight: 600,
                color: '#FFFFFF',
                background: '#EF4444',
                borderRadius: 4,
                padding: '1px 5px',
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {widget.discountBadge}
            </span>
          </div>
          <span
            style={{
              fontSize: discountSize,
              fontWeight: 600,
              color: '#1A1A1A',
              fontFamily: "'Inter',sans-serif",
              lineHeight: 1,
            }}
          >
            {widget.discountPrice}
          </span>
        </div>
        <div
          style={{
            background: '#1A1A1A',
            borderRadius: Math.round(radius * 0.8),
            padding: `${Math.round(padding * 0.6)}px ${Math.round(padding * 1.2)}px`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: ctaSize,
              fontWeight: 500,
              color: '#FFFFFF',
              fontFamily: "'Inter',sans-serif",
              whiteSpace: 'nowrap' as const,
            }}
          >
            {widget.ctaLabel}
          </span>
        </div>
      </div>
      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -2,
              border: '1.5px solid #18A0FB',
              borderRadius: radius + 2,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
          <div
            data-handle="true"
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 6px',
              whiteSpace: 'nowrap',
              zIndex: 30,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              style={{
                height: 26,
                width: 26,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── FreeSocialProofWidgetComponent ──
const FreeSocialProofWidgetComponent = ({
  widget,
  canvasW,
  canvasH,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: {
  widget: FreeSocialProofWidget
  canvasW: number
  canvasH: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdate: (patch: Partial<FreeSocialProofWidget>) => void
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const px = {
    x: Math.round(widget.xRel * canvasW),
    y: Math.round(widget.yRel * canvasH),
    w: Math.round(widget.widthRel * canvasW),
  }
  const padding = Math.round(px.w * 0.04)
  const radius = Math.round(px.w * 0.06)
  const countSize = Math.max(12, Math.round(px.w * 0.07))
  const labelSize = Math.max(9, Math.round(px.w * 0.042))
  const dotSize = Math.max(5, Math.round(px.w * 0.025))

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    const frame = document.querySelector<HTMLElement>('[data-canvas-frame]')
    if (!frame) return
    const cr = frame.getBoundingClientRect()
    const offsetX = e.clientX - cr.left - px.x
    const offsetY = e.clientY - cr.top - px.y
    const move = (ev: MouseEvent) => {
      const cr2 = frame.getBoundingClientRect()
      const wh = wrapRef.current?.offsetHeight ?? 40
      onUpdate({
        xRel: Math.max(0, Math.min(cr2.width - px.w, ev.clientX - cr2.left - offsetX)) / cr2.width,
        yRel: Math.max(0, Math.min(cr2.height - wh, ev.clientY - cr2.top - offsetY)) / cr2.height,
      })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      style={{
        position: 'absolute',
        left: px.x,
        top: px.y,
        width: px.w,
        cursor: 'move',
        zIndex: 11,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.96)',
          borderRadius: radius,
          padding: `${Math.round(padding * 0.8)}px ${padding}px`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: Math.round(px.w * 0.03),
        }}
      >
        <div
          style={{
            position: 'relative',
            flexShrink: 0,
            width: dotSize * 2.5,
            height: dotSize * 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: dotSize * 2.5,
              height: dotSize * 2.5,
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.2)',
              animation: 'softPulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              background: '#22C55E',
              flexShrink: 0,
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: Math.round(px.w * 0.015) }}>
          <span
            style={{
              fontSize: countSize,
              fontWeight: 600,
              color: '#1A1A1A',
              fontFamily: "'Inter',sans-serif",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {widget.count}
          </span>
          <span style={{ fontSize: labelSize, color: '#666', fontFamily: "'Inter',sans-serif" }}>
            {widget.label}
          </span>
        </div>
      </div>
      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -2,
              border: '1.5px solid #18A0FB',
              borderRadius: radius + 2,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
          <div
            data-handle="true"
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 6px',
              whiteSpace: 'nowrap',
              zIndex: 30,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              style={{
                height: 26,
                width: 26,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Map canvas ratio IDs to aspect ratio instructions for image generation
const GEMINI_ASPECT_MAP: Record<string, string> = {
  '1:1': '1:1',
  '9:16': '9:16',
  '16:9': '16:9',
  '3:4': '3:4',
  '4:3': '4:3',
  '4:5': '3:4',
  '2:3': '9:16',
  '1:2': '9:16',
  '2:1': '16:9',
  '3:2': '4:3',
}

const AI_VIDEO_MODELS = [
  {
    id: 'kling-3.0',
    name: 'Kling 3.0',
    label: 'Kuaishou',
    badge: 'novo' as string | null,
    desc: 'Melhor qualidade — movimento realista e coerente',
    maxDuration: 10,
    icon: '◉',
  },
  {
    id: 'seedance-2.0',
    name: 'Seedance 2.0',
    label: 'Bytedance',
    badge: null as string | null,
    desc: 'Movimento natural, alta fidelidade',
    maxDuration: 10,
    icon: '◈',
  },
  {
    id: 'kling-2.1',
    name: 'Kling 2.1',
    label: 'Kuaishou',
    badge: 'premium',
    desc: 'Melhor qualidade cinematic',
    maxDuration: 10,
    icon: '◉',
  },
  {
    id: 'kling-1.6',
    name: 'Kling 1.6',
    label: 'Kuaishou',
    badge: null as string | null,
    desc: 'Rápido e consistente',
    maxDuration: 10,
    icon: '◉',
  },
  {
    id: 'wan-pro',
    name: 'Wan Pro',
    label: 'Alibaba',
    badge: null as string | null,
    desc: 'Ótimo para produto em cena',
    maxDuration: 5,
    icon: '▣',
  },
  {
    id: 'minimax-video',
    name: 'Minimax Video',
    label: 'Minimax',
    badge: null as string | null,
    desc: 'Movimento expressivo',
    maxDuration: 6,
    icon: '▦',
  },
] as const

type AIVideoModelId = (typeof AI_VIDEO_MODELS)[number]['id']
// Contextual metadata for each image style
const STYLE_META: Record<string, { thumb: string; description: string }> = {
  'ecommerce-photography': {
    thumb:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=320&h=240&fit=crop&crop=center',
    description: 'Produto limpo, fundo neutro, luz uniforme. Ideal para marketplace e loja online.',
  },
  'advertising-product': {
    thumb: '',
    description: 'Props de ingredientes, fundo dominante, luz dramática e composição editorial.',
  },
  packshot: {
    thumb:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=320&h=240&fit=crop&crop=center',
    description: 'Produto centralizado, embalagem em destaque, fundo branco ou gradiente suave.',
  },
  'advertising-portrait': {
    thumb:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&h=240&fit=crop&crop=faces',
    description: 'Pessoa com expressão forte, produto integrado à cena. Alto impacto emocional.',
  },
  'fashion-on-model': {
    thumb:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=320&h=240&fit=crop&crop=center',
    description: 'Produto vestido por modelo em estúdio. Luz clean, pose editorial, caimento real.',
  },
  'ghost-mannequin': {
    thumb:
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=320&h=240&fit=crop&crop=center',
    description:
      'Roupa estruturada sem modelo, efeito manequim fantasma. Padrão e-commerce de moda.',
  },
  'product-lifestyle': {
    thumb:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=320&h=240&fit=crop&crop=center',
    description: 'Produto em uso no dia a dia. Luz natural, ambiente real, sensação autêntica.',
  },
  'flat-lay-editorial': {
    thumb:
      'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=320&h=240&fit=crop&crop=center',
    description:
      'Vista aérea com composição cuidadosa. Objetos complementares criam narrativa visual.',
  },
  unboxing: {
    thumb:
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=320&h=240&fit=crop&crop=center',
    description: 'Experiência de abertura da embalagem. Gera antecipação e prova social orgânica.',
  },
  'material-detail': {
    thumb:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=320&h=240&fit=crop&crop=center',
    description: 'Macro extremo na textura e material do produto. Comunica qualidade sem palavras.',
  },
  'product-attributes': {
    thumb:
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=320&h=240&fit=crop&crop=center',
    description: 'Callouts visuais anotando os atributos do produto diretamente na imagem.',
  },
  'pop-illustration': {
    thumb:
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=320&h=240&fit=crop&crop=center',
    description:
      'Foto real com ilustração cartoon bold. Roupas com outline, elementos 2D ao redor.',
  },
  'product-infographic': {
    thumb: '',
    description: 'Macro do material com ícones de atributos sobrepostos, estilo editorial premium.',
  },
}

// ── Infographic Icon for Product Infographic style ──
const INFOGRAPHIC_ICON_PATHS: Record<string, string> = {
  // Tecido / Moda
  soft: 'M12 3c-3 4-5 7-5 10a5 5 0 0010 0c0-3-2-6-5-10z',
  breathable:
    'M12 3v3M7.8 5.4l1.5 2.6M4.2 9h3M4.2 15h3M7.8 18.6l1.5-2.6M12 21v-3M16.2 18.6l-1.5-2.6M19.8 15h-3M19.8 9h-3M16.2 5.4l-1.5 2.6',
  cotton:
    'M12 4c-2 0-3.5 1.5-3.5 3.5 0 0-2 .5-2 2.5s2 2.5 2 2.5h7s2-.5 2-2.5-2-2.5-2-2.5C15.5 5.5 14 4 12 4zM9 12.5v7M12 12.5v7M15 12.5v7',
  durable: 'M12 2l2.5 5h5.5l-4.5 4 1.5 5.5L12 14l-5 2.5L8.5 11 4 7h5.5z',
  premium: 'M5 3h14v14l-7 4-7-4V3z',
  organic: 'M12 2C7 8 4 12 4 16a8 8 0 0016 0c0-4-3-8-8-14z',
  waterproof: 'M12 2C8 8 4 12 4 16a8 8 0 0016 0C20 12 16 8 12 2z M8 16c0-2 1.5-4 4-4s4 2 4 4',
  smooth: 'M4 8q8-6 16 0M4 12q8-6 16 0M4 16q8-6 16 0',
  cooling: 'M12 2v20M2 12h20M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4',
  elastic: 'M4 12c0-4 3-7 8-7s8 3 8 7-3 7-8 7-8-3-8-7z M8 12c0-2 2-3 4-3s4 1 4 3-2 3-4 3-4-1-4-3z',
  antibacterial: 'M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z M12 12v6M9 14l3 4 3-4',
  uv: 'M12 3v3M18.4 5.6l-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 21v-3M5.6 18.4l2.1-2.1M3 12h3M5.6 5.6l2.1 2.1 M12 8a4 4 0 100 8 4 4 0 000-8z',
  // Eletrônicos
  battery: 'M7 7h10v10H7z M3 10v4M17 10v4 M10 11v2M13 11v2',
  wireless:
    'M5 12.5C5 8.4 8.1 5 12 5s7 3.4 7 7.5M8 14.5c0-2.2 1.8-4 4-4s4 1.8 4 4M12 19a1 1 0 100-2 1 1 0 000 2z',
  bluetooth: 'M12 4l4 4-4 4 4 4-4 4V4z M8 8l4 4M8 16l4-4',
  waterresist: 'M12 3C8.5 8 6 12 6 16a6 6 0 0012 0c0-4-2.5-8-6-13z M9 15a3 3 0 006 0',
  speed: 'M13 2L3 14h9l-1 8 10-12h-9z',
  hd: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z M8 8v8M11 8h3a2 2 0 012 2v4a2 2 0 01-2 2h-3V8z',
  touch: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  noise: 'M11 5L6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14',
  portable: 'M12 2a7 7 0 017 7v6a7 7 0 01-14 0V9a7 7 0 017-7z M12 19v3M8 22h8',
  sensor:
    'M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0M12 5V3M12 21v-2M5 12H3M21 12h-2M7.1 7.1L5.7 5.7M18.4 18.4l-1.4-1.4M7.1 16.9l-1.4 1.4M18.4 5.6l-1.4 1.4',
  charging: 'M11 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2h-3 M13 7v6l4 2',
  camera:
    'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
  // Móveis / Decoração
  wood: 'M3 3h18M3 9h18M3 15h18M3 21h18 M6 3v18M12 3v18M18 3v18',
  ergonomic:
    'M12 2C9 2 7 4.7 7 8c0 2.3 1.2 4.3 3 5.5V20h4v-6.5c1.8-1.2 3-3.2 3-5.5 0-3.3-2-6-5-6z M9 20h6',
  adjustable: 'M12 3v18M5 12l7-7 7 7M5 17l7-7 7 7',
  assembly:
    'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-3 3zM3 22l9-9',
  weight: 'M12 2a5 5 0 100 10A5 5 0 0012 2zM3 21l3-8h12l3 8H3z',
  fireretardant:
    'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z',
  nordic: 'M3 12h18M3 6h18M3 18h18 M6 6v12M12 6v12M18 6v12',
  stackable: 'M3 18h18M3 12h18M3 6h18',
  compact: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M9 9h6M9 12h6M9 15h4',
  handmade:
    'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  // Cosméticos / Skincare
  natural: 'M12 22V12M12 12C10 8 6 5 4 3c2 4 6 7 8 9M12 12c2-4 6-7 8-9-2 4-6 7-8 9',
  vegan: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  cruelty:
    'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  spf: 'M12 3v3M18.4 5.6l-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 21v-3M5.6 18.4l2.1-2.1M3 12h3M5.6 5.6l2.1 2.1 M12 8a4 4 0 100 8 4 4 0 000-8z',
  vitamin:
    'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
  hydration: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',
  collagen: 'M16 12h.01M12 12h.01M8 12h.01 M3 12C3 7 7.03 3 12 3s9 4 9 9c0 6-9 12-9 12S3 18 3 12z',
  clinicaltested: 'M22 12h-4l-3 9L9 3l-3 9H2',
  fragrance: 'M12 2L8 7H4l4 4-2 8 6-4 6 4-2-8 4-4h-4z',
  dermatologist: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  // Alimentos / Suplementos
  protein: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M8 12h8M12 8v8',
  glutenfree: 'M18.36 6.64a9 9 0 11-12.73 0M6.34 17.66L17.66 6.34 M12 2v10',
  nosugar: 'M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z M3 3l18 18',
  calories: 'M13 2L3 14h9l-1 8 10-12h-9z',
  minerals:
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  omega3:
    'M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z M8 12s1-2 4-2 4 2 4 2',
  // Esportes / Fitness
  lightweight: 'M5 3l14 9-14 9V3z',
  grip: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 1v3M10 1v3M14 1v3',
  impact: 'M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z M8 12l2 2 4-4',
  nonslip: 'M3 5h18M3 10h18M3 15h18M3 20h18',
  recycled:
    'M7 19H4.5A2.5 2.5 0 012 16.5v-11A2.5 2.5 0 014.5 3h15A2.5 2.5 0 0122 5.5v11a2.5 2.5 0 01-2.5 2.5H17M12 15v7m0 0l-3-3m3 3l3-3',
  ventilation:
    'M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1010 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2',
  // Bebê / Infantil
  hypoallergenic: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  bpafree: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18 M3 3l18 18',
  nontoxic: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  washable: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z M8 14s1.5 2 4 2 4-2 4-2',
  certified: 'M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3',
  // Default
  default:
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
}

function resolveInfographicIcon(label: string): string {
  const l = label.toLowerCase().replace(/[^a-z0-9]/g, '')
  const match = Object.keys(INFOGRAPHIC_ICON_PATHS).find((key) =>
    l.includes(key.replace(/[^a-z0-9]/g, ''))
  )
  return INFOGRAPHIC_ICON_PATHS[match ?? 'default']
}

const InfographicIconEl = ({
  label,
  sublabel,
  size,
}: {
  label: string
  sublabel?: string
  size: number
}) => {
  const iconPath = resolveInfographicIcon(label)
  const fontSize = Math.max(8, size * 0.18)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: size * 0.12,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `${Math.max(1.5, size * 0.04)}px solid rgba(255,255,255,0.85)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={iconPath} />
        </svg>
      </div>
      <p
        style={{
          fontSize,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.95)',
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: size * 1.4,
        }}
      >
        {label}
      </p>
      {sublabel && (
        <p
          style={{
            fontSize: fontSize * 0.8,
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {sublabel}
        </p>
      )}
    </div>
  )
}

export const AssetCreatorModal = ({ data, onClose, embedded, initialBoardMode }: Props) => {
  // Limpar Visual DNA do localStorage — estava contaminando gerações
  useEffect(() => {
    try {
      localStorage.removeItem('snew_visual_dna')
      localStorage.removeItem('visual_dna')
      localStorage.removeItem(VISUAL_DNA_KEY)
    } catch {}
  }, [])

  useEffect(() => {
    // Remove any existing Google Fonts link and reinject with full list
    const existing = document.querySelector(`link[data-snew-fonts]`)
    if (existing) existing.remove()
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.setAttribute('data-snew-fonts', 'true')
    link.href = GOOGLE_FONTS_URL
    document.head.appendChild(link)
  }, [])

  // Products from catalog (uploaded in Settings → Avatars) merged with seeds
  const { products: catalogProducts } = useProductCatalog()
  const allProducts = useMemo(() => {
    const catalogById = new Map(catalogProducts.map((p) => [p.product_id, p]))

    // Build from seeds first (guarantees at least 6 products with images)
    const result = STUDIO_PRODUCT_SEEDS.map((seed) => {
      const catalogEntry = catalogById.get(seed.product_id)
      const uploadedImage = catalogEntry?.image_url?.trim()
      return {
        id: seed.product_id,
        name: catalogEntry?.name || seed.name,
        sku: catalogEntry?.sku || seed.sku,
        image: uploadedImage || seed.image,
      }
    })

    // Add any extra catalog products not in seeds
    for (const p of catalogProducts) {
      if (!STUDIO_PRODUCT_SEEDS.some((s) => s.product_id === p.product_id)) {
        if (p.image_url?.trim()) {
          result.push({ id: p.product_id, name: p.name, sku: p.sku, image: p.image_url })
        }
      }
    }

    return result
  }, [catalogProducts])

  // Campaign dropdown
  const allCampaigns = seasonalCalendar.dates.map((d) => ({
    id: d.id,
    title: d.label,
    date: d.date,
  }))
  const [activeCampaignId, setActiveCampaignId] = useState(
    allCampaigns.find((c) => c.title === data.campaignTitle)?.id || allCampaigns[0]?.id
  )
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
  const campaignDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(e.target as Node))
        setCampaignDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeCampaign = allCampaigns.find((c) => c.id === activeCampaignId) || allCampaigns[0]

  const handleSelectCampaign = (campaign: (typeof allCampaigns)[0]) => {
    setActiveCampaignId(campaign.id)
    setCampaignDropdownOpen(false)

    // Find full seasonal date for quote/description
    const seasonalDate = seasonalCalendar.dates.find((d) => d.id === campaign.id)

    // Try to get copy from L3 content (first Instagram feed caption)
    const l3 = seasonalL3Content[campaign.id]
    const feedCopy = l3?.copies?.[0]?.blocks?.[0]?.content
    const feedLines = feedCopy?.split('\n').filter((l: string) => l.trim()) || []

    // Set contextual heading/description/CTA
    setHeading(seasonalDate?.quote || campaign.title)
    setDescription(feedLines[1] || seasonalDate?.description?.split('\n')[0] || '')
    setCta(feedLines.length > 2 ? feedLines[feedLines.length - 1] : 'Garantir agora →')

    // Reset canvas content
    if (allProducts[0]) {
      setActiveImageUrl(allProducts[0].image)
      setSelectedProducts([allProducts[0].id])
    } else {
      setActiveImageUrl('')
      setSelectedProducts([])
    }
    setGeneratedImageUrl(null)
    setGeneratedCarouselSlides([])
    setIsCarouselMode(false)
    setActiveSlide(0)

    // Reset scan & selection
    setScanResult(null)
    setSelectedElement(null)
    setEditingElement(null)
    closeAllSidebarPanels()

    // Reset styles to defaults
    setSelectedStyleId(null)
    setTextColor('#FFFFFF')
    setCtaColor('#FFFFFF')
    setCtaTextColor('#1A1A1A')
    setSelectedFont('inter')
    setTextHAlign('left')
    setTextVAlign('bottom')
    setHeadingSize(26)
    setDescriptionSize(13)
    setCtaSize(12)
    setHeadingVisible(true)
    setDescriptionVisible(true)
    setCtaVisible(true)
    setPriceVisible(false)
    setPriceText('')
    setImageHasEmbeddedText(false)

    // Reset overlay
    setOverlayType('gradient')
    setOverlayOpacity(0.45)
    setOverlayColor('#000000')
    setOverlayPosition('bottom')

    // Reset attributes
    setShowAttributes(false)
    setAttributes([])

    toast.success(`Campanha alterada para ${campaign.title}`)
  }

  const [selectedRatio, setSelectedRatio] = useState(
    ASPECT_RATIOS[0] // default 9:16
  )
  const [ratioDropdownOpen, setRatioDropdownOpen] = useState(false)
  const ratioDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ratioDropdownRef.current && !ratioDropdownRef.current.contains(e.target as Node))
        setRatioDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keep selectedChannel as derived for backward compat
  const selectedChannel = selectedRatio.id
  const [isCarouselMode, setIsCarouselMode] = useState(false)

  type SelectedElement =
    | 'heading'
    | 'description'
    | 'cta'
    | 'image'
    | 'overlay'
    | 'attributes'
    | 'text'
    | null
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null)
  const [editingElement, setEditingElement] = useState<SelectedElement>(null)
  const [generatingFor, setGeneratingFor] = useState<SelectedElement>(null)
  const [toneDropdownFor, setToneDropdownFor] = useState<SelectedElement>(null)
  const [artifactReady, setArtifactReady] = useState(true)
  const [isApplyingCreative, setIsApplyingCreative] = useState(false)
  const [showRegenStyleDropdown, setShowRegenStyleDropdown] = useState(false)
  const [isSaveAnimating, setIsSaveAnimating] = useState(false)
  const [showSaveToast, setShowSaveToast] = useState(false)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const [canvasHovered, setCanvasHovered] = useState(false)
  const replaceImageInputRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  const handleChannelChange = (ratioId: string) => {
    const ratio = ASPECT_RATIOS.find((r) => r.id === ratioId) ?? ASPECT_RATIOS[0]
    setSelectedRatio(ratio)
    setIsCarouselMode(false)
    setGeneratedCarouselSlides([])
    setActiveSlide(0)
  }

  const enableCarousel = () => {
    setIsCarouselMode(true)
    setCarouselSetupOpen(true)
  }

  const disableCarousel = () => {
    setIsCarouselMode(false)
    setGeneratedCarouselSlides([])
    setActiveSlide(0)
  }

  const [heading, setHeading] = useState('')
  const [description, setDescription] = useState('')
  const [cta, setCta] = useState('')
  const [headingVisible, setHeadingVisible] = useState(false)
  const [descriptionVisible, setDescriptionVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)
  const [priceVisible, setPriceVisible] = useState(false)
  const [priceSize, setPriceSize] = useState<number>(20)
  const [priceText, setPriceText] = useState('')

  // Text in image generation
  const [includeTextInImage, setIncludeTextInImage] = useState(false)
  const [includeHeading, setIncludeHeading] = useState(true)
  const [includeDescription, setIncludeDescription] = useState(false)
  const [includeCta, setIncludeCta] = useState(false)
  const [headingInImage, setHeadingInImage] = useState(false)
  const [textInImageStyle, setTextInImageStyle] = useState('bold-white')
  const [textInImagePosition, setTextInImagePosition] = useState('bottom')
  const [imageHasEmbeddedText, setImageHasEmbeddedText] = useState(false)
  const [activeTextSection, setActiveTextSection] = useState<
    'heading' | 'description' | 'cta' | null
  >(null)

  // Image edit mode
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [isExpandingBackground, setIsExpandingBackground] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [isApplyingEdit, setIsApplyingEdit] = useState(false)
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null)

  // Free text boxes
  const [freeTextBoxes, setFreeTextBoxes] = useState<FreeTextBox[]>([])
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null)
  const [freeProductCards, setFreeProductCards] = useState<FreeProductCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [cardProductPickerOpen, setCardProductPickerOpen] = useState<string | null>(null)
  const [freeReviewCards, setFreeReviewCards] = useState<FreeReviewCard[]>([])
  const [selectedReviewCardId, setSelectedReviewCardId] = useState<string | null>(null)
  const [editingReviewCardId, setEditingReviewCardId] = useState<string | null>(null)

  const [freeCountdownWidgets, setFreeCountdownWidgets] = useState<FreeCountdownWidget[]>([])
  const [selectedCountdownId, setSelectedCountdownId] = useState<string | null>(null)

  const [freePriceWidgets, setFreePriceWidgets] = useState<FreePriceWidget[]>([])
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)

  const [freeSocialProofWidgets, setFreeSocialProofWidgets] = useState<FreeSocialProofWidget[]>([])
  const [selectedSocialProofId, setSelectedSocialProofId] = useState<string | null>(null)

  const [isGeneratingTextBox, setIsGeneratingTextBox] = useState<string | null>(null)
  const [genPanelOpen, setGenPanelOpen] = useState(false)
  const [genPanelBoxId, setGenPanelBoxId] = useState<string | null>(null)
  const [genPanelText, setGenPanelText] = useState('')
  const [topToolbarFontOpen, setTopToolbarFontOpen] = useState(false)
  const topToolbarFontBtnRef = useRef<HTMLButtonElement>(null)

  // Visual context for contextual copy generation
  const [visualContext, setVisualContext] = useState<string>('')
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const visualContextRef = useRef<string>('')

  const updateBox = (id: string, patch: Partial<FreeTextBox>) =>
    setFreeTextBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  // handleAddTextBox is defined after textColor/selectedFont are declared (see below)

  const textInImageStyles = [
    {
      id: 'bold-white',
      label: 'Bold branco',
      prompt: 'bold white sans-serif typography, high contrast, modern',
    },
    {
      id: 'elegant-serif',
      label: 'Serif',
      prompt: 'elegant serif typography, cream/white color, editorial style',
    },
    {
      id: 'script',
      label: 'Script',
      prompt: 'flowing script handwritten typography, white, elegant cursive',
    },
    {
      id: 'outlined',
      label: 'Outlined',
      prompt: 'outlined stroke typography, white outline, transparent fill, bold',
    },
    {
      id: 'poster',
      label: 'Poster',
      prompt: 'poster-style typography, large bold uppercase letters, high impact',
    },
  ]

  const getTextRules = (ratioId: string) => {
    const rules: Record<string, { maxWidth: string; position: string; fontSize: string }> = {
      '9:16': { maxWidth: '80% of width', position: 'lower 25%', fontSize: '4-5% of height' },
      '1:1': { maxWidth: '70% of width', position: 'lower 30%', fontSize: '5-6% of width' },
      '4:5': { maxWidth: '75% of width', position: 'lower 28%', fontSize: '4-5% of height' },
      '16:9': { maxWidth: '55% of width', position: 'lower 30%', fontSize: '8-10% of height' },
      '2:3': { maxWidth: '80% of width', position: 'lower 25%', fontSize: '4-5% of height' },
    }
    return (
      rules[ratioId] ?? { maxWidth: '70% of width', position: 'lower 30%', fontSize: '5% of image' }
    )
  }

  const buildTextInstruction = (): string => {
    if (!headingInImage || !heading) return ''

    const isVertical =
      selectedRatio?.id === '9:16' || selectedRatio?.id === '1:2' || selectedRatio?.id === '2:3'
    const isSquare = selectedRatio?.id === '1:1' || selectedRatio?.id === '4:5'
    const orientation = isVertical
      ? 'vertical (portrait)'
      : isSquare
        ? 'square'
        : 'horizontal (landscape)'

    const fontObj = ALL_FONTS.find((f) => f.id === selectedFont)
    const fontDesc = fontObj
      ? `${fontObj.name} ${fontObj.family.includes('serif') && !fontObj.family.includes('sans') ? 'serif' : fontObj.family.includes('cursive') ? 'script/calligraphy' : 'sans-serif'}`
      : 'clean sans-serif'
    const rules = getTextRules(selectedRatio?.id ?? '1:1')

    return `

TEXT RENDERING INSTRUCTIONS — follow exactly, this is critical:

TEXT TO RENDER: "${heading}"

STRICT SIZE RULES:
- The text must fit ENTIRELY within the image — no cropping, no overflow
- Font size: ${rules.fontSize}. Text max width: ${rules.maxWidth}
- If the text is long, break it into 2-3 lines naturally
- Each line must be fully visible with clear margins on both sides

STRICT POSITION RULES:
- Place text in the ${rules.position} of the image
- Minimum padding from ALL edges: 8% of the image dimension
- Text must never touch or go beyond the image borders
- Horizontal alignment: left-aligned with left margin of 8%

TYPOGRAPHY — critical:
- Font: ${fontDesc}
- Font weight: medium (500) or regular (400) — NEVER bold or heavy
- The text must feel editorial, refined, and elegant — not aggressive
- Color: ${textColor ?? 'white'}
- Letter spacing: -0.01em to 0em (tight, not expanded)
- Line height: 1.15 to 1.25
- Subtle text shadow: rgba(0,0,0,0.5), 1px offset, 8px blur

STYLE REFERENCE: Think Celine, Bottega Veneta, or Apple campaign typography —
confident but never shouting. Medium weight, generous spacing around the text block.

COMPOSITION:
- This is a ${orientation} image
- The text is the SECONDARY element — the product/scene is primary
- Leave breathing room between the text and the main subject
- The text should look like professional ad copy typography, not a title card
- Do NOT fill the entire bottom with text — keep it compact and elegant

CRITICAL: Medium/regular weight text that is fully visible > bold text that is cropped.
`.trim()
  }

  // Text background contrast
  const [textBgStyle, setTextBgStyle] = useState<'none' | 'solid' | 'pill' | 'blur' | 'shadow'>(
    'none'
  )
  const [textBgColor, setTextBgColor] = useState('#000000')
  const [textBgOpacity, setTextBgOpacity] = useState(0.5)

  const hexToRgba2 = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  const getTextBgStyle = (bgStyle: string): React.CSSProperties => {
    if (bgStyle === 'none') return {}
    const rgba = hexToRgba2(textBgColor, textBgOpacity)
    switch (bgStyle) {
      case 'solid':
        return {
          background: rgba,
          padding: '4px 10px',
          borderRadius: '4px',
          display: 'inline',
          boxDecorationBreak: 'clone' as any,
          WebkitBoxDecorationBreak: 'clone' as any,
        }
      case 'pill':
        return {
          background: rgba,
          padding: '6px 16px',
          borderRadius: '999px',
          display: 'inline-block',
        }
      case 'blur':
        return {
          background: rgba,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)' as any,
          padding: '6px 12px',
          borderRadius: '8px',
          display: 'inline-block',
        }
      case 'shadow':
        return {
          textShadow:
            '0 2px 4px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6), 0 0 24px rgba(0,0,0,0.4)',
        }
      default:
        return {}
    }
  }

  // Toolbar style state
  const [textVAlign, setTextVAlign] = useState<'top' | 'center' | 'bottom'>('bottom')
  const [textHAlign, setTextHAlign] = useState<'left' | 'center' | 'right'>('left')
  const [selectedFont, setSelectedFont] = useState('inter')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [ctaColor, setCtaColor] = useState('#FFFFFF')
  const [ctaTextColor, setCtaTextColor] = useState('#1A1A1A')
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null)
  const [stylesOpen, setStylesOpen] = useState(false)
  const [textCase, setTextCase] = useState<'normal' | 'uppercase' | 'capitalize'>('normal')
  const [fontWeightState, setFontWeightState] = useState<string>('500')
  const [letterSpacing, setLetterSpacing] = useState('0em')
  const [ctaRadius, setCtaRadius] = useState('8px')
  const [headingSize, setHeadingSize] = useState<number>(26)
  const [descriptionSize, setDescriptionSize] = useState<number>(13)
  const [ctaSize, setCtaSize] = useState<number>(12)
  const [fontPickerOpenForBox, setFontPickerOpenForBox] = useState<string | null>(null)
  const [mainFontPickerOpen, setMainFontPickerOpen] = useState(false)

  const handleAddTextBox = async () => {
    const id = `text-${Date.now()}`

    // Criar textbox imediatamente com placeholder
    const newBox: FreeTextBox = {
      id,
      text: '...',
      xRel: (1 - 0.88) / 2,
      yRel: 0.46,
      fontSizeRel: 0.048,
      color: textColor ?? '#FFFFFF',
      fontFamily: getFontFamilyById(selectedFont),
      textAlign: 'center',
      boxWidthRel: 0.88,
    }
    setFreeTextBoxes((prev) => [...prev, newBox])
    setSelectedBoxId(id)
    setSelectedElement(null)

    // Se não tem imagem no canvas, abrir edição direto
    if (!activeImageUrl || isPlaceholderImage(activeImageUrl)) {
      updateBox(id, { text: '' })
      setTimeout(() => setEditingBoxId(id), 50)
      return
    }

    // Gerar texto contextualizado pela imagem em paralelo
    try {
      const productName = activeProduct?.name?.trim() || ''
      const styleName = selectedImageStyle?.name?.trim() || ''
      const channelLabel = selectedRatio?.sublabel || 'Instagram'

      // Converter imagem para base64
      let imageBase64: string | null = null
      try {
        imageBase64 = await imageUrlToBase64(activeImageUrl)
      } catch {}

      const contextPrompt = [
        `Você é um redator criativo de e-commerce especialista em copy para redes sociais.`,
        `Analise a imagem fornecida e crie UMA frase curta, impactante e relevante para usar como headline desta imagem.`,
        productName ? `Produto: ${productName}.` : '',
        styleName ? `Estilo visual da imagem: ${styleName}.` : '',
        `Canal: ${channelLabel}.`,
        `Máximo 8 palavras. Responda APENAS com o texto, sem aspas, sem explicações, sem pontuação final.`,
        `Exemplos de tom: "Feito para durar.", "Seu próximo favorito.", "O detalhe que faz a diferença."`,
      ]
        .filter(Boolean)
        .join('\n')

      let generatedText = ''

      if (imageBase64) {
        // Com visão de imagem
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'gemini-generate',
          {
            body: {
              prompt: contextPrompt,
              model: 'gemini-2.0-flash-exp',
              images: [imageBase64],
              textOnly: true,
            },
          }
        )
        if (!fnError) {
          generatedText = fnData?.text ?? fnData?.content ?? ''
        }
      }

      // Fallback sem visão
      if (!generatedText) {
        const { data: fnData } = await supabase.functions.invoke('generate-copy', {
          body: {
            action: 'freetext',
            prompt: contextPrompt,
            brandContext: brandContextBody,
          },
        })
        generatedText = fnData?.text ?? ''
      }

      // Limpar e aplicar
      const clean = generatedText
        .replace(/^["'«»]|["'«»]$/g, '') // remover aspas
        .replace(/\.$/, '') // remover ponto final
        .trim()

      if (clean) {
        updateBox(id, { text: clean })
      } else {
        updateBox(id, { text: '' })
        setTimeout(() => setEditingBoxId(id), 50)
      }
    } catch {
      updateBox(id, { text: '' })
      setTimeout(() => setEditingBoxId(id), 50)
    }
  }

  const handleAddProductCard = () => {
    const id = `card-${Date.now()}`
    const card: FreeProductCard = {
      id,
      productId: allProducts[0]?.id ?? '',
      xRel: 0.04,
      yRel: 0.6,
      widthRel: 0.44,
      heightRel: 0.28,
    }
    setFreeProductCards((prev) => [...prev, card])
    setSelectedCardId(id)
  }

  // Initialize main text box on mount
  useEffect(() => {
    let initialized = false
    const observer = new ResizeObserver((entries) => {
      const { width: W, height: H } = entries[0].contentRect
      if (W < 50 || H < 50) return
      if (!initialized) {
        initialized = true
        setFreeTextBoxes([
          {
            id: 'main-text',
            text: heading,
            xRel: (1 - 0.88) / 2,
            yRel: 0.46,
            fontSizeRel: 0.055,
            color: '#FFFFFF',
            fontFamily: getFontFamilyById(selectedFont),
            textAlign: 'center',
            boxWidthRel: 0.88,
          },
        ])
      }
    })
    const el = assetFrameRef.current
    if (el) observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync main-text when heading changes
  useEffect(() => {
    updateBox('main-text', { text: heading })
  }, [heading])

  // Sync font when selectedFont changes
  useEffect(() => {
    const family = getFontFamilyById(selectedFont)
    if (!family) return
    setFreeTextBoxes((prev) => {
      if (!prev.some((b) => b.id === 'main-text')) return prev
      return prev.map((b) => (b.id === 'main-text' ? { ...b, fontFamily: family } : b))
    })
  }, [selectedFont])
  // Keyboard shortcuts for text boxes (Delete/Backspace/Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingBoxId) return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId) {
        e.preventDefault()
        setFreeTextBoxes((prev) => prev.filter((b) => b.id !== selectedBoxId))
        setSelectedBoxId(null)
      }
      if (e.key === 'Escape') {
        setSelectedBoxId(null)
        setEditingBoxId(null)
        setSelectedElement(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedBoxId, editingBoxId])

  // Deselect when clicking outside canvas
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Only act if something is actually selected
      if (!selectedBoxId && !selectedElement) return

      const target = e.target as HTMLElement

      // Never deselect when clicking inside the asset frame or its toolbars
      if (
        target.closest(
          '[data-handle], .selection-toolbar, .canvas-top-toolbar, .float-window, .font-selector-portal'
        )
      )
        return

      // Only keep selection if clicking inside the actual asset frame (not the surrounding area)
      const frame = assetFrameRef.current
      if (frame && frame.contains(target)) return

      // Everything else — area cinza, sidebar, buttons outside canvas — deselects
      setSelectedBoxId(null)
      setEditingBoxId(null)
      setSelectedElement(null)
      setEditingElement(null)
      setToneDropdownFor(null)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [selectedBoxId, selectedElement])

  // Overlay state
  const [overlayType, setOverlayType] = useState<'gradient' | 'solid'>('gradient')
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [overlayColor, setOverlayColor] = useState('#000000')
  const [overlayPosition, setOverlayPosition] = useState<'bottom' | 'top' | 'full'>('bottom')
  const [overlayPresetsOpen, setOverlayPresetsOpen] = useState(false)

  const applyOverlayPreset = (preset: (typeof OVERLAY_PRESETS)[0]) => {
    setOverlayType(preset.type)
    setOverlayColor(preset.color)
    setOverlayOpacity(preset.opacity)
    setOverlayPosition(preset.position)
    setOverlayPresetsOpen(false)
  }

  const fontFamily =
    FONT_OPTIONS.find((f) => f.id === selectedFont)?.family || "'Inter', sans-serif"

  // Product Attributes
  const [showAttributes, setShowAttributes] = useState(false)
  const [attributesLanguage, setAttributesLanguage] = useState<'pt' | 'en' | 'es'>('pt')
  const [attributes, setAttributes] = useState<ProductAttribute[]>([])
  const [attributePosition, setAttributePosition] = useState<'left' | 'right'>('left')
  const [isGeneratingAttributes, setIsGeneratingAttributes] = useState(false)

  // Product — NO fallback to allProducts[0] to avoid auto-selecting demo products
  const initialProduct = allProducts.find((p) => p.name === data.product) ?? null
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    initialProduct ? [initialProduct.id] : []
  )
  const activeProduct = allProducts.find((p) => p.id === selectedProducts[0]) ?? null
  const activeProductName = activeProduct?.name?.trim() || ''

  const addAttribute = () =>
    setAttributes((prev) => [...prev, { id: Date.now().toString(), icon: '', label: '' }])
  const removeAttribute = (i: number) => setAttributes((prev) => prev.filter((_, idx) => idx !== i))
  const updateAttribute = (i: number, field: 'icon' | 'label', value: string) =>
    setAttributes((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)))

  const handleGenerateAttributes = useCallback(
    async (lang: 'pt' | 'en' | 'es' = attributesLanguage) => {
      const _activeProduct = allProducts.find((p) => p.id === selectedProducts[0]) ?? null
      const _productName = _activeProduct?.name?.trim() || ''
      setIsGeneratingAttributes(true)
      try {
        const { data: fnData, error } = await supabase.functions.invoke('generate-copy', {
          body: {
            action: 'generate-attributes',
            field: 'attributes',
            tone: storeCtx?.tone ?? selectedStyleId ?? 'direto',
            language: lang,
            campaign: {
              title:
                imagePrompt?.slice(0, 120) ||
                currentSessionTitle ||
                _activeProduct?.name ||
                'criativo',
              product: _productName,
              visualContext: visualContextRef.current,
              context: imagePrompt ? `Imagem gerada com: ${imagePrompt.slice(0, 200)}` : undefined,
              brandContext: brandContextBody,
            },
          },
        })
        if (error) throw error
        if (fnData?.attributes?.length) {
          setAttributes(fnData.attributes)
          setShowAttributes(true)
        }
      } catch (err) {
        console.error('Generate attributes error:', err)
        toast.error('Erro ao gerar atributos')
      } finally {
        setIsGeneratingAttributes(false)
      }
    },
    [attributesLanguage, selectedStyleId, allProducts, selectedProducts]
  )

  const [productSelectorOpen, setProductSelectorOpen] = useState(false)
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(
    data.productImageUrl || initialProduct?.image || ''
  )
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover')
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 }) // percent
  const [imageScale, setImageScale] = useState(100) // percent
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [imgGallery, setImgGallery] = useState<{ id: string; url: string }[]>(
    () => data.restoreGallery ?? []
  )
  const [activeGalleryId, setActiveGalleryId] = useState<string | null>(
    () => data.restoreActiveGalleryId ?? null
  )
  const [canvasVariations, setCanvasVariations] = useState<
    { id: string; url: string; label?: string }[]
  >([])
  const [showThumbnailStrip, setShowThumbnailStrip] = useState(false)
  const [activeVariationId, setActiveVariationId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  type EmptyCategory = 'image' | 'video' | 'carousel' | 'copy' | null
  const [activeEmptyCategory, setActiveEmptyCategory] = useState<EmptyCategory>(null)
  const toggleEmptyCategory = (id: EmptyCategory) =>
    setActiveEmptyCategory((prev) => (prev === id ? null : id))
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false)
  const [generatingLabel, setGeneratingLabel] = useState('')
  const [isChatExecuting, setIsChatExecuting] = useState(false)
  const [chatExecutingLabel, setChatExecutingLabel] = useState('')
  const [activeSlide, setActiveSlide] = useState(0)
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasColumnRef = useRef<HTMLDivElement>(null)
  const assetFrameRef = useRef<HTMLDivElement>(null)
  const canvasImageRef = useRef<HTMLDivElement>(null)

  // Carousel generation state
  interface CarouselSlide {
    id: string
    heading: string
    description: string
    cta?: string | null
    image?: string
    product?: string
    role: 'hook' | 'benefit' | 'proof' | 'product' | 'cta'
  }
  const [generatedCarouselSlides, setGeneratedCarouselSlides] = useState<CarouselSlide[]>([])
  const [carouselSetupOpen, setCarouselSetupOpen] = useState(false)
  const [slideCountMode, setSlideCountMode] = useState<'auto' | 'manual'>('auto')
  const [slideCount, setSlideCount] = useState(5)
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false)
  // Image prompt
  // ── Store context from Knowledge Base ──
  const storeCtx = useMemo(() => loadStoreContext(), [])
  const kbInline = useMemo(() => buildKBInline(storeCtx), [storeCtx])
  const brandContextBody = useMemo(() => buildBrandContextBody(storeCtx), [storeCtx])

  // E-commerce backend discriminator (spec 069). Forwarded into `creativeState`
  // on every chat turn so the studio-chat edge function knows whether to allow
  // Composio Shopify suggestions or to keep them suppressed (Nuvemshop wins).
  const studioSession = useStudioSession()
  const [ecommerceKind, setEcommerceKind] = useState<'nuvemshop' | 'shopify-composio' | null>(null)
  // Most recent product photo URL surfaced by a snew_nuvemshop_api call.
  // When the user then asks the studio to generate an image / campaign, we
  // feed this URL into Gemini as a reference so the generation preserves
  // the real product (color, print, cut) instead of hallucinating a new one.
  // Mirror in a ref because dispatch may run snew_nuvemshop_api and
  // generate_image in the SAME async loop — setState wouldn't propagate
  // through generateImageWithPrompt's closure in time.
  const [chatProductImageUrl, setChatProductImageUrl] = useState<string | null>(null)
  const chatProductImageUrlRef = useRef<string | null>(null)

  // Spec 070: real store products surfaced in the inline `pick-product` card
  // (feed/chat sidebar). Lives alongside the hardcoded `allProducts` seeds
  // so a connected store gets REAL products in the chat flow, while
  // disconnected teams keep the demo seeds working.
  const realStoreProductsQuery = useQuery({
    queryKey: ['studio-products', 'chat-sidebar'],
    queryFn: async () => {
      const res = await fetch('/api/studio/products?page=1&per_page=8', {
        credentials: 'include',
      })
      if (!res.ok) return { products: [] as Array<{ id: string; name: string; image: string }> }
      const d = (await res.json()) as {
        products?: Array<{ id: string; name: string; image: string | null }>
      }
      return {
        products: (d.products ?? [])
          .filter((p) => !!p.image)
          .map((p) => ({ id: p.id, name: p.name, image: p.image as string })),
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
  const realStoreProducts = realStoreProductsQuery.data?.products ?? []

  // Spec 070: when the user picks a product in the studio product picker,
  // the session context's `activeProduct` changes. Mirror that selection
  // into the three legacy state fields so every existing generation path
  // (generateImageWithPrompt, carousel, video, canvas render) sees a single
  // source of truth.
  const sessionActiveProduct = studioSession.activeProduct
  useEffect(() => {
    if (sessionActiveProduct) {
      if (sessionActiveProduct.image) {
        setActiveImageUrl(sessionActiveProduct.image)
        chatProductImageUrlRef.current = sessionActiveProduct.image
        setChatProductImageUrl(sessionActiveProduct.image)
      }
      setSelectedProducts([sessionActiveProduct.id])
    } else {
      chatProductImageUrlRef.current = null
      setChatProductImageUrl(null)
      setSelectedProducts([])
    }
    // Intentionally narrow deps to the session product so unrelated state
    // updates don't re-fire this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActiveProduct?.id, sessionActiveProduct?.image])

  useEffect(() => {
    let cancelled = false
    fetch('/api/studio/ecommerce', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { kind: null }))
      .then((data: { kind: 'nuvemshop' | 'shopify-composio' | null }) => {
        if (!cancelled) setEcommerceKind(data?.kind ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const buildAutoPrompt = useCallback(() => {
    const currentProduct = allProducts.find((p) => p.id === selectedProducts[0]) ?? null
    const product = currentProduct?.name ?? activeProductName ?? ''

    const campaign = activeCampaign?.title ?? data.campaignTitle ?? ''
    const campaignLower = campaign.toLowerCase()

    if (!product && !campaign) return kbInline ? kbInline.trim() : ''

    const themePrompts: Record<string, string> = {
      natal: `${product}, cena natalina aconchegante, luz quente, decoração sutil`,
      'chá de revelação': `${product}, cena suave e delicada, balões e flores, tons pastel`,
      nascimento: `${product}, ambiente clean e acolhedor, luz natural suave`,
      'dia das mães': `${product}, lifestyle emocional, mãe e bebê, luz golden hour`,
      'dia dos pais': `${product}, cena afetiva, pai e bebê, ambiente familiar`,
      'black friday': `${product}, composição clean e impactante, fundo escuro premium`,
      lançamento: `${product}, hero shot clean, fundo neutro, produto em destaque`,
      liquidação: `${product}, ambiente vibrante, destaque visual do produto`,
      páscoa: `${product}, cena primaveril, flores e luz natural`,
      aniversário: `${product}, celebração festiva, cores alegres e calorosas`,
    }

    const matchedKey = Object.keys(themePrompts).find((key) => campaignLower.includes(key))
    const base = matchedKey
      ? themePrompts[matchedKey]
      : `${product}, lifestyle photography, soft natural light, clean background, warm tones`

    return `${base}${kbInline}`
  }, [
    allProducts,
    selectedProducts,
    activeProductName,
    data.campaignTitle,
    activeCampaign?.title,
    kbInline,
  ])

  // ── Product Features Mode ──
  interface ProductFeature {
    id: string
    label: string
    sublabel?: string
    anchor: { x: number; y: number }
    labelSide: 'left' | 'right'
  }
  const [featuresMode, setFeaturesMode] = useState(false)
  const [productFeatures, setProductFeatures] = useState<ProductFeature[]>([])
  const [featureAnnotStyle, setFeatureAnnotStyle] = useState<'technical' | 'editorial'>('technical')
  const [isGeneratingFeatures, setIsGeneratingFeatures] = useState(false)

  const [imagePrompt, setImagePrompt] = useState<string>('')

  const [useAiPrompt, setUseAiPrompt] = useState(true)
  const [useProductReference, setUseProductReference] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-image-preview')
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const currentModel = IMAGE_MODELS.find((m) => m.id === selectedModel) || IMAGE_MODELS[1]

  // Combine images mode
  const [imageMode, setImageMode] = useState<'generate' | 'combine'>('generate')
  const [combineImg1, setCombineImg1] = useState<string | null>(null)
  const [combineImg2, setCombineImg2] = useState<string | null>(null)
  const [combineScene, setCombineScene] = useState<'neutral' | 'lifestyle' | 'studio' | 'outdoor'>(
    'neutral'
  )
  const [combinePrompt, setCombinePrompt] = useState('')
  const [combineProductPicker1, setCombineProductPicker1] = useState(false)
  const [combineProductSearch, setCombineProductSearch] = useState('')
  const [selectedCombineProduct, setSelectedCombineProduct] = useState<
    (typeof allProducts)[0] | null
  >(null)
  const combineFileRef1 = useRef<HTMLInputElement>(null)
  const combineFileRef2 = useRef<HTMLInputElement>(null)
  const combinePickerRef = useRef<HTMLDivElement>(null)

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (combinePickerRef.current && !combinePickerRef.current.contains(e.target as Node))
        setCombineProductPicker1(false)
    }
    if (combineProductPicker1) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [combineProductPicker1])

  // Init img1 with active product when entering combine mode
  useEffect(() => {
    if (imageMode === 'combine' && !combineImg1) {
      const activeP = allProducts.find((p) => p.id === selectedProducts[0] && p.image)
      if (activeP) {
        setCombineImg1(activeP.image)
        setSelectedCombineProduct(activeP)
      }
    }
  }, [imageMode])

  const SCENE_OPTIONS = [
    { id: 'neutral' as const, label: 'Fundo neutro' },
    { id: 'lifestyle' as const, label: 'Lifestyle' },
    { id: 'studio' as const, label: 'Studio' },
    { id: 'outdoor' as const, label: 'Ambiente externo' },
  ]

  const SCENE_DESCRIPTIONS: Record<string, string> = {
    neutral: 'clean neutral background, soft studio lighting, product hero shot',
    lifestyle: 'lifestyle scene, natural light, real environment, authentic moment',
    studio: 'professional studio setup, controlled lighting, commercial photography',
    outdoor: 'outdoor natural environment, golden hour, ambient lighting',
  }

  // Float windows
  const [imageGeneratorOpen, setImageGeneratorOpen] = useState(false)
  const [floatModelOpen, setFloatModelOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [imageStyleAccordionOpen, setImageStyleAccordionOpen] = useState(true)
  const [copyAccordionOpen, setCopyAccordionOpen] = useState(false)

  // Sub-panel state for image generator redesign
  type SubPanelId =
    | 'model'
    | 'product'
    | 'style'
    | 'reference'
    | 'heading'
    | 'description'
    | 'cta'
    | null
  const [activeSubPanel, setActiveSubPanel] = useState<SubPanelId>(null)
  const toggleSubPanel = (id: SubPanelId) => setActiveSubPanel((prev) => (prev === id ? null : id))

  // Reference images state
  interface ReferenceImage {
    id: string
    dataUrl: string
    base64: string
    mimeType: string
  }
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [conceptStyle, setConceptStyle] = useState('editorial')
  const [imageGenCount, setImageGenCount] = useState(1)
  const refFileInput = useRef<HTMLInputElement>(null)
  const removeReferenceImage = (id: string) =>
    setReferenceImages((prev) => prev.filter((r) => r.id !== id))

  // Image edit mini sidebar
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<string | null>(null)
  const [overlayEditorOpen, setOverlayEditorOpen] = useState(false)
  const [styleSelectorOpen, setStyleSelectorOpen] = useState(false)
  const [styleFilter, setStyleFilter] = useState('all')
  const [channelSelectorOpen, setChannelSelectorOpen] = useState(false)
  const [typographyOpen, setTypographyOpen] = useState(false)
  const [attributesOpen, setAttributesOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [widgetsOpen, setWidgetsOpen] = useState(false)

  // ── Float window hooks (drag + click-outside) ──
  const closeProduct = useCallback(() => setProductSelectorOpen(false), [])
  const closeOverlay = useCallback(() => {
    setOverlayEditorOpen(false)
    setActiveSidebarPanel(null)
  }, [])
  const closeChannel = useCallback(() => {
    setChannelSelectorOpen(false)
    setActiveSidebarPanel(null)
  }, [])
  const closeTypo = useCallback(() => {
    setTypographyOpen(false)
    setActiveSidebarPanel(null)
  }, [])
  const closeAttrs = useCallback(() => {
    setAttributesOpen(false)
    setActiveSidebarPanel(null)
  }, [])
  const closeVideo = useCallback(() => {
    setVideoOpen(false)
    setActiveSidebarPanel(null)
  }, [])
  const closeWidgets = useCallback(() => {
    setWidgetsOpen(false)
    setActiveSidebarPanel(null)
  }, [])

  const imageGenRef = useRef<HTMLDivElement>(null)

  // Click outside to close image generator panel
  useEffect(() => {
    if (!imageGeneratorOpen) return
    const handler = (e: MouseEvent) => {
      if (!imageGenRef.current) return
      if (imageGenRef.current.contains(e.target as Node)) return
      setImageGeneratorOpen(false)
      setActiveSubPanel(null)
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [imageGeneratorOpen])

  const fw_product = useFloatWindow({ onClose: closeProduct, enabled: productSelectorOpen })
  const fw_overlay = useFloatWindow({ onClose: closeOverlay, enabled: overlayEditorOpen })
  const fw_channel = useFloatWindow({ onClose: closeChannel, enabled: channelSelectorOpen })
  const fw_typo = useFloatWindow({ onClose: closeTypo, enabled: typographyOpen })
  const fw_attrs = useFloatWindow({ onClose: closeAttrs, enabled: attributesOpen })
  const fw_video = useFloatWindow({ onClose: closeVideo, enabled: videoOpen })
  const fw_widgets = useFloatWindow({ onClose: closeWidgets, enabled: widgetsOpen })

  // ── Board mode ──
  interface BoardAsset {
    id: string
    imageUrl: string
    x: number
    y: number
    width: number
    height: number
    label?: string
    channel?: string
    isDragging?: boolean
    type?: 'image' | 'video' | 'document'
    documentExcerpt?: string
    documentMarkdown?: string
  }
  const [boardMode, setBoardMode] = useState(!!initialBoardMode)
  const [boardOffset, setBoardOffset] = useState({ x: 0, y: 0 })
  const [boardScale, setBoardScale] = useState(1)
  const [boardIsPanning, setBoardIsPanning] = useState(false)
  const boardPanStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const boardRef = useRef<HTMLDivElement>(null)
  const [boardAssets, setBoardAssets] = useState<BoardAsset[]>([])
  const boardDragRef = useRef<{
    id: string
    startX: number
    startY: number
    ax: number
    ay: number
  } | null>(null)

  // Image styles — imported from shared config

  // ── Commercial Product: async Gemini analysis + keyword fallback ──
  const buildCommercialPrompt = useCallback(
    async ({
      productName,
      productDescription,
      brandName,
      imageBase64,
    }: {
      productName: string
      productDescription?: string
      brandName?: string
      imageBase64?: string
    }): Promise<string> => {
      if (imageBase64) {
        try {
          const { data: analysisData, error } = await supabase.functions.invoke('gemini-generate', {
            body: {
              prompt: `Analyze this product image and respond ONLY with a JSON object. No other text.
{
  "dominantColor": "one color name that would make a great solid background (e.g. 'warm terracotta', 'vibrant lemon yellow', 'sage green', 'dusty rose', 'burnt orange', 'deep teal', 'warm sand')",
  "sceneElements": "3-5 natural props that relate to this product's ingredients, materials, or use case — be specific (e.g. 'fresh orange slices, dried lavender stems, smooth white river stones')",
  "mood": "one word: fresh / warm / luxurious / energetic / minimal / organic"
}`,
              model: 'gemini-3.1-flash-image-preview',
              images: [imageBase64],
              responseType: 'text',
            },
          })
          if (!error && analysisData?.text) {
            const jsonMatch = analysisData.text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              const { dominantColor, sceneElements, mood } = parsed
              return [
                `Commercial product photography of ${productName}.`,
                `Solid ${dominantColor} background — clean, no gradients, no texture.`,
                `Product placed slightly off-center as the absolute hero of the composition.`,
                `Scene elements arranged around the product: ${sceneElements}.`,
                `Every prop placed with deliberate intention — editorial composition, nothing random.`,
                `Directional warm light from above-left, casting soft intentional shadows.`,
                mood === 'luxurious' ? 'Rich deep shadows, high contrast, premium feel.' : '',
                mood === 'fresh' ? 'Bright airy light, crisp shadows, clean energy.' : '',
                mood === 'warm' ? 'Golden warm light, soft shadows, inviting atmosphere.' : '',
                `Rich saturated color grade matching the ${dominantColor} background.`,
                `Slight 3/4 overhead angle, product fully sharp and in focus.`,
                `Background elements in soft bokeh, shallow depth of field.`,
                `High-end commercial photography quality, magazine-worthy.`,
                productDescription ? `Product: ${productDescription}.` : '',
                brandName ? `Brand: ${brandName}.` : '',
              ]
                .filter(Boolean)
                .join('\n')
            }
          }
        } catch {
          /* fallthrough to keyword fallback */
        }
      }

      const combined = `${productName} ${productDescription ?? ''}`.toLowerCase()
      const elementMap: Array<{ keywords: string[]; color: string; elements: string }> = [
        {
          keywords: ['perfume', 'fragrance', 'parfum', 'cologne', 'eau de'],
          color: 'warm amber orange',
          elements:
            'fresh citrus halves, smooth river stones, dried flower petals, green botanical stems',
        },
        {
          keywords: ['skincare', 'serum', 'creme', 'moisturizer', 'facial', 'skin'],
          color: 'sage green',
          elements:
            'fresh tropical leaves, water droplets on glass, smooth white stones, aloe vera leaf',
        },
        {
          keywords: ['shampoo', 'conditioner', 'hair', 'cabelo'],
          color: 'dusty rose',
          elements: 'dried botanicals, silk ribbon, smooth oval stones, fresh eucalyptus sprigs',
        },
        {
          keywords: ['energético', 'energy drink', 'bebida', 'drink', 'suco', 'juice'],
          color: 'vibrant lemon yellow',
          elements: 'fresh citrus slices, ice cubes, mint sprigs, bright citrus zest curls',
        },
        {
          keywords: ['suplemento', 'vitamina', 'supplement', 'protein', 'whey'],
          color: 'clean white with warm shadow',
          elements: 'fresh berries, green leaves, wooden surface details, scattered seeds',
        },
        {
          keywords: ['candle', 'vela', 'diffuser', 'aroma'],
          color: 'warm terracotta',
          elements: 'dried sage bundles, smooth pebbles, dried orange slices, cotton stems',
        },
        {
          keywords: ['food', 'alimento', 'snack', 'chocolate', 'café', 'coffee'],
          color: 'warm burnt orange',
          elements: 'roasted coffee beans, cinnamon sticks, dark chocolate shards, dried figs',
        },
        {
          keywords: ['baby', 'bebê', 'infantil', 'criança'],
          color: 'soft warm cream',
          elements:
            'soft cotton fabric, dried chamomile flowers, smooth wooden beads, pastel ribbon',
        },
        {
          keywords: ['moda', 'fashion', 'roupa', 'clothing', 'bolsa', 'bag', 'shoes', 'sapato'],
          color: 'deep slate blue',
          elements:
            'polished smooth stones, dried pampas grass, architectural concrete blocks, minimal geometric props',
        },
      ]
      const kwMatch = elementMap.find((e) => e.keywords.some((kw) => combined.includes(kw)))
      const { color, elements } = kwMatch ?? {
        color: 'warm neutral sand',
        elements:
          'smooth river stones, dried botanical stems, fresh green leaves, geometric marble block',
      }

      return [
        `Commercial product photography of ${productName}.`,
        `Solid ${color} background — clean, no gradients, no texture.`,
        `Product placed slightly off-center as the absolute hero of the composition.`,
        `Scene elements arranged around the product: ${elements}.`,
        `Every prop placed with deliberate intention — editorial composition, nothing random.`,
        `Directional warm light from above-left, casting soft intentional shadows.`,
        `Rich saturated color grade matching the background tone.`,
        `Slight 3/4 overhead angle, product fully sharp and in focus.`,
        `Background elements in soft bokeh, shallow depth of field.`,
        `High-end commercial photography quality, magazine-worthy.`,
        productDescription ? `Product: ${productDescription}.` : '',
        brandName ? `Brand: ${brandName}.` : '',
      ]
        .filter(Boolean)
        .join('\n')
    },
    []
  )

  const styleCategories = [
    {
      id: 'photo',
      label: 'PRODUTO ISOLADO',
      styles: ['ecommerce-photography', 'advertising-product', 'packshot'],
    },
    {
      id: 'person',
      label: 'COM PESSOA',
      styles: ['advertising-portrait', 'fashion-on-model', 'ghost-mannequin', 'product-lifestyle'],
    },
    { id: 'composition', label: 'COMPOSIÇÃO', styles: ['flat-lay-editorial', 'unboxing'] },
    {
      id: 'detail',
      label: 'DETALHE',
      styles: ['material-detail', 'product-attributes', 'product-infographic'],
    },
    { id: 'campaign', label: 'CAMPANHA', styles: ['pop-illustration'] },
  ]

  const [imageStyles, setImageStyles] = useState<ImageStyleOption[]>(loadImageStyles)
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyleOption | null>(
    () =>
      loadImageStyles().find((s) => s.id === 'ecommerce-photography') ??
      loadImageStyles()[0] ??
      null
  )

  // Style prompt is now built at generation time — no useEffect needed

  const [videoMode, setVideoMode] = useState<'animate' | 'ai'>('animate')
  const [selectedVideoPreset, setSelectedVideoPreset] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(8)
  const [videoPreviewPlaying, setVideoPreviewPlaying] = useState(false)
  const [videoExporting, setVideoExporting] = useState(false)
  const [videoPrompt, setVideoPrompt] = useState('')
  const [useAiVideoPrompt, setUseAiVideoPrompt] = useState(true)
  const [aiVideoDuration, setAiVideoDuration] = useState(10)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)

  const isVideoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false
    return (
      /\.(mp4|webm|mov)/i.test(url) ||
      url.includes('fal.media') ||
      url.includes('fal.run') ||
      (url.includes('video') && !url.includes('image'))
    )
  }
  const [selectedVideoModel, setSelectedVideoModel] = useState<AIVideoModelId>('kling-3.0')
  const [videoGeneratingLabel, setVideoGeneratingLabel] = useState('')
  const [videoError, setVideoError] = useState<string | null>(null)

  // Publish / Schedule modals
  const [publishOpen, setPublishOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [currentLegenda, setCurrentLegenda] = useState('')
  const [currentPlatform, setCurrentPlatform] = useState('')
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const chatPanelRef = useRef<StudioChatPanelRef>(null)

  // ── Qualification flow state ──
  type QualStep = 'product' | 'channel' | 'style' | 'generate'
  const [qualificationState, setQualificationState] = useState<{
    active: boolean
    step: QualStep
    answers: Record<string, string>
    basePrompt: string
    hasStyle: boolean
    hasChannel: boolean
    hasProduct: boolean
  } | null>(null)
  const generateRef =
    useRef<(prompt: string, count?: number, style?: ImageStyleOption | null) => Promise<void>>(
      undefined
    )

  const finalizeGeneration = useCallback(
    (answers: Record<string, string>) => {
      const base = answers.basePrompt ?? imagePrompt ?? buildAutoPrompt()
      const product = answers.product ?? activeProductName ?? ''
      const channel = answers.channel ?? ''
      const style = answers.style ?? ''

      const channelRatioMap: Record<string, string> = {
        'Feed 1:1': '1:1',
        'Stories 9:16': '9:16',
        'Reels vertical': '9:16',
        Reels: '9:16',
        LinkedIn: '1:1',
        Pinterest: '2:3',
      }
      const targetRatio = channelRatioMap[channel]
      if (targetRatio) {
        const ratio = ASPECT_RATIOS.find((r) => r.id === targetRatio)
        if (ratio) setSelectedRatio(ratio)
      }

      const enriched = [
        base,
        product && !base.toLowerCase().includes(product.toLowerCase())
          ? `Product: ${product}.`
          : '',
        channel && channel !== '→ Gerar agora' ? `Optimized for ${channel}.` : '',
        style && style !== '→ Gerar agora' ? `Visual style: ${style}.` : '',
      ]
        .filter(Boolean)
        .join(' ')

      setImagePrompt(enriched)
      setQualificationState(null)
      setTimeout(() => generateRef.current?.(enriched), 100)
    },
    [activeProductName, imagePrompt, buildAutoPrompt, setSelectedRatio]
  )

  const pushChannelQuestionRef = useRef<(basePrompt: string) => void>(() => {})
  const pushStyleQuestionRef = useRef<(basePrompt: string) => void>(() => {})
  const pushProductQuestionRef = useRef<() => void>(() => {})

  // These refs are updated after applyArtStyle is declared (see useEffect below)

  const getNextStep = useCallback(
    (currentStep: QualStep, hasChannel: boolean, hasStyle: boolean): QualStep => {
      if (currentStep === 'product') {
        if (!hasChannel) return 'channel'
        if (!hasStyle) return 'style'
        return 'generate'
      }
      if (currentStep === 'channel') {
        if (!hasStyle) return 'style'
        return 'generate'
      }
      return 'generate'
    },
    []
  )

  const handleQualificationAnswer = useCallback(
    (answer: string) => {
      if (!qualificationState) return

      const { step, answers, hasStyle, hasChannel, hasProduct, basePrompt } = qualificationState

      // Accumulate answer with named key
      const updatedAnswers = { ...answers, [step]: answer }

      // Mark this dimension as resolved
      const updatedHasProduct = hasProduct || step === 'product'
      const updatedHasChannel = hasChannel || step === 'channel'
      const updatedHasStyle = hasStyle || step === 'style'

      const nextStep = getNextStep(step, updatedHasChannel, updatedHasStyle)

      if (nextStep === 'generate') {
        finalizeGeneration(updatedAnswers)
        setQualificationState(null)
        return
      }

      const updatedState = {
        active: true as const,
        step: nextStep,
        answers: updatedAnswers,
        basePrompt,
        hasStyle: updatedHasStyle,
        hasChannel: updatedHasChannel,
        hasProduct: updatedHasProduct,
      }
      setQualificationState(updatedState)

      setTimeout(() => {
        if (nextStep === 'product') pushProductQuestionRef.current()
        else if (nextStep === 'channel') pushChannelQuestionRef.current(basePrompt)
        else if (nextStep === 'style') pushStyleQuestionRef.current(basePrompt)
      }, 100)
    },
    [qualificationState, finalizeGeneration, getNextStep]
  )

  const startQualification = useCallback(
    (
      basePrompt: string,
      options?: {
        hasStyle?: boolean
        hasChannel?: boolean
        channelAnswer?: string
        hasProduct?: boolean
        productAnswer?: string
      }
    ) => {
      const skipKeywords = /gerar agora|pode gerar|gera aí|sem perguntas|gera agora/i
      if (skipKeywords.test(basePrompt)) {
        generateRef.current?.(basePrompt)
        return
      }

      // Tool / workspace intent: skip canvas qualification and let the AI
      // handle it (it'll emit snew_* actions).
      const toolIntent =
        /publicar|publique|postar|poste|envie|enviar|compartilhar|conectar?|conecta|instagram|meta|shopify|tiktok|youtube|linkedin|twitter|pinterest|whatsapp|vendas|estoque|pedidos|receita|faturamento|calend[aá]rio sazonal|brand dna|copywriter|preç|pricing|churn|audit/i
      if (toolIntent.test(basePrompt)) {
        chatPanelRef.current?.sendMessage?.(basePrompt)
        return
      }

      const promptHasProduct =
        activeProductName?.trim() ||
        /produto|product|tênis|roupa|bolsa|perfume|skin|suplemento|body|macacão|vestido|camisa/i.test(
          basePrompt
        )
      const promptHasChannel =
        /feed|stories|reels|linkedin|9:16|1:1|vertical|horizontal|pinterest/i.test(basePrompt)

      const hasProduct = options?.hasProduct ?? !!promptHasProduct
      const hasChannel = options?.hasChannel ?? promptHasChannel
      const hasStyle = options?.hasStyle ?? false

      // Build initial answers from known data
      const initialAnswers: Record<string, string> = { basePrompt }
      if (options?.channelAnswer) initialAnswers.channel = options.channelAnswer
      if (options?.productAnswer) initialAnswers.product = options.productAnswer
      if (activeProductName?.trim()) initialAnswers.product = activeProductName

      // Determine first needed step
      const firstNeeded: QualStep = !hasProduct
        ? 'product'
        : !hasChannel
          ? 'channel'
          : !hasStyle
            ? 'style'
            : 'generate'

      if (firstNeeded === 'generate') {
        finalizeGeneration(initialAnswers)
        return
      }

      setQualificationState({
        active: true,
        step: firstNeeded,
        answers: initialAnswers,
        basePrompt,
        hasStyle,
        hasChannel,
        hasProduct,
      })

      setTimeout(() => {
        if (firstNeeded === 'product') pushProductQuestionRef.current()
        else if (firstNeeded === 'channel') pushChannelQuestionRef.current(basePrompt)
        else if (firstNeeded === 'style') pushStyleQuestionRef.current(basePrompt)
      }, 100)
    },
    [activeProductName, finalizeGeneration, data.styleId]
  )

  const pushActivity = useCallback(
    (
      action: string,
      title: string,
      description: string,
      suggestions: { id: string; label: string; action: string }[],
      imageThumb?: string
    ) => {
      chatPanelRef.current?.pushActivity(action, title, description, suggestions, imageThumb)
    },
    []
  )

  const handleSuggestionActionRef = useRef<(action: string) => void>(() => {})
  useEffect(() => {
    handleSuggestionActionRef.current = (action: string) => {
      // Connect-app button in activity card → open Composio hosted auth as POPUP
      // (not a new tab) so the user stays on the studio page.
      if (action.startsWith('__connect_url:')) {
        const url = action.slice('__connect_url:'.length)
        try {
          const width = 520
          const height = 720
          const left = window.screenX + (window.outerWidth - width) / 2
          const top = window.screenY + (window.outerHeight - height) / 2
          window.open(
            url,
            'composio-connect',
            `popup=yes,width=${width},height=${height},left=${left},top=${top},noopener`
          )
        } catch {
          /* ignore */
        }
        return
      }
      switch (action) {
        case 'open_image_gen':
          startQualification('Gerar imagem com IA')
          break
        case 'open_image_gen_with_product':
          setUseProductReference(true)
          startQualification('Gerar imagem com IA para o produto')
          break
        case 'generate_lifestyle': {
          const lifestylePrompt = `${activeProductName}, lifestyle photography, warm natural light, emotional, authentic moment, soft background`
          setImagePrompt(lifestylePrompt)
          generateImageWithPrompt(lifestylePrompt)
          break
        }
        case 'generate_carousel':
          setIsCarouselMode(true)
          setCarouselSetupOpen(true)
          break
        case 'open_image_edit':
          setIsEditingImage(true)
          break
        case 'open_publish':
          setPublishOpen(true)
          break
        case 'open_schedule':
          setScheduleOpen(true)
          break
        case 'open_scan':
          setScannerOpen(true)
          break
        case 'open_calendar':
          window.location.href = '/studio/calendar'
          break
        case 'new_asset':
          setActiveImageUrl(null)
          setFreeTextBoxes([])
          break
        case 'regenerate_image':
          handleGenerateImage()
          break
        case 'open_gen_panel':
          setGenPanelOpen(true)
          break
        case 'save_asset':
          handleSave()
          break
        case 'show_text':
          setHeadingVisible(true)
          setOverlayOpacity(0.3)
          setActiveSidebarPanel('typography')
          break
        case 'feedback_like':
          toast.success('ótimo! imagem salva como favorita.')
          saveToHistory()
          break
        case 'feedback_dislike':
          toast.info('entendido. gerando uma nova versão...')
          setTimeout(() => generateImageWithPrompt(imagePrompt), 300)
          break
        case 'generate_email':
          setActiveSidebarPanel('copy')
          setCopyAccordionOpen(true)
          toast.info('abrindo gerador de e-mail...')
          break
        case 'generate_caption': {
          const captionProduct = activeProduct?.name?.trim() || ''
          const captionChannel = selectedRatio?.sublabel ?? 'Instagram'
          supabase.functions
            .invoke('generate-copy', {
              body: {
                action: 'auto-generate',
                field: 'caption',
                tone: 'emocional',
                campaign: {
                  title: activeCampaign?.title ?? '',
                  product: captionProduct,
                  channel: `${captionChannel} — legenda natural, máximo 150 caracteres, sem hashtags`,
                  context: visualContextRef?.current ?? '',
                  brandContext: brandContextBody,
                },
              },
            })
            .then(({ data: fnData }) => {
              const text = fnData?.caption ?? fnData?.heading ?? ''
              if (text) {
                const id = `caption-${Date.now()}`
                setFreeTextBoxes((prev) => [
                  ...prev,
                  {
                    id,
                    text,
                    xRel: 0.06,
                    yRel: 0.78,
                    fontSizeRel: 0.028,
                    color: '#FFFFFF',
                    fontFamily: getFontFamilyById(selectedFont),
                    textAlign: 'center' as const,
                    boxWidthRel: 0.88,
                  },
                ])
                setHeadingVisible(true)
                setOverlayOpacity(0.3)
                toast.success('legenda gerada!')
              }
            })
          break
        }
        case 'open_style_variant':
          setStyleSelectorOpen(true)
          setActiveSidebarPanel('style')
          break
        case 'apply_style_product_attributes': {
          const attrStyle = imageStyles.find((s: any) => s.id === 'product-attributes')
          if (attrStyle) {
            setSelectedImageStyle(attrStyle)
            const attrPrompt =
              attrStyle.buildPrompt?.({
                productName: activeProduct?.name || '',
                productDescription: (activeProduct as any)?.description ?? '',
                brandName: storeCtx?.name ?? data.campaignTitle ?? '',
                context: selectedRatio?.id ?? '1:1',
              }) ?? ''
            if (attrPrompt) {
              setTimeout(() => generateImageWithPrompt(attrPrompt), 100)
            }
          }
          break
        }
        case 'open_video_panel':
          setVideoOpen(true)
          setVideoMode('ai')
          break
        case 'dismiss':
          break
        default:
          if (action.startsWith('preview_image:')) {
            const url = action.replace('preview_image:', '')
            if (url) {
              setActiveImageUrl(url)
              setGeneratedImageUrl(url)
              setImageFit('cover')
              setImageScale(100)
              setImagePosition({ x: 50, y: 50 })
              setFreeTextBoxes((prev) =>
                prev.map((b) => (b.id === 'main-text' ? { ...b, text: heading || '' } : b))
              )
              saveToHistory(url)
              toast.success('Imagem carregada no canvas')
            }
          }
          break
      }
    }
  })
  const handleSuggestionAction = useCallback((action: string) => {
    handleSuggestionActionRef.current(action)
  }, [])

  useEffect(() => {
    setScheduledPosts(loadScheduledPosts())
  }, [])

  const addScheduledPost = (post: ScheduledPost) => {
    const updated = [...scheduledPosts, post]
    setScheduledPosts(updated)
    saveScheduledPosts(updated)
  }

  useEffect(() => {
    try {
      const CURRENT_STYLE_IDS = new Set([
        'ecommerce-photography',
        'advertising-product',
        'packshot',
        'advertising-portrait',
        'fashion-on-model',
        'ghost-mannequin',
        'product-lifestyle',
        'flat-lay-editorial',
        'unboxing',
        'material-detail',
        'product-attributes',
        'product-infographic',
        'pop-illustration',
      ])

      // Clean stale entries from localStorage — but PRESERVE thumbnailUrl & admin overrides
      const keysToCheck = ['app:styles', 'snew:image-styles']
      for (const key of keysToCheck) {
        const saved = localStorage.getItem(key)
        if (!saved) continue
        try {
          const parsed = JSON.parse(saved) as any[]
          const hasStale = parsed.some((s: any) => !CURRENT_STYLE_IDS.has(s.id))
          if (hasStale) {
            // Only remove stale entries — keep everything valid (including thumbnailUrl)
            const cleaned = parsed.filter((s: any) => CURRENT_STYLE_IDS.has(s.id))
            if (cleaned.length > 0) {
              localStorage.setItem(key, JSON.stringify(cleaned))
            } else {
              localStorage.removeItem(key)
            }
          }
        } catch {
          localStorage.removeItem(key)
        }
      }

      // Always ensure imageStyles matches defaults (with buildPrompt functions)
      const fresh = loadImageStyles()
      setImageStyles(fresh)

      // Restore active style
      const activeStyle = localStorage.getItem('app:active-style')
      if (activeStyle) {
        const parsed = JSON.parse(activeStyle) as ImageStyleOption
        if (CURRENT_STYLE_IDS.has(parsed.id)) {
          // Merge with fresh data to get latest thumbnailUrl
          const merged = fresh.find((s) => s.id === parsed.id)
          setSelectedImageStyle(merged ?? parsed)
        } else {
          localStorage.removeItem('app:active-style')
          const fallback = fresh.find((s) => s.id === 'ecommerce-photography') ?? fresh[0] ?? null
          setSelectedImageStyle(fallback)
        }
      } else {
        // No saved active style — sync selected with fresh data
        setSelectedImageStyle((prev) => {
          if (!prev) return fresh.find((s) => s.id === 'ecommerce-photography') ?? fresh[0] ?? null
          const updated = fresh.find((s) => s.id === prev.id)
          return updated ?? prev
        })
      }
    } catch {}
  }, [])

  const closeAllSidebarPanels = () => {
    setActiveSidebarPanel(null)
    setOverlayEditorOpen(false)
    setStyleSelectorOpen(false)
    setChannelSelectorOpen(false)
    setTypographyOpen(false)
    setAttributesOpen(false)
    setVideoOpen(false)
    setWidgetsOpen(false)
    setActiveSubPanel(null)
  }

  const handleSidebarAction = (panel: string) => {
    if (panel === 'export') {
      handleDownload()
      return
    }
    if (panel === 'channel') {
      setChannelSelectorOpen(true)
      setActiveSidebarPanel('channel')
      return
    }
    if (activeSidebarPanel === panel) {
      closeAllSidebarPanels()
      return
    }
    setActiveSidebarPanel(panel)
    setOverlayEditorOpen(panel === 'overlay')
    setStyleSelectorOpen(panel === 'style')
    setChannelSelectorOpen(panel === 'channel')
    setTypographyOpen(panel === 'typography')
    setAttributesOpen(panel === 'attributes')
    setVideoOpen(panel === 'video')
  }

  const handleAddReviewCard = () => {
    const id = `review-${Date.now()}`
    const card: FreeReviewCard = {
      id,
      reviewText: 'Produto incrível! Superou todas as minhas expectativas.',
      reviewerName: 'Maria S.',
      rating: 5,
      xRel: 0.04,
      yRel: 0.55,
      widthRel: 0.88,
    }
    setFreeReviewCards((prev) => [...prev, card])
    setSelectedReviewCardId(id)
  }

  const handleAddCountdownWidget = () => {
    const id = `countdown-${Date.now()}`
    setFreeCountdownWidgets((prev) => [
      ...prev,
      {
        id,
        label: 'Oferta termina em',
        endsAt: Date.now() + 2 * 60 * 60 * 1000,
        xRel: 0.04,
        yRel: 0.04,
        widthRel: 0.92,
      },
    ])
    setSelectedCountdownId(id)
  }

  const handleAddPriceWidget = () => {
    const id = `price-${Date.now()}`
    setFreePriceWidgets((prev) => [
      ...prev,
      {
        id,
        originalPrice: 'R$ 249,90',
        discountPrice: 'R$ 189,90',
        discountBadge: '24% OFF',
        ctaLabel: 'Comprar agora',
        xRel: 0.04,
        yRel: 0.75,
        widthRel: 0.92,
      },
    ])
    setSelectedPriceId(id)
  }

  const handleAddSocialProofWidget = () => {
    const id = `social-${Date.now()}`
    setFreeSocialProofWidgets((prev) => [
      ...prev,
      {
        id,
        count: '247',
        label: 'pessoas compraram hoje',
        xRel: 0.04,
        yRel: 0.88,
        widthRel: 0.92,
      },
    ])
    setSelectedSocialProofId(id)
  }

  // Auto-send prompt from navigation state
  useEffect(() => {
    if (!data.autoPrompt?.trim()) return

    const navStyleName = data.styleName ?? null
    const navStyleDesc = data.styleDesc ?? null

    const sessionTitle = navStyleName
      ? `${navStyleName} — novo criativo`
      : data.autoPrompt!.slice(0, 60)
    setCurrentSessionTitle(sessionTitle)
    if (!chatTitle || chatTitle === 'snew studio') {
      setChatTitle(
        navStyleName ? navStyleName.toLowerCase() : data.autoPrompt!.slice(0, 45).toLowerCase()
      )
    }

    const timer = setTimeout(() => {
      if (navStyleName) {
        // Build contextual welcome message for style card
        const store = storeCtx?.name ? ` para ${storeCtx.name}` : ''
        const product = storeCtx?.productTypes?.[0] ? ` de ${storeCtx.productTypes[0]}` : ''
        const desc = navStyleDesc ? ` (${navStyleDesc.toLowerCase()})` : ''
        const welcomeContent = [
          `Estilo: ${navStyleName}${desc}`,
          ``,
          `Vou criar um visual${product}${store} nesse estilo.`,
          ``,
          `Qual formato você quer?`,
        ].join('\n')

        const formatChips = [
          { label: 'Feed 1:1', action: 'format:1:1' },
          { label: 'Stories 9:16', action: 'format:9:16' },
          { label: 'Reels vertical', action: 'format:9:16' },
          { label: 'LinkedIn', action: 'format:1:1' },
          { label: 'Pinterest 2:3', action: 'format:2:3' },
        ]

        chatPanelRef.current?.pushAssistantMessage?.({
          content: welcomeContent,
          chips: formatChips,
          onChipClick: (chip) => {
            const ratioMap: Record<string, string> = {
              'format:1:1': '1:1',
              'format:9:16': '9:16',
              'format:2:3': '2:3',
            }
            const ratio = ratioMap[chip.action]
            if (ratio) {
              const r = ASPECT_RATIOS.find((ar) => ar.id === ratio)
              if (r) setSelectedRatio(r)
            }
            // Style already set + channel already chosen — skip both
            startQualification(data.autoPrompt!, {
              hasStyle: true,
              hasChannel: true,
              channelAnswer: chip.label,
            })
          },
        })
      } else {
        // No style — start normal qualification
        startQualification(data.autoPrompt!, { hasStyle: false })
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // ── Video Animation Presets ──
  const VIDEO_PRESETS = [
    { id: 'zoom-in', label: 'Zoom In', icon: '⊕', desc: 'Zoom suave na imagem' },
    { id: 'parallax', label: 'Parallax', icon: '⟂', desc: 'Movimento de profundidade' },
    { id: 'fade-up', label: 'Fade Up', icon: '↑', desc: 'Texto sobe ao entrar' },
    { id: 'slide-left', label: 'Slide', icon: '→', desc: 'Elementos deslizam' },
    { id: 'ken-burns', label: 'Ken Burns', icon: '◻', desc: 'Pan e zoom cinematográfico' },
    { id: 'reveal', label: 'Reveal', icon: '◈', desc: 'Texto revelado linha a linha' },
  ]

  const AI_VIDEO_PRESETS = [
    {
      id: 'advertising-product',
      label: 'Advertising',
      icon: '✦',
      desc: 'Hero shot dramático',
      buildPrompt: (productName: string) =>
        `Cinematic advertising video. Camera slowly pulls back from extreme close-up of ${productName || 'the product'} revealing the full product in a dramatic hero shot. Deep shadows, single key light. Slow motion, 24fps film look. No person, no text. Premium brand aesthetic.`,
    },
    {
      id: 'close-up-detail',
      label: 'Close-up',
      icon: '◎',
      desc: 'Macro do produto',
      buildPrompt: (productName: string) =>
        `Extreme close-up macro video of ${productName || 'the product'} surface and texture. Camera glides slowly across the material revealing fabric weave, surface detail, and craftsmanship. Shallow depth of field, soft raking light from one side. Slow and meditative pace. No text, no person.`,
    },
    {
      id: 'lifestyle-motion',
      label: 'Lifestyle',
      icon: '♡',
      desc: 'Cena de uso real',
      buildPrompt: (productName: string) =>
        `Warm lifestyle video of ${productName || 'the product'} being used in a natural, authentic moment. Handheld camera with slight natural shake. Golden hour light through window. Shallow depth of field, bokeh background. Candid and emotional. Real, not staged.`,
    },
    {
      id: 'orbit-360',
      label: 'Orbit',
      icon: '↻',
      desc: 'Câmera orbita o produto',
      buildPrompt: (productName: string) =>
        `Camera slowly orbits 360 degrees around ${productName || 'the product'} on a clean surface. Smooth continuous rotation. Studio lighting with soft shadows rotating with the camera. Product stays perfectly centered and sharp throughout. Seamless loop.`,
    },
    {
      id: 'unboxing-reveal',
      label: 'Unboxing',
      icon: '◻',
      desc: 'Abertura e revelação',
      buildPrompt: (productName: string) =>
        `Elegant unboxing video of ${productName || 'the product'}. Hands open premium packaging, tissue paper unfolds, product is revealed in slow motion. Warm natural light. Camera pushes in as product is lifted. Luxurious and satisfying pacing. Premium DTC brand feel.`,
    },
    {
      id: 'floating-product',
      label: 'Float',
      icon: '⬡',
      desc: 'Produto flutuante',
      buildPrompt: (productName: string) =>
        `${productName || 'The product'} floating and slowly rotating in space against a clean gradient background. Subtle ambient light reflections. Gentle up-and-down floating animation. Camera slowly zooms in. Minimal and modern. No text, no hands, no background clutter.`,
    },
    {
      id: 'story-emotional',
      label: 'Story',
      icon: '◈',
      desc: 'Narrativa emocional',
      buildPrompt: (productName: string) =>
        `Emotional short story video featuring ${productName || 'the product'}. Montage of intimate moments: hands touching the product, close-up of textures, a person's reaction. Warm color grade, soft music implied by pacing. Each shot 1-2 seconds. Cinematic and aspirational.`,
    },
    {
      id: 'social-energy',
      label: 'Energy',
      icon: '⚡',
      desc: 'Ritmo rápido, cortes',
      buildPrompt: (productName: string) =>
        `High energy social media video for ${productName || 'the product'}. Fast cuts between dynamic angles. Saturated bold colors. Quick zoom punches on key details. Energetic and attention-grabbing. Made for Instagram Reels and TikTok. Young, vibrant, confident.`,
    },
  ]

  const applyCanvasAnimation = useCallback((presetId: string, durationSec: number) => {
    const imageLayer = canvasImageRef.current
    const container = assetFrameRef.current
    if (!imageLayer || !container) return

    // Clip the container so zoom/pan don't bleed outside
    container.style.overflow = 'hidden'
    container.style.borderRadius = '16px'

    imageLayer.style.animation = 'none'
    void imageLayer.offsetWidth

    const dur = `${durationSec}s`

    // Reset text elements
    const textEls = container.querySelectorAll('[data-field]')

    switch (presetId) {
      case 'zoom-in':
        imageLayer.style.animation = `canvasZoomIn ${dur} ease-in-out forwards`
        break
      case 'ken-burns':
        imageLayer.style.animation = `canvasKenBurns ${dur} ease-in-out forwards`
        break
      case 'fade-up':
        textEls.forEach((el: any, i: number) => {
          el.style.animation = `canvasFadeUp 0.8s ease ${0.3 + i * 0.3}s both`
        })
        break
      case 'slide-left':
        imageLayer.style.animation = `canvasSlideFromRight ${dur} ease-in-out forwards`
        break
      case 'parallax':
        imageLayer.style.animation = `canvasParallax ${dur} ease-in-out forwards`
        break
      case 'reveal':
        textEls.forEach((el: any) => {
          el.style.animation = `canvasRevealText 1.2s ease 0.3s both`
        })
        break
    }
  }, [])

  const handleVideoPreview = useCallback(() => {
    if (!selectedVideoPreset) return
    setVideoPreviewPlaying(true)
    applyCanvasAnimation(selectedVideoPreset, videoDuration)
    setTimeout(() => {
      setVideoPreviewPlaying(false)
      const imageLayer = canvasImageRef.current
      const container = assetFrameRef.current
      if (imageLayer) {
        imageLayer.style.animation = 'none'
        imageLayer.querySelectorAll('[data-field]').forEach((el: any) => {
          el.style.animation = 'none'
        })
      }
      if (container) {
        container.style.overflow = 'visible'
      }
    }, videoDuration * 1000)
  }, [selectedVideoPreset, videoDuration, applyCanvasAnimation])

  const handleExportVideo = useCallback(async () => {
    if (!selectedVideoPreset || !canvasRef.current) return
    setVideoExporting(true)
    try {
      toast.info('Exportando vídeo... isso pode demorar.')
      applyCanvasAnimation(selectedVideoPreset, videoDuration)
      // Note: Full MediaRecorder export requires canvas capture; for now trigger download of animation preview
      await new Promise((r) => setTimeout(r, videoDuration * 1000))
      toast.success('Animação finalizada! Use gravação de tela para capturar.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao exportar vídeo')
    } finally {
      setVideoExporting(false)
      const frame = canvasRef.current
      if (frame) frame.style.animation = 'none'
    }
  }, [selectedVideoPreset, videoDuration, applyCanvasAnimation, activeCampaign.title])

  const buildAutoVideoPrompt = useCallback(() => {
    const currentProduct = allProducts.find((p) => p.id === selectedProducts[0])
    const product = currentProduct?.name?.trim() ?? activeProductName ?? ''

    if (!product) return ''

    const campaign = activeCampaign?.title?.trim() ?? ''
    const headingText = heading?.trim() ?? ''

    const moodByStyle: Record<string, string> = {
      'ecommerce-photography': 'slow zoom in on product, clean studio reveal, crisp and elegant',
      'advertising-product':
        'dramatic cinematic push in, deep shadows, high contrast motion, hero moment',
      'commercial-product': 'warm handheld movement, natural light, lifestyle atmosphere',
      'product-lifestyle': 'golden hour slow pan, candid emotional movement, film grain feel',
      'aesthetic-product-shoot':
        'ultra slow macro drift, textural detail reveal, sensorial and luxurious',
      'campaign-editorial': 'bold graphic motion, unexpected angles, high-concept visual energy',
      'warm-lifestyle': 'slow intimate pan, golden warmth, soft focus drift, cozy atmosphere',
      'bold-vibrant': 'energetic fast cuts, vivid saturated motion, Gen Z campaign energy',
      'fashion-on-model': 'elegant slow walk, clean studio light, confident fluid movement',
      'material-detail': 'extreme slow macro zoom into texture, tactile surface reveal',
    }

    const mood =
      moodByStyle[selectedImageStyle?.id ?? ''] ??
      'smooth cinematic motion, commercial quality, lifestyle feel'

    const parts = [
      `${product} product video`,
      campaign ? `for ${campaign}` : '',
      headingText ? `Visual message: "${headingText}"` : '',
      mood,
      'High-end commercial quality.',
    ].filter(Boolean)

    return parts.join('. ').replace(/\.\./g, '.').trim()
  }, [
    allProducts,
    selectedProducts,
    activeProductName,
    activeCampaign,
    heading,
    selectedImageStyle,
  ])

  useEffect(() => {
    if (!useAiVideoPrompt) return
    const newPrompt = buildAutoVideoPrompt()
    if (newPrompt) setVideoPrompt(newPrompt)
  }, [
    useAiVideoPrompt,
    buildAutoVideoPrompt,
    selectedProducts,
    selectedImageStyle?.id,
    activeCampaign?.id,
  ])

  const isPlaceholderImage = (url: string | null | undefined): boolean => {
    if (!url) return true
    return url.includes('picsum.photos') || url.includes('placeholder') || url === ''
  }

  const handleGenerateAIVideo = useCallback(async () => {
    setIsGeneratingVideo(true)
    setVideoError(null)
    setGeneratedVideoUrl(null)
    setVideoGeneratingLabel('Enviando para fila...')
    // Fechar painel — geração acontece no canvas
    setVideoOpen(false)
    setActiveSidebarPanel(null)

    try {
      let imageBase64: string | undefined
      if (activeImageUrl && !isPlaceholderImage(activeImageUrl)) {
        try {
          imageBase64 = await imageUrlToBase64(activeImageUrl)
        } catch {}
      }

      // 1 — Submit only (returns in < 3s)
      const { data: submitData, error: submitError } = await supabase.functions.invoke(
        'generate-video',
        {
          body: {
            prompt: videoPrompt,
            imageBase64,
            duration: aiVideoDuration,
            aspectRatio: selectedRatio.id,
            modelId: selectedVideoModel ?? 'kling-3.0',
          },
        }
      )

      if (submitError) throw new Error(submitError.message)
      if (submitData?.error) throw new Error(submitData.error)

      const { requestId, endpoint, statusUrl, responseUrl } = submitData ?? {}
      if (!requestId) throw new Error('Sem request_id da fila.')

      setVideoGeneratingLabel('Na fila...')

      // 2 — Frontend polling (no edge function timeout)
      let attempts = 0
      const maxAttempts = 75 // 75 × 4s = 5 min

      const poll = async (): Promise<void> => {
        if (attempts++ >= maxAttempts)
          throw new Error('Tempo limite excedido (5 min). Tente novamente.')
        await new Promise((r) => setTimeout(r, 4000))

        const { data: statusData, error: statusError } = await supabase.functions.invoke(
          'check-video-status',
          {
            body: { requestId, endpoint, statusUrl, responseUrl },
          }
        )

        if (statusError) throw new Error(statusError.message)
        if (statusData?.error) throw new Error(statusData.error)

        const { status, videoUrl, queuePosition } = statusData ?? {}

        if (status === 'COMPLETED') {
          if (!videoUrl) throw new Error('Vídeo concluído mas sem URL.')
          setGeneratedVideoUrl(videoUrl)
          toast.success('Vídeo gerado!')
          return
        }
        if (status === 'FAILED') throw new Error(statusData?.error || 'Falha na geração.')

        setVideoGeneratingLabel(
          status === 'IN_PROGRESS'
            ? 'Gerando vídeo...'
            : queuePosition != null
              ? `Na fila (pos. ${queuePosition})...`
              : 'Processando...'
        )
        return poll()
      }

      await poll()
    } catch (err: any) {
      console.error('Video generation error:', err)
      setVideoError(err?.message || 'Não foi possível gerar. Tente novamente.')
    } finally {
      setIsGeneratingVideo(false)
      setVideoGeneratingLabel('')
    }
  }, [videoPrompt, aiVideoDuration, selectedRatio, activeImageUrl, selectedVideoModel])

  const handleDeleteImage = () => {
    setActiveImageUrl('')
    setSelectedElement(null)
    closeAllSidebarPanels()
  }

  interface AssetHistoryItem {
    id: string
    createdAt: Date
    imageUrl: string
    heading: string
    description: string
    cta: string
    channel: string
    styleId: string | null
    isCarousel: boolean
    slides?: any[]
    sessionTitle: string
    imageHasEmbeddedText?: boolean
    isVideo?: boolean
    videoUrl?: string
    type?: 'image' | 'video' | 'document'
    documentMarkdown?: string
    documentTitle?: string
    documentExcerpt?: string
    chatMessages?: any[]
    imagePosition?: { x: number; y: number }
    imageScale?: number
    imageFit?: 'cover' | 'contain'
  }
  const [assetHistory, setAssetHistoryRaw] = useState<AssetHistoryItem[]>(
    () => (data.restoreAssetHistory as AssetHistoryItem[] | undefined) ?? []
  )
  const setAssetHistory: typeof setAssetHistoryRaw = useCallback((updater) => {
    setAssetHistoryRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
  }, [])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTab, setHistoryTab] = useState<'saved' | 'auto'>('saved')
  const [currentSessionTitle, setCurrentSessionTitle] = useState('Sem título')

  // Auto Generate state
  interface AutoGeneratedPost {
    id: string
    productId: string
    productName: string
    channel: string
    imageUrl: string
    heading: string
    description: string
    cta: string
    price: string
    styleId: string
    createdAt: Date
    theme: string
    status: 'pending' | 'generating' | 'done' | 'error'
    errorMsg?: string
  }
  const [autoGenerateOpen, setAutoGenerateOpen] = useState(false)
  const [chatTitle, setChatTitle] = useState<string>(() => {
    if (data.styleName) return data.styleName.toLowerCase()
    if (data.autoPrompt) return data.autoPrompt.slice(0, 45).toLowerCase()
    return ''
  })
  const [chatTitleDropdownOpen, setChatTitleDropdownOpen] = useState(false)
  const chatTitleDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chatTitleDropdownRef.current && !chatTitleDropdownRef.current.contains(e.target as Node))
        setChatTitleDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const [autoTheme, setAutoTheme] = useState('')
  const [selectedAutoProducts, setSelectedAutoProducts] = useState<string[]>([])
  const [selectedAutoFormats, setSelectedAutoFormats] = useState<string[]>([
    'instagram-feed',
    'instagram-stories',
  ])
  const [autoGeneratedPosts, setAutoGeneratedPosts] = useState<AutoGeneratedPost[]>([])
  const [autoGenRunning, setAutoGenRunning] = useState(false)
  const [autoGenProgress, setAutoGenProgress] = useState(0)
  const [autoStyle, setAutoStyle] = useState('editorial')
  const [autoInstructions, setAutoInstructions] = useState('')
  const [autoPostCount, setAutoPostCount] = useState<'all' | number>('all')

  const toggleAutoProduct = (id: string) =>
    setSelectedAutoProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  const toggleAutoFormat = (id: string) =>
    setSelectedAutoFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )

  const updateAutoPost = useCallback((id: string, updates: Partial<AutoGeneratedPost>) => {
    setAutoGeneratedPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])

  const formatProductPrice = (product: (typeof allProducts)[0]): string => `R$ 189`

  const handleAutoGenerate = useCallback(async () => {
    setAutoGenerateOpen(false)
    setAutoGenRunning(true)
    setAutoGenProgress(0)
    setHistoryOpen(true)
    setHistoryTab('auto')

    const formatToRatioId: Record<string, string> = {
      'instagram-feed': '1:1',
      'instagram-stories': '9:16',
      whatsapp: '1:1',
      'site-banner': '16:9',
    }

    const formatToAspectLabel: Record<string, string> = {
      'instagram-feed': 'square 1:1, Instagram Feed',
      'instagram-stories': 'vertical 9:16, Instagram Stories',
      whatsapp: 'square 1:1, WhatsApp',
      'site-banner': 'horizontal 16:9, site banner',
    }

    const formatToChannelLabel: Record<string, string> = {
      'instagram-feed': 'Instagram Feed — copy curta, emocional, sem hashtags',
      'instagram-stories': 'Instagram Stories — urgência, CTA direto, máx 8 palavras no heading',
      whatsapp: 'WhatsApp — tom pessoal, direto, com emoji',
      'site-banner': 'Banner de site — headline impactante, benefício imediato',
    }

    const selectedProds = allProducts.filter((p) => selectedAutoProducts.includes(p.id))

    // Build all combinations
    let allCombos: { product: (typeof allProducts)[0]; format: string }[] = []
    for (const product of selectedProds) {
      for (const format of selectedAutoFormats) {
        allCombos.push({ product, format })
      }
    }

    // Limit if autoPostCount is a number
    if (autoPostCount !== 'all' && typeof autoPostCount === 'number') {
      allCombos = allCombos.slice(0, autoPostCount)
    }

    const total = allCombos.length
    let completed = 0

    const initialPosts: AutoGeneratedPost[] = allCombos.map(({ product, format }) => ({
      id: `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      productId: product.id,
      productName: product.name,
      channel: formatToRatioId[format] ?? '1:1',
      imageUrl: '',
      heading: '',
      description: '',
      cta: '',
      price: 'R$ 189',
      styleId: autoStyle,
      createdAt: new Date(),
      theme: autoTheme,
      status: 'pending',
    }))

    setAutoGeneratedPosts(initialPosts)

    const BATCH = 2
    const BATCH_DELAY = 800

    for (let i = 0; i < initialPosts.length; i += BATCH) {
      const batch = initialPosts.slice(i, i + BATCH)
      await Promise.all(
        batch.map(async (post) => {
          updateAutoPost(post.id, { status: 'generating' })
          try {
            const product = allProducts.find((p) => p.id === post.productId)
            const format =
              Object.keys(formatToRatioId).find((k) => formatToRatioId[k] === post.channel) ??
              'instagram-feed'
            const styleObj = ART_STYLES.find((s) => s.id === autoStyle)
            const styleName = styleObj?.name ?? autoStyle
            const styleImageStyle =
              styleObj?.imageStyle ??
              'editorial lifestyle photography, natural light, shallow depth of field, film grain, authentic moment, magazine quality, photorealistic'

            // 1. Generate contextualized copy
            const { data: copyData } = await supabase.functions.invoke('generate-copy', {
              body: {
                action: 'auto-generate',
                field: 'full',
                tone: 'emocional',
                campaign: {
                  title: autoTheme,
                  product: post.productName,
                  channel: formatToChannelLabel[format] ?? format,
                  style: styleName,
                  instructions: autoInstructions || undefined,
                  context: `Campanha: ${autoTheme}. Produto: ${post.productName}. ${autoInstructions ? `Instruções extras: ${autoInstructions}` : ''}`,
                  brandContext: brandContextBody,
                },
              },
            })

            let copyResult: { heading: string; description: string; cta: string }
            try {
              const raw =
                typeof copyData === 'string' ? copyData.replace(/```json|```/g, '').trim() : null
              const parsed = raw ? JSON.parse(raw) : copyData
              copyResult = parsed?.heading
                ? parsed
                : {
                    heading: `${autoTheme} — ${post.productName}`,
                    description: post.productName,
                    cta: 'Garantir agora →',
                  }
            } catch {
              copyResult = {
                heading: `${autoTheme} — ${post.productName}`,
                description: post.productName,
                cta: 'Garantir agora →',
              }
            }

            updateAutoPost(post.id, {
              heading: copyResult.heading,
              description: copyResult.description,
              cta: copyResult.cta,
              status: 'generating',
            })

            // 2. Generate image with product reference + style
            const aspectLabel = formatToAspectLabel[format] ?? 'square'
            const extraInstructions = autoInstructions ? ` ${autoInstructions}.` : ''
            const editorialSuffix =
              '. Style: editorial lifestyle photography, natural light, shallow depth of field, film grain, authentic moment, magazine quality, photorealistic. Avoid: illustration, cartoon, 3d render, painting, drawing, digital art'
            const imgPrompt = `${post.productName}, ${styleImageStyle}, ${autoTheme} campaign.${extraInstructions} ${aspectLabel}. High quality commercial photography${editorialSuffix}.`

            const imgBody: Record<string, unknown> = {
              prompt: imgPrompt,
              model: 'gemini-2.5-flash-image',
              aspectRatio: GEMINI_ASPECT_MAP[selectedRatio.id] ?? '1:1',
            }

            if (product?.image) {
              try {
                const base64 = await new Promise<string>((resolve, reject) => {
                  const img = new Image()
                  img.crossOrigin = 'anonymous'
                  img.onload = () => {
                    const c = document.createElement('canvas')
                    c.width = img.naturalWidth
                    c.height = img.naturalHeight
                    c.getContext('2d')!.drawImage(img, 0, 0)
                    resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1])
                  }
                  img.onerror = reject
                  img.src = product.image
                })
                imgBody.images = [base64]
              } catch {
                /* proceed without reference */
              }
            }

            const { data: imgData, error: imgError } = await supabase.functions.invoke(
              'gemini-generate',
              { body: imgBody }
            )
            if (imgError) throw imgError

            updateAutoPost(post.id, {
              imageUrl: imgData?.imageUrl || '',
              styleId: autoStyle,
              status: imgData?.imageUrl ? 'done' : 'error',
              errorMsg: imgData?.imageUrl ? undefined : 'Imagem não retornada',
            })
          } catch (err: any) {
            updateAutoPost(post.id, {
              status: 'error',
              errorMsg: err?.message ?? 'Erro desconhecido',
            })
          }
          completed++
          setAutoGenProgress(Math.round((completed / total) * 100))
        })
      )
      if (i + BATCH < initialPosts.length) await new Promise((r) => setTimeout(r, BATCH_DELAY))
    }
    setAutoGenRunning(false)
  }, [
    allProducts,
    selectedAutoProducts,
    selectedAutoFormats,
    autoTheme,
    autoStyle,
    autoInstructions,
    autoPostCount,
    updateAutoPost,
  ])

  const retryAutoPost = useCallback(
    async (postId: string) => {
      const post = autoGeneratedPosts.find((p) => p.id === postId)
      if (!post) return
      updateAutoPost(postId, { status: 'generating', errorMsg: undefined })
      try {
        // Retry copy
        const { data: copyData } = await supabase.functions.invoke('generate-copy', {
          body: {
            action: 'auto-generate',
            field: 'full',
            tone: 'direto',
            campaign: {
              title: post.theme,
              product: post.productName,
              channel: post.channel,
              brandContext: brandContextBody,
            },
          },
        })
        let copyResult: { heading: string; description: string; cta: string }
        if (copyData?.heading) {
          copyResult = copyData
        } else {
          copyResult = {
            heading: `${post.productName} — ${post.theme}`,
            description: post.productName,
            cta: 'Comprar agora →',
          }
        }
        updateAutoPost(postId, {
          heading: copyResult.heading,
          description: copyResult.description,
          cta: copyResult.cta,
        })

        // Retry image
        const imgPrompt = `${post.productName} product photography for ${post.theme} campaign. ${copyResult.heading}. Commercial quality, clean background. High resolution.`
        const { data: imgData, error: imgError } = await supabase.functions.invoke(
          'gemini-generate',
          {
            body: {
              prompt: imgPrompt,
              model: 'gemini-2.5-flash-image',
              aspectRatio: GEMINI_ASPECT_MAP[selectedRatio.id] ?? '1:1',
            },
          }
        )
        if (imgError) throw imgError
        updateAutoPost(postId, {
          imageUrl: imgData?.imageUrl || '',
          status: imgData?.imageUrl ? 'done' : 'error',
          errorMsg: imgData?.imageUrl ? undefined : 'Imagem não retornada',
        })
      } catch (err: any) {
        updateAutoPost(postId, {
          status: 'error',
          errorMsg: err?.message ?? 'Erro ao tentar novamente',
        })
      }
    },
    [autoGeneratedPosts, updateAutoPost]
  )

  const loadAutoPost = useCallback((post: AutoGeneratedPost) => {
    // Set canvas state
    setActiveImageUrl(post.imageUrl)
    setHeading(post.heading)
    setDescription(post.description)
    setCta(post.cta)
    setSelectedRatio(ASPECT_RATIOS.find((r) => r.id === post.channel) ?? ASPECT_RATIOS[0])
    setSelectedStyleId(post.styleId)
    setImageFit('cover')
    setImageScale(100)
    setImagePosition({ x: 50, y: 50 })

    // Update main-text box with new heading
    setFreeTextBoxes((prev) => {
      if (prev.some((b) => b.id === 'main-text')) {
        return prev.map((b) => (b.id === 'main-text' ? { ...b, text: post.heading } : b))
      }
      return prev
    })

    // Close history panel
    setHistoryOpen(false)
    toast.success('Post carregado no canvas')
  }, [])

  // Close float windows on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageGeneratorOpen(false)
        setProductSelectorOpen(false)
        setFloatModelOpen(false)
        closeAllSidebarPanels()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const saveToHistory = useCallback(
    (urlOverride?: string) => {
      const urlToSave = urlOverride ?? activeImageUrl
      if (!urlToSave || urlToSave.length < 10 || isPlaceholderImage(urlToSave)) return
      const videoFlag = isVideoUrl(urlToSave)
      const chatMsgs = chatPanelRef.current?.getMessages?.() ?? []
      // Only save user+assistant chat messages (not activity), strip attachedImages for size
      const serializableChat = chatMsgs
        .filter((m: any) => !('type' in m && m.type === 'activity'))
        .map((m: any) => ({
          role: m.role,
          content: m.content,
          actions: m.actions,
          followUps: m.followUps,
        }))
        .slice(-20) // keep last 20 messages max

      // Derive a meaningful title: prefer heading > product name > style name > fallback
      const derivedTitle =
        heading?.trim() ||
        activeProductName?.trim() ||
        selectedImageStyle?.name?.trim() ||
        currentSessionTitle ||
        'Criativo'

      const snapshot: AssetHistoryItem = {
        id: `asset-${Date.now()}`,
        createdAt: new Date(),
        imageUrl: urlToSave,
        heading,
        description,
        cta,
        channel: selectedChannel,
        styleId: selectedStyleId,
        isCarousel: isCarouselMode,
        slides: isCarouselMode ? [...(generatedCarouselSlides ?? [])] : undefined,
        sessionTitle: derivedTitle,
        imageHasEmbeddedText,
        isVideo: videoFlag,
        videoUrl: videoFlag ? urlToSave : undefined,
        chatMessages: serializableChat,
        imagePosition: { ...imagePosition },
        imageScale,
        imageFit,
      }
      setAssetHistory((prev) => {
        if (prev.some((h) => h.imageUrl === urlToSave && h.channel === selectedChannel)) return prev
        return [snapshot, ...prev]
      })
    },
    [
      activeImageUrl,
      heading,
      description,
      cta,
      selectedChannel,
      selectedStyleId,
      isCarouselMode,
      generatedCarouselSlides,
      currentSessionTitle,
      imageHasEmbeddedText,
      isVideoUrl,
      activeProductName,
      selectedImageStyle,
      imagePosition,
      imageScale,
      imageFit,
    ]
  )

  const restoreFromHistory = useCallback((item: AssetHistoryItem) => {
    setHeading(item.heading)
    setDescription(item.description)
    setCta(item.cta)
    setActiveImageUrl(item.imageUrl)
    setSelectedRatio(ASPECT_RATIOS.find((r) => r.id === item.channel) ?? ASPECT_RATIOS[0])
    setSelectedStyleId(item.styleId)
    setIsCarouselMode(item.isCarousel)
    if (item.isCarousel && item.slides) setGeneratedCarouselSlides(item.slides as any)
    setImageHasEmbeddedText((item as any).imageHasEmbeddedText ?? false)
    const title = item.sessionTitle ?? item.channel ?? 'sessão'
    setCurrentSessionTitle(title)
    setChatTitle(title.toLowerCase())
    setHistoryOpen(false)

    // Restore image position
    if (item.imagePosition) setImagePosition(item.imagePosition)
    else setImagePosition({ x: 50, y: 50 })
    if (item.imageScale !== undefined) setImageScale(item.imageScale)
    else setImageScale(100)
    if (item.imageFit) setImageFit(item.imageFit)
    else setImageFit('cover')

    // Restore chat messages from saved session
    if (item.chatMessages?.length) {
      setTimeout(() => {
        chatPanelRef.current?.setMessages?.(item.chatMessages!)
      }, 100)
    } else {
      setTimeout(() => {
        chatPanelRef.current?.setMessages?.([
          {
            role: 'assistant' as const,
            content: `Asset restaurado: ${item.sessionTitle || item.channel}. O que você quer ajustar?`,
          },
        ])
      }, 100)
    }
  }, [])

  const downloadHistoryItem = useCallback((item: AssetHistoryItem) => {
    if (!item.imageUrl) return
    const link = document.createElement('a')
    const safeName = (item.heading?.trim() || item.sessionTitle || 'criativo')
      .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '')
      .slice(0, 40)
      .trim()
    link.download = `${safeName}-${item.channel}-snew.png`
    link.href = item.imageUrl
    link.click()
    toast.success('Download iniciado')
  }, [])

  const channelLabel = (channelId: string) => {
    const map: Record<string, string> = {
      'instagram-feed': 'Feed',
      'instagram-stories': 'Stories',
      whatsapp: 'WhatsApp',
      'site-banner': 'Banner',
    }
    return map[channelId] ?? channelId
  }

  const formatRelativeTime = (date: Date | string) => {
    const d = new Date(date)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `há ${mins}min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `há ${hrs}h`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  // (canvas ref injection moved inside generateImageWithPrompt)

  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [scanContext, setScanContext] = useState({
    campaignObjective: 'conversion' as 'conversion' | 'retargeting' | 'launch' | 'awareness',
    ticketAverage: 0,
    audience: '',
    productCategory: '',
    isPromotional: false,
  })

  const channel = selectedRatio
  const currentChannelSupportsCarousel = channel.supportsCarousel
  const isCarousel = isCarouselMode && currentChannelSupportsCarousel

  const getProductImage = (pid: string) => allProducts.find((p) => p.id === pid)?.image || ''

  const carouselSlides = isCarousel
    ? selectedProducts.map((pid) => ({
        image: getProductImage(pid),
        name: allProducts.find((p) => p.id === pid)?.name || '',
      }))
    : [{ image: activeImageUrl, name: activeProduct?.name || '' }]

  const toggleProduct = (id: string) => {
    if (isCarousel) {
      setSelectedProducts((prev) =>
        prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 10 ? [...prev, id] : prev
      )
    } else {
      setSelectedProducts([id])
      const p = allProducts.find((pr) => pr.id === id)
      if (p) {
        setActiveImageUrl(p.image)
        setImagePrompt('')
      }
      setProductSelectorOpen(false)
    }
  }

  const confirmProductSelection = () => {
    if (isCarousel && selectedProducts.length > 0)
      setActiveImageUrl(getProductImage(selectedProducts[0]))
    setProductSelectorOpen(false)
  }

  const applyArtStyle = useCallback(
    (style: ArtStyle) => {
      setSelectedStyleId(style.id)
      setSelectedFont(style.font)
      setTextColor(style.textColor)
      setCtaColor(style.ctaColor)
      setCtaTextColor(style.ctaTextColor)
      setCtaRadius(style.ctaRadius)
      setTextHAlign(style.textHAlign)
      setTextVAlign(style.textVAlign)
      setTextCase(style.textCase)
      setFontWeightState(style.fontWeight)
      setLetterSpacing(style.letterSpacing)
      setHeadingSize(HEADING_SIZE_MAP[style.headingSize] || 26)
      setOverlayType(style.overlayType)
      setOverlayColor(style.overlayColor)
      // Não aplicar overlayOpacity automaticamente — usuário decide
      setOverlayPosition(style.overlayPosition)
      setStylesOpen(false)
      if (style.enableAttributes) {
        setShowAttributes(true)
        handleGenerateAttributes()
      }
      if (style.enablePrice) {
        setPriceVisible(true)
        if (!priceText) setPriceText('R$ 189,90')
      } else {
        setPriceVisible(false)
      }
    },
    [handleGenerateAttributes, priceText]
  )

  // Update qualification ref functions now that applyArtStyle is available
  useEffect(() => {
    pushProductQuestionRef.current = () => {
      chatPanelRef.current?.pushQualificationMessage?.({
        question: storeCtx?.name
          ? `Qual produto de ${storeCtx.name} você quer destacar?`
          : 'Qual produto você quer destacar?',
        chips: undefined,
        onSkip: () => handleQualificationAnswer(''),
      })
    }
    pushChannelQuestionRef.current = (basePrompt: string) => {
      const audience = storeCtx?.audience ?? ''
      const question = audience
        ? `Onde vai publicar para ${audience.split(',')[0].trim()}?`
        : 'Onde vai publicar esse criativo?'
      chatPanelRef.current?.pushQualificationMessage?.({
        question,
        chips: [
          'Feed 1:1',
          'Stories 9:16',
          'Reels vertical',
          'LinkedIn',
          'Pinterest 2:3',
          '→ Gerar agora',
        ],
        onSkip: () => handleQualificationAnswer('→ Gerar agora'),
      })
    }
    pushStyleQuestionRef.current = (_basePrompt: string) => {
      const niche = storeCtx?.niche ?? ''
      const relevantStyles = imageStyles
        .filter((s) => {
          if (niche.includes('moda') || niche.includes('roupa'))
            return [
              'fashion-on-model',
              'ghost-mannequin',
              'advertising-portrait',
              'ecommerce-photography',
            ].includes(s.id)
          if (niche.includes('cosmético') || niche.includes('beleza'))
            return [
              'advertising-product',
              'product-lifestyle',
              'material-detail',
              'packshot',
            ].includes(s.id)
          if (niche.includes('bebê') || niche.includes('infantil'))
            return [
              'ecommerce-photography',
              'product-lifestyle',
              'advertising-portrait',
              'flat-lay-editorial',
            ].includes(s.id)
          return true
        })
        .slice(0, 6)
      chatPanelRef.current?.pushStylePickerMessage?.({
        question: 'Qual estilo visual?',
        styles: relevantStyles.map((s) => ({
          id: s.id,
          name: s.name,
          description: (s as any).description ?? s.category ?? '',
          thumbnailUrl: s.thumbnailUrl ?? '',
        })),
        onSelect: (styleId: string, styleName: string) => {
          const style = imageStyles.find((s) => s.id === styleId)
          if (style) {
            setSelectedImageStyle(style)
            applyArtStyle(style as any)
          }
          handleQualificationAnswer(styleName)
        },
        onSkip: () => handleQualificationAnswer('→ Gerar agora'),
      })
    }
  }, [storeCtx, imageStyles, applyArtStyle, handleQualificationAnswer])

  const handleSave = useCallback(() => {
    if (!activeImageUrl || isPlaceholderImage(activeImageUrl)) return
    saveToHistory(activeImageUrl)
    setIsSaveAnimating(true)
    setShowSaveToast(true)
    setTimeout(() => setIsSaveAnimating(false), 900)
    setTimeout(() => setShowSaveToast(false), 2200)
    pushActivity('asset_saved', 'Salvo ✓', 'Guardado. Pronto pra publicar ou quer refinar mais?', [
      { id: 'publish', label: 'Publicar agora', action: 'open_publish' },
      { id: 'new', label: 'criar novo', action: 'new_asset' },
    ])
  }, [activeImageUrl, saveToHistory, pushActivity])

  // ── Video Creative Download — compose overlay/text → WebM → CloudConvert → MP4 ──
  const downloadVideoCreative = useCallback(async () => {
    const videoSrc = activeVideoUrl ?? (isVideoUrl(activeImageUrl) ? activeImageUrl : null)
    if (!videoSrc) {
      toast.error('Nenhum vídeo no canvas.')
      return
    }

    const rawTitle =
      heading?.trim() || currentSessionTitle?.trim() || activeProductName?.trim() || 'snew-criativo'
    const safeTitle = rawTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40)

    const hasOverlay = overlayOpacity > 0
    const hasText = freeTextBoxes.some((b) => b.text && b.text !== '...')
    const needsComposition = hasOverlay || hasText

    // ── No overlay/text: direct download of source video ──
    if (!needsComposition) {
      toast.info('Baixando vídeo...')
      try {
        const res = await fetch(videoSrc, { mode: 'cors' })
        if (!res.ok) throw new Error('fetch failed')
        const blob = await res.blob()
        const mp4Blob = new Blob([blob], { type: 'video/mp4' })
        const url = URL.createObjectURL(mp4Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${safeTitle}-snew.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        toast.success(`Download iniciado — ${safeTitle}-snew.mp4`)
      } catch {
        window.open(videoSrc, '_blank')
        toast.info('Vídeo aberto em nova aba — salve manualmente.')
      }
      return
    }

    // ── With overlay/text: compose via canvas + MediaRecorder → WebM → CloudConvert → MP4 ──
    toast.info('Compondo vídeo criativo...')

    try {
      const vid = document.createElement('video')
      vid.crossOrigin = 'anonymous'
      vid.muted = true
      vid.playsInline = true
      vid.src = videoSrc
      vid.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none'
      document.body.appendChild(vid)

      await new Promise<void>((resolve, reject) => {
        vid.onloadedmetadata = () => resolve()
        vid.onerror = () => reject(new Error('Falha ao carregar vídeo'))
        setTimeout(() => reject(new Error('Timeout ao carregar vídeo')), 20000)
      })

      const vidW = vid.videoWidth || selectedRatio.width
      const vidH = vid.videoHeight || selectedRatio.height

      const oc = document.createElement('canvas')
      oc.width = vidW
      oc.height = vidH
      const ctx = oc.getContext('2d')!

      await document.fonts.ready
      const activeFontFamily = getFontFamilyById(selectedFont)
      if (activeFontFamily) {
        try {
          await document.fonts.load(`600 48px "${activeFontFamily}"`)
        } catch {}
      }
      for (const box of freeTextBoxes) {
        if (box.fontFamily) {
          try {
            await document.fonts.load(`600 48px "${box.fontFamily}"`)
          } catch {}
        }
      }

      const drawOverlay = () => {
        if (overlayOpacity <= 0) return
        const m = overlayColor.replace('#', '').match(/.{2}/g)
        const rgb = m ? m.map((h: string) => parseInt(h, 16)).join(',') : '0,0,0'
        ctx.save()
        if (overlayType === 'solid') {
          ctx.fillStyle = `rgba(${rgb},${overlayOpacity})`
          ctx.fillRect(0, 0, vidW, vidH)
        } else {
          const fromY = overlayPosition === 'top' ? 0 : vidH
          const toY = overlayPosition === 'top' ? vidH : 0
          const grd = ctx.createLinearGradient(0, fromY, 0, toY)
          grd.addColorStop(0, `rgba(${rgb},${overlayOpacity})`)
          grd.addColorStop(1, `rgba(${rgb},0)`)
          ctx.fillStyle = grd
          ctx.fillRect(0, 0, vidW, vidH)
        }
        ctx.restore()
      }

      const drawText = () => {
        for (const box of freeTextBoxes) {
          if (!box.text || box.text === '...') continue
          const fontSize = Math.max(8, Math.round((box.fontSizeRel ?? 0.06) * vidW))
          const bx = Math.round((box.xRel ?? 0.06) * vidW)
          const by = Math.round((box.yRel ?? 0.5) * vidH)
          const bw = Math.round((box.boxWidthRel ?? 0.88) * vidW)
          const fam = (box.fontFamily ?? activeFontFamily ?? 'Inter')
            .replace(/'/g, '')
            .split(',')[0]
            .trim()
          ctx.save()
          ctx.font = `600 ${fontSize}px "${fam}"`
          ctx.fillStyle = box.color ?? '#FFFFFF'
          ctx.textAlign = (box.textAlign ?? 'center') as CanvasTextAlign
          ctx.textBaseline = 'top'
          if (box.textShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.7)'
            ctx.shadowBlur = 8
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 2
          }
          const words = box.text.split(' ')
          const lines: string[] = []
          let cur = ''
          for (const w of words) {
            const t = cur ? `${cur} ${w}` : w
            if (ctx.measureText(t).width <= bw) {
              cur = t
            } else {
              if (cur) lines.push(cur)
              cur = w
            }
          }
          if (cur) lines.push(cur)
          const tx =
            box.textAlign === 'center' ? bx + bw / 2 : box.textAlign === 'right' ? bx + bw : bx
          const lineH = fontSize * 1.25
          lines.forEach((l, i) => ctx.fillText(l, tx, by + i * lineH))
          ctx.restore()
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm'

      const stream = oc.captureStream(30)
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      const recordingDone = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve()
      })

      recorder.start(100)
      vid.currentTime = 0
      await vid.play()

      await new Promise<void>((resolve) => {
        let rafId: number
        const loop = () => {
          if (vid.ended || vid.paused) {
            cancelAnimationFrame(rafId)
            recorder.stop()
            resolve()
            return
          }
          ctx.clearRect(0, 0, vidW, vidH)
          ctx.drawImage(vid, 0, 0, vidW, vidH)
          drawOverlay()
          drawText()
          rafId = requestAnimationFrame(loop)
        }
        rafId = requestAnimationFrame(loop)
      })

      await recordingDone
      document.body.removeChild(vid)

      const webmBlob = new Blob(chunks, { type: 'video/webm' })

      // ── Upload WebM to temp storage → CloudConvert → MP4 ──
      toast.info('Convertendo para MP4...')

      const tempFileName = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`
      const { error: uploadErr } = await supabase.storage
        .from('temp-videos')
        .upload(tempFileName, webmBlob, { contentType: 'video/webm', upsert: true })

      if (uploadErr) {
        console.warn('Storage upload failed, falling back to WebM download:', uploadErr)
        const url = URL.createObjectURL(webmBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${safeTitle}-snew.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        toast.info('Baixado como .webm — upload para conversão falhou.')
        return
      }

      // Get public URL for CloudConvert to fetch
      const { data: publicUrlData } = supabase.storage
        .from('temp-videos')
        .getPublicUrl(tempFileName)
      const publicVideoUrl = publicUrlData?.publicUrl

      if (!publicVideoUrl) {
        throw new Error('Could not get public URL for uploaded video')
      }

      // Call edge function
      const { data: convertData, error: convertError } = await supabase.functions.invoke(
        'convert-video',
        { body: { videoUrl: publicVideoUrl } }
      )

      // Cleanup temp file (fire and forget)
      supabase.storage
        .from('temp-videos')
        .remove([tempFileName])
        .catch(() => {})

      if (convertError || convertData?.error) {
        console.warn(
          'CloudConvert failed, falling back to WebM:',
          convertError ?? convertData?.error
        )
        const url = URL.createObjectURL(webmBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${safeTitle}-snew.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        toast.info('Baixado como .webm — conversão MP4 indisponível.')
        return
      }

      // Download MP4 from CloudConvert's export URL
      const mp4Url = convertData.mp4Url
      const mp4Res = await fetch(mp4Url)
      const mp4Blob = await mp4Res.blob()
      const mp4ObjUrl = URL.createObjectURL(mp4Blob)
      const a = document.createElement('a')
      a.href = mp4ObjUrl
      a.download = `${safeTitle}-snew.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(mp4ObjUrl), 10000)
      toast.success(`Download · ${safeTitle}-snew.mp4`)
    } catch (err: any) {
      console.error('[downloadVideoCreative]', err)
      try {
        toast.info('Baixando vídeo original...')
        const res = await fetch(videoSrc)
        const blob = await res.blob()
        const ext = videoSrc.includes('.mp4') ? 'mp4' : 'webm'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${safeTitle}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 5000)
        toast.success('Download do vídeo original iniciado.')
      } catch {
        toast.error('Não foi possível baixar o vídeo. Tente novamente.')
      }
    }
  }, [
    activeVideoUrl,
    activeImageUrl,
    isVideoUrl,
    heading,
    currentSessionTitle,
    activeProductName,
    selectedRatio,
    selectedFont,
    freeTextBoxes,
    overlayOpacity,
    overlayColor,
    overlayType,
    overlayPosition,
  ])

  const handleDownload = useCallback(async () => {
    if (!activeImageUrl || isPlaceholderImage(activeImageUrl)) {
      toast.error('Nenhuma imagem para exportar.')
      return
    }

    // ── Video: export composited creative (overlay + text) ──
    if (activeVideoUrl || isVideoUrl(activeImageUrl)) {
      await downloadVideoCreative()
      return
    }

    // ── Image: existing canvas export logic ──
    try {
      await document.fonts.ready
      const activeFontFamily = getFontFamilyById(selectedFont)
      if (activeFontFamily) {
        try {
          await document.fonts.load(`400 48px ${activeFontFamily}`)
        } catch {}
      }
      const usedFonts = new Set(freeTextBoxes.map((b) => b.fontFamily).filter(Boolean))
      for (const f of usedFonts) {
        try {
          await document.fonts.load(`600 48px ${f}`)
        } catch {}
      }

      // Real asset dimensions (e.g. 1080×1920)
      const W = selectedRatio.width
      const H = selectedRatio.height

      const oc = document.createElement('canvas')
      oc.width = W
      oc.height = H
      const ctx = oc.getContext('2d')
      if (!ctx) throw new Error('no context')

      // 1. Background
      ctx.fillStyle = '#111111'
      ctx.fillRect(0, 0, W, H)

      // 2. Draw main image with object-fit cover
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = () => rej(new Error('Falha ao carregar imagem'))
        img.src = activeImageUrl
      })

      const imgAspect = img.naturalWidth / img.naturalHeight
      const canvasAspect = W / H
      const fit = imageFit === 'contain' ? 'contain' : 'cover'
      const scale = imageScale / 100
      const posX = imagePosition.x / 100
      const posY = imagePosition.y / 100
      let drawW: number, drawH: number

      if (fit === 'cover') {
        if (imgAspect > canvasAspect) {
          drawH = H * scale
          drawW = drawH * imgAspect
        } else {
          drawW = W * scale
          drawH = drawW / imgAspect
        }
      } else {
        if (imgAspect > canvasAspect) {
          drawW = W * scale
          drawH = drawW / imgAspect
        } else {
          drawH = H * scale
          drawW = drawH * imgAspect
        }
      }
      const drawX = (W - drawW) * posX
      const drawY = (H - drawH) * posY
      ctx.drawImage(img, drawX, drawY, drawW, drawH)

      // 3. Overlay
      if (overlayOpacity > 0) {
        ctx.save()
        const m = overlayColor.replace('#', '').match(/.{2}/g)
        const rgb = m ? m.map((h: string) => parseInt(h, 16)).join(',') : '0,0,0'
        if (overlayType === 'solid') {
          ctx.fillStyle = `rgba(${rgb},${overlayOpacity})`
          ctx.fillRect(0, 0, W, H)
        } else {
          const ot = overlayType as string
          const grd = ctx.createLinearGradient(
            0,
            ot === 'gradient-bottom' ? H : 0,
            0,
            ot === 'gradient-bottom' ? 0 : H
          )
          grd.addColorStop(0, `rgba(${rgb},${overlayOpacity})`)
          grd.addColorStop(1, `rgba(${rgb},0)`)
          ctx.fillStyle = grd
          ctx.fillRect(0, 0, W, H)
        }
        ctx.restore()
      }

      // 4. Textboxes — fontSizeRel * W = proportional to real asset
      for (const box of freeTextBoxes) {
        if (!box.text || box.text === '...') continue
        const fontSize = Math.max(8, Math.round((box.fontSizeRel ?? 0.06) * W))
        const bx = Math.round((box.xRel ?? 0.06) * W)
        const by = Math.round((box.yRel ?? 0.5) * H)
        const bw = Math.round((box.boxWidthRel ?? 0.88) * W)
        const fam = (box.fontFamily ?? activeFontFamily ?? 'Inter')
          .replace(/'/g, '')
          .split(',')[0]
          .trim()

        ctx.save()
        ctx.font = `600 ${fontSize}px "${fam}"`
        ctx.fillStyle = box.color ?? '#FFFFFF'
        ctx.textAlign = (box.textAlign ?? 'center') as CanvasTextAlign
        ctx.textBaseline = 'top'

        if (box.textShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.7)'
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 2
        }

        const words = box.text.split(' ')
        const lines: string[] = []
        let cur = ''
        for (const w of words) {
          const t = cur ? `${cur} ${w}` : w
          if (ctx.measureText(t).width <= bw) {
            cur = t
          } else {
            if (cur) lines.push(cur)
            cur = w
          }
        }
        if (cur) lines.push(cur)

        const tx =
          box.textAlign === 'center' ? bx + bw / 2 : box.textAlign === 'right' ? bx + bw : bx
        const lineH = fontSize * 1.25
        lines.forEach((l, i) => ctx.fillText(l, tx, by + i * lineH))
        ctx.restore()
      }

      // 5. Download
      const a = document.createElement('a')
      a.download = `${activeCampaign.title}-${selectedChannel}-snew.png`
      a.href = oc.toDataURL('image/png')
      a.click()
      toast.success(`Download · ${W}×${H}px`)
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error('Erro ao exportar. Tente novamente.')
    }
  }, [
    activeImageUrl,
    activeVideoUrl,
    activeCampaign.title,
    selectedChannel,
    selectedRatio,
    selectedFont,
    freeTextBoxes,
    overlayOpacity,
    overlayColor,
    overlayType,
    overlayPosition,
    imagePosition,
    imageScale,
    imageFit,
  ])

  // ── HTML Export for Banner Site ──
  const [htmlExportModalOpen, setHtmlExportModalOpen] = useState(false)
  const [generatedHTML, setGeneratedHTML] = useState('')

  const hexToRgb = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r}, ${g}, ${b}`
  }

  const generateBannerHTML = useCallback(
    (p: {
      imageUrl: string
      heading: string
      description: string
      cta: string
      ctaColor: string
      ctaTextColor: string
      ctaRadius: string
      textColor: string
      overlayType: 'gradient' | 'solid'
      overlayColor: string
      overlayOpacity: number
      overlayPosition: 'bottom' | 'top' | 'full'
      fontFamily: string
      textHAlign: 'left' | 'center' | 'right'
      textVAlign: 'bottom' | 'center' | 'top'
      fontWeight: string
      letterSpacing: string
      ctaUrl: string
    }): string => {
      const rgb = hexToRgb(p.overlayColor)
      const overlayCSS =
        p.overlayType === 'solid'
          ? `background: rgba(${rgb}, ${p.overlayOpacity});`
          : {
              bottom: `background: linear-gradient(to top, rgba(${rgb}, ${p.overlayOpacity}) 0%, rgba(${rgb}, ${p.overlayOpacity * 0.5}) 50%, transparent 100%);`,
              top: `background: linear-gradient(to bottom, rgba(${rgb}, ${p.overlayOpacity}) 0%, rgba(${rgb}, ${p.overlayOpacity * 0.5}) 50%, transparent 100%);`,
              full: `background: linear-gradient(to top, rgba(${rgb}, ${p.overlayOpacity}) 0%, rgba(${rgb}, ${p.overlayOpacity * 0.3}) 50%, rgba(${rgb}, ${p.overlayOpacity}) 100%);`,
            }[p.overlayPosition]
      const alignMap: Record<string, string> = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end',
      }
      const vAlignMap: Record<string, string> = {
        top: 'flex-start',
        center: 'center',
        bottom: 'flex-end',
      }

      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Serif+Display&family=Inter:wght@400;600;700&family=Fraunces:wght@700&family=Space+Grotesk:wght@500;700&family=Cormorant+Garamond:wght@600&family=Raleway:wght@400;700&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.snew-banner{position:relative;width:100%;max-width:1200px;height:628px;overflow:hidden;border-radius:12px;font-family:${p.fontFamily}}
.snew-banner__bg{position:absolute;inset:0;background-image:url('${p.imageUrl}');background-size:cover;background-position:center;background-repeat:no-repeat}
.snew-banner__overlay{position:absolute;inset:0;${overlayCSS}}
.snew-banner__content{position:absolute;inset:0;padding:48px 56px;display:flex;flex-direction:column;align-items:${alignMap[p.textHAlign]};justify-content:${vAlignMap[p.textVAlign]};gap:16px;text-align:${p.textHAlign}}
.snew-banner__heading{font-size:clamp(28px,3.5vw,48px);font-weight:${p.fontWeight};color:${p.textColor};line-height:1.15;letter-spacing:${p.letterSpacing};max-width:640px;text-shadow:0 2px 8px rgba(0,0,0,0.2)}
.snew-banner__description{font-size:clamp(14px,1.4vw,18px);font-weight:400;color:${p.textColor};opacity:0.9;line-height:1.5;max-width:520px;text-shadow:0 1px 4px rgba(0,0,0,0.2)}
.snew-banner__cta{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:${p.ctaColor};color:${p.ctaTextColor};font-family:inherit;font-size:clamp(14px,1.2vw,16px);font-weight:600;letter-spacing:0.02em;border-radius:999px;border:none;cursor:pointer;text-decoration:none;transition:opacity 0.2s ease,transform 0.15s ease;margin-top:8px}
.snew-banner__cta:hover{opacity:0.9;transform:translateY(-1px)}
@media(max-width:768px){.snew-banner{height:auto;min-height:320px}.snew-banner__content{padding:32px}}
</style>
</head>
<body>
<div class="snew-banner" role="img" aria-label="${p.heading}">
<div class="snew-banner__bg"></div>
<div class="snew-banner__overlay"></div>
<div class="snew-banner__content">
${p.heading ? `<h2 class="snew-banner__heading">${p.heading}</h2>` : ''}
${p.description ? `<p class="snew-banner__description">${p.description}</p>` : ''}
${p.cta ? `<a href="${p.ctaUrl}" class="snew-banner__cta">${p.cta}</a>` : ''}
</div>
</div>
</body>
</html>`
    },
    []
  )

  const handleExportHTML = useCallback(() => {
    const html = generateBannerHTML({
      imageUrl: activeImageUrl ?? '',
      heading: headingVisible ? heading : '',
      description: descriptionVisible ? description : '',
      cta: ctaVisible ? cta : '',
      ctaColor,
      ctaTextColor: ctaColor === '#FFFFFF' ? '#1A1A1A' : '#FFFFFF',
      ctaRadius,
      textColor,
      overlayType,
      overlayColor,
      overlayOpacity,
      overlayPosition,
      fontFamily: getFontFamily(selectedFont),
      textHAlign,
      textVAlign,
      fontWeight: fontWeightState || '700',
      letterSpacing: letterSpacing || '0em',
      ctaUrl: '#',
    })
    setGeneratedHTML(html)
    setHtmlExportModalOpen(true)
  }, [
    activeImageUrl,
    heading,
    headingVisible,
    description,
    descriptionVisible,
    cta,
    ctaVisible,
    ctaColor,
    ctaRadius,
    textColor,
    overlayType,
    overlayColor,
    overlayOpacity,
    overlayPosition,
    selectedFont,
    textHAlign,
    textVAlign,
    fontWeightState,
    letterSpacing,
    generateBannerHTML,
  ])

  const handleDownloadHTML = useCallback(() => {
    const blob = new Blob([generatedHTML], { type: 'text/html; charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `banner-${activeCampaign.title.toLowerCase().replace(/\s+/g, '-')}.html`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('Banner HTML baixado')
  }, [generatedHTML, activeCampaign.title])

  const imageUrlToBase64 = useCallback(
    (url: string): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          canvas.getContext('2d')!.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/jpeg', 0.92).split(',')[1])
        }
        img.onerror = reject
        img.src = url
      }),
    []
  )

  // Build visual context by analyzing the current canvas image
  const visualContextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAnalyzedUrlRef = useRef<string>('')

  const buildVisualContext = useCallback(
    async (imageUrl: string): Promise<string> => {
      if (!imageUrl || isPlaceholderImage(imageUrl)) return ''
      try {
        const imageBase64 = await imageUrlToBase64(imageUrl)
        const { data: analysisData, error } = await supabase.functions.invoke('gemini-generate', {
          body: {
            prompt: `Analyze this product image and respond ONLY with a JSON object, no other text:
{
  "product": "what product is shown (be specific)",
  "mood": "emotional tone of the image in 3 words",
  "style": "visual style (e.g. pop illustration, lifestyle, studio, editorial)",
  "colors": "dominant colors",
  "context": "one sentence describing what makes this image unique and what feeling it conveys"
}`,
            model: 'gemini-2.5-flash',
            images: [imageBase64],
            responseType: 'text',
          },
        })
        if (error || !analysisData?.text) return ''
        const match = analysisData.text.match(/\{[\s\S]*\}/)
        if (!match) return ''
        const parsed = JSON.parse(match[0])
        const ctx = `Product shown: ${parsed.product}. Visual mood: ${parsed.mood}. Style: ${parsed.style}. Colors: ${parsed.colors}. Context: ${parsed.context}`
        visualContextRef.current = ctx
        return ctx
      } catch {
        return ''
      }
    },
    [isPlaceholderImage, imageUrlToBase64]
  )

  // Update visual context when image changes — debounced to avoid rate limits
  useEffect(() => {
    if (!activeImageUrl || isPlaceholderImage(activeImageUrl)) {
      setVisualContext('')
      visualContextRef.current = ''
      return
    }
    // Skip if we already analyzed this exact URL
    if (lastAnalyzedUrlRef.current === activeImageUrl) return

    // Clear previous timer
    if (visualContextTimerRef.current) clearTimeout(visualContextTimerRef.current)

    let cancelled = false
    visualContextTimerRef.current = setTimeout(() => {
      if (cancelled) return
      lastAnalyzedUrlRef.current = activeImageUrl
      setIsAnalyzingImage(true)
      buildVisualContext(activeImageUrl).then((ctx) => {
        if (!cancelled) {
          setVisualContext(ctx)
          visualContextRef.current = ctx
          setIsAnalyzingImage(false)
        }
      })
    }, 2000) // 2s debounce

    return () => {
      cancelled = true
      if (visualContextTimerRef.current) clearTimeout(visualContextTimerRef.current)
    }
  }, [activeImageUrl, buildVisualContext, isPlaceholderImage])

  const generateImageWithPrompt = useCallback(
    async (prompt: string, count: number = 1, overrideStyle?: ImageStyleOption | null) => {
      setIsGenerating(true)
      setGenerateError(null)
      setIsGeneratingAsset(true)
      setGeneratingLabel(`Gerando com ${currentModel.name}...`)
      try {
        // Use override style if provided, otherwise current selected style
        const effectiveStyle = overrideStyle !== undefined ? overrideStyle : selectedImageStyle

        // Apply image style — use buildPrompt if available, otherwise promptBase
        const productName = activeProductName ?? 'the product'
        const productDesc = (activeProduct as any)?.description ?? activeProduct?.name ?? ''
        let activeStyleBase: string
        let materialDetailBase64: string | undefined

        if (effectiveStyle?.id === 'material-detail') {
          // Image-to-image: use current canvas image as reference for macro detail
          const currentImage = activeImageUrl
          if (currentImage && !isPlaceholderImage(currentImage)) {
            try {
              setGeneratingLabel('Analisando produto...')
              materialDetailBase64 = await imageUrlToBase64(currentImage)
            } catch {
              /* fallback to generation without reference */
            }
          }

          activeStyleBase = `You are given a product photograph. Transform it into an extreme macro detail shot.
DO NOT generate a new product. Use the exact product shown in the reference image.
Zoom into the most visually interesting detail of the product in the reference image:
a button, texture, edge, surface pattern, clasp, label, stitching, or material grain.
The detail should fill 85% of the frame.
Shot from a diagonal angle with soft side lighting from the left.
f/2.0 aperture: razor-sharp focus on the chosen detail, everything else in soft bokeh.
Background: same neutral tone as the original image, softly blurred.
Color grade: slightly desaturated, matte, cool-neutral — preserve the product's original colors accurately.
No people. No props. No lifestyle elements.
The output must feel like a macro photography detail of the exact same product.`
          setGeneratingLabel(`Gerando com ${currentModel.name}...`)
        } else if (effectiveStyle?.id === 'commercial-product') {
          // Commercial Product: use async Gemini analysis when product image is available
          const productImg = activeProduct?.image ?? (activeProduct as any)?.imageUrl
          let productImgBase64: string | undefined
          if (productImg) {
            try {
              productImgBase64 = await imageUrlToBase64(productImg)
            } catch {
              /* no image */
            }
          }
          setGeneratingLabel('Analisando produto...')
          activeStyleBase = await buildCommercialPrompt({
            productName,
            productDescription: productDesc,
            brandName: storeCtx?.name ?? data.campaignTitle ?? '',
            imageBase64: productImgBase64,
          })
          setGeneratingLabel(`Gerando com ${currentModel.name}...`)
        } else if (effectiveStyle?.buildPrompt) {
          activeStyleBase = effectiveStyle.buildPrompt({
            productName,
            productDescription: productDesc,
            brandName: storeCtx?.name ?? data.campaignTitle ?? '',
            niche: storeCtx?.niche ?? '',
            audience: storeCtx?.audience ?? '',
            tone: storeCtx?.tone ?? '',
            // Visual direction from KB
            modelGender: storeCtx?.modelProfile?.gender ?? '',
            modelAge: storeCtx?.modelProfile?.ageRange ?? '',
            modelPose: storeCtx?.modelProfile?.pose ?? '',
            visualConcept: storeCtx?.visualConcept ?? '',
            shootingStyle: storeCtx?.shootingStyle ?? '',
            lightingMood: storeCtx?.lightingMood ?? '',
            colorMood: storeCtx?.colorMood ?? '',
            context:
              effectiveStyle.id === 'product-attributes'
                ? ((selectedRatio as any)?.id ?? '1:1')
                : prompt,
          })
          // Enrich product-attributes with real features/attributes
          if (effectiveStyle.id === 'product-attributes') {
            const productAttrs =
              (activeProduct as any)?.attributes ?? (activeProduct as any)?.features ?? []
            if (productAttrs.length > 0) {
              activeStyleBase += `\nProduct features to annotate: ${productAttrs.map((a: any) => a.label || a).join(', ')}.`
            }
          }
        } else {
          activeStyleBase = effectiveStyle?.promptBase ?? GLOBAL_STYLE_BASE
        }
        const styleSuffix = effectiveStyle?.buildPrompt ? '' : `. Style: ${activeStyleBase}`
        const fullStylePrompt = effectiveStyle?.buildPrompt ? activeStyleBase : ''
        const negativeInstruction = ` Avoid: ${effectiveStyle?.negativePrompt ?? GLOBAL_NEGATIVE_PROMPT}.`
        const productInstruction =
          useProductReference && (selectedCombineProduct || activeProduct)
            ? ` The product from the reference image must appear in the scene exactly as shown — preserve all colors, text, embroidery and design details faithfully.`
            : ''
        const textInstruction = buildTextInstruction()

        // Composition prefix — reserve space for text when headingInImage is active
        const compositionPrefix =
          headingInImage && heading
            ? `Compose this scene leaving clear empty space in the lower 30% of the image for text overlay. The lower portion should have a clean background or dark gradient suitable for white text. `
            : ''

        // Visual DNA — invisible layer
        const dnaParts: string[] = []
        const dnaInstruction = ''

        const refInstruction =
          referenceImages.length > 0
            ? ` Use the uploaded reference images as visual style guidance — adapt their composition, lighting, and mood to the scene.`
            : ''

        // Detect if the prompt is replacing the subject/product
        const isSubjectReplacement = (() => {
          const p = prompt.toLowerCase()
          const replacementWords =
            /trocar|substituir|trocar por|mudar para|usar|colocar|mostrar|quero ver|lata|garrafa|tênis|roupa|camisa|vestido|bolsa/i
          const currentProd = (activeProductName ?? '').toLowerCase().slice(0, 8)
          // If prompt mentions replacement keywords AND doesn't match current product → it's a swap
          return replacementWords.test(p) && (!currentProd || !p.includes(currentProd))
        })()

        const canvasRefInstruction =
          activeImageUrl && !isPlaceholderImage(activeImageUrl)
            ? isSubjectReplacement
              ? `\nStyle reference: apply the same lighting quality, color treatment and photographic style as the reference image. But generate a COMPLETELY NEW scene with the new subject described. Do NOT keep any elements from the previous image.`
              : `\nCanvas reference: maintain the same product, composition quality and overall aesthetic. Apply only the requested change.`
            : ''

        // When buildPrompt is available, use its output as the primary prompt (without Avoid: inline)
        // Instrução anti-texto — sempre no início, antes de tudo
        const noTextInstruction =
          'IMPORTANT: NO text, NO letters, NO words, NO typography overlay in the image. Pure photography only. '

        // When the user intent mentions a person/baby/model, a product-only
        // style (e.g. e-commerce-photography) conflicts with "No person, no
        // hands". Strip those forbidden tokens from the style base so the
        // model can actually draw a person holding/wearing the product.
        const userWantsPerson =
          /\b(bebê|bebe|baby|baby's|babies|modelo|model|pessoa|person|human|criança|crianca|child|kid|mãe|mae|pai|homem|mulher|woman|man|gestante|grávida|gravida|família|familia)\b/i.test(
            prompt ?? ''
          )
        const sanitizedStylePrompt = userWantsPerson
          ? fullStylePrompt
              .replace(/\bNo person,?\s*/gi, '')
              .replace(/\bno hands,?\s*/gi, '')
              .replace(/\bproduct only\b\.?,?\s*/gi, '')
          : fullStylePrompt

        const cleanPrompt = sanitizedStylePrompt
          ? `${noTextInstruction}${compositionPrefix}${sanitizedStylePrompt}. User intent: ${prompt}${productInstruction}${refInstruction}${canvasRefInstruction}${dnaInstruction}${kbInline}${textInstruction ? '\n\n' + textInstruction : ''}`
          : `${noTextInstruction}${compositionPrefix}${prompt}${styleSuffix}${productInstruction}${refInstruction}${canvasRefInstruction}${dnaInstruction}${kbInline}${textInstruction ? '\n\n' + textInstruction : ''}`

        const modelForGeneration =
          includeTextInImage && textInstruction ? 'gemini-3.1-flash-image-preview' : currentModel.id

        // Collect all images: DNA refs + product ref
        const allImages: string[] = [...dnaParts]

        // Brand references from knowledge base — fetch as base64 on demand
        const _storeCtxForRefs = loadStoreContext()
        if (_storeCtxForRefs?.brandReferences?.length) {
          try {
            const brandBase64s = await loadBrandReferencesBase64(
              _storeCtxForRefs.brandReferences,
              3
            )
            for (const b64 of brandBase64s) {
              allImages.unshift(b64)
            }
          } catch {}
        }

        // Material Detail: add canvas image as primary reference
        if (materialDetailBase64) {
          allImages.unshift(materialDetailBase64)
        }

        // Style-level references (set by admin) — prepend for higher priority
        if (effectiveStyle?.styleReferences?.length) {
          for (const ref of effectiveStyle.styleReferences) {
            if (ref.base64) allImages.unshift(ref.base64)
          }
        }

        // User reference images
        for (const ref of referenceImages) {
          if (ref.base64) allImages.push(ref.base64)
        }

        if (useProductReference) {
          const productImg =
            (selectedCombineProduct as any)?.image ||
            (selectedCombineProduct as any)?.imageUrl ||
            activeProduct?.image
          if (productImg) {
            try {
              const base64 = await imageUrlToBase64(productImg)
              allImages.push(base64)
            } catch (e) {
              console.warn('Could not convert product image to base64:', e)
            }
          }
        }

        // Chat-surfaced product image (user asked Nuvemshop for a product
        // and is now generating a campaign around it) — use as reference
        // so Gemini preserves the real product. Read from ref so the value
        // set earlier in this same dispatch loop is visible (state would
        // be stale-closured).
        const chatProductSrc = chatProductImageUrlRef.current ?? chatProductImageUrl
        if (
          chatProductSrc &&
          !useProductReference &&
          referenceImages.length === 0 &&
          (!activeImageUrl || isPlaceholderImage(activeImageUrl))
        ) {
          try {
            const base64 = await imageUrlToBase64(chatProductSrc)
            allImages.push(base64)
          } catch (e) {
            console.warn('Could not convert chat product image to base64:', e)
          }
        }

        // Always include current canvas image as visual reference for regeneration
        if (activeImageUrl && !isPlaceholderImage(activeImageUrl)) {
          try {
            const canvasBase64 = await imageUrlToBase64(activeImageUrl)
            allImages.push(canvasBase64)
          } catch (e) {
            console.warn('Could not convert canvas image to base64:', e)
          }
        }

        const geminiAspectRatio = GEMINI_ASPECT_MAP[selectedRatio.id] ?? '1:1'

        const body: Record<string, unknown> = {
          prompt: cleanPrompt,
          model: modelForGeneration,
          aspectRatio: geminiAspectRatio,
          negativePrompt: [
            // Anti-texto — prioridade máxima
            'text in image',
            'letters',
            'words',
            'typography overlay',
            'vertical text',
            'diagonal text',
            'headline overlay',
            'watermark',
            'logo overlay',
            'signature',
            // Sem materiais sintéticos
            'chrome',
            'glossy surface',
            'neon glow',
            'holographic',
            'glitter',
            // Sem estilos não fotográficos
            'illustration',
            'watercolor',
            'cartoon',
            '3d render',
            'CGI',
            'vector art',
            'oversaturated',
            'stock photo smile',
            // Estilo específico se disponível — mas quando o user pediu
            // bebê/modelo/pessoa, remover tokens incompatíveis do estilo
            // (ex: "person", "human", "hands") pra a imagem poder ter gente.
            ...(effectiveStyle?.negativePrompt
              ? effectiveStyle.negativePrompt
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter((s: string) =>
                    userWantsPerson
                      ? !/^(person|human|hands?|people|model|pessoa|modelo)$/i.test(s)
                      : true
                  )
              : []),
          ].join(', '),
          personGeneration: (() => {
            const personKeywords =
              /baby|beb[êe]|crian[çc]a|child|infant|model[oa]?|pessoa|mulher|homem|woman|man|menin[oa]|boy|girl|family|fam[ií]lia|portrait|advertising-portrait/i
            const styleAllows = [
              'product-lifestyle',
              'warm-lifestyle',
              'bold-vibrant',
              'pop-illustration',
              'fashion-on-model',
              'campaign-editorial',
              'product-attributes',
              'advertising-portrait',
            ].includes(effectiveStyle?.id ?? '')
            const promptMentionsPeople =
              personKeywords.test(prompt) || personKeywords.test(cleanPrompt)
            return styleAllows || promptMentionsPeople ? 'allow_adult' : 'dont_allow'
          })(),
        }

        // Send all images via the images array
        if (allImages.length > 0) {
          body.images = allImages
        }

        const { data: fnData, error } = await supabase.functions.invoke('gemini-generate', { body })
        if (error) throw error
        if (fnData?.fallback || fnData?.error) {
          throw new Error(fnData?.error || 'Falha ao gerar imagem. Tente novamente.')
        }
        const rawUrl = fnData?.imageUrl
        // Hoist data:URLs into chat-uploads storage so subsequent canvas
        // snapshots persist a small public URL instead of a 1–2 MB base64
        // blob (which made the canvas slow on reload and bloated the row).
        const url = rawUrl ? await uploadDataUrlToStorage(rawUrl) : rawUrl
        if (url) {
          setGeneratedImageUrl(url)
          setActiveImageUrl(url)

          // Add to gallery
          const gId = `g-${Date.now()}`
          setImgGallery((prev) => [...prev, { id: gId, url }])
          setActiveGalleryId(gId)

          // Auto-generate contextual heading based on image prompt
          if (!heading || heading === '' || heading === 'main-text') {
            try {
              const { data: copyData } = await supabase.functions.invoke('generate-copy', {
                body: {
                  action: 'auto-generate',
                  field: 'full',
                  tone: 'emocional',
                  campaign: {
                    title: prompt.slice(0, 120),
                    product: activeProductName ?? '',
                    channel: 'Instagram Stories — copy curta, emocional',
                    context: `Imagem gerada com prompt: ${prompt.slice(0, 200)}`,
                    brandContext: brandContextBody,
                  },
                },
              })
              if (copyData?.heading) {
                setHeading(copyData.heading)
                setFreeTextBoxes((prev) =>
                  prev.map((b) => (b.id === 'main-text' ? { ...b, text: copyData.heading } : b))
                )
                if (copyData.description) setDescription(copyData.description)
                if (copyData.cta) setCta(copyData.cta)
              }
            } catch (e) {
              console.warn('Auto copy generation failed:', e)
            }
          }
          setImageFit('cover')
          setImageScale(100)
          setImagePosition({ x: 50, y: 50 })
          setImageHasEmbeddedText(includeTextInImage)

          // Imagem limpa — sem overlay, sem texto automático
          setOverlayOpacity(0)
          setHeadingVisible(false)
          setDescriptionVisible(false)
          setCtaVisible(false)
          setFreeTextBoxes([])
          setSelectedBoxId(null)
          // If count > 1 add to variations gallery, else apply directly
          if (count > 1) {
            const varId = `var-${Date.now()}`
            setCanvasVariations((prev) => {
              const next = [...prev, { id: varId, url, label: `Variação ${prev.length + 1}` }]
              return next
            })
            setActiveVariationId(varId)
            setShowThumbnailStrip(true)
          } else {
            setCanvasVariations([])
            setActiveVariationId(null)
          }
          toast.success(count > 1 ? `Variação gerada!` : 'Imagem gerada!')
          saveToHistory(url)

          const productName = activeProductName || activeProduct?.name || ''
          const styleName = effectiveStyle?.name ?? 'editorial photo'
          const channel = selectedRatio?.sublabel ?? 'stories'

          // Rotacionar sugestões para evitar repetição
          const allNextSteps = [
            { id: 'add_text', label: 'adicionar headline nesta imagem', action: 'show_text' },
            {
              id: 'caption',
              label: `criar legenda para ${channel.toLowerCase()}`,
              action: 'generate_caption',
            },
            {
              id: 'email',
              label: `montar e-mail marketing${productName ? ` do ${productName}` : ''}`,
              action: 'generate_email',
            },
            { id: 'style', label: 'gerar variação em outro estilo', action: 'open_style_variant' },
            {
              id: 'attributes',
              label: 'criar versão com atributos do produto',
              action: 'apply_style_product_attributes',
            },
            { id: 'video', label: 'transformar em vídeo', action: 'open_video_panel' },
          ]
          const historyCount = assetHistory.length % allNextSteps.length
          const rotatedSteps = [
            ...allNextSteps.slice(historyCount),
            ...allNextSteps.slice(0, historyCount),
          ].slice(0, 4)

          if (!chatTitle) {
            const autoTitle = productName
              ? `${styleName.toLowerCase()} · ${productName}`
              : styleName.toLowerCase()
            setChatTitle(autoTitle)
          }

          pushActivity(
            'image_generated',
            'imagem gerada',
            `estilo ${styleName.toLowerCase()} aplicado.`,
            [
              { id: 'like', label: 'gostei', action: 'feedback_like' },
              { id: 'dislike', label: 'não gostei', action: 'feedback_dislike' },
              { id: 'retry', label: 'tentar novamente', action: 'regenerate_image' },
              ...rotatedSteps,
            ],
            url
          )
        } else {
          setGenerateError('Não foi possível gerar a imagem')
        }
      } catch (err) {
        console.error('Gemini error:', err)
        setGenerateError('Erro ao gerar imagem. Tente novamente.')
      } finally {
        setIsGenerating(false)
        setIsGeneratingAsset(false)
        setGeneratingLabel('')
        setIsChatExecuting(false)
        setChatExecutingLabel('')
      }
    },
    [
      selectedChannel,
      currentModel.id,
      useProductReference,
      activeProduct,
      imageUrlToBase64,
      selectedImageStyle,
      includeTextInImage,
      includeHeading,
      includeDescription,
      includeCta,
      textInImageStyle,
      textInImagePosition,
      heading,
      description,
      cta,
      selectedFont,
      textColor,
      saveToHistory,
      pushActivity,
      referenceImages,
      chatProductImageUrl,
      buildCommercialPrompt,
    ]
  )

  const handleGenerateImage = useCallback(
    async (overridePrompt?: string) => {
      const productName = activeProductName?.trim() ?? ''
      const productDesc = (activeProduct as any)?.description ?? ''

      if (!overridePrompt?.trim() && !imagePrompt.trim() && !productName) {
        toast.info('Selecione um produto antes de gerar a imagem.')
        return
      }

      const userInput = overridePrompt?.trim() || imagePrompt.trim()

      // Build final prompt — style is injected here, NEVER written back to imagePrompt
      let finalPrompt: string

      if (selectedImageStyle?.buildPrompt) {
        const stylePrompt = selectedImageStyle.buildPrompt({
          productName: productName || 'the product',
          productDescription: productDesc,
          brandName: storeCtx?.name ?? data.campaignTitle ?? '',
          niche: storeCtx?.niche ?? '',
          audience: storeCtx?.audience ?? '',
          tone: storeCtx?.tone ?? '',
          modelGender: storeCtx?.modelProfile?.gender ?? '',
          modelAge: storeCtx?.modelProfile?.ageRange ?? '',
          context: selectedRatio?.id ?? '1:1',
        })
        if (
          userInput &&
          !stylePrompt.toLowerCase().includes(userInput.toLowerCase().slice(0, 20))
        ) {
          finalPrompt = `${stylePrompt}. ${userInput}`
        } else {
          finalPrompt = stylePrompt
        }
      } else if (selectedImageStyle?.promptBase) {
        const base = productName
          ? `${productName}, ${selectedImageStyle.promptBase}`
          : selectedImageStyle.promptBase
        finalPrompt = userInput ? `${base}. ${userInput}` : base
      } else if (userInput) {
        if (productName && !userInput.toLowerCase().includes(productName.toLowerCase())) {
          finalPrompt = `${productName}, ${userInput}`
        } else {
          finalPrompt = userInput
        }
      } else {
        if (!productName) {
          toast.info('Descreva a imagem ou selecione um produto.')
          return
        }
        finalPrompt = productName
      }

      if (!finalPrompt.trim()) {
        toast.info('Selecione um produto ou descreva o que gerar.')
        return
      }

      // DO NOT call setImagePrompt — user prompt stays untouched
      await generateImageWithPrompt(finalPrompt)
    },
    [
      imagePrompt,
      buildAutoPrompt,
      selectedImageStyle,
      activeProduct,
      activeProductName,
      data,
      selectedRatio,
      generateImageWithPrompt,
    ]
  )

  // Keep generateRef in sync
  useEffect(() => {
    generateRef.current = generateImageWithPrompt
  }, [generateImageWithPrompt])

  // ── Product Features Mode ── extraction + generation
  const extractProductFeatures = useCallback(
    async (
      productName: string,
      productDescription: string,
      language: 'pt' | 'en' | 'es' = 'pt'
    ): Promise<ProductFeature[]> => {
      const langInstruction = {
        pt: 'Write ALL labels and sublabels in Brazilian Portuguese only.',
        en: 'Write ALL labels and sublabels in English only.',
        es: 'Write ALL labels and sublabels in Spanish only.',
      }[language]

      const prompt = `You are a product copywriter for e-commerce.
Given this product: "${productName}". ${productDescription ? `Description: ${productDescription}` : ''}

Extract exactly 3 to 4 key product features that would appear as callout annotations on a product image.
Each feature needs a short label (2-4 words max) and an anchor position on the image.

${langInstruction}

Respond ONLY with valid JSON, no other text:
{
  "features": [
    {
      "id": "f1",
      "label": "Algodao Premium",
      "sublabel": "Toque macio",
      "anchor": { "x": 0.65, "y": 0.55 },
      "labelSide": "right"
    }
  ]
}

Rules for anchor positions:
- Spread features around the product — top, middle, bottom areas
- x between 0.15 and 0.85, y between 0.15 and 0.85
- Alternate labelSide: right for x > 0.5, left for x < 0.5
- Features should point to distinct parts of the product`

      const { data: respData, error } = await supabase.functions.invoke('gemini-generate', {
        body: { prompt, model: 'gemini-3.1-flash-image-preview', responseType: 'text' },
      })
      if (error) throw error
      try {
        const text = respData?.text ?? ''
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('No JSON found')
        const parsed = JSON.parse(match[0])
        return parsed.features ?? []
      } catch {
        return [
          {
            id: 'f1',
            label: 'Premium material',
            anchor: { x: 0.7, y: 0.35 },
            labelSide: 'right' as const,
          },
          {
            id: 'f2',
            label: 'Adjustable strap',
            anchor: { x: 0.3, y: 0.25 },
            labelSide: 'left' as const,
          },
          {
            id: 'f3',
            label: 'Spacious interior',
            anchor: { x: 0.6, y: 0.65 },
            labelSide: 'right' as const,
          },
        ]
      }
    },
    []
  )

  const handleGenerateWithFeatures = useCallback(async () => {
    const productName = activeProductName ?? 'product'
    const productDesc = (activeProduct as any)?.description ?? ''
    setIsGeneratingFeatures(true)
    setProductFeatures([])
    try {
      const features = await extractProductFeatures(productName, productDesc)
      setProductFeatures(features)
      const featureImagePrompt = `Studio product photography of ${productName}.
Pure white or very light grey seamless background.
Product centered, perfectly sharp, professional commercial photography.
Shot from slight 3/4 angle to show depth and multiple surfaces.
Soft studio lighting, no harsh shadows, product fills 65% of frame.
${productDesc ? `Product details: ${productDesc}.` : ''}
High resolution, retail-ready, multiple product details visible.`
      await generateImageWithPrompt(featureImagePrompt)
      setFeaturesMode(true)
    } catch (err) {
      console.error('Features generation error:', err)
      toast.error('Erro ao gerar features. Tente novamente.')
    } finally {
      setIsGeneratingFeatures(false)
    }
  }, [activeProduct, activeProductName, extractProductFeatures, generateImageWithPrompt])

  // ── Board mode handlers ──
  const enterBoardMode = useCallback(() => {
    const COLS = 3
    const CARD_W = 220
    const CARD_H = 300
    const LABEL_H = 40
    const GAP = 24
    const ROW_H = CARD_H + LABEL_H

    // Merge in-session assets with persisted document history from Agent
    const allItems: any[] = [...assetHistory]
    try {
      const persisted = JSON.parse(localStorage.getItem(getHistoryKey()) ?? '[]')
      const existingIds = new Set(allItems.map((a: any) => a.id))
      for (const item of persisted) {
        if (!existingIds.has(item.id)) {
          allItems.push(item)
          existingIds.add(item.id)
        }
      }
    } catch {}

    const assets: BoardAsset[] = allItems
      .filter(
        (item) =>
          (item.imageUrl &&
            item.imageUrl.length > 10 &&
            !item.imageUrl.includes('placeholder') &&
            !item.imageUrl.includes('picsum.photos')) ||
          item.type === 'document'
      )
      .slice(0, 30)
      .map((item, i) => ({
        id: item.id,
        imageUrl: item.imageUrl ?? '',
        x: (i % COLS) * (CARD_W + GAP),
        y: Math.floor(i / COLS) * (ROW_H + GAP),
        width: CARD_W,
        height: CARD_H,
        label: item.documentTitle ?? item.heading ?? item.channel ?? '',
        channel: item.channel ?? '',
        type: item.type ?? 'image',
        documentExcerpt: item.documentExcerpt ?? '',
        documentMarkdown: item.documentMarkdown ?? '',
      }))

    setBoardAssets(assets)

    const boardEl = boardRef.current
    const vpW = boardEl?.offsetWidth ?? window.innerWidth
    const vpH = boardEl?.offsetHeight ?? window.innerHeight
    const totalCols = Math.min(assets.length, COLS)
    const totalRows = Math.ceil(assets.length / COLS)
    const gridW = totalCols * CARD_W + Math.max(0, totalCols - 1) * GAP
    const gridH = totalRows * ROW_H + Math.max(0, totalRows - 1) * GAP

    setBoardOffset({ x: vpW / 2 - gridW / 2, y: vpH / 2 - gridH / 2 })
    setBoardScale(1)
    setBoardMode(true)
  }, [assetHistory])

  const exitBoardMode = useCallback(() => setBoardMode(false), [])

  // Open board mode on mount if requested — populate assets
  useEffect(() => {
    if (initialBoardMode) {
      enterBoardMode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBoardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-board-asset]')) return
      e.preventDefault()
      setBoardIsPanning(true)
      boardPanStart.current = { x: e.clientX, y: e.clientY, ox: boardOffset.x, oy: boardOffset.y }
    },
    [boardOffset]
  )

  const handleBoardMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (boardIsPanning && !boardDragRef.current) {
        setBoardOffset({
          x: boardPanStart.current.ox + e.clientX - boardPanStart.current.x,
          y: boardPanStart.current.oy + e.clientY - boardPanStart.current.y,
        })
        return
      }
      if (boardDragRef.current) {
        const { id, startX, startY, ax, ay } = boardDragRef.current
        setBoardAssets((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  x: ax + (e.clientX - startX) / boardScale,
                  y: ay + (e.clientY - startY) / boardScale,
                }
              : a
          )
        )
      }
    },
    [boardIsPanning, boardScale]
  )

  const handleBoardMouseUp = useCallback(() => {
    setBoardIsPanning(false)
    boardDragRef.current = null
    setBoardAssets((prev) => prev.map((a) => ({ ...a, isDragging: false })))
  }, [])

  const handleBoardWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(boardScale * delta, 0.2), 3)
      const rect = boardRef.current!.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const wx = (mouseX - boardOffset.x) / boardScale
      const wy = (mouseY - boardOffset.y) / boardScale
      setBoardScale(newScale)
      setBoardOffset({ x: mouseX - wx * newScale, y: mouseY - wy * newScale })
    },
    [boardScale, boardOffset]
  )

  const handleAssetMouseDown = useCallback(
    (e: React.MouseEvent, assetId: string) => {
      e.stopPropagation()
      const asset = boardAssets.find((a) => a.id === assetId)
      if (!asset) return
      boardDragRef.current = {
        id: assetId,
        startX: e.clientX,
        startY: e.clientY,
        ax: asset.x,
        ay: asset.y,
      }
      setBoardAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, isDragging: true } : a)))
    },
    [boardAssets]
  )

  const handleBoardAssetOpen = useCallback(
    (asset: BoardAsset) => {
      setActiveImageUrl(asset.imageUrl)
      exitBoardMode()
    },
    [exitBoardMode]
  )

  // ── Image Edit (inline) ──
  const handleApplyEdit = useCallback(async () => {
    if (!editPrompt.trim() || !activeImageUrl) return
    setIsApplyingEdit(true)
    try {
      const currentSrc = editPreviewUrl || activeImageUrl
      const currentBase64 = currentSrc.startsWith('data:')
        ? currentSrc.split(',')[1]
        : await imageUrlToBase64(currentSrc)

      const { data: fnData, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt: `Edit this image: ${editPrompt}.\nKeep everything else exactly the same — only apply the requested change.\nMaintain the same composition, lighting quality, and overall style.\nOutput a high quality image.`,
          model: 'gemini-3.1-flash-image-preview',
          images: [currentBase64],
        },
      })
      if (error) throw error
      if (fnData?.fallback || fnData?.error)
        throw new Error(fnData?.error || 'Falha ao editar imagem')
      const url = fnData?.imageUrl
      if (!url) throw new Error('Sem imagem na resposta')
      setEditPreviewUrl(url)
      setEditPrompt('')
      toast.success('Edição aplicada — clique Salvar para confirmar')
    } catch (err: any) {
      console.error('Edit error:', err)
      toast.error('Erro ao editar imagem. Tente novamente.')
    } finally {
      setIsApplyingEdit(false)
    }
  }, [editPrompt, activeImageUrl, editPreviewUrl, imageUrlToBase64])

  const handleSaveEdit = useCallback(() => {
    if (!editPreviewUrl) return
    setActiveImageUrl(editPreviewUrl)
    setIsEditingImage(false)
    setEditPreviewUrl(null)
    setEditPrompt('')
    saveToHistory(editPreviewUrl)
    toast.success('Imagem editada salva!')
    pushActivity(
      'image_edited',
      'Edição aplicada ✓',
      'Ficou melhor. Quer que eu analise se vai converter bem?',
      [
        { id: 'scan', label: 'analisar conversão', action: 'open_scan' },
        { id: 'publish', label: 'publicar agora', action: 'open_publish' },
      ],
      editPreviewUrl
    )
  }, [editPreviewUrl, saveToHistory])

  const handleCancelEdit = useCallback(() => {
    setIsEditingImage(false)
    setEditPreviewUrl(null)
    setEditPrompt('')
  }, [])

  const handleExpandBackground = useCallback(async () => {
    if (!activeImageUrl) return
    setIsExpandingBackground(true)
    setIsGeneratingAsset(true)
    setGeneratingLabel('Expandindo fundo com IA...')

    try {
      const base64 = await imageUrlToBase64(activeImageUrl)

      const ratioLabel = selectedRatio.id
      const prompt = `Expand and extend this image to fill a ${ratioLabel} format canvas naturally. 
Seamlessly continue the background, environment, lighting, and atmosphere beyond the original image borders. 
The original subject must remain exactly as-is in the center. 
Generate realistic, coherent surroundings that match the existing scene perfectly — same lighting, color palette, depth of field, and style. 
Output a complete ${ratioLabel} image with no seams, no borders, no artifacts.`

      const { data: fnData, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt,
          model: 'gemini-3.1-flash-image-preview',
          images: [base64],
        },
      })

      if (error) throw error
      const url = fnData?.imageUrl
      if (!url) throw new Error('Sem imagem na resposta')

      setActiveImageUrl(url)
      setGeneratedImageUrl(url)
      setImageFit('cover')
      setImageScale(100)
      setImagePosition({ x: 50, y: 50 })
      saveToHistory(url)

      // Canvas limpo após expansão
      setOverlayOpacity(0)
      setHeadingVisible(false)
      setDescriptionVisible(false)
      setCtaVisible(false)

      toast.success('Fundo expandido!')
      pushActivity(
        'image_edited',
        'Fundo expandido ✓',
        'IA expandiu o ambiente da imagem. Quer ajustar o posicionamento?',
        [
          { id: 'position', label: 'Ajustar posição', action: 'open_image_position' },
          { id: 'publish', label: 'Publicar', action: 'open_publish' },
        ],
        url
      )
    } catch (err: any) {
      console.error('Expand background error:', err)
      toast.error('Erro ao expandir fundo. Tente novamente.')
    } finally {
      setIsExpandingBackground(false)
      setIsGeneratingAsset(false)
      setGeneratingLabel('')
    }
  }, [activeImageUrl, selectedRatio, imageUrlToBase64, saveToHistory, pushActivity])

  const handleCombineImages = useCallback(async () => {
    if (!combineImg1) return
    setIsGeneratingAsset(true)
    setGeneratingLabel('Combinando imagens...')
    setGenerateError(null)

    try {
      const toBase64 = async (src: string): Promise<string> => {
        if (src.startsWith('data:')) return src
        const b64 = await imageUrlToBase64(src)
        return `data:image/jpeg;base64,${b64}`
      }

      const img1Data = await toBase64(combineImg1)
      const img2Data = combineImg2 ? await toBase64(combineImg2) : null

      const sceneDesc = SCENE_DESCRIPTIONS[combineScene]
      const extra = combinePrompt.trim() ? `. ${combinePrompt.trim()}` : ''

      let prompt: string
      if (img2Data) {
        prompt = `Combine the objects from the first image and the second image into a single photorealistic scene without altering them. Place them in a ${sceneDesc}. Unify lighting, tone, and depth-of-field across both. Blend naturally with ambient shadows, subtle grain, minimal lens effects, RAW-style grading, and final sharpening${extra}. High quality commercial photography.`
      } else {
        prompt = `Create a professional product photography mockup of this product. Place it in a ${sceneDesc}. Photorealistic, commercial grade. Maintain the exact product appearance${extra}. RAW-style grading, subtle shadows, high detail.`
      }

      const imagesArr = [img1Data]
      if (img2Data) imagesArr.push(img2Data)

      const { data: fnData, error } = await supabase.functions.invoke('gemini-generate', {
        body: { prompt, model: 'gemini-3.1-flash-image-preview', images: imagesArr },
      })
      if (error) throw error
      const url = fnData?.imageUrl
      if (url) {
        setActiveImageUrl(url)
        setGeneratedImageUrl(url)
        setImageGeneratorOpen(false)
        saveToHistory(url)
        toast.success('Imagem combinada gerada!')
      } else {
        throw new Error('No image returned')
      }
    } catch (err: any) {
      console.error('Combine error:', err)
      setGenerateError('Não foi possível combinar as imagens. Tente novamente.')
    } finally {
      setIsGeneratingAsset(false)
      setGeneratingLabel('')
    }
  }, [combineImg1, combineImg2, combineScene, combinePrompt, imageUrlToBase64, saveToHistory])

  const useGeneratedImage = useCallback(() => {
    if (generatedImageUrl) {
      setActiveImageUrl(generatedImageUrl)
      setGeneratedImageUrl(null)
      toast.success('Imagem aplicada ao canvas')
    }
  }, [generatedImageUrl])

  /* ── Conversion Scanner ── */
  const handleScan = useCallback(async () => {
    setIsScanning(true)
    setScanResult(null)

    // Calculate days to event
    let daysToEvent: number | null = null
    if (activeCampaign.date) {
      const diff = Math.ceil(
        (new Date(activeCampaign.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      daysToEvent = diff > 0 ? diff : null
    }

    try {
      const { data: fnData, error } = await supabase.functions.invoke('conversion-scanner', {
        body: {
          heading,
          description,
          cta,
          channel: selectedChannel,
          styleId: selectedStyleId,
          textColor,
          ctaColor,
          overlayOpacity,
          font: selectedFont,
          textHAlign,
          textVAlign,
          hasImage: !!activeImageUrl,
          product: activeProductName,
          productCategory: scanContext.productCategory,
          ticketAverage: scanContext.ticketAverage,
          campaignTitle: activeCampaign.title,
          campaignObjective: scanContext.campaignObjective,
          audience: scanContext.audience,
          placement:
            selectedChannel.includes('stories') || selectedChannel.includes('reels')
              ? 'stories'
              : 'feed',
          isPromotional: scanContext.isPromotional,
          daysToEvent,
        },
      })
      if (error) throw error
      setScanResult(fnData)
    } catch (err) {
      console.error('Scan error:', err)
      toast.error('Erro ao analisar criativo.')
    } finally {
      setIsScanning(false)
    }
  }, [
    data,
    selectedChannel,
    heading,
    description,
    cta,
    textColor,
    ctaColor,
    selectedFont,
    textHAlign,
    textVAlign,
    activeImageUrl,
    scanContext,
    activeCampaign,
    selectedStyleId,
    activeProduct,
  ])

  const [improvingSteps, setImprovingSteps] = useState<
    { label: string; done: boolean; active: boolean }[]
  >([])

  const handleAutoImprove = useCallback(async () => {
    if (!scanResult?.improveInstructions) return
    setIsImproving(true)
    const prevScore = scanResult.score
    const inst = scanResult.improveInstructions

    // Build steps list
    const steps = [
      { label: 'Aplicando textos sugeridos', done: false, active: false },
      { label: 'Ajustando cores e overlay', done: false, active: false },
      ...(inst.imagePrompt ? [{ label: 'Gerando nova imagem', done: false, active: false }] : []),
      { label: 'Reanalisando criativo', done: false, active: false },
    ]
    setImprovingSteps([...steps])

    const updateStep = (idx: number, status: 'active' | 'done') => {
      setImprovingSteps((prev) =>
        prev.map((s, i) => {
          if (i === idx) return { ...s, active: status === 'active', done: status === 'done' }
          if (i < idx) return { ...s, active: false, done: true }
          return s
        })
      )
    }

    try {
      // Step 1: Texts
      updateStep(0, 'active')
      if (inst.heading) setHeading(inst.heading)
      if (inst.description) setDescription(inst.description)
      if (inst.cta) setCta(inst.cta)
      await new Promise((r) => setTimeout(r, 400))
      updateStep(0, 'done')

      // Step 2: Colors & overlay
      updateStep(1, 'active')
      if (inst.textColor) setTextColor(inst.textColor)
      if (inst.ctaColor) setCtaColor(inst.ctaColor)
      if (inst.overlayOpacity != null) setOverlayOpacity(inst.overlayOpacity)
      if (inst.font) setSelectedFont(inst.font)
      if (inst.textHAlign) setTextHAlign(inst.textHAlign as any)
      if (inst.textVAlign) setTextVAlign(inst.textVAlign as any)
      await new Promise((r) => setTimeout(r, 400))
      updateStep(1, 'done')

      // Step 3: Image (if suggested)
      let stepOffset = 2
      if (inst.imagePrompt) {
        updateStep(stepOffset, 'active')
        setImagePrompt(inst.imagePrompt)
        try {
          await generateImageWithPrompt(inst.imagePrompt)
        } catch (err) {
          console.error('Auto-improve image error:', err)
        }
        updateStep(stepOffset, 'done')
        stepOffset++
      }

      // Step 4: Re-scan
      updateStep(stepOffset, 'active')
      saveToHistory()

      // Build summary for toast
      const actions: string[] = []
      if (inst.heading) actions.push(`Heading: "${inst.heading}"`)
      if (inst.cta) actions.push(`CTA: "${inst.cta}"`)
      if (inst.ctaColor) actions.push(`Cor do CTA: ${inst.ctaColor}`)
      if (inst.overlayOpacity != null)
        actions.push(`Overlay: ${Math.round(inst.overlayOpacity * 100)}%`)
      if (inst.imagePrompt) actions.push('Nova imagem gerada')
      toast.success(
        `${actions.length} melhoria${actions.length > 1 ? 's' : ''} aplicada${actions.length > 1 ? 's' : ''}! Score anterior: ${prevScore}/100`
      )

      await new Promise((r) => setTimeout(r, 600))
      updateStep(stepOffset, 'done')

      // Trigger re-scan
      setTimeout(() => {
        setImprovingSteps([])
        handleScan()
      }, 800)
    } catch (err) {
      console.error('Auto-improve error:', err)
      setImprovingSteps([])
    } finally {
      setIsImproving(false)
    }
  }, [scanResult, generateImageWithPrompt, handleScan, saveToHistory])

  /* ── Carousel generation ── */
  const handleGenerateCarousel = useCallback(async () => {
    setIsGeneratingCarousel(true)
    setCarouselSetupOpen(false)
    setIsGeneratingAsset(true)
    setGeneratingLabel('Criando storytelling...')
    try {
      const { data: fnData, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          campaignTitle: activeCampaign.title,
          product: activeProductName,
          heading,
          description,
          cta,
          slideCountMode,
          slideCount,
          brandContext: brandContextBody,
        },
      })
      if (error) throw error
      const slideDefs = fnData?.slides || []

      // Build slides with fallback images (batch image generation per slide)
      const slides: CarouselSlide[] = slideDefs.map((s: any, i: number) => ({
        id: s.id || `slide-${i + 1}`,
        heading: s.heading,
        description: s.description,
        cta: s.cta || (s.role === 'cta' ? cta : null),
        image: activeImageUrl,
        product: activeProductName,
        role: s.role,
      }))

      setGeneratedCarouselSlides(slides)
      setActiveSlide(0)
      toast.success(`Carrossel com ${slides.length} slides gerado!`)
      setGeneratingLabel('Gerando imagens dos slides...')

      // Generate images for each slide in background (batches of 3)
      const BATCH_SIZE = 3
      for (let i = 0; i < slideDefs.length; i += BATCH_SIZE) {
        const batch = slideDefs.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.allSettled(
          batch.map(async (sd: any, bIdx: number) => {
            const idx = i + bIdx
            try {
              const { data: imgData } = await supabase.functions.invoke('gemini-generate', {
                body: {
                  prompt: `${sd.imagePrompt}, ${activeProductName}, high quality commercial photography`,
                  model: 'gemini-2.5-flash-image',
                },
              })
              if (imgData?.imageUrl) {
                setGeneratedCarouselSlides((prev) =>
                  prev.map((sl, si) => (si === idx ? { ...sl, image: imgData.imageUrl } : sl))
                )
              }
            } catch (err) {
              console.warn(`Slide ${idx + 1} image failed:`, err)
            }
          })
        )
      }
    } catch (err) {
      console.error('Carousel generation error:', err)
      toast.error('Erro ao gerar carrossel. Tente novamente.')
    } finally {
      setIsGeneratingCarousel(false)
      setIsGeneratingAsset(false)
      setGeneratingLabel('')
    }
  }, [data, heading, description, cta, slideCountMode, slideCount, activeImageUrl])

  const updateSlide = useCallback(
    (index: number, field: 'heading' | 'description' | 'cta', value: string) => {
      setGeneratedCarouselSlides((prev) =>
        prev.map((slide, i) => (i === index ? { ...slide, [field]: value } : slide))
      )
    },
    []
  )

  // Slide image editor state
  const [slideImageEditorOpen, setSlideImageEditorOpen] = useState(false)
  const [slideProductSelectorOpen, setSlideProductSelectorOpen] = useState(false)
  const [slideImagePrompt, setSlideImagePrompt] = useState('')
  const [useSlideAiPrompt, setUseSlideAiPrompt] = useState(false)
  const [isGeneratingSlideImage, setIsGeneratingSlideImage] = useState(false)
  const [selectedSlideModel, setSelectedSlideModel] = useState('gemini-3.1-flash-image-preview')
  const [slideModelSelectorOpen, setSlideModelSelectorOpen] = useState(false)
  const [hoveredSlide, setHoveredSlide] = useState(false)
  const currentSlideModel = IMAGE_MODELS.find((m) => m.id === selectedSlideModel) || IMAGE_MODELS[1]

  // Initialize slide prompt when editor opens
  useEffect(() => {
    if (slideImageEditorOpen && generatedCarouselSlides[activeSlide]) {
      setSlideImagePrompt(
        (generatedCarouselSlides[activeSlide] as any)?.imagePrompt ||
          `${activeProductName}, high quality commercial photography`
      )
      setSelectedSlideModel('gemini-3.1-flash-image-preview')
      setSlideModelSelectorOpen(false)
      setSlideProductSelectorOpen(false)
    }
  }, [slideImageEditorOpen, activeSlide])

  const applyProductToSlide = useCallback(
    (product: { id: string; name: string; sku: string; image: string }) => {
      setGeneratedCarouselSlides((prev) =>
        prev.map((slide, i) =>
          i === activeSlide ? { ...slide, image: product.image, product: product.name } : slide
        )
      )
      setSlideProductSelectorOpen(false)
      setSlideImageEditorOpen(false)
    },
    [activeSlide]
  )

  const handleGenerateSlideImage = useCallback(async () => {
    if (!slideImagePrompt.trim()) return
    setIsGeneratingSlideImage(true)
    setGeneratedCarouselSlides((prev) =>
      prev.map((s, i) => (i === activeSlide ? { ...s, image: undefined } : s))
    )
    try {
      const { data: fnData, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt: `${slideImagePrompt}, ${activeProductName}, high quality commercial photography`,
          model: currentSlideModel.id,
        },
      })
      if (error) throw error
      if (fnData?.imageUrl) {
        setGeneratedCarouselSlides((prev) =>
          prev.map((s, i) => (i === activeSlide ? { ...s, image: fnData.imageUrl } : s))
        )
        setSlideImageEditorOpen(false)
        toast.success('Imagem do slide gerada!')
      }
    } catch (err) {
      console.error('Slide image error:', err)
      setGeneratedCarouselSlides((prev) =>
        prev.map((s, i) => (i === activeSlide ? { ...s, image: 'error' } : s))
      )
      toast.error('Erro ao gerar imagem do slide')
    } finally {
      setIsGeneratingSlideImage(false)
    }
  }, [slideImagePrompt, activeSlide, currentSlideModel, activeProductName])

  const copyBlockPositionStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 28,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    textAlign: textHAlign,
    ...(textVAlign === 'top'
      ? { top: 0 }
      : textVAlign === 'center'
        ? { top: '50%', transform: 'translateY(-50%)' }
        : { bottom: 0 }),
  }

  const handleGenerateFromToolbar = useCallback(
    async (fieldKey: string, toneId: string) => {
      setGeneratingFor(fieldKey as any)
      setToneDropdownFor(null)
      try {
        const currentValue =
          fieldKey === 'heading' ? heading : fieldKey === 'description' ? description : cta
        const productName = activeProductName ?? ''
        const { data: fnData, error } = await supabase.functions.invoke('generate-copy', {
          body: {
            action: 'regenerate',
            field: fieldKey,
            currentValue,
            tone: toneId,
            campaign: {
              title: imagePrompt || activeCampaign?.title || activeProduct?.name || 'campanha',
              product: productName,
              visualContext: visualContextRef.current,
              imageStyle: selectedImageStyle?.name ?? '',
              channel: selectedChannel ?? '',
              context: imagePrompt ? `A imagem gerada mostra: ${imagePrompt}` : undefined,
              brandContext: brandContextBody,
            },
          },
        })
        if (error) throw error
        if (fnData?.text) {
          if (fieldKey === 'heading') setHeading(fnData.text)
          else if (fieldKey === 'description') setDescription(fnData.text)
          else if (fieldKey === 'cta') setCta(fnData.text)
        }
      } catch (err) {
        console.error('Toolbar generate error:', err)
        toast.error('Erro ao gerar texto')
      } finally {
        setGeneratingFor(null)
      }
    },
    [heading, description, cta, activeCampaign.title, activeProductName]
  )

  const handleGenerateVersionsFromToolbar = useCallback(
    async (fieldKey: string) => {
      setGeneratingFor(fieldKey as any)
      try {
        const { data: fnData, error } = await supabase.functions.invoke('generate-copy', {
          body: {
            action: 'versions',
            field: fieldKey,
            tone: 'direto',
            campaign: {
              title:
                imagePrompt?.slice(0, 120) ||
                currentSessionTitle ||
                activeProduct?.name ||
                'criativo',
              product: activeProductName ?? '',
              visualContext: visualContextRef.current,
              imageStyle: selectedImageStyle?.name ?? '',
              context: imagePrompt ? `Imagem gerada com: ${imagePrompt.slice(0, 200)}` : undefined,
              brandContext: brandContextBody,
            },
            count: 4,
          },
        })
        if (error) throw error
        if (fnData?.versions?.[0]) {
          if (fieldKey === 'heading') setHeading(fnData.versions[0])
          else if (fieldKey === 'description') setDescription(fnData.versions[0])
          else if (fieldKey === 'cta') setCta(fnData.versions[0])
          toast.success('Versão aplicada')
        }
      } catch (err) {
        console.error('Versions error:', err)
        toast.error('Erro ao gerar versões')
      } finally {
        setGeneratingFor(null)
      }
    },
    [activeCampaign.title, activeProductName]
  )

  const deselectAll = useCallback(() => {
    setSelectedElement(null)
    setEditingElement(null)
    setToneDropdownFor(null)
    setSelectedBoxId(null)
    setEditingBoxId(null)
    setSelectedCardId(null)
    setSelectedReviewCardId(null)
    setEditingReviewCardId(null)
    setSelectedCountdownId(null)
    setSelectedPriceId(null)
    setSelectedSocialProofId(null)
    closeAllSidebarPanels()
  }, [])

  const handleApplyCreative = useCallback(async () => {
    if (!activeImageUrl || isPlaceholderImage(activeImageUrl)) return
    setIsApplyingCreative(true)

    try {
      const imageBase64 = await imageUrlToBase64(activeImageUrl)

      const { data: analysisData, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt: `Analyze this image and describe its visual mood in 3-5 keywords in English, focusing on: lighting quality, color temperature, emotional tone, scene type, and style. Examples of keywords: "warm", "lifestyle", "golden hour", "editorial", "dark", "bold", "clean", "aesthetic", "candid", "luxury". Respond with ONLY a JSON object in this exact format: {"mood": ["keyword1", "keyword2", "keyword3"]}. No other text.`,
          model: 'gemini-3.1-flash-image-preview',
          images: [imageBase64],
          responseType: 'text',
        },
      })

      if (error) throw error

      let moodKeywords: string[] = []
      try {
        const responseText = analysisData?.text ?? ''
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          moodKeywords = parsed.mood ?? []
        }
      } catch {
        moodKeywords = (analysisData?.text ?? '')
          .toLowerCase()
          .split(/[\s,]+/)
          .slice(0, 5)
      }

      let bestPreset = CREATIVE_PRESETS[0]
      let bestScore = 0

      for (const preset of CREATIVE_PRESETS) {
        const score = preset.triggers.filter((trigger) =>
          moodKeywords.some((kw) => kw.includes(trigger) || trigger.includes(kw))
        ).length
        if (score > bestScore) {
          bestScore = score
          bestPreset = preset
        }
      }

      if (bestScore === 0) bestPreset = CREATIVE_PRESETS[0]

      const fontFamily = getFontFamilyById(bestPreset.font) || "'Inter', sans-serif"
      const cW =
        document.querySelector<HTMLElement>('[data-canvas-frame]')?.getBoundingClientRect().width ??
        300
      setSelectedFont(bestPreset.font)
      setTextColor(bestPreset.color)
      setHeadingSize(bestPreset.size)

      setFreeTextBoxes((prev) => {
        const targetId = selectedBoxId || prev[0]?.id
        return prev.map((b) =>
          b.id === targetId || b.id === 'main-text'
            ? {
                ...b,
                fontFamily,
                color: bestPreset.color,
                fontSizeRel: bestPreset.size / cW,
                textShadow: bestPreset.shadow !== 'none' ? bestPreset.shadow : undefined,
              }
            : b
        )
      })

      pushActivity(
        'font_changed',
        `Creative: ${bestPreset.label}`,
        `Analisei a imagem e apliquei ${bestPreset.label} -- combina com o mood ${moodKeywords.slice(0, 2).join(', ')}. Quer ajustar?`,
        [
          { id: 'regen_creative', label: 'Tentar outro estilo', action: 'apply_creative' },
          { id: 'publish', label: 'Publicar', action: 'open_publish' },
        ]
      )

      toast.success(`Estilo ${bestPreset.label} aplicado`)
    } catch (err) {
      console.error('Creative style error:', err)
      const fallbackFont = getFontFamilyById('dancing-script') || "'Dancing Script', cursive"
      setSelectedFont('dancing-script')
      setTextColor('#2C1810')
      setHeadingSize(38)
      const cW =
        document.querySelector<HTMLElement>('[data-canvas-frame]')?.getBoundingClientRect().width ??
        300
      setFreeTextBoxes((prev) => {
        const targetId = selectedBoxId || prev[0]?.id
        return prev.map((b) =>
          b.id === targetId || b.id === 'main-text'
            ? { ...b, fontFamily: fallbackFont, color: '#2C1810', fontSizeRel: 38 / cW }
            : b
        )
      })
      toast.info('Estilo criativo aplicado')
    } finally {
      setIsApplyingCreative(false)
    }
  }, [
    activeImageUrl,
    imageUrlToBase64,
    setSelectedFont,
    setTextColor,
    setHeadingSize,
    setFreeTextBoxes,
    pushActivity,
  ])

  const renderSelectionToolbar = () => {
    if (!selectedElement || editingElement) return null

    // Image selection toolbar
    if (selectedElement === 'image') {
      return (
        <div onClick={(e) => e.stopPropagation()} className="canvas-top-toolbar" style={{}}>
          <button
            className="ctt-btn ctt-icon-only"
            title="Gerar imagem"
            onClick={() => {
              setImageGeneratorOpen(true)
              setImageGeneratorOpen(true)
              setProductSelectorOpen(false)
              setSelectedElement(null)
            }}
          >
            <Sparkles size={15} />
            <span className="ctt-label">Gerar imagem</span>
          </button>

          <div className="ctt-divider" />

          <button
            className="ctt-btn ctt-icon-only"
            title="Selecionar produto"
            onClick={() => {
              setProductSelectorOpen(true)
              setImageGeneratorOpen(false)
              setProductSearch('')
              setSelectedElement(null)
            }}
          >
            <Package size={15} />
            <span className="ctt-label">Produto</span>
          </button>

          <div className="ctt-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className="ctt-btn ctt-icon-only"
              title="Regenerar"
              onClick={() => setShowRegenStyleDropdown((prev) => !prev)}
              disabled={isGeneratingAsset}
            >
              {isGeneratingAsset ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              <span className="ctt-label">Regenerar</span>
            </button>
            {showRegenStyleDropdown && (
              <div className="regen-style-dropdown" onClick={(e) => e.stopPropagation()}>
                {styleCategories.map((cat) => (
                  <div key={cat.id}>
                    <div className="regen-cat-label">{cat.label}</div>
                    {cat.styles.map((sid) => {
                      const st = imageStyles.find((s) => s.id === sid)
                      if (!st) return null
                      const isActive = selectedImageStyle?.id === st.id
                      return (
                        <button
                          key={st.id}
                          className={`regen-style-item ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedImageStyle(st)
                            setShowRegenStyleDropdown(false)
                            setSelectedElement(null)
                            const pName = activeProductName ?? 'the product'
                            const pDesc = (activeProduct as any)?.description ?? ''
                            let freshPrompt = pName
                            if (st.buildPrompt) {
                              freshPrompt = st.buildPrompt({
                                productName: pName,
                                productDescription: pDesc,
                                brandName: storeCtx?.name ?? data.campaignTitle ?? '',
                                niche: storeCtx?.niche ?? '',
                                audience: storeCtx?.audience ?? '',
                                modelGender: storeCtx?.modelProfile?.gender ?? '',
                                modelAge: storeCtx?.modelProfile?.ageRange ?? '',
                                context: '',
                              })
                            } else if (st.promptBase) {
                              freshPrompt = `${pName}, ${st.promptBase}`
                            }
                            setImagePrompt(freshPrompt)
                            generateImageWithPrompt(freshPrompt, 1, st)
                          }}
                        >
                          <span
                            className="regen-style-dot"
                            style={{ background: st.color || '#888' }}
                          />
                          <span className="regen-style-name">{st.name}</span>
                          {isActive && <Check size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ctt-divider" />

          <button
            className="ctt-btn ctt-icon-only"
            title="Editar"
            onClick={() => {
              setIsEditingImage(true)
              setSelectedElement(null)
              setEditPreviewUrl(null)
              setEditPrompt('')
            }}
          >
            <Edit2 size={15} />
            <span className="ctt-label">Editar</span>
          </button>

          <div className="ctt-divider" />

          <button
            className="ctt-btn ctt-icon-only"
            title="Dimensionar"
            onClick={() =>
              setActiveSidebarPanel((prev) => (prev === 'imagefit' ? null : 'imagefit'))
            }
          >
            <Maximize2 size={15} />
            <span className="ctt-label">Dimensionar</span>
          </button>

          <div className="ctt-divider" />

          <button
            className="ctt-btn ctt-icon-only"
            title="Gerar vídeo"
            onClick={() => {
              setSelectedElement(null)
              handleSidebarAction('video')
              setVideoMode('ai')
              if (useAiVideoPrompt) setVideoPrompt(buildAutoVideoPrompt())
            }}
            disabled={isGeneratingVideo}
          >
            {isGeneratingVideo ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Video size={15} />
            )}
            <span className="ctt-label">Vídeo</span>
          </button>

          <div className="ctt-divider" />

          <button
            className="ctt-btn ctt-icon-only"
            title="Histórico"
            onClick={() => {
              setHistoryOpen(true)
              setSelectedElement(null)
            }}
          >
            <Clock size={15} />
            <span className="ctt-label">Histórico</span>
          </button>

          <div className="ctt-divider" />

          <button
            className="ctt-btn ctt-icon-only"
            title="Download"
            onClick={() => handleDownload()}
          >
            <Download size={15} />
            <span className="ctt-label">Download</span>
          </button>

          <button
            ref={saveButtonRef}
            className={`ctt-btn ctt-icon-only ${isSaveAnimating ? 'save-animating' : ''}`}
            title="Salvar"
            onClick={handleSave}
          >
            <Save size={15} />
            <span className="ctt-label">Salvar</span>
          </button>

          <div className="ctt-divider" />

          <button
            className="ctt-btn ctt-icon-only"
            title="Deletar imagem"
            onClick={() => {
              setActiveImageUrl('')
              setSelectedElement(null)
            }}
          >
            <Trash2 size={15} />
            <span className="ctt-label">Deletar</span>
          </button>
        </div>
      )
    }

    const isTextField = ['heading', 'description', 'cta'].includes(selectedElement)
    if (!isTextField) return null

    // Find the selected element DOM node inside canvas
    const el = canvasRef.current?.querySelector(
      `[data-field="${selectedElement}"]`
    ) as HTMLElement | null
    if (!el || !canvasRef.current) return null

    const elRect = el.getBoundingClientRect()
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const top = elRect.top - canvasRect.top - 38
    const left = elRect.left - canvasRect.left

    return (
      <div
        className="selection-toolbar"
        style={{
          position: 'absolute',
          top,
          left,
          zIndex: 20,
        }}
      >
        {/* Generate text button */}
        <div style={{ position: 'relative' }}>
          <button
            className="stb-btn stb-generate"
            onClick={() =>
              setToneDropdownFor((prev) => (prev === selectedElement ? null : selectedElement))
            }
            disabled={generatingFor === selectedElement}
          >
            {generatingFor === selectedElement ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            <span>Gerar texto</span>
            <ChevronDown size={10} />
          </button>
          {toneDropdownFor === selectedElement && (
            <div className="stb-tone-dropdown">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  className="stb-tone-option"
                  onClick={() => handleGenerateFromToolbar(selectedElement, t.id)}
                  disabled={generatingFor === selectedElement}
                >
                  <span className="stb-tone-icon">{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Versions */}
        <button
          className="stb-btn"
          onClick={() => handleGenerateVersionsFromToolbar(selectedElement)}
          disabled={generatingFor === selectedElement}
        >
          <Layers size={12} />
          <span>Versões</span>
        </button>

        {/* Edit — abre tipografia */}
        <button
          className="stb-btn stb-hint"
          title="Abrir opções de tipografia"
          onClick={(e) => {
            e.stopPropagation()
            setTypographyOpen(true)
            setActiveSidebarPanel('typography')
          }}
        >
          <Pencil size={11} />
          <span>Editar</span>
        </button>
      </div>
    )
  }

  const renderCopyBlock = (showBrandBadge = true) => (
    <>
      {selectedStyleId === 'brand-dna' && showBrandBadge && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            fontSize: 10,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
            letterSpacing: '0.05em',
            zIndex: 3,
          }}
        >
          ✦ Brand DNA
        </div>
      )}
      <div style={copyBlockPositionStyle}>
        {showAttributes && attributes.length > 0 && selectedStyleId === 'product-infographic' ? (
          /* ── Infographic overlay: dark overlay + SVG circular icons ── */
          <>
            {/* Strong dark overlay for contrast */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10,10,10,0.55)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '12% 8%',
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8%' }}>
                {attributes.slice(0, 2).map((attr) => {
                  const sz = 52
                  return <InfographicIconEl key={attr.id} label={attr.label} size={sz} />
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                {attributes.slice(2, 3).map((attr) => {
                  const sz = 64
                  return <InfographicIconEl key={attr.id} label={attr.label} size={sz} />
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8%' }}>
                {attributes.slice(3, 5).map((attr) => {
                  const sz = 52
                  return <InfographicIconEl key={attr.id} label={attr.label} size={sz} />
                })}
              </div>
            </div>
          </>
        ) : showAttributes && attributes.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              alignItems: attributePosition === 'right' ? 'flex-end' : 'flex-start',
              fontFamily,
            }}
          >
            {attributes.map((attr) => (
              <div
                key={attr.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexDirection: attributePosition === 'right' ? 'row-reverse' : 'row',
                }}
              >
                <span
                  style={{ fontSize: 'clamp(13px, 1.6vw, 18px)', lineHeight: 1, flexShrink: 0 }}
                >
                  {attr.icon}
                </span>
                <span
                  style={{
                    fontSize: 'clamp(10px, 1.2vw, 13px)',
                    fontWeight: 500,
                    color: textColor,
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    fontFamily,
                  }}
                >
                  {attr.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {headingVisible && !imageHasEmbeddedText && heading && (
              <SelectableText
                fieldKey="heading"
                value={heading}
                onChange={setHeading}
                selectedElement={selectedElement}
                editingElement={editingElement}
                setSelectedElement={setSelectedElement}
                setEditingElement={setEditingElement}
                style={{
                  fontSize: headingSize,
                  fontWeight: Number(fontWeightState) || 700,
                  color: textColor,
                  lineHeight: 1.3,
                  margin: 0,
                  marginBottom: (descriptionVisible && description) || (ctaVisible && cta) ? 6 : 0,
                  fontFamily,
                  textTransform: textCase as any,
                  letterSpacing,
                  ...getTextBgStyle(textBgStyle),
                }}
              />
            )}
            {descriptionVisible && !imageHasEmbeddedText && description && (
              <SelectableText
                fieldKey="description"
                value={description}
                onChange={setDescription}
                selectedElement={selectedElement}
                editingElement={editingElement}
                setSelectedElement={setSelectedElement}
                setEditingElement={setEditingElement}
                style={{
                  fontSize: descriptionSize,
                  fontWeight: 400,
                  color: textColor,
                  opacity: 0.85,
                  lineHeight: 1.4,
                  margin: 0,
                  marginBottom: ctaVisible && cta ? 10 : 0,
                  fontFamily,
                  letterSpacing,
                  ...getTextBgStyle(textBgStyle),
                }}
              />
            )}
            {priceVisible && !imageHasEmbeddedText && priceText && (
              <div
                style={{
                  fontSize: priceSize,
                  fontWeight: 800,
                  color: ctaColor !== 'transparent' ? ctaColor : '#FACC15',
                  lineHeight: 1.2,
                  margin: 0,
                  marginBottom: ctaVisible && cta ? 10 : 0,
                  fontFamily,
                  letterSpacing: '-0.02em',
                }}
              >
                {priceText}
              </div>
            )}
            {ctaVisible && !imageHasEmbeddedText && cta && (
              <SelectableText
                fieldKey="cta"
                value={cta}
                onChange={setCta}
                isCta
                selectedElement={selectedElement}
                editingElement={editingElement}
                setSelectedElement={setSelectedElement}
                setEditingElement={setEditingElement}
                style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  background: ctaColor,
                  color: ctaTextColor,
                  borderRadius: ctaRadius,
                  fontSize: ctaSize,
                  fontWeight: 600,
                  fontFamily,
                  alignSelf:
                    textHAlign === 'right'
                      ? 'flex-end'
                      : textHAlign === 'center'
                        ? 'center'
                        : 'flex-start',
                }}
              />
            )}
          </>
        )}
      </div>
    </>
  )

  const renderGeneratingOverlay = (label: string) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        overflow: 'hidden',
        zIndex: 5,
        background: '#F2F2F2',
      }}
    >
      {/* Animated fill bar — grows from left to right covering full area */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
          backgroundSize: '200% 100%',
          animation: 'loadingShimmer 2s linear infinite',
        }}
      />

      {/* Progress bar at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(0,0,0,0.06)',
          zIndex: 3,
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'rgba(0,0,0,0.18)',
            borderRadius: 2,
            animation: 'loadingBar 8s ease-out forwards',
          }}
        />
      </div>

      {/* Label bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          zIndex: 4,
          fontSize: 11,
          fontWeight: 500,
          color: 'rgba(0,0,0,0.32)',
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </div>
    </div>
  )

  // ── FontSelectorPortal ──
  const PORTAL_FONT_CATEGORIES = [
    {
      id: 'sans',
      label: 'Sans Serif',
      fonts: [
        { id: 'inter', name: 'Inter', family: "'Inter', sans-serif" },
        { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif" },
        { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif" },
        { id: 'lexend', name: 'Lexend', family: "'Lexend', sans-serif" },
        { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif" },
        { id: 'onest', name: 'Onest', family: "'Onest', sans-serif" },
        { id: 'dongle', name: 'Dongle', family: "'Dongle', sans-serif" },
      ],
    },
    {
      id: 'serif',
      label: 'Serif',
      fonts: [
        { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif" },
        { id: 'playfair-sc', name: 'Playfair SC', family: "'Playfair Display SC', serif" },
        { id: 'lora', name: 'Lora', family: "'Lora', serif" },
        { id: 'cormorant', name: 'Cormorant', family: "'Cormorant Garamond', serif" },
        { id: 'scope-one', name: 'Scope One', family: "'Scope One', serif" },
      ],
    },
    {
      id: 'display',
      label: 'Display',
      fonts: [
        { id: 'bebas', name: 'Bebas Neue', family: "'Bebas Neue', sans-serif" },
        { id: 'oswald', name: 'Oswald', family: "'Oswald', sans-serif" },
        { id: 'anton', name: 'Anton', family: "'Anton', sans-serif" },
      ],
    },
    {
      id: 'script',
      label: 'Script',
      fonts: [
        {
          id: 'monsieur-la-doulaise',
          name: 'Monsieur La Doulaise',
          family: "'Monsieur La Doulaise', cursive",
        },
        { id: 'pinyon-script', name: 'Pinyon Script', family: "'Pinyon Script', cursive" },
        { id: 'meow-script', name: 'Meow Script', family: "'Meow Script', cursive" },
        { id: 'dancing', name: 'Dancing Script', family: "'Dancing Script', cursive" },
        { id: 'great-vibes', name: 'Great Vibes', family: "'Great Vibes', cursive" },
        { id: 'pacifico', name: 'Pacifico', family: "'Pacifico', cursive" },
      ],
    },
    {
      id: 'handwritten',
      label: 'Handwritten',
      fonts: [
        { id: 'gochi-hand', name: 'Gochi Hand', family: "'Gochi Hand', cursive" },
        { id: 'pangolin', name: 'Pangolin', family: "'Pangolin', cursive" },
        { id: 'kapakana', name: 'Kapakana', family: "'Kapakana', cursive" },
      ],
    },
  ]

  const FontSelectorPortal = ({
    isOpen,
    anchorEl,
    selectedFontId,
    onSelect,
    onClose,
  }: {
    isOpen: boolean
    anchorEl: HTMLElement | null
    selectedFontId: string
    onSelect: (font: { id: string; name: string; family: string }) => void
    onClose: () => void
  }) => {
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const [openCat, setOpenCat] = useState('sans')

    useEffect(() => {
      if (isOpen && anchorEl) {
        const rect = anchorEl.getBoundingClientRect()
        setPos({ top: rect.bottom + 8, left: rect.left })
      }
    }, [isOpen, anchorEl])

    useEffect(() => {
      if (!isOpen) return
      const handler = (e: MouseEvent) => {
        const el = document.getElementById('font-selector-portal')
        if (el && !el.contains(e.target as Node)) onClose()
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return createPortal(
      <div
        id="font-selector-portal"
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          width: 220,
          background: '#1E1E1E',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 99999,
          maxHeight: 400,
          overflowY: 'auto',
        }}
      >
        {PORTAL_FONT_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <button
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setOpenCat((c) => (c === cat.id ? '' : cat.id))
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '9px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.65)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {cat.label}
              <span style={{ opacity: 0.4, fontSize: 10 }}>{openCat === cat.id ? '▲' : '▼'}</span>
            </button>
            {openCat === cat.id &&
              cat.fonts.map((font) => (
                <button
                  key={font.id}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onSelect(font)
                    onClose()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    background:
                      selectedFontId === font.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    fontFamily: font.family,
                    fontSize: 16,
                    fontWeight: 400,
                    color: '#FFF',
                    textAlign: 'left' as const,
                  }}
                >
                  {font.name}
                  {selectedFontId === font.id && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: "'Inter',sans-serif",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>,
      document.body
    )
  }

  // Canvas dimensions state — single source of truth for text boxes
  const [canvasDims, setCanvasDims] = useState({ w: 300, h: 400 })

  useEffect(() => {
    const el = assetFrameRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 50 && height > 50) setCanvasDims({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // isPlaceholderImage moved earlier in the component

  const renderCanvasFrame = (
    ratio: string,
    maxW: number,
    imgUrl: string,
    ref?: React.Ref<HTMLDivElement>,
    showBadge = true
  ) => {
    const displayImage = isEditingImage && editPreviewUrl ? editPreviewUrl : imgUrl
    return (
      <div
        ref={ref}
        onClick={(e) => {
          if (e.target === e.currentTarget) deselectAll()
        }}
        style={{
          width: '100%',
          maxWidth: maxW,
          aspectRatio: ratio.replace(' / ', '/'),
          maxHeight: 'calc(100vh - 180px)',
          position: 'relative',
          borderRadius: 16,
          overflow: 'visible',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div
          ref={canvasImageRef}
          data-canvas-frame="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: isPlaceholderImage(displayImage) ? '#F2F2F0' : '#111',
          }}
        >
          {!isPlaceholderImage(displayImage) ? (
            isVideoUrl(displayImage) ? (
              <video
                key={displayImage}
                src={displayImage}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            ) : (
              <img
                src={displayImage}
                alt=""
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: imageFit === 'contain' ? 'contain' : 'cover',
                  objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  transform: `scale(${imageScale / 100})`,
                  transformOrigin: `${imagePosition.x}% ${imagePosition.y}%`,
                  transition: 'transform 0.1s, object-position 0.1s',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )
          ) : (
            /* Empty state placeholder */
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: 32,
                background: '#F7F6F3',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 16,
                  border: '1.5px dashed #CCCCCC',
                  borderRadius: 12,
                  pointerEvents: 'none',
                }}
              />
              {/* Icon — spinner when generating */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: isGeneratingAsset || isChatExecuting ? '#1A1A1A' : '#EBEBEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.3s',
                }}
              >
                {isGeneratingAsset || isChatExecuting ? (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'spin 0.75s linear infinite',
                    }}
                  />
                ) : (
                  <Sparkles size={22} style={{ color: '#AAAAAA' }} />
                )}
              </div>

              {/* Main instruction */}
              <div
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#555555',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {isGeneratingAsset || isChatExecuting
                    ? generatingLabel || chatExecutingLabel || 'Gerando...'
                    : 'Descreva o criativo no chat'}
                </p>
                {!(isGeneratingAsset || isChatExecuting) && (
                  <p
                    style={{
                      fontSize: 12,
                      color: '#AAAAAA',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    ou escolha uma ação abaixo para começar
                  </p>
                )}
              </div>

              {/* Quick action pills — hide when generating */}
              {!(isGeneratingAsset || isChatExecuting) && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      width: '100%',
                      maxWidth: 200,
                    }}
                  >
                    {[
                      {
                        icon: <Sparkles size={16} />,
                        label: 'Gerar imagem com IA',
                        action: () => {
                          chatPanelRef.current?.sendMessage?.('Gerar imagem com IA')
                        },
                      },
                      {
                        icon: <Package size={16} />,
                        label: 'Usar foto do produto',
                        action: () => {
                          chatPanelRef.current?.sendMessage?.('Usar foto do produto')
                        },
                      },
                      {
                        icon: <LayoutGrid size={16} />,
                        label: 'Criar carrossel',
                        action: () => {
                          chatPanelRef.current?.sendMessage?.('Criar carrossel')
                        },
                      },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={item.action}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '9px 14px',
                          borderRadius: 8,
                          border: '1px solid #E2E2E2',
                          background: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#444',
                          cursor: 'pointer',
                          transition: 'all 0.12s',
                          fontFamily: 'inherit',
                          textAlign: 'left' as const,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#1A1A1A'
                          e.currentTarget.style.color = '#1A1A1A'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E2E2E2'
                          e.currentTarget.style.color = '#444'
                        }}
                      >
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#CCCCCC', margin: 0, textAlign: 'center' }}>
                    ou arraste uma imagem aqui
                  </p>
                </>
              )}
            </div>
          )}
          {/* Image click target — behind text, captures background clicks */}
          {!isEditingImage && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                if (isPlaceholderImage(displayImage)) return
                setSelectedElement((prev) => (prev === 'image' ? null : 'image'))
                setEditingElement(null)
                setToneDropdownFor(null)
                setSelectedBoxId(null)
                setEditingBoxId(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const file = e.dataTransfer.files[0]
                if (!file?.type.startsWith('image/')) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const url = ev.target?.result as string
                  setActiveImageUrl(url)
                  setGeneratedImageUrl(url)
                }
                reader.readAsDataURL(file)
              }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                cursor: isPlaceholderImage(displayImage) ? 'default' : 'pointer',
                borderRadius: 'inherit',
                outline:
                  selectedElement === 'image' && !isPlaceholderImage(displayImage)
                    ? '2px solid #18A0FB'
                    : 'none',
                outlineOffset: selectedElement === 'image' ? -2 : 0,
              }}
            />
          )}
          {(isGeneratingAsset || isChatExecuting) && !isEditingImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
                borderRadius: 'inherit',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(1px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#FFFFFF',
                  animation: 'spin 0.75s linear infinite',
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {isGeneratingAsset
                  ? generatingLabel || 'Gerando...'
                  : chatExecutingLabel || 'Aplicando...'}
              </span>
            </div>
          )}
          {/* Overlay — hidden in edit mode */}
          {!isEditingImage && !isPlaceholderImage(displayImage) && (
            <div
              style={buildOverlayStyle(overlayType, overlayColor, overlayOpacity, overlayPosition)}
            />
          )}
          {/* Brand DNA badge only */}
          {!isEditingImage && selectedStyleId === 'brand-dna' && showBadge && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                fontSize: 10,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                letterSpacing: '0.05em',
                zIndex: 3,
              }}
            >
              ✦ Brand DNA
            </div>
          )}
          {/* Edit overlay */}
          {isEditingImage && (
            <div className="image-edit-overlay">
              <div className="image-edit-top-bar">
                <button className="image-edit-cancel-btn" onClick={handleCancelEdit}>
                  <X size={13} /> Cancelar
                </button>
                {editPreviewUrl && (
                  <button className="image-edit-save-btn" onClick={handleSaveEdit}>
                    <Check size={13} /> Salvar
                  </button>
                )}
              </div>
              <div className="image-edit-input-bar">
                <textarea
                  className="image-edit-prompt"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Descreva a edição... ex: trocar fundo por floresta, adicionar sombra, mudar tom para dourado"
                  rows={2}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (editPrompt.trim() && !isApplyingEdit) handleApplyEdit()
                    }
                  }}
                />
                <button
                  className="image-edit-apply-btn"
                  onClick={handleApplyEdit}
                  disabled={!editPrompt.trim() || isApplyingEdit}
                >
                  {isApplyingEdit ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Feature annotations overlay */}
        {featuresMode &&
          productFeatures.length > 0 &&
          activeImageUrl &&
          !isPlaceholderImage(activeImageUrl) &&
          (() => {
            const cW = canvasDims.w || 400
            const cH = canvasDims.h || 500
            return (
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 10,
                  overflow: 'visible',
                }}
                viewBox={`0 0 ${cW} ${cH}`}
                xmlns="http://www.w3.org/2000/svg"
              >
                {productFeatures.map((feature) => {
                  const ax = feature.anchor.x * cW
                  const ay = feature.anchor.y * cH
                  const isRight = feature.labelSide === 'right'
                  const lineEndX = isRight ? ax + 80 : ax - 80
                  const textX = isRight ? lineEndX + 6 : lineEndX - 6
                  const textAnchor = isRight ? 'start' : 'end'
                  if (featureAnnotStyle === 'technical') {
                    return (
                      <g key={feature.id}>
                        <circle cx={ax} cy={ay} r={3} fill="rgba(20,20,20,0.7)" />
                        <line
                          x1={ax}
                          y1={ay}
                          x2={lineEndX}
                          y2={ay}
                          stroke="rgba(20,20,20,0.55)"
                          strokeWidth={0.75}
                        />
                        <text
                          x={textX}
                          y={ay - 4}
                          textAnchor={textAnchor}
                          fontSize={11}
                          fontFamily="'Inter', sans-serif"
                          fontWeight={500}
                          fill="rgba(20,20,20,0.85)"
                          letterSpacing={0.2}
                        >
                          {feature.label}
                        </text>
                        {feature.sublabel && (
                          <text
                            x={textX}
                            y={ay + 9}
                            textAnchor={textAnchor}
                            fontSize={9}
                            fontFamily="'Inter', sans-serif"
                            fontWeight={400}
                            fill="rgba(20,20,20,0.45)"
                          >
                            {feature.sublabel}
                          </text>
                        )}
                      </g>
                    )
                  }
                  const cpX = (ax + lineEndX) / 2
                  const cpY = ay - 20
                  return (
                    <g key={feature.id}>
                      <defs>
                        <marker
                          id={`arrow-${feature.id}`}
                          markerWidth={6}
                          markerHeight={6}
                          refX={3}
                          refY={3}
                          orient="auto"
                        >
                          <path d="M0,0 L0,6 L6,3 z" fill="rgba(40,30,20,0.6)" />
                        </marker>
                      </defs>
                      <path
                        d={`M ${ax} ${ay} Q ${cpX} ${cpY} ${lineEndX} ${ay}`}
                        fill="none"
                        stroke="rgba(40,30,20,0.6)"
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        markerEnd={`url(#arrow-${feature.id})`}
                      />
                      <text
                        x={textX}
                        y={ay - 8}
                        textAnchor={textAnchor}
                        fontSize={12}
                        fontFamily="'Dancing Script', cursive"
                        fontWeight={600}
                        fill="rgba(40,30,20,0.8)"
                      >
                        {feature.label}
                      </text>
                      {feature.sublabel && (
                        <text
                          x={textX}
                          y={ay + 6}
                          textAnchor={textAnchor}
                          fontSize={10}
                          fontFamily="'Dancing Script', cursive"
                          fontWeight={400}
                          fill="rgba(40,30,20,0.5)"
                        >
                          {feature.sublabel}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            )
          })()}
        {/* Free text boxes — OUTSIDE image div so they aren't clipped */}
        {!isEditingImage &&
          !isPlaceholderImage(displayImage) &&
          freeTextBoxes.map((box) => {
            const isBoxSelected = selectedBoxId === box.id
            const isBoxEditing = editingBoxId === box.id
            return (
              <div key={box.id}>
                {isGeneratingAsset ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(box.xRel ?? 0.06) * 100}%`,
                      top: `${(box.yRel ?? 0.46) * 100}%`,
                      width: `${(box.boxWidthRel ?? 0.88) * 100}%`,
                      height: `${(box.fontSizeRel ?? 0.055) * canvasDims.h * 1.4}px`,
                      background: 'rgba(0,0,0,0.06)',
                      borderRadius: 4,
                      animation: 'loadingShimmer 2s linear infinite',
                      backgroundSize: '200% 100%',
                      backgroundImage:
                        'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
                      zIndex: 10,
                    }}
                  />
                ) : (
                  <FreeTextBoxComponent
                    box={box}
                    isSelected={isBoxSelected}
                    isEditing={isBoxEditing}
                    canvasW={canvasDims.w}
                    canvasH={canvasDims.h}
                    onSelect={() => {
                      setSelectedBoxId(box.id)
                      setSelectedElement('text')
                      setEditingElement(null)
                      setToneDropdownFor(null)
                    }}
                    onEdit={() => {
                      setSelectedBoxId(box.id)
                      setEditingBoxId(box.id)
                    }}
                    onBlur={(text) => {
                      updateBox(box.id, { text })
                      setEditingBoxId(null)
                    }}
                    onUpdate={(patch) => updateBox(box.id, patch)}
                    onDelete={() => {
                      setFreeTextBoxes((prev) => prev.filter((b) => b.id !== box.id))
                      setSelectedBoxId(null)
                    }}
                    onOpenGen={() => {
                      setGenPanelBoxId(box.id)
                      setGenPanelText(box.text)
                      setGenPanelOpen(true)
                    }}
                    onDuplicate={() => {
                      const nb = {
                        ...box,
                        id: `text-${Date.now()}`,
                        xRel: (box.xRel ?? 0.06) + 0.03,
                        yRel: (box.yRel ?? 0.46) + 0.03,
                      }
                      setFreeTextBoxes((prev) => [...prev, nb])
                      setSelectedBoxId(nb.id)
                    }}
                    onApplyCreative={handleApplyCreative}
                    isApplyingCreative={isApplyingCreative}
                  />
                )}
              </div>
            )
          })}
        {/* Product cards */}
        {!isEditingImage &&
          !isPlaceholderImage(displayImage) &&
          freeProductCards.map((card) => {
            const product = allProducts.find((p) => p.id === card.productId)
            return (
              <FreeProductCardComponent
                key={card.id}
                card={card}
                product={product}
                canvasW={canvasDims.w}
                canvasH={canvasDims.h}
                isSelected={selectedCardId === card.id}
                onSelect={() => {
                  setSelectedCardId(card.id)
                  setSelectedBoxId(null)
                  setSelectedElement(null)
                }}
                onDelete={() => {
                  setFreeProductCards((prev) => prev.filter((c) => c.id !== card.id))
                  setSelectedCardId(null)
                }}
                onUpdate={(patch) =>
                  setFreeProductCards((prev) =>
                    prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c))
                  )
                }
                onChangeProd={() => setCardProductPickerOpen(card.id)}
              />
            )
          })}

        {/* Review cards */}
        {!isEditingImage &&
          !isPlaceholderImage(displayImage) &&
          freeReviewCards.map((card) => (
            <FreeReviewCardComponent
              key={card.id}
              card={card}
              canvasW={canvasDims.w}
              canvasH={canvasDims.h}
              isSelected={selectedReviewCardId === card.id}
              isEditing={editingReviewCardId === card.id}
              onSelect={() => {
                setSelectedReviewCardId(card.id)
                setSelectedBoxId(null)
                setSelectedCardId(null)
                setSelectedElement(null)
              }}
              onEdit={() => {
                setSelectedReviewCardId(card.id)
                setEditingReviewCardId(card.id)
              }}
              onBlur={(patch) => {
                setFreeReviewCards((prev) =>
                  prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c))
                )
                setEditingReviewCardId(null)
              }}
              onDelete={() => {
                setFreeReviewCards((prev) => prev.filter((c) => c.id !== card.id))
                setSelectedReviewCardId(null)
                setEditingReviewCardId(null)
              }}
              onUpdate={(patch) =>
                setFreeReviewCards((prev) =>
                  prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c))
                )
              }
            />
          ))}

        {/* Countdown widgets */}
        {!isEditingImage &&
          !isPlaceholderImage(displayImage) &&
          freeCountdownWidgets.map((widget) => (
            <FreeCountdownWidgetComponent
              key={widget.id}
              widget={widget}
              canvasW={canvasDims.w}
              canvasH={canvasDims.h}
              isSelected={selectedCountdownId === widget.id}
              onSelect={() => {
                setSelectedCountdownId(widget.id)
                setSelectedBoxId(null)
                setSelectedCardId(null)
                setSelectedReviewCardId(null)
                setSelectedPriceId(null)
                setSelectedSocialProofId(null)
                setSelectedElement(null)
              }}
              onDelete={() => {
                setFreeCountdownWidgets((prev) => prev.filter((w) => w.id !== widget.id))
                setSelectedCountdownId(null)
              }}
              onUpdate={(patch) =>
                setFreeCountdownWidgets((prev) =>
                  prev.map((w) => (w.id === widget.id ? { ...w, ...patch } : w))
                )
              }
            />
          ))}

        {/* Price widgets */}
        {!isEditingImage &&
          !isPlaceholderImage(displayImage) &&
          freePriceWidgets.map((widget) => (
            <FreePriceWidgetComponent
              key={widget.id}
              widget={widget}
              canvasW={canvasDims.w}
              canvasH={canvasDims.h}
              isSelected={selectedPriceId === widget.id}
              onSelect={() => {
                setSelectedPriceId(widget.id)
                setSelectedBoxId(null)
                setSelectedCardId(null)
                setSelectedReviewCardId(null)
                setSelectedCountdownId(null)
                setSelectedSocialProofId(null)
                setSelectedElement(null)
              }}
              onDelete={() => {
                setFreePriceWidgets((prev) => prev.filter((w) => w.id !== widget.id))
                setSelectedPriceId(null)
              }}
              onUpdate={(patch) =>
                setFreePriceWidgets((prev) =>
                  prev.map((w) => (w.id === widget.id ? { ...w, ...patch } : w))
                )
              }
            />
          ))}

        {/* Social proof widgets */}
        {!isEditingImage &&
          !isPlaceholderImage(displayImage) &&
          freeSocialProofWidgets.map((widget) => (
            <FreeSocialProofWidgetComponent
              key={widget.id}
              widget={widget}
              canvasW={canvasDims.w}
              canvasH={canvasDims.h}
              isSelected={selectedSocialProofId === widget.id}
              onSelect={() => {
                setSelectedSocialProofId(widget.id)
                setSelectedBoxId(null)
                setSelectedCardId(null)
                setSelectedReviewCardId(null)
                setSelectedCountdownId(null)
                setSelectedPriceId(null)
                setSelectedElement(null)
              }}
              onDelete={() => {
                setFreeSocialProofWidgets((prev) => prev.filter((w) => w.id !== widget.id))
                setSelectedSocialProofId(null)
              }}
              onUpdate={(patch) =>
                setFreeSocialProofWidgets((prev) =>
                  prev.map((w) => (w.id === widget.id ? { ...w, ...patch } : w))
                )
              }
            />
          ))}

        {cardProductPickerOpen && (
          <div
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span className="float-window-title" style={{ margin: 0 }}>
                Selecionar produto
              </span>
              <button
                onClick={() => setCardProductPickerOpen(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="float-product-list">
              {allProducts.map((p) => (
                <button
                  key={p.id}
                  className="float-product-item"
                  onClick={() => {
                    setFreeProductCards((prev) =>
                      prev.map((c) =>
                        c.id === cardProductPickerOpen ? { ...c, productId: p.id } : c
                      )
                    )
                    setCardProductPickerOpen(null)
                  }}
                >
                  <div className="float-product-thumb">
                    <img src={p.image} alt={p.name} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="float-product-name">{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {showSaveToast && (
          <div className="save-toast-bar">
            <span className="save-toast-check">✓</span>
            <span>Salvo no histórico</span>
          </div>
        )}
        {isSaveAnimating &&
          saveButtonRef.current &&
          createPortal(
            <div
              className="save-sparkles"
              style={{
                position: 'fixed',
                left:
                  saveButtonRef.current.getBoundingClientRect().left +
                  saveButtonRef.current.getBoundingClientRect().width / 2 -
                  20,
                top:
                  saveButtonRef.current.getBoundingClientRect().top +
                  saveButtonRef.current.getBoundingClientRect().height / 2 -
                  20,
                width: 40,
                height: 40,
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            >
              {[...Array(6)].map((_, i) => (
                <span key={i} className={`sparkle-particle sparkle-${i}`} />
              ))}
            </div>,
            document.body
          )}
        {!isEditingImage && renderSelectionToolbar()}
        {/* Corner handles when image selected */}
        {selectedElement === 'image' && !isEditingImage && (
          <>
            {[
              { top: -4, left: -4 },
              { top: -4, right: -4 },
              { bottom: -4, left: -4 },
              { bottom: -4, right: -4 },
            ].map((pos, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  ...pos,
                  width: 8,
                  height: 8,
                  background: '#FFFFFF',
                  border: '1.5px solid #18A0FB',
                  borderRadius: 1,
                  zIndex: 21,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </>
        )}

        {/* Video generation loading overlay */}
        {isGeneratingVideo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              borderRadius: 16,
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                border: '2px solid rgba(255,255,255,0.15)',
                borderTopColor: '#FFFFFF',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'inherit',
                }}
              >
                {videoGeneratingLabel || 'gerando vídeo...'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: 'inherit',
                }}
              >
                {AI_VIDEO_MODELS.find((m) => m.id === selectedVideoModel)?.name ?? 'IA'} · pode
                levar até 2 min
              </span>
            </div>
            <button
              onClick={() => {
                setIsGeneratingVideo(false)
                setVideoGeneratingLabel('')
                setVideoError(null)
              }}
              style={{
                marginTop: 8,
                padding: '6px 16px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            >
              cancelar
            </button>
          </div>
        )}

        {/* Video result overlay */}
        {generatedVideoUrl && !isGeneratingVideo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 16,
              zIndex: 30,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            <video
              src={generatedVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                zIndex: 31,
              }}
            >
              <button
                onClick={async () => {
                  if (!generatedVideoUrl) return
                  setActiveImageUrl(generatedVideoUrl)
                  setActiveVideoUrl(generatedVideoUrl)
                  setGeneratedVideoUrl(null)
                  toast.success('Vídeo aplicado no canvas!')
                  saveToHistory(generatedVideoUrl)
                }}
                style={{
                  height: 36,
                  padding: '0 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#FFFFFF',
                  color: '#1A1A1A',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                ▶ aplicar no canvas
              </button>
              <button
                onClick={async () => {
                  if (!generatedVideoUrl) return
                  setActiveImageUrl(generatedVideoUrl)
                  setActiveVideoUrl(generatedVideoUrl)
                  await new Promise((r) => setTimeout(r, 100))
                  await downloadVideoCreative()
                }}
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Baixar vídeo"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => setGeneratedVideoUrl(null)}
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(8px)',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Descartar"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Video error overlay */}
        {videoError && !isGeneratingVideo && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              zIndex: 25,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, color: '#FCA5A5', lineHeight: 1.5, flex: 1 }}>
              {videoError}
            </span>
            <button
              onClick={() => setVideoError(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ── Toolbar ── */
  const renderToolbar = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 48,
        background: '#FFFFFF',
        borderBottom: '1px solid #EBEBEB',
        flexShrink: 0,
        gap: 8,
      }}
    >
      {/* Left — editing controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          overflowX: 'visible',
          overflow: 'visible',
        }}
      >
        {/* V-align */}
        <div style={{ display: 'flex', gap: 1 }}>
          <TbBtn active={textVAlign === 'top'} onClick={() => setTextVAlign('top')} title="Topo">
            <AlignStartVertical size={14} />
          </TbBtn>
          <TbBtn
            active={textVAlign === 'center'}
            onClick={() => setTextVAlign('center')}
            title="Centro"
          >
            <AlignCenterVertical size={14} />
          </TbBtn>
          <TbBtn
            active={textVAlign === 'bottom'}
            onClick={() => setTextVAlign('bottom')}
            title="Base"
          >
            <AlignEndVertical size={14} />
          </TbBtn>
        </div>
        <div style={tbSep} />
        {/* H-align */}
        <div style={{ display: 'flex', gap: 1 }}>
          <TbBtn
            active={textHAlign === 'left'}
            onClick={() => setTextHAlign('left')}
            title="Esquerda"
          >
            <AlignLeft size={14} />
          </TbBtn>
          <TbBtn
            active={textHAlign === 'center'}
            onClick={() => setTextHAlign('center')}
            title="Centro"
          >
            <AlignCenter size={14} />
          </TbBtn>
          <TbBtn
            active={textHAlign === 'right'}
            onClick={() => setTextHAlign('right')}
            title="Direita"
          >
            <AlignRight size={14} />
          </TbBtn>
        </div>
        <div style={tbSep} />
        {/* Font */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMainFontPickerOpen(!mainFontPickerOpen)}
            style={{
              height: 28,
              padding: '0 8px',
              border: '1.5px solid #E2E2E2',
              borderRadius: 6,
              fontSize: 12,
              color: '#1A1A1A',
              background: '#FFFFFF',
              cursor: 'pointer',
              minWidth: 130,
              fontFamily: getFontFamily(selectedFont),
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {ALL_FONTS.find((f) => f.id === selectedFont)?.name ?? 'Inter'}
            <ChevronDown size={12} style={{ opacity: 0.4, marginLeft: 'auto' }} />
          </button>
          {mainFontPickerOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: 300,
                background: '#1A1A2E',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: 12,
                zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <FontCategorySelector
                selectedFontId={selectedFont}
                onSelect={(font) => {
                  setSelectedFont(font.id)
                  setFreeTextBoxes((prev) =>
                    prev.map((b) => (b.id === 'main-text' ? { ...b, fontFamily: font.family } : b))
                  )
                  setMainFontPickerOpen(false)
                  pushActivity(
                    'font_changed',
                    `Fonte: ${font.name} ✓`,
                    font.id === 'playfair' || font.id === 'cormorant'
                      ? 'Escolha elegante. Esse estilo tipográfico passa credibilidade — combina bem com marcas premium.'
                      : font.id === 'bebas' || font.id === 'anton'
                        ? 'Bold e impactante. Perfeito pra campanhas de urgência. Quer testar um texto mais agressivo?'
                        : 'Fonte atualizada. Quer que eu regenere a imagem com esse estilo tipográfico aplicado?',
                    [
                      { id: 'regen', label: 'tentar novamente', action: 'regenerate_image' },
                      { id: 'publish', label: 'Publicar', action: 'open_publish' },
                    ]
                  )
                }}
              />
            </div>
          )}
        </div>
        <div style={tbSep} />
        {/* Text color dropdown */}
        <ColorPickerDropdown label="T" value={textColor} onChange={setTextColor} />
        <div style={tbSep} />
        {/* CTA color dropdown */}
        <ColorPickerDropdown
          label="CTA"
          value={ctaColor}
          onChange={(c) => {
            setCtaColor(c)
            setCtaTextColor(c === '#FFFFFF' || c === '#D4A064' ? '#1A1A1A' : '#FFFFFF')
          }}
        />
        <div style={tbSep} />
        {/* Overlay controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#999',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            Overlay
          </span>
          {/* Type toggle */}
          <div
            style={{ display: 'flex', background: '#F2F2F2', borderRadius: 6, padding: 2, gap: 1 }}
          >
            <button
              onClick={() => setOverlayType('gradient')}
              title="Gradiente"
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: 'none',
                background: overlayType === 'gradient' ? '#FFFFFF' : 'transparent',
                color: overlayType === 'gradient' ? '#1A1A1A' : '#777',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: overlayType === 'gradient' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <GradientIcon />
            </button>
            <button
              onClick={() => setOverlayType('solid')}
              title="Cor sólida"
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: 'none',
                background: overlayType === 'solid' ? '#FFFFFF' : 'transparent',
                color: overlayType === 'solid' ? '#1A1A1A' : '#777',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: overlayType === 'solid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Square size={13} />
            </button>
          </div>
          {/* Opacity slider */}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(overlayOpacity * 100)}
            onChange={(e) => setOverlayOpacity(Number(e.target.value) / 100)}
            title={`Intensidade: ${Math.round(overlayOpacity * 100)}%`}
            style={{ width: 72, height: 4, accentColor: '#1A1A1A', cursor: 'pointer' }}
          />
          {/* Overlay color */}
          <input
            type="color"
            value={overlayColor}
            onChange={(e) => setOverlayColor(e.target.value)}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid #E2E2E2',
              padding: 0,
              cursor: 'pointer',
              background: 'none',
              overflow: 'hidden',
            }}
            title="Cor do overlay"
          />
          {/* Gradient position */}
          {overlayType === 'gradient' && (
            <div style={{ display: 'flex', gap: 1 }}>
              {(
                [
                  ['bottom', '↓', 'Base'],
                  ['top', '↑', 'Topo'],
                  ['full', '↕', 'Total'],
                ] as const
              ).map(([id, icon, label]) => (
                <TbBtn
                  key={id}
                  active={overlayPosition === id}
                  onClick={() => setOverlayPosition(id)}
                  title={label}
                >
                  <span style={{ fontSize: 12 }}>{icon}</span>
                </TbBtn>
              ))}
            </div>
          )}
          {/* Presets button */}
          <button
            onClick={() => setOverlayPresetsOpen((v) => !v)}
            title="Presets de overlay"
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              border: '1px solid #E2E2E2',
              background: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#777',
            }}
          >
            ▾
          </button>
          {/* Presets dropdown */}
          {overlayPresetsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: '#FFFFFF',
                border: '1.5px solid #E8E8E8',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                padding: 8,
                display: 'flex',
                gap: 6,
                zIndex: 20,
                animation: 'dropIn 0.15s ease',
              }}
            >
              {OVERLAY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyOverlayPreset(p)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: '1.5px solid #E8E8E8',
                    borderRadius: 8,
                    padding: 6,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    minWidth: 52,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1A1A1A')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E8E8E8')}
                >
                  <div
                    style={{
                      width: 40,
                      height: 28,
                      borderRadius: 4,
                      border: '1px solid #E8E8E8',
                      background: p.preview,
                    }}
                  />
                  <span
                    style={{ fontSize: 10, color: '#666', fontWeight: 500, whiteSpace: 'nowrap' }}
                  >
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={tbSep} />
        {/* Estilo button */}
        <button
          onClick={() => setStylesOpen((v) => !v)}
          style={{
            height: 28,
            padding: '0 12px',
            borderRadius: 6,
            border: `1.5px solid ${stylesOpen ? '#1A1A1A' : '#E2E2E2'}`,
            background: stylesOpen ? '#1A1A1A' : '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            color: stylesOpen ? '#FFFFFF' : '#555',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
            marginLeft: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ◈ Estilo
          {selectedStyleId && (
            <span style={{ opacity: 0.7 }}>
              {' '}
              · {ART_STYLES.find((s) => s.id === selectedStyleId)?.name}
            </span>
          )}
        </button>
      </div>

      {/* Right — actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          paddingLeft: 12,
          borderLeft: '1px solid #EBEBEB',
        }}
      >
        <button onClick={() => setScannerOpen(true)} style={tbActionBtnStyle}>
          <ScanLine size={14} /> <span>Scan</span>
        </button>
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1.5px solid #E2E2E2',
            background: '#FFFFFF',
            color: '#555',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )

  const getCreativeState = useCallback(
    () => ({
      channel: selectedChannel,
      heading,
      description,
      cta,
      style: selectedStyleId,
      styleName: selectedImageStyle?.name ?? selectedStyleId ?? '',
      product: studioSession.activeProduct?.name ?? activeProductName,
      productDescription: (activeProduct as any)?.description ?? '',
      // Spec 070: when the user picked a product via the Studio picker,
      // the edge function must NOT call snew_nuvemshop_api — the product
      // image is already set as generation reference.
      activeProductName: studioSession.activeProduct?.name ?? '',
      activeProductId: studioSession.activeProduct?.id ?? '',
      campaign: activeCampaign?.title ?? data.campaignTitle ?? '',
      isCarouselMode,
      textColor,
      ctaColor,
      overlayOpacity,
      font: selectedFont,
      lastGeneratedPrompt: imagePrompt ?? '',
      activeImageUrl: activeImageUrl ?? '',
      hasImage: !!activeImageUrl && !isPlaceholderImage(activeImageUrl),
      imgGallery,
      activeGalleryId,
      // Bottom-of-canvas thumbnail strip (lines 15327+) renders from
      // assetHistory, so we have to persist that too — otherwise the strip
      // disappears on reload until the user manually clicks each thumb in chat.
      assetHistory,
      // E-commerce backend discriminator (spec 069 FR-008/-010). Sent every
      // turn so the studio-chat edge function suppresses Composio Shopify
      // suggestions when Nuvemshop is connected.
      ecommerceKind,
      storeName: storeCtx?.name ?? '',
      storeNiche: storeCtx?.niche ?? '',
      storeTone: storeCtx?.tone ?? '',
      storeAudience: storeCtx?.audience ?? '',
      storeKeywords: storeCtx?.keywords ?? [],
      storeProducts: storeCtx?.productTypes ?? [],
      storeColors: storeCtx?.colors ?? [],
      // Visual direction from KB
      visualConcept: storeCtx?.visualConcept ?? '',
      modelGender: storeCtx?.modelProfile?.gender ?? '',
      modelAge: storeCtx?.modelProfile?.ageRange ?? '',
      modelPose: storeCtx?.modelProfile?.pose ?? '',
      shootingStyle: storeCtx?.shootingStyle ?? '',
      lightingMood: storeCtx?.lightingMood ?? '',
      colorMood: storeCtx?.colorMood ?? '',
    }),
    [
      selectedChannel,
      heading,
      description,
      cta,
      selectedStyleId,
      selectedImageStyle,
      activeProductName,
      activeProduct,
      activeCampaign,
      data.campaignTitle,
      isCarouselMode,
      textColor,
      ctaColor,
      overlayOpacity,
      selectedFont,
      imagePrompt,
      activeImageUrl,
      imgGallery,
      activeGalleryId,
      assetHistory,
      ecommerceKind,
      storeCtx,
      studioSession.activeProduct,
    ]
  )

  const executeAction = useCallback(
    async (action: any): Promise<{ icon: string; label: string } | null> => {
      console.log('[executeAction] received:', JSON.stringify(action))
      switch (action.type) {
        case 'set_heading':
        case 'set_text': {
          const val = action.value ?? action.text ?? ''
          setHeading(val)
          setFreeTextBoxes((prev) =>
            prev.map((b) => (b.id === 'main-text' ? { ...b, text: val } : b))
          )
          return { icon: '✏', label: 'Texto atualizado' }
        }

        case 'add_text_box': {
          const text = action.text ?? action.value ?? 'Novo texto'
          const posMap: Record<string, number> = { top: 0.08, middle: 0.46, bottom: 0.75 }
          const yRel = posMap[action.position ?? 'middle'] ?? 0.46
          const id = `text-${Date.now()}`
          const newBox: FreeTextBox = {
            id,
            text,
            xRel: 0.06,
            yRel,
            fontSizeRel: 0.055,
            color: action.color ?? '#FFFFFF',
            fontFamily: getFontFamilyById(selectedFont),
            textAlign: 'center',
            boxWidthRel: 0.88,
          }
          setFreeTextBoxes((prev) => [...prev, newBox])
          setSelectedBoxId(id)
          return { icon: '✏', label: `Texto adicionado` }
        }

        case 'set_description': {
          setDescription(action.value ?? '')
          const descId = 'desc-text'
          setFreeTextBoxes((prev) => {
            if (prev.some((b) => b.id === descId)) {
              return prev.map((b) => (b.id === descId ? { ...b, text: action.value } : b))
            }
            return [
              ...prev,
              {
                id: descId,
                text: action.value ?? '',
                xRel: 0.06,
                yRel: 0.58,
                fontSizeRel: 0.028,
                color: '#FFFFFF',
                fontFamily: getFontFamilyById(selectedFont),
                textAlign: 'center',
                boxWidthRel: 0.88,
              },
            ]
          })
          return { icon: '✏', label: 'Descrição atualizada' }
        }

        case 'set_cta': {
          setCta(action.value ?? '')
          const ctaId = 'cta-text'
          setFreeTextBoxes((prev) => {
            if (prev.some((b) => b.id === ctaId)) {
              return prev.map((b) => (b.id === ctaId ? { ...b, text: action.value } : b))
            }
            return [
              ...prev,
              {
                id: ctaId,
                text: action.value ?? '',
                xRel: 0.06,
                yRel: 0.72,
                fontSizeRel: 0.022,
                color: '#FFFFFF',
                fontFamily: getFontFamilyById(selectedFont),
                textAlign: 'center',
                boxWidthRel: 0.88,
              },
            ]
          })
          return { icon: '✏', label: 'CTA atualizado' }
        }

        case 'set_style': {
          // Search imageStyles first (admin styles), fallback to ART_STYLES (legacy)
          const styleFromImages = imageStyles.find(
            (s) => s.id === action.value || s.name.toLowerCase() === action.value?.toLowerCase()
          )
          const styleFromArt = ART_STYLES.find(
            (s) => s.id === action.value || s.name.toLowerCase() === action.value?.toLowerCase()
          )
          const style = styleFromImages ?? styleFromArt

          if (!style) {
            return { icon: '◈', label: `Estilo não encontrado: ${action.value}` }
          }

          applyArtStyle(style as any)
          setSelectedImageStyle(styleFromImages ?? null)
          setOverlayOpacity(0)
          setHeadingVisible(false)
          setDescriptionVisible(false)
          setCtaVisible(false)

          // Do NOT generate here if there's a generate_image in the same batch
          // (the generate_image action will handle it)
          if (action.__skipGenerate) {
            return { icon: '◈', label: `Estilo ${style.name} aplicado` }
          }

          // Generate image with the new style (standalone set_style)
          const currentProduct = activeProductName?.trim() || ''
          const basePrompt = imagePrompt?.trim() || buildAutoPrompt()

          let generationPrompt = basePrompt

          if (styleFromImages?.buildPrompt) {
            generationPrompt = styleFromImages.buildPrompt({
              productName: currentProduct || 'the product',
              productDescription: (activeProduct as any)?.description ?? '',
              brandName: storeCtx?.name ?? data.campaignTitle ?? '',
              niche: storeCtx?.niche ?? '',
              audience: storeCtx?.audience ?? '',
              tone: storeCtx?.tone ?? '',
              context: selectedRatio?.id ?? '1:1',
            })
          } else if (styleFromImages?.promptBase) {
            generationPrompt = `${basePrompt}. ${styleFromImages.promptBase}`
          }

          setTimeout(() => {
            generateImageWithPrompt(generationPrompt, 1, styleFromImages ?? undefined)
          }, 150)

          return { icon: '◈', label: `Gerando com estilo ${style.name}...` }
        }

        case 'set_channel':
          handleChannelChange(action.value)
          return { icon: '▣', label: `Formato ${action.value}` }

        case 'set_text_color':
          setTextColor(action.value)
          setFreeTextBoxes((prev) =>
            prev.map((b) => (b.id === 'main-text' ? { ...b, color: action.value } : b))
          )
          return { icon: '◉', label: `Cor do texto: ${action.value}` }

        case 'set_cta_color':
          setCtaColor(action.value)
          return { icon: '◉', label: `Cor do CTA: ${action.value}` }

        case 'set_overlay_opacity':
          setOverlayOpacity(action.value)
          return { icon: '▣', label: `Overlay ${Math.round(action.value * 100)}%` }

        case 'set_overlay_type':
          setOverlayType(action.value)
          return { icon: '▣', label: `Overlay: ${action.value}` }

        case 'set_overlay_color':
          if (action.value) setOverlayColor(action.value)
          if (action.opacity !== undefined) setOverlayOpacity(action.opacity)
          return { icon: '▣', label: `Overlay atualizado` }

        case 'set_font': {
          const fontMap: Record<string, string> = {
            inter: "'Inter', sans-serif",
            poppins: "'Poppins', sans-serif",
            montserrat: "'Montserrat', sans-serif",
            playfair: "'Playfair Display', serif",
            lora: "'Lora', serif",
            cormorant: "'Cormorant Garamond', serif",
            bebas: "'Bebas Neue', sans-serif",
            oswald: "'Oswald', sans-serif",
            anton: "'Anton', sans-serif",
            'dancing-script': "'Dancing Script', cursive",
            'great-vibes': "'Great Vibes', cursive",
            pacifico: "'Pacifico', cursive",
            'dm-serif': "'DM Serif Display', serif",
            fraunces: "'Fraunces', serif",
            'space-grotesk': "'Space Grotesk', sans-serif",
            raleway: "'Raleway', sans-serif",
          }
          const family =
            action.fontFamily || fontMap[action.value] || `'${action.value}', sans-serif`
          setSelectedFont(action.value)
          setFreeTextBoxes((prev) =>
            prev.map((b) => (b.id === 'main-text' ? { ...b, fontFamily: family } : b))
          )
          return { icon: 'T', label: `Fonte: ${action.value}` }
        }

        case 'set_font_size':
          setFreeTextBoxes((prev) =>
            prev.map((b) =>
              b.id === 'main-text'
                ? { ...b, fontSizeRel: (action.value ?? 48) / (canvasDims.h || 600) }
                : b
            )
          )
          return { icon: 'T', label: `Tamanho: ${action.value}px` }

        case 'set_image_position':
          setImagePosition({ x: action.x ?? 50, y: action.y ?? 50 })
          return { icon: '◈', label: 'Posição da imagem ajustada' }

        case 'set_image_scale':
          setImageScale(action.value ?? 100)
          return { icon: '◈', label: `Escala: ${action.value}%` }

        case 'set_image_fit':
          setImageFit(action.value === 'contain' ? 'contain' : 'cover')
          return { icon: '◈', label: `Ajuste: ${action.value}` }

        case 'add_widget':
          switch (action.widget) {
            case 'countdown':
              handleAddCountdownWidget()
              break
            case 'price':
              handleAddPriceWidget()
              break
            case 'social-proof':
              handleAddSocialProofWidget()
              break
            case 'review':
              handleAddReviewCard()
              break
            case 'product-card':
              handleAddProductCard()
              break
          }
          return { icon: '▣', label: `Widget ${action.widget} adicionado` }

        case 'generate_image': {
          // Guard: if the user's prompt in this turn clearly asks to POST an existing
          // image (not generate a new one), and we already have an image, skip the
          // hallucinated generation. The AI sometimes stacks generate_image even when
          // snew_post_to_app is appropriate.
          const allMsgs = (chatPanelRef.current?.getMessages?.() ?? []) as Array<{
            role?: string
            content?: string
          }>
          const lastUserMsg = [...allMsgs].reverse().find((m) => m.role === 'user')
          const lastText = (lastUserMsg?.content ?? '').toLowerCase()
          const isPostIntent =
            /(publique|publicar|publiqu|posta|poste|postar|post\b|enviar|envia|envie|mand(e|ar|a|ando)|compartilh)/i.test(
              lastText
            )
          if (isPostIntent && activeImageUrl && !isPlaceholderImage(activeImageUrl)) {
            return { icon: '↗', label: 'Ignorado: já existe imagem pra postar' }
          }
          const count = action.count ?? action.variations ?? 1
          // Use styleOverride from set_style in same batch (fixes async state issue)
          const styleOverride = action.__styleOverride as ImageStyleOption | undefined
          setIsChatExecuting(true)
          setChatExecutingLabel(count > 1 ? `Gerando ${count} variações...` : 'Gerando imagem...')
          setImagePrompt(action.prompt ?? '')
          if (count > 1) {
            // Generate multiple sequentially
            setCanvasVariations([])
            setActiveVariationId(null)
            ;(async () => {
              for (let i = 0; i < count; i++) {
                setChatExecutingLabel(`Gerando variação ${i + 1} de ${count}...`)
                await generateImageWithPrompt(
                  action.prompt ?? '',
                  count,
                  styleOverride ?? undefined
                )
              }
              setIsChatExecuting(false)
              setChatExecutingLabel('')
            })()
          } else {
            generateImageWithPrompt(action.prompt ?? '', 1, styleOverride ?? undefined)
          }
          return {
            icon: '✦',
            label: count > 1 ? `Gerando ${count} variações...` : 'Gerando imagem...',
          }
        }

        case 'generate_carousel':
          if (action.slide_count) {
            setSlideCountMode('manual')
            setSlideCount(action.slide_count)
          } else setSlideCountMode('auto')
          setIsCarouselMode(true)
          handleGenerateCarousel()
          return { icon: '▣', label: `Carrossel de ${action.slide_count ?? 'auto'} slides` }

        case 'open_publish':
          setPublishOpen(true)
          return { icon: '↗', label: 'Publicar' }

        case 'open_schedule':
          setScheduleOpen(true)
          return { icon: '◷', label: 'Agendar' }

        case 'save_asset':
          handleSave()
          return { icon: '✓', label: 'Asset salvo' }

        case 'open_gen_panel':
          setGenPanelOpen(true)
          return { icon: '✦', label: 'Painel de texto aberto' }

        case 'open_font_panel':
          // Font selection is inline — select the main text box to show toolbar
          setSelectedBoxId('main-text')
          return { icon: 'T', label: 'Selecione a fonte na toolbar' }

        case 'open_scan':
          setScannerOpen(true)
          return { icon: '◈', label: 'Analisando criativo' }

        case 'open_brand_dna':
          // No dedicated panel — open scan which includes brand analysis
          setScannerOpen(true)
          return { icon: '◈', label: 'Analisando Brand DNA' }

        // ── Workspace tools emitted by the AI (anti-hallucination path) ──
        case 'snew_check_connections':
        case 'snew_list_available_apps':
        case 'snew_query_sales':
        case 'snew_query_stock':
        case 'snew_list_orders':
        case 'snew_nuvemshop_api':
        case 'snew_connect_app':
        case 'snew_run_skill':
        case 'snew_post_to_app': {
          // Pre-flight guard: if the AI tries to post but the app isn't actually
          // connected, short-circuit — offer the connect button instead of letting
          // Composio fail and the AI then hallucinate success on a retry.
          if (action.type === 'snew_post_to_app') {
            try {
              const checkRes = await fetch('/api/studio/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'snew_check_connections', params: {} }),
              })
              const checkJson = await checkRes.json()
              const connected = (
                (checkJson?.connected_apps ?? []) as Array<{ app_id: string }>
              ).map((a) => a.app_id.toLowerCase())
              const targetApp = ((action as { app?: string }).app ?? '').toLowerCase()
              if (targetApp && !connected.includes(targetApp)) {
                // Try to get a Composio OAuth URL
                const connectRes = await fetch('/api/studio/tools', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'snew_connect_app',
                    params: { app: targetApp },
                  }),
                })
                const connectJson = await connectRes.json()
                const url = connectJson?.connect_url as string | undefined
                const available = (connectJson?.available as string[] | undefined) ?? []
                // ALWAYS show a clickable button — either the real Composio
                // hosted-auth URL, or a fallback to /apps where the user can
                // configure a new toolkit in their workspace.
                const suggestions = url
                  ? [
                      {
                        id: 'open-connect',
                        label: `Conectar ${targetApp} agora`,
                        action: `__connect_url:${url}`,
                      },
                    ]
                  : [
                      {
                        id: 'open-apps',
                        label: `Abrir integrações`,
                        action: `__connect_url:/apps`,
                      },
                    ]
                const description = url
                  ? `Precisa autorizar ${targetApp} no Composio antes de postar.`
                  : `${targetApp} não está configurado no seu workspace Composio. Apps disponíveis: ${available.join(', ') || 'nenhum'}. Vá em Integrações pra adicionar.`
                chatPanelRef.current?.pushActivity?.(
                  'snew_connect_app',
                  `Conectar ${targetApp}`,
                  description,
                  suggestions,
                  undefined
                )
                // Feed this failure back to the AI's next turn via an assistant
                // message, so it stops pretending the post worked.
                chatPanelRef.current?.pushAssistantMessage?.({
                  content: url
                    ? `Não consegui postar em ${targetApp} porque esse app não está conectado. Clique no botão acima pra autorizar no Composio e me chame de novo.`
                    : `${targetApp} não está configurado no workspace Composio. Apps disponíveis: ${available.join(', ') || 'nenhum'}.`,
                })
                return { icon: '!', label: `${targetApp} não conectado` }
              }
            } catch {
              // If the pre-flight itself fails, let the main path handle the error.
            }
          }
          try {
            const res = await fetch('/api/studio/tools', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: (() => {
                // The AI sometimes emits nested params (`{type, params:{...}}`)
                // and sometimes top-level keys — fold both into a single shape
                // so the server-side router doesn't care.
                const a = action as Record<string, unknown> & { params?: Record<string, unknown> }
                const nested = (a.params ?? {}) as Record<string, unknown>
                const merged: Record<string, unknown> = {
                  app: (nested.app ?? a.app) as unknown,
                  period: (nested.period ?? a.period) as unknown,
                  product: (nested.product ?? a.product) as unknown,
                  limit: (nested.limit ?? a.limit) as unknown,
                  slug: (nested.slug ?? a.slug) as unknown,
                  resource: (nested.resource ?? a.resource) as unknown,
                  id: (nested.id ?? a.id) as unknown,
                  query: (nested.query ?? a.query) as unknown,
                }
                if (action.type === 'snew_post_to_app') {
                  merged.imageUrl =
                    (nested.imageUrl as string) ?? (a.imageUrl as string) ?? activeImageUrl ?? ''
                  merged.caption =
                    (nested.caption as string) ?? (a.caption as string) ?? heading ?? ''
                }
                return JSON.stringify({ action: action.type, params: merged })
              })(),
            })
            const json = await res.json()

            // run_skill: navigate to the new task
            if (action.type === 'snew_run_skill' && json?.redirect_url) {
              try {
                window.location.href = json.redirect_url as string
              } catch {
                /* ignore */
              }
            }

            // connect_app: render an inline clickable button in the activity card.
            // Clicking it opens the Composio hosted-auth URL. We NO LONGER auto-open
            // via window.open (popup blockers and it's invisible to the user).
            if (action.type === 'snew_connect_app') {
              const app = (action as { app?: string }).app ?? ''
              const url = (json?.connect_url as string) ?? ''
              if (url) {
                chatPanelRef.current?.pushActivity?.(
                  'snew_connect_app',
                  `Conectar ${app}`,
                  '',
                  [
                    {
                      id: 'open-connect',
                      label: `Conectar ${app}`,
                      action: `__connect_url:${url}`,
                    },
                  ],
                  undefined
                )
              } else {
                chatPanelRef.current?.pushActivity?.(
                  'snew_connect_app',
                  `Falha ao preparar conexão com ${app}`,
                  (json?.error as string) ?? 'Tente novamente.',
                  [],
                  undefined
                )
              }
              return { icon: '↗', label: `connect ${app}` }
            }

            // Surface result as an activity card in chat (compact summary)
            // Retail tools (snew_query_*) come back from the MCP edge function
            // with rich numeric fields (total_revenue, order_count, etc.) when
            // the team is on Nuvemshop — show them instead of the placeholder
            // message. Fall back to ECOMMERCE_NOT_CONNECTED / NUVEMSHOP_AUTH_EXPIRED.
            const summary = (() => {
              if (action.type === 'snew_check_connections')
                return `${json?.count ?? 0} app(s) conectado(s)${json?.ecommerce?.kind ? ` · loja: ${json.ecommerce.kind}` : ''}`
              if (action.type === 'snew_list_available_apps')
                return `${json?.total ?? 0} integrações disponíveis`
              if (action.type === 'snew_connect_app')
                return `Abrindo fluxo de conexão: ${(action as { app?: string }).app ?? ''}`
              if (
                action.type === 'snew_query_sales' ||
                action.type === 'snew_query_stock' ||
                action.type === 'snew_list_orders' ||
                action.type === 'snew_nuvemshop_api'
              ) {
                if (json?.error_code === 'ECOMMERCE_NOT_CONNECTED')
                  return 'Conecte sua loja para responder isso'
                if (json?.error_code === 'NUVEMSHOP_AUTH_EXPIRED')
                  return 'Autorização Nuvemshop expirou — reconecte em Apps'
                if (json?.error_code === 'RETAIL_TOOL_FAILED')
                  return `Falha ao consultar Nuvemshop: ${json?.message ?? 'erro'}`
                if (action.type === 'snew_query_sales' && typeof json?.order_count === 'number')
                  return `${json.order_count} pedido(s) · receita ${json.total_revenue ?? ''}${json.average_ticket ? ` · ticket médio ${json.average_ticket}` : ''}`
                if (
                  action.type === 'snew_query_stock' &&
                  Array.isArray(json?.products ?? json?.items)
                ) {
                  const items = (json?.products ?? json?.items) as unknown[]
                  return `${items.length} produto(s) com estoque listado(s)`
                }
                if (action.type === 'snew_list_orders' && Array.isArray(json?.orders))
                  return `${json.orders.length} pedido(s) recente(s)`
                if (action.type === 'snew_nuvemshop_api') {
                  const resource =
                    (action as { resource?: string; params?: { resource?: string } }).resource ??
                    (action as { params?: { resource?: string } }).params?.resource ??
                    json?.resource
                  // Activity card stays a one-liner — the rich answer comes
                  // from /api/studio/summarize as a markdown chat bubble.
                  if (Array.isArray(json?.data))
                    return `${json.data.length} ${resource ?? 'item'}(s) carregado(s)`
                  if (json?.data) return `${resource ?? 'Recurso'} carregado`
                  return 'Consulta concluída'
                }
                return json?.message ?? 'Consulta concluída'
              }
              if (action.type === 'snew_run_skill')
                return `Skill ${(action as { slug?: string }).slug ?? ''} iniciada`
              if (action.type === 'snew_post_to_app') {
                if (json?.error_code === 'ECOMMERCE_ALREADY_CONNECTED')
                  return 'Sua loja é Nuvemshop — não há publicação via Shopify aqui.'
                return json?.ok
                  ? `Publicado em ${(action as { app?: string }).app ?? ''}`
                  : `Falha ao publicar: ${json?.error ?? 'erro'}`
              }
              return 'Feito'
            })()

            chatPanelRef.current?.pushActivity?.(
              action.type,
              summary,
              typeof json?.hint === 'string' ? json.hint : '',
              [],
              undefined
            )

            // If the tool returned an artifact (e.g. STORE_QUERY_SALES
            // attaches an HTML card via `artifact` or `__artifact`), surface
            // it in the studio side panel. Coexists with the canvas —
            // persisted under a sub-key so the creativeState snapshot isn't
            // overwritten.
            // After the data tool returns, hand the payload to a second
            // lightweight LLM call so the chat gets a *real* markdown answer
            // ("Vendi 3 bodys bordados, 2 placas..."), not a one-line count.
            if (action.type === 'snew_nuvemshop_api' && json?.data && !json?.error_code) {
              const allMsgs = (chatPanelRef.current?.getMessages?.() ?? []) as Array<{
                role?: string
                content?: string
              }>
              const lastUserMsg = [...allMsgs].reverse().find((m) => m.role === 'user')
              void fetch('/api/studio/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userQuestion: lastUserMsg?.content ?? '',
                  toolName: action.type,
                  toolResult: { resource: json.resource, count: json.count, data: json.data },
                }),
              })
                .then((r) => (r.ok ? r.json() : null))
                .then((sum: { summary?: string } | null) => {
                  const text = sum?.summary?.trim()
                  if (text) {
                    chatPanelRef.current?.pushAssistantMessage?.({ content: text })
                    // Find the most recent assistant message's followUps so
                    // they ride along on the persisted markdown bubble too —
                    // otherwise on reload the chips end up under the wrong
                    // message (or nowhere).
                    const allMsgsForFollowups = (chatPanelRef.current?.getMessages?.() ??
                      []) as Array<{ role?: string; followUps?: string[] }>
                    let inherited: string[] | undefined
                    for (let i = allMsgsForFollowups.length - 1; i >= 0; i--) {
                      const m = allMsgsForFollowups[i]
                      if (m?.role === 'assistant' && m.followUps && m.followUps.length > 0) {
                        inherited = m.followUps
                        break
                      }
                    }
                    void studioSession.persistTurn({
                      userMessage: '',
                      assistantMessage: text,
                      metadata: {
                        engine: 'studio-summarize',
                        tool: action.type,
                        resource: json.resource,
                        followUps: inherited ?? [],
                      },
                    })
                  }
                })
                .catch(() => {
                  /* best-effort */
                })
            }

            // Remember the first product image URL from any products query —
            // the next generate_image uses it as a visual reference so the
            // generated campaign preserves the REAL product (not a hallucinated one).
            if (action.type === 'snew_nuvemshop_api' && json?.resource === 'products') {
              const products = Array.isArray(json.data) ? (json.data as unknown[]) : []
              const firstWithImage = products
                .map((p) => p as { images?: Array<{ src?: string }> })
                .find((p) => Array.isArray(p.images) && p.images.some((i) => !!i?.src))
              const firstSrc = firstWithImage?.images?.find((i) => !!i?.src)?.src
              if (firstSrc) {
                setChatProductImageUrl(firstSrc)
                chatProductImageUrlRef.current = firstSrc
              }
            }

            // Side-panel artifact rendering is intentionally disabled for
            // Nuvemshop queries (spec 070 follow-up). Users asked for the raw
            // data summary in the chat bubble only — no sticky side panel.
            // The summarize route handles the markdown answer.

            // Feed the outcome back to the AI's next turn via a chat assistant
            // message so it stops pretending tools succeeded when they failed.
            if (json?.error) {
              chatPanelRef.current?.pushAssistantMessage?.({
                content: `Tool ${action.type} falhou: ${String(json.error)}`,
              })
            } else if (action.type === 'snew_post_to_app' && json?.ok) {
              chatPanelRef.current?.pushAssistantMessage?.({
                content: `Tool ${action.type} concluída — publicação confirmada em ${
                  (action as { app?: string }).app ?? ''
                }.`,
              })
            }

            return { icon: '⚙', label: action.type.replace('snew_', '') }
          } catch (err) {
            console.error('studio tool error:', err)
            chatPanelRef.current?.pushAssistantMessage?.({
              content: `Tool ${action.type} falhou com exceção: ${
                err instanceof Error ? err.message : 'erro desconhecido'
              }`,
            })
            return { icon: '!', label: 'Falha na tool' }
          }
        }

        case 'new_asset':
          handleSave()
          setActiveImageUrl(null)
          setFreeTextBoxes([])
          return { icon: '✦', label: 'Novo asset' }

        case 'set_attributes_language': {
          const lang = (action.value ?? 'pt') as 'pt' | 'en' | 'es'
          setAttributesLanguage(lang)
          await handleGenerateAttributes(lang)
          return {
            icon: '◈',
            label: `Atributos em ${lang === 'pt' ? 'Portugues' : lang === 'en' ? 'Ingles' : 'Espanhol'}`,
          }
        }

        case 'regenerate_attributes': {
          const lang = (action.language ?? attributesLanguage) as 'pt' | 'en' | 'es'
          setAttributesLanguage(lang)
          await handleGenerateAttributes(lang)
          return { icon: '◈', label: 'Atributos regenerados' }
        }

        default:
          console.warn('[executeAction] unknown action type:', action.type)
          return null
      }
    },
    [
      applyArtStyle,
      handleChannelChange,
      generateImageWithPrompt,
      handleGenerateCarousel,
      imageStyles,
      activeProductName,
      imagePrompt,
      buildAutoPrompt,
      activeProduct,
      data.campaignTitle,
      selectedRatio,
      handleGenerateAttributes,
      attributesLanguage,
    ]
  )

  return (
    <div
      style={{
        position: embedded ? 'relative' : 'fixed',
        inset: embedded ? undefined : 0,
        zIndex: embedded ? undefined : 260,
        width: embedded ? '100%' : '100vw',
        height: embedded ? '100%' : '100vh',
        display: 'grid',
        gridTemplateColumns: boardMode ? '1fr' : '380px 1fr',
        gridTemplateRows: '100%',
        background: '#F2F2F2',
        overflow: 'hidden',
        transition: 'grid-template-columns 0.25s ease',
      }}
    >
      {/* ── Left panel: Chat float wrapper ── */}
      {!boardMode && (
        <div
          style={{
            height: '100%',
            maxHeight: '100%',
            padding: '12px 0 12px 12px',
            boxSizing: 'border-box' as const,
            display: 'flex',
            flexDirection: 'column' as const,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              background: 'transparent',
              borderRadius: 16,
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {/* Header — sem background, sem border-bottom */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                flexShrink: 0,
                background: '#FAFAFA',
              }}
            >
              {/* Título do chat com dropdown */}
              <div ref={chatTitleDropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setChatTitleDropdownOpen((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 6,
                    fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: '#1A1A1A',
                      letterSpacing: '-0.01em',
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chatTitle || 'snew studio'}
                  </span>
                  <ChevronDown size={12} style={{ color: '#BBB', flexShrink: 0 }} />
                </button>

                {/* Dropdown */}
                {chatTitleDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      background: '#FFFFFF',
                      border: '0.5px solid #E8E8E8',
                      borderRadius: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      overflow: 'hidden',
                      zIndex: 100,
                      minWidth: 160,
                    }}
                  >
                    <button
                      onClick={() => {
                        const newName = prompt('Renomear chat:', chatTitle)
                        if (newName?.trim()) setChatTitle(newName.trim().toLowerCase())
                        setChatTitleDropdownOpen(false)
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'transparent',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 400,
                        color: '#555',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F7F7')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Pencil size={12} style={{ color: '#BBB' }} />
                      renomear
                    </button>
                    <div style={{ height: 1, background: '#F0F0F0' }} />
                    <button
                      onClick={() => {
                        setChatTitle('')
                        setActiveImageUrl(null)
                        setFreeTextBoxes([])
                        setHeading('')
                        setDescription('')
                        setCta('')
                        setOverlayOpacity(0)
                        setHeadingVisible(false)
                        setDescriptionVisible(false)
                        setCtaVisible(false)
                        chatPanelRef.current?.clearMessages?.()
                        setChatTitleDropdownOpen(false)
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'transparent',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 400,
                        color: '#555',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F7F7')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Plus size={12} style={{ color: '#BBB' }} />
                      criar novo chat
                    </button>
                  </div>
                )}
              </div>
              {/* Collapse button */}
              <button
                onClick={() => {
                  /* TODO: collapse sidebar */
                }}
                title="Minimizar chat"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  border: 'none',
                  background: 'transparent',
                  color: '#CCC',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.1s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A1A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCC')}
              >
                <ChevronsLeft size={15} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column' as const,
              }}
            >
              <StudioChatPanel
                ref={chatPanelRef}
                creativeState={getCreativeState()}
                initialMessages={data.restoreChatMessages}
                suppressWelcome={!!data.autoPrompt?.trim()}
                imageStyles={imageStyles.map((s) => ({
                  id: s.id,
                  name: s.name,
                  category: s.category,
                  color: s.color,
                  thumbnailUrl: s.thumbnailUrl ?? '',
                  description: s.description ?? '',
                }))}
                products={
                  realStoreProducts.length > 0
                    ? realStoreProducts
                    : allProducts
                        .slice(0, 8)
                        .map((p) => ({ id: p.id, name: p.name, image: p.image }))
                }
                onGenerateWithStyle={(styleId, productId) => {
                  const style = imageStyles.find((s) => s.id === styleId)
                  if (style) setSelectedImageStyle(style)
                  if (productId) {
                    setSelectedProducts([productId])
                    const p = allProducts.find((pr) => pr.id === productId)
                    if (p) setActiveImageUrl(p.image)
                  }
                  const currentProduct = productId
                    ? allProducts.find((p) => p.id === productId)
                    : activeProduct
                  const productName = currentProduct?.name?.trim() || ''
                  // Grab the user's latest chat message so the style
                  // template doesn't erase their actual intent (e.g. "coloque
                  // esse body em um bebê real").
                  const allMsgs = (chatPanelRef.current?.getMessages?.() ?? []) as Array<{
                    role?: string
                    content?: string
                  }>
                  const lastUserMsg = [...allMsgs].reverse().find((m) => m.role === 'user')
                  const userIntent = (lastUserMsg?.content ?? '').trim()
                  setTimeout(() => {
                    if (style?.buildPrompt) {
                      const base = style.buildPrompt({
                        productName: productName || 'the product',
                        productDescription: (currentProduct as any)?.description ?? '',
                        brandName: storeCtx?.name ?? data.campaignTitle ?? '',
                        niche: storeCtx?.niche ?? '',
                        audience: storeCtx?.audience ?? '',
                        modelGender: storeCtx?.modelProfile?.gender ?? '',
                        modelAge: storeCtx?.modelProfile?.ageRange ?? '',
                        context: (selectedRatio as any)?.id ?? '1:1',
                      })
                      const prompt = userIntent ? `${base}. User intent: ${userIntent}` : base
                      setImagePrompt(prompt)
                      generateImageWithPrompt(prompt, 1, style)
                    } else {
                      generateImageWithPrompt(userIntent || productName || buildAutoPrompt())
                    }
                  }, 100)
                }}
                onAction={async (rawAction) => {
                  // The studio-chat edge function sometimes emits nested
                  // params (`{type, params:{value,...}}`) and sometimes
                  // top-level keys. Flatten so every case below reads from a
                  // single shape.
                  const nestedParams = (rawAction as { params?: Record<string, unknown> }).params
                  const action = {
                    ...(nestedParams ?? {}),
                    ...rawAction,
                    // Nested fills only if top-level is missing (top-level wins).
                    ...Object.fromEntries(
                      Object.entries(nestedParams ?? {}).filter(
                        ([k]) => (rawAction as Record<string, unknown>)[k] === undefined
                      )
                    ),
                  } as typeof rawAction
                  const label =
                    action.type === 'generate_image'
                      ? 'Gerando imagem...'
                      : action.type === 'generate_carousel'
                        ? 'Gerando carrossel...'
                        : action.type === 'set_style'
                          ? 'Aplicando estilo...'
                          : action.type === 'set_channel'
                            ? 'Ajustando formato...'
                            : action.type === 'set_font'
                              ? 'Trocando fonte...'
                              : action.type === 'set_overlay_color' ||
                                  action.type === 'set_overlay_opacity'
                                ? 'Ajustando overlay...'
                                : action.type === 'set_text_color'
                                  ? 'Atualizando cores...'
                                  : action.type === 'set_heading' || action.type === 'set_text'
                                    ? 'Aplicando texto...'
                                    : action.type === 'add_text_box'
                                      ? 'Inserindo texto...'
                                      : action.type === 'add_widget'
                                        ? 'Adicionando widget...'
                                        : 'Aplicando...'

                  setIsChatExecuting(true)
                  setChatExecutingLabel(label)

                  const result = await executeAction(action)

                  if (action.type !== 'generate_image' && action.type !== 'generate_carousel') {
                    setTimeout(() => {
                      setIsChatExecuting(false)
                      setChatExecutingLabel('')
                    }, 400)
                  }
                  return result
                }}
                onArtifactReady={() => setArtifactReady(true)}
                onSuggestionAction={handleSuggestionAction}
                onReferenceImageDrop={(base64, mimeType, dataUrl) => {
                  setReferenceImages((prev) => [
                    ...prev.slice(-2),
                    { id: `ref-${Date.now()}`, dataUrl, base64, mimeType },
                  ])
                }}
                onFirstMessage={(msg) => {
                  if (!chatTitle || chatTitle === 'snew studio' || chatTitle === 'sem título') {
                    const newTitle = msg.slice(0, 45).toLowerCase()
                    setChatTitle(newTitle)
                    setCurrentSessionTitle(msg.slice(0, 60))
                  }
                }}
                onQualificationAnswer={handleQualificationAnswer}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Canvas column ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          minWidth: 0,
          background: '#F2F2F2',
        }}
      >
        {/* Styles Panel */}
        {stylesOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              left: 0,
              height: '100%',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'dropIn 0.15s ease',
            }}
            onClick={() => setStylesOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: 24,
                maxWidth: 680,
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1A1A1A' }}>
                  Estilos artísticos
                </h3>
                <button
                  onClick={() => setStylesOpen(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: '1px solid #E2E2E2',
                    background: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#999',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}
              >
                {ART_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => applyArtStyle(style)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 0,
                      border: `2px solid ${selectedStyleId === style.id ? (style.isBrandDna ? '#C47A20' : '#1A1A1A') : style.isBrandDna ? '#D4A064' : '#E8E8E8'}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      background: style.isBrandDna
                        ? 'linear-gradient(135deg, #FFFBF5, #FFF8EE)'
                        : '#FFFFFF',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        background: style.preview,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {style.isBrandDna && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            fontSize: 12,
                            color: '#D4A064',
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                          }}
                        >
                          ✦
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 24,
                          fontFamily: getFontFamily(style.font),
                          textTransform: style.textCase as any,
                          fontWeight: Number(style.fontWeight),
                          letterSpacing: style.letterSpacing,
                          color: style.textColor,
                        }}
                      >
                        Aa
                      </span>
                      {selectedStyleId === style.id && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: '#1A1A1A',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>
                          {style.name}
                        </span>
                        {style.isBrandDna && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: '#C47A20',
                              background: '#FFF0D6',
                              border: '1px solid #F5CFA0',
                              borderRadius: 999,
                              padding: '1px 5px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Sua marca
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: '#999',
                          display: 'block',
                          marginTop: 2,
                          lineHeight: 1.3,
                        }}
                      >
                        {style.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scanner Drawer */}
        {scannerOpen && (
          <div
            className="scanner-drawer"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 360,
              height: '100%',
              background: '#FFFFFF',
              borderLeft: '1px solid #EBEBEB',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 20,
              overflowY: 'auto',
              animation: 'slideInRight 0.2s ease',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '24px 20px 16px',
                borderBottom: '1px solid #F0F0F0',
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  Conversion Scanner
                </p>
                <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}>Análise de CMO</p>
              </div>
              <button
                onClick={() => setScannerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Context form + initial state */}
            {!scanResult && !isScanning && (
              <div className="scanner-setup">
                {/* Objective */}
                <div className="scanner-field">
                  <label className="scanner-label">Objetivo da campanha</label>
                  <div className="scanner-pills">
                    {(
                      [
                        { id: 'conversion', label: 'Conversão direta' },
                        { id: 'retargeting', label: 'Remarketing' },
                        { id: 'launch', label: 'Lançamento' },
                        { id: 'awareness', label: 'Awareness' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        className={`scanner-pill ${scanContext.campaignObjective === opt.id ? 'active' : ''}`}
                        onClick={() =>
                          setScanContext((prev) => ({ ...prev, campaignObjective: opt.id }))
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticket */}
                <div className="scanner-field">
                  <label className="scanner-label">Ticket médio (R$)</label>
                  <input
                    type="number"
                    className="scanner-input"
                    value={scanContext.ticketAverage || ''}
                    onChange={(e) =>
                      setScanContext((prev) => ({ ...prev, ticketAverage: Number(e.target.value) }))
                    }
                    placeholder="189"
                  />
                </div>

                {/* Audience */}
                <div className="scanner-field">
                  <label className="scanner-label">Público-alvo</label>
                  <input
                    type="text"
                    className="scanner-input"
                    value={scanContext.audience}
                    onChange={(e) =>
                      setScanContext((prev) => ({ ...prev, audience: e.target.value }))
                    }
                    placeholder="Ex: Mães de bebês, 25-40 anos"
                  />
                </div>

                {/* Category */}
                <div className="scanner-field">
                  <label className="scanner-label">Categoria do produto</label>
                  <input
                    type="text"
                    className="scanner-input"
                    value={scanContext.productCategory}
                    onChange={(e) =>
                      setScanContext((prev) => ({ ...prev, productCategory: e.target.value }))
                    }
                    placeholder="Ex: Moda infantil"
                  />
                </div>

                {/* Promotional toggle */}
                <div className="scanner-field">
                  <label className="scanner-label">Tem oferta / desconto?</label>
                  <div className="scanner-pills">
                    <button
                      className={`scanner-pill ${scanContext.isPromotional ? 'active' : ''}`}
                      onClick={() => setScanContext((prev) => ({ ...prev, isPromotional: true }))}
                    >
                      Sim
                    </button>
                    <button
                      className={`scanner-pill ${!scanContext.isPromotional ? 'active' : ''}`}
                      onClick={() => setScanContext((prev) => ({ ...prev, isPromotional: false }))}
                    >
                      Não
                    </button>
                  </div>
                </div>

                <Button className="w-full rounded-xl" onClick={handleScan}>
                  ✦ Analisar criativo
                </Button>
              </div>
            )}

            {/* Loading */}
            {isScanning && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  flex: 1,
                  padding: '40px 20px',
                  color: '#888',
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: '3px solid #E8E8E8',
                    borderTopColor: '#1A1A1A',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <p style={{ margin: 0 }}>Analisando com olhar de CMO...</p>
              </div>
            )}

            {/* Result */}
            {scanResult && !isScanning && (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Score card */}
                <div
                  style={{
                    borderRadius: 14,
                    padding: 20,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    background:
                      scanResult.level === 'high'
                        ? '#F0FAF4'
                        : scanResult.level === 'medium'
                          ? '#FFF8EC'
                          : '#FEF2F2',
                    border: `1.5px solid ${scanResult.level === 'high' ? '#A8D5A2' : scanResult.level === 'medium' ? '#F5CFA0' : '#FBBFBF'}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: '#888',
                    }}
                  >
                    Chance de conversão
                  </span>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      lineHeight: 1,
                      color:
                        scanResult.level === 'high'
                          ? '#2E7D52'
                          : scanResult.level === 'medium'
                            ? '#B45309'
                            : '#DC2626',
                    }}
                  >
                    {scanResult.score}/100
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                        scanResult.level === 'high'
                          ? '#2E7D52'
                          : scanResult.level === 'medium'
                            ? '#B45309'
                            : '#DC2626',
                    }}
                  >
                    {scanResult.levelLabel}
                  </span>
                </div>

                {/* CMO Verdict */}
                {scanResult.cmoVerdict && (
                  <div className="cmo-verdict">
                    <span className="cmo-verdict-icon">◎</span>
                    <p className="cmo-verdict-text">&ldquo;{scanResult.cmoVerdict}&rdquo;</p>
                  </div>
                )}

                {/* ROAS Risk */}
                {scanResult.roasRiskLabel && (
                  <div className={`roas-risk roas-${scanResult.roasRisk || 'medium'}`}>
                    <span style={{ flexShrink: 0 }}>
                      {scanResult.roasRisk === 'high'
                        ? '▲'
                        : scanResult.roasRisk === 'low'
                          ? '✓'
                          : '→'}
                    </span>
                    <span>{scanResult.roasRiskLabel}</span>
                  </div>
                )}

                {/* Dimensions with insights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {scanResult.dimensions?.map((d: any) => (
                    <div key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>
                          {d.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color:
                              d.level === 'high'
                                ? '#2E7D52'
                                : d.level === 'medium'
                                  ? '#B45309'
                                  : '#DC2626',
                          }}
                        >
                          {d.score}/100
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: '#F0F0F0',
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 999,
                            transition: 'width 0.5s ease',
                            width: `${d.score}%`,
                            background:
                              d.level === 'high'
                                ? '#4CAF7D'
                                : d.level === 'medium'
                                  ? '#F59E0B'
                                  : '#EF4444',
                          }}
                        />
                      </div>
                      {d.insight && <p className="dim-insight">{d.insight}</p>}
                    </div>
                  ))}
                </div>

                {/* Risks */}
                {scanResult.risks?.length > 0 && (
                  <div className="scanner-section">
                    <h4 className="scanner-section-title">Riscos de ROAS</h4>
                    {scanResult.risks.map((r: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                          padding: '6px 0',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            flexShrink: 0,
                            marginTop: 1,
                            color:
                              r.priority === 'high'
                                ? '#DC2626'
                                : r.priority === 'medium'
                                  ? '#F59E0B'
                                  : '#6B7280',
                          }}
                        >
                          {r.priority === 'high' ? '↑' : r.priority === 'medium' ? '→' : '↓'}
                        </span>
                        <span style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>
                          {r.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Opportunities */}
                {scanResult.opportunities?.length > 0 && (
                  <div className="scanner-section">
                    <h4 className="scanner-section-title">Oportunidades</h4>
                    {scanResult.opportunities.map((o: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                          padding: '6px 0',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            flexShrink: 0,
                            marginTop: 1,
                            color: o.priority === 'high' ? '#2E7D52' : '#F59E0B',
                          }}
                        >
                          {o.priority === 'high' ? '↑' : '→'}
                        </span>
                        <span style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>
                          {o.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Improving progress steps */}
                {isImproving && improvingSteps.length > 0 && (
                  <div className="scanner-improving">
                    {improvingSteps.map((step, i) => (
                      <div
                        key={i}
                        className={`improve-step ${step.done ? 'done' : step.active ? 'active' : ''}`}
                      >
                        <span className="improve-step-icon">
                          {step.done ? '✓' : step.active ? '●' : '○'}
                        </span>
                        <span className="improve-step-label">{step.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {!isImproving && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Button className="w-full rounded-xl" onClick={handleAutoImprove}>
                      ✦ Aumentar chances de conversão
                    </Button>
                    <button
                      onClick={() => {
                        setScanResult(null)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        height: 32,
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        color: '#888',
                        cursor: 'pointer',
                        transition: 'color 0.15s',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A1A')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
                    >
                      <RefreshCw size={12} /> Reanalisar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          onClick={() => deselectAll()}
          onDragOver={(e) => {
            if (isPlaceholderImage(activeImageUrl)) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          onDrop={(e) => {
            if (!isPlaceholderImage(activeImageUrl)) return
            e.preventDefault()
            e.stopPropagation()
            const file = e.dataTransfer.files[0]
            if (!file?.type.startsWith('image/')) return
            const reader = new FileReader()
            reader.onload = (ev) => {
              const url = ev.target?.result as string
              setActiveImageUrl(url)
              setGeneratedImageUrl(url)
              setImageFit('cover')
              setImageScale(100)
              setImagePosition({ x: 50, y: 50 })
            }
            reader.readAsDataURL(file)
          }}
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F2F2F2',
            padding: 40,
            overflow: 'auto',
          }}
        >
          {/* Fixed top bar — typography controls — absolutely positioned so it doesn't push canvas */}
          {selectedBoxId &&
            !isGeneratingAsset &&
            !isChatExecuting &&
            (() => {
              const currentBox = freeTextBoxes.find((b) => b.id === selectedBoxId)
              if (!currentBox) return null
              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="canvas-top-toolbar"
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 999,
                  }}
                >
                  {/* Fonte */}
                  <button
                    ref={topToolbarFontBtnRef}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setTopToolbarFontOpen((v) => !v)
                    }}
                    className="ctt-btn ctt-font"
                  >
                    {currentBox.fontFamily.split(',')[0].replace(/['"]/g, '').trim() ?? 'Inter'}
                    <ChevronDown size={11} />
                  </button>
                  <FontSelectorPortal
                    isOpen={topToolbarFontOpen}
                    anchorEl={topToolbarFontBtnRef.current}
                    selectedFontId={selectedFont}
                    onSelect={(font) => {
                      setSelectedFont(font.id)
                      updateBox(selectedBoxId, { fontFamily: font.family })
                      setTopToolbarFontOpen(false)
                    }}
                    onClose={() => setTopToolbarFontOpen(false)}
                  />

                  <div className="ctt-divider" />

                  {/* Alinhamento do texto interno */}
                  <button
                    className="ctt-btn ctt-icon"
                    title="Texto esquerda"
                    onClick={() => updateBox(selectedBoxId, { textAlign: 'left' })}
                  >
                    <AlignLeft size={13} />
                  </button>
                  <button
                    className="ctt-btn ctt-icon"
                    title="Texto centro"
                    onClick={() => updateBox(selectedBoxId, { textAlign: 'center' })}
                  >
                    <AlignCenter size={13} />
                  </button>
                  <button
                    className="ctt-btn ctt-icon"
                    title="Texto direita"
                    onClick={() => updateBox(selectedBoxId, { textAlign: 'right' })}
                  >
                    <AlignRight size={13} />
                  </button>

                  <div className="ctt-divider" />

                  {/* Posição horizontal do textbox no canvas */}
                  <button
                    className="ctt-btn ctt-icon"
                    title="Mover textbox para esquerda"
                    onClick={() => updateBox(selectedBoxId, { xRel: 0.04 })}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="1" width="2" height="11" rx="1" fill="currentColor" />
                      <rect
                        x="4"
                        y="4"
                        width="8"
                        height="5"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </svg>
                  </button>
                  <button
                    className="ctt-btn ctt-icon"
                    title="Centralizar textbox horizontalmente"
                    onClick={() => {
                      const boxWRel = currentBox.boxWidthRel ?? 0.88
                      updateBox(selectedBoxId, { xRel: (1 - boxWRel) / 2 })
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="6" y="1" width="1.2" height="11" rx="0.6" fill="currentColor" />
                      <rect
                        x="2.5"
                        y="4"
                        width="8"
                        height="5"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </svg>
                  </button>
                  <button
                    className="ctt-btn ctt-icon"
                    title="Mover textbox para direita"
                    onClick={() =>
                      updateBox(selectedBoxId, {
                        xRel: Math.max(0, 1 - (currentBox.boxWidthRel ?? 0.88) - 0.04),
                      })
                    }
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="10" y="1" width="2" height="11" rx="1" fill="currentColor" />
                      <rect
                        x="1"
                        y="4"
                        width="8"
                        height="5"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </svg>
                  </button>

                  <div className="ctt-divider" />

                  {/* Posição vertical do textbox no canvas */}
                  <button
                    className="ctt-btn ctt-icon"
                    title="Mover textbox para o topo"
                    onClick={() => updateBox(selectedBoxId, { yRel: 0.04 })}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="1" width="11" height="2" rx="1" fill="currentColor" />
                      <rect
                        x="4"
                        y="4"
                        width="5"
                        height="8"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </svg>
                  </button>
                  <button
                    className="ctt-btn ctt-icon"
                    title="Centralizar textbox verticalmente"
                    onClick={() => updateBox(selectedBoxId, { yRel: 0.46 })}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="6" width="11" height="1.2" rx="0.6" fill="currentColor" />
                      <rect
                        x="4"
                        y="2.5"
                        width="5"
                        height="8"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </svg>
                  </button>
                  <button
                    className="ctt-btn ctt-icon"
                    title="Mover textbox para a base"
                    onClick={() => updateBox(selectedBoxId, { yRel: 0.88 })}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="10" width="11" height="2" rx="1" fill="currentColor" />
                      <rect
                        x="4"
                        y="1"
                        width="5"
                        height="8"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </svg>
                  </button>

                  <div className="ctt-divider" />

                  {/* Tamanho da fonte */}
                  <button
                    className="ctt-btn"
                    onClick={() => {
                      const W = assetFrameRef.current?.offsetWidth ?? 300
                      const currentPx = Math.round((currentBox.fontSizeRel ?? 0.06) * W)
                      updateBox(selectedBoxId, { fontSizeRel: Math.max(8, currentPx - 2) / W })
                    }}
                  >
                    A-
                  </button>
                  <span className="ctt-size">
                    {Math.round(
                      (currentBox.fontSizeRel ?? 0.06) * (assetFrameRef.current?.offsetWidth ?? 300)
                    )}
                    px
                  </span>
                  <button
                    className="ctt-btn"
                    onClick={() => {
                      const W = assetFrameRef.current?.offsetWidth ?? 300
                      const currentPx = Math.round((currentBox.fontSizeRel ?? 0.06) * W)
                      updateBox(selectedBoxId, { fontSizeRel: Math.min(200, currentPx + 2) / W })
                    }}
                  >
                    A+
                  </button>

                  <div className="ctt-divider" />

                  {/* Cor */}
                  <div className="ctt-color-wrap">
                    <input
                      type="color"
                      value={currentBox.color}
                      onChange={(e) => updateBox(selectedBoxId, { color: e.target.value })}
                      className="ctt-color-input"
                    />
                    <div className="ctt-color-preview" style={{ background: currentBox.color }} />
                  </div>

                  <div className="ctt-divider" />

                  {/* Sombra do texto */}
                  <button
                    className="ctt-btn"
                    title={currentBox.textShadow ? 'Remover sombra' : 'Adicionar sombra'}
                    onClick={() =>
                      updateBox(selectedBoxId, {
                        textShadow: currentBox.textShadow ? undefined : '0 2px 8px rgba(0,0,0,0.7)',
                      })
                    }
                    style={{
                      opacity: currentBox.textShadow ? 1 : 0.4,
                      fontSize: 12,
                    }}
                  >
                    S
                  </button>
                </div>
              )
            })()}

          {/* Board mode overlay */}
          {boardMode && (
            <div
              ref={boardRef}
              className="infinite-board"
              onMouseDown={handleBoardMouseDown}
              onMouseMove={handleBoardMouseMove}
              onMouseUp={handleBoardMouseUp}
              onMouseLeave={handleBoardMouseUp}
              onWheel={handleBoardWheel}
              style={{ cursor: boardIsPanning ? 'grabbing' : 'grab' }}
            >
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <defs>
                  <pattern
                    id="board-dots"
                    x={boardOffset.x % (20 * boardScale)}
                    y={boardOffset.y % (20 * boardScale)}
                    width={20 * boardScale}
                    height={20 * boardScale}
                    patternUnits="userSpaceOnUse"
                  >
                    <circle
                      cx={10 * boardScale}
                      cy={10 * boardScale}
                      r={Math.max(0.8, boardScale * 0.9)}
                      fill="rgba(0,0,0,0.12)"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#board-dots)" />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${boardScale})`,
                  transformOrigin: '0 0',
                  willChange: 'transform',
                }}
              >
                {boardAssets.map((asset) => (
                  <div
                    key={asset.id}
                    data-board-asset="true"
                    className={`board-asset-card ${asset.isDragging ? 'is-dragging' : ''}`}
                    style={{
                      position: 'absolute',
                      left: asset.x,
                      top: asset.y,
                      width: asset.width,
                    }}
                    onMouseDown={(e) => handleAssetMouseDown(e, asset.id)}
                    onDoubleClick={() => handleBoardAssetOpen(asset)}
                  >
                    {asset.type === 'document' ? (
                      <div
                        style={{
                          height: asset.height,
                          background: '#FFFFFF',
                          borderRadius: '10px 10px 0 0',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          border: '1px solid #E8E8E4',
                        }}
                      >
                        <div
                          style={{ padding: '16px 16px 12px', borderBottom: '1px solid #F0F0EC' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#8B5CF6',
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 600,
                                color: '#999',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              Documento
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#1A1A1A',
                              margin: 0,
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {asset.label}
                          </p>
                        </div>
                        <div style={{ flex: 1, padding: '12px 16px', overflow: 'hidden' }}>
                          <p
                            style={{
                              fontSize: 11,
                              color: '#888',
                              margin: 0,
                              lineHeight: 1.6,
                              display: '-webkit-box',
                              WebkitLineClamp: 6,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {asset.documentExcerpt}
                          </p>
                        </div>
                        <div
                          className="board-asset-hover-overlay"
                          style={{ borderRadius: '10px 10px 0 0' }}
                        >
                          <button
                            className="board-asset-open-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              try {
                                sessionStorage.setItem(
                                  'snew:restore-doc',
                                  JSON.stringify({
                                    markdown: asset.documentMarkdown,
                                    title: asset.label,
                                  })
                                )
                              } catch {}
                              window.location.href = '/agent'
                            }}
                          >
                            Abrir no Agent
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="board-asset-image" style={{ height: asset.height }}>
                          <img
                            src={asset.imageUrl}
                            alt={asset.label}
                            draggable={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '10px 10px 0 0',
                              display: 'block',
                              userSelect: 'none',
                            }}
                          />
                          <div className="board-asset-hover-overlay">
                            <button
                              className="board-asset-open-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleBoardAssetOpen(asset)
                              }}
                            >
                              Abrir no Studio
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    {asset.label && asset.type !== 'document' && (
                      <div className="board-asset-label">
                        <span className="board-asset-label-text">{asset.label}</span>
                        {asset.channel && (
                          <span className="board-asset-channel-badge">{asset.channel}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {boardAssets.length === 0 && (
                  <div className="board-empty-state">
                    <span style={{ fontSize: 32, opacity: 0.3 }}>◈</span>
                    <p>Gere assets no Studio para organizá-los aqui</p>
                  </div>
                )}
              </div>
              <div className="board-hud">
                <div className="board-zoom-controls">
                  <button
                    onClick={() => setBoardScale((s) => Math.min(s * 1.2, 3))}
                    className="board-hud-btn"
                  >
                    +
                  </button>
                  <span className="board-zoom-label">{Math.round(boardScale * 100)}%</span>
                  <button
                    onClick={() => setBoardScale((s) => Math.max(s * 0.8, 0.2))}
                    className="board-hud-btn"
                  >
                    −
                  </button>
                  <button
                    onClick={() => {
                      const COLS = 3,
                        CARD_W = 220,
                        CARD_H = 300,
                        LABEL_H = 40,
                        GAP = 24
                      const ROW_H = CARD_H + LABEL_H
                      const n = boardAssets.length
                      const totalCols = Math.min(n, COLS)
                      const totalRows = Math.ceil(n / COLS)
                      const gridW = totalCols * CARD_W + Math.max(0, totalCols - 1) * GAP
                      const gridH = totalRows * ROW_H + Math.max(0, totalRows - 1) * GAP
                      const vpW = boardRef.current?.offsetWidth ?? window.innerWidth
                      const vpH = boardRef.current?.offsetHeight ?? window.innerHeight
                      setBoardScale(1)
                      setBoardOffset({ x: vpW / 2 - gridW / 2, y: vpH / 2 - gridH / 2 })
                    }}
                    className="board-hud-btn"
                  >
                    ◈
                  </button>
                </div>
                <button onClick={exitBoardMode} className="board-exit-btn">
                  ← Voltar ao Studio
                </button>
              </div>
            </div>
          )}

          {/* Canvas + FAB wrapper */}
          {!boardMode && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}
            >
              {/* Canvas frame */}
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                {isCarousel ? (
                  <div
                    ref={canvasRef}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {generatedCarouselSlides.length === 0 && !isGeneratingCarousel ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 12,
                          padding: '40px 24px',
                          textAlign: 'center',
                          width: 'min(520px, calc(100% - 80px))',
                        }}
                      >
                        <span style={{ fontSize: 32, color: '#CCC', marginBottom: 4 }}>▣</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>
                          Criar carrossel
                        </span>
                        <span style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                          Gere slides com storytelling automático ou defina quantos slides quer.
                        </span>
                        <button
                          onClick={() => setCarouselSetupOpen(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            height: 44,
                            padding: '0 24px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#1A1A1A',
                            color: '#FFFFFF',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            marginTop: 8,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                          ✦ Gerar carrossel
                        </button>
                      </div>
                    ) : isGeneratingCarousel && generatedCarouselSlides.length === 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 16,
                          padding: '60px 24px',
                          color: '#888',
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            border: '3px solid #E8E8E8',
                            borderTopColor: '#1A1A1A',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        <p style={{ margin: 0 }}>Gerando slides com storytelling...</p>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            justifyContent: 'center',
                            width: '100%',
                          }}
                        >
                          <button
                            onClick={() => setActiveSlide((i) => Math.max(0, i - 1))}
                            disabled={activeSlide === 0}
                            style={{
                              ...carouselArrowStyle,
                              opacity: activeSlide === 0 ? 0.25 : 1,
                              cursor: activeSlide === 0 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <ChevronLeft size={20} />
                          </button>

                          <div
                            ref={canvasRef}
                            onClick={(e) => {
                              if (e.target === e.currentTarget) deselectAll()
                            }}
                            style={{
                              flex: 1,
                              maxWidth: 480,
                              aspectRatio: `${channel.width} / ${channel.height}`,
                              maxHeight: 'calc(100vh - 200px)',
                              position: 'relative',
                              borderRadius: 16,
                              overflow: 'visible',
                              boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: 16,
                                overflow: 'hidden',
                                backgroundImage:
                                  generatedCarouselSlides[activeSlide]?.image &&
                                  generatedCarouselSlides[activeSlide]?.image !== 'error'
                                    ? `url(${generatedCarouselSlides[activeSlide].image})`
                                    : `url(${activeImageUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            >
                              {/* Image click target — same as standard mode */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedElement((prev) => (prev === 'image' ? null : 'image'))
                                  setEditingElement(null)
                                  setToneDropdownFor(null)
                                }}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  zIndex: 1,
                                  cursor: 'pointer',
                                  borderRadius: 'inherit',
                                  outline:
                                    selectedElement === 'image' ? '2px solid #18A0FB' : 'none',
                                  outlineOffset: selectedElement === 'image' ? -2 : 0,
                                }}
                              />

                              {/* Slide generating skeleton */}
                              {!generatedCarouselSlides[activeSlide]?.image && (
                                <div
                                  className="slide-generating"
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: '#F2F2F2',
                                    borderRadius: 'inherit',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 5,
                                  }}
                                >
                                  <div
                                    className="conic-spinner"
                                    style={{ animationDuration: '2.5s' }}
                                  />
                                  <div className="skeleton-noise" />
                                  <div
                                    style={{
                                      position: 'relative',
                                      zIndex: 2,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      {[0, 1, 2].map((i) => (
                                        <span
                                          key={i}
                                          className="skeleton-dot"
                                          style={{ animationDelay: `${i * 0.2}s` }}
                                        />
                                      ))}
                                    </div>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 500,
                                        color: 'rgba(0,0,0,0.35)',
                                        letterSpacing: '0.04em',
                                      }}
                                    >
                                      Slide {activeSlide + 1}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {generatedCarouselSlides[activeSlide]?.image === 'error' && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: '#F5F5F5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#999',
                                    fontSize: 12,
                                    zIndex: 5,
                                  }}
                                >
                                  Erro ao gerar imagem
                                </div>
                              )}

                              <div
                                style={buildOverlayStyle(
                                  overlayType,
                                  overlayColor,
                                  overlayOpacity,
                                  overlayPosition
                                )}
                              />

                              {/* Copy block — uses slide-specific text */}
                              <div style={copyBlockPositionStyle}>
                                {generatedCarouselSlides[activeSlide]?.heading && (
                                  <SelectableText
                                    fieldKey="heading"
                                    value={generatedCarouselSlides[activeSlide].heading}
                                    onChange={(v) => updateSlide(activeSlide, 'heading', v)}
                                    selectedElement={selectedElement}
                                    editingElement={editingElement}
                                    setSelectedElement={setSelectedElement}
                                    setEditingElement={setEditingElement}
                                    style={{
                                      fontSize: headingSize,
                                      fontWeight: Number(fontWeightState) || 700,
                                      color: textColor,
                                      lineHeight: 1.3,
                                      margin: 0,
                                      marginBottom: 6,
                                      fontFamily,
                                      textTransform: textCase as any,
                                      letterSpacing,
                                    }}
                                  />
                                )}
                                {generatedCarouselSlides[activeSlide]?.description && (
                                  <SelectableText
                                    fieldKey="description"
                                    value={generatedCarouselSlides[activeSlide].description}
                                    onChange={(v) => updateSlide(activeSlide, 'description', v)}
                                    selectedElement={selectedElement}
                                    editingElement={editingElement}
                                    setSelectedElement={setSelectedElement}
                                    setEditingElement={setEditingElement}
                                    style={{
                                      fontSize: descriptionSize,
                                      fontWeight: 400,
                                      color: textColor,
                                      opacity: 0.85,
                                      lineHeight: 1.4,
                                      margin: 0,
                                      marginBottom: generatedCarouselSlides[activeSlide]?.cta
                                        ? 10
                                        : 0,
                                      fontFamily,
                                      letterSpacing,
                                    }}
                                  />
                                )}
                                {generatedCarouselSlides[activeSlide]?.cta && (
                                  <SelectableText
                                    fieldKey="cta"
                                    value={generatedCarouselSlides[activeSlide].cta!}
                                    onChange={(v) => updateSlide(activeSlide, 'cta', v)}
                                    isCta
                                    selectedElement={selectedElement}
                                    editingElement={editingElement}
                                    setSelectedElement={setSelectedElement}
                                    setEditingElement={setEditingElement}
                                    style={{
                                      display: 'inline-block',
                                      padding: '6px 16px',
                                      background: ctaColor,
                                      color: ctaTextColor,
                                      borderRadius: ctaRadius,
                                      fontSize: ctaSize,
                                      fontWeight: 600,
                                      fontFamily,
                                      alignSelf:
                                        textHAlign === 'right'
                                          ? 'flex-end'
                                          : textHAlign === 'center'
                                            ? 'center'
                                            : 'flex-start',
                                    }}
                                  />
                                )}
                              </div>

                              <p
                                style={{
                                  position: 'absolute',
                                  bottom: 8,
                                  right: 16,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                  color: 'rgba(255,255,255,0.5)',
                                  margin: 0,
                                  zIndex: 3,
                                }}
                              >
                                {generatedCarouselSlides[activeSlide]?.product?.toUpperCase() ||
                                  activeProductName.toUpperCase() ||
                                  'PRODUTO'}{' '}
                                · SLIDE {activeSlide + 1}/{generatedCarouselSlides.length}
                              </p>
                            </div>

                            {/* Selection toolbar — same as standard mode */}
                            {renderSelectionToolbar()}

                            {/* Corner handles when image selected */}
                            {selectedElement === 'image' && (
                              <>
                                {[
                                  { top: -4, left: -4 },
                                  { top: -4, right: -4 },
                                  { bottom: -4, left: -4 },
                                  { bottom: -4, right: -4 },
                                ].map((pos, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      position: 'absolute',
                                      ...pos,
                                      width: 8,
                                      height: 8,
                                      background: '#FFFFFF',
                                      border: '1.5px solid #18A0FB',
                                      borderRadius: 1,
                                      zIndex: 21,
                                      pointerEvents: 'none',
                                    }}
                                  />
                                ))}
                              </>
                            )}

                            {/* Slide delete button */}
                            {generatedCarouselSlides.length > 1 && (
                              <button
                                onClick={() => {
                                  setGeneratedCarouselSlides((prev) =>
                                    prev.filter((_, i) => i !== activeSlide)
                                  )
                                  setActiveSlide((i) =>
                                    Math.min(i, generatedCarouselSlides.length - 2)
                                  )
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 12,
                                  right: 12,
                                  zIndex: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '6px 10px',
                                  background: 'rgba(255,255,255,0.92)',
                                  backdropFilter: 'blur(4px)',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#E53E3E',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#FFF5F5'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.92)'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              setActiveSlide((i) =>
                                Math.min(generatedCarouselSlides.length - 1, i + 1)
                              )
                            }
                            disabled={activeSlide === generatedCarouselSlides.length - 1}
                            style={{
                              ...carouselArrowStyle,
                              opacity:
                                activeSlide === generatedCarouselSlides.length - 1 ? 0.25 : 1,
                              cursor:
                                activeSlide === generatedCarouselSlides.length - 1
                                  ? 'not-allowed'
                                  : 'pointer',
                            }}
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>

                        <div
                          style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 16 }}
                        >
                          {generatedCarouselSlides.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveSlide(i)}
                              style={{
                                width: activeSlide === i ? 20 : 7,
                                height: 7,
                                borderRadius: activeSlide === i ? 4 : 999,
                                border: 'none',
                                cursor: 'pointer',
                                background: activeSlide === i ? '#1A1A1A' : '#CCCCCC',
                                transition: 'all 0.2s',
                              }}
                            />
                          ))}
                        </div>

                        <button
                          onClick={() => setCarouselSetupOpen(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'none',
                            border: 'none',
                            fontSize: 12,
                            color: '#888',
                            cursor: 'pointer',
                            marginTop: 6,
                            transition: 'color 0.15s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A1A')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
                        >
                          ↻ Regenerar carrossel
                        </button>
                      </>
                    )}
                  </div>
                ) : isPlaceholderImage(activeImageUrl) ? (
                  <div
                    ref={canvasRef}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      flex: 1,
                      gap: 24,
                    }}
                  >
                    {/* Hidden ref for ResizeObserver */}
                    <div
                      ref={assetFrameRef}
                      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
                    />

                    {isGeneratingAsset || isChatExecuting ? (
                      /* Loading state */
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            border: '2.5px solid #E8E8E8',
                            borderTopColor: '#1A1A1A',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#555',
                            margin: 0,
                            fontFamily: 'inherit',
                          }}
                        >
                          {generatingLabel || chatExecutingLabel || 'Gerando...'}
                        </p>
                      </div>
                    ) : (
                      /* Empty state — category tabs + 2×2 suggestion grid */
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          overflowY: 'auto',
                          padding: '28px 32px',
                          boxSizing: 'border-box' as const,
                          display: 'flex',
                          flexDirection: 'column' as const,
                          gap: 20,
                        }}
                      >
                        {!activeEmptyCategory ? (
                          /* No category selected — neutral hint */
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column' as const,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: 1,
                              gap: 12,
                              opacity: 0.4,
                            }}
                          >
                            <Sparkles size={28} style={{ color: '#AAA' }} />
                            <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>
                              Escolha uma opção acima ou descreva no chat
                            </p>
                          </div>
                        ) : (
                          /* 2×2 suggestion grid */
                          <div
                            style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}
                          >
                            <p
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#AAA',
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.07em',
                                margin: 0,
                              }}
                            >
                              {activeEmptyCategory === 'image'
                                ? 'Estilos de imagem'
                                : activeEmptyCategory === 'video'
                                  ? 'Templates de vídeo'
                                  : activeEmptyCategory === 'carousel'
                                    ? 'Modelos de carrossel'
                                    : 'Copies e textos'}
                            </p>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 12,
                              }}
                            >
                              {(() => {
                                const store = storeCtx?.name ?? 'sua loja'
                                const product = storeCtx?.productTypes?.[0] ?? 'produto'

                                const applyStyleAndStart = (styleId: string) => {
                                  const s = imageStyles.find((x) => x.id === styleId)
                                  if (s) {
                                    setSelectedImageStyle(s)
                                    applyArtStyle(s as any)
                                    startQualification(buildAutoPrompt() || s.name, {
                                      hasStyle: true,
                                    })
                                  }
                                  setActiveEmptyCategory(null)
                                }

                                const SUGGESTIONS: Record<
                                  string,
                                  {
                                    id: string
                                    thumb?: string | null
                                    emoji?: string
                                    bg?: string
                                    label: string
                                    desc: string
                                    action: () => void
                                  }[]
                                > = {
                                  image: [
                                    {
                                      id: 'ecommerce',
                                      thumb: imageStyles.find(
                                        (s) => s.id === 'ecommerce-photography'
                                      )?.thumbnailUrl,
                                      label: 'E-commerce Photography',
                                      desc: 'Produto limpo, fundo neutro, luz uniforme',
                                      action: () => applyStyleAndStart('ecommerce-photography'),
                                    },
                                    {
                                      id: 'advertising',
                                      thumb: imageStyles.find((s) => s.id === 'advertising-product')
                                        ?.thumbnailUrl,
                                      label: 'Advertising Product',
                                      desc: 'Props, fundo dominante, luz dramática',
                                      action: () => applyStyleAndStart('advertising-product'),
                                    },
                                    {
                                      id: 'lifestyle',
                                      thumb: imageStyles.find((s) => s.id === 'product-lifestyle')
                                        ?.thumbnailUrl,
                                      label: 'Product Lifestyle',
                                      desc: 'Produto integrado à cena real',
                                      action: () => applyStyleAndStart('product-lifestyle'),
                                    },
                                    {
                                      id: 'fashion',
                                      thumb: imageStyles.find((s) => s.id === 'fashion-on-model')
                                        ?.thumbnailUrl,
                                      label: 'Fashion On-Model',
                                      desc: 'Pose de atitude, produto em destaque',
                                      action: () => applyStyleAndStart('fashion-on-model'),
                                    },
                                  ],
                                  video: [
                                    {
                                      id: 'adv-vid',
                                      emoji: '🎬',
                                      bg: '#FFF7ED',
                                      label: 'Advertising',
                                      desc: 'Hero shot dramático com câmera pull-back',
                                      action: () => {
                                        setVideoMode('ai')
                                        setVideoPrompt(
                                          AI_VIDEO_PRESETS[0]?.buildPrompt?.(product) ?? ''
                                        )
                                        handleSidebarAction('video')
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar vídeo advertising de ${product} de ${store}`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'life-vid',
                                      emoji: '🌅',
                                      bg: '#F0FDF4',
                                      label: 'Lifestyle',
                                      desc: 'Cena de uso real, luz natural, emocional',
                                      action: () => {
                                        setVideoMode('ai')
                                        const p = AI_VIDEO_PRESETS.find(
                                          (x) => x.id === 'lifestyle-motion'
                                        )
                                        if (p) setVideoPrompt(p.buildPrompt(product))
                                        handleSidebarAction('video')
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar vídeo lifestyle de ${product} de ${store}`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'close-vid',
                                      emoji: '🔍',
                                      bg: '#EFF6FF',
                                      label: 'Close-up Detail',
                                      desc: 'Macro do produto revelando textura',
                                      action: () => {
                                        setVideoMode('ai')
                                        const p = AI_VIDEO_PRESETS.find(
                                          (x) => x.id === 'close-up-detail'
                                        )
                                        if (p) setVideoPrompt(p.buildPrompt(product))
                                        handleSidebarAction('video')
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar vídeo close-up de ${product} de ${store}`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'orbit-vid',
                                      emoji: '🔄',
                                      bg: '#F5F3FF',
                                      label: 'Orbit 360°',
                                      desc: 'Câmera orbita o produto em loop',
                                      action: () => {
                                        setVideoMode('ai')
                                        const p = AI_VIDEO_PRESETS.find((x) => x.id === 'orbit-360')
                                        if (p) setVideoPrompt(p.buildPrompt(product))
                                        handleSidebarAction('video')
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar vídeo orbit 360 de ${product} de ${store}`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                  ],
                                  carousel: [
                                    {
                                      id: 'benefits',
                                      emoji: '✅',
                                      bg: '#ECFDF5',
                                      label: 'Benefícios do produto',
                                      desc: '1 benefício por slide, 5 slides',
                                      action: () => {
                                        setIsCarouselMode(true)
                                        setSlideCountMode('manual')
                                        setSlideCount(5)
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar carrossel de benefícios de ${product} de ${store}: 5 slides`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'before-after',
                                      emoji: '↔️',
                                      bg: '#F5F3FF',
                                      label: 'Antes e Depois',
                                      desc: 'Transformação ou comparação, 4 slides',
                                      action: () => {
                                        setIsCarouselMode(true)
                                        setSlideCountMode('manual')
                                        setSlideCount(4)
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar carrossel antes e depois para ${store}: 4 slides`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'social-proof',
                                      emoji: '⭐',
                                      bg: '#FFFBEB',
                                      label: 'Prova Social',
                                      desc: 'Reviews e depoimentos, 6 slides',
                                      action: () => {
                                        setIsCarouselMode(true)
                                        setSlideCountMode('manual')
                                        setSlideCount(6)
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar carrossel de prova social para ${store}: 6 slides`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'educational',
                                      emoji: '📚',
                                      bg: '#EFF6FF',
                                      label: 'Educacional',
                                      desc: 'Ensina algo sobre o produto, 5 slides',
                                      action: () => {
                                        setIsCarouselMode(true)
                                        setSlideCountMode('manual')
                                        setSlideCount(5)
                                        chatPanelRef.current?.sendMessage?.(
                                          `Criar carrossel educacional sobre ${product} de ${store}: 5 slides`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                  ],
                                  copy: [
                                    {
                                      id: 'pack-6',
                                      emoji: '✍️',
                                      bg: '#FFFBEB',
                                      label: 'Pack 6 canais',
                                      desc: 'Instagram, Stories, WhatsApp, Email, TikTok, LinkedIn',
                                      action: () => {
                                        chatPanelRef.current?.sendMessage?.(
                                          `Pack de copies para ${product} de ${store}: 6 canais com headline, corpo e CTA`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'email-seq',
                                      emoji: '📧',
                                      bg: '#EFF6FF',
                                      label: 'Sequência de e-mail',
                                      desc: 'Boas-vindas, nurturing e retenção',
                                      action: () => {
                                        chatPanelRef.current?.sendMessage?.(
                                          `Sequência de e-mails para ${store}: D0 boas-vindas, D3 nurturing, D14 conversão, D30 retenção`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'whatsapp',
                                      emoji: '💬',
                                      bg: '#ECFDF5',
                                      label: 'Fluxos WhatsApp',
                                      desc: 'Carrinho abandonado, pós-compra, reativação',
                                      action: () => {
                                        chatPanelRef.current?.sendMessage?.(
                                          `Fluxos de WhatsApp para ${store}: carrinho abandonado, pós-compra e reativação`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                    {
                                      id: 'ads-copy',
                                      emoji: '🎯',
                                      bg: '#FEF2F2',
                                      label: 'Copies para Ads',
                                      desc: 'Meta e Google com headlines e variações',
                                      action: () => {
                                        chatPanelRef.current?.sendMessage?.(
                                          `Copies para Meta Ads e Google Ads de ${product} de ${store}: headlines, descrições e variações`
                                        )
                                        setActiveEmptyCategory(null)
                                      },
                                    },
                                  ],
                                }

                                return (SUGGESTIONS[activeEmptyCategory!] ?? []).map((s, i) => (
                                  <button
                                    key={s.id}
                                    onClick={s.action}
                                    style={{
                                      border: '1px solid #EEECEA',
                                      borderRadius: 14,
                                      padding: 0,
                                      background: '#FFFFFF',
                                      cursor: 'pointer',
                                      fontFamily: 'inherit',
                                      textAlign: 'left' as const,
                                      overflow: 'hidden',
                                      transition: 'all 0.15s',
                                      animation: 'fadeSlideUp 0.25s ease both',
                                      animationDelay: `${i * 50}ms`,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-3px)'
                                      e.currentTarget.style.boxShadow =
                                        '0 8px 24px rgba(0,0,0,0.10)'
                                      e.currentTarget.style.borderColor = '#D0CEC8'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'none'
                                      e.currentTarget.style.boxShadow = 'none'
                                      e.currentTarget.style.borderColor = '#EEECEA'
                                    }}
                                  >
                                    {/* Visual area */}
                                    <div
                                      style={{
                                        width: '100%',
                                        aspectRatio: '16/9',
                                        background: s.bg ?? '#F0EEE8',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {s.thumb ? (
                                        <img
                                          src={s.thumb}
                                          alt={s.label}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover' as const,
                                            display: 'block',
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: 36, opacity: 0.7 }}>
                                          {s.emoji}
                                        </span>
                                      )}
                                    </div>
                                    {/* Info */}
                                    <div style={{ padding: '12px 14px 14px' }}>
                                      <p
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 600,
                                          color: '#1A1A1A',
                                          margin: '0 0 4px',
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        {s.label}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: 11,
                                          color: '#888',
                                          margin: 0,
                                          lineHeight: 1.5,
                                        }}
                                      >
                                        {s.desc}
                                      </p>
                                    </div>
                                  </button>
                                ))
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    ref={canvasRef}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '100%',
                      gap: 10,
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const file = e.dataTransfer.files[0]
                      if (!file?.type.startsWith('image/')) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        const url = ev.target?.result as string
                        setActiveImageUrl(url)
                        setGeneratedImageUrl(url)
                        setImageFit('cover')
                        setImageScale(100)
                        setImagePosition({ x: 50, y: 50 })
                      }
                      reader.readAsDataURL(file)
                    }}
                  >
                    <div
                      onMouseEnter={() => setCanvasHovered(true)}
                      onMouseLeave={() => setCanvasHovered(false)}
                      style={{
                        position: 'relative',
                        width: `min(100%, ${channel.width >= channel.height ? 720 : 480}px)`,
                      }}
                    >
                      {renderCanvasFrame(
                        `${channel.width} / ${channel.height}`,
                        channel.width >= channel.height ? 720 : 480,
                        activeImageUrl ?? '',
                        assetFrameRef
                      )}

                      {!isPlaceholderImage(activeImageUrl) &&
                        canvasHovered &&
                        !selectedBoxId &&
                        !editingBoxId &&
                        !isEditingImage &&
                        !selectedElement && (
                          <>
                            {/* Pills — top left */}
                            <div
                              style={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                display: 'flex',
                                gap: 5,
                                zIndex: 20,
                                animation: 'pillsFadeIn 0.18s ease-out both',
                              }}
                            >
                              {[
                                selectedRatio?.id ?? '9:16',
                                `${selectedRatio?.width ?? 1080} × ${selectedRatio?.height ?? 1920}`,
                                selectedImageStyle?.name,
                              ]
                                .filter(Boolean)
                                .map((label, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 500,
                                      color: 'rgba(255,255,255,0.85)',
                                      background: 'rgba(0,0,0,0.45)',
                                      backdropFilter: 'blur(8px)',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      letterSpacing: '0.01em',
                                    }}
                                  >
                                    {label}
                                  </span>
                                ))}
                            </div>

                            {/* Buttons — bottom left */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 10,
                                left: 10,
                                display: 'flex',
                                gap: 6,
                                zIndex: 20,
                                animation: 'regenFadeIn 0.18s ease-out both',
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleGenerateImage()
                                }}
                                title="Gerar nova versão"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.55)',
                                  backdropFilter: 'blur(8px)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.9)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.12s',
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = 'rgba(0,0,0,0.82)')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')
                                }
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  replaceImageInputRef.current?.click()
                                }}
                                title="Substituir imagem"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.55)',
                                  backdropFilter: 'blur(8px)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.9)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.12s',
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = 'rgba(0,0,0,0.82)')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')
                                }
                              >
                                <ImageIcon size={14} />
                              </button>
                            </div>

                            {/* Hidden file input */}
                            <input
                              ref={replaceImageInputRef}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const reader = new FileReader()
                                reader.onload = (ev) => {
                                  const dataUrl = ev.target?.result as string
                                  setActiveImageUrl(dataUrl)
                                  setGeneratedImageUrl(dataUrl)
                                  setImageFit('cover')
                                  setImageScale(100)
                                  setImagePosition({ x: 50, y: 50 })
                                  setOverlayOpacity(0)
                                  setHeadingVisible(false)
                                  setDescriptionVisible(false)
                                  setCtaVisible(false)
                                  saveToHistory()
                                  toast.success('imagem substituída.')
                                }
                                reader.readAsDataURL(file)
                                e.target.value = ''
                              }}
                            />
                          </>
                        )}
                    </div>
                  </div>
                )}

                {/* Thumbnail strip — fixed at bottom of canvas area */}
                {(() => {
                  // Only show when there is an active asset being edited/created in this session
                  if (!activeImageUrl || isPlaceholderImage(activeImageUrl)) return null
                  const validItems = assetHistory.filter(
                    (h) => h.imageUrl && h.imageUrl.length > 10 && !isPlaceholderImage(h.imageUrl)
                  )
                  // Build stable list: deduplicate by URL, keep chronological order (newest first)
                  const seen = new Set<string>()
                  const allThumbs: {
                    id: string
                    url: string
                    channel?: string
                    isVideo?: boolean
                  }[] = []
                  // Add active image only if it's not already in history
                  for (const h of validItems) {
                    if (!seen.has(h.imageUrl)) {
                      seen.add(h.imageUrl)
                      allThumbs.push({
                        id: h.id,
                        url: h.imageUrl,
                        channel: h.channel,
                        isVideo: h.isVideo,
                      })
                    }
                  }
                  // If activeImageUrl is not in history yet (just generated), prepend it
                  if (!seen.has(activeImageUrl)) {
                    allThumbs.unshift({ id: '__current__', url: activeImageUrl })
                  }
                  if (allThumbs.length < 2) return null
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 6,
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 14,
                        padding: '6px 8px',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
                        zIndex: 50,
                        overflowX: 'auto',
                        maxWidth: '90%',
                        scrollbarWidth: 'none' as const,
                      }}
                    >
                      {allThumbs.slice(0, 10).map((item) => {
                        const isActive = item.url === activeImageUrl
                        return (
                          <button
                            key={item.id}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (item.url === activeImageUrl) return
                              setActiveImageUrl(item.url)
                              if (item.channel) {
                                const savedRatio = ASPECT_RATIOS.find((r) => r.id === item.channel)
                                if (savedRatio) setSelectedRatio(savedRatio)
                              }
                              setImageFit('cover')
                              setImageScale(100)
                              setImagePosition({ x: 50, y: 50 })
                            }}
                            style={{
                              padding: 0,
                              background: 'none',
                              cursor: 'pointer',
                              flexShrink: 0,
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: `2.5px solid ${isActive ? '#1A1A1A' : 'transparent'}`,
                              outline: 'none',
                              transition: 'all 0.12s',
                              transform: isActive ? 'scale(1.05)' : 'scale(1)',
                              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                            }}
                          >
                            <div style={{ position: 'relative', width: 48, height: 48 }}>
                              <img
                                src={item.url}
                                alt=""
                                draggable={false}
                                style={{
                                  width: 48,
                                  height: 48,
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                              {item.isVideo && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.25)',
                                  }}
                                >
                                  <Play
                                    size={16}
                                    fill="#fff"
                                    color="#fff"
                                    style={{ marginLeft: 2 }}
                                  />
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Mini sidebar — absolute, outside flow */}
                {!isPlaceholderImage(activeImageUrl) && (
                  <div className="image-edit-sidebar" onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`ies-item ${activeSidebarPanel === 'style' ? 'active' : ''}`}
                      onClick={() => {
                        setStylesOpen(true)
                        setSelectedElement(null)
                      }}
                      title="Modelos"
                    >
                      <Palette size={16} />
                      <span>Modelos</span>
                    </button>
                    <button
                      className={`ies-item ${activeSidebarPanel === 'overlay' ? 'active' : ''}`}
                      onClick={() => handleSidebarAction('overlay')}
                      title="Overlay"
                    >
                      <Layers size={16} />
                      <span>Overlay</span>
                    </button>
                    <button
                      className={`ies-item ${activeSidebarPanel === 'channel' ? 'active' : ''}`}
                      onClick={() => {
                        setChannelSelectorOpen(true)
                        setActiveSidebarPanel('channel')
                        setSelectedElement(null)
                      }}
                      title="Formato"
                    >
                      <LayoutGrid size={16} />
                      <span>Formato</span>
                    </button>
                    <button
                      className="ies-item"
                      onClick={handleAddTextBox}
                      title="Adicionar conteúdo"
                    >
                      <Plus size={16} />
                      <span>Conteúdo</span>
                    </button>
                    <button
                      className={`ies-item ${widgetsOpen ? 'active' : ''}`}
                      onClick={() => setWidgetsOpen((v) => !v)}
                      title="Widgets"
                    >
                      <Box size={16} />
                      <span>Widgets</span>
                    </button>
                    <button
                      className={`ies-item ${boardMode ? 'active' : ''}`}
                      onClick={enterBoardMode}
                      title="Board"
                    >
                      <Layout size={16} />
                      <span>Board</span>
                    </button>
                    <div className="ies-divider" />

                    <button
                      className="ies-item"
                      onClick={() => setScannerOpen(true)}
                      title="Scan"
                      style={{
                        opacity: isPlaceholderImage(activeImageUrl) ? 0.3 : 1,
                        pointerEvents: isPlaceholderImage(activeImageUrl) ? 'none' : 'auto',
                      }}
                    >
                      <ScanLine size={16} />
                      <span>Scan</span>
                    </button>

                    <button
                      className="ies-item"
                      onClick={() => setPublishOpen(true)}
                      title="Publicar"
                      style={{
                        opacity: isPlaceholderImage(activeImageUrl) ? 0.3 : 1,
                        pointerEvents: isPlaceholderImage(activeImageUrl) ? 'none' : 'auto',
                      }}
                    >
                      <Share2 size={16} />
                      <span>Publicar</span>
                    </button>

                    <div className="ies-divider" />

                    <button
                      className="ies-item"
                      onClick={() => handleDownload()}
                      title="Download"
                      style={{
                        opacity: isPlaceholderImage(activeImageUrl) ? 0.3 : 1,
                        pointerEvents: isPlaceholderImage(activeImageUrl) ? 'none' : 'auto',
                      }}
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </button>

                    <button
                      className={`ies-item ${isSaveAnimating ? 'save-animating' : ''}`}
                      onClick={handleSave}
                      title="Salvar"
                      style={{
                        opacity: isPlaceholderImage(activeImageUrl) ? 0.3 : 1,
                        pointerEvents: isPlaceholderImage(activeImageUrl) ? 'none' : 'auto',
                      }}
                    >
                      <Save size={16} />
                      <span>Salvar</span>
                    </button>
                  </div>
                )}

                {/* Features annotation style controls */}
                {featuresMode && productFeatures.length > 0 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      right: 60,
                      top: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: '12px 14px',
                      background: 'rgba(30,30,30,0.92)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 10,
                      zIndex: 30,
                      minWidth: 160,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      Estilo de anotação
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['technical', 'editorial'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setFeatureAnnotStyle(s)}
                          style={{
                            flex: 1,
                            height: 30,
                            borderRadius: 6,
                            border: 'none',
                            background:
                              featureAnnotStyle === s
                                ? 'rgba(255,255,255,0.15)'
                                : 'rgba(255,255,255,0.05)',
                            color: featureAnnotStyle === s ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {s === 'technical' ? '⊢ Technical' : '↝ Editorial'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setFeaturesMode(false)
                        setProductFeatures([])
                      }}
                      style={{
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Remover anotações
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {null}

          {imageHasEmbeddedText && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: '#999',
                padding: '4px 10px',
                borderRadius: 999,
                background: '#F0F0F0',
                marginTop: -4,
                alignSelf: 'center',
              }}
            >
              <ImageIcon size={11} />
              Texto gerado na imagem
            </div>
          )}

          {/* Action buttons */}
          {false && !isPlaceholderImage(activeImageUrl) && (
            <div className="canvas-actions-bar">
              <button className="canvas-action-btn" onClick={handleDownload}>
                <Download size={14} />
                <span>Download{selectedChannel === 'site-banner' ? ' PNG' : ''}</span>
              </button>
              <button className="canvas-action-btn" onClick={handleSave}>
                <Save size={14} />
                <span>Salvar</span>
              </button>
              {selectedChannel === 'site-banner' && (
                <button className="canvas-action-btn canvas-action-html" onClick={handleExportHTML}>
                  <Code size={14} />
                  <span>Publicar no site</span>
                </button>
              )}
              <button
                className={`canvas-action-btn ${scannerOpen ? 'active' : ''}`}
                onClick={() => {
                  setScannerOpen((v) => !v)
                  if (!scanResult && !isScanning) handleScan()
                }}
              >
                <ScanLine size={14} />
                <span>Scan</span>
              </button>
            </div>
          )}

          {false && !isPlaceholderImage(activeImageUrl) && (
            <div
              style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '12px 0 4px' }}
            >
              <button
                onClick={() => setPublishOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1.5px solid #E2E2E2',
                  background: '#FFF',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#444',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <Share2 size={14} /> Publicar
              </button>
            </div>
          )}
        </div>

        {/* Text Box Generation Panel */}
        {genPanelOpen && genPanelBoxId && (
          <div
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50, width: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span className="float-window-title" style={{ margin: 0 }}>
                Gerar texto
              </span>
              <button
                onClick={() => {
                  setGenPanelOpen(false)
                  setGenPanelBoxId(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <textarea
              className="ig-textarea"
              value={genPanelText}
              onChange={(e) => setGenPanelText(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Texto do box..."
              style={{ marginBottom: 10 }}
            />
            <div className="ig-field">
              <span className="ig-label">Estilo</span>
              <div className="ftg-tone-grid">
                {[
                  { id: 'emotional', emoji: '♡', label: 'Emocional' },
                  { id: 'urgent', emoji: '⚡', label: 'Urgente' },
                  { id: 'playful', emoji: '◡', label: 'Divertido' },
                  { id: 'elegant', emoji: '✦', label: 'Elegante' },
                  { id: 'direct', emoji: '→', label: 'Direto' },
                  { id: 'promotional', emoji: '%', label: 'Promoção' },
                  { id: 'scarcity', emoji: '⏱', label: 'Escassez' },
                  { id: 'surprise', emoji: '✦', label: 'Surpreenda-me' },
                ].map((t) => (
                  <button
                    key={t.id}
                    className="ftg-tone-btn"
                    disabled={isGeneratingTextBox === genPanelBoxId}
                    onClick={async () => {
                      setIsGeneratingTextBox(genPanelBoxId)
                      try {
                        const productName =
                          activeProduct?.name?.trim() || activeProductName?.trim() || ''
                        const styleName = selectedImageStyle?.name?.trim() || ''

                        // Converter imagem do canvas para base64 para análise visual
                        let imageBase64: string | null = null
                        if (activeImageUrl && !isPlaceholderImage(activeImageUrl)) {
                          try {
                            imageBase64 = await imageUrlToBase64(activeImageUrl)
                          } catch {}
                        }

                        // Prompt baseado na imagem — sem mencionar campanha para não contaminar
                        const contextLines = [
                          `Você é um redator de e-commerce especialista em copy para redes sociais.`,
                          imageBase64
                            ? `Analise a imagem fornecida e crie uma frase que descreva ou valorize exatamente o que está sendo mostrado nela.`
                            : `Crie uma frase curta para um post de e-commerce.`,
                          productName ? `Produto em foco: ${productName}.` : '',
                          styleName ? `Visual da imagem: estilo ${styleName}.` : '',
                          `Tom desejado: ${t.label}.`,
                          genPanelText
                            ? `Melhore ou substitua o texto atual: "${genPanelText}".`
                            : '',
                          `Máximo 10 palavras. Responda APENAS com o texto final, sem aspas, sem explicações.`,
                        ]
                          .filter(Boolean)
                          .join('\n')

                        // Usar gemini-generate com visão quando há imagem, generate-copy caso contrário
                        if (imageBase64) {
                          const { data: fnData, error: fnError } = await supabase.functions.invoke(
                            'gemini-generate',
                            {
                              body: {
                                prompt: contextLines,
                                model: 'gemini-3-flash-preview',
                                images: [imageBase64],
                                responseType: 'text',
                              },
                            }
                          )
                          if (!fnError) {
                            const raw = fnData?.text ?? ''
                            if (raw) setGenPanelText(raw.replace(/^["']|["']$/g, '').trim())
                          }
                        } else {
                          const { data: fnData, error: fnError } = await supabase.functions.invoke(
                            'generate-copy',
                            {
                              body: {
                                action: 'freetext',
                                prompt: contextLines,
                                brandContext: brandContextBody,
                              },
                            }
                          )
                          if (!fnError && fnData?.text) {
                            setGenPanelText(fnData.text.trim())
                          }
                        }
                      } catch (err) {
                        console.error(err)
                      } finally {
                        setIsGeneratingTextBox(null)
                      }
                    }}
                  >
                    {isGeneratingTextBox === genPanelBoxId ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <>
                        {t.emoji} {t.label}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="ig-generate-btn"
              style={{ marginTop: 10, width: '100%' }}
              onClick={() => {
                if (genPanelBoxId) {
                  updateBox(genPanelBoxId, { text: genPanelText })
                }
                setGenPanelOpen(false)
                setGenPanelBoxId(null)
              }}
            >
              Aplicar
            </button>
          </div>
        )}
        {imageGeneratorOpen && (
          <div
            ref={imageGenRef}
            className="image-gen-wrapper"
            style={{ position: 'absolute', top: 24, left: 24 }}
          >
            {/* Main panel */}
            <div className={`image-gen-main ${activeSubPanel ? 'has-subpanel' : ''}`}>
              {/* Header — drag handle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  cursor: 'grab',
                  userSelect: 'none',
                }}
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return
                  const wrapper = imageGenRef.current
                  if (!wrapper) return
                  const rect = wrapper.getBoundingClientRect()
                  const startX = e.clientX
                  const startY = e.clientY
                  const origX = rect.left
                  const origY = rect.top
                  wrapper.style.position = 'fixed'
                  wrapper.style.left = `${origX}px`
                  wrapper.style.top = `${origY}px`
                  wrapper.style.right = 'auto'
                  wrapper.style.bottom = 'auto'
                  const onMove = (me: MouseEvent) => {
                    const newX = Math.max(
                      0,
                      Math.min(window.innerWidth - wrapper.offsetWidth, origX + me.clientX - startX)
                    )
                    const newY = Math.max(
                      0,
                      Math.min(
                        window.innerHeight - wrapper.offsetHeight,
                        origY + me.clientY - startY
                      )
                    )
                    wrapper.style.left = `${newX}px`
                    wrapper.style.top = `${newY}px`
                  }
                  const onUp = () => {
                    document.removeEventListener('mousemove', onMove)
                    document.removeEventListener('mouseup', onUp)
                  }
                  document.addEventListener('mousemove', onMove)
                  document.addEventListener('mouseup', onUp)
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: '#FFF', pointerEvents: 'none' }}
                >
                  Imagem
                </span>
                <button
                  onClick={() => {
                    setImageGeneratorOpen(false)
                    setActiveSubPanel(null)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Prompt */}
              <div className="ig-field">
                <span className="ig-label">Prompt da imagem</span>
                <textarea
                  className="ig-textarea"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Descreva a cena, ambiente ou direção criativa..."
                  rows={4}
                  autoFocus
                />
                {selectedImageStyle && (
                  <p
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.3)',
                      margin: '4px 0 0',
                      lineHeight: 1.4,
                    }}
                  >
                    Estilo{' '}
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {selectedImageStyle.name}
                    </span>{' '}
                    aplicado automaticamente
                  </p>
                )}
              </div>

              {/* Model */}
              <ImageGenItem
                label="Modelo"
                value={currentModel.name}
                active={activeSubPanel === 'model'}
                onClick={() => toggleSubPanel('model')}
              />

              {/* Style */}
              <ImageGenItem
                label="Estilo"
                value={selectedImageStyle?.name ?? 'Nenhum'}
                thumbUrl={
                  selectedImageStyle?.thumbnailUrl ||
                  STYLE_META[selectedImageStyle?.id ?? '']?.thumb
                }
                active={activeSubPanel === 'style'}
                onClick={() => toggleSubPanel('style')}
              />

              {/* Reference */}
              <div style={{ position: 'relative' }}>
                <ImageGenItem
                  label="Referência"
                  value={
                    activeProduct
                      ? activeProduct.name +
                        (referenceImages.length > 0 ? ` + ${referenceImages.length} ref` : '')
                      : referenceImages.length > 0
                        ? `${referenceImages.length} imagem${referenceImages.length > 1 ? 'ns' : ''}`
                        : 'Adicionar referência visual'
                  }
                  thumbUrl={activeProduct?.image || referenceImages[0]?.dataUrl}
                  active={activeSubPanel === 'reference'}
                  onClick={() => toggleSubPanel('reference')}
                />
                {referenceImages.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setReferenceImages([])
                    }}
                    title="Remover referências"
                    style={{
                      position: 'absolute',
                      right: 36,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.12)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.6)',
                      transition: 'background 0.1s',
                      zIndex: 2,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')
                    }
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Generate button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => {
                    setActiveSubPanel(null)
                    handleGenerateImage()
                  }}
                  disabled={isGeneratingAsset || isChatExecuting || !imagePrompt.trim()}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 10,
                    border: 'none',
                    background:
                      isGeneratingAsset || isChatExecuting ? 'rgba(255,255,255,0.15)' : '#FFFFFF',
                    color:
                      isGeneratingAsset || isChatExecuting ? 'rgba(255,255,255,0.5)' : '#1A1A1A',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: isGeneratingAsset || isChatExecuting ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {isGeneratingAsset || isChatExecuting ? (
                    <>
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'rgba(255,255,255,0.8)',
                          borderRadius: '50%',
                          animation: 'spin 0.75s linear infinite',
                        }}
                      />{' '}
                      {chatExecutingLabel || 'Gerando...'}
                    </>
                  ) : (
                    <>✦ Gerar imagem</>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-panel */}
            {activeSubPanel && (
              <div className="image-gen-subpanel">
                {activeSubPanel === 'model' && (
                  <div className="ig-subpanel-content">
                    <p className="ig-subpanel-title">Modelo</p>
                    <div className="ig-subpanel-list">
                      {IMAGE_MODELS.map((m) => (
                        <button
                          key={m.id}
                          className={`ig-subpanel-item ${selectedModel === m.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedModel(m.id)
                            setActiveSubPanel(null)
                          }}
                        >
                          <div className="ig-subpanel-item-info">
                            <span className="ig-subpanel-item-name">{m.name}</span>
                            <span className="ig-subpanel-item-desc">{m.description}</span>
                          </div>
                          <div className="ig-subpanel-item-right">
                            {m.badge && <span className="ig-badge">{m.badge}</span>}
                            <span className="ig-subpanel-item-time">{m.time}</span>
                            {selectedModel === m.id && (
                              <Check size={13} style={{ color: '#FFF', marginLeft: 4 }} />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSubPanel === 'style' && (
                  <div
                    className="ig-subpanel-content"
                    style={{ padding: '16px 14px', overflowY: 'auto' }}
                  >
                    <p className="ig-subpanel-title" style={{ marginBottom: 14 }}>
                      Estilo da geração
                    </p>

                    {selectedImageStyle ? (
                      /* ── COLLAPSED: selected item + actions ── */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.25)',
                            background: 'rgba(255,255,255,0.08)',
                          }}
                        >
                          <div
                            style={{
                              width: 64,
                              height: 48,
                              borderRadius: 7,
                              flexShrink: 0,
                              overflow: 'hidden',
                              background: selectedImageStyle.color ?? '#333',
                            }}
                          >
                            {selectedImageStyle.thumbnailUrl ||
                            STYLE_META[selectedImageStyle.id]?.thumb ? (
                              <img
                                src={
                                  selectedImageStyle.thumbnailUrl ||
                                  STYLE_META[selectedImageStyle.id]?.thumb
                                }
                                alt={selectedImageStyle.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: 'rgba(255,255,255,0.4)',
                                }}
                              >
                                {selectedImageStyle.name
                                  .split(' ')
                                  .map((w: string) => w[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: '#FFFFFF',
                                margin: '0 0 3px',
                                lineHeight: 1.3,
                              }}
                            >
                              {selectedImageStyle.name}
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.4)',
                                margin: 0,
                                lineHeight: 1.45,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {STYLE_META[selectedImageStyle.id]?.description ??
                                selectedImageStyle.category ??
                                ''}
                            </p>
                          </div>
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Check size={10} style={{ color: '#1A1A1A' }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setSelectedImageStyle(null)}
                            style={{
                              flex: 1,
                              height: 32,
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.12)',
                              background: 'rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.7)',
                              fontSize: 11,
                              fontWeight: 400,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                            }}
                          >
                            <RefreshCw size={11} />
                            Trocar estilo
                          </button>
                          <button
                            onClick={() => {
                              setSelectedImageStyle(null)
                              setActiveSubPanel(null)
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.08)',
                              background: 'rgba(255,255,255,0.03)',
                              color: 'rgba(255,255,255,0.35)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.12s',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
                              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
                              e.currentTarget.style.color = '#EF4444'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                              e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
                            }}
                            title="Remover estilo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── EXPANDED: full style list ── */
                      <>
                        {styleCategories.map((category) => (
                          <div key={category.id} style={{ marginBottom: 20 }}>
                            <p
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: '0.07em',
                                color: 'rgba(255,255,255,0.3)',
                                textTransform: 'uppercase',
                                margin: '0 0 8px',
                                padding: '0 2px',
                              }}
                            >
                              {category.label}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {category.styles.map((styleId) => {
                                const style = imageStyles.find((s) => s.id === styleId)
                                if (!style) return null
                                const meta = STYLE_META[style.id]
                                const thumbUrl = style.thumbnailUrl || meta?.thumb
                                const description = meta?.description ?? style.category ?? ''
                                return (
                                  <button
                                    key={style.id}
                                    onClick={() => setSelectedImageStyle(style)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 12,
                                      padding: '10px 10px',
                                      borderRadius: 10,
                                      border: '1px solid rgba(255,255,255,0.07)',
                                      background: 'rgba(255,255,255,0.03)',
                                      cursor: 'pointer',
                                      fontFamily: 'inherit',
                                      textAlign: 'left' as const,
                                      transition: 'all 0.12s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 64,
                                        height: 48,
                                        borderRadius: 7,
                                        flexShrink: 0,
                                        overflow: 'hidden',
                                        background: style.color ?? '#333',
                                      }}
                                    >
                                      {thumbUrl ? (
                                        <img
                                          src={thumbUrl}
                                          alt={style.name}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                          }}
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: 'rgba(255,255,255,0.4)',
                                          }}
                                        >
                                          {style.name
                                            .split(' ')
                                            .map((w: string) => w[0])
                                            .join('')
                                            .slice(0, 2)
                                            .toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 500,
                                          color: 'rgba(255,255,255,0.85)',
                                          margin: '0 0 3px',
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        {style.name}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: 11,
                                          color: 'rgba(255,255,255,0.4)',
                                          margin: 0,
                                          lineHeight: 1.45,
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical' as const,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {description}
                                      </p>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {activeSubPanel === 'reference' && (
                  <div
                    className="ig-subpanel-content"
                    style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}
                  >
                    {/* ── Produto ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.35)',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.06em',
                          margin: 0,
                        }}
                      >
                        Produto
                      </p>

                      {selectedProducts.length > 0 &&
                      allProducts.find((p) => selectedProducts.includes(p.id)) ? (
                        (() => {
                          const p = allProducts.find((p) => selectedProducts.includes(p.id))!
                          return (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.04)',
                              }}
                            >
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 7,
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: 12,
                                  fontWeight: 400,
                                  color: 'rgba(255,255,255,0.8)',
                                }}
                              >
                                {p.name}
                              </span>
                              <button
                                onClick={() => setSelectedProducts([])}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  border: 'none',
                                  flexShrink: 0,
                                  background: 'rgba(255,255,255,0.06)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'rgba(255,255,255,0.4)',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                                  e.currentTarget.style.color = '#EF4444'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                                }}
                              >
                                <X size={11} />
                              </button>
                            </div>
                          )
                        })()
                      ) : (
                        <button
                          onClick={() => {
                            setProductSelectorOpen(true)
                            setProductSearch('')
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '11px 14px',
                            borderRadius: 10,
                            width: '100%',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'inherit',
                            textAlign: 'left' as const,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 7,
                              flexShrink: 0,
                              background: 'rgba(255,255,255,0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Package size={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 }}>
                            Selecione um produto
                          </span>
                          <ChevronRight
                            size={13}
                            style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}
                          />
                        </button>
                      )}
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

                    {/* ── Referências visuais ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.35)',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.06em',
                            margin: 0,
                          }}
                        >
                          Referências visuais{' '}
                          {referenceImages.length > 0 && `(${referenceImages.length}/5)`}
                        </p>
                        {referenceImages.length > 0 && (
                          <button
                            onClick={() => setReferenceImages([])}
                            style={{
                              fontSize: 10,
                              color: 'rgba(255,255,255,0.3)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              padding: 0,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')
                            }
                          >
                            Limpar tudo
                          </button>
                        )}
                      </div>

                      {/* Thumbnails + add slot */}
                      {referenceImages.length > 0 && (
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const }}>
                          {referenceImages.map((img) => (
                            <div key={img.id} style={{ position: 'relative' }}>
                              <img
                                src={img.dataUrl}
                                alt=""
                                style={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: 8,
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                              <button
                                onClick={() => removeReferenceImage(img.id)}
                                style={{
                                  position: 'absolute',
                                  top: -5,
                                  right: -5,
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  background: '#EF4444',
                                  border: '2px solid #1A1A1A',
                                  cursor: 'pointer',
                                  color: 'white',
                                  fontSize: 9,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {referenceImages.length < 5 && (
                            <button
                              onClick={() => refFileInput.current?.click()}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 8,
                                border: '1.5px dashed rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.03)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.3)',
                                flexShrink: 0,
                                transition: 'all 0.12s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
                                e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                                e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
                              }}
                            >
                              <span style={{ fontSize: 22, lineHeight: 1, marginTop: -2 }}>+</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Drop zone — only when empty */}
                      {referenceImages.length === 0 && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                            const files = Array.from(e.dataTransfer.files)
                              .filter((f) => f.type.startsWith('image/'))
                              .slice(0, 5)
                            if (!files.length) return
                            files.forEach((file, i) => {
                              const reader = new FileReader()
                              reader.onload = (ev) => {
                                const url = ev.target?.result as string
                                setReferenceImages((prev) =>
                                  [
                                    ...prev,
                                    {
                                      id: `ref-${Date.now()}-${i}`,
                                      dataUrl: url,
                                      base64: url.split(',')[1],
                                      mimeType: file.type || 'image/jpeg',
                                    },
                                  ].slice(-5)
                                )
                              }
                              reader.readAsDataURL(file)
                            })
                          }}
                          onClick={() => refFileInput.current?.click()}
                          style={{
                            border: '1.5px dashed rgba(255,255,255,0.1)',
                            borderRadius: 10,
                            padding: '20px 16px',
                            textAlign: 'center' as const,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            background: 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <ImageIcon size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
                          <div>
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 400,
                                color: 'rgba(255,255,255,0.55)',
                                margin: '0 0 2px',
                              }}
                            >
                              Arraste ou clique para fazer upload
                            </p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                              JPG, PNG — até 5 imagens
                            </p>
                          </div>
                        </div>
                      )}

                      <input
                        ref={refFileInput}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []).slice(
                            0,
                            5 - referenceImages.length
                          )
                          if (!files.length) return
                          files.forEach((file, i) => {
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string
                              setReferenceImages((prev) =>
                                [
                                  ...prev,
                                  {
                                    id: `ref-${Date.now()}-${i}`,
                                    dataUrl,
                                    base64: dataUrl.split(',')[1],
                                    mimeType: file.type || 'image/jpeg',
                                  },
                                ].slice(-5)
                              )
                            }
                            reader.readAsDataURL(file)
                          })
                          e.target.value = ''
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Float Window — Selecionar Produto */}
        {productSelectorOpen && (
          <div
            ref={fw_product.ref}
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50, width: 280 }}
          >
            <FloatWindowHeader
              title="Selecionar produto"
              onClose={closeProduct}
              onDragStart={fw_product.startDrag}
            />
            <div className="float-search-wrapper" style={{ marginBottom: 8, padding: '0 10px' }}>
              <Search size={13} className="float-search-icon" />
              <input
                className="float-search-input"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="float-product-list">
              {allProducts
                .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map((p) => {
                  const isActive = selectedProducts.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      className={`float-product-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedProducts([p.id])
                        setProductSelectorOpen(false)
                        setProductSearch('')
                      }}
                    >
                      <div className="float-product-thumb">
                        <img src={p.image} alt={p.name} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="float-product-name">{p.name}</span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.3)',
                            marginTop: 1,
                          }}
                        >
                          {p.sku}
                        </span>
                      </div>
                      {isActive && (
                        <span
                          style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              {allProducts.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .length === 0 && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.3)',
                    padding: '12px 10px',
                    margin: 0,
                  }}
                >
                  Nenhum produto encontrado.
                </p>
              )}
            </div>

            {/* Footer — upload manual */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.07)',
                padding: '10px 10px 4px',
              }}
            >
              <button
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = () => {
                    const file = input.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string
                      setReferenceImages((prev) =>
                        [
                          ...prev,
                          {
                            id: `ref-${Date.now()}`,
                            dataUrl,
                            base64: dataUrl.split(',')[1],
                            mimeType: file.type || 'image/jpeg',
                          },
                        ].slice(-5)
                      )
                      setProductSelectorOpen(false)
                      setProductSearch('')
                      toast.success('Imagem do produto carregada.')
                    }
                    reader.readAsDataURL(file)
                  }
                  input.click()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  textAlign: 'left' as const,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={12} style={{ color: 'rgba(255,255,255,0.45)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                    Upload de imagem
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    Produto ainda não publicado na loja
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Float Window — Overlay Editor */}
        {overlayEditorOpen && (
          <div
            ref={fw_overlay.ref}
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50 }}
          >
            <FloatWindowHeader
              title="Overlay"
              onClose={closeOverlay}
              onDragStart={fw_overlay.startDrag}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`float-toggle-btn ${overlayType === 'gradient' ? 'active' : ''}`}
                onClick={() => setOverlayType('gradient')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: `1px solid ${overlayType === 'gradient' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                  background: overlayType === 'gradient' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  fontSize: 11,
                  fontWeight: 500,
                  color: overlayType === 'gradient' ? '#FFF' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Gradiente
              </button>
              <button
                className={`float-toggle-btn ${overlayType === 'solid' ? 'active' : ''}`}
                onClick={() => setOverlayType('solid')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: `1px solid ${overlayType === 'solid' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                  background: overlayType === 'solid' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  fontSize: 11,
                  fontWeight: 500,
                  color: overlayType === 'solid' ? '#FFF' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Square size={13} /> Sólido
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Intensidade
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(overlayOpacity * 100)}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value) / 100)}
                  style={{ flex: 1, accentColor: '#FFFFFF', cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.5)',
                    minWidth: 32,
                    textAlign: 'right' as const,
                  }}
                >
                  {Math.round(overlayOpacity * 100)}%
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Cor
              </label>
              <input
                type="color"
                value={overlayColor}
                onChange={(e) => setOverlayColor(e.target.value)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  background: 'none',
                  padding: 0,
                }}
              />
            </div>
            {overlayType === 'gradient' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Posição
                </label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(
                    [
                      { id: 'bottom', label: 'Base' },
                      { id: 'top', label: 'Topo' },
                      { id: 'full', label: 'Total' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setOverlayPosition(p.id)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: `1px solid ${overlayPosition === p.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                        background:
                          overlayPosition === p.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                        fontSize: 11,
                        fontWeight: 500,
                        color: overlayPosition === p.id ? '#FFF' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Float Window — Posição da imagem */}
        {activeSidebarPanel === 'imagefit' && (
          <div
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50, width: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span className="float-window-title" style={{ margin: 0 }}>
                Posição da imagem
              </span>
              <button
                onClick={() => {
                  setActiveSidebarPanel(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {(['cover', 'contain'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setImageFit(mode)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 6,
                    border: `1px solid ${imageFit === mode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    background: imageFit === mode ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: imageFit === mode ? '#FFF' : 'rgba(255,255,255,0.5)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {mode === 'cover' ? 'Preencher' : 'Encaixar'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Escala
                </label>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{imageScale}%</span>
              </div>
              <input
                type="range"
                min={80}
                max={300}
                step={1}
                value={imageScale}
                onChange={(e) => setImageScale(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#FFFFFF' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>80%</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>300%</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Posição horizontal
                </label>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {imagePosition.x}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={imagePosition.x}
                onChange={(e) => setImagePosition((p) => ({ ...p, x: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#FFFFFF' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Posição vertical
                </label>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {imagePosition.y}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={imagePosition.y}
                onChange={(e) => setImagePosition((p) => ({ ...p, y: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#FFFFFF' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => {
                  setImageFit('cover')
                  setImageScale(100)
                  setImagePosition({ x: 50, y: 50 })
                }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Resetar
              </button>
              <button
                onClick={() => {
                  saveToHistory()
                  setActiveSidebarPanel(null)
                  toast.success('Posição salva!')
                }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Aplicar
              </button>
            </div>
            <button
              onClick={handleExpandBackground}
              disabled={!activeImageUrl || isExpandingBackground}
              style={{
                width: '100%',
                padding: '8px 0',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                background: isExpandingBackground
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.05)',
                color: !activeImageUrl ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                fontSize: 11,
                fontWeight: 500,
                cursor: !activeImageUrl ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              {isExpandingBackground ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <span style={{ fontSize: 13 }}>⤢</span>
              )}
              Expandir fundo com IA
            </button>
          </div>
        )}

        {typographyOpen && (
          <div
            ref={fw_typo.ref}
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50 }}
          >
            <FloatWindowHeader
              title="Tipografia"
              onClose={closeTypo}
              onDragStart={fw_typo.startDrag}
            />

            {/* Fonte */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Fonte
              </label>
              <FontCategorySelector
                selectedFontId={selectedFont}
                onSelect={(font) => {
                  setSelectedFont(font.id)
                  setFreeTextBoxes((prev) =>
                    prev.map((b) => (b.id === 'main-text' ? { ...b, fontFamily: font.family } : b))
                  )
                }}
              />
            </div>

            {/* Alinhamento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Alinhamento
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="float-align-group">
                  {(['left', 'center', 'right'] as const).map((h) => (
                    <button
                      key={h}
                      className={`float-align-btn ${textHAlign === h ? 'active' : ''}`}
                      onClick={() => setTextHAlign(h)}
                    >
                      {h === 'left' ? (
                        <AlignLeft size={13} />
                      ) : h === 'center' ? (
                        <AlignCenter size={13} />
                      ) : (
                        <AlignRight size={13} />
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
                <div className="float-align-group">
                  {(['top', 'center', 'bottom'] as const).map((v) => (
                    <button
                      key={v}
                      className={`float-align-btn ${textVAlign === v ? 'active' : ''}`}
                      onClick={() => setTextVAlign(v)}
                    >
                      {v === 'top' ? (
                        <AlignStartVertical size={13} />
                      ) : v === 'center' ? (
                        <AlignCenterVertical size={13} />
                      ) : (
                        <AlignEndVertical size={13} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Cor
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Texto</span>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      background: 'none',
                      padding: 0,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>CTA</span>
                  <input
                    type="color"
                    value={ctaColor}
                    onChange={(e) => {
                      setCtaColor(e.target.value)
                      setCtaTextColor(
                        e.target.value === '#FFFFFF' || e.target.value === '#D4A064'
                          ? '#1A1A1A'
                          : '#FFFFFF'
                      )
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      background: 'none',
                      padding: 0,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Elementos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Elementos
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Heading */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <button
                        onClick={() => setHeadingVisible((v) => !v)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: headingVisible
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(255,255,255,0.25)',
                          transition: 'color 0.2s',
                        }}
                      >
                        {headingVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <span
                        style={{
                          fontSize: 12,
                          color: headingVisible
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(255,255,255,0.35)',
                          fontWeight: 500,
                        }}
                      >
                        Heading
                      </span>
                    </label>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: 32,
                        textAlign: 'right' as const,
                      }}
                    >
                      {headingSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={72}
                    step={1}
                    value={headingSize}
                    onChange={(e) => setHeadingSize(Number(e.target.value))}
                    disabled={!headingVisible}
                    style={{
                      width: '100%',
                      accentColor: '#FFFFFF',
                      opacity: headingVisible ? 1 : 0.25,
                      cursor: headingVisible ? 'pointer' : 'not-allowed',
                    }}
                  />
                </div>

                {/* Descrição */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <button
                        onClick={() => setDescriptionVisible((v) => !v)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: descriptionVisible
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(255,255,255,0.25)',
                          transition: 'color 0.2s',
                        }}
                      >
                        {descriptionVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <span
                        style={{
                          fontSize: 12,
                          color: descriptionVisible
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(255,255,255,0.35)',
                          fontWeight: 500,
                        }}
                      >
                        Descrição
                      </span>
                    </label>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: 32,
                        textAlign: 'right' as const,
                      }}
                    >
                      {descriptionSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={32}
                    step={1}
                    value={descriptionSize}
                    onChange={(e) => setDescriptionSize(Number(e.target.value))}
                    disabled={!descriptionVisible}
                    style={{
                      width: '100%',
                      accentColor: '#FFFFFF',
                      opacity: descriptionVisible ? 1 : 0.25,
                      cursor: descriptionVisible ? 'pointer' : 'not-allowed',
                    }}
                  />
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <button
                        onClick={() => setCtaVisible((v) => !v)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: ctaVisible ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                          transition: 'color 0.2s',
                        }}
                      >
                        {ctaVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <span
                        style={{
                          fontSize: 12,
                          color: ctaVisible ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
                          fontWeight: 500,
                        }}
                      >
                        CTA
                      </span>
                    </label>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: 32,
                        textAlign: 'right' as const,
                      }}
                    >
                      {ctaSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={28}
                    step={1}
                    value={ctaSize}
                    onChange={(e) => setCtaSize(Number(e.target.value))}
                    disabled={!ctaVisible}
                    style={{
                      width: '100%',
                      accentColor: '#FFFFFF',
                      opacity: ctaVisible ? 1 : 0.25,
                      cursor: ctaVisible ? 'pointer' : 'not-allowed',
                    }}
                  />
                </div>

                {/* Price toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <button
                        onClick={() => setPriceVisible((v) => !v)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: priceVisible ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                          transition: 'color 0.2s',
                        }}
                      >
                        {priceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <span
                        style={{
                          fontSize: 12,
                          color: priceVisible ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
                          fontWeight: 500,
                        }}
                      >
                        Preço
                      </span>
                    </label>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: 32,
                        textAlign: 'right' as const,
                      }}
                    >
                      {priceSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={48}
                    step={1}
                    value={priceSize}
                    onChange={(e) => setPriceSize(Number(e.target.value))}
                    disabled={!priceVisible}
                    style={{
                      width: '100%',
                      accentColor: '#FFFFFF',
                      opacity: priceVisible ? 1 : 0.25,
                      cursor: priceVisible ? 'pointer' : 'not-allowed',
                    }}
                  />
                  {priceVisible && (
                    <input
                      type="text"
                      value={priceText}
                      onChange={(e) => setPriceText(e.target.value)}
                      placeholder="R$ 189,90"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: '#1A1A1A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                  )}
                </div>

                {/* Text background contrast */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: 12,
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Contraste do texto
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(
                      [
                        { id: 'none', label: 'Nenhum', previewStyle: {} as React.CSSProperties },
                        {
                          id: 'solid',
                          label: 'Box',
                          previewStyle: {
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: 2,
                            padding: '2px 4px',
                          } as React.CSSProperties,
                        },
                        {
                          id: 'pill',
                          label: 'Pill',
                          previewStyle: {
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: 999,
                            padding: '2px 8px',
                          } as React.CSSProperties,
                        },
                        {
                          id: 'blur',
                          label: 'Blur',
                          previewStyle: {
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: 4,
                            padding: '2px 4px',
                          } as React.CSSProperties,
                        },
                        {
                          id: 'shadow',
                          label: 'Sombra',
                          previewStyle: {
                            textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)',
                          } as React.CSSProperties,
                        },
                      ] as { id: string; label: string; previewStyle: React.CSSProperties }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setTextBgStyle(opt.id as any)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          padding: '8px 6px',
                          flex: 1,
                          borderRadius: 8,
                          border: `1.5px solid ${textBgStyle === opt.id ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                          background: '#1A1A1A',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          fontSize: 10,
                          color: textBgStyle === opt.id ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            lineHeight: 1,
                            ...opt.previewStyle,
                          }}
                        >
                          Aa
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {textBgStyle !== 'none' && textBgStyle !== 'shadow' && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Cor</span>
                        <input
                          type="color"
                          value={textBgColor}
                          onChange={(e) => setTextBgColor(e.target.value)}
                          style={{
                            width: 24,
                            height: 24,
                            border: '1.5px solid rgba(255,255,255,0.15)',
                            borderRadius: 6,
                            background: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                            Opacidade
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.4)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {Math.round(textBgOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={Math.round(textBgOpacity * 100)}
                          onChange={(e) => setTextBgOpacity(Number(e.target.value) / 100)}
                          style={{ width: '100%', accentColor: '#FFFFFF' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Float Window — Estilo */}
        {styleSelectorOpen && (
          <div
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50, width: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span className="float-window-title" style={{ margin: 0 }}>
                Estilo da campanha
              </span>
              <button
                onClick={() => {
                  setStyleSelectorOpen(false)
                  setActiveSidebarPanel(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Category filters */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'photo', label: 'Photo' },
                { id: 'illustration', label: 'Illustration' },
                { id: '3d', label: '3D' },
                { id: 'design', label: 'Design' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStyleFilter(f.id)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    border: `1px solid ${styleFilter === f.id ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    background: styleFilter === f.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: styleFilter === f.id ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    fontFamily: 'inherit',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                maxHeight: 380,
                overflowY: 'auto',
              }}
            >
              {ART_STYLES.filter((s) => styleFilter === 'all' || s.category === styleFilter).map(
                (style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      applyArtStyle(style)
                      setStyleSelectorOpen(false)
                      setActiveSidebarPanel(null)
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                      border: `1.5px solid ${selectedStyleId === style.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10,
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 6,
                      transition: 'all 0.12s',
                      textAlign: 'left' as const,
                      fontFamily: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 6,
                        fontSize: 18,
                        background: style.thumbnailUrl
                          ? `url(${style.thumbnailUrl}) center/cover`
                          : style.preview,
                      }}
                    >
                      {style.isBrandDna && <span>✦</span>}
                      <span
                        style={{
                          fontFamily: getFontFamily(style.font),
                          textTransform: style.textCase as any,
                          fontWeight: style.fontWeight,
                          color: style.textColor,
                        }}
                      >
                        Aa
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF' }}>
                      {style.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                      {style.description}
                    </span>
                  </button>
                )
              )}
            </div>

            {/* Divider + custom style */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
            <button
              onClick={() => {
                setStyleSelectorOpen(false)
                setActiveSidebarPanel(null)
                window.open('/settings/styles', '_blank')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'color 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            >
              <Plus size={12} /> Gerenciar estilos
            </button>
          </div>
        )}

        {/* Float Window — Formato */}
        {channelSelectorOpen && (
          <div
            ref={fw_channel.ref}
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50 }}
          >
            <FloatWindowHeader
              title="Formato"
              onClose={closeChannel}
              onDragStart={fw_channel.startDrag}
            />
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  handleChannelChange(r.id)
                  setChannelSelectorOpen(false)
                  setActiveSidebarPanel(null)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedChannel === r.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AspectRatioIcon ratio={r.id} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>{r.label}</span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {r.sublabel} · {r.width}×{r.height}
                </span>
              </button>
            ))}
            {currentChannelSupportsCarousel && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={() => (isCarouselMode ? disableCarousel() : enableCarousel())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: isCarouselMode ? 'rgba(255,255,255,0.12)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <LayoutGrid
                      size={14}
                      style={{
                        color: isCarouselMode ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        textAlign: 'left' as const,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>
                        Carrossel
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {isCarouselMode
                          ? `${generatedCarouselSlides.length} slide${generatedCarouselSlides.length !== 1 ? 's' : ''} gerado${generatedCarouselSlides.length !== 1 ? 's' : ''}`
                          : 'até 10 slides'}
                      </span>
                    </div>
                    {isCarouselMode && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#4CAF7D',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                  {isCarouselMode && (
                    <button
                      onClick={() => {
                        setCarouselSetupOpen(true)
                        setChannelSelectorOpen(false)
                        setActiveSidebarPanel(null)
                      }}
                      style={{
                        width: '100%',
                        padding: 8,
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                      }}
                    >
                      {generatedCarouselSlides.length === 0
                        ? '✦ Gerar carrossel'
                        : '↻ Regenerar carrossel'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Float Window — Atributos */}
        {attributesOpen && (
          <div
            ref={fw_attrs.ref}
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50 }}
          >
            <FloatWindowHeader
              title="Atributos"
              onClose={closeAttrs}
              onDragStart={fw_attrs.startDrag}
            />

            {/* Toggle visibilidade */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
              }}
            >
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                Mostrar no criativo
              </span>
              <button
                onClick={() => setShowAttributes((prev) => !prev)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: showAttributes ? '#4CAF7D' : 'rgba(255,255,255,0.15)',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: showAttributes ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>

            {showAttributes && (
              <>
                {/* Posição */}
                <div style={{ marginTop: 8 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.06em',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Posição
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setAttributePosition('left')}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor:
                          attributePosition === 'left'
                            ? 'rgba(255,255,255,0.3)'
                            : 'rgba(255,255,255,0.08)',
                        background:
                          attributePosition === 'left' ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ← Esquerda
                    </button>
                    <button
                      onClick={() => setAttributePosition('right')}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor:
                          attributePosition === 'right'
                            ? 'rgba(255,255,255,0.3)'
                            : 'rgba(255,255,255,0.08)',
                        background:
                          attributePosition === 'right' ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Direita →
                    </button>
                  </div>
                </div>

                {/* Lista de atributos */}
                <div style={{ marginTop: 10 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.06em',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Itens
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {attributes.map((attr, i) => (
                      <div key={attr.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          value={attr.icon}
                          onChange={(e) => updateAttribute(i, 'icon', e.target.value)}
                          placeholder="◈"
                          maxLength={4}
                          style={{
                            width: 36,
                            textAlign: 'center' as const,
                            padding: '6px 4px',
                            fontSize: 15,
                            background: '#1A1A1A',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 6,
                            color: '#FFFFFF',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                        <input
                          value={attr.label}
                          onChange={(e) => updateAttribute(i, 'label', e.target.value)}
                          placeholder="Proteção UV400"
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            fontSize: 12,
                            background: '#1A1A1A',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 6,
                            color: '#FFFFFF',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                        <button
                          onClick={() => removeAttribute(i)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.3)',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button
                    onClick={addAttribute}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'transparent',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    + Adicionar
                  </button>
                  <button
                    onClick={() => handleGenerateAttributes()}
                    disabled={isGeneratingAttributes}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: 'none',
                      background: '#FFFFFF',
                      color: '#000000',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isGeneratingAttributes ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      opacity: isGeneratingAttributes ? 0.6 : 1,
                    }}
                  >
                    {isGeneratingAttributes ? 'Gerando...' : '✦ Gerar com IA'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Float Window — Vídeo */}
        {videoOpen && (
          <div
            ref={fw_video.ref}
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50, width: 320 }}
          >
            <FloatWindowHeader
              title="Vídeo"
              onClose={closeVideo}
              onDragStart={fw_video.startDrag}
            />
            <div
              style={{
                display: 'flex',
                gap: 4,
                marginBottom: 12,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 3,
              }}
            >
              <button
                onClick={() => setVideoMode('animate')}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  border: 'none',
                  background: videoMode === 'animate' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: videoMode === 'animate' ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                ▶ Animar
              </button>
              <button
                onClick={() => setVideoMode('ai')}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  border: 'none',
                  background: videoMode === 'ai' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: videoMode === 'ai' ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                ✦ Gerar com IA
              </button>
            </div>

            {videoMode === 'animate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 8,
                      display: 'block',
                    }}
                  >
                    Animação
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {VIDEO_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedVideoPreset(p.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 3,
                          padding: '10px 6px',
                          borderRadius: 8,
                          border: `1px solid ${selectedVideoPreset === p.id ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                          background:
                            selectedVideoPreset === p.id ? 'rgba(255,255,255,0.06)' : '#1A1A1A',
                          cursor: 'pointer',
                          transition: 'all 0.12s',
                          textAlign: 'center',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{p.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF' }}>
                          {p.label}
                        </span>
                        <span
                          style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}
                        >
                          {p.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Duração
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {videoDuration}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#FFFFFF' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>3s (Reels)</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>30s</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleVideoPreview}
                    disabled={!selectedVideoPreset || videoPreviewPlaying}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'transparent',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor:
                        selectedVideoPreset && !videoPreviewPlaying ? 'pointer' : 'not-allowed',
                      opacity: selectedVideoPreset && !videoPreviewPlaying ? 1 : 0.4,
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {videoPreviewPlaying ? 'Reproduzindo...' : '▶ Preview'}
                  </button>
                  <button
                    onClick={handleExportVideo}
                    disabled={!selectedVideoPreset || videoExporting}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      border: 'none',
                      background:
                        selectedVideoPreset && !videoExporting
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.1)',
                      color:
                        selectedVideoPreset && !videoExporting
                          ? '#1A1A1A'
                          : 'rgba(255,255,255,0.3)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: selectedVideoPreset && !videoExporting ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {videoExporting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Exportando...
                      </>
                    ) : (
                      '↓ Exportar'
                    )}
                  </button>
                </div>
              </div>
            )}

            {videoMode === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Frame base preview */}
                {activeImageUrl && !isPlaceholderImage(activeImageUrl) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Frame base
                    </span>
                    <div
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <img
                        src={activeImageUrl}
                        alt="Frame base"
                        style={{
                          width: '100%',
                          display: 'block',
                          objectFit: 'cover',
                          maxHeight: 120,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                      O vídeo será gerado a partir desta imagem
                    </span>
                  </div>
                )}

                {/* Seletor de modelo */}
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 6,
                      display: 'block',
                    }}
                  >
                    Modelo
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {AI_VIDEO_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedVideoModel(m.id)
                          if (aiVideoDuration > m.maxDuration) setAiVideoDuration(m.maxDuration)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: `1px solid ${selectedVideoModel === m.id ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          background:
                            selectedVideoModel === m.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.12s',
                          textAlign: 'left' as const,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{m.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>
                              {m.name}
                            </span>
                            {m.badge && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  background:
                                    m.badge === 'novo'
                                      ? 'rgba(34,197,94,0.2)'
                                      : 'rgba(168,85,247,0.2)',
                                  color: m.badge === 'novo' ? '#22C55E' : '#A855F7',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                            {m.desc} · até {m.maxDuration}s
                          </span>
                        </div>
                        {selectedVideoModel === m.id && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#FFFFFF',
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motion Presets */}
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      marginBottom: 8,
                      display: 'block',
                    }}
                  >
                    Estilo de motion
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                    {AI_VIDEO_PRESETS.map((preset) => {
                      const isActive = videoPrompt === preset.buildPrompt(activeProduct?.name ?? '')
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            const prompt = preset.buildPrompt(activeProduct?.name?.trim() || '')
                            setVideoPrompt(prompt)
                            setUseAiVideoPrompt(false)
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column' as const,
                            alignItems: 'center',
                            gap: 3,
                            padding: '9px 4px',
                            borderRadius: 8,
                            border: `1px solid ${isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            background: isActive
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            transition: 'all 0.12s',
                            textAlign: 'center' as const,
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{preset.icon}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#FFFFFF',
                              lineHeight: 1.2,
                            }}
                          >
                            {preset.label}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: 'rgba(255,255,255,0.35)',
                              lineHeight: 1.2,
                            }}
                          >
                            {preset.desc}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 6,
                      display: 'block',
                    }}
                  >
                    Prompt de vídeo
                  </span>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Descreva o movimento, a cena e o mood do vídeo..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#1A1A1A',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.5,
                    }}
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      onClick={() => {
                        setUseAiVideoPrompt(!useAiVideoPrompt)
                        if (!useAiVideoPrompt) setVideoPrompt(buildAutoVideoPrompt())
                      }}
                      style={{
                        width: 32,
                        height: 18,
                        borderRadius: 999,
                        cursor: 'pointer',
                        background: useAiVideoPrompt ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: useAiVideoPrompt ? '#1A1A1A' : 'rgba(255,255,255,0.4)',
                          position: 'absolute',
                          top: 2,
                          left: useAiVideoPrompt ? 16 : 2,
                          transition: 'all 0.2s',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      AI prompt automático
                    </span>
                  </label>
                </div>
                <div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Duração
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {aiVideoDuration}s
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[5, 10]
                      .filter(
                        (d) =>
                          d <=
                          (AI_VIDEO_MODELS.find((m) => m.id === selectedVideoModel)?.maxDuration ??
                            10)
                      )
                      .map((d) => (
                        <button
                          key={d}
                          onClick={() => setAiVideoDuration(d)}
                          style={{
                            flex: 1,
                            height: 30,
                            borderRadius: 6,
                            border: 'none',
                            background:
                              aiVideoDuration === d
                                ? 'rgba(255,255,255,0.15)'
                                : 'rgba(255,255,255,0.05)',
                            color: aiVideoDuration === d ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}
                        >
                          {d}s
                        </button>
                      ))}
                  </div>
                </div>
                <button
                  onClick={handleGenerateAIVideo}
                  disabled={isGeneratingVideo || !videoPrompt.trim()}
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    border: 'none',
                    background:
                      !isGeneratingVideo && videoPrompt.trim()
                        ? '#FFFFFF'
                        : 'rgba(255,255,255,0.1)',
                    color:
                      !isGeneratingVideo && videoPrompt.trim()
                        ? '#1A1A1A'
                        : 'rgba(255,255,255,0.3)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !isGeneratingVideo && videoPrompt.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />{' '}
                      {videoGeneratingLabel || 'Gerando...'}
                    </>
                  ) : (
                    `✦ Gerar com ${AI_VIDEO_MODELS.find((m) => m.id === selectedVideoModel)?.name ?? 'IA'}`
                  )}
                </button>
                {videoError && (
                  <p style={{ fontSize: 11, color: '#EF4444', margin: 0 }}>{videoError}</p>
                )}
                {/* Video result moved to canvas overlay */}
              </div>
            )}
          </div>
        )}

        {/* Float Window — Widgets */}
        {widgetsOpen && (
          <div
            ref={fw_widgets.ref}
            className="float-window"
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 50, width: 240 }}
          >
            <FloatWindowHeader
              title="Widgets"
              onClose={closeWidgets}
              onDragStart={fw_widgets.startDrag}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Product card */}
              <button
                onClick={() => {
                  handleAddProductCard()
                  setWidgetsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>
                    Card de produto
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                    Foto + nome do produto clicável
                  </span>
                </div>
              </button>

              {/* Review card */}
              <button
                onClick={() => {
                  handleAddReviewCard()
                  setWidgetsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Star size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>
                    Review de cliente
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                    Texto, nome e rating com estrelas
                  </span>
                </div>
              </button>

              {/* Countdown */}
              <button
                onClick={() => {
                  handleAddCountdownWidget()
                  setWidgetsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Timer size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF' }}>Countdown</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                    Contador regressivo de oferta
                  </span>
                </div>
              </button>

              {/* Price + CTA */}
              <button
                onClick={() => {
                  handleAddPriceWidget()
                  setWidgetsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Tag size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF' }}>
                    Preco + CTA
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                    Preco com desconto e botao
                  </span>
                </div>
              </button>

              {/* Social proof */}
              <button
                onClick={() => {
                  handleAddSocialProofWidget()
                  setWidgetsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF' }}>
                    Prova social
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                    Contador de vendas ao vivo
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {historyOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 300,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'dropIn 0.2s ease',
            }}
            onClick={() => setHistoryOpen(false)}
          >
            <div
              style={{
                width: 'calc(100vw - 80px)',
                maxWidth: 1100,
                height: 'calc(100vh - 80px)',
                maxHeight: 860,
                background: '#FFFFFF',
                borderRadius: 20,
                boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 28px',
                  borderBottom: '1px solid #F0F0F0',
                  flexShrink: 0,
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  Histórico
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Tabs */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      background: '#F5F5F5',
                      borderRadius: 8,
                      padding: 3,
                    }}
                  >
                    <button
                      onClick={() => setHistoryTab('saved')}
                      style={{
                        height: 30,
                        padding: '0 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: historyTab === 'saved' ? '#FFFFFF' : 'transparent',
                        fontSize: 13,
                        fontWeight: 500,
                        color: historyTab === 'saved' ? '#1A1A1A' : '#888',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                        boxShadow: historyTab === 'saved' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      Salvos
                    </button>
                    <button
                      onClick={() => setHistoryTab('auto')}
                      style={{
                        height: 30,
                        padding: '0 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: historyTab === 'auto' ? '#FFFFFF' : 'transparent',
                        fontSize: 13,
                        fontWeight: 500,
                        color: historyTab === 'auto' ? '#1A1A1A' : '#888',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                        boxShadow: historyTab === 'auto' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Auto
                      {autoGeneratedPosts.length > 0 && (
                        <span
                          style={{
                            background: '#1A1A1A',
                            color: 'white',
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 999,
                            lineHeight: 1.4,
                          }}
                        >
                          {autoGeneratedPosts.length}
                        </span>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => setHistoryOpen(false)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1px solid #E2E2E2',
                      background: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#888',
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 24 }}>
                {/* Saved tab */}
                {historyTab === 'saved' &&
                  (assetHistory.length === 0 ? (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        color: '#CCC',
                      }}
                    >
                      <Clock size={36} />
                      <p style={{ fontSize: 13, margin: 0, color: '#AAA' }}>
                        Nenhum criativo salvo ainda.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {(() => {
                        const groups: { title: string; items: typeof assetHistory }[] = []
                        for (const item of assetHistory) {
                          const title = item.sessionTitle || 'Sem título'
                          const existing = groups.find((g) => g.title === title)
                          if (existing) existing.items.push(item)
                          else groups.push({ title, items: [item] })
                        }
                        return groups.map((group, gi) => (
                          <div
                            key={gi}
                            style={{
                              background: '#FAFAFA',
                              borderRadius: 14,
                              border: '1px solid #EFEFEF',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #EFEFEF',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: '#1A1A1A',
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: '#1A1A1A',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {group.title}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: '#AAA',
                                  flexShrink: 0,
                                  marginLeft: 'auto',
                                }}
                              >
                                {group.items.length} {group.items.length === 1 ? 'asset' : 'assets'}
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: 12,
                                padding: 12,
                                alignContent: 'start',
                              }}
                            >
                              {group.items.map((item) => (
                                <div
                                  key={item.id}
                                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                >
                                  <div
                                    style={{
                                      position: 'relative',
                                      aspectRatio: '1/1',
                                      borderRadius: 10,
                                      overflow: 'hidden',
                                      background: '#F2F2F2',
                                      cursor: 'pointer',
                                    }}
                                    className="history-thumb-item"
                                    onClick={() => restoreFromHistory(item)}
                                  >
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.heading}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#CCC',
                                          fontSize: 24,
                                        }}
                                      >
                                        ▣
                                      </div>
                                    )}
                                    {item.isCarousel && item.slides && (
                                      <span
                                        style={{
                                          position: 'absolute',
                                          bottom: 6,
                                          left: 6,
                                          background: 'rgba(0,0,0,0.6)',
                                          color: 'white',
                                          fontSize: 10,
                                          fontWeight: 600,
                                          padding: '2px 7px',
                                          borderRadius: 6,
                                        }}
                                      >
                                        {item.slides.length} slides
                                      </span>
                                    )}
                                    <div
                                      className="history-overlay"
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        opacity: 0,
                                        transition: 'opacity 0.15s',
                                      }}
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          restoreFromHistory(item)
                                        }}
                                        style={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: '50%',
                                          background: 'rgba(255,255,255,0.9)',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: '#1A1A1A',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <RotateCcw size={13} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          downloadHistoryItem(item)
                                        }}
                                        style={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: '50%',
                                          background: 'rgba(255,255,255,0.9)',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: '#1A1A1A',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <Download size={13} />
                                      </button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <p
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 500,
                                        color: '#1A1A1A',
                                        margin: 0,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {item.heading || '(sem texto)'}
                                    </p>
                                    <div
                                      style={{ display: 'flex', justifyContent: 'space-between' }}
                                    >
                                      <span style={{ fontSize: 10, color: '#999' }}>
                                        {channelLabel(item.channel)}
                                      </span>
                                      <span style={{ fontSize: 10, color: '#BBB' }}>
                                        {formatRelativeTime(item.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  ))}

                {/* Auto tab */}
                {historyTab === 'auto' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {autoGenRunning && (
                      <div style={{ padding: '12px 0' }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                          Gerando posts... {autoGenProgress}%
                        </div>
                        <div
                          style={{
                            height: 3,
                            background: '#F0F0F0',
                            borderRadius: 999,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background: '#1A1A1A',
                              borderRadius: 999,
                              transition: 'width 0.3s ease',
                              width: `${autoGenProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {autoGeneratedPosts.length === 0 ? (
                      <div
                        style={{
                          height: 300,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          color: '#CCC',
                        }}
                      >
                        <Zap size={36} />
                        <p style={{ fontSize: 13, margin: 0, color: '#AAA' }}>
                          Nenhum post gerado ainda.
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: 16,
                          alignContent: 'start',
                        }}
                      >
                        {autoGeneratedPosts.map((post) => (
                          <div
                            key={post.id}
                            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                          >
                            <div
                              style={{
                                position: 'relative',
                                aspectRatio: '1/1',
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: '#F2F2F2',
                              }}
                              className="history-thumb-item"
                            >
                              {post.status === 'generating' || post.status === 'pending' ? (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    background: '#F2F2F2',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                      border: '2px solid #E8E8E8',
                                      borderTopColor: '#1A1A1A',
                                      animation: 'spin 0.8s linear infinite',
                                    }}
                                  />
                                  <span style={{ fontSize: 11, color: '#999' }}>
                                    {post.status === 'generating' ? 'Gerando...' : 'Na fila'}
                                  </span>
                                </div>
                              ) : post.status === 'error' ? (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    background: '#FEF2F2',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    padding: 12,
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: 11,
                                      color: '#DC2626',
                                      textAlign: 'center',
                                      margin: 0,
                                    }}
                                  >
                                    {post.errorMsg ?? 'Erro'}
                                  </p>
                                  <button
                                    onClick={() => retryAutoPost(post.id)}
                                    style={{
                                      fontSize: 11,
                                      color: '#DC2626',
                                      background: 'none',
                                      border: '1px solid #FECACA',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      fontFamily: 'inherit',
                                      padding: '3px 10px',
                                    }}
                                  >
                                    Tentar de novo
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <img
                                    src={post.imageUrl}
                                    alt={post.heading}
                                    onClick={() => loadAutoPost(post)}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <div
                                    className="history-overlay"
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      background: 'rgba(0,0,0,0.4)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 8,
                                      opacity: 0,
                                      transition: 'opacity 0.15s',
                                    }}
                                  >
                                    <button
                                      onClick={() => loadAutoPost(post)}
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.9)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#1A1A1A',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!post.imageUrl) return
                                        const l = document.createElement('a')
                                        l.download = `${post.theme}-${post.productName}.png`
                                        l.href = post.imageUrl
                                        l.click()
                                      }}
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.9)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#1A1A1A',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Download size={13} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <p
                                style={{
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: '#1A1A1A',
                                  margin: 0,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {post.productName}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: '#999' }}>{post.channel}</span>
                                <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>
                                  R$ 189
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {carouselSetupOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
          }}
          onClick={() => setCarouselSetupOpen(false)}
        >
          <div
            style={{
              width: 400,
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              animation: 'popIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                Criar carrossel
              </h3>
              <button
                onClick={() => setCarouselSetupOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Auto option */}
            <button
              onClick={() => setSlideCountMode('auto')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                border: `1.5px solid ${slideCountMode === 'auto' ? '#1A1A1A' : '#E8E8E8'}`,
                background: slideCountMode === 'auto' ? '#FFFFFF' : '#FAFAFA',
                cursor: 'pointer',
                textAlign: 'left' as const,
                position: 'relative',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, color: '#555', marginTop: 1 }}>✦</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Automático</span>
                <span style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>
                  O app cria o número ideal de slides para contar a história da campanha — hook,
                  benefícios, prova social e CTA.
                </span>
              </div>
              {slideCountMode === 'auto' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  ✓
                </span>
              )}
            </button>

            {/* Manual option */}
            <button
              onClick={() => setSlideCountMode('manual')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                border: `1.5px solid ${slideCountMode === 'manual' ? '#1A1A1A' : '#E8E8E8'}`,
                background: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left' as const,
                position: 'relative',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                  Definir quantidade
                </span>
                <span style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>
                  Escolha quantos slides quer gerar.
                </span>
              </div>
              {slideCountMode === 'manual' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  ✓
                </span>
              )}
            </button>

            {/* Count selector — only in manual */}
            {slideCountMode === 'manual' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 0' }}>
                {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSlideCount(n)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      border: `1.5px solid ${slideCount === n ? '#1A1A1A' : '#E2E2E2'}`,
                      background: slideCount === n ? '#1A1A1A' : '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      color: slideCount === n ? '#FFFFFF' : '#555',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleGenerateCarousel}
              disabled={isGeneratingCarousel}
              style={{
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: '#1A1A1A',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: isGeneratingCarousel ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                marginTop: 4,
                transition: 'opacity 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: isGeneratingCarousel ? 0.7 : 1,
              }}
            >
              {isGeneratingCarousel ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Gerando slides...
                </>
              ) : (
                `✦ Gerar ${slideCountMode === 'auto' ? 'carrossel automático' : `${slideCount} slides`}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Slide Image Editor Drawer */}
      {slideImageEditorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSlideImageEditorOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxHeight: '80vh',
              overflowY: 'auto',
              animation: 'popIn 0.2s ease',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  Imagem · Slide {activeSlide + 1}
                </h4>
                <p
                  style={{
                    fontSize: 11,
                    color: '#999',
                    margin: '2px 0 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {generatedCarouselSlides[activeSlide]?.role === 'hook'
                    ? 'Hook'
                    : generatedCarouselSlides[activeSlide]?.role === 'benefit'
                      ? 'Benefício'
                      : generatedCarouselSlides[activeSlide]?.role === 'proof'
                        ? 'Prova social'
                        : generatedCarouselSlides[activeSlide]?.role === 'cta'
                          ? 'CTA'
                          : 'Slide'}
                </p>
              </div>
              <button
                onClick={() => setSlideImageEditorOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Product selector */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Produto</label>
              <button
                onClick={() => setSlideProductSelectorOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: '#FFFFFF',
                  border: '1.5px solid #E2E2E2',
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1A1A1A')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E2E2')}
              >
                <img
                  src={
                    generatedCarouselSlides[activeSlide]?.image &&
                    generatedCarouselSlides[activeSlide]?.image !== 'error'
                      ? generatedCarouselSlides[activeSlide].image!
                      : (activeImageUrl ?? '')
                  }
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', flex: 1 }}>
                  {generatedCarouselSlides[activeSlide]?.product || activeProduct?.name || ''}
                </span>
                <ChevronRightSmall size={16} style={{ color: '#999' }} />
              </button>
            </section>

            {/* Generate image */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Gerar imagem</label>
              <div
                style={{
                  border: '1.5px solid #E2E2E2',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#FFFFFF',
                }}
              >
                <textarea
                  placeholder="Descreva a imagem deste slide..."
                  value={slideImagePrompt}
                  onChange={(e) => {
                    setSlideImagePrompt(e.target.value)
                    setUseSlideAiPrompt(false)
                  }}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: 'none',
                    fontSize: 13,
                    color: '#1A1A1A',
                    resize: 'none',
                    lineHeight: 1.5,
                    background: 'transparent',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Model selector */}
                <div style={{ padding: '8px 12px', borderTop: '1px solid #F0F0F0' }}>
                  <button
                    onClick={() => setSlideModelSelectorOpen((v) => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>
                      {currentSlideModel.name}
                    </span>
                    {currentSlideModel.badge && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#2E7D52',
                          background: '#F0FAF4',
                          border: '1px solid #A8D5A2',
                          borderRadius: 999,
                          padding: '2px 7px',
                        }}
                      >
                        {currentSlideModel.badge}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
                      {currentSlideModel.time}
                    </span>
                    <ChevronDown
                      size={12}
                      style={{
                        color: '#999',
                        transition: 'transform 0.2s',
                        transform: slideModelSelectorOpen ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  </button>
                </div>

                {slideModelSelectorOpen && (
                  <div style={{ animation: 'dropIn 0.15s ease' }}>
                    {IMAGE_MODELS.map((model, idx) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedSlideModel(model.id)
                          setSlideModelSelectorOpen(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          borderBottom:
                            idx < IMAGE_MODELS.length - 1 ? '1px solid #F5F5F5' : 'none',
                          fontFamily: 'inherit',
                          background: selectedSlideModel === model.id ? '#F7F7F7' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left' as const,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            selectedSlideModel === model.id ? '#F7F7F7' : '#FFFFFF')
                        }
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                            {model.name}
                          </span>
                          <span style={{ fontSize: 11, color: '#999' }}>{model.description}</span>
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        >
                          {model.badge && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#2E7D52',
                                background: '#F0FAF4',
                                border: '1px solid #A8D5A2',
                                borderRadius: 999,
                                padding: '2px 7px',
                              }}
                            >
                              {model.badge}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: '#999' }}>{model.time}</span>
                          {selectedSlideModel === model.id && (
                            <Check size={13} style={{ color: '#1A1A1A' }} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* AI prompt toggle */}
                <label style={{ ...toggleRowStyle, borderTop: '1px solid #F0F0F0' }}>
                  <span
                    style={{ flex: 1, fontSize: 12, color: '#555', userSelect: 'none' as const }}
                  >
                    AI prompt
                  </span>
                  <input
                    type="checkbox"
                    checked={useSlideAiPrompt}
                    onChange={(e) => {
                      setUseSlideAiPrompt(e.target.checked)
                      if (e.target.checked && generatedCarouselSlides[activeSlide]) {
                        setSlideImagePrompt(
                          (generatedCarouselSlides[activeSlide] as any)?.imagePrompt ||
                            `${activeProductName}, high quality commercial photography`
                        )
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <span style={toggleTrackStyle(useSlideAiPrompt)}>
                    <span style={toggleThumbStyle(useSlideAiPrompt)} />
                  </span>
                </label>
              </div>

              <Button
                className="mt-1 w-full rounded-lg"
                variant="outline"
                onClick={handleGenerateSlideImage}
                disabled={isGeneratingSlideImage || !slideImagePrompt.trim()}
              >
                {isGeneratingSlideImage ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span style={{ fontSize: 12, color: '#888' }}>
                      Gerando com {currentSlideModel.name}...
                    </span>
                  </span>
                ) : (
                  '✦ Gerar imagem para este slide'
                )}
              </Button>
            </section>

            {/* Product selector sub-drawer */}
            {slideProductSelectorOpen && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#FFFFFF',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'slideInLeft 0.2s ease',
                  borderRadius: '16px 16px 0 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid #EBEBEB',
                  }}
                >
                  <h3
                    style={{ flex: 1, fontSize: 15, fontWeight: 600, margin: 0, color: '#1A1A1A' }}
                  >
                    Selecionar produto
                  </h3>
                  <button
                    onClick={() => setSlideProductSelectorOpen(false)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: '1px solid #E2E2E2',
                      background: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#999',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {allProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyProductToSlide(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        border: '1.5px solid #EBEBEB',
                        borderRadius: 10,
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left' as const,
                        fontFamily: 'inherit',
                        width: '100%',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1A1A1A')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#EBEBEB')}
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#1A1A1A',
                          }}
                        >
                          {p.name}
                        </span>
                        <span
                          style={{ display: 'block', fontSize: 11, color: '#999', marginTop: 2 }}
                        >
                          {p.sku}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-16px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        .version-use-label { opacity: 0 !important; transition: opacity 0.15s; }
        button:hover > .version-use-label { opacity: 1 !important; }

        /* Selectable text — Figma style */
        .selectable-text {
          cursor: default;
          position: relative;
          border-radius: 2px;
          transition: outline 0.1s ease;
        }
        .selectable-text:hover:not(.element-selected):not(.element-editing) {
          outline: 1.5px dashed rgba(255,255,255,0.35);
          outline-offset: 3px;
        }

        /* Selected — solid blue Figma outline */
        .element-selected {
          outline: 2px solid #18A0FB !important;
          outline-offset: 3px;
        }
        .element-selected::before,
        .element-selected::after {
          content: "";
          position: absolute;
          width: 7px; height: 7px;
          background: #FFFFFF;
          border: 1.5px solid #18A0FB;
          border-radius: 1px;
          z-index: 10;
        }
        .element-selected::before { top: -5px; left: -5px; }
        .element-selected::after  { bottom: -5px; right: -5px; }

        /* Editing — dashed blue outline */
        .element-editing {
          outline: 1.5px dashed #18A0FB !important;
          outline-offset: 3px;
          caret-color: #18A0FB;
          cursor: text;
          background: rgba(0,0,0,0.1);
          padding: 2px 6px;
          min-width: 40px;
        }
        .element-editing:focus {
          outline: 1.5px dashed #18A0FB !important;
        }

        /* Selection toolbar */
        .selection-toolbar {
          display: flex;
          align-items: center;
          gap: 2px;
          background: #2C2C2C;
          border-radius: 6px;
          padding: 4px 5px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.25);
          white-space: nowrap;
          animation: toolbarIn 0.1s ease;
        }
        @keyframes toolbarIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .stb-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 8px; border-radius: 4px;
          border: none; background: transparent;
          font-size: 11px; font-weight: 500; color: #DDDDDD;
          cursor: pointer; transition: background 0.1s;
          font-family: inherit;
        }
        .stb-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
        .stb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .stb-generate { color: #FFFFFF; }
        .stb-hint { color: #999; }
        .stb-creative {
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
          border: 1px solid rgba(255,255,255,0.2) !important;
          color: rgba(255,255,255,0.95) !important;
          position: relative;
          overflow: hidden;
        }
        .stb-creative::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: translateX(-100%);
          transition: transform 0.4s ease;
        }
        .stb-creative:hover::before {
          transform: translateX(100%);
        }
        .stb-creative:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .stb-btn + .stb-btn { border-left: 1px solid rgba(255,255,255,0.08); }

        /* Save sparkle animation */
        .save-animating { animation: saveIconPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes saveIconPop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 70% { transform: scale(0.92); } 100% { transform: scale(1); } }
        .save-sparkles { position: absolute; inset: 0; pointer-events: none; }
        .sparkle-particle { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #F5C842; top: 50%; left: 50%; opacity: 0; animation: sparkleFly 0.7s ease-out forwards; }
        .sparkle-0 { animation-delay: 0ms;  --dx: -14px; --dy: -16px; }
        .sparkle-1 { animation-delay: 30ms; --dx: 16px;  --dy: -12px; }
        .sparkle-2 { animation-delay: 60ms; --dx: 18px;  --dy: 8px; }
        .sparkle-3 { animation-delay: 20ms; --dx: -8px;  --dy: 18px; }
        .sparkle-4 { animation-delay: 50ms; --dx: -18px; --dy: 6px; }
        .sparkle-5 { animation-delay: 10ms; --dx: 6px;   --dy: -20px; width: 3px; height: 3px; background: #FFFFFF; }
        @keyframes sparkleFly { 0% { transform: translate(-50%,-50%) scale(0); opacity: 1; } 60% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1); opacity: 0; } }

        /* Save toast */
        .save-toast-bar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 999px; background: rgba(20,20,20,0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: #FFF; font-size: 12px; font-weight: 500; letter-spacing: 0.01em; white-space: nowrap; pointer-events: none; z-index: 30; animation: toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards, toastOut 0.3s ease-in 1.9s forwards; }
        .save-toast-check { font-size: 13px; color: #4ADE80; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.95); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } to { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.97); } }
        @keyframes pillsFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes regenFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

         .stb-tone-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: #2C2C2C;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          z-index: 30;
          min-width: 140px;
          animation: dropIn 0.12s ease;
        }
        .stb-tone-option {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 12px;
          border: none; background: transparent;
          font-size: 12px; color: #DDD; cursor: pointer;
          transition: background 0.1s; text-align: left;
          font-family: inherit;
        }
        .stb-tone-option:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .stb-tone-option:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .stb-tone-icon { font-size: 13px; width: 16px; text-align: center; }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes textCursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes shimmerText {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .textbox-loading-label {
          font-size: inherit;
          font-family: inherit;
          font-weight: 400;
          color: transparent;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.15) 0%,
            rgba(255,255,255,0.55) 40%,
            rgba(255,255,255,0.15) 80%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmerText 1.4s linear infinite;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
        }
        .textbox-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: rgba(255,255,255,0.7);
          margin-left: 3px;
          vertical-align: text-bottom;
          border-radius: 1px;
          animation: textCursor 0.9s ease-in-out infinite;
        }
        @keyframes softPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.4); opacity: 0.2; } }
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .history-thumb-item:hover .history-overlay { opacity: 1 !important; }
        .history-thumb-item .history-overlay button:hover { background: #FFFFFF !important; }

        @keyframes loadingBar {
          0%   { width: 0%; margin-left: 0; }
          50%  { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes loadingShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* HTML Export Modal */}
      {htmlExportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setHtmlExportModalOpen(false)}
        >
          <div
            style={{
              width: 520,
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                Banner pronto para publicar
              </h3>
              <button
                onClick={() => setHtmlExportModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  padding: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                background: '#F5F5F5',
                borderRadius: 8,
                padding: 16,
                fontSize: 11,
                color: '#555',
                overflow: 'hidden',
                maxHeight: 140,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {generatedHTML.slice(0, 400)}...
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button className="w-full" onClick={handleDownloadHTML}>
                <Download size={14} /> Baixar banner.html
              </Button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedHTML)
                  toast.success('Código copiado!')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 36,
                  borderRadius: 8,
                  border: '1.5px solid #E2E2E2',
                  background: '#FFF',
                  fontSize: 13,
                  color: '#555',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <Copy size={14} /> Copiar código
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              Cole o código no HTML da sua loja. Troque{' '}
              <code
                style={{
                  background: '#F0F0F0',
                  padding: '1px 5px',
                  borderRadius: 3,
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}
              >
                {'href="#"'}
              </code>{' '}
              pela URL do produto.
            </p>
          </div>
        </div>
      )}

      {/* Auto Generate Modal */}
      {autoGenerateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
          }}
          onClick={() => setAutoGenerateOpen(false)}
        >
          <div
            style={{
              width: 640,
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 28,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
              animation: 'popIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  Auto Generate
                </h2>
                <p style={{ fontSize: 13, color: '#888', marginTop: 3, marginBottom: 0 }}>
                  Gere posts para todos os canais com um clique
                </p>
              </div>
              <button
                onClick={() => setAutoGenerateOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Step 1 — Theme */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#1A1A1A',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  1
                </span>
                Tema da campanha
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #E2E2E2',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#1A1A1A',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder="Ex: Black Friday, Lançamento, Liquidação, Volta às aulas..."
                value={autoTheme}
                onChange={(e) => setAutoTheme(e.target.value)}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Black Friday', 'Dia das Mães', 'Lançamento', 'Liquidação', 'Promoção'].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setAutoTheme(t)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: `1.5px solid ${autoTheme === t ? '#1A1A1A' : '#E2E2E2'}`,
                        background: autoTheme === t ? '#1A1A1A' : '#FFF',
                        fontSize: 11,
                        fontWeight: 500,
                        color: autoTheme === t ? '#FFF' : '#555',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Step 2 — Products */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#1A1A1A',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </span>
                  Produtos
                </label>
                <button
                  onClick={() =>
                    setSelectedAutoProducts(
                      selectedAutoProducts.length === allProducts.length
                        ? []
                        : allProducts.map((p) => p.id)
                    )
                  }
                  style={{
                    fontSize: 12,
                    color: '#888',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {selectedAutoProducts.length === allProducts.length
                    ? 'Desselecionar todos'
                    : 'Selecionar todos'}
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {allProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleAutoProduct(p.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      border: `1.5px solid ${selectedAutoProducts.includes(p.id) ? '#1A1A1A' : '#EBEBEB'}`,
                      borderRadius: 10,
                      padding: 8,
                      background: '#FFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '1/1',
                        borderRadius: 6,
                        overflow: 'hidden',
                        background: '#F2F2F2',
                      }}
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {selectedAutoProducts.includes(p.id) && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 18,
                            fontWeight: 600,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#1A1A1A',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 — Formats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#1A1A1A',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  3
                </span>
                Formatos
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'instagram-feed', label: 'Feed', dim: '1080×1080' },
                  { id: 'instagram-stories', label: 'Stories', dim: '1080×1920' },
                  { id: 'whatsapp', label: 'WhatsApp', dim: '800×800' },
                  { id: 'site-banner', label: 'Banner', dim: '1200×628' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleAutoFormat(f.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: `1.5px solid ${selectedAutoFormats.includes(f.id) ? '#1A1A1A' : '#E2E2E2'}`,
                      background: selectedAutoFormats.includes(f.id) ? '#FAFAFA' : '#FFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>
                      {f.label}
                    </span>
                    <span style={{ fontSize: 10, color: '#AAA' }}>{f.dim}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4 — Style */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#1A1A1A',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  4
                </span>
                Estilo visual
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ART_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setAutoStyle(s.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: `1.5px solid ${autoStyle === s.id ? '#1A1A1A' : '#E2E2E2'}`,
                      background: autoStyle === s.id ? '#1A1A1A' : '#FFF',
                      fontSize: 11,
                      fontWeight: 500,
                      color: autoStyle === s.id ? '#FFF' : '#555',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 5 — Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#1A1A1A',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  5
                </span>
                Instruções extras
                <span style={{ fontSize: 11, fontWeight: 400, color: '#AAA' }}>opcional</span>
              </label>
              <textarea
                value={autoInstructions}
                onChange={(e) => setAutoInstructions(e.target.value)}
                placeholder="Ex: usar cores vibrantes, destacar desconto de 30%, tom divertido..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #E2E2E2',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#1A1A1A',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#1A1A1A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E2E2E2')}
              />
            </div>

            {/* Step 6 — Post count */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#1A1A1A',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  6
                </span>
                Quantidade de posts
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['all', 2, 4, 6, 8, 10] as const).map((n) => (
                  <button
                    key={String(n)}
                    onClick={() => setAutoPostCount(n)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 999,
                      border: `1.5px solid ${autoPostCount === n ? '#1A1A1A' : '#E2E2E2'}`,
                      background: autoPostCount === n ? '#1A1A1A' : '#FFF',
                      fontSize: 11,
                      fontWeight: 500,
                      color: autoPostCount === n ? '#FFF' : '#555',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {n === 'all' ? 'Todos' : n}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: '#555',
                textAlign: 'center',
                padding: 10,
                background: '#F7F7F7',
                borderRadius: 8,
              }}
            >
              {selectedAutoProducts.length} produto{selectedAutoProducts.length !== 1 ? 's' : ''} ×{' '}
              {selectedAutoFormats.length} formato{selectedAutoFormats.length !== 1 ? 's' : ''} ={' '}
              <strong>{selectedAutoProducts.length * selectedAutoFormats.length} posts</strong>
            </div>

            {/* Generate button */}
            <button
              onClick={handleAutoGenerate}
              disabled={
                !autoTheme.trim() ||
                selectedAutoProducts.length === 0 ||
                selectedAutoFormats.length === 0
              }
              style={{
                width: '100%',
                height: 48,
                background: '#1A1A1A',
                color: '#FFF',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.15s',
                fontFamily: 'inherit',
                opacity:
                  !autoTheme.trim() ||
                  selectedAutoProducts.length === 0 ||
                  selectedAutoFormats.length === 0
                    ? 0.35
                    : 1,
              }}
            >
              <Zap size={15} />
              Gerar {selectedAutoProducts.length * selectedAutoFormats.length} posts automaticamente
            </button>
          </div>
        </div>
      )}

      {/* ═══ PUBLISH MODAL ═══ */}
      {publishOpen && (
        <PublishModal
          imageUrl={activeImageUrl ?? ''}
          product={activeProduct?.name ?? data.product}
          campaign={activeCampaign?.title ?? ''}
          onClose={() => setPublishOpen(false)}
          onSchedule={({ platform, legenda }) => {
            setPublishOpen(false)
            setCurrentPlatform(platform)
            setCurrentLegenda(legenda)
            setScheduleOpen(true)
          }}
        />
      )}

      {/* ═══ SCHEDULE MODAL ═══ */}
      {scheduleOpen && (
        <ScheduleModal
          imageUrl={activeImageUrl ?? ''}
          legenda={currentLegenda}
          onClose={() => setScheduleOpen(false)}
          onScheduled={(post) => {
            addScheduledPost(post)
            setScheduleOpen(false)
            toast.success('Post agendado!')
            pushActivity(
              'post_scheduled',
              'Agendado ✓',
              `Publicação marcada pra ${post.date} às ${post.time}. Que tal criar o próximo post enquanto isso?`,
              [
                { id: 'new', label: 'criar próximo', action: 'new_asset' },
                { id: 'calendar', label: 'Ver calendário', action: 'open_calendar' },
              ]
            )
          }}
        />
      )}
    </div>
  )
}

/* ── Shared styles ── */
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#999',
  display: 'block',
  marginBottom: 10,
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  color: '#999',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const fieldIconBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: '#BBBBBB',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #E2E2E2',
  borderRadius: 8,
  fontSize: 13,
  color: '#1A1A1A',
  background: '#FFFFFF',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const pillStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 999,
  border: '1.5px solid #E2E2E2',
  background: '#FFFFFF',
  fontSize: 13,
  fontWeight: 500,
  color: '#444',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const pillSelectedStyle: React.CSSProperties = {
  background: '#1A1A1A',
  borderColor: '#1A1A1A',
  color: '#FFFFFF',
}

const navArrowStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1.5px solid #E2E2E2',
  background: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#333',
}

const carouselArrowStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1.5px solid #E2E2E2',
  background: '#FFFFFF',
  color: '#555',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'all 0.15s',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}

const tbSep: React.CSSProperties = {
  width: 1,
  height: 18,
  background: '#E8E8E8',
  margin: '0 6px',
  flexShrink: 0,
}

const tbActionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 32,
  padding: '0 12px',
  borderRadius: 8,
  border: '1.5px solid #E2E2E2',
  background: '#FFFFFF',
  fontSize: 12,
  fontWeight: 500,
  color: '#333',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  fontFamily: 'inherit',
}

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  cursor: 'pointer',
  transition: 'background 0.15s',
}

const toggleTrackStyle = (checked: boolean): React.CSSProperties => ({
  width: 28,
  height: 16,
  borderRadius: 999,
  background: checked ? '#1A1A1A' : '#DDDDDD',
  position: 'relative',
  flexShrink: 0,
  transition: 'background 0.2s',
  display: 'inline-block',
})

const toggleThumbStyle = (checked: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 2,
  left: checked ? 14 : 2,
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: 'white',
  transition: 'left 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
})
