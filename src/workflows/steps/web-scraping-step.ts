'use step'

import { FatalError } from 'workflow'
import type { WebScrapingStepConfig } from '@/lib/workflow-editor/step-defaults'
import { executeWebScrapingStep } from '@/lib/workflow-editor/web-scraping-executor'

export interface WebScrapingStepOutput {
  content: string
  url: string
  action: string
  metadata?: Record<string, unknown>
  links?: Array<{ url: string; title?: string }>
}

export async function webScrapingStep(
  config: WebScrapingStepConfig
): Promise<WebScrapingStepOutput> {
  if (config.action !== 'search' && !config.url) {
    throw new FatalError('Web scraping step requires a URL')
  }

  if (config.action === 'search' && !config.query) {
    throw new FatalError('Web scraping search action requires a query')
  }

  try {
    const result = await executeWebScrapingStep(config)

    if (!result.success) {
      throw new FatalError(result.error || 'Web scraping failed')
    }

    return {
      content: result.content,
      url: result.url,
      action: result.action,
      metadata: result.metadata,
      links: result.links,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }
    throw new FatalError(error instanceof Error ? error.message : 'Web scraping failed')
  }
}
