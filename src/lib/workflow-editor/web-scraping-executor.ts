import Firecrawl from '@mendable/firecrawl-js'
import type { WebScrapingStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface WebScrapingResult {
  success: boolean
  content: string
  metadata?: Record<string, unknown>
  links?: Array<{ url: string; title?: string }>
  url: string
  action: string
  error?: string
}

export function createFirecrawlClient(): InstanceType<typeof Firecrawl>['v1'] {
  const apiKey = process.env.FIRECRAWL_API_KEY

  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is not set')
  }

  // Use the Firecrawl cloud API (no custom apiUrl — self-hosted is deprecated)
  const client = new Firecrawl({ apiKey })
  return client.v1
}

export async function executeWebScrapingStep(
  config: WebScrapingStepConfig
): Promise<WebScrapingResult> {
  const { action } = config

  switch (action) {
    case 'scrape':
      return executeScrape(config)
    case 'map':
      return executeMap(config)
    case 'search':
      return executeSearch(config)
    default:
      return {
        success: false,
        content: '',
        url: config.url || '',
        action: action || 'unknown',
        error: `Unknown web scraping action: ${action}`,
      }
  }
}

async function executeScrape(config: WebScrapingStepConfig): Promise<WebScrapingResult> {
  if (!config.url) {
    return {
      success: false,
      content: '',
      url: '',
      action: 'scrape',
      error: 'URL is required for scrape action',
    }
  }

  try {
    const client = createFirecrawlClient()

    const formats: ('markdown' | 'html' | 'rawHtml' | 'links')[] = [
      config.output_format === 'rawHtml' ? 'rawHtml' : config.output_format,
    ]

    const scrapeOptions: Record<string, unknown> = {
      formats,
      onlyMainContent: config.only_main_content ?? true,
    }

    if (config.include_tags) {
      scrapeOptions.includeTags = config.include_tags.split(',').map((t) => t.trim())
    }
    if (config.exclude_tags) {
      scrapeOptions.excludeTags = config.exclude_tags.split(',').map((t) => t.trim())
    }
    if (config.wait_for != null && config.wait_for > 0) {
      scrapeOptions.waitFor = config.wait_for
    }

    const result = await client.scrapeUrl(config.url, scrapeOptions)

    if (!result.success) {
      return {
        success: false,
        content: '',
        url: config.url,
        action: 'scrape',
        error: (result as { error?: string }).error || 'Scrape failed',
      }
    }

    let content = ''
    if (config.output_format === 'markdown') {
      content = result.markdown || ''
    } else if (config.output_format === 'html') {
      content = result.html || ''
    } else if (config.output_format === 'rawHtml') {
      content = result.rawHtml || ''
    } else if (config.output_format === 'links') {
      content = JSON.stringify(result.links || [], null, 2)
    }

    return {
      success: true,
      content,
      metadata: result.metadata as Record<string, unknown> | undefined,
      links: (result.links || []).map((link: string) => ({ url: link })),
      url: config.url,
      action: 'scrape',
    }
  } catch (err) {
    return {
      success: false,
      content: '',
      url: config.url,
      action: 'scrape',
      error: err instanceof Error ? err.message : 'Scrape failed',
    }
  }
}

async function executeMap(config: WebScrapingStepConfig): Promise<WebScrapingResult> {
  if (!config.url) {
    return {
      success: false,
      content: '',
      url: '',
      action: 'map',
      error: 'URL is required for map action',
    }
  }

  try {
    const client = createFirecrawlClient()

    const mapOptions: Record<string, unknown> = {}
    if (config.query) {
      mapOptions.search = config.query
    }
    if (config.limit != null && config.limit > 0) {
      mapOptions.limit = config.limit
    }

    const result = await client.mapUrl(config.url, mapOptions)

    if (!result.success) {
      return {
        success: false,
        content: '',
        url: config.url,
        action: 'map',
        error: (result as { error?: string }).error || 'Map failed',
      }
    }

    const links = (result.links || []).map((link: string) => ({ url: link }))
    const content = JSON.stringify(links, null, 2)

    return {
      success: true,
      content,
      links,
      url: config.url,
      action: 'map',
    }
  } catch (err) {
    return {
      success: false,
      content: '',
      url: config.url,
      action: 'map',
      error: err instanceof Error ? err.message : 'Map failed',
    }
  }
}

async function executeSearch(config: WebScrapingStepConfig): Promise<WebScrapingResult> {
  if (!config.query) {
    return {
      success: false,
      content: '',
      url: '',
      action: 'search',
      error: 'Query is required for search action',
    }
  }

  try {
    const client = createFirecrawlClient()

    const searchOptions: Record<string, unknown> = {}
    if (config.limit != null && config.limit > 0) {
      searchOptions.limit = config.limit
    }
    searchOptions.scrapeOptions = {
      formats: [config.output_format === 'rawHtml' ? 'rawHtml' : config.output_format],
    }

    const result = await client.search(config.query, searchOptions)

    if (!result.success) {
      return {
        success: false,
        content: '',
        url: '',
        action: 'search',
        error: result.error || 'Search failed',
      }
    }

    const data = result.data || []
    const content = data
      .map((item) => {
        const title = item.metadata?.title || item.url || ''
        const body = item.markdown || item.html || item.rawHtml || ''
        return `## ${title}\nURL: ${item.url}\n\n${body}`
      })
      .join('\n\n---\n\n')

    const links = data.map((item) => ({
      url: item.url || '',
      title: item.metadata?.title || undefined,
    }))

    return {
      success: true,
      content,
      links,
      url: config.query,
      action: 'search',
    }
  } catch (err) {
    return {
      success: false,
      content: '',
      url: '',
      action: 'search',
      error: err instanceof Error ? err.message : 'Search failed',
    }
  }
}
