import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Firecrawl SDK
const mockScrapeUrl = vi.fn()
const mockMapUrl = vi.fn()
const mockSearch = vi.fn()

vi.mock('@mendable/firecrawl-js', () => {
  return {
    default: class MockFirecrawl {
      v1 = {
        scrapeUrl: mockScrapeUrl,
        mapUrl: mockMapUrl,
        search: mockSearch,
      }
    },
  }
})

import { createFirecrawlClient, executeWebScrapingStep } from '../web-scraping-executor'
import type { WebScrapingStepConfig } from '../step-defaults'

describe('web-scraping-executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FIRECRAWL_API_KEY = 'test-api-key'
  })

  describe('createFirecrawlClient', () => {
    it('should create client with env vars', () => {
      const client = createFirecrawlClient()
      expect(client).toBeDefined()
      expect(client.scrapeUrl).toBeDefined()
    })

    it('should throw when FIRECRAWL_API_KEY is missing', () => {
      delete process.env.FIRECRAWL_API_KEY
      expect(() => createFirecrawlClient()).toThrow(
        'FIRECRAWL_API_KEY environment variable is not set'
      )
    })
  })

  describe('scrape action', () => {
    const baseConfig: WebScrapingStepConfig = {
      action: 'scrape',
      url: 'https://example.com',
      output_format: 'markdown',
      only_main_content: true,
    }

    it('should scrape URL and return markdown content', async () => {
      mockScrapeUrl.mockResolvedValue({
        success: true,
        markdown: '# Hello World',
        metadata: { title: 'Example', statusCode: 200 },
        links: ['https://example.com/page'],
      })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(true)
      expect(result.content).toBe('# Hello World')
      expect(result.metadata).toEqual({ title: 'Example', statusCode: 200 })
      expect(result.links).toEqual([{ url: 'https://example.com/page' }])
      expect(result.action).toBe('scrape')
      expect(result.url).toBe('https://example.com')
      expect(mockScrapeUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          formats: ['markdown'],
          onlyMainContent: true,
        })
      )
    })

    it('should scrape URL and return html content', async () => {
      mockScrapeUrl.mockResolvedValue({
        success: true,
        html: '<h1>Hello</h1>',
        metadata: {},
      })

      const result = await executeWebScrapingStep({ ...baseConfig, output_format: 'html' })

      expect(result.success).toBe(true)
      expect(result.content).toBe('<h1>Hello</h1>')
    })

    it('should scrape URL and return rawHtml content', async () => {
      mockScrapeUrl.mockResolvedValue({
        success: true,
        rawHtml: '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>',
        metadata: {},
      })

      const result = await executeWebScrapingStep({ ...baseConfig, output_format: 'rawHtml' })

      expect(result.success).toBe(true)
      expect(result.content).toBe('<!DOCTYPE html><html><body><h1>Hello</h1></body></html>')
    })

    it('should scrape URL and return links as JSON', async () => {
      mockScrapeUrl.mockResolvedValue({
        success: true,
        links: ['https://example.com/a', 'https://example.com/b'],
        metadata: {},
      })

      const result = await executeWebScrapingStep({ ...baseConfig, output_format: 'links' })

      expect(result.success).toBe(true)
      const parsed = JSON.parse(result.content)
      expect(parsed).toEqual(['https://example.com/a', 'https://example.com/b'])
    })

    it('should pass onlyMainContent option', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, markdown: 'content', metadata: {} })

      await executeWebScrapingStep({ ...baseConfig, only_main_content: false })

      expect(mockScrapeUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          onlyMainContent: false,
        })
      )
    })

    it('should pass include_tags as array', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, markdown: 'content', metadata: {} })

      await executeWebScrapingStep({ ...baseConfig, include_tags: 'article, .content, main' })

      expect(mockScrapeUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          includeTags: ['article', '.content', 'main'],
        })
      )
    })

    it('should pass exclude_tags as array', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, markdown: 'content', metadata: {} })

      await executeWebScrapingStep({ ...baseConfig, exclude_tags: 'nav, footer' })

      expect(mockScrapeUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          excludeTags: ['nav', 'footer'],
        })
      )
    })

    it('should pass waitFor when set', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, markdown: 'content', metadata: {} })

      await executeWebScrapingStep({ ...baseConfig, wait_for: 2000 })

      expect(mockScrapeUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          waitFor: 2000,
        })
      )
    })

    it('should not pass waitFor when zero', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, markdown: 'content', metadata: {} })

      await executeWebScrapingStep({ ...baseConfig, wait_for: 0 })

      const callArgs = mockScrapeUrl.mock.calls[0][1]
      expect(callArgs.waitFor).toBeUndefined()
    })

    it('should return error when scrape fails', async () => {
      mockScrapeUrl.mockResolvedValue({
        success: false,
        error: 'Page not found',
      })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Page not found')
    })

    it('should handle API exception', async () => {
      mockScrapeUrl.mockRejectedValue(new Error('Network timeout'))

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })

    it('should return error when URL is missing', async () => {
      const result = await executeWebScrapingStep({ ...baseConfig, url: '' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('URL is required for scrape action')
      expect(mockScrapeUrl).not.toHaveBeenCalled()
    })

    it('should default onlyMainContent to true', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, markdown: 'content', metadata: {} })

      await executeWebScrapingStep({
        action: 'scrape',
        url: 'https://example.com',
        output_format: 'markdown',
      })

      expect(mockScrapeUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          onlyMainContent: true,
        })
      )
    })

    it('should return empty string when content key is missing', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, metadata: {} })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(true)
      expect(result.content).toBe('')
    })

    it('should handle missing links in response', async () => {
      mockScrapeUrl.mockResolvedValue({ success: true, markdown: 'content', metadata: {} })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(true)
      expect(result.links).toEqual([])
    })
  })

  describe('map action', () => {
    const baseConfig: WebScrapingStepConfig = {
      action: 'map',
      url: 'https://example.com',
      output_format: 'markdown',
    }

    it('should map URL and return discovered links', async () => {
      mockMapUrl.mockResolvedValue({
        success: true,
        links: ['https://example.com/page1', 'https://example.com/page2'],
      })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(true)
      expect(result.links).toEqual([
        { url: 'https://example.com/page1' },
        { url: 'https://example.com/page2' },
      ])
      expect(result.action).toBe('map')
      expect(JSON.parse(result.content)).toHaveLength(2)
    })

    it('should pass search query to map', async () => {
      mockMapUrl.mockResolvedValue({ success: true, links: [] })

      await executeWebScrapingStep({ ...baseConfig, query: 'blog posts' })

      expect(mockMapUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          search: 'blog posts',
        })
      )
    })

    it('should pass limit to map', async () => {
      mockMapUrl.mockResolvedValue({ success: true, links: [] })

      await executeWebScrapingStep({ ...baseConfig, limit: 5 })

      expect(mockMapUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          limit: 5,
        })
      )
    })

    it('should return error when map fails', async () => {
      mockMapUrl.mockResolvedValue({ success: false, error: 'Crawl denied' })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Crawl denied')
    })

    it('should handle API exception in map', async () => {
      mockMapUrl.mockRejectedValue(new Error('Connection refused'))

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection refused')
    })

    it('should return error when URL is missing for map', async () => {
      const result = await executeWebScrapingStep({ ...baseConfig, url: '' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('URL is required for map action')
      expect(mockMapUrl).not.toHaveBeenCalled()
    })

    it('should handle empty links array from map', async () => {
      mockMapUrl.mockResolvedValue({ success: true, links: [] })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(true)
      expect(result.links).toEqual([])
      expect(JSON.parse(result.content)).toEqual([])
    })

    it('should not pass search when query is empty', async () => {
      mockMapUrl.mockResolvedValue({ success: true, links: [] })

      await executeWebScrapingStep({ ...baseConfig, query: '' })

      const callArgs = mockMapUrl.mock.calls[0][1]
      expect(callArgs.search).toBeUndefined()
    })

    it('should not pass limit when zero', async () => {
      mockMapUrl.mockResolvedValue({ success: true, links: [] })

      await executeWebScrapingStep({ ...baseConfig, limit: 0 })

      const callArgs = mockMapUrl.mock.calls[0][1]
      expect(callArgs.limit).toBeUndefined()
    })
  })

  describe('search action', () => {
    const baseConfig: WebScrapingStepConfig = {
      action: 'search',
      url: '',
      query: 'Next.js tutorials',
      output_format: 'markdown',
    }

    it('should search and return results with content', async () => {
      mockSearch.mockResolvedValue({
        success: true,
        data: [
          {
            url: 'https://nextjs.org/docs',
            markdown: '# Next.js Docs',
            metadata: { title: 'Next.js Documentation' },
          },
          {
            url: 'https://blog.example.com/nextjs',
            markdown: '# Getting Started',
            metadata: { title: 'Getting Started with Next.js' },
          },
        ],
      })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(true)
      expect(result.content).toContain('Next.js Documentation')
      expect(result.content).toContain('Getting Started')
      expect(result.links).toHaveLength(2)
      expect(result.links![0].url).toBe('https://nextjs.org/docs')
      expect(result.links![0].title).toBe('Next.js Documentation')
      expect(result.action).toBe('search')
    })

    it('should pass limit to search', async () => {
      mockSearch.mockResolvedValue({ success: true, data: [] })

      await executeWebScrapingStep({ ...baseConfig, limit: 3 })

      expect(mockSearch).toHaveBeenCalledWith(
        'Next.js tutorials',
        expect.objectContaining({
          limit: 3,
        })
      )
    })

    it('should pass output format in scrapeOptions', async () => {
      mockSearch.mockResolvedValue({ success: true, data: [] })

      await executeWebScrapingStep({ ...baseConfig, output_format: 'html' })

      expect(mockSearch).toHaveBeenCalledWith(
        'Next.js tutorials',
        expect.objectContaining({
          scrapeOptions: { formats: ['html'] },
        })
      )
    })

    it('should return error when search fails', async () => {
      mockSearch.mockResolvedValue({ success: false, error: 'Rate limited' })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limited')
    })

    it('should handle API exception in search', async () => {
      mockSearch.mockRejectedValue(new Error('Service unavailable'))

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Service unavailable')
    })

    it('should return error when query is missing for search', async () => {
      const result = await executeWebScrapingStep({ ...baseConfig, query: '' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Query is required for search action')
      expect(mockSearch).not.toHaveBeenCalled()
    })

    it('should handle empty data from search', async () => {
      mockSearch.mockResolvedValue({ success: true, data: [] })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.success).toBe(true)
      expect(result.content).toBe('')
      expect(result.links).toEqual([])
    })

    it('should handle rawHtml format in scrapeOptions', async () => {
      mockSearch.mockResolvedValue({ success: true, data: [] })

      await executeWebScrapingStep({ ...baseConfig, output_format: 'rawHtml' })

      expect(mockSearch).toHaveBeenCalledWith(
        'Next.js tutorials',
        expect.objectContaining({
          scrapeOptions: { formats: ['rawHtml'] },
        })
      )
    })

    it('should use url from data items for links', async () => {
      mockSearch.mockResolvedValue({
        success: true,
        data: [{ url: 'https://example.com', markdown: 'content', metadata: {} }],
      })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.links![0].url).toBe('https://example.com')
      expect(result.links![0].title).toBeUndefined()
    })

    it('should set url to query string for search results', async () => {
      mockSearch.mockResolvedValue({ success: true, data: [] })

      const result = await executeWebScrapingStep(baseConfig)

      expect(result.url).toBe('Next.js tutorials')
    })
  })

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const config = {
        action: 'crawl' as WebScrapingStepConfig['action'],
        url: 'https://example.com',
        output_format: 'markdown' as const,
      }

      const result = await executeWebScrapingStep(config)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown web scraping action: crawl')
    })

    it('should include url in error result', async () => {
      const config = {
        action: 'crawl' as WebScrapingStepConfig['action'],
        url: 'https://example.com',
        output_format: 'markdown' as const,
      }

      const result = await executeWebScrapingStep(config)

      expect(result.url).toBe('https://example.com')
      expect(result.action).toBe('crawl')
    })
  })
})
