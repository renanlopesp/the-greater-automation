'use step'

import { FatalError } from 'workflow'
import type { WebScrapingStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface WebScrapingStepOutput {
  content: string
  url: string
  scrape_type: string
}

export async function webScrapingStep(
  config: WebScrapingStepConfig
): Promise<WebScrapingStepOutput> {
  const { scrape_type, url, selector, output_format } = config

  if (!url) {
    throw new FatalError('Web scraping step requires a URL')
  }

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Relay-Workflow/1.0',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new FatalError(`Failed to fetch URL: ${response.status} ${response.statusText}`)
      }
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()

    // Extract content based on scrape type
    let extractedContent: string

    switch (scrape_type) {
      case 'url':
        // Return full HTML or text based on output format
        extractedContent = html
        break

      case 'css_selector':
      case 'xpath':
        // For CSS selector and XPath, we need a DOM parser
        // In a real implementation, use a library like cheerio or jsdom
        if (!selector) {
          throw new FatalError(`${scrape_type} requires a selector`)
        }
        extractedContent = extractWithSelector(html, selector, scrape_type)
        break

      default:
        extractedContent = html
    }

    // Format output
    let formattedContent: string
    switch (output_format) {
      case 'text':
        formattedContent = stripHtml(extractedContent)
        break
      case 'html':
        formattedContent = extractedContent
        break
      case 'json':
        formattedContent = JSON.stringify({
          content: stripHtml(extractedContent),
          html: extractedContent,
        })
        break
      default:
        formattedContent = extractedContent
    }

    return {
      content: formattedContent,
      url,
      scrape_type,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error('Web scraping timeout after 30 seconds')
      }
      throw error
    }

    throw new Error('Web scraping failed')
  }
}

// Helper function to extract content with a selector
// In production, use a proper HTML parser like cheerio
function extractWithSelector(
  html: string,
  selector: string,
  type: 'css_selector' | 'xpath'
): string {
  // Placeholder implementation
  // In a real implementation, use cheerio or jsdom:
  // const $ = cheerio.load(html)
  // return $(selector).text()

  // For now, return a simplified extraction
  return `Extracted content using ${type}: ${selector} (implementation pending)`
}

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
