/**
 * Tests for Reddit Search Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RedditSearchProvider, redditProvider } from '../providers/reddit'
import { SearchProvider, TimeFilter } from '../types'

describe('RedditSearchProvider', () => {
  let provider: RedditSearchProvider

  beforeEach(() => {
    provider = new RedditSearchProvider()
    global.fetch = vi.fn()
  })

  it('should have correct provider name', () => {
    expect(provider.name).toBe(SearchProvider.REDDIT)
  })

  it('should always be available', () => {
    expect(provider.isAvailable()).toBe(true)
  })

  it('should use singleton export', () => {
    expect(redditProvider).toBeInstanceOf(RedditSearchProvider)
  })

  describe('search', () => {
    const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:reddit="http://www.reddit.com">
  <entry>
    <title>Test Post 1</title>
    <link href="https://www.reddit.com/r/test/comments/abc123/test_post_1/"/>
    <author>
      <name>/u/testuser1</name>
    </author>
    <published>2024-01-01T00:00:00Z</published>
    <updated>2024-01-01T00:00:00Z</updated>
    <content type="html">This is the first test post content &amp;lt;html&amp;gt;</content>
    <reddit:score>100</reddit:score>
  </entry>
  <entry>
    <title>Test Post 2</title>
    <link href="https://www.reddit.com/r/test/comments/def456/test_post_2/"/>
    <author>
      <name>/u/testuser2</name>
    </author>
    <published>2024-01-02T00:00:00Z</published>
    <updated>2024-01-02T00:00:00Z</updated>
    <content type="html">Second post with <strong>formatting</strong></content>
    <reddit:score>50</reddit:score>
  </entry>
</feed>`

    it('should parse Reddit RSS feed', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockRssXml,
      } as Response)

      const result = await provider.search({
        query: 'test query',
        maxResults: 10,
      })

      expect(result.query).toBe('test query')
      expect(result.provider).toBe(SearchProvider.REDDIT)
      expect(result.results).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should extract post metadata', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockRssXml,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      const firstPost = result.results[0]
      expect(firstPost.title).toBe('Test Post 1')
      expect(firstPost.url).toBe('https://www.reddit.com/r/test/comments/abc123/test_post_1/')
      expect(firstPost.author).toBe('testuser1')
      expect(firstPost.score).toBe(100)
      expect(firstPost.date).toBe('2024-01-01T00:00:00Z')
    })

    it('should strip HTML and decode entities', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockRssXml,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.results[0].content).toBe('This is the first test post content <html>')
      expect(result.results[1].content).toBe('Second post with formatting')
    })

    it('should support subreddit-specific search', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockRssXml,
      } as Response)

      await provider.search({
        query: 'test',
        maxResults: 10,
        subreddit: 'programming',
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('/r/programming/search.rss')
      expect(fetchCall[0]).toContain('restrict_sr=on')
    })

    it('should include user agent header', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockRssXml,
      } as Response)

      await provider.search({
        query: 'test',
        maxResults: 10,
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[2]?.headers).toMatchObject({
        'User-Agent': 'OhMyAgent/1.0 (RSS reader)',
      })
    })

    it('should handle empty results', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
</feed>`

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => emptyXml,
      } as Response)

      const result = await provider.search({
        query: 'nonexistent',
        maxResults: 10,
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should handle API errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response)

      await expect(
        provider.search({
          query: 'test',
          maxResults: 10,
        })
      ).rejects.toThrow(/API request failed/)
    })

    it('should limit content length', async () => {
      const longContentXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Long Post</title>
    <link href="https://www.reddit.com/r/test/comments/abc/"/>
    <author>
      <name>/u/user</name>
    </author>
    <published>2024-01-01T00:00:00Z</published>
    <content>${'a'.repeat(1000)}</content>
  </entry>
</feed>`

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => longContentXml,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.results[0].content.length).toBeLessThanOrEqual(500)
    })

    it('should decode XML entities', async () => {
      const xmlWithEntities = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Post &amp; Test</title>
    <link href="https://www.reddit.com/r/test/comments/abc/"/>
    <author>
      <name>/u/user</name>
    </author>
    <published>2024-01-01T00:00:00Z</published>
    <content>Content with &lt;entities&gt; &amp; symbols</content>
  </entry>
</feed>`

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => xmlWithEntities,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.results[0].title).toBe('Post & Test')
      expect(result.results[0].content).toBe('Content with <entities> & symbols')
    })
  })
})
