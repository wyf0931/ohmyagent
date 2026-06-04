/**
 * WebFetch Tool - AGENT Tool Definition
 *
 * Fetches full page content from URLs with specialized providers:
 * - Wikipedia: MediaWiki extracts API (clean text, sections, multi-language)
 * - Reddit: old.reddit.com RSS feeds (post content, no auth needed)
 * - ArXiv: Export API + HTML full text extraction
 * - HackerNews: Algolia Items API (post + comment tree)
 * - Generic: basic HTML fetch with tag stripping
 */

import { Type } from 'typebox'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import type { FetchRequest, FetchResponse } from './types'
import { FetcherError } from './types'

const USER_AGENT = 'OhMyAgent/1.0 (WebFetch tool)'

// ── URL pattern detection ──

function detectProvider(url: string): 'wikipedia' | 'reddit' | 'arxiv' | 'hackernews' | 'generic' {
  const hostname = new URL(url).hostname
  if (hostname.includes('wikipedia.org')) return 'wikipedia'
  if (hostname.includes('reddit.com')) return 'reddit'
  if (hostname.includes('arxiv.org')) return 'arxiv'
  if (hostname.includes('news.ycombinator.com') || hostname.includes('ycombinator.com')) return 'hackernews'
  return 'generic'
}

// ── Main fetch dispatch ──

async function fetchPage(request: FetchRequest): Promise<FetchResponse> {
  try {
    new URL(request.url)
  } catch {
    throw new FetcherError(request.url, 'Invalid URL', 'INVALID_URL')
  }

  const provider = detectProvider(request.url)
  const maxLength = request.maxLength || 8000

  try {
    let result: FetchResponse

    switch (provider) {
      case 'wikipedia':
        result = await fetchWikipedia(request)
        break
      case 'reddit':
        result = await fetchReddit(request)
        break
      case 'arxiv':
        result = await fetchArxiv(request)
        break
      case 'hackernews':
        result = await fetchHackerNews(request)
        break
      default:
        result = await fetchGeneric(request)
    }

    // Truncate if needed
    if (result.content.length > maxLength) {
      result.content = result.content.substring(0, maxLength) + '\n\n... (truncated)'
      result.truncated = true
      result.length = result.content.length
    }

    return result
  } catch (error) {
    if (error instanceof FetcherError) throw error
    throw new FetcherError(request.url, `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'FETCH_ERROR')
  }
}

// ── Wikipedia Provider ──

async function fetchWikipedia(request: FetchRequest): Promise<FetchResponse> {
  const urlInfo = parseWikipediaUrl(request.url)
  const lang = request.lang || urlInfo.lang || 'en'
  const apiBase = `https://${lang}.wikipedia.org/w/api.php`

  // Build API request
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    utf8: '1',
    prop: 'extracts',
    explaintext: '1',
    origin: '*',
  })

  if (urlInfo.pageId) {
    params.set('pageids', urlInfo.pageId)
  } else if (urlInfo.title) {
    params.set('titles', urlInfo.title)
  } else {
    throw new FetcherError(request.url, 'Could not extract Wikipedia page title or ID', 'PARSE_ERROR')
  }

  if (!request.full) {
    params.set('exintro', '1')
  }

  // Handle section lookup
  if (request.section) {
    return fetchWikipediaSection(apiBase, urlInfo, request.section, lang)
  }

  const response = await fetch(`${apiBase}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) {
    throw new FetcherError(request.url, `Wikipedia API returned ${response.status}`, 'HTTP_ERROR')
  }

  const data: any = await response.json()
  const pages = data?.query?.pages || {}
  const pageData: any = Object.values(pages)[0] || {}

  if (pageData.missing) {
    throw new FetcherError(request.url, 'Wikipedia page does not exist', 'NOT_FOUND')
  }

  const title = pageData.title || urlInfo.title || ''
  const extract = pageData.extract || ''

  return {
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    title,
    content: extract,
    format: 'text',
    length: extract.length,
    truncated: false,
    metadata: {
      pageId: String(pageData.pageid || ''),
      lang,
    },
  }
}

async function fetchWikipediaSection(
  apiBase: string,
  urlInfo: { title?: string; pageId?: string },
  sectionName: string,
  lang: string
): Promise<FetchResponse> {
  // Step 1: Get section list
  const secParams = new URLSearchParams({
    action: 'parse',
    prop: 'sections',
    format: 'json',
    origin: '*',
  })
  if (urlInfo.title) secParams.set('page', urlInfo.title)
  if (urlInfo.pageId) secParams.set('pageid', urlInfo.pageId)

  const secResp = await fetch(`${apiBase}?${secParams}`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  const secData: any = await secResp.json()
  const sections = secData?.parse?.sections || []
  const pageTitle = secData?.parse?.title || urlInfo.title || ''

  const matched = sections.find((s: any) =>
    (s.line || '').toLowerCase().includes(sectionName.toLowerCase())
  )

  if (!matched) {
    const available = sections.map((s: any) => s.line).filter(Boolean).slice(0, 30).join(', ')
    throw new FetcherError(
      apiBase,
      `Section "${sectionName}" not found. Available sections: ${available || 'none'}`,
      'SECTION_NOT_FOUND'
    )
  }

  // Step 2: Get section content
  const contentParams = new URLSearchParams({
    action: 'parse',
    section: String(matched.index),
    prop: 'text',
    format: 'json',
    origin: '*',
  })
  if (urlInfo.title) contentParams.set('page', urlInfo.title)
  if (urlInfo.pageId) contentParams.set('pageid', urlInfo.pageId)

  const contentResp = await fetch(`${apiBase}?${contentParams}`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  const contentData: any = await contentResp.json()
  const htmlContent = contentData?.parse?.text?.['*'] || ''
  const textContent = stripHtml(htmlContent)

  return {
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`,
    title: `${pageTitle} › ${matched.line}`,
    content: textContent,
    format: 'text',
    length: textContent.length,
    truncated: false,
    metadata: {
      section: matched.line,
      sectionIndex: String(matched.index),
      lang,
    },
  }
}

function parseWikipediaUrl(url: string): { lang?: string; title?: string; pageId?: string } {
  try {
    const u = new URL(url)
    // e.g. https://en.wikipedia.org/wiki/Machine_learning
    const langMatch = u.hostname.match(/^(\w+)\.wikipedia\.org$/)
    const lang = langMatch?.[1]
    const pathMatch = u.pathname.match(/^\/wiki\/(.+)$/)
    if (pathMatch) {
      return { lang, title: decodeURIComponent(pathMatch[1]).replace(/_/g, ' ') }
    }
    // Try to get pageId from query string
    const pageId = u.searchParams.get('pageid') || u.searchParams.get('curid')
    if (pageId) return { lang, pageId }
    return { lang }
  } catch {
    return {}
  }
}

// ── Reddit Provider ──

async function fetchReddit(request: FetchRequest): Promise<FetchResponse> {
  const postInfo = parseRedditUrl(request.url)
  if (!postInfo.subreddit || !postInfo.postId) {
    // Fall back to generic fetch if we can't parse the URL
    return fetchGeneric(request)
  }

  // Use old.reddit.com RSS for reliable access (no auth needed)
  const rssUrl = `https://old.reddit.com/r/${postInfo.subreddit}/comments/${postInfo.postId}.rss`
  const response = await fetch(rssUrl, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) {
    throw new FetcherError(request.url, `Reddit returned ${response.status}`, 'HTTP_ERROR')
  }

  const xml = await response.text()

  // Parse RSS feed
  const title = extractRssTag(xml, 'title')?.replace(/^"|"$/g, '') || ''
  const author = extractRssTag(xml, 'name') || extractRssTag(xml, 'author') || ''
  const published = extractRssTag(xml, 'published') || extractRssTag(xml, 'updated') || ''
  const summary = extractRssTag(xml, 'summary') || extractRssTag(xml, 'content') || ''
  const cleanSummary = stripHtmlAndDecode(summary)

  // Extract comments from RSS entries
  const entries = splitAtomEntries(xml)
  // First entry is the post itself, rest are comments
  const commentEntries = entries.slice(1)
  const comments: string[] = []

  if (request.includeComments) {
    const commentLimit = Math.min(commentEntries.length, 30)
    for (let i = 0; i < commentLimit; i++) {
      const entry = commentEntries[i]
      const cAuthor = extractRssTag(entry, 'name') || extractRssTag(entry, 'author') || '[deleted]'
      const cText = extractRssTag(entry, 'summary') || extractRssTag(entry, 'content') || ''
      const cleanText = stripHtmlAndDecode(cText)
      if (cleanText) {
        comments.push(`👤 ${cAuthor.replace('/u/', '')}: ${cleanText.substring(0, 300)}`)
      }
    }
  }

  const content = [
    `r/${postInfo.subreddit} · Posted by ${author.replace('/u/', '')} · Score: ${postInfo.score || '?'}`,
    '',
    cleanSummary || '(no text content)',
    comments.length > 0 ? `\n\n── Comments (${comments.length}) ──\n` : '',
    ...comments.map((c, i) => `${i + 1}. ${c}`),
  ].join('\n')

  return {
    url: `https://www.reddit.com/r/${postInfo.subreddit}/comments/${postInfo.postId}`,
    title: title || postInfo.postId,
    content,
    format: 'text',
    length: content.length,
    truncated: false,
    metadata: {
      author: author.replace('/u/', ''),
      date: published,
      subreddit: postInfo.subreddit,
      score: postInfo.score ? String(postInfo.score) : undefined,
    },
  }
}

function parseRedditUrl(url: string): { subreddit?: string; postId?: string; score?: number } {
  try {
    const u = new URL(url)
    const match = u.pathname.match(/\/r\/(\w+)\/comments\/(\w+)/)
    if (match) {
      return { subreddit: match[1], postId: match[2] }
    }
    return {}
  } catch {
    return {}
  }
}

// ── ArXiv Provider ──

async function fetchArxiv(request: FetchRequest): Promise<FetchResponse> {
  const arxivId = parseArxivUrl(request.url)
  if (!arxivId) {
    return fetchGeneric(request)
  }

  // Get paper details from Export API
  const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}&max_results=1`
  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) {
    throw new FetcherError(request.url, `ArXiv API returned ${response.status}`, 'HTTP_ERROR')
  }

  const xml = await response.text()
  const entries = splitAtomEntries(xml)

  if (entries.length === 0) {
    throw new FetcherError(request.url, 'Paper not found on ArXiv', 'NOT_FOUND')
  }

  const entry = entries[0]
  const title = extractAtomTag(entry, 'title') || 'Untitled'
  const summary = extractAtomTag(entry, 'summary') || ''
  const published = extractAtomTag(entry, 'published') || ''
  const authors = extractAllAtomTags(entry, 'name')
  const primaryCat = extractAtomAttr(entry, 'arxiv:primary_category', 'term')
  const pdfLink = extractAtomLink(entry, 'pdf')
  const categories = extractAllAtomAttrs(entry, 'category', 'term')

  // Try to get full text from HTML version
  let fullText = ''
  const cleanId = arxivId.replace(/v\d+$/, '')
  try {
    const htmlResp = await fetch(`https://arxiv.org/html/${cleanId}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (htmlResp.ok) {
      const html = await htmlResp.text()
      fullText = stripHtml(html)
      // Clean up common ArXiv HTML noise
      fullText = fullText
        .replace(/\n{3,}/g, '\n\n')
        .replace(/arXiv:\d+\.\d+v\d+\s*Page \d+:\s*/g, '\n')
        .trim()
    }
  } catch {
    // Fall through to abstract-only
  }

  const content = [
    `Title: ${title}`,
    `Authors: ${authors.join(', ')}`,
    `Categories: ${categories.join(', ')}${primaryCat ? ` (primary: ${primaryCat})` : ''}`,
    `Published: ${published}`,
    pdfLink ? `PDF: ${pdfLink}` : '',
    fullText ? `\n── Full Text (${fullText.length} chars) ──\n${fullText}` : `\n── Abstract ──\n${summary}`,
  ].join('\n')

  return {
    url: `https://arxiv.org/abs/${arxivId}`,
    title,
    content,
    format: 'text',
    length: content.length,
    truncated: false,
    metadata: {
      author: authors.join(', '),
      date: published,
      arxivId,
      pdfUrl: pdfLink,
    },
  }
}

function parseArxivUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // arxiv.org/abs/2401.00001 or arxiv.org/html/2401.00001v1
    const match = u.pathname.match(/^\/(?:abs|html|pdf)\/([\w.-]+)$/)
    if (match) return match[1]
    // arxiv.org/abs/2401.00001v1
    return null
  } catch {
    return null
  }
}

// ── HackerNews Provider ──

async function fetchHackerNews(request: FetchRequest): Promise<FetchResponse> {
  const itemId = parseHNUrl(request.url)
  if (!itemId) {
    return fetchGeneric(request)
  }

  const apiUrl = `https://hn.algolia.com/api/v1/items/${itemId}`
  const response = await fetch(apiUrl)

  if (!response.ok) {
    throw new FetcherError(request.url, `HN API returned ${response.status}`, 'HTTP_ERROR')
  }

  const data: any = await response.json()
  const title = data.title || ''
  const author = data.author || ''
  const points = data.points || 0
  const createdAt = data.created_at || ''
  const url = data.url || `https://news.ycombinator.com/item?id=${itemId}`
  const hnUrl = `https://news.ycombinator.com/item?id=${itemId}`
  const text = stripHtml(data.story_text || data.text || '')

  const parts = [
    `Title: ${title}`,
    `Author: ${author} · Points: ${points} · Comments: ${data.children?.length || 0}`,
    `Date: ${createdAt}`,
    url ? `URL: ${url}` : '',
    `HN: ${hnUrl}`,
  ]

  if (text) {
    parts.push(`\n── Post Text ──\n${text.substring(0, 2000)}`)
  }

  // Include comments if requested
  if (request.includeComments && data.children?.length > 0) {
    const flattened = flattenHNComments(data.children, 0, 5)
    const commentLimit = Math.min(flattened.length, 30)
    parts.push(`\n── Comments (${commentLimit} of ${flattened.length}) ──`)
    for (let i = 0; i < commentLimit; i++) {
      const c = flattened[i]
      const indent = '  '.repeat(c.depth + 1)
      const prefix = c.depth > 0 ? '└─' : ''
      const cText = c.text.substring(0, 200).replace(/\n/g, ' ')
      parts.push(`${indent}${prefix}👤 ${c.author}: ${cText}`)
    }
  }

  return {
    url: hnUrl,
    title,
    content: parts.join('\n'),
    format: 'text',
    length: parts.join('\n').length,
    truncated: false,
    metadata: {
      author,
      date: createdAt,
      points: String(points),
      hnUrl,
    },
  }
}

function parseHNUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const id = u.searchParams.get('id')
    if (id) return id
    return null
  } catch {
    return null
  }
}

function flattenHNComments(children: any[], depth: number, maxDepth: number): any[] {
  if (depth > maxDepth) return []
  const out: any[] = []
  for (const child of children) {
    out.push({
      id: child.id,
      author: child.author || '[deleted]',
      text: stripHtml(child.text || ''),
      depth,
      createdAt: child.created_at || '',
    })
    if (child.children?.length > 0) {
      out.push(...flattenHNComments(child.children, depth + 1, maxDepth))
    }
  }
  return out
}

// ── Generic Provider ──

async function fetchGeneric(request: FetchRequest): Promise<FetchResponse> {
  const response = await fetch(request.url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(request.timeout || 10000),
  })

  if (!response.ok) {
    throw new FetcherError(request.url, `HTTP ${response.status} ${response.statusText}`, 'HTTP_ERROR')
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('text/html')) {
    const html = await response.text()
    const title = extractHtmlTitle(html)
    const text = stripHtml(html)
    const cleanText = text.replace(/\n{3,}/g, '\n\n').trim()

    return {
      url: request.url,
      title,
      content: cleanText,
      format: 'text',
      length: cleanText.length,
      truncated: false,
      metadata: {
        site: new URL(request.url).hostname,
      },
    }
  }

  // Plain text or other content
  const text = await response.text()
  return {
    url: request.url,
    content: text,
    format: 'text',
    length: text.length,
    truncated: false,
    metadata: {
      site: new URL(request.url).hostname,
    },
  }
}

// ── HTML/XML Utility Functions ──

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function stripHtmlAndDecode(str: string): string {
  return stripHtml(str)
}

function extractHtmlTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].trim() : undefined
}

// ── RSS/Atom XML Helpers ──

function splitAtomEntries(xml: string): string[] {
  const entries: string[] = []
  const regex = /<entry>([\s\S]*?)<\/entry>/gi
  let match
  while ((match = regex.exec(xml)) !== null) {
    entries.push(match[1])
  }
  return entries
}

function extractRssTag(entry: string, tag: string): string | undefined {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeXmlEntities(match[1].trim()) : undefined
}

function extractAtomTag(entry: string, tag: string): string | undefined {
  return extractRssTag(entry, tag)
}

function extractAllAtomTags(entry: string, tag: string): string[] {
  const results: string[] = []
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  let match
  while ((match = regex.exec(entry)) !== null) {
    results.push(decodeXmlEntities(match[1].trim()))
  }
  return results
}

function extractAtomAttr(entry: string, tag: string, attr: string): string | undefined {
  const match = entry.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
  return match ? match[1] : undefined
}

function extractAllAtomAttrs(entry: string, tag: string, attr: string): string[] {
  const results: string[] = []
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'gi')
  let match
  while ((match = regex.exec(entry)) !== null) {
    results.push(match[1])
  }
  return results
}

function extractAtomLink(entry: string, title: string): string | undefined {
  const match = entry.match(new RegExp(`<link[^>]*title="${title}"[^>]*href="([^"]*)"`, 'i'))
  return match ? match[1] : undefined
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Tool Definition ──

function formatResponseForLLM(response: FetchResponse): string {
  const parts = [
    `Fetched: ${response.url}`,
  ]

  if (response.title) {
    parts.push(`Title: ${response.title}`)
  }

  if (response.metadata) {
    const meta = response.metadata
    if (meta.author) parts.push(`Author: ${meta.author}`)
    if (meta.date) parts.push(`Date: ${meta.date}`)
    if (meta.subreddit) parts.push(`Subreddit: r/${meta.subreddit}`)
    if (meta.arxivId) parts.push(`ArXiv ID: ${meta.arxivId}`)
    if (meta.lang) parts.push(`Language: ${meta.lang}`)
  }

  parts.push(`Length: ${response.length} characters`)

  if (response.truncated) {
    parts.push('(Content truncated)')
  }

  parts.push('')
  parts.push(response.content)

  return parts.join('\n')
}

export const webFetchTool: AgentTool = {
  name: 'webfetch',
  label: 'Web Fetch',
  description: `Fetch full page content from a URL with specialized support for popular sites.

**Purpose:** Complement to websearch — retrieves complete article, paper, or post content for detailed reading.

**Supported Sites (automatic detection):**
- Wikipedia: Full article or intro, section lookup, multi-language
- Reddit: Post content + optional comments (via RSS, no auth needed)
- ArXiv: Paper abstract + full text from HTML version
- HackerNews: Post + optional comment tree (via Algolia API)
- Generic: Any URL, basic HTML content extraction

**Usage:**
- Fetch article: webfetch(url="https://en.wikipedia.org/wiki/Machine_learning")
- Wikipedia intro only: webfetch(url="...", full=false)
- Wikipedia section: webfetch(url="...", section="History")
- Wikipedia language: webfetch(url="...", lang="zh")
- Reddit with comments: webfetch(url="...", include_comments=true)
- ArXiv paper: webfetch(url="https://arxiv.org/abs/2401.00001")
- Limit length: webfetch(url="...", max_length=3000)

**Returns:** Full page content as text with metadata (title, author, date, etc.).`,

  parameters: Type.Object({
    url: Type.String({ description: 'URL to fetch content from. Supports Wikipedia, Reddit, ArXiv, HackerNews, and generic pages.' }),
    full: Type.Optional(Type.Boolean({ description: 'Wikipedia: get full article (true) or intro only (false). Default: true.' })),
    section: Type.Optional(Type.String({ description: 'Wikipedia: specific section name to fetch (case-insensitive, partial match supported).' })),
    lang: Type.Optional(Type.String({ description: 'Wikipedia: language code (en, zh, ja, de, fr, etc.). Auto-detected from URL if not provided.' })),
    include_comments: Type.Optional(Type.Boolean({ description: 'Reddit/HackerNews: include comments in the fetched content.' })),
    max_length: Type.Optional(Type.Number({ description: 'Maximum character length for returned content (default: 8000).' })),
  }),

  execute: async (_toolCallId, params, _signal, _onUpdate) => {
    try {
      const p = params as any
      const request: FetchRequest = {
        url: String(p.url || ''),
        format: 'text',
        timeout: 15000,
        maxLength: p.max_length ? Number(p.max_length) : 8000,
        includeComments: p.include_comments === true,
        full: p.full !== false,
        section: p.section ? String(p.section) : undefined,
        lang: p.lang ? String(p.lang) : undefined,
      }

      const response = await fetchPage(request)
      const formatted = formatResponseForLLM(response)

      return {
        content: [{
          type: 'text' as const,
          text: formatted,
        }],
        details: {
          url: response.url,
          title: response.title,
          length: response.length,
          truncated: response.truncated,
        },
      }
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `WebFetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  },
}

export function isWebFetchAvailable(): boolean {
  return true
}
