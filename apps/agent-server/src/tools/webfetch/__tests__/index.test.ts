/**
 * Tests for WebFetch Tool - URL Detection and Main Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { webFetchTool } from '../index'
import { FetcherError } from '../types'

describe('WebFetch Tool', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should have correct tool definition', () => {
    expect(webFetchTool.name).toBe('webfetch')
    expect(webFetchTool.label).toBe('Web Fetch')
    expect(webFetchTool.description).toBeDefined()
    expect(webFetchTool.parameters).toBeDefined()
  })

  it('should export tool', () => {
    expect(webFetchTool).toBeDefined()
    expect(typeof webFetchTool.execute).toBe('function')
  })

  describe('execute', () => {
    it('should execute with URL parameter', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><head><title>Test Page</title></head><body>Test content</body></html>',
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null,
        },
      } as Response)

      const result = await webFetchTool.execute(
        'call-1',
        { url: 'https://example.com/test' },
        new AbortController().signal,
        () => {}
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
    })

    it('should handle Wikipedia URLs', async () => {
      const mockWikipediaResponse = {
        query: {
          pages: {
            '123': {
              pageid: 123,
              title: 'Test Article',
              extract: 'This is the Wikipedia article content.',
              missing: false,
            },
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWikipediaResponse,
      } as Response)

      const result = await webFetchTool.execute(
        'call-wiki',
        { url: 'https://en.wikipedia.org/wiki/Test_Article' },
        new AbortController().signal,
        () => {}
      )

      const text = result.content[0].text
      expect(text).toContain('Test Article')
      expect(text).toContain('Wikipedia article content')
    })

    it('should handle invalid URLs', async () => {
      const result = await webFetchTool.execute(
        'call-invalid',
        { url: 'not-a-valid-url' },
        new AbortController().signal,
        () => {}
      )

      expect(result.content[0].text).toContain('WebFetch failed')
      expect(result.details?.error).toContain('Invalid URL')
    })

    it('should handle empty URLs', async () => {
      const result = await webFetchTool.execute(
        'call-empty',
        { url: '' },
        new AbortController().signal,
        () => {}
      )

      expect(result.content[0].text).toContain('WebFetch failed')
    })

    it('should handle fetch errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await webFetchTool.execute(
        'call-error',
        { url: 'https://example.com' },
        new AbortController().signal,
        () => {}
      )

      expect(result.content[0].text).toContain('WebFetch failed')
    })

    it('should include metadata in result', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><head><title>Test</title></head><body>Content</body></html>',
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null,
        },
      } as Response)

      const result = await webFetchTool.execute(
        'call-meta',
        { url: 'https://example.com' },
        new AbortController().signal,
        () => {}
      )

      expect(result.details).toHaveProperty('url')
      expect(result.details).toHaveProperty('title')
      expect(result.details).toHaveProperty('length')
    })

    it('should format response for LLM', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><head><title>Test Page</title></head><body>Content here</body></html>',
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null,
        },
      } as Response)

      const result = await webFetchTool.execute(
        'call-format',
        { url: 'https://example.com' },
        new AbortController().signal,
        () => {}
      )

      const text = result.content[0].text
      expect(text).toContain('Fetched: https://example.com')
      expect(text).toContain('Title: Test Page')
      expect(text).toContain('Length:')
    })
  })

  describe('parameters schema', () => {
    it('should have correct parameter structure', () => {
      const params = webFetchTool.parameters

      expect(params).toHaveProperty('type')
      expect(params).toHaveProperty('properties')
    })

    it('should require url parameter', () => {
      const params = webFetchTool.parameters
      // @ts-ignore - testing structure
      expect(params.properties.url).toBeDefined()
    })

    it('should support optional parameters', () => {
      const params = webFetchTool.parameters
      // @ts-ignore - testing structure
      expect(params.properties.full).toBeDefined()
      // @ts-ignore - testing structure
      expect(params.properties.section).toBeDefined()
      // @ts-ignore - testing structure
      expect(params.properties.lang).toBeDefined()
      // @ts-ignore - testing structure
      expect(params.properties.include_comments).toBeDefined()
      // @ts-ignore - testing structure
      expect(params.properties.max_length).toBeDefined()
    })
  })

  describe('URL provider detection', () => {
    it('should detect Wikipedia URLs', async () => {
      const mockResponse = {
        query: {
          pages: {
            '1': {
              pageid: 1,
              title: 'Test',
              extract: 'Content',
              missing: false,
            },
          },
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      await webFetchTool.execute(
        'call-detect-wiki',
        { url: 'https://en.wikipedia.org/wiki/Test' },
        new AbortController().signal,
        () => {}
      )

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('wikipedia.org')
    })

    it('should detect Reddit URLs', async () => {
      const mockRss = `<?xml version="1.0"?>
<feed><entry><title>Test</title><link href="https://www.reddit.com/r/test/comments/abc/"/>
<author><name>/u/user</name></author><content>Test content</content></entry></feed>`

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockRss,
      } as Response)

      await webFetchTool.execute(
        'call-detect-reddit',
        { url: 'https://www.reddit.com/r/test/comments/abc/test_post/' },
        new AbortController().signal,
        () => {}
      )

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('old.reddit.com')
    })

    it('should detect ArXiv URLs', async () => {
      const mockAtom = `<?xml version="1.0"?>
<feed><entry><id>http://arxiv.org/abs/2401.00001</id>
<title>Test Paper</title><summary>Abstract</summary></entry></feed>`

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockAtom,
      } as Response)

      await webFetchTool.execute(
        'call-detect-arxiv',
        { url: 'https://arxiv.org/abs/2401.00001' },
        new AbortController().signal,
        () => {}
      )

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('export.arxiv.org')
    })

    it('should detect HackerNews URLs', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'HN Story',
          author: 'user',
          points: 100,
          created_at: '2024-01-01',
          children: [],
        }),
      } as Response)

      await webFetchTool.execute(
        'call-detect-hn',
        { url: 'https://news.ycombinator.com/item?id=12345' },
        new AbortController().signal,
        () => {}
      )

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('hn.algolia.com')
    })

    it('should use generic provider for unknown sites', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><body>Generic content</body></html>',
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null,
        },
      } as Response)

      await webFetchTool.execute(
        'call-detect-generic',
        { url: 'https://unknown-site.com/page' },
        new AbortController().signal,
        () => {}
      )

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toBe('https://unknown-site.com/page')
    })
  })
})
