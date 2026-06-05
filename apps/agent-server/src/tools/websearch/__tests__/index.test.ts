/**
 * Tests for WebSearch Tool Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { webSearchTool, getWebSearchStatus, getWebSearchTool } from '../index'
import { SearchProvider } from '../types'

describe('WebSearch Tool', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    delete process.env.QINIU_API_KEY
  })

  it('should have correct tool definition', () => {
    expect(webSearchTool.name).toBe('websearch')
    expect(webSearchTool.label).toBe('Web Search')
    expect(webSearchTool.description).toBeDefined()
    expect(webSearchTool.parameters).toBeDefined()
  })

  it('should export singleton getter', () => {
    const tool = getWebSearchTool()
    expect(tool).toBe(webSearchTool)
  })

  describe('execute', () => {
    it('should execute with default provider', async () => {
      const mockWikipediaResponse = {
        query: {
          search: [
            {
              pageid: 123,
              title: 'Test Article',
              snippet: 'Test snippet',
              timestamp: '2024-01-01T00:00:00Z',
              wordcount: 100,
              size: 200,
            },
          ],
          searchinfo: {
            totalhits: 1,
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWikipediaResponse,
      } as Response)

      const result = await webSearchTool.execute(
        'call-1',
        { query: 'test query' },
        new AbortController().signal,
        () => {}
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.details?.provider).toBe(SearchProvider.WIKIPEDIA)
    })

    it('should execute with Wikipedia provider', async () => {
      const mockResponse = {
        query: {
          search: [
            {
              pageid: 123,
              title: 'Wikipedia Test',
              snippet: 'Snippet',
              timestamp: '2024-01-01T00:00:00Z',
              wordcount: 100,
              size: 200,
            },
          ],
          searchinfo: {
            totalhits: 1,
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await webSearchTool.execute(
        'call-2',
        { query: 'test', provider: 'wikipedia' },
        new AbortController().signal,
        () => {}
      )

      expect(result.content[0].type).toBe('text')
      const text = result.content[0].text
      expect(text).toContain('Wikipedia')
      expect(text).toContain('Test Article')
    })

    it('should respect max_results parameter', async () => {
      const mockResponse = {
        query: {
          search: Array(5)
            .fill(null)
            .map((_, i) => ({
              pageid: i,
              title: `Article ${i}`,
              snippet: `Snippet ${i}`,
              timestamp: '2024-01-01T00:00:00Z',
              wordcount: 100,
              size: 200,
            })),
          searchinfo: {
            totalhits: 5,
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await webSearchTool.execute(
        'call-3',
        { query: 'test', provider: 'wikipedia', max_results: 5 },
        new AbortController().signal,
        () => {}
      )

      expect(result.details?.resultCount).toBe(5)
    })

    it('should handle provider errors gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(
        webSearchTool.execute(
          'call-error',
          { query: 'test', provider: 'wikipedia' },
          new AbortController().signal,
          () => {}
        )
      ).rejects.toThrow()
    })

    it('should throw error for unknown provider', async () => {
      await expect(
        webSearchTool.execute(
          'call-unknown',
          { query: 'test', provider: 'unknown' as any },
          new AbortController().signal,
          () => {}
        )
      ).rejects.toThrow(/Unknown provider/)
    })

    it('should throw error for unavailable provider', async () => {
      await expect(
        webSearchTool.execute(
          'call-unavailable',
          { query: 'test', provider: 'google' },
          new AbortController().signal,
          () => {}
        )
      ).rejects.toThrow(/not available/)
    })

    it('should format results for LLM', async () => {
      const mockResponse = {
        query: {
          search: [
            {
              pageid: 123,
              title: 'Formatted Test',
              snippet: 'Test <span>snippet</span>',
              timestamp: '2024-01-01T00:00:00Z',
              wordcount: 500,
              size: 1000,
            },
          ],
          searchinfo: {
            totalhits: 1,
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await webSearchTool.execute(
        'call-format',
        { query: 'test', provider: 'wikipedia' },
        new AbortController().signal,
        () => {}
      )

      const text = result.content[0].text
      expect(text).toContain('Search Query: test')
      expect(text).toContain('Provider: wikipedia')
      expect(text).toContain('Total Results: 1')
      expect(text).toContain('1. Formatted Test')
      expect(text).toContain('Summary: Test snippet')
    })
  })

  describe('getWebSearchStatus', () => {
    it('should return tool status', () => {
      const status = getWebSearchStatus()

      expect(status).toHaveProperty('websearch')
      expect(status.websearch).toHaveProperty('available')
      expect(status.websearch).toHaveProperty('providers')
    })

    it('should list available providers', () => {
      const status = getWebSearchStatus()

      expect(status.websearch.available).toBeInstanceOf(Array)
      expect(status.websearch.providers).toBeInstanceOf(Array)
    })

    it('should show provider availability', () => {
      const status = getWebSearchStatus()

      status.websearch.providers.forEach((provider: any) => {
        expect(provider).toHaveProperty('name')
        expect(provider).toHaveProperty('available')
        expect(typeof provider.available).toBe('boolean')
      })
    })

    it('should detect Baidu availability', () => {
      delete process.env.QINIU_API_KEY

      const statusWithoutKey = getWebSearchStatus()
      const baiduWithoutKey = statusWithoutKey.websearch.providers.find(
        (p: any) => p.name === SearchProvider.BAIDU
      )
      expect(baiduWithoutKey?.available).toBe(false)

      process.env.QINIU_API_KEY = 'test-key'
      const statusWithKey = getWebSearchStatus()
      const baiduWithKey = statusWithKey.websearch.providers.find(
        (p: any) => p.name === SearchProvider.BAIDU
      )
      expect(baiduWithKey?.available).toBe(true)
    })
  })

  describe('parameters schema', () => {
    it('should have correct parameter structure', () => {
      const params = webSearchTool.parameters

      expect(params).toHaveProperty('type')
      expect(params).toHaveProperty('properties')
    })

    it('should require query parameter', () => {
      const params = webSearchTool.parameters
      // @ts-ignore - testing structure
      expect(params.properties.query).toBeDefined()
    })

    it('should support optional provider parameter', () => {
      const params = webSearchTool.parameters
      // @ts-ignore - testing structure
      expect(params.properties.provider).toBeDefined()
    })

    it('should support provider-specific options', () => {
      const params = webSearchTool.parameters
      // @ts-ignore - testing structure
      expect(params.properties.subreddit).toBeDefined()
      // @ts-ignore - testing structure
      expect(params.properties.lang).toBeDefined()
      // @ts-ignore - testing structure
      expect(params.properties.category).toBeDefined()
    })
  })
})
