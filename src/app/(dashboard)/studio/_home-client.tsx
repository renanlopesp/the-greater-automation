'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { studioSupabase as supabase } from '@/lib/supabase/studio-client'
import { useRouter } from 'next/navigation'
import { loadStoreContext } from '@/lib/studio/store-context'
import { getHistoryKey, migrateLegacyHistory } from '@/lib/historyKey'
import { loadImageStyles, STYLES_STORAGE_KEY } from '@/config/imageStyles'
import { getGradient } from '@/config/designSystem'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Image,
  Video,
  FileText,
  Clock,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
} from 'lucide-react'

/* ── Style card with hover slideshow (dual-layer crossfade) ── */
function StyleCard({
  style,
  onClick,
}: {
  style: { name: string; description?: string; thumb: string; hoverImages?: string[] }
  onClick: () => void
}) {
  const slides = [style.thumb, ...(style.hoverImages ?? [])].filter(Boolean)
  const [isHovered, setIsHovered] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0)
  const [layerSrc, setLayerSrc] = useState<[string, string]>(() =>
    slides.length > 0 ? [slides[0], slides[0]] : ['', '']
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFirstRender = useRef(true)

  // Crossfade new src onto back layer then swap when slideIndex changes.
  // Dual-layer crossfade: both layers are owned here — cannot be derived state.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const newSrc = slides[slideIndex] ?? ''
    const backLayer = activeLayer === 0 ? 1 : 0
    // eslint-disable-next-line react-hooks/set-state-in-effect -- crossfade back-buffer update
    setLayerSrc((prev) => {
      const next: [string, string] = [...prev] as [string, string]
      next[backLayer] = newSrc
      return next
    })
    const t = setTimeout(() => setActiveLayer(backLayer as 0 | 1), 30)
    return () => clearTimeout(t)
  }, [slideIndex])

  // Slideshow interval — start on hover, reset state on leave.
  useEffect(() => {
    if (isHovered && slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setSlideIndex((i) => (i + 1) % slides.length)
      }, 650)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (!isHovered) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset crossfade state to initial frame on mouse leave
        setSlideIndex(0)
        setActiveLayer(0)
        if (slides.length > 0) setLayerSrc([slides[0], slides[0]])
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isHovered, slides.length])

  const thumb = style.thumb || slides[0] || ''

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: 'none',
        padding: 0,
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left' as const,
        flexShrink: 0,
        width: 216,
      }}
    >
      <div
        style={{
          width: '100%',
          height: 384,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#E8E6E2',
          position: 'relative' as const,
        }}
      >
        {/* Layer 0 */}
        <img
          src={layerSrc[0] || thumb}
          alt=""
          style={{
            position: 'absolute' as const,
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            display: 'block',
            opacity: activeLayer === 0 ? 1 : 0,
            transition: 'opacity 0.25s ease',
            willChange: 'opacity',
          }}
        />
        {/* Layer 1 */}
        <img
          src={layerSrc[1] || thumb}
          alt=""
          style={{
            position: 'absolute' as const,
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            display: 'block',
            opacity: activeLayer === 1 ? 1 : 0,
            transition: 'opacity 0.25s ease',
            willChange: 'opacity',
          }}
        />
        {slides.length === 0 && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#BBB',
              fontSize: 12,
              fontWeight: 500,
              position: 'relative' as const,
              zIndex: 2,
            }}
          >
            {style.name}
          </div>
        )}
        {/* Dot indicators */}
        {isHovered && slides.length > 1 && (
          <div
            style={{
              position: 'absolute' as const,
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 4,
              zIndex: 2,
            }}
          >
            {slides.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === slideIndex ? 14 : 5,
                  height: 5,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.9)',
                  transition: 'width 0.2s ease',
                  opacity: i === slideIndex ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

interface HistoryItem {
  id: string
  createdAt: string
  imageUrl: string
  sessionTitle: string
  channel: string
  type?: 'image' | 'video' | 'document'
  documentTitle?: string
  documentExcerpt?: string
  documentMarkdown?: string
  chatMessages?: unknown[]
  heading?: string
  description?: string
  cta?: string
  styleId?: string | null
}

// No more Unsplash fallbacks — only admin-generated thumbnails are used

// Category mapping for display grouping
const STYLE_CATEGORIES: Record<string, string> = {
  'ecommerce-photography': 'Produto isolado',
  'advertising-product': 'Produto isolado',

  'advertising-hold': 'Com pessoa',
  'advertising-portrait': 'Com pessoa',
  'fashion-on-model': 'Com pessoa',
  'ghost-mannequin': 'Com pessoa',
  'product-lifestyle': 'Com pessoa',
  'flat-lay-editorial': 'Composição',
  unboxing: 'Composição',
  'material-detail': 'Detalhe',
  'product-attributes': 'Detalhe',
  'product-infographic': 'Detalhe',
  'pop-illustration': 'Campanha',
}

// Style-specific prompts for generation
const STYLE_PROMPTS: Record<string, string> = {
  'ecommerce-photography':
    'Professional e-commerce product photography. Clean neutral background, uniform soft lighting, product centered and sharp, white or light gray backdrop, high-end commercial quality',
  'advertising-product':
    'Commercial advertising product photography with editorial storytelling. Single dominant warm color background harmonizing with product palette. Strong directional key light casting intentional hard shadows. Organic props referencing product ingredients — citrus, stones, botanicals, wood. Product as absolute hero, slight 3/4 overhead angle. Rich saturated cinematic color grade, magazine cover worthy',

  'advertising-hold':
    'Advertising cosmetics photography. Female model holding the product extended toward the camera in the foreground, product sharp and in focus, model slightly soft-focused behind. Model smiling naturally and confidently. Half-body composition. Clean background harmonizing with product color. Soft diffused studio lighting, no harsh shadows. Shallow depth of field with product as hero',
  'advertising-portrait':
    'High-end advertising portrait. Model with strong confident expression, product naturally integrated into the scene, dramatic studio lighting, editorial quality, high contrast',
  'fashion-on-model':
    'High-fashion editorial photography. Model with powerful attitude-driven pose, commanding presence, hard directional lighting, deep sculpted shadows, clean off-white backdrop, clothing as hero, cool matte color grade, 85mm lens low angle',
  'ghost-mannequin':
    'Ghost mannequin product photography. Clothing structured without model, invisible mannequin effect, clean white background, professional e-commerce quality, garment fully visible',
  'product-lifestyle':
    'Lifestyle product photography. Product being used in real daily life setting, natural window light, authentic and warm atmosphere, relatable scene, candid feel',
  'flat-lay-editorial':
    'Flat lay editorial photography. Overhead aerial view, product as hero surrounded by carefully arranged complementary props, deliberate composition, clean background, editorial quality',
  unboxing:
    'Unboxing experience photography. Product being revealed from premium packaging, sense of anticipation and excitement, hands interacting with box, warm lighting, aspirational feel',
  'material-detail':
    'Extreme macro detail photography. Ultra close-up of product texture and material, shallow depth of field, sharp focus on surface details, communicates quality and craftsmanship',
  'product-attributes':
    'Product attributes photography with visual callouts. Clean product shot with annotation lines highlighting key features and benefits, informative yet premium aesthetic',
  'product-infographic':
    'Product infographic photography. Extreme macro of material texture as full background with white SVG icon overlays highlighting product attributes. Premium editorial infographic style',
  'pop-illustration':
    'Bold pop art illustration with real product. Vibrant Gen Z aesthetic, graphic illustration elements mixed with product photography, energetic colors, bold typography, youthful and attention-grabbing',
}

// Style descriptions in PT
const STYLE_DESCRIPTIONS: Record<string, string> = {
  'ecommerce-photography': 'Produto limpo, fundo neutro, luz uniforme',
  'advertising-product':
    'Props de ingredientes, fundo dominante, luz dramática e composição editorial',

  'advertising-hold':
    'Modelo segurando produto para câmera, fundo que combina, expressão confiante',
  'advertising-portrait': 'Pessoa com expressão forte, produto integrado à cena',
  'fashion-on-model': 'Pose de atitude, poder e presença. Vibrant e intimidante',
  'ghost-mannequin': 'Roupa estruturada sem modelo, efeito manequim fantasma',
  'product-lifestyle': 'Produto em uso no dia a dia, luz natural, sensação real',
  'flat-lay-editorial': 'Vista aérea com composição cuidadosa, objetos props',
  unboxing: 'Experiência de abertura da embalagem, gera antecipação',
  'material-detail': 'Macro extremo na textura e material do produto',
  'product-attributes': 'Callouts visuais anotando os atributos do produto',
  'product-infographic': 'Macro do material com ícones de atributos sobrepostos, editorial premium',
  'pop-illustration': 'Modelo foto real + produto ilustrado em cartoon bold. Sem elementos extras',
}
const FILTERS = ['Todos', 'Imagens', 'Vídeos', 'Carrosséis'] as const
type Filter = (typeof FILTERS)[number]

function timeAgo(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 604800) return `${Math.floor(diff / 86400)} dias atrás`
  return d.toLocaleDateString('pt-BR')
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)/i.test(url) || url.includes('fal.media')
}

// ── Capabilities cards (same data as Home.tsx) ──────────────────────────────
type FilterTab = 'all' | 'campaigns' | 'content' | 'analytics' | 'retention'

interface CapCard {
  id: string
  title: string
  skill: string
  category: FilterTab[]
  route: string
  autoPrompt?: string
}

const CAP_FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'content', label: 'Content' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'retention', label: 'Retention' },
]

function buildCapCards(ctx: ReturnType<typeof loadStoreContext>): CapCard[] {
  const store = ctx?.name ?? 'sua loja'
  const niche = ctx?.niche ?? 'e-commerce'
  const tone = ctx?.tone ?? ''
  const product = ctx?.productTypes?.[0] ?? 'produto'
  const kw1 = ctx?.keywords?.[0] ?? 'qualidade'
  const kw2 = ctx?.keywords?.[1] ?? 'exclusividade'

  return [
    {
      id: 'c1',
      title: `Dia das Mães em 18 dias. ${store} ainda não publicou nada`,
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Criar campanha completa para o Dia das Mães para ${store}: post emocional, stories, carrossel de produto e copy para 3 canais. Nicho: ${niche}. Tom: ${tone || 'emocional e próximo'}.`,
    },
    {
      id: 'c2',
      title: `Visual de ${product} que para o scroll. Gerado em 30s`,
      skill: 'Image Generator',
      category: ['campaigns', 'content'],
      route: '/studio/create',
      autoPrompt: `Criar post editorial de ${product} para ${store}. Estilo ${tone || 'minimalista e premium'}, alta qualidade. Nicho ${niche}.`,
    },
    {
      id: 'c3',
      title: `Copy de ${kw1} e ${kw2} para 6 canais, adaptada ao tom da ${store}`,
      skill: 'Copywriter',
      category: ['content'],
      route: '/agent',
      autoPrompt: `Escrever copy completa para ${store} com headline, descrição e CTA adaptada para Instagram, TikTok, WhatsApp, e-mail, feed e stories. Tom: ${tone || 'autêntico'}. Produto: ${product}.`,
    },
    {
      id: 'c4',
      title: `30 dias de conteúdo para ${store}. Calendário pronto para publicar`,
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Criar calendário editorial completo de 30 dias para ${store}. Nicho: ${niche}. Incluir datas sazonais, tipo de conteúdo por dia, canal e copy sugerida. Tom: ${tone || 'próximo e autêntico'}.`,
    },
    {
      id: 'c5',
      title: `Seus clientes pararam de comprar. Recupere antes de perder para o concorrente`,
      skill: 'Retention Engine',
      category: ['retention'],
      route: '/agent',
      autoPrompt: `Criar campanha de retenção e reativação para clientes inativos de ${store}. Nicho: ${niche}. Gerar post de reengajamento com oferta e urgência, tom ${tone || 'próximo e direto'}.`,
    },
    {
      id: 'c6',
      title: `O que aconteceu na ${store} esta semana. Relatório em 10 segundos`,
      skill: 'Ops Pilot',
      category: ['analytics'],
      route: '/agent',
      autoPrompt: `Gerar relatório executivo semanal para ${store}: vendas, conversão, carrinhos abandonados, top produtos, alertas de agentes e top 3 ações prioritárias para a próxima semana. Nicho: ${niche}.`,
    },
    {
      id: 'c7',
      title: `Script de Reels que converte. ${product} em 15 segundos`,
      skill: 'Video Script Creator',
      category: ['content'],
      route: '/agent',
      autoPrompt: `Escrever script completo de Reels para ${store} mostrando ${product}. Hook de 3 segundos, desenvolvimento emocional, CTA final. Tom: ${tone || 'autêntico e direto'}. Nicho: ${niche}.`,
    },
    {
      id: 'c8',
      title: `Dia dos Namorados. Campanha completa antes que o concorrente publique`,
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Criar campanha de Dia dos Namorados para ${store}: post emocional de casal, stories de produto, copy de urgência e oferta especial. Tom: ${tone || 'romântico e próximo'}. Nicho: ${niche}.`,
    },
    {
      id: 'c9',
      title: `47 clientes em risco de churn. Plano de retenção personalizado`,
      skill: 'Retention Engine',
      category: ['retention'],
      route: '/agent',
      autoPrompt: `Analisar clientes em risco de churn em ${store} (nicho: ${niche}) e gerar plano de retenção com: segmentação por risco, sequência de mensagens personalizadas, ofertas por segmento e KPIs de acompanhamento.`,
    },
    {
      id: 'c10',
      title: `Tom e identidade da ${store}. Consistente em todos os canais`,
      skill: 'Brand DNA',
      category: ['analytics'],
      route: '/settings/brand-dna',
      autoPrompt: `Revisar e documentar o Brand DNA de ${store}: tom de voz, vocabulário da marca, arquétipo, mensagem central, o que nunca dizer e exemplos de copy on-brand vs off-brand. Nicho: ${niche}. Palavras-chave da marca: ${ctx?.keywords?.join(', ') ?? 'qualidade, autenticidade'}.`,
    },
    {
      id: 'c11',
      title: `Black Friday da ${store}. Estratégia 4 semanas antes do pico`,
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Planejar Black Friday completa para ${store}: cronograma de 4 semanas, teasers, dia do evento e pós-venda. Incluir posts, stories, copies e estratégia de desconto sustentável. Nicho: ${niche}.`,
    },
    {
      id: 'c12',
      title: `Estoque crítico antes da próxima campanha. Verifique agora`,
      skill: 'Inventory Manager',
      category: ['analytics'],
      route: '/agent',
      autoPrompt: `Gerar análise de estoque para ${store} antes da próxima campanha sazonal: produtos em risco de ruptura, excesso de inventário para liquidação, reposição sugerida por fornecedor e impacto no faturamento. Nicho: ${niche}.`,
    },
  ]
}

const INITIAL_VISIBLE = 6

function CapabilitiesSection({
  storeCtx,
  router,
}: {
  storeCtx: ReturnType<typeof loadStoreContext>
  router: ReturnType<typeof useRouter>
}) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [showAll, setShowAll] = useState(false)

  const cards = useMemo(() => buildCapCards(storeCtx), [storeCtx])
  const filteredCards = cards.filter(
    (c) => activeFilter === 'all' || c.category.includes(activeFilter)
  )
  const visibleCards = showAll ? filteredCards : filteredCards.slice(0, INITIAL_VISIBLE)
  const hasMore = filteredCards.length > INITIAL_VISIBLE && !showAll

  return (
    <div style={{ marginBottom: 52 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: '#1A1A1A', margin: '0 0 16px' }}>
          What Snew can do for you
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {CAP_FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id)
                  setShowAll(false)
                }}
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#FFFFFF' : '#888',
                  background: isActive ? '#1A1A1A' : 'transparent',
                  border: `1px solid ${isActive ? '#1A1A1A' : '#E0E0DC'}`,
                  borderRadius: 100,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#999'
                    e.currentTarget.style.color = '#1A1A1A'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#E0E0DC'
                    e.currentTarget.style.color = '#888'
                  }
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <AnimatePresence mode="popLayout">
          {visibleCards.map((card) => {
            const grad = getGradient(card.skill)
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                onClick={() => {
                  const url = card.autoPrompt
                    ? `${card.route}?autoPrompt=${encodeURIComponent(card.autoPrompt)}`
                    : card.route
                  router.push(url)
                }}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  position: 'relative',
                  background: grad.card,
                  backgroundSize: '200% 200%',
                  backgroundPosition: '0% 0%',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 220,
                  cursor: 'pointer',
                  transition: 'background-position 0.9s ease',
                }}
                whileHover={{ backgroundPosition: '100% 100%' }}
              >
                <div style={{ padding: '28px 28px 0', position: 'relative', zIndex: 2 }}>
                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                      color: grad.ink,
                      opacity: 0.5,
                    }}
                  >
                    {card.skill}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 500,
                      lineHeight: 1.25,
                      color: grad.ink,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {card.title}
                  </p>
                </div>
                <div
                  style={{
                    flex: 1,
                    marginTop: 20,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 100,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-30%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '80%',
                      height: '120%',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => setShowAll(true)}
            style={{
              padding: '8px 24px',
              borderRadius: 10,
              border: '1px solid #E0E0DC',
              background: '#FFFFFF',
              color: '#555',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1A1A1A'
              e.currentTarget.style.color = '#FFF'
              e.currentTarget.style.borderColor = '#1A1A1A'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.color = '#555'
              e.currentTarget.style.borderColor = '#E0E0DC'
            }}
          >
            Ver mais ({filteredCards.length - INITIAL_VISIBLE})
          </button>
        </div>
      )}
    </div>
  )
}

export default function SnewStudioHomePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('Todos')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [chatInput, setChatInput] = useState('')
  const templatesScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  // Build templates from loadImageStyles() — single source of truth
  const [styleData, setStyleData] = useState(() => loadImageStyles())

  // Re-sync when admin saves (same tab or cross-tab)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STYLES_STORAGE_KEY || e.key === 'snew:image-styles') {
        setStyleData(loadImageStyles())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Also fetch DB thumbnails as override (admin may have saved to DB)
  const [dbThumbs, setDbThumbs] = useState<Record<string, string>>({})
  const [dbHoverImages, setDbHoverImages] = useState<Record<string, string[]>>({})
  useEffect(() => {
    supabase
      .from('image_styles')
      .select('id, thumbnail_url, hover_images')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        const hoverMap: Record<string, string[]> = {}
        data.forEach((s) => {
          if (s.thumbnail_url) map[s.id] = s.thumbnail_url
          const hi = (s as { hover_images?: unknown }).hover_images
          if (Array.isArray(hi) && hi.filter(Boolean).length > 0) {
            hoverMap[s.id] = hi.filter(Boolean)
          }
        })
        if (Object.keys(map).length) setDbThumbs(map)
        if (Object.keys(hoverMap).length) setDbHoverImages(hoverMap)
      })
  }, [])

  type TemplateItem = {
    id: string
    category: string
    title: string
    description: string
    thumb: string
    hoverImages?: string[]
    prompt: string
    dest: 'studio'
  }

  const templates: TemplateItem[] = useMemo(
    () =>
      styleData
        .filter((s) => s.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((s) => ({
          id: s.id,
          category: STYLE_CATEGORIES[s.id] ?? s.category,
          title: s.name,
          description: s.description || STYLE_DESCRIPTIONS[s.id] || '',
          thumb: s.thumbnailUrl || dbThumbs[s.id] || '',
          hoverImages:
            s.hoverImages && s.hoverImages.length > 0 ? s.hoverImages : (dbHoverImages[s.id] ?? []),
          prompt: STYLE_PROMPTS[s.id] ?? s.promptBase,
          dest: 'studio' as const,
        })),
    [styleData, dbThumbs, dbHoverImages]
  )
  const checkScroll = () => {
    const el = templatesScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  const scrollBy = (dir: 'left' | 'right') => {
    const el = templatesScrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? 696 : -696, behavior: 'smooth' })
    setTimeout(checkScroll, 350)
  }

  const storeCtx = useMemo(() => loadStoreContext(), [])
  const storeName = storeCtx?.name ?? 'Studio'

  useEffect(() => {
    try {
      migrateLegacyHistory()
      const raw = localStorage.getItem(getHistoryKey())
      if (raw) setHistory(JSON.parse(raw).slice(0, 50))
    } catch {}
  }, [])

  const goCreate = (prompt?: string, styleId?: string, styleName?: string, styleDesc?: string) => {
    const params = new URLSearchParams()
    if (prompt) params.set('autoPrompt', prompt)
    if (styleId) params.set('styleId', styleId)
    if (styleName) params.set('styleName', styleName)
    if (styleDesc) params.set('styleDesc', styleDesc)
    const qs = params.toString()
    router.push(`/studio/create${qs ? `?${qs}` : ''}`)
  }

  const filtered = useMemo(() => {
    return history.filter((item) => {
      const title = (item.sessionTitle || item.documentTitle || '').toLowerCase()
      const matchSearch = !search || title.includes(search.toLowerCase())
      const matchFilter =
        filter === 'Todos'
          ? true
          : filter === 'Imagens'
            ? (!item.type || item.type === 'image') && !isVideoUrl(item.imageUrl ?? '')
            : filter === 'Vídeos'
              ? item.type === 'video' || isVideoUrl(item.imageUrl ?? '')
              : filter === 'Carrosséis'
                ? item.channel === 'carousel'
                : true
      return matchSearch && matchFilter
    })
  }, [history, search, filter])

  const openItem = (item: HistoryItem) => {
    if (item.type === 'document') {
      sessionStorage.setItem(
        'snew:restore-doc',
        JSON.stringify({
          markdown: item.documentMarkdown ?? '',
          title: item.documentTitle ?? item.sessionTitle,
        })
      )
      router.push('/agent')
    } else {
      sessionStorage.setItem('snew:studio-restore-item', JSON.stringify(item))
      router.push(`/studio/create?restore=1&_ts=${Date.now()}`)
    }
  }

  return (
    <>
      <div
        style={{ width: '100%', height: '100%', overflowY: 'auto', background: 'hsl(40, 7%, 96%)' }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 40px 80px' }}>
          {/* Header: chatbox centralizado */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1
              className="text-2xl font-medium"
              style={{
                color: '#1A1A1A',
                margin: '0 0 24px',
                fontSize: 26,
                letterSpacing: '-0.02em',
              }}
            >
              {storeCtx ? `O que criar para ${storeName} hoje?` : 'O que você quer criar hoje?'}
            </h1>

            {/* Chatbox */}
            <div
              style={{
                maxWidth: 580,
                margin: '0 auto 14px',
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '14px 18px',
                position: 'relative' as const,
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                border: '1px solid #E8E8E4',
                minHeight: 80,
              }}
            >
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  storeCtx
                    ? `Descreva o criativo para ${storeName}...`
                    : 'Descreva a imagem, vídeo ou carrossel...'
                }
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
                    e.preventDefault()
                    goCreate(chatInput.trim())
                  }
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: 14,
                  color: '#1A1A1A',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                  padding: 0,
                  paddingBottom: 32,
                  boxSizing: 'border-box' as const,
                  verticalAlign: 'top',
                  display: 'block',
                }}
              />
              <button
                onClick={() => chatInput.trim() && goCreate(chatInput.trim())}
                style={{
                  position: 'absolute' as const,
                  bottom: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: chatInput.trim() ? '#1A1A1A' : '#E0E0DC',
                  color: '#FFFFFF',
                  cursor: chatInput.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
              >
                <ArrowUp size={14} />
              </button>
            </div>

            {/* ── Feature cards — substituem os chips ── */}
            <div style={{ margin: '32px 0 0' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                }}
              >
                {[
                  {
                    id: 'image',
                    label: 'Gerar imagem',
                    dest: 'studio' as const,
                    prompt: 'Gerar imagem com IA',
                    icon: (
                      <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
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
                        <rect
                          x="28"
                          y="22"
                          width="16"
                          height="16"
                          rx="4"
                          fill="#4ADE80"
                          opacity="0.9"
                        />
                        <path
                          d="M32 30l3 3 5-5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                  {
                    id: 'video',
                    label: 'Criar vídeo',
                    dest: 'studio' as const,
                    prompt: storeCtx
                      ? `Criar vídeo cinematográfico do produto de ${storeName}, tom ${storeCtx.tone || 'premium'}`
                      : 'Criar vídeo cinematográfico do produto principal',
                    icon: (
                      <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
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
                    ),
                  },
                  {
                    id: 'carousel',
                    label: 'Carrossel',
                    dest: 'studio' as const,
                    prompt: storeCtx
                      ? `Gerar carrossel de ${storeCtx.productTypes?.[0] ?? 'produto'} de ${storeName} com 5 slides`
                      : 'Gerar carrossel de produto com 5 slides e copy automático',
                    icon: (
                      <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
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
                    ),
                  },
                  {
                    id: 'copy',
                    label: 'Escrever copy',
                    dest: 'agent' as const,
                    prompt: storeCtx
                      ? `Escrever copy completa para ${storeName} com headline, descrição e CTA para 6 canais. Produto: ${storeCtx.productTypes?.[0] ?? 'produto'}`
                      : 'Escrever copy completa com headline, descrição e CTA adaptada para 6 canais',
                    icon: (
                      <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
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
                    ),
                  },
                  {
                    id: 'campaign',
                    label: 'Campanha',
                    dest: 'agent' as const,
                    prompt: storeCtx
                      ? `Criar campanha completa para ${storeName}: brief, calendário, copies para 6 canais e assets visuais. Nicho: ${storeCtx.niche}`
                      : 'Criar campanha completa: brief, calendário editorial e copies para 6 canais',
                    icon: (
                      <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
                        <circle
                          cx="26"
                          cy="24"
                          r="16"
                          fill="#FCE7F3"
                          stroke="#F9A8D4"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M18 24l5 5 11-11"
                          stroke="#EC4899"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="38"
                          cy="12"
                          r="7"
                          fill="#FDE68A"
                          stroke="#FCD34D"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M35.5 12l2 2 3-3"
                          stroke="#92400E"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                  {
                    id: 'report',
                    label: 'Relatório',
                    dest: 'agent' as const,
                    prompt: storeCtx
                      ? `Gerar relatório completo de performance para ${storeName}: vendas, conversão, top produtos e ações prioritárias`
                      : 'Gerar relatório executivo semanal com KPIs, conversão e ações prioritárias',
                    icon: (
                      <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
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
                        <circle
                          cx="38"
                          cy="14"
                          r="8"
                          fill="#DCFCE7"
                          stroke="#86EFAC"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M35 14l2 2 4-4"
                          stroke="#16A34A"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                ].map((card, i) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      if (card.dest === 'agent') {
                        router.push(`/agent?autoPrompt=${encodeURIComponent(card.prompt)}`)
                      } else {
                        goCreate(card.prompt)
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'row' as const,
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.15s',
                      animation: 'fadeSlideUp 0.3s ease both',
                      animationDelay: `${i * 40}ms`,
                      minWidth: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F0F0EE'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFFFFF'
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>{card.icon}</div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#1A1A1A',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      {card.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Templates */}
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
                Comece agora
              </p>
            </div>

            {/* Wrapper relativo para setas e gradients */}
            <div style={{ position: 'relative' as const }}>
              {/* Seta esquerda */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollBy('left')}
                  style={{
                    position: 'absolute' as const,
                    left: 0,
                    top: '45%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.10)',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#333',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1A1A1A'
                    e.currentTarget.style.color = '#FFF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFFFFF'
                    e.currentTarget.style.color = '#333'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {/* Gradient esquerda */}
              {canScrollLeft && (
                <div
                  style={{
                    position: 'absolute' as const,
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 60,
                    background: 'linear-gradient(to left, transparent, hsl(40, 7%, 96%))',
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}
                />
              )}

              {/* Gradient direita */}
              {canScrollRight && (
                <div
                  style={{
                    position: 'absolute' as const,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 60,
                    background: 'linear-gradient(to right, transparent, hsl(40, 7%, 96%))',
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}
                />
              )}

              {/* Seta direita */}
              {canScrollRight && (
                <button
                  onClick={() => scrollBy('right')}
                  style={{
                    position: 'absolute' as const,
                    right: 0,
                    top: '45%',
                    transform: 'translate(50%, -50%)',
                    zIndex: 10,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.10)',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#333',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1A1A1A'
                    e.currentTarget.style.color = '#FFF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFFFFF'
                    e.currentTarget.style.color = '#333'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              )}

              {/* Scroll container */}
              <div style={{ overflow: 'hidden', borderRadius: 14 }}>
                <div
                  ref={templatesScrollRef}
                  onScroll={checkScroll}
                  className="hide-scrollbar"
                  style={{
                    display: 'flex',
                    gap: 14,
                    overflowX: 'auto',
                    padding: '8px 4px 12px',
                  }}
                >
                  {(() => {
                    const groups = templates.reduce(
                      (acc, tpl) => {
                        if (!acc[tpl.category]) acc[tpl.category] = []
                        acc[tpl.category].push(tpl)
                        return acc
                      },
                      {} as Record<string, TemplateItem[]>
                    )
                    let globalIndex = 0
                    return Object.entries(groups).map(([cat, items]) => (
                      <div key={cat} style={{ display: 'contents' }}>
                        {items.map((tpl) => {
                          const idx = globalIndex++
                          return (
                            <div
                              key={tpl.id}
                              className="style-card-wrapper"
                              style={{
                                flexShrink: 0,
                                width: 216,
                                animation: `fadeSlideUp 0.35s ease both`,
                                animationDelay: `${idx * 40}ms`,
                                position: 'relative' as const,
                              }}
                            >
                              <StyleCard
                                style={{
                                  name: tpl.title,
                                  description: tpl.description,
                                  thumb: tpl.thumb,
                                  hoverImages: tpl.hoverImages,
                                }}
                                onClick={() =>
                                  goCreate(tpl.prompt, tpl.id, tpl.title, tpl.description)
                                }
                              />
                              <div
                                className="style-card-caption"
                                style={{
                                  padding: '10px 2px 0',
                                  opacity: 0,
                                  transform: 'translateY(4px)',
                                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                                  pointerEvents: 'none',
                                }}
                              >
                                <p
                                  className="text-xs font-normal"
                                  style={{
                                    color: '#1A1A1A',
                                    margin: '0 0 3px',
                                    letterSpacing: '-0.01em',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {tpl.title}
                                </p>
                                <p
                                  style={{
                                    fontSize: 11,
                                    color: '#999',
                                    margin: 0,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {tpl.description}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* ── What Snew can do for you ── */}
          <CapabilitiesSection storeCtx={storeCtx} router={router} />

          {/* Recentes */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                Recentes
              </h2>
            </div>

            {/* Empty */}
            {history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#AAA' }}>
                <Clock size={32} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 13 }}>Seus criativos aparecerão aqui depois de gerados</div>
              </div>
            )}

            {/* Grid — max 3 items */}
            {history.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                }}
              >
                {history.slice(0, 3).map((item) => {
                  const isDoc = item.type === 'document'
                  const isVid = isVideoUrl(item.imageUrl ?? '')
                  const title = item.documentTitle ?? item.sessionTitle ?? 'Sem título'
                  const excerpt = (item as { documentExcerpt?: string }).documentExcerpt ?? ''
                  const hasThumb = !isDoc && item.imageUrl && item.imageUrl.length > 10
                  const typeLabel = isDoc
                    ? 'doc'
                    : isVid
                      ? 'vídeo'
                      : item.channel
                        ? item.channel.replace(':', '×')
                        : 'imagem'

                  return (
                    <button
                      key={item.id}
                      onClick={() => openItem(item)}
                      style={{
                        border: 'none',
                        padding: 0,
                        borderRadius: 16,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#FFFFFF',
                        textAlign: 'left' as const,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        display: 'flex',
                        flexDirection: 'column' as const,
                        aspectRatio: '3/4',
                        position: 'relative' as const,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                      }}
                    >
                      {hasThumb && (
                        <div
                          style={{ position: 'absolute' as const, inset: 0, overflow: 'hidden' }}
                        >
                          {isVid ? (
                            <video
                              src={item.imageUrl}
                              muted
                              playsInline
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover' as const,
                              }}
                            />
                          ) : (
                            <img
                              src={item.imageUrl}
                              alt={title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover' as const,
                                display: 'block',
                                opacity: 0.18,
                              }}
                            />
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          position: 'relative' as const,
                          zIndex: 1,
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column' as const,
                          height: '100%',
                          boxSizing: 'border-box' as const,
                        }}
                      >
                        <div style={{ marginBottom: 'auto' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#888',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {typeLabel}
                          </span>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                          {isDoc && excerpt && (
                            <p
                              style={{
                                fontSize: 11,
                                color: '#AAA',
                                margin: '0 0 10px',
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical' as const,
                                overflow: 'hidden',
                              }}
                            >
                              {excerpt}
                            </p>
                          )}

                          <p
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: '#1A1A1A',
                              margin: '0 0 8px',
                              lineHeight: 1.35,
                              letterSpacing: '-0.01em',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical' as const,
                              overflow: 'hidden',
                            }}
                          >
                            {title}
                          </p>

                          <p style={{ fontSize: 11, color: '#BBB', margin: 0 }}>
                            {timeAgo(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Ver mais → Board */}
            {history.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button
                  onClick={() => router.push(`/studio/create?openBoard=true&_ts=${Date.now()}`)}
                  style={{
                    padding: '8px 24px',
                    borderRadius: 10,
                    border: '1px solid #E0E0DC',
                    background: '#FFFFFF',
                    color: '#555',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1A1A1A'
                    e.currentTarget.style.color = '#FFF'
                    e.currentTarget.style.borderColor = '#1A1A1A'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFFFFF'
                    e.currentTarget.style.color = '#555'
                    e.currentTarget.style.borderColor = '#E0E0DC'
                  }}
                >
                  Ver mais
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
      <style>{`
        .style-card-wrapper:hover .style-card-caption {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </>
  )
}
