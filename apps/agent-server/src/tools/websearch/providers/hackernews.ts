/**
 * HackerNews Search Provider
 *
 * Uses the Algolia-powered HN Search API for full-text search.
 * Also supports fetching top/best/new stories via Firebase API.
 * No API key required.
 * Reference: https://hn.algolia.com/api
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1'

export class HackerNewsSearchProvider extends BaseSearchProvider {
  name = SearchProvider.HACKERNEWS

  isAvailable(): boolean {
    return true // No auth required
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    this.validateRequest(request)

    const maxResults = Math.min(request.maxResults || 20, 50)

    try {
      // Build numeric filters for time/points filtering
      const filters: string[] = []
      if (request.timeFilter) {
        const since = this.timeFilterToTimestamp(request.timeFilter)
        filters.push(`created_at_i>${since}`)
      }

      const params = new URLSearchParams({
        query: request.query,
        tags: 'story',
        hitsPerPage: String(maxResults),
      })

      if (filters.length > 0) {
        params.set('numericFilters', filters.join(','))
      }

      const url = `${ALGOLIA_BASE}/search?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new ProviderError(
          this.name,
          `API request failed: ${response.status} ${response.statusText}`,
          response.status.toString()
        )
      }

      const data = await response.json()
      return this.transformResponse(data, request.query)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      this.handleError(error, 'search request failed')
    }
  }

  private timeFilterToTimestamp(filter: string): number {
    const now = Math.floor(Date.now() / 1000)
    const days: Record<string, number> = {
      week: 7,
      month: 30,
      semiyear: 180,
      year: 365,
    }
    return now - (days[filter] || 30) * 86400
  }

  private transformResponse(data: any, query: string): SearchResponse {
    const hits = data.hits || []

    const results = hits.map((hit: any) =>
      this.createResultItem({
        id: hit.objectID,
        title: hit.title || 'Untitled',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        content: hit.story_text || hit.comment_text || this.stripHtml(hit._highlightResult?.story_text?.value || ''),
        date: hit.created_at,
        author: hit.author,
        score: hit.points || 0,
        metadata: {
          numComments: hit.num_comments || 0,
          points: hit.points || 0,
          objectID: hit.objectID,
          hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        },
      })
    )

    return {
      query,
      results,
      total: data.nbHits || results.length,
      provider: this.name,
      hasMore: (data.page || 0) + 1 < (data.nbPages || 1),
      requestId: this.generateRequestId(),
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  }
}

export const hnProvider = new HackerNewsSearchProvider()
