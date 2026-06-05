/**
 * Tests for HackerNews Search Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HackerNewsSearchProvider, hnProvider } from '../providers/hackernews'
import { SearchProvider } from '../types'

describe('HackerNewsSearchProvider', () => {
  let provider: HackerNewsSearchProvider

  beforeEach(() => {
    provider = new HackerNewsSearchProvider()
    global.fetch = vi.fn()
  })

  it('should have correct provider name', () => {
    expect(provider.name).toBe(SearchProvider.HACKERNEWS)
  })

  it('should always be available', () => {
    expect(provider.isAvailable()).toBe(true)
  })

  it('should use singleton export', () => {
    expect(hnProvider).toBeInstanceOf(HackerNewsSearchProvider)
  })

  describe('search', () => {
    it('should perform basic search', async () => {
      const mockResponse = {
        hits: [
          {
            objectID: '12345',
            title: 'Test Story',
            url: 'https://example.com/article',
            author: 'testuser',
            points: 100,
            num_comments: 50,
            created_at: '2024-01-01T00:00:00Z',
            story_text: 'This is a test story',
          },
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
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
      expect(result.provider).toBe(SearchProvider.HACKERNEWS)
      expect(result.results).toHaveLength(1)
      expect(result.results[0]).toMatchObject({
        id: '12345',
        title: 'Test Story',
        url: 'https://example.com/article',
        author: 'testuser',
        score: 100,
      })
    })

    it('should handle stories without URLs (Ask HN)', async () => {
      const mockResponse = {
        hits: [
          {
            objectID: '12346',
            title: 'Ask HN: Best resources for learning?',
            author: 'curious_dev',
            points: 50,
            num_comments: 30,
            created_at: '2024-01-01T00:00:00Z',
            story_text: 'Looking for recommendations...',
          },
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await provider.search({
        query: 'ask hn',
        maxResults: 10,
      })

      expect(result.results[0].url).toBe('https://news.ycombinator.com/item?id=12346')
      expect(result.results[0].metadata?.hnUrl).toBe('https://news.ycombinator.com/item?id=12346')
    })

    it('should strip HTML from highlighted text', async () => {
      const mockResponse = {
        hits: [
          {
            objectID: '12347',
            title: 'Test Story',
            author: 'testuser',
            points: 10,
            num_comments: 5,
            created_at: '2024-01-01T00:00:00Z',
            _highlightResult: {
              story_text: {
                value: 'This is a <em>highlighted</em> story',
              },
            },
          },
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.results[0].content).toBe('This is a highlighted story')
    })

    it('should support time filters', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hits: [], nbHits: 0, page: 0, nbPages: 0 }),
      } as Response)

      await provider.search({
        query: 'test',
        maxResults: 10,
        timeFilter: 'week',
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('numericFilters')
      expect(fetchCall[0]).toContain('created_at_i>')
    })

    it('should convert time filters to timestamps', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hits: [], nbHits: 0, page: 0, nbPages: 0 }),
      } as Response)

      await provider.search({
        query: 'test',
        maxResults: 10,
        timeFilter: 'week',
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      // Week = 7 days
      const weekInSeconds = 7 * 86400
      expect(fetchCall[0]).toMatch(/created_at_i>\d+/)

      await provider.search({
        query: 'test',
        maxResults: 10,
        timeFilter: 'month',
      })

      const fetchCall2 = vi.mocked(global.fetch).mock.calls[1]
      // Month = 30 days
      const monthInSeconds = 30 * 86400
      expect(fetchCall2[0]).toMatch(/created_at_i>\d+/)
    })

    it('should include metadata', async () => {
      const mockResponse = {
        hits: [
          {
            objectID: '12348',
            title: 'Test Story',
            url: 'https://example.com',
            author: 'user',
            points: 100,
            num_comments: 50,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
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
        numComments: 50,
        points: 100,
        objectID: '12348',
        hnUrl: 'https://news.ycombinator.com/item?id=12348',
      })
    })

    it('should handle empty results', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hits: [], nbHits: 0, page: 0, nbPages: 0 }),
      } as Response)

      const result = await provider.search({
        query: 'nonexistent',
        maxResults: 10,
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should handle pagination', async () => {
      const mockResponse = {
        hits: [
          {
            objectID: '12349',
            title: 'Story',
            author: 'user',
            points: 10,
            num_comments: 5,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        nbHits: 100,
        page: 0,
        nbPages: 10,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.hasMore).toBe(true)
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

    it('should decode XML entities', async () => {
      const mockResponse = {
        hits: [
          {
            objectID: '12350',
            title: 'Story &amp; Test',
            author: 'user',
            points: 10,
            num_comments: 5,
            created_at: '2024-01-01T00:00:00Z',
            _highlightResult: {
              story_text: {
                value: 'Text with &quot;quotes&quot; &amp; &lt;tags&gt;',
              },
            },
          },
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.results[0].content).toBe('Text with "quotes" & <tags>')
    })
  })
})
