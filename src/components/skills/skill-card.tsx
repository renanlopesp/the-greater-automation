import Link from 'next/link'
import {
  Headphones,
  TrendingUp,
  Star,
  AlertTriangle,
  Crown,
  Smile,
  Target,
  Shield,
  AlertCircle,
  PenTool,
  Mail,
  Eye,
  DollarSign,
  Compass,
  BarChart2,
  Filter,
  GitBranch,
  Users,
  Search,
  ShoppingCart,
  ShieldCheck,
  CheckCircle,
  ListOrdered,
  FileText,
  Zap,
  Package,
  Fingerprint,
  PenLine,
  Calendar,
  LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { skillCategoryLabels, type SkillCategory } from '@/data/skills'

const ICON_MAP: Record<string, LucideIcon> = {
  headphones: Headphones,
  'trending-up': TrendingUp,
  star: Star,
  'alert-triangle': AlertTriangle,
  crown: Crown,
  smile: Smile,
  target: Target,
  shield: Shield,
  'alert-circle': AlertCircle,
  'pen-tool': PenTool,
  mail: Mail,
  eye: Eye,
  'dollar-sign': DollarSign,
  compass: Compass,
  'bar-chart-2': BarChart2,
  filter: Filter,
  'git-branch': GitBranch,
  users: Users,
  search: Search,
  'shopping-cart': ShoppingCart,
  'shield-check': ShieldCheck,
  'check-circle': CheckCircle,
  'list-ordered': ListOrdered,
  'file-text': FileText,
  zap: Zap,
  package: Package,
  fingerprint: Fingerprint,
  'pen-line': PenLine,
  calendar: Calendar,
}

export interface SkillCardProps {
  slug: string
  name: string
  description: string
  category: SkillCategory
  icon: string
  color: string
  isActive: boolean
}

export default function SkillCard({
  slug,
  name,
  description,
  category,
  icon,
  color,
  isActive,
}: SkillCardProps) {
  const Icon = ICON_MAP[icon] ?? Zap

  return (
    <Link href={`/skills/${slug}`}>
      <Card className="group relative flex h-[180px] flex-col overflow-hidden transition-shadow hover:shadow-md">
        {/* Status dot */}
        <span
          className={cn(
            'absolute top-3 right-3 h-2 w-2 rounded-full',
            isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
        <CardHeader className="flex flex-1 flex-col gap-2 pb-0">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="space-y-1">
            <p className="text-sm leading-tight font-semibold">{name}</p>
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {description}
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
          <Badge variant="secondary" className="text-[10px]">
            {skillCategoryLabels[category]}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
