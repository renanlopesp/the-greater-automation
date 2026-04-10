import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  Blocks,
  BookOpen,
  Box,
  Clock,
  FileText,
  GitBranch,
  Globe,
  Hash,
  Layers,
  Link,
  Mail,
  MessageCircle,
  Play,
  Rss,
  Send,
  Server,
  Sparkles,
  Table,
  UserCheck,
  Webhook,
  Wrench,
} from 'lucide-react'

/**
 * Icon registry for dynamic icon lookup in workflow editor components.
 * Only includes icons referenced by step-metadata.ts and trigger-metadata.ts,
 * avoiding `import * as LucideIcons` which pulls ~1000 icons into the bundle.
 */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  Blocks,
  BookOpen,
  Box,
  Clock,
  FileText,
  GitBranch,
  Github: GitBranch as LucideIcon,
  Globe,
  Hash,
  Layers,
  Linkedin: Link as LucideIcon,
  Mail,
  MessageCircle,
  Play,
  Rss,
  Send,
  Server,
  Sparkles,
  Table,
  UserCheck,
  Webhook,
  Wrench,
}

/**
 * Look up a Lucide icon by name. Returns undefined if icon is not in the registry.
 */
export function getIcon(name: string): LucideIcon | undefined {
  return ICON_REGISTRY[name]
}

/**
 * Render a Lucide icon by name. Stable component reference avoids the
 * react-hooks/static-components lint rule that fires when a dynamically
 * resolved component is stored in a render-local variable.
 */
export function DynamicIcon({
  name,
  fallback,
  ...props
}: { name: string; fallback?: string } & LucideProps) {
  const Icon = ICON_REGISTRY[name] ?? (fallback ? ICON_REGISTRY[fallback] : undefined)
  if (!Icon) return null
  return <Icon {...props} />
}
