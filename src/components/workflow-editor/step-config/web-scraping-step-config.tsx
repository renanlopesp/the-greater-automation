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
  const showSelector = config.scrape_type === 'css_selector' || config.scrape_type === 'xpath'

  return (
    <div className="flex flex-col gap-3">
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

      <div>
        <Label htmlFor="scrape-type" className="text-sm font-medium">
          Scrape Type
        </Label>
        <Select
          value={config.scrape_type}
          onValueChange={(v) =>
            onUpdate({ ...config, scrape_type: v as WebScrapingStepConfig['scrape_type'] })
          }
        >
          <SelectTrigger id="scrape-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="url">Full Page</SelectItem>
            <SelectItem value="css_selector">CSS Selector</SelectItem>
            <SelectItem value="xpath">XPath</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showSelector && (
        <>
          <div>
            <Label htmlFor="selector" className="text-sm font-medium">
              Selector
            </Label>
            <Input
              id="selector"
              value={config.selector ?? ''}
              onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
              placeholder={
                config.scrape_type === 'css_selector'
                  ? 'e.g., .class-name, #id'
                  : 'e.g., //div[@class="example"]'
              }
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="wait-selector" className="text-sm font-medium">
              Wait for selector
            </Label>
            <Switch
              id="wait-selector"
              checked={config.wait_for_selector ?? false}
              onCheckedChange={(checked) => onUpdate({ ...config, wait_for_selector: checked })}
            />
          </div>
        </>
      )}

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
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
