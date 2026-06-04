/**
 * Reddit Search Provider
 *
 * Uses old.reddit.com RSS feeds (Atom XML) for search and subreddit browsing.
 * The JSON API (reddit.com/.json) blocks unauthenticated requests since mid-2025.
 * No API key required for RSS feeds.
 * Reference: https://old.reddit.com
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

export class RedditSearchProvider extends BaseSearchProvider {
  name = SearchProvider.REDDIT

  isAvailable(): boolean {
    return true // No auth required for RSS
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    this.validateRequest(request)

    const maxResults = Math.min(request.maxResults || 25, 50)
    const subreddit = request.subreddit

    try {
      let url: string
      if (subreddit) {
        const encodedQuery = encodeURIComponent(request.query)
        url = `https://old.reddit.com/r/${subreddit}/search.rss?q=${encodedQuery}&restrict_sr=on&sort=relevance&limit=${maxResults}`
      } else {
        const encodedQuery = encodeURIComponent(request.query)
        url = `https://old.reddit.com/search.rss?q=${encodedQuery}&sort=relevance&limit=${maxResults}`
      }

      const response = await fetch(url, {
        headers: { 'User-Agent': 'OhMyAgent/1.0 (RSS reader)' },
      })

      if (!response.ok) {
        throw new ProviderError(
          this.name,
          `API request failed: ${response.status} ${response.statusText}`,
          response.status.toString()
        )
      }

      const xml = await response.text()
      return this.parseRssResponse(xml, request.query)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      this.handleError(error, 'search request failed')
    }
  }

  private parseRssResponse(xml: string, query: string): SearchResponse {
    const entries = this.splitEntries(xml)
    const results = entries.slice(0, 50).map((entry) => {
      const title = this.extractTag(entry, 'title')
      const link = this.extractLinkHref(entry)
      const author = this.extractTag(entry, 'name') || this.extractTag(entry, 'author')
      const published = this.extractTag(entry, 'published') || this.extractTag(entry, 'updated')
      const summary = this.extractTag(entry, 'summary') || this.extractTag(entry, 'content')
      const cleanSummary = this.stripHtmlAndDecode(summary || '')
      const score = this.extractScore(entry)

      return this.createResultItem({
        id: link || `reddit-${Date.now()}`,
        title: title || 'Untitled',
        url: link || '',
        content: cleanSummary.substring(0, 500),
        date: published,
        author: author?.replace('/u/', ''),
        score,
      })
    })

    return {
      query,
      results,
      total: results.length,
      provider: this.name,
      hasMore: false,
      requestId: this.generateRequestId(),
    }
  }

  // ── RSS/Atom XML helpers ──

  private splitEntries(xml: string): string[] {
    const entries: string[] = []
    const regex = /<entry>([\s\S]*?)<\/entry>/gi
    let match
    while ((match = regex.exec(xml)) !== null) {
      entries.push(match[1])
    }
    return entries
  }

  private extractTag(entry: string, tag: string): string | undefined {
    const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    if (!match) return undefined
    return this.decodeXmlEntities(match[1].trim())
  }

  private extractLinkHref(entry: string): string | undefined {
    const match = entry.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i)
    return match ? match[1] : undefined
  }

  private extractScore(entry: string): number {
    const match = entry.match(/(\d+)\s+points?/i)
    return match ? parseInt(match[1]) : 0
  }

  private stripHtmlAndDecode(str: string): string {
    return this.decodeXmlEntities(str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')).trim()
  }

  private decodeXmlEntities(str: string): string {
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
}

export const redditProvider = new RedditSearchProvider()
