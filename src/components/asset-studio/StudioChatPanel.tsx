'use client'
// Ported verbatim from snew-ai-core prototype (spec 066); `any` usage is
// inherited and scheduled for cleanup in a dedicated refactor pass.
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react'
import {
  ArrowUp,
  Loader2,
  Heart,
  Zap,
  LayoutGrid,
  Sparkles,
  Image as ImageIcon,
  Package,
  RefreshCw,
  X,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ChevronsLeft,
  ChevronDown,
  ChevronUp,
  Palette,
  Paperclip,
  FileText,
} from 'lucide-react'
// RULE: Never use emoji characters anywhere in this file. Use lucide-react icons or unicode symbols only.
// RULE: Never use fontWeight 700 or "bold". Max weight is 500 for labels, 400 for body.
import { studioSupabase as supabase } from '@/lib/supabase/studio-client'
import { createBrowserClient as createRelaySupabase } from '@/lib/supabase/client'
import { useStudioSession } from '@/lib/studio/session-context'
import { parseOrchestratorResponse } from '@/lib/chat/parse-orchestrator-response'
import { uploadChatFileAction } from '@/lib/actions/chat-upload'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'

interface PendingUpload {
  id: string
  name: string
  isImage: boolean
  previewUrl?: string
  url?: string
  status: 'uploading' | 'done' | 'error'
}

interface StylePickerStyle {
  id: string
  name: string
  description: string
  thumbnailUrl: string
}

interface QualificationMessage {
  role: 'assistant'
  content: string
  type: 'qualification'
  chips?: string[]
  onChipClick?: (chip: string) => void
  onSkip?: () => void
  answered?: boolean
}

interface StylePickerMessage {
  role: 'assistant'
  content: string
  type: 'style-picker'
  styles: StylePickerStyle[]
  onStyleSelect?: (styleId: string, styleName: string) => void
  onSkip?: () => void
  answered?: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  attachedImages?: { dataUrl: string; base64: string; mimeType: string }[]
  actions?: { icon: string; label: string }[]
  followUps?: string[]
  type?: string
}

export interface ActivityMessage {
  id: string
  type: 'activity'
  action: string
  title: string
  description: string
  suggestions: ActivitySuggestion[]
  timestamp: Date
  imageThumb?: string
}

export interface ActivitySuggestion {
  id: string
  label: string
  action: string
}

type DisplayMessage = ChatMessage | ActivityMessage | QualificationMessage | StylePickerMessage

function isActivity(msg: DisplayMessage): msg is ActivityMessage {
  return 'type' in msg && msg.type === 'activity'
}

function isQualification(msg: DisplayMessage): msg is QualificationMessage {
  return 'type' in msg && msg.type === 'qualification'
}

function isStylePicker(msg: DisplayMessage): msg is StylePickerMessage {
  return 'type' in msg && msg.type === 'style-picker'
}

interface CreativeState {
  channel: string
  heading: string
  description: string
  cta: string
  style: string | null
  styleName?: string
  product: string
  productDescription?: string
  campaign: string
  isCarouselMode: boolean
  textColor: string
  ctaColor: string
  overlayOpacity: number
  font: string
  lastGeneratedPrompt?: string
  hasImage?: boolean
  storeName?: string
  storeNiche?: string
  storeTone?: string
  storeAudience?: string
  storeKeywords?: string[]
  storeProducts?: string[]
  storeColors?: string[]
  // Visual direction from KB
  visualConcept?: string
  modelGender?: string
  modelAge?: string
  modelPose?: string
  shootingStyle?: string
  lightingMood?: string
  colorMood?: string
}

interface StudioChatPanelProps {
  creativeState: CreativeState
  onAction: (action: any) => Promise<{ icon: string; label: string } | null>
  onArtifactReady: () => void
  onSuggestionAction?: (action: string) => void
  onReferenceImageDrop?: (base64: string, mimeType: string, dataUrl: string) => void
  onFirstMessage?: (msg: string) => void
  onCollapse?: () => void
  imageStyles?: {
    id: string
    name: string
    category: string
    color?: string
    thumbnailUrl?: string
  }[]
  products?: { id: string; name: string; image: string }[]
  onGenerateWithStyle?: (styleId: string, productId?: string) => void
  agentMode?: boolean
  agentSystemPrompt?: string
  onDocumentGenerated?: (markdown: string, title: string) => void
  initialMessages?: DisplayMessage[]
  onQualificationAnswer?: (answer: string) => void
  suppressWelcome?: boolean
}

export interface StudioChatPanelRef {
  pushActivity: (
    action: string,
    title: string,
    description: string,
    suggestions: ActivitySuggestion[],
    imageThumb?: string
  ) => void
  sendMessage: (text: string) => void
  clearMessages: () => void
  getMessages: () => DisplayMessage[]
  pushQualificationMessage: (opts: {
    question: string
    chips?: string[]
    onSkip?: () => void
  }) => void
  pushAssistantMessage: (opts: {
    content: string
    chips?: { label: string; action: string }[]
    onChipClick?: (chip: { label: string; action: string }) => void
  }) => void
  pushStylePickerMessage: (opts: {
    question: string
    styles: StylePickerStyle[]
    onSelect: (styleId: string, styleName: string) => void
    onSkip: () => void
  }) => void
  setMessages: (msgs: any[]) => void
}

const chipStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 999,
  border: '1px solid #E8E8E8',
  background: '#FFFFFF',
  fontSize: 12,
  fontWeight: 400,
  color: '#555',
  cursor: 'pointer',
  transition: 'all 0.12s',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

// ── ProductPicker — visual grid for qualification step 0 ──────────────
const ProductPicker = ({
  products,
  onSelect,
  onSkip,
}: {
  products: { id: string; name: string; image: string }[]
  onSelect: (product: { id: string; name: string; image: string }) => void
  onSkip: () => void
}) => {
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const INITIAL = 6

  const filtered = products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  )
  const visible = showAll ? filtered : filtered.slice(0, INITIAL)
  const hasMore = !showAll && filtered.length > INITIAL

  return (
    <div style={{ marginTop: 8 }}>
      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #E8E8E8',
          background: '#FFFFFF',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          autoFocus
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowAll(false)
          }}
          placeholder="Buscar produto..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 12,
            color: '#1A1A1A',
            fontFamily: 'inherit',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#AAA',
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Product grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          marginBottom: 6,
        }}
      >
        {visible.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              gap: 4,
              padding: '6px 4px',
              borderRadius: 8,
              border: '1px solid #EEEDE9',
              background: '#FAFAF8',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0F0EE'
              e.currentTarget.style.borderColor = '#DDD'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FAFAF8'
              e.currentTarget.style.borderColor = '#EEEDE9'
            }}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                borderRadius: 6,
                overflow: 'hidden',
                background: '#F0F0EE',
              }}
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
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
                    fontSize: 16,
                    opacity: 0.3,
                  }}
                >
                  <Package size={16} />
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 10,
                color: '#555',
                textAlign: 'center' as const,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {p.name}
            </span>
          </button>
        ))}
        {visible.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '12px 0',
              textAlign: 'center' as const,
              fontSize: 12,
              color: '#AAA',
            }}
          >
            Nenhum produto encontrado
          </div>
        )}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            width: '100%',
            padding: '6px 0',
            borderRadius: 8,
            border: '1px solid #E8E8E8',
            background: 'transparent',
            color: '#999',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 6,
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F5F5F3'
            e.currentTarget.style.color = '#555'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#999'
          }}
        >
          Ver mais ({filtered.length - INITIAL})
        </button>
      )}

      {/* Free text + skip */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          placeholder="Ou digite o nome..."
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #E8E8E8',
            background: '#FFFFFF',
            color: '#1A1A1A',
            fontSize: 12,
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onSelect({
                id: `custom-${Date.now()}`,
                name: e.currentTarget.value.trim(),
                image: '',
              })
            }
          }}
        />
        <button
          onClick={onSkip}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #E8E8E8',
            background: 'transparent',
            color: '#999',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap' as const,
          }}
        >
          Pular
        </button>
      </div>
    </div>
  )
}

export const StudioChatPanel = forwardRef<StudioChatPanelRef, StudioChatPanelProps>(
  function StudioChatPanel(
    {
      creativeState,
      onAction,
      onArtifactReady,
      onSuggestionAction,
      onReferenceImageDrop,
      onFirstMessage,
      onCollapse,
      imageStyles,
      products,
      onGenerateWithStyle,
      agentMode,
      agentSystemPrompt,
      onDocumentGenerated,
      initialMessages,
      onQualificationAnswer,
      suppressWelcome,
    },
    ref
  ) {
    // Rebuild ActivityMessage entries from persisted metadata, so activity cards
    // survive refresh. Messages with metadata.activity are rendered as activities;
    // pure chat messages pass through as ChatMessage.
    const rebuiltInitial: DisplayMessage[] = useMemo(() => {
      if (!initialMessages) return []
      return initialMessages
        .map((m) => {
          const raw = m as unknown as {
            id?: string
            role: string
            content: string
            metadata?: Record<string, unknown>
          }
          const activity = raw.metadata?.activity as
            | {
                action?: string
                title?: string
                description?: string
                suggestions?: ActivitySuggestion[]
                imageThumb?: string
              }
            | undefined
          if (activity && activity.title) {
            return {
              id: raw.id ?? `activity-${Date.now()}-${Math.random()}`,
              type: 'activity',
              action: activity.action ?? 'activity',
              title: activity.title,
              description: activity.description ?? '',
              suggestions: activity.suggestions ?? [],
              timestamp: new Date(),
              imageThumb: activity.imageThumb,
            } as ActivityMessage
          }
          if (raw.role === 'user' || raw.role === 'assistant') {
            return {
              role: raw.role,
              content: raw.content,
            } as ChatMessage
          }
          return null
        })
        .filter(Boolean) as DisplayMessage[]
    }, [initialMessages])

    const [messages, setMessages] = useState<DisplayMessage[]>(rebuiltInitial)
    const studioSession = useStudioSession()
    const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
    const paperclipInputRef = useRef<HTMLInputElement>(null)

    // Keep the latest creativeState in a ref so snapshots read the freshest
    // value, even when fired synchronously after a setState in the same tick
    // (e.g. setActiveImageUrl → pushActivity → snapshotNow). Without this,
    // the first snapshot after an image generation captured a stale state.
    const creativeStateRef = useRef(creativeState)
    creativeStateRef.current = creativeState

    // Canvas snapshot — fired imperatively from chat response handlers and
    // from pushActivity (image-generated event). NO useEffect — that would
    // serialize the (potentially huge) creativeState on every render.
    // We no longer early-return on missing taskId: in the autoPrompt flow the
    // task is lazy-created inside pushActivity, and snapshotCanvas itself
    // reads taskIdRef.current at the debounce tick — so the 500ms debounce
    // absorbs the race and writes once the task id is available.
    const snapshotNow = useCallback(() => {
      requestAnimationFrame(() => {
        studioSession.snapshotCanvas(creativeStateRef.current as unknown as Record<string, unknown>)
      })
    }, [studioSession])

    const handleFilePick = useCallback(async (files: FileList | File[]) => {
      const list = Array.from(files)
      for (const file of list) {
        const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const isImage = file.type.startsWith('image/')
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined
        setPendingUploads((prev) => [
          ...prev,
          { id, name: file.name, isImage, previewUrl, status: 'uploading' },
        ])
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await uploadChatFileAction(fd)
          if (res.error || !res.url) {
            setPendingUploads((prev) =>
              prev.map((p) => (p.id === id ? { ...p, status: 'error' } : p))
            )
            toast.error(`Falha ao enviar ${file.name}`)
          } else {
            setPendingUploads((prev) =>
              prev.map((p) => (p.id === id ? { ...p, url: res.url, status: 'done' } : p))
            )
          }
        } catch {
          setPendingUploads((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: 'error' } : p))
          )
          toast.error(`Falha ao enviar ${file.name}`)
        }
      }
    }, [])

    // Contextual visibility of the "Referência de imagem" / "Produto" buttons.
    // Show only when the user is actively working on visual output.
    const showVisualUploads = useMemo(() => {
      if (agentMode) return false
      if (creativeState.hasImage) return true
      const cs = creativeState as unknown as Record<string, unknown>
      if (cs.styleId) return true
      if (cs.style) return true
      if (creativeState.isCarouselMode) return true
      // Inspect the last 3 assistant messages for visual actions.
      const VISUAL_ACTIONS = new Set([
        'generate_image',
        'generate_carousel',
        'generate_video',
        'set_style',
        'set_channel',
      ])
      const recent = messages.slice(-6).filter((m) => !isActivity(m)) as ChatMessage[]
      return recent.some(
        (m) =>
          m.role === 'assistant' && (m.actions ?? []).some((a) => VISUAL_ACTIONS.has(a.label ?? ''))
      )
    }, [agentMode, creativeState, messages])
    const [inputValue, setInputValue] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const [currentActionLabel, setCurrentActionLabel] = useState('')
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const [attachedImages, setAttachedImages] = useState<
      { dataUrl: string; base64: string; mimeType: string }[]
    >([])
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set())
    const [inlineFlow, setInlineFlow] = useState<
      | null
      | { type: 'pick-style'; withProduct?: boolean }
      | { type: 'pick-product'; styleId: string }
    >(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, [messages, isThinking])

    const pushActivity = useCallback(
      async (
        action: string,
        title: string,
        description: string,
        activitySuggestions: ActivitySuggestion[],
        imageThumb?: string
      ) => {
        const msg: ActivityMessage = {
          id: `activity-${Date.now()}`,
          type: 'activity',
          action,
          title,
          description,
          suggestions: activitySuggestions,
          timestamp: new Date(),
          imageThumb,
        }
        setMessages((prev) => [...prev, msg])
        // Auto-prompt flows (home → /studio/create?autoPrompt=...) generate
        // the first image before the user types anything, so taskId/conversationId
        // may still be null here. Ensure a session exists so this activity,
        // the canvas snapshot and subsequent turns all land in the same task.
        let convId = studioSession.conversationId
        if (!convId) {
          const ensured = await studioSession.ensureSession(title || description || action)
          convId = ensured?.conversationId ?? null
        }
        if (convId) {
          // Persist the activity as a single assistant row (no paired user row)
          // so it restores exactly once on refresh.
          void fetch('/api/studio/turn/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convId,
              title,
              description,
              action,
              suggestions: activitySuggestions,
              imageThumb,
            }),
          })
        }
        // Also snapshot the canvas now — pushActivity is the natural hook for
        // "AI just produced an asset" so the latest activeImageUrl is in state.
        snapshotNow()
      },
      [studioSession, snapshotNow]
    )

    const sendMessage = async (rawText: string) => {
      // Append any successfully uploaded attachments to the message body
      // using the chat convention "[Arquivos anexados — URLs públicas]".
      const uploadedUrls = pendingUploads
        .filter((p) => p.status === 'done' && p.url)
        .map((p) => p.url as string)
      const text =
        uploadedUrls.length > 0
          ? `${rawText.trim()}\n\n[Arquivos anexados — URLs públicas]\n${uploadedUrls.join('\n')}`.trim()
          : rawText
      if (!text.trim() || isThinking) return
      // Clear pending uploads once consumed
      if (uploadedUrls.length > 0) {
        setPendingUploads((prev) => prev.filter((p) => p.status === 'uploading'))
      }
      if (
        messages.filter((m) => !isActivity(m) && (m as ChatMessage).role === 'user').length === 0
      ) {
        onFirstMessage?.(text)
      }
      const currentAttached = [...attachedImages]
      const userMsg: ChatMessage = {
        role: 'user',
        content: text,
        attachedImages: currentAttached.length > 0 ? currentAttached : undefined,
      }
      setMessages((prev) => [...prev, userMsg])
      setInputValue('')
      setAttachedImages([])
      setIsThinking(true)
      try {
        const chatHistory = messages
          .filter((m) => !isActivity(m))
          .map((m) => {
            const cm = m as ChatMessage
            if (cm.attachedImages && cm.attachedImages.length > 0) {
              return {
                role: cm.role,
                content: [
                  ...cm.attachedImages.map((img) => ({
                    type: 'image_url' as const,
                    image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
                  })),
                  { type: 'text' as const, text: cm.content },
                ],
              }
            }
            return { role: cm.role, content: cm.content }
          })
        if (currentAttached.length > 0) {
          chatHistory.push({
            role: 'user',
            content: [
              ...currentAttached.map((img) => ({
                type: 'image_url' as const,
                image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
              })),
              { type: 'text' as const, text },
            ],
          })
        } else {
          chatHistory.push({ role: 'user', content: text })
        }

        if (agentMode) {
          // Agent mode: call gemini-generate for markdown documents
          const { data, error } = await supabase.functions.invoke('gemini-generate', {
            body: {
              prompt: text,
              model: 'gemini-2.5-flash',
              responseType: 'text',
              systemPrompt: agentSystemPrompt || '',
            },
          })
          if (error) throw error
          const markdown = data?.text ?? ''
          if (!markdown) throw new Error('Resposta vazia')

          // Extract title from first heading
          const titleMatch = markdown.match(/^#\s+(.+)$/m)
          const title = titleMatch?.[1]?.trim() ?? text.slice(0, 50)

          // Send markdown to artifact panel
          onDocumentGenerated?.(markdown, title)

          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: 'Documento gerado com sucesso.',
            actions: [{ icon: '✦', label: title }],
            followUps: ['Ajuste ou peça outro documento.'],
          }
          setMessages((prev) => [...prev, assistantMsg])
          await studioSession.persistTurn({
            userMessage: text,
            assistantMessage: assistantMsg.content,
            metadata: { engine: 'gemini-generate', mode: 'agent' },
          })
          snapshotNow()
        } else {
          // Studio mode: use studio-chat edge function on RELAY project (apsfeutbqvgfgznmaesg)
          // which has the updated prompt with workspace tools + anti-hallucination guardrails.
          // We use the standard relay browser client (cookie-based session via @supabase/ssr)
          // so the edge function receives the user's JWT for verify_jwt: true.
          const relaySupabase = createRelaySupabase()
          const { data, error } = await relaySupabase.functions.invoke('studio-chat', {
            body: { messages: chatHistory, creativeState },
          })

          if (error) throw error
          if (data?.error) throw new Error(data.error)

          const result = data
          const executedActions: { icon: string; label: string }[] = []

          if (result.actions && Array.isArray(result.actions)) {
            let hasShowStyles = false
            const hasGenerateInBatch = result.actions.some((a: any) => a.type === 'generate_image')

            // If set_style + generate_image in same batch, resolve the style and attach as override
            let batchStyleOverride: any = null
            if (hasGenerateInBatch) {
              const setStyleAction = result.actions.find((a: any) => a.type === 'set_style')
              if (setStyleAction && imageStyles?.length) {
                batchStyleOverride =
                  imageStyles.find(
                    (s) =>
                      s.id === setStyleAction.value ||
                      s.name.toLowerCase() === setStyleAction.value?.toLowerCase()
                  ) ?? null
              }
            }

            for (const action of result.actions) {
              if (action.type === 'show_styles') {
                hasShowStyles = true
                continue // handled after the loop
              }
              // If set_style + generate_image in same batch, skip auto-gen in set_style
              if (action.type === 'set_style' && hasGenerateInBatch) {
                action.__skipGenerate = true
              }
              // Attach styleOverride to generate_image so it uses the correct style
              if (action.type === 'generate_image' && batchStyleOverride) {
                action.__styleOverride = batchStyleOverride
              }
              const label =
                action.type === 'generate_image'
                  ? 'Gerando imagem...'
                  : action.type === 'generate_carousel'
                    ? 'Gerando carrossel...'
                    : action.type === 'set_heading' || action.type === 'add_text_box'
                      ? 'Aplicando texto...'
                      : action.type === 'set_style'
                        ? 'Aplicando estilo...'
                        : action.type === 'set_channel'
                          ? 'Ajustando formato...'
                          : action.type === 'set_font'
                            ? 'Trocando fonte...'
                            : action.type === 'set_overlay_color' ||
                                action.type === 'set_overlay_opacity'
                              ? 'Ajustando overlay...'
                              : action.type === 'add_widget'
                                ? 'Adicionando widget...'
                                : ''
              if (label) setCurrentActionLabel(label)
              const executed = await onAction(action)
              if (executed) executedActions.push(executed)
            }
            if (executedActions.length > 0) onArtifactReady()

            if (hasShowStyles && imageStyles && imageStyles.length > 0) {
              // Group styles by category
              const grouped = imageStyles.reduce(
                (acc, s) => {
                  const cat = s.category ?? 'other'
                  if (!acc[cat]) acc[cat] = []
                  acc[cat].push(s)
                  return acc
                },
                {} as Record<string, typeof imageStyles>
              )

              const styleMsg: QualificationMessage = {
                role: 'assistant',
                content: result.message || 'Escolha o estilo:',
                type: 'qualification',
                chips: imageStyles.map((s) => s.name),
                _styleChips: { grouped, allStyles: imageStyles },
                onChipClick: (chipLabel: string) => {
                  const style = imageStyles.find((s) => s.name === chipLabel)
                  if (style) {
                    setMessages((prev) => [
                      ...prev,
                      { role: 'user', content: chipLabel } as ChatMessage,
                    ])
                    onGenerateWithStyle?.(style.id)
                  }
                },
              } as any
              setMessages((prev) => [...prev, styleMsg])
              setIsThinking(false)
              setCurrentActionLabel('')
              return // skip normal assistant message
            }
          }

          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: result.message || 'Pronto!',
            actions: executedActions.length > 0 ? executedActions : undefined,
            followUps: result.follow_ups ?? [],
          }
          setMessages((prev) => [...prev, assistantMsg])
          await studioSession.persistTurn({
            userMessage: text,
            assistantMessage: assistantMsg.content,
            metadata: {
              engine: 'studio-chat',
              mode: 'canvas',
              actions: executedActions.map((a) => a.label),
            },
          })
          snapshotNow()
        }
      } catch (err: any) {
        console.error('Chat error:', err)
        const errorMessage = err?.message?.includes('Rate limit')
          ? 'Muitas requisições. Aguarde um momento e tente novamente.'
          : err?.message?.includes('Payment')
            ? 'Créditos insuficientes. Adicione fundos para continuar.'
            : 'Não consegui processar esse pedido. Tente novamente.'
        setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }])
        toast.error('Erro ao processar mensagem')
      } finally {
        setCurrentActionLabel('')
        setIsThinking(false)
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        pushActivity,
        sendMessage,
        clearMessages: () => {
          setMessages([])
          setCollapsedCards(new Set())
        },
        getMessages: () => messages,
        setMessages: (msgs: DisplayMessage[]) => {
          setMessages(msgs)
        },
        pushQualificationMessage: ({
          question,
          chips,
          onSkip,
        }: {
          question: string
          chips?: string[]
          onSkip?: () => void
        }) => {
          const msg: QualificationMessage = {
            role: 'assistant',
            content: question,
            type: 'qualification',
            chips,
            onChipClick: (chip: string) => {
              if (chip.startsWith('→')) {
                onSkip?.()
              } else {
                setMessages((prev) => [...prev, { role: 'user' as const, content: chip }])
                onQualificationAnswer?.(chip)
              }
            },
            onSkip,
          }
          setMessages((prev) => [...prev, msg])
        },
        pushAssistantMessage: ({ content, chips, onChipClick }) => {
          // No chips → render as a regular ChatMessage so ReactMarkdown picks
          // it up (the QualificationMessage path renders raw text and breaks
          // **bold**, lists, etc.). Tool-result summaries take this path.
          if (!chips || chips.length === 0) {
            const msg: ChatMessage = { role: 'assistant', content }
            setMessages((prev) => [...prev, msg])
            return
          }
          const msg: QualificationMessage = {
            role: 'assistant',
            content,
            type: 'qualification',
            chips: chips.map((c) => c.label),
            onChipClick: (label: string) => {
              const chip = chips.find((c) => c.label === label)
              if (chip) onChipClick?.(chip)
              setMessages((prev) => [...prev, { role: 'user' as const, content: label }])
            },
          }
          setMessages((prev) => [...prev, msg])
        },
        pushStylePickerMessage: ({
          question,
          styles,
          onSelect,
          onSkip,
        }: {
          question: string
          styles: StylePickerStyle[]
          onSelect: (styleId: string, styleName: string) => void
          onSkip: () => void
        }) => {
          const msg: StylePickerMessage = {
            role: 'assistant',
            content: question,
            type: 'style-picker',
            styles,
            onStyleSelect: onSelect,
            onSkip,
          }
          setMessages((prev) => [...prev, msg])
        },
      }),
      [pushActivity, sendMessage, messages, onQualificationAnswer]
    )

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOver(true)
    }
    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOver(false)
    }
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOver(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
      if (!files.length || !onReferenceImageDrop) return
      files.slice(0, 3).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string
          const base64 = dataUrl.split(',')[1]
          onReferenceImageDrop(base64, file.type || 'image/jpeg', dataUrl)
          sendMessage(
            `Usei essa imagem como referência visual. Gera uma imagem com esse estilo para a campanha ${creativeState.campaign}.`
          )
        }
        reader.readAsDataURL(file)
      })
    }

    const startInlineStylePick = (withProduct: boolean) => {
      setInlineFlow({ type: 'pick-style', withProduct })
      const msg: ActivityMessage = {
        id: `flow-${Date.now()}`,
        type: 'activity',
        action: withProduct ? 'pick-style-with-product' : 'pick-style',
        title: withProduct ? 'produto em cena real' : 'escolha um estilo',
        description: 'como você quer que a imagem fique?',
        suggestions: [],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
    }

    const handleChipAction = (action: string, label?: string) => {
      // Pure-link action: open the URL natively and stop. No chat turn.
      if (typeof action === 'string' && action.startsWith('__connect_url:')) {
        const href = action.slice('__connect_url:'.length)
        try {
          window.open(href, '_blank', 'noopener')
        } catch {
          /* ignore */
        }
        return
      }
      // Intercept image gen actions → inline flow
      if (action === 'open_image_gen') {
        startInlineStylePick(false)
        return
      }
      if (action === 'open_image_gen_with_product') {
        startInlineStylePick(true)
        return
      }
      if (action === 'generate_lifestyle') {
        onGenerateWithStyle?.('product-lifestyle')
        return
      }

      const directActions = [
        'generate_carousel',
        'open_publish',
        'open_schedule',
        'open_scan',
        'open_calendar',
        'new_asset',
        'regenerate_image',
        'show_text',
        'generate_caption',
        'generate_email',
        'open_style_variant',
        'apply_style_product_attributes',
        'open_video_panel',
        'feedback_like',
        'feedback_dislike',
      ]
      if (directActions.includes(action)) {
        onSuggestionAction?.(action)
        return
      }
      if (label) sendMessage(label)
    }

    const toggleCardCollapse = (id: string) => {
      setCollapsedCards((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    return (
      <>
        <style>{`
        @keyframes bounceDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes chipFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            background: '#FAFAFA',
            position: 'relative',
            transition: 'all 0.15s',
            outline: isDraggingOver ? '2px dashed #1A1A1A' : '2px dashed transparent',
            outlineOffset: '-4px',
          }}
        >
          {/* Drag overlay */}
          {isDraggingOver && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 50,
                background: 'rgba(255,255,255,0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                pointerEvents: 'none',
              }}
            >
              <ImageIcon size={32} style={{ color: '#1A1A1A' }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
                Solte para usar como referência
              </p>
            </div>
          )}

          {/* Gradient divider between header and content */}
          <div
            style={{
              height: 12,
              flexShrink: 0,
              background: 'linear-gradient(to bottom, #FAFAFA, transparent)',
              pointerEvents: 'none',
            }}
          />

          {/* Scroll area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '8px 16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Welcome state — only show when canvas is empty */}
            {messages.length === 0 && !creativeState.hasImage && !suppressWelcome && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#1A1A1A',
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {agentMode ? 'que documento você precisa?' : 'seu próximo post começa aqui.'}
                  </p>
                  <p style={{ fontSize: 12, color: '#999', margin: 0, lineHeight: 1.5 }}>
                    {agentMode
                      ? 'relatórios, briefs, calendários e análises.'
                      : 'descreve o visual ou escolhe um atalho abaixo.'}
                  </p>
                </div>

                <div style={{ height: 1, background: '#F0F0F0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(agentMode
                    ? [
                        {
                          text: 'relatório de performance semanal',
                          action:
                            'Gerar relatório completo de performance da loja nesta semana: vendas, conversão, carrinhos abandonados, top produtos e ações dos agentes',
                        },
                        {
                          text: 'calendário editorial do mês',
                          action:
                            'Criar calendário editorial completo para o próximo mês com datas sazonais, sugestões de conteúdo por canal e copy para cada data',
                        },
                        {
                          text: 'brief de campanha',
                          action:
                            'Gerar brief completo para campanha do Dia das Mães: objetivo, público, mensagem, canais, cronograma e KPIs',
                        },
                        {
                          text: 'análise de churn',
                          action:
                            'Analisar clientes em risco de churn nesta semana e gerar plano de retenção com ações prioritárias',
                        },
                      ]
                    : [
                        { text: 'gerar imagem que para o scroll', action: 'open_image_gen' },
                        { text: 'lifestyle que gera desejo', action: 'generate_lifestyle' },
                        { text: 'produto em cena real', action: 'open_image_gen_with_product' },
                        { text: 'carrossel que retém até o fim', action: 'generate_carousel' },
                      ]
                  ).map((s, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        agentMode ? sendMessage(s.action) : handleChipAction(s.action)
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 4px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'transparent',
                        fontSize: 12,
                        fontWeight: 400,
                        color: '#888',
                        textAlign: 'left' as const,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        animation: `chipFadeIn 0.25s ease forwards`,
                        animationDelay: `${i * 60}ms`,
                        opacity: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A1A')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
                    >
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
                        ↳
                      </span>
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => {
              // Inline style picker card
              if (
                isActivity(msg) &&
                (msg.action === 'pick-style' || msg.action === 'pick-style-with-product')
              ) {
                const withProduct = msg.action === 'pick-style-with-product'
                return (
                  <div
                    key={msg.id}
                    style={{
                      background: 'rgba(0,0,0,0.025)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      animation: 'fadeInUp 0.2s ease',
                    }}
                  >
                    <div style={{ padding: '12px 14px 8px' }}>
                      <span style={{ fontSize: 12, fontWeight: 400, color: '#AAA' }}>
                        {msg.title}
                      </span>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#1A1A1A',
                          margin: '2px 0 0',
                          fontWeight: 400,
                        }}
                      >
                        {msg.description}
                      </p>
                    </div>
                    <div
                      style={{
                        padding: '0 14px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {(imageStyles ?? []).map((style, si) => (
                        <button
                          key={style.id}
                          onClick={() => {
                            if (withProduct && products && products.length > 1) {
                              setInlineFlow({ type: 'pick-product', styleId: style.id })
                              const pickMsg: ActivityMessage = {
                                id: `flow-prod-${Date.now()}`,
                                type: 'activity',
                                action: 'pick-product',
                                title: `estilo ${style.name.toLowerCase()} selecionado`,
                                description: 'qual produto quer usar?',
                                suggestions: [],
                                timestamp: new Date(),
                              }
                              ;(pickMsg as any).styleId = style.id
                              setMessages((prev) => [...prev, pickMsg])
                            } else {
                              const productId = products?.[0]?.id
                              onGenerateWithStyle?.(style.id, productId)
                              setInlineFlow(null)
                              setMessages((prev) =>
                                prev.map((m) =>
                                  isActivity(m) && m.id === msg.id
                                    ? { ...m, description: `${style.name} — gerando...` }
                                    : m
                                )
                              )
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(0,0,0,0.06)',
                            background: 'rgba(255,255,255,0.8)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.1s',
                            textAlign: 'left' as const,
                            animation: 'chipFadeIn 0.2s ease forwards',
                            animationDelay: `${si * 40}ms`,
                            opacity: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FFF'
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: style.color ?? '#EEE',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1A1A' }}>
                            {style.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }

              // Inline product picker card
              if (isActivity(msg) && msg.action === 'pick-product') {
                const styleId = (msg as any).styleId
                return (
                  <div
                    key={msg.id}
                    style={{
                      background: 'rgba(0,0,0,0.025)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      animation: 'fadeInUp 0.2s ease',
                    }}
                  >
                    <div style={{ padding: '12px 14px 8px' }}>
                      <span style={{ fontSize: 12, color: '#AAA' }}>{msg.title}</span>
                      <p style={{ fontSize: 12, color: '#1A1A1A', margin: '2px 0 0' }}>
                        {msg.description}
                      </p>
                    </div>
                    <div
                      style={{
                        padding: '0 14px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {(products ?? []).map((product, pi) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            onGenerateWithStyle?.(styleId, product.id)
                            setInlineFlow(null)
                            setMessages((prev) =>
                              prev.map((m) =>
                                isActivity(m) && m.id === msg.id
                                  ? { ...m, description: `${product.name} — gerando...` }
                                  : m
                              )
                            )
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(0,0,0,0.06)',
                            background: 'rgba(255,255,255,0.8)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.1s',
                            textAlign: 'left' as const,
                            animation: 'chipFadeIn 0.2s ease forwards',
                            animationDelay: `${pi * 40}ms`,
                            opacity: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FFF'
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'
                          }}
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1A1A' }}>
                            {product.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }

              // Activity card
              if (isActivity(msg)) {
                const isCollapsed = collapsedCards.has(msg.id)
                const feedbackIds = ['like', 'dislike', 'retry']
                const feedbackSuggestions = msg.suggestions.filter((s) =>
                  feedbackIds.includes(s.id)
                )
                const nextStepSuggestions = msg.suggestions.filter(
                  (s) => !feedbackIds.includes(s.id)
                )
                const hasFeedback = feedbackSuggestions.length > 0
                const hasNextSteps = nextStepSuggestions.length > 0

                return (
                  <div
                    key={msg.id}
                    style={{
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      animation: 'fadeInUp 0.2s ease',
                    }}
                  >
                    {/* Header — always visible, clickable to collapse */}
                    <div
                      onClick={() => toggleCardCollapse(msg.id)}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                      }}
                    >
                      {msg.imageThumb && (
                        <img
                          src={msg.imageThumb}
                          alt=""
                          onClick={(e) => {
                            e.stopPropagation()
                            onSuggestionAction?.(`preview_image:${msg.imageThumb}`)
                          }}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 7,
                            objectFit: 'cover',
                            flexShrink: 0,
                            cursor: 'pointer',
                          }}
                          title="Abrir no canvas"
                        />
                      )}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1A1A' }}>
                          {msg.title}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#999' }}>
                          {msg.description}
                        </span>
                      </div>

                      {/* Collapse toggle */}
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: '#CCC',
                        }}
                      >
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </div>
                    </div>

                    {/* Collapsible body */}
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Feedback buttons */}
                        {hasFeedback && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            {feedbackSuggestions.map((s, si) => {
                              const IconComp =
                                s.id === 'like'
                                  ? ThumbsUp
                                  : s.id === 'dislike'
                                    ? ThumbsDown
                                    : RotateCcw
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => handleChipAction(s.action, s.label)}
                                  title={s.label}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 30,
                                    height: 30,
                                    borderRadius: 7,
                                    border: '1px solid #E8E8E8',
                                    background: 'transparent',
                                    color: '#BBB',
                                    cursor: 'pointer',
                                    transition: 'all 0.12s',
                                    animation: `chipFadeIn 0.2s ease forwards`,
                                    animationDelay: `${si * 60}ms`,
                                    opacity: 0,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#999'
                                    e.currentTarget.style.color = '#333'
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#E8E8E8'
                                    e.currentTarget.style.color = '#BBB'
                                    e.currentTarget.style.background = 'transparent'
                                  }}
                                >
                                  <IconComp size={13} strokeWidth={1.5} />
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Divider */}
                        {hasFeedback && hasNextSteps && (
                          <div style={{ height: 1, background: 'rgba(0,0,0,0.05)' }} />
                        )}

                        {/* Next step suggestions */}
                        {hasNextSteps && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {nextStepSuggestions.map((s, si) => {
                              const isLink =
                                typeof s.action === 'string' &&
                                s.action.startsWith('__connect_url:')
                              if (isLink) {
                                const href = s.action.slice('__connect_url:'.length)
                                return (
                                  <a
                                    key={s.id}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '8px 12px',
                                      background: '#1A1A1A',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: 10,
                                      fontSize: 13,
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                      fontFamily: 'inherit',
                                      textAlign: 'left' as const,
                                      animation: `chipFadeIn 0.2s ease forwards`,
                                      animationDelay: `${(feedbackSuggestions.length + si) * 60}ms`,
                                      opacity: 0,
                                      alignSelf: 'flex-start',
                                    }}
                                  >
                                    {s.label}
                                  </a>
                                )
                              }
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => handleChipAction(s.action, s.label)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 4px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#888',
                                    fontSize: 12,
                                    fontWeight: 400,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    textAlign: 'left' as const,
                                    borderRadius: 6,
                                    transition: 'color 0.1s',
                                    animation: `chipFadeIn 0.2s ease forwards`,
                                    animationDelay: `${(feedbackSuggestions.length + si) * 60}ms`,
                                    opacity: 0,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A1A')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: 'rgba(0,0,0,0.15)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    ↳
                                  </span>
                                  {s.label}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Fallback chips */}
                        {!hasFeedback && !hasNextSteps && msg.suggestions.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                            {msg.suggestions.map((s, si) => {
                              // Pure-link action: render as <a href> so the browser
                              // navigates natively, no JS, no chat loop.
                              if (
                                typeof s.action === 'string' &&
                                s.action.startsWith('__connect_url:')
                              ) {
                                const href = s.action.slice('__connect_url:'.length)
                                return (
                                  <a
                                    key={s.id}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      ...chipStyle,
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      animation: `chipFadeIn 0.2s ease forwards`,
                                      animationDelay: `${si * 60}ms`,
                                      opacity: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#1A1A1A'
                                      e.currentTarget.style.color = '#FFF'
                                      e.currentTarget.style.borderColor = '#1A1A1A'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#FFFFFF'
                                      e.currentTarget.style.color = '#555'
                                      e.currentTarget.style.borderColor = '#E8E8E8'
                                    }}
                                  >
                                    {s.label}
                                  </a>
                                )
                              }
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => handleChipAction(s.action, s.label)}
                                  style={{
                                    ...chipStyle,
                                    animation: `chipFadeIn 0.2s ease forwards`,
                                    animationDelay: `${si * 60}ms`,
                                    opacity: 0,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#1A1A1A'
                                    e.currentTarget.style.color = '#FFF'
                                    e.currentTarget.style.borderColor = '#1A1A1A'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#FFFFFF'
                                    e.currentTarget.style.color = '#555'
                                    e.currentTarget.style.borderColor = '#E8E8E8'
                                  }}
                                >
                                  {s.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // Qualification message
              if (isQualification(msg)) {
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 4,
                      animation: 'fadeInUp 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 14,
                          fontSize: 13,
                          lineHeight: 1.5,
                          background: '#FFFFFF',
                          color: '#1A1A1A',
                          border: '1px solid #EBEBEB',
                          borderBottomLeftRadius: 4,
                        }}
                      >
                        <p style={{ margin: 0 }}>{msg.content}</p>
                      </div>

                      {!msg.answered &&
                        msg.chips &&
                        (() => {
                          const styleData = (msg as any)._styleChips as
                            | {
                                grouped: Record<string, typeof imageStyles>
                                allStyles: typeof imageStyles
                              }
                            | undefined
                          const categoryLabels: Record<string, string> = {
                            photo: 'Fotografia',
                            illustration: 'Ilustracao',
                            design: 'Design',
                            '3d': '3D',
                            other: 'Outros',
                          }
                          const markAnswered = () =>
                            setMessages((prev) =>
                              prev.map((m, mi) =>
                                mi === i && isQualification(m) ? { ...m, answered: true } : m
                              )
                            )

                          if (styleData) {
                            const allStylesList = Object.values(styleData.grouped).flat()
                            return (
                              <div style={{ marginTop: 8 }}>
                                {/* Style grid — same layout as ProductPicker */}
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 6,
                                    marginBottom: 6,
                                  }}
                                >
                                  {(allStylesList ?? []).map((s: any) => (
                                    <button
                                      key={s.id}
                                      onClick={() => {
                                        markAnswered()
                                        msg.onChipClick?.(s.name)
                                      }}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column' as const,
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '6px 4px',
                                        borderRadius: 8,
                                        border: '1px solid #EEEDE9',
                                        background: '#FAFAF8',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.12s',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#F0F0EE'
                                        e.currentTarget.style.borderColor = '#DDD'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#FAFAF8'
                                        e.currentTarget.style.borderColor = '#EEEDE9'
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: '100%',
                                          aspectRatio: '1/1',
                                          borderRadius: 6,
                                          overflow: 'hidden',
                                          background: '#F0F0EE',
                                        }}
                                      >
                                        {s.thumbnailUrl ? (
                                          <img
                                            src={s.thumbnailUrl}
                                            alt={s.name}
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
                                              fontSize: 16,
                                              opacity: 0.3,
                                            }}
                                          >
                                            <Palette size={16} />
                                          </div>
                                        )}
                                      </div>
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: '#555',
                                          textAlign: 'center' as const,
                                          lineHeight: 1.3,
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical' as const,
                                          overflow: 'hidden',
                                          width: '100%',
                                        }}
                                      >
                                        {s.name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div
                              style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}
                            >
                              {msg.chips.map((chip, ci) => (
                                <button
                                  key={chip}
                                  onClick={() => {
                                    markAnswered()
                                    msg.onChipClick?.(chip)
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: 999,
                                    border: chip.startsWith('→')
                                      ? '1px solid #1A1A1A'
                                      : '1px solid #E8E8E8',
                                    background: chip.startsWith('→') ? '#1A1A1A' : '#FFFFFF',
                                    color: chip.startsWith('→') ? '#FFF' : '#555',
                                    fontSize: 12,
                                    fontWeight: 400,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.12s',
                                    animation: `chipFadeIn 0.2s ease forwards`,
                                    animationDelay: `${ci * 50}ms`,
                                    opacity: 0,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#1A1A1A'
                                    e.currentTarget.style.color = '#FFF'
                                    e.currentTarget.style.borderColor = '#1A1A1A'
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!chip.startsWith('→')) {
                                      e.currentTarget.style.background = '#FFFFFF'
                                      e.currentTarget.style.color = '#555'
                                      e.currentTarget.style.borderColor = '#E8E8E8'
                                    }
                                  }}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          )
                        })()}

                      {!msg.answered &&
                        !msg.chips &&
                        (products && products.length > 0 ? (
                          <ProductPicker
                            products={products}
                            onSelect={(product) => {
                              setMessages((prev) =>
                                prev.map((m, mi) =>
                                  mi === i && isQualification(m) ? { ...m, answered: true } : m
                                )
                              )
                              setMessages((prev) => [
                                ...prev,
                                { role: 'user' as const, content: product.name },
                              ])
                              onQualificationAnswer?.(product.name)
                            }}
                            onSkip={() => {
                              setMessages((prev) =>
                                prev.map((m, mi) =>
                                  mi === i && isQualification(m) ? { ...m, answered: true } : m
                                )
                              )
                              msg.onSkip?.()
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <input
                              autoFocus
                              placeholder="Digite aqui..."
                              style={{
                                flex: 1,
                                padding: '7px 12px',
                                borderRadius: 8,
                                border: '1px solid #E8E8E8',
                                background: '#FFFFFF',
                                color: '#1A1A1A',
                                fontSize: 13,
                                outline: 'none',
                                fontFamily: 'inherit',
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                  const val = e.currentTarget.value.trim()
                                  setMessages((prev) =>
                                    prev.map((m, mi) =>
                                      mi === i && isQualification(m) ? { ...m, answered: true } : m
                                    )
                                  )
                                  msg.onChipClick?.(val)
                                }
                              }}
                            />
                            {msg.onSkip && (
                              <button
                                onClick={() => {
                                  setMessages((prev) =>
                                    prev.map((m, mi) =>
                                      mi === i && isQualification(m) ? { ...m, answered: true } : m
                                    )
                                  )
                                  msg.onSkip?.()
                                }}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #E8E8E8',
                                  background: 'transparent',
                                  color: '#999',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Pular
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )
              }

              // Style picker message
              if (isStylePicker(msg)) {
                const markAnswered = () =>
                  setMessages((prev) =>
                    prev.map((m, mi) =>
                      mi === i && isStylePicker(m) ? { ...m, answered: true } : m
                    )
                  )
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 4,
                      animation: 'fadeInUp 0.2s ease',
                    }}
                  >
                    <div
                      style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 4 }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 14,
                          fontSize: 13,
                          lineHeight: 1.5,
                          background: '#FFFFFF',
                          color: '#1A1A1A',
                          border: '1px solid #EBEBEB',
                          borderBottomLeftRadius: 4,
                        }}
                      >
                        <p style={{ margin: 0 }}>{msg.content}</p>
                      </div>

                      {!msg.answered && (
                        <div style={{ marginTop: 10 }}>
                          {/* Grid 3 colunas — só thumb + nome, SEM card/border */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: 10,
                              marginBottom: 10,
                            }}
                          >
                            {msg.styles.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  markAnswered()
                                  setMessages((prev) => [
                                    ...prev,
                                    { role: 'user' as const, content: s.name },
                                  ])
                                  msg.onStyleSelect?.(s.id, s.name)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  textAlign: 'center' as const,
                                  display: 'flex',
                                  flexDirection: 'column' as const,
                                  alignItems: 'center',
                                  gap: 6,
                                  transition: 'opacity 0.12s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.7'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1'
                                }}
                              >
                                <div
                                  style={{
                                    width: '100%',
                                    aspectRatio: '1/1',
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                    background: '#F0F0EE',
                                    flexShrink: 0,
                                  }}
                                >
                                  {s.thumbnailUrl ? (
                                    <img
                                      src={s.thumbnailUrl}
                                      alt={s.name}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover' as const,
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
                                        fontSize: 20,
                                        opacity: 0.3,
                                      }}
                                    >
                                      🖼
                                    </div>
                                  )}
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 500,
                                    color: '#888',
                                    lineHeight: 1.3,
                                    textAlign: 'center' as const,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical' as const,
                                    overflow: 'hidden',
                                    width: '100%',
                                  }}
                                >
                                  {s.name}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Ver todos */}
                          <button
                            onClick={() => {
                              markAnswered()
                              setMessages((prev) => [
                                ...prev,
                                { role: 'user' as const, content: 'ver todos os estilos' },
                              ])
                              onAction?.({ type: 'show_styles' })
                            }}
                            style={{
                              width: '100%',
                              padding: '7px 0',
                              marginBottom: 6,
                              borderRadius: 8,
                              border: '1px solid #E8E8E8',
                              background: 'transparent',
                              color: '#999',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#F5F5F3'
                              e.currentTarget.style.color = '#1A1A1A'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = '#999'
                            }}
                          >
                            Ver todos os estilos
                          </button>

                          {/* Gerar sem estilo */}
                          <button
                            onClick={() => {
                              markAnswered()
                              setMessages((prev) => [
                                ...prev,
                                { role: 'user' as const, content: 'gerar agora' },
                              ])
                              msg.onSkip?.()
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 0',
                              borderRadius: 8,
                              border: 'none',
                              background: '#1A1A1A',
                              color: '#FFF',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#333'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#1A1A1A'
                            }}
                          >
                            Gerar agora
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              // Chat message
              const chatMsg = msg as ChatMessage
              const isUser = chatMsg.role === 'user'
              const parsed = isUser ? null : parseOrchestratorResponse(chatMsg.content)
              const displayText = parsed?.text ?? chatMsg.content
              const parsedFollowUps = parsed?.followUps ?? []
              const mergedFollowUps = Array.from(
                new Set([...(chatMsg.followUps ?? []), ...parsedFollowUps])
              )
              // Inline image URL detection (jpg/png/webp/gif/svg)
              const imageUrlMatches = !isUser
                ? Array.from(
                    displayText.matchAll(/(https?:\/\/[^\s)]+\.(?:jpe?g|png|webp|gif|svg))/gi)
                  ).map((m) => m[0])
                : []
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: 4,
                  }}
                >
                  <div
                    style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 4 }}
                  >
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 14,
                        fontSize: 13,
                        lineHeight: 1.5,
                        ...(isUser
                          ? { background: '#F0F0F0', color: '#1A1A1A', borderBottomRightRadius: 4 }
                          : {
                              background: '#FFFFFF',
                              color: '#1A1A1A',
                              border: '1px solid #EBEBEB',
                              borderBottomLeftRadius: 4,
                            }),
                      }}
                    >
                      {isUser ? (
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{displayText}</p>
                      ) : (
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <p style={{ margin: '0 0 8px', lineHeight: 1.5 }}>{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul
                                  style={{
                                    margin: '0 0 8px',
                                    paddingLeft: 16,
                                    listStyleType: 'disc',
                                  }}
                                >
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol
                                  style={{
                                    margin: '0 0 8px',
                                    paddingLeft: 16,
                                    listStyleType: 'decimal',
                                  }}
                                >
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                              strong: ({ children }) => (
                                <strong style={{ fontWeight: 600 }}>{children}</strong>
                              ),
                              em: ({ children }) => <em>{children}</em>,
                              code: ({ children, className }) => {
                                const isBlock = className?.includes('language-')
                                return isBlock ? (
                                  <code
                                    style={{
                                      display: 'block',
                                      background: '#F4F4F4',
                                      padding: '8px 12px',
                                      borderRadius: 8,
                                      fontFamily: 'monospace',
                                      fontSize: 12,
                                      overflowX: 'auto',
                                    }}
                                  >
                                    {children}
                                  </code>
                                ) : (
                                  <code
                                    style={{
                                      background: '#F4F4F4',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      fontFamily: 'monospace',
                                      fontSize: 12,
                                    }}
                                  >
                                    {children}
                                  </code>
                                )
                              },
                              pre: ({ children }) => (
                                <pre style={{ margin: '0 0 8px' }}>{children}</pre>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#2563eb', textDecoration: 'underline' }}
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {displayText}
                          </ReactMarkdown>
                          {imageUrlMatches.length > 0 && (
                            <div
                              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}
                            >
                              {imageUrlMatches.slice(0, 4).map((url, ii) => (
                                <img
                                  key={ii}
                                  src={url}
                                  alt=""
                                  style={{
                                    maxWidth: 240,
                                    maxHeight: 240,
                                    borderRadius: 8,
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    objectFit: 'cover',
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {chatMsg.attachedImages && chatMsg.attachedImages.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            flexWrap: 'wrap' as const,
                            marginTop: 6,
                          }}
                        >
                          {chatMsg.attachedImages.map((img, ai) => (
                            <img
                              key={ai}
                              src={img.dataUrl}
                              alt=""
                              style={{
                                width: 60,
                                height: 60,
                                borderRadius: 8,
                                objectFit: 'cover',
                                border: '1px solid rgba(0,0,0,0.08)',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {chatMsg.actions && chatMsg.actions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {chatMsg.actions.map((action, j) => (
                          <span
                            key={j}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 10px',
                              borderRadius: 999,
                              background: '#F2F2F2',
                              fontSize: 11,
                              color: '#555',
                            }}
                          >
                            {action.icon} {action.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {!isUser &&
                      mergedFollowUps.length > 0 &&
                      i === messages.length - 1 &&
                      !isThinking && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                          {mergedFollowUps.map((suggestion, j) => (
                            <button
                              key={j}
                              onClick={() => sendMessage(suggestion)}
                              style={{
                                ...chipStyle,
                                animation: `chipFadeIn 0.2s ease forwards`,
                                animationDelay: `${j * 60}ms`,
                                opacity: 0,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#1A1A1A'
                                e.currentTarget.style.color = '#FFF'
                                e.currentTarget.style.borderColor = '#1A1A1A'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FFFFFF'
                                e.currentTarget.style.color = '#555'
                                e.currentTarget.style.borderColor = '#E8E8E8'
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )
            })}

            {/* Thinking indicator */}
            {isThinking && (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 14,
                  borderBottomLeftRadius: 4,
                  background: '#FFFFFF',
                  border: '1px solid #EBEBEB',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  alignSelf: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#1A1A1A',
                        animation: 'bounceDot 1.2s infinite',
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{ fontSize: 12, color: '#888', fontWeight: 400, fontFamily: 'inherit' }}
                >
                  {currentActionLabel || 'processando...'}
                </span>
              </div>
            )}
          </div>

          {/* Input area */}
          <div
            style={{
              padding: '12px 14px 14px',
              background: 'transparent',
              flexShrink: 0,
              maxHeight: '40%',
              overflowY: 'auto',
              boxSizing: 'border-box' as const,
            }}
          >
            {/* Reference image upload buttons — outside chatbox. Contextual. */}
            {showVisualUploads && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                {[
                  {
                    label: 'Referência de imagem',
                    icon: <ImageIcon size={14} style={{ color: '#999' }} />,
                  },
                  { label: 'Produto', icon: <Package size={14} style={{ color: '#999' }} /> },
                ].map((btn, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px dashed #E0E0E0',
                      background: '#FAFAFA',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontSize: 11,
                      color: '#999',
                      textAlign: 'left' as const,
                      lineHeight: 1.3,
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#CCC'
                      e.currentTarget.style.background = '#F5F5F5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E0E0E0'
                      e.currentTarget.style.background = '#FAFAFA'
                    }}
                  >
                    {btn.icon}
                    <span>{btn.label}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file?.type.startsWith('image/')) return
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string
                          const base64 = dataUrl.split(',')[1]
                          if (idx === 0) {
                            onReferenceImageDrop?.(base64, file.type || 'image/jpeg', dataUrl)
                          }
                          setAttachedImages((prev) => [
                            ...prev.slice(-3),
                            { dataUrl, base64, mimeType: file.type as 'image/jpeg' | 'image/png' },
                          ])
                        }
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
            <div
              style={{
                background: '#FFFFFF',
                border: `1.5px solid ${isDraggingOver ? '#1A1A1A' : '#E8E8E8'}`,
                borderRadius: 16,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: isDraggingOver
                  ? '0 4px 16px rgba(0,0,0,0.12)'
                  : '0 2px 12px rgba(0,0,0,0.06)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingOver(true)
              }}
              onDragLeave={(e) => {
                e.stopPropagation()
                setIsDraggingOver(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingOver(false)
                const file = e.dataTransfer.files[0]
                if (!file?.type.startsWith('image/')) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string
                  const base64 = dataUrl.split(',')[1]
                  setAttachedImages((prev) => [
                    ...prev.slice(-3),
                    { dataUrl, base64, mimeType: file.type as 'image/jpeg' | 'image/png' },
                  ])
                }
                reader.readAsDataURL(file)
              }}
              onFocusCapture={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = '#CCCCCC'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
              }}
              onBlurCapture={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E8E8E8'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
              }}
            >
              <textarea
                ref={inputRef}
                placeholder={
                  agentMode
                    ? 'Peça um relatório, brief, calendário...'
                    : 'Descreva o que quer criar...'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(inputValue)
                  }
                }}
                rows={1}
                style={{
                  width: '100%',
                  minHeight: 36,
                  maxHeight: 100,
                  padding: 0,
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: '#1A1A1A',
                  resize: 'none',
                  lineHeight: 1.5,
                  background: 'transparent',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              {attachedImages.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {attachedImages.map((img, i) => (
                    <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={img.dataUrl}
                        alt=""
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          objectFit: 'cover',
                          border: '1px solid #E8E8E8',
                          display: 'block',
                        }}
                      />
                      <button
                        onClick={() => setAttachedImages((prev) => prev.filter((_, j) => j !== i))}
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#1A1A1A',
                          border: '1.5px solid #FFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <X size={8} style={{ color: '#FFF' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {pendingUploads.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {pendingUploads.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 8px 4px 4px',
                        borderRadius: 8,
                        background: '#F6F6F6',
                        border: '1px solid #E8E8E8',
                        fontSize: 11,
                        color: '#555',
                        maxWidth: 200,
                      }}
                    >
                      {p.isImage && p.previewUrl ? (
                        <img
                          src={p.previewUrl}
                          alt=""
                          style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }}
                        />
                      ) : (
                        <FileText size={14} />
                      )}
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.name}
                      </span>
                      {p.status === 'uploading' && <Loader2 size={12} className="animate-spin" />}
                      {p.status === 'error' && <span style={{ color: '#EF4444' }}>!</span>}
                      <button
                        onClick={() =>
                          setPendingUploads((prev) => prev.filter((x) => x.id !== p.id))
                        }
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          color: '#999',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={paperclipInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.csv,.json,.md"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) handleFilePick(e.target.files)
                  e.target.value = ''
                }}
              />
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <button
                  type="button"
                  onClick={() => paperclipInputRef.current?.click()}
                  title="Anexar arquivo"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'transparent',
                    color: '#777',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F0F0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Paperclip size={15} />
                </button>
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isThinking}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: inputValue.trim() && !isThinking ? '#1A1A1A' : '#F0F0F0',
                    color: inputValue.trim() && !isThinking ? '#FFFFFF' : '#AAAAAA',
                    border: 'none',
                    cursor: !inputValue.trim() || isThinking ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {isThinking ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowUp size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
)
