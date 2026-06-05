/**
 * Tests for Wikipedia Search Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WikipediaSearchProvider, wikipediaProvider } from '../providers/wikipedia'
import { SearchProvider } from '../types'

describe('WikipediaSearchProvider', () => {
  let provider: WikipediaSearchProvider

  beforeEach(() => {
    provider = new WikipediaSearchProvider()
    global.fetch = vi.fn()
  })

  it('should have correct provider name', () => {
    expect(provider.name).toBe(SearchProvider.WIKIPEDIA)
  })

  it('should always be available', () => {
    expect(provider.isAvailable()).toBe(true)
  })

  it('should use singleton export', () => {
    expect(wikipediaProvider).toBeInstanceOf(WikipediaSearchProvider)
  })

  describe('search', () => {
    it('should perform basic search', async () => {
      const mockResponse = {
        query: {
          search: [
            {
              pageid: 123,
              title: 'Test Article',
              snippet: 'This is a test <span>article</span> snippet',
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

      const result = await provider.search({
        query: 'test query',
        maxResults: 10,
      })

      expect(result.query).toBe('test query')
      expect(result.provider).toBe(SearchProvider.WIKIPEDIA)
      expect(result.results).toHaveLength(1)
      expect(result.results[0]).toMatchObject({
        id: 123,
        title: 'Test Article',
        url: 'https://en.wikipedia.org/wiki/Test_Article',
      })
      expect(result.results[0].content).toBe('This is a test article snippet')
    })

    it('should handle empty results', async () => {
      const mockResponse = {
        query: {
          search: [],
          searchinfo: {
            totalhits: 0,
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await provider.search({
        query: 'nonexistent query',
        maxResults: 10,
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should support different languages', async () => {
      const mockResponse = {
        query: {
          search: [
            {
              pageid: 123,
              title: '测试文章',
              snippet: '测试摘要',
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

      const result = await provider.search({
        query: '测试',
        maxResults: 10,
        lang: 'zh',
      })

      expect(result.results[0].url).toBe('https://zh.wikipedia.org/wiki/%E6%B5%8B%E8%AF%95%E6%96%87%E7%AB%A0')
    })

    it('should respect maxResults limit', async () => {
      const mockResponse = {
        query: {
          search: Array(20)
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
            totalhits: 100,
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 5,
      })

      expect(result.results).toHaveLength(5)
      expect(result.hasMore).toBe(true)
    })

    it('should include metadata in results', async () => {
      const mockResponse = {
        query: {
          search: [
            {
              pageid: 123,
              title: 'Test Article',
              snippet: 'Snippet',
              timestamp: '2024-01-01T00:00:00Z',
              wordcount: 1500,
              size: 3000,
              sectiontitle: 'Introduction',
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

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.results[0].metadata).toMatchObject({
        wordcount: 1500,
        size: 3000,
        sectionTitle: 'Introduction',
      })
    })

    it('should handle API errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(
        provider.search({
          query: 'test',
          maxResults: 10,
        })
      ).rejects.toThrow(/API request failed/)
    })

    it('should handle API error responses', async () => {
      const mockResponse = {
        error: {
          code: 'invalid_query',
          info: 'Invalid search query',
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      await expect(
        provider.search({
          query: 'test',
          maxResults: 10,
        })
      ).rejects.toThrow(/Search failed/)
    })

    it('should generate unique request IDs', async () => {
      const mockResponse = {
        query: {
          search: [],
          searchinfo: {
            totalhits: 0,
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result1 = await provider.search({
        query: 'test1',
        maxResults: 10,
      })

      const result2 = await provider.search({
        query: 'test2',
        maxResults: 10,
      })

      expect(result1.requestId).not.toBe(result2.requestId)
    })
  })
})
