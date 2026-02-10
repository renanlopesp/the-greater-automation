'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MCPServerTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

export function MCPTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: MCPServerTriggerConfig
  onUpdate: (config: MCPServerTriggerConfig) => void
}) {
  const addTool = () => {
    const newTool = {
      name: '',
      description: '',
      input_schema: {},
    }
    onUpdate({ ...config, tools: [...config.tools, newTool] })
  }

  const removeTool = (index: number) => {
    onUpdate({
      ...config,
      tools: config.tools.filter((_, i) => i !== index),
    })
  }

  const updateTool = (index: number, updates: Partial<(typeof config.tools)[0]>) => {
    onUpdate({
      ...config,
      tools: config.tools.map((tool, i) => (i === index ? { ...tool, ...updates } : tool)),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Server name</Label>
        <Input
          value={config.server_name}
          onChange={(e) => onUpdate({ ...config, server_name: e.target.value })}
          placeholder="my-mcp-server"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={config.description}
          onChange={(e) => onUpdate({ ...config, description: e.target.value })}
          placeholder="Describe what this MCP server does"
          rows={2}
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Tools</Label>
        <Button size="sm" variant="outline" onClick={addTool}>
          <Plus className="mr-1 h-3 w-3" />
          Add tool
        </Button>
      </div>

      {config.tools.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No tools defined. Click &ldquo;Add tool&rdquo; to create one.
        </p>
      )}

      {config.tools.map((tool, index) => (
        <div key={index} className="rounded-lg border p-3">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-xs font-medium">Tool {index + 1}</Label>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => removeTool(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={tool.name}
                onChange={(e) => updateTool(index, { name: e.target.value })}
                placeholder="e.g. send_email"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={tool.description}
                onChange={(e) => updateTool(index, { description: e.target.value })}
                placeholder="What this tool does"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Input schema (JSON)</Label>
              <Textarea
                value={JSON.stringify(tool.input_schema, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    updateTool(index, { input_schema: parsed })
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{"type": "object", "properties": {}}'
                rows={4}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
