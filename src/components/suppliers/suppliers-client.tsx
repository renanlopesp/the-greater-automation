'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useReorderTimeline } from '@/lib/queries/suppliers'
import SupplierList from './supplier-list'
import ReorderTimeline from './reorder-timeline'

interface SuppliersClientProps {
  storeId: string
  storeName: string
}

type Tab = 'suppliers' | 'reorder'

export default function SuppliersClient({ storeId, storeName }: SuppliersClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('suppliers')
  const { data: reorderData } = useReorderTimeline()

  const criticalCount = reorderData?.summary?.critical ?? 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
        <p className="text-muted-foreground text-sm">{storeName}</p>
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'suppliers'
              ? 'border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          )}
        >
          Fornecedores
        </button>
        <button
          onClick={() => setActiveTab('reorder')}
          className={cn(
            'relative -mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'reorder'
              ? 'border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          )}
        >
          Reposição
          {criticalCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
              {criticalCount}
            </Badge>
          )}
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <SupplierList storeId={storeId} />
      ) : (
        <ReorderTimeline storeId={storeId} />
      )}
    </div>
  )
}
