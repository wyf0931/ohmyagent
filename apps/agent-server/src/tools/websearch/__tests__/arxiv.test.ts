/**
 * Tests for ArXiv Search Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ArxivSearchProvider, arxivProvider } from '../providers/arxiv'
import { SearchProvider } from '../types'

describe('ArxivSearchProvider', () => {
  let provider: ArxivSearchProvider

  beforeEach(() => {
    provider = new ArxivSearchProvider()
    global.fetch = vi.fn()
  })

  it('should have correct provider name', () => {
    expect(provider.name).toBe(SearchProvider.ARXIV)
  })

  it('should always be available', () => {
    expect(provider.isAvailable()).toBe(true)
  })

  it('should use singleton export', () => {
    expect(arxivProvider).toBeInstanceOf(ArxivSearchProvider)
  })

  describe('search', () => {
    const mockAtomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>2</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2401.00001</id>
    <updated>2024-01-01T00:00:00Z</updated>
    <published>2024-01-01T00:00:00Z</published>
    <title>Test Paper 1</title>
    <summary>This is the first test paper abstract.</summary>
    <author>
      <name>John Doe</name>
    </author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <link rel="alternate" type="text/html" href="http://arxiv.org/abs/2401.00001"/>
    <link title="pdf" type="application/pdf" href="http://arxiv.org/pdf/2401.00001.pdf"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2401.00002</id>
    <updated>2024-01-02T00:00:00Z</updated>
    <published>2024-01-02T00:00:00Z</published>
    <title>Test Paper 2</title>
    <summary>This is the second test paper abstract.</summary>
    <author>
      <name>Jane Smith</name>
    </author>
    <author>
      <name>Bob Johnson</name>
    </author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <link rel="alternate" type="text/html" href="http://arxiv.org/abs/2401.00002"/>
    <link title="pdf" type="application/pdf" href="http://arxiv.org/pdf/2401.00002.pdf"/>
  </entry>
</feed>`

    it('should parse ArXiv Atom feed', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockAtomXml,
      } as Response)

      const result = await provider.search({
        query: 'machine learning',
        maxResults: 10,
      })

      expect(result.query).toBe('machine learning')
      expect(result.provider).toBe(SearchProvider.ARXIV)
      expect(result.results).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should extract paper metadata', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockAtomXml,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      const firstPaper = result.results[0]
      expect(firstPaper.id).toBe('2401.00001')
      expect(firstPaper.title).toBe('Test Paper 1')
      expect(firstPaper.content).toBe('This is the first test paper abstract.')
      expect(firstPaper.author).toBe('John Doe')
      expect(firstPaper.url).toBe('http://arxiv.org/abs/2401.00001')
      expect(firstPaper.metadata?.arxivId).toBe('2401.00001')
      expect(firstPaper.metadata?.pdfUrl).toBe('http://arxiv.org/pdf/2401.00001.pdf')
      expect(firstPaper.metadata?.primaryCategory).toBe('cs.AI')
    })

    it('should handle multiple authors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockAtomXml,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      const secondPaper = result.results[1]
      expect(secondPaper.author).toBe('Jane Smith, Bob Johnson')
      expect(secondPaper.metadata?.authors).toEqual(['Jane Smith', 'Bob Johnson'])
    })

    it('should handle multiple categories', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockAtomXml,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      const firstPaper = result.results[0]
      expect(firstPaper.metadata?.categories).toEqual(['cs.AI', 'cs.LG'])
    })

    it('should support category filtering', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockAtomXml,
      } as Response)

      await provider.search({
        query: 'neural networks',
        maxResults: 10,
        category: 'cs.AI',
      })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('cat:cs.AI')
    })

    it('should handle empty results', async () => {
      const emptyXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults>0</opensearch:totalResults>
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

    it('should decode XML entities in content', async () => {
      const xmlWithEntities = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2401.00001</id>
    <title>Test &amp; Paper</title>
    <summary>Summary with &lt;entities&gt; &amp; symbols</summary>
    <published>2024-01-01T00:00:00Z</published>
    <link rel="alternate" type="text/html" href="http://arxiv.org/abs/2401.00001"/>
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

      expect(result.results[0].title).toBe('Test & Paper')
      expect(result.results[0].content).toBe('Summary with <entities> & symbols')
    })

    it('should handle version suffixes in IDs', async () => {
      const xmlWithVersion = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2401.00001v3</id>
    <title>Test Paper</title>
    <summary>Abstract</summary>
    <published>2024-01-01T00:00:00Z</published>
    <link rel="alternate" type="text/html" href="http://arxiv.org/abs/2401.00001"/>
  </entry>
</feed>`

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => xmlWithVersion,
      } as Response)

      const result = await provider.search({
        query: 'test',
        maxResults: 10,
      })

      expect(result.results[0].id).toBe('2401.00001')
      expect(result.results[0].metadata?.arxivId).toBe('2401.00001')
    })
  })
})
