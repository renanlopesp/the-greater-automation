'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Loader2,
  Filter,
  Percent,
  Upload,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingUp,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface Product {
  id: string
  name: string
  sku: string | null
  price: number | null
  cost_price: number | null
  stock_quantity: number
  is_published: boolean
  images: string[]
}

interface ProductsClientProps {
  products: Product[]
  storeId: string
  storeName: string
  chatAgentId: string | null
}

type SortKey = 'name' | 'sku' | 'price' | 'cost_price' | 'margin_pct' | 'margin_value'
type SortDir = 'asc' | 'desc'
type CostFilter = 'all' | 'no_cost' | 'has_cost'
type MarginFilter = 'all' | 'low' | 'medium' | 'high'

const PAGE_SIZES = [25, 50, 100] as const

function calcMargin(price: number | null, cost: number | null) {
  if (price == null || cost == null || price <= 0) return null
  return ((price - cost) / price) * 100
}

export default function ProductsClient({
  products: initial,
  storeId,
  storeName,
  chatAgentId,
}: ProductsClientProps) {
  const [products, setProducts] = useState(initial)
  const [search, setSearch] = useState('')
  const [costFilter, setCostFilter] = useState<CostFilter>('all')
  const [marginFilter, setMarginFilter] = useState<MarginFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkMargin, setBulkMargin] = useState('')
  const [applyingBulk, setApplyingBulk] = useState(false)
  const [csvMatches, setCsvMatches] = useState<
    | { productId: string; name: string; sku: string | null; price: number | null; cost: number }[]
    | null
  >(null)
  const [csvUnmatched, setCsvUnmatched] = useState<{ label: string; cost: number }[]>([])
  const [applyingCsv, setApplyingCsv] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Stats ---
  const stats = useMemo(() => {
    const withCost = products.filter((p) => p.cost_price != null)
    const margins = withCost
      .map((p) => calcMargin(p.price, p.cost_price))
      .filter((m): m is number => m != null)
    const avgMargin =
      margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null
    return {
      total: products.length,
      withCost: withCost.length,
      noCost: products.length - withCost.length,
      avgMargin,
    }
  }, [products])

  // --- Filter + Sort + Paginate ---
  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      // Cost filter
      if (costFilter === 'no_cost' && p.cost_price != null) return false
      if (costFilter === 'has_cost' && p.cost_price == null) return false

      // Margin filter
      if (marginFilter !== 'all') {
        const margin = calcMargin(p.price, p.cost_price)
        if (margin == null) return marginFilter === 'low' // no-cost treated as "low" concern
        if (marginFilter === 'low' && margin >= 20) return false
        if (marginFilter === 'medium' && (margin < 20 || margin >= 40)) return false
        if (marginFilter === 'high' && margin < 40) return false
      }

      // Search
      if (search) {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
      }
      return true
    })

    // Sort
    result = [...result].sort((a, b) => {
      let av: number | string | null = null
      let bv: number | string | null = null

      switch (sortKey) {
        case 'name':
          av = a.name.toLowerCase()
          bv = b.name.toLowerCase()
          break
        case 'sku':
          av = a.sku?.toLowerCase() ?? ''
          bv = b.sku?.toLowerCase() ?? ''
          break
        case 'price':
          av = a.price
          bv = b.price
          break
        case 'cost_price':
          av = a.cost_price
          bv = b.cost_price
          break
        case 'margin_pct':
          av = calcMargin(a.price, a.cost_price)
          bv = calcMargin(b.price, b.cost_price)
          break
        case 'margin_value':
          av = a.price != null && a.cost_price != null ? a.price - a.cost_price : null
          bv = b.price != null && b.cost_price != null ? b.price - b.cost_price : null
          break
      }

      // Nulls always last
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1

      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [products, search, costFilter, marginFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const showingFrom = filtered.length === 0 ? 0 : safePage * pageSize + 1
  const showingTo = Math.min((safePage + 1) * pageSize, filtered.length)

  // --- Sort handler ---
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    )
  }

  // --- CSV ---
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      parseCsv(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const parseCsv = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length < 2) {
      toast.error('CSV must have a header row and at least one data row')
      return
    }

    const header = lines[0]
      .toLowerCase()
      .split(/[,;\t]/)
      .map((h) => h.trim().replace(/^"|"$/g, ''))
    const skuCol = header.findIndex((h) => h === 'sku' || h === 'código' || h === 'codigo')
    const nameCol = header.findIndex(
      (h) => h === 'name' || h === 'nome' || h === 'produto' || h === 'product'
    )
    const costCol = header.findIndex(
      (h) =>
        h === 'cost' ||
        h === 'custo' ||
        h === 'cost_price' ||
        h === 'preço de custo' ||
        h === 'preco de custo'
    )

    if (costCol === -1) {
      toast.error('CSV must have a cost column (cost, custo, cost_price, or preço de custo)')
      return
    }
    if (skuCol === -1 && nameCol === -1) {
      toast.error('CSV must have a SKU or name/produto column to match products')
      return
    }

    const matched: NonNullable<typeof csvMatches> = []
    const unmatched: typeof csvUnmatched = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''))
      const costStr = cols[costCol]?.replace(/[R$\s]/g, '').replace(',', '.')
      const cost = parseFloat(costStr)
      if (isNaN(cost) || cost < 0) continue

      const sku = skuCol >= 0 ? cols[skuCol]?.trim() : null
      const name = nameCol >= 0 ? cols[nameCol]?.trim() : null
      const label = sku || name || `Row ${i + 1}`

      let product = sku ? products.find((p) => p.sku?.toLowerCase() === sku.toLowerCase()) : null
      if (!product && name) {
        product = products.find((p) => p.name.toLowerCase() === name.toLowerCase())
      }

      if (product) {
        if (!matched.some((m) => m.productId === product!.id)) {
          matched.push({
            productId: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            cost,
          })
        }
      } else {
        unmatched.push({ label, cost })
      }
    }

    if (matched.length === 0) {
      toast.error('No products matched from CSV. Check that SKU or product names match.')
      return
    }

    setCsvMatches(matched)
    setCsvUnmatched(unmatched)
  }

  const handleApplyCsv = async () => {
    if (!csvMatches || csvMatches.length === 0) return
    setApplyingCsv(true)
    try {
      const updates = csvMatches.map((m) => ({ id: m.productId, cost_price: m.cost }))
      const res = await fetch('/api/store/products/bulk-cost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error('Failed to save')

      const updateMap = new Map(updates.map((u) => [u.id, u.cost_price]))
      setProducts((prev) =>
        prev.map((p) => {
          const newCost = updateMap.get(p.id)
          return newCost != null ? { ...p, cost_price: newCost } : p
        })
      )
      toast.success(`Cost updated for ${updates.length} products`)
      setCsvMatches(null)
      setCsvUnmatched([])
    } catch {
      toast.error('Failed to apply CSV costs')
    } finally {
      setApplyingCsv(false)
    }
  }

  // --- Inline edit ---
  const handleStartEdit = (id: string, currentCost: number | null) => {
    setEditingId(id)
    setEditValue(currentCost != null ? String(currentCost) : '')
  }

  const handleSaveCost = useCallback(
    async (productId: string) => {
      const cost = parseFloat(editValue)
      if (isNaN(cost) || cost < 0) {
        toast.error('Invalid cost value')
        return
      }

      setSaving(productId)
      try {
        const res = await fetch(`/api/store/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cost_price: cost }),
        })
        if (!res.ok) throw new Error('Failed to save')

        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, cost_price: cost } : p))
        )
        setEditingId(null)
        toast.success('Cost updated')
      } catch {
        toast.error('Failed to update cost')
      } finally {
        setSaving(null)
      }
    },
    [editValue]
  )

  // --- Bulk margin ---
  const handleBulkApply = async () => {
    const marginPct = parseFloat(bulkMargin)
    if (isNaN(marginPct) || marginPct <= 0 || marginPct >= 100) {
      toast.error('Enter a margin between 0 and 100')
      return
    }

    const selectedProducts = products.filter((p) => selected.has(p.id) && p.price)
    if (selectedProducts.length === 0) {
      toast.error('Select products with prices first')
      return
    }

    setApplyingBulk(true)
    try {
      const updates = selectedProducts.map((p) => ({
        id: p.id,
        cost_price: Math.round(Number(p.price) * (1 - marginPct / 100) * 100) / 100,
      }))

      const res = await fetch('/api/store/products/bulk-cost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error('Failed to save')

      const updateMap = new Map(updates.map((u) => [u.id, u.cost_price]))
      setProducts((prev) =>
        prev.map((p) => {
          const newCost = updateMap.get(p.id)
          return newCost != null ? { ...p, cost_price: newCost } : p
        })
      )
      setSelected(new Set())
      setBulkMargin('')
      toast.success(`Cost updated for ${updates.length} products`)
    } catch {
      toast.error('Failed to update costs')
    } finally {
      setApplyingBulk(false)
    }
  }

  // --- Selection ---
  const toggleAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paginated.map((p) => p.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-1 flex-col gap-6 px-6 pt-8 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Products — {storeName}</h2>
        <p className="text-muted-foreground text-sm">Manage product costs and profit margins.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-4">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold">{stats.total}</span>
            <span className="text-muted-foreground text-xs">Total products</span>
          </div>
        </div>
        <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-4">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {stats.withCost}
            </span>
            <span className="text-muted-foreground text-xs">With cost</span>
          </div>
        </div>
        <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-4">
          <div className="flex flex-col">
            <span
              className={cn(
                'text-2xl font-semibold',
                stats.noCost > 0 && 'text-orange-600 dark:text-orange-400'
              )}
            >
              {stats.noCost}
            </span>
            <span className="text-muted-foreground text-xs">Without cost</span>
          </div>
        </div>
        <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-4">
          <div className="flex flex-col">
            <span
              className={cn(
                'text-2xl font-semibold',
                stats.avgMargin != null && stats.avgMargin < 20 && 'text-red-600 dark:text-red-400',
                stats.avgMargin != null &&
                  stats.avgMargin >= 20 &&
                  stats.avgMargin < 40 &&
                  'text-orange-600 dark:text-orange-400',
                stats.avgMargin != null &&
                  stats.avgMargin >= 40 &&
                  'text-green-600 dark:text-green-400'
              )}
            >
              {stats.avgMargin != null ? `${stats.avgMargin.toFixed(1)}%` : '—'}
            </span>
            <span className="text-muted-foreground text-xs">Avg. margin</span>
          </div>
        </div>
      </div>

      {/* Demand Forecast CTA */}
      {chatAgentId && (
        <Link
          href={`/agents/${chatAgentId}`}
          className="bg-muted/50 hover:bg-muted flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
        >
          <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <TrendingUp className="text-primary h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Previsão de demanda</p>
            <p className="text-muted-foreground text-xs">
              Pergunte ao Snew quais produtos vão acabar primeiro e quando repor estoque.
            </p>
          </div>
          <MessageCircle className="text-muted-foreground h-4 w-4 shrink-0" />
        </Link>
      )}

      {/* Filters row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="w-full pl-8 sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={costFilter}
            onValueChange={(v) => {
              setCostFilter(v as CostFilter)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <Filter className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              <SelectItem value="no_cost">Without cost ({stats.noCost})</SelectItem>
              <SelectItem value="has_cost">With cost ({stats.withCost})</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={marginFilter}
            onValueChange={(v) => {
              setMarginFilter(v as MarginFilter)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <Percent className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All margins</SelectItem>
              <SelectItem value="low">Low (&lt;20%)</SelectItem>
              <SelectItem value="medium">Medium (20–40%)</SelectItem>
              <SelectItem value="high">High (&gt;40%)</SelectItem>
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1 h-3 w-3" />
            Import CSV
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-muted-foreground text-sm">{selected.size} selected</span>
            <Input
              placeholder="Margin %"
              value={bulkMargin}
              onChange={(e) => setBulkMargin(e.target.value)}
              className="w-24"
              type="number"
              min={1}
              max={99}
            />
            <Button size="sm" onClick={handleBulkApply} disabled={applyingBulk}>
              {applyingBulk ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Percent className="mr-1 h-3 w-3" />
              )}
              Apply margin
            </Button>
          </div>
        )}
      </div>

      {/* CSV Preview */}
      {csvMatches && (
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-muted-foreground h-4 w-4" />
              <h3 className="text-sm font-medium">
                CSV Import — {csvMatches.length} matched
                {csvUnmatched.length > 0 && (
                  <span className="text-muted-foreground font-normal">
                    , {csvUnmatched.length} not found
                  </span>
                )}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setCsvMatches(null)
                setCsvUnmatched([])
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="mb-3 max-h-48 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">New Cost</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvMatches.map((m) => {
                  const margin =
                    m.price && m.price > 0 ? ((m.price - m.cost) / m.price) * 100 : null
                  return (
                    <TableRow key={m.productId}>
                      <TableCell className="text-sm">
                        {m.name}
                        {m.sku && (
                          <span className="text-muted-foreground ml-2 text-xs">{m.sku}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {m.price != null ? `R$ ${Number(m.price).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        R$ {m.cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {margin != null ? (
                          <span
                            className={cn(
                              'font-medium',
                              margin < 20 && 'text-red-600 dark:text-red-400',
                              margin >= 20 && margin < 40 && 'text-orange-600 dark:text-orange-400',
                              margin >= 40 && 'text-green-600 dark:text-green-400'
                            )}
                          >
                            {margin.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {csvUnmatched.length > 0 && (
            <p className="text-muted-foreground mb-3 text-xs">
              Not found: {csvUnmatched.map((u) => u.label).join(', ')}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleApplyCsv} disabled={applyingCsv}>
              {applyingCsv ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3 w-3" />
              )}
              Apply {csvMatches.length} costs
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCsvMatches(null)
                setCsvUnmatched([])
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="-mx-6 overflow-x-auto sm:mx-0 sm:rounded-md sm:border">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={paginated.length > 0 && selected.size === paginated.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead
                className="max-w-[280px] cursor-pointer select-none"
                onClick={() => handleSort('name')}
              >
                Product <SortIcon col="name" />
              </TableHead>
              <TableHead
                className="w-32 cursor-pointer select-none"
                onClick={() => handleSort('sku')}
              >
                SKU <SortIcon col="sku" />
              </TableHead>
              <TableHead
                className="w-28 cursor-pointer text-right select-none"
                onClick={() => handleSort('price')}
              >
                Price <SortIcon col="price" />
              </TableHead>
              <TableHead
                className="w-32 cursor-pointer text-right select-none"
                onClick={() => handleSort('cost_price')}
              >
                Cost <SortIcon col="cost_price" />
              </TableHead>
              <TableHead
                className="w-28 cursor-pointer text-right select-none"
                onClick={() => handleSort('margin_pct')}
              >
                Margin % <SortIcon col="margin_pct" />
              </TableHead>
              <TableHead
                className="w-28 cursor-pointer text-right select-none"
                onClick={() => handleSort('margin_value')}
              >
                Margin R$ <SortIcon col="margin_value" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center">
                  {search || costFilter !== 'all' || marginFilter !== 'all'
                    ? 'No products match your filters.'
                    : 'No products found.'}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((p) => {
                const margin = calcMargin(p.price, p.cost_price)
                const marginValue =
                  p.price != null && p.cost_price != null ? p.price - p.cost_price : null
                const isEditing = editingId === p.id
                const isSaving = saving === p.id

                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggleOne(p.id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.sku || '—'}</TableCell>
                    <TableCell className="text-right">
                      {p.price != null ? `R$ ${Number(p.price).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 w-20 text-right text-sm"
                            type="number"
                            step="0.01"
                            min="0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCost(p.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            onBlur={() => {
                              if (editValue) handleSaveCost(p.id)
                              else setEditingId(null)
                            }}
                          />
                          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(p.id, p.cost_price)}
                          className={cn(
                            'hover:bg-muted cursor-pointer rounded px-2 py-0.5 text-sm transition-colors',
                            p.cost_price == null && 'text-muted-foreground italic'
                          )}
                        >
                          {p.cost_price != null
                            ? `R$ ${Number(p.cost_price).toFixed(2)}`
                            : 'set cost'}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {margin != null ? (
                        <span
                          className={cn(
                            'text-sm font-medium',
                            margin < 20 && 'text-red-600 dark:text-red-400',
                            margin >= 20 && margin < 40 && 'text-orange-600 dark:text-orange-400',
                            margin >= 40 && 'text-green-600 dark:text-green-400'
                          )}
                        >
                          {margin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {marginValue != null ? `R$ ${marginValue.toFixed(2)}` : '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {filtered.length > 0
            ? `Showing ${showingFrom}–${showingTo} of ${filtered.length} products`
            : `${filtered.length} products`}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v))
              setPage(0)
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm">per page</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {safePage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
