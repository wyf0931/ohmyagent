/**
 * Tests for Baidu Search Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BaiduSearchProvider, baiduProvider } from '../providers/baidu'
import { SearchProvider } from '../types'

describe('BaiduSearchProvider', () => {
  let provider: BaiduSearchProvider

  beforeEach(() => {
    provider = new BaiduSearchProvider()
    global.fetch = vi.fn()
    // Clear environment before each test
    delete process.env.QINIU_API_KEY
  })

  it('should have correct provider name', () => {
    expect(provider.name).toBe(SearchProvider.BAIDU)
  })

  it('should not be available without API key', () => {
    expect(provider.isAvailable()).toBe(false)
  })

  it('should be available with API key', () => {
    process.env.QINIU_API_KEY = 'test-key'
    expect(provider.isAvailable()).toBe(true)
  })

  it('should use singleton export', () => {
    expect(baiduProvider).toBeInstanceOf(BaiduSearchProvider)
  })

  describe('search', () => {
    beforeEach(() => {
      process.env.QINIU_API_KEY = 'test-api-key'
    })

    it('should perform basic search', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [
            {
              id: '1',
              title: 'Test Result 1',
              url: 'https://example.com/1',
              content: 'Test content for result 1',
              date: '2024-01-01',
              source: 'example.com',
              score: 0.9,
              type: 'web',
            },
          ],
          total: 1,
          request_id: 'req-123',
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
      expect(result.provider).toBe(SearchProvider.BAIDU)
      expect(result.results).toHaveLength(1)
      expect(result.results[0]).toMatchObject({
        id: '1',
        title: 'Test Result 1',
        url: 'https://example.com/1',
        content: 'Test content for result 1',
      })
    })

    it('should include all response fields', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [
            {
              id: '2',
              title: 'Full Result',
              url: 'https://example.com/full',
              content: 'Complete content',
              date: '2024-01-01',
              source: 'example.com',
              score: 0.95,
              type: 'web',
              icon: 'https://example.com/icon.png',
              authority_score: 0.8,
              image: 'https://example.com/image.jpg',
              video: 'https://example.com/video.mp4',
            },
          ],
          total: 1,
          request_id: 'req-456',
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
        icon: 'https://example.com/icon.png',
        authorityScore: 0.8,
        image: 'https://example.com/image.jpg',
        video: 'https://example.com/video.mp4',
      })
    })

    it('should include request ID from API', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [],
          total: 0,
          request_id: 'test-request-id',
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

      expect(result.requestId).toBe('test-request-id')
    })

    it('should handle empty results', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [],
          total: 0,
          request_id: 'req-empty',
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await provider.search({
        query: 'nonexistent',
        maxResults: 10,
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid API key',
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
      ).rejects.toThrow(/Invalid API key/)
    })

    it('should handle HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)

      await expect(
        provider.search({
          query: 'test',
          maxResults: 10,
        })
      ).rejects.toThrow(/API request failed/)
    })

    it('should include proper headers', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { results: [], total: 0 } }),
      } as Response)

      await provider.search({
        query: 'test',
        maxResults: 10,
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[1]?.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key',
      })
    })

    it('should use POST method', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { results: [], total: 0 } }),
      } as Response)

      await provider.search({
        query: 'test',
        maxResults: 10,
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[1]?.method).toBe('POST')
    })

    it('should send proper request body', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { results: [], total: 0 } }),
      } as Response)

      await provider.search({
        query: 'test query',
        maxResults: 15,
        searchType: 'news',
        timeFilter: 'week',
        siteFilter: ['example.com', 'test.com'],
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)
      expect(body).toMatchObject({
        query: 'test query',
        max_results: 15,
        search_type: 'news',
        time_filter: 'week',
        site_filter: ['example.com', 'test.com'],
      })
    })

    it('should throw error when API key not configured', async () => {
      delete process.env.QINIU_API_KEY

      await expect(
        provider.search({
          query: 'test',
          maxResults: 10,
        })
      ).rejects.toThrow(/QINIU_API_KEY not configured/)
    })

    it('should handle pagination', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: Array(10).fill(null).map((_, i) => ({
            id: String(i),
            title: `Result ${i}`,
            url: `https://example.com/${i}`,
            content: `Content ${i}`,
          })),
          total: 100,
          request_id: 'req-page',
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

      expect(result.results).toHaveLength(10)
      expect(result.hasMore).toBe(true)
    })

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [
            {
              id: '1',
              title: 'Minimal Result',
              url: 'https://example.com',
              content: 'Content',
            },
          ],
          total: 1,
          request_id: 'req-min',
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

      expect(result.results[0]).toMatchObject({
        id: '1',
        title: 'Minimal Result',
        url: 'https://example.com',
        content: 'Content',
      })
      expect(result.results[0].date).toBeUndefined()
      expect(result.results[0].source).toBeUndefined()
    })
  })
})
