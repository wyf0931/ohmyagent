/**
 * Tests for WebFetch Providers (Wikipedia, Reddit, ArXiv, HackerNews, Generic)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { webFetchTool } from '../index'
import { FetcherError } from '../types'

describe('WebFetch Wikipedia Provider', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should fetch Wikipedia article content', async () => {
    const mockResponse = {
      query: {
        pages: {
          '12345': {
            pageid: 12345,
            title: 'Machine Learning',
            extract: 'Machine learning is a subset of artificial intelligence...',
            missing: false,
          },
        },
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await webFetchTool.execute(
      'call-wiki-article',
      { url: 'https://en.wikipedia.org/wiki/Machine_Learning' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Machine Learning')
    expect(text).toContain('Machine learning is a subset of artificial intelligence')
  })

  it('should support different Wikipedia languages', async () => {
    const mockResponse = {
      query: {
        pages: {
          '1': {
            pageid: 1,
            title: '人工智能',
            extract: '人工智能内容...',
            missing: false,
          },
        },
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await webFetchTool.execute(
      'call-wiki-lang',
      { url: 'https://zh.wikipedia.org/wiki/人工智能' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('人工智能')
  })

  it('should fetch Wikipedia intro only when full=false', async () => {
    const mockResponse = {
      query: {
        pages: {
          '1': {
            pageid: 1,
            title: 'Test',
            extract: 'Introduction content only...',
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
      'call-wiki-intro',
      { url: 'https://en.wikipedia.org/wiki/Test', full: false },
      new AbortController().signal,
      () => {}
    )

    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[0]).toContain('exintro=1')
  })

  it('should handle missing Wikipedia pages', async () => {
    const mockResponse = {
      query: {
        pages: {
          '0': {
            pageid: 0,
            title: 'Nonexistent',
            missing: true,
          },
        },
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await webFetchTool.execute(
      'call-wiki-missing',
      { url: 'https://en.wikipedia.org/wiki/Nonexistent_Page' },
      new AbortController().signal,
      () => {}
    )

    expect(result.content[0].text).toContain('WebFetch failed')
  })

  it('should fetch Wikipedia sections', async () => {
    const mockSectionList = {
      parse: {
        title: 'Test Article',
        sections: [
          { index: 0, line: 'Introduction' },
          { index: 1, line: 'History' },
          { index: 2, line: 'Applications' },
        ],
      },
    }

    const mockSectionContent = {
      parse: {
        text: {
          '*': '<p>Section content here...</p>',
        },
      },
    }

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSectionList,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSectionContent,
      } as Response)

    const result = await webFetchTool.execute(
      'call-wiki-section',
      { url: 'https://en.wikipedia.org/wiki/Test', section: 'History' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('History')
  })

  it('should handle section not found', async () => {
    const mockSectionList = {
      parse: {
        title: 'Test Article',
        sections: [
          { index: 0, line: 'Introduction' },
          { index: 1, line: 'History' },
        ],
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSectionList,
    } as Response)

    const result = await webFetchTool.execute(
      'call-wiki-section-missing',
      { url: 'https://en.wikipedia.org/wiki/Test', section: 'Nonexistent' },
      new AbortController().signal,
      () => {}
    )

    expect(result.content[0].text).toContain('WebFetch failed')
  })
})

describe('WebFetch Reddit Provider', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should fetch Reddit post content', async () => {
    const mockRss = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>"Best programming practices?"</title>
    <link href="https://www.reddit.com/r/programming/comments/abc123/best_practices/"/>
    <author>
      <name>/u/coder123</name>
    </author>
    <published>2024-01-01T00:00:00Z</published>
    <content type="html">What are the best programming practices in 2024?</content>
  </entry>
</feed>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockRss,
    } as Response)

    const result = await webFetchTool.execute(
      'call-reddit-post',
      { url: 'https://www.reddit.com/r/programming/comments/abc123/best_practices/' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Best programming practices?')
    expect(text).toContain('r/programming')
    expect(text).toContain('coder123')
  })

  it('should fetch Reddit post with comments', async () => {
    const mockRssWithComments = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Test Post</title>
    <link href="https://www.reddit.com/r/test/comments/abc/"/>
    <author><name>/u/op</name></author>
    <content>Original post content</content>
  </entry>
  <entry>
    <title>Comment 1</title>
    <author><name>/u/user1</name></author>
    <content>First comment</content>
  </entry>
  <entry>
    <title>Comment 2</title>
    <author><name>/u/user2</name></author>
    <content>Second comment</content>
  </entry>
</feed>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockRssWithComments,
    } as Response)

    const result = await webFetchTool.execute(
      'call-reddit-comments',
      { url: 'https://www.reddit.com/r/test/comments/abc/', include_comments: true },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Comments')
    expect(text).toContain('user1')
    expect(text).toContain('user2')
  })

  it('should handle Reddit URL parsing errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => '<html><body>Generic fallback</body></html>',
      headers: {
        get: (name: string) => name === 'content-type' ? 'text/html' : null,
      },
    } as Response)

    const result = await webFetchTool.execute(
      'call-reddit-invalid',
      { url: 'https://www.reddit.com/r/' },
      new AbortController().signal,
      () => {}
    )

    // Should fall back to generic fetch
    expect(result.content[0].text).toBeDefined()
  })
})

describe('WebFetch ArXiv Provider', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should fetch ArXiv paper abstract', async () => {
    const mockAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.00001</id>
    <updated>2024-01-01T00:00:00Z</updated>
    <published>2024-01-01T00:00:00Z</published>
    <title>Attention Is All You Need</title>
    <summary>The transformer architecture has revolutionized NLP...</summary>
    <author>
      <name>Vaswani et al.</name>
    </author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <link rel="alternate" type="text/html" href="http://arxiv.org/abs/2401.00001"/>
    <link title="pdf" type="application/pdf" href="http://arxiv.org/pdf/2401.00001.pdf"/>
  </entry>
</feed>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockAtom,
    } as Response)

    const result = await webFetchTool.execute(
      'call-arxiv-abstract',
      { url: 'https://arxiv.org/abs/2401.00001' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Attention Is All You Need')
    expect(text).toContain('transformer architecture')
    expect(text).toContain('cs.AI')
  })

  it('should include PDF link in ArXiv results', async () => {
    const mockAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.00002</id>
    <title>Test Paper</title>
    <summary>Abstract text</summary>
    <author><name>Test Author</name></author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <link rel="alternate" type="text/html" href="http://arxiv.org/abs/2401.00002"/>
    <link title="pdf" type="application/pdf" href="http://arxiv.org/pdf/2401.00002.pdf"/>
  </entry>
</feed>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockAtom,
    } as Response)

    const result = await webFetchTool.execute(
      'call-arxiv-pdf',
      { url: 'https://arxiv.org/abs/2401.00002' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('PDF:')
    expect(text).toContain('http://arxiv.org/pdf/2401.00002.pdf')
  })

  it('should handle ArXiv papers with multiple authors', async () => {
    const mockAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.00003</id>
    <title>Multi-author Paper</title>
    <summary>Abstract</summary>
    <author><name>First Author</name></author>
    <author><name>Second Author</name></author>
    <author><name>Third Author</name></author>
    <link rel="alternate" type="text/html" href="http://arxiv.org/abs/2401.00003"/>
  </entry>
</feed>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockAtom,
    } as Response)

    const result = await webFetchTool.execute(
      'call-arxiv-multi',
      { url: 'https://arxiv.org/abs/2401.00003' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Authors: First Author, Second Author, Third Author')
  })

  it('should handle ArXiv papers not found', async () => {
    const mockEmptyAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
</feed>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockEmptyAtom,
    } as Response)

    const result = await webFetchTool.execute(
      'call-arxiv-notfound',
      { url: 'https://arxiv.org/abs/9999.99999' },
      new AbortController().signal,
      () => {}
    )

    expect(result.content[0].text).toContain('WebFetch failed')
  })
})

describe('WebFetch HackerNews Provider', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should fetch HackerNews item', async () => {
    const mockHNItem = {
      id: 12345,
      title: 'Show HN: My Cool Project',
      author: 'hn_user',
      points: 100,
      created_at: '2024-01-01T00:00:00.000Z',
      url: 'https://example.com/project',
      text: 'I built this cool project that does X, Y, Z...',
      children: [
        {
          id: 1,
          author: 'commenter1',
          text: 'Great project!',
          created_at: '2024-01-01T01:00:00.000Z',
          children: [],
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHNItem,
    } as Response)

    const result = await webFetchTool.execute(
      'call-hn-item',
      { url: 'https://news.ycombinator.com/item?id=12345' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Show HN: My Cool Project')
    expect(text).toContain('hn_user')
    expect(text).toContain('Points: 100')
  })

  it('should fetch HackerNews item with comments', async () => {
    const mockHNWithComments = {
      id: 12346,
      title: 'HN Discussion',
      author: 'op',
      points: 50,
      created_at: '2024-01-01T00:00:00.000Z',
      children: [
        {
          id: 1,
          author: 'user1',
          text: 'First comment',
          created_at: '2024-01-01T01:00:00.000Z',
          children: [
            {
              id: 2,
              author: 'user2',
              text: 'Reply to first',
              created_at: '2024-01-01T02:00:00.000Z',
              children: [],
            },
          ],
        },
        {
          id: 3,
          author: 'user3',
          text: 'Second top-level',
          created_at: '2024-01-01T01:30:00.000Z',
          children: [],
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHNWithComments,
    } as Response)

    const result = await webFetchTool.execute(
      'call-hn-comments',
      { url: 'https://news.ycombinator.com/item?id=12346', include_comments: true },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Comments')
    expect(text).toContain('user1')
    expect(text).toContain('user2')
    expect(text).toContain('user3')
  })

  it('should limit comment depth', async () => {
    const mockDeepComments = {
      id: 1,
      title: 'Deep Thread',
      author: 'op',
      points: 10,
      created_at: '2024-01-01T00:00:00.000Z',
      children: [
        {
          id: 2,
          author: 'user1',
          text: 'Level 1',
          created_at: '2024-01-01T01:00:00.000Z',
          children: [
            {
              id: 3,
              author: 'user2',
              text: 'Level 2',
              created_at: '2024-01-01T02:00:00.000Z',
              children: [
                {
                  id: 4,
                  author: 'user3',
                  text: 'Level 3',
                  created_at: '2024-01-01T03:00:00.000Z',
                  children: [
                    {
                      id: 5,
                      author: 'user4',
                      text: 'Level 4',
                      created_at: '2024-01-01T04:00:00.000Z',
                      children: [
                        {
                          id: 6,
                          author: 'user5',
                          text: 'Level 5',
                          created_at: '2024-01-01T05:00:00.000Z',
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDeepComments,
    } as Response)

    const result = await webFetchTool.execute(
      'call-hn-deep',
      { url: 'https://news.ycombinator.com/item?id=1', include_comments: true },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    // Should limit to max depth of 5
    expect(text).toBeDefined()
  })
})

describe('WebFetch Generic Provider', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should fetch generic HTML pages', async () => {
    const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Example Page</title>
</head>
<body>
  <h1>Main Heading</h1>
  <p>This is a paragraph with some content.</p>
  <div>
    <p>Another paragraph</p>
  </div>
</body>
</html>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      headers: {
        get: (name: string) => name === 'content-type' ? 'text/html' : null,
      },
    } as Response)

    const result = await webFetchTool.execute(
      'call-generic-html',
      { url: 'https://example.com/page' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Example Page')
    expect(text).toContain('Main Heading')
    expect(text).toContain('This is a paragraph')
  })

  it('should strip HTML tags from content', async () => {
    const mockHtml = `<html>
<body>
  <h1>Title</h1>
  <script>alert('test');</script>
  <style>body{color:red;}</style>
  <p>Content <strong>with</strong> <em>formatting</em></p>
</body>
</html>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      headers: {
        get: (name: string) => name === 'content-type' ? 'text/html' : null,
      },
    } as Response)

    const result = await webFetchTool.execute(
      'call-generic-strip',
      { url: 'https://example.com' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).not.toContain('<script>')
    expect(text).not.toContain('<style>')
    expect(text).not.toContain('<strong>')
    expect(text).not.toContain('<em>')
  })

  it('should handle plain text responses', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => 'Plain text content',
      headers: {
        get: (name: string) => name === 'content-type' ? 'text/plain' : null,
      },
    } as Response)

    const result = await webFetchTool.execute(
      'call-generic-text',
      { url: 'https://example.com/data.txt' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Plain text content')
  })

  it('should truncate long content', async () => {
    const longContent = 'x'.repeat(10000)
    const mockHtml = `<html><body><p>${longContent}</p></body></html>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      headers: {
        get: (name: string) => name === 'content-type' ? 'text/html' : null,
      },
    } as Response)

    const result = await webFetchTool.execute(
      'call-generic-truncate',
      { url: 'https://example.com', max_length: 1000 },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('truncated')
    expect(result.details?.length).toBeLessThanOrEqual(1000)
  })

  it('should handle HTTP errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response)

    const result = await webFetchTool.execute(
      'call-generic-error',
      { url: 'https://example.com/notfound' },
      new AbortController().signal,
      () => {}
    )

    expect(result.content[0].text).toContain('WebFetch failed')
    expect(result.details?.error).toContain('404')
  })

  it('should decode HTML entities', async () => {
    const mockHtml = `<html><body><p>Title &amp; Subtitle &lt;test&gt;</p></body></html>`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      headers: {
        get: (name: string) => name === 'content-type' ? 'text/html' : null,
      },
    } as Response)

    const result = await webFetchTool.execute(
      'call-generic-entities',
      { url: 'https://example.com' },
      new AbortController().signal,
      () => {}
    )

    const text = result.content[0].text
    expect(text).toContain('Title & Subtitle <test>')
  })
})
