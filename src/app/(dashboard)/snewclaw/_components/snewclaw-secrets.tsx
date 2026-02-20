'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react'

interface SavedSecret {
  key: string
  updatedAt: string
}

interface EnvEntry {
  id: string
  key: string
  value: string
}

function newEntry(key = '', value = ''): EnvEntry {
  return { id: crypto.randomUUID(), key, value }
}

/**
 * Parse pasted .env content into key/value pairs.
 * Handles: KEY=value, KEY="value", KEY='value', and multi-line pastes.
 * Skips empty lines and comments (#).
 */
function parseEnvPaste(text: string): Array<{ key: string; value: string }> {
  const results: Array<{ key: string; value: string }> = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) results.push({ key, value })
  }
  return results
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function SnewclawSecrets({ instanceId }: { instanceId: string }) {
  const [saved, setSaved] = useState<SavedSecret[]>([])
  const [entries, setEntries] = useState<EnvEntry[]>([newEntry()])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const loadSecrets = useCallback(async () => {
    try {
      const res = await fetch(`/api/snewclaw/${instanceId}/secrets`)
      if (res.ok) {
        const data = (await res.json()) as { secrets: SavedSecret[] }
        setSaved(data.secrets)
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [instanceId])

  useEffect(() => {
    void loadSecrets()
  }, [loadSecrets])

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()])
    setResult(null)
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      return next.length === 0 ? [newEntry()] : next
    })
  }

  function updateEntry(id: string, field: 'key' | 'value', val: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)))
  }

  function toggleVisibility(id: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleKeyPaste = useCallback(
    (entryId: string, e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text/plain')
      if (!text.includes('=')) return

      e.preventDefault()
      const parsed = parseEnvPaste(text)
      if (parsed.length === 0) return

      setEntries((prev) => {
        const idx = prev.findIndex((entry) => entry.id === entryId)
        if (idx === -1) return prev
        const before = prev.slice(0, idx)
        const after = prev.slice(idx + 1)
        const newEntries = parsed.map((p) => newEntry(p.key, p.value))
        return [...before, ...newEntries, ...after]
      })
      setResult(null)
    },
    []
  )

  async function handleDeleteSaved(key: string) {
    try {
      const res = await fetch(`/api/snewclaw/${instanceId}/secrets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (res.ok) {
        setSaved((prev) => prev.filter((s) => s.key !== key))
      }
    } catch {
      // silently fail
    }
  }

  async function handleSave() {
    const valid = entries.filter((e) => e.key.trim() && e.value.trim())
    if (valid.length === 0) return

    setIsSaving(true)
    setResult(null)

    try {
      const res = await fetch(`/api/snewclaw/${instanceId}/secrets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secrets: valid.map((e) => ({ key: e.key.trim(), value: e.value.trim() })),
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({ error: 'Failed' }))) as { error?: string }
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save')
      }

      const data = (await res.json()) as { applied?: boolean; error?: string }
      if (data.applied === false) {
        setResult({
          ok: true,
          message: `Saved but could not apply to machine: ${data.error ?? 'unknown error'}`,
        })
      } else {
        setResult({ ok: true, message: 'Saved and applied. Machine restarting...' })
      }

      setEntries([newEntry()])
      setVisibleKeys(new Set())
      void loadSecrets()
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setIsSaving(false)
    }
  }

  const hasValidEntries = entries.some((e) => e.key.trim() && e.value.trim())

  return (
    <div className="flex flex-col gap-5">
      {/* Existing saved secrets */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      ) : saved.length > 0 ? (
        <div className="flex flex-col gap-1">
          {saved.map((s) => (
            <div
              key={s.key}
              className="border-border flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium">{s.key}</span>
                <span className="text-muted-foreground text-xs">{formatDate(s.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-sm tracking-widest">
                  ••••••••
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => void handleDeleteSaved(s.key)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* New entries form */}
      <div className="flex flex-col gap-3">
        {/* Column headers */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Key
            </Label>
          </div>
          <div className="flex-[2]">
            <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Value
            </Label>
          </div>
          <div className="w-8" />
        </div>

        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={entry.key}
                onChange={(e) => updateEntry(entry.id, 'key', e.target.value)}
                onPaste={(e) => handleKeyPaste(entry.id, e)}
                placeholder="e.g. OPENAI_API_KEY"
                className="font-mono text-sm"
                spellCheck={false}
              />
            </div>
            <div className="flex-[2]">
              <div className="relative">
                <Input
                  type={visibleKeys.has(entry.id) ? 'text' : 'password'}
                  value={entry.value}
                  onChange={(e) => updateEntry(entry.id, 'value', e.target.value)}
                  placeholder="Enter value..."
                  className="pr-9 font-mono text-sm"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => toggleVisibility(entry.id)}
                  tabIndex={-1}
                >
                  {visibleKeys.has(entry.id) ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => removeEntry(entry.id)}
              tabIndex={-1}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus className="mr-1.5 size-3" />
            Add Another
          </Button>
          <span className="text-muted-foreground text-xs">or paste .env contents in Key input</span>
        </div>

        <Button onClick={() => void handleSave()} disabled={isSaving || !hasValidEntries} size="sm">
          {isSaving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          Save
        </Button>
      </div>

      {/* Result */}
      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-destructive'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
