'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WebScrapingStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function WebScrapingStepConfigForm({
  config,
  onUpdate,
}: {
  config: WebScrapingStepConfig
  onUpdate: (config: WebScrapingStepConfig) => void
}) {
  const action = config.action || 'scrape'
  const showUrl = action === 'scrape' || action === 'map'
  const showQuery = action === 'search' || action === 'map'
  const showOutputFormat = action === 'scrape' || action === 'search'
  const showMainContent = action === 'scrape'
  const showTags = action === 'scrape'
  const showWaitFor = action === 'scrape'
  const showLimit = action === 'map' || action === 'search'

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="action" className="text-sm font-medium">
          Action
        </Label>
        <Select
          value={action}
          onValueChange={(v) =>
            onUpdate({ ...config, action: v as WebScrapingStepConfig['action'] })
          }
        >
          <SelectTrigger id="action" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scrape">Scrape Page</SelectItem>
            <SelectItem value="map">Map Site</SelectItem>
            <SelectItem value="search">Web Search</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showUrl && (
        <div>
          <Label htmlFor="url" className="text-sm font-medium">
            URL
          </Label>
          <Input
            id="url"
            value={config.url}
            onChange={(e) => onUpdate({ ...config, url: e.target.value })}
            placeholder="https://example.com"
            className="mt-1"
          />
        </div>
      )}

      {showQuery && (
        <div>
          <Label htmlFor="query" className="text-sm font-medium">
            {action === 'search' ? 'Search Query' : 'Search (optional, sorts by relevance)'}
          </Label>
          <Input
            id="query"
            value={config.query ?? ''}
            onChange={(e) => onUpdate({ ...config, query: e.target.value })}
            placeholder={action === 'search' ? 'Search the web...' : 'Filter URLs by relevance...'}
            className="mt-1"
          />
        </div>
      )}

      {showOutputFormat && (
        <div>
          <Label htmlFor="output-format" className="text-sm font-medium">
            Output Format
          </Label>
          <Select
            value={config.output_format}
            onValueChange={(v) =>
              onUpdate({ ...config, output_format: v as WebScrapingStepConfig['output_format'] })
            }
          >
            <SelectTrigger id="output-format" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="rawHtml">Raw HTML</SelectItem>
              <SelectItem value="links">Links</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showMainContent && (
        <div className="flex items-center justify-between">
          <Label htmlFor="only-main-content" className="text-sm font-medium">
            Only main content
          </Label>
          <Switch
            id="only-main-content"
            checked={config.only_main_content ?? true}
            onCheckedChange={(checked) => onUpdate({ ...config, only_main_content: checked })}
          />
        </div>
      )}

      {showWaitFor && (
        <div>
          <Label htmlFor="wait-for" className="text-sm font-medium">
            Wait before scrape (ms)
          </Label>
          <Input
            id="wait-for"
            type="number"
            value={config.wait_for ?? ''}
            onChange={(e) =>
              onUpdate({ ...config, wait_for: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="0"
            className="mt-1"
          />
        </div>
      )}

      {showTags && (
        <>
          <div>
            <Label htmlFor="include-tags" className="text-sm font-medium">
              Include Tags (comma-separated CSS selectors)
            </Label>
            <Input
              id="include-tags"
              value={config.include_tags ?? ''}
              onChange={(e) => onUpdate({ ...config, include_tags: e.target.value })}
              placeholder="article, .content, main"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="exclude-tags" className="text-sm font-medium">
              Exclude Tags (comma-separated CSS selectors)
            </Label>
            <Input
              id="exclude-tags"
              value={config.exclude_tags ?? ''}
              onChange={(e) => onUpdate({ ...config, exclude_tags: e.target.value })}
              placeholder="nav, footer, .sidebar"
              className="mt-1"
            />
          </div>
        </>
      )}

      {showLimit && (
        <div>
          <Label htmlFor="limit" className="text-sm font-medium">
            Limit
          </Label>
          <Input
            id="limit"
            type="number"
            value={config.limit ?? ''}
            onChange={(e) =>
              onUpdate({ ...config, limit: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="10"
            className="mt-1"
          />
        </div>
      )}
    </div>
  )
}
