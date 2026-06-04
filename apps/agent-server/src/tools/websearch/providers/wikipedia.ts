/**
 * Wikipedia Search Provider
 *
 * Uses the MediaWiki API to search Wikipedia.
 * No API key required. Supports any language edition.
 * Reference: https://www.mediawiki.org/wiki/API:Search
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

export class WikipediaSearchProvider extends BaseSearchProvider {
  name = SearchProvider.WIKIPEDIA

  isAvailable(): boolean {
    return true // No auth required
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    this.validateRequest(request)

    const lang = request.lang || 'en'
    const maxResults = Math.min(request.maxResults || 10, 50)

    try {
      const params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: request.query,
        srlimit: String(maxResults),
        srprop: 'snippet|timestamp|wordcount|size|sectiontitle',
        format: 'json',
        origin: '*',
      })

      const url = `https://${lang}.wikipedia.org/w/api.php?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new ProviderError(
          this.name,
          `API request failed: ${response.status} ${response.statusText}`,
          response.status.toString()
        )
      }

      const data: any = await response.json()

      if (data.error) {
        throw new ProviderError(this.name, data.error.info || 'Search failed', 'API_ERROR')
      }

      return this.transformResponse(data, request.query, lang)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      this.handleError(error, 'search request failed')
    }
  }

  private transformResponse(data: any, query: string, lang: string): SearchResponse {
    const searchResults = data.query?.search || []

    const results = searchResults.map((item: any) =>
      this.createResultItem({
        id: item.pageid,
        title: item.title,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        content: this.stripHtml(item.snippet || ''),
        date: item.timestamp,
        score: item.wordcount,
        metadata: {
          wordcount: item.wordcount,
          size: item.size,
          sectionTitle: item.sectiontitle || null,
        },
      })
    )

    return {
      query,
      results,
      total: data.query?.searchinfo?.totalhits || results.length,
      provider: this.name,
      hasMore: results.length < (data.query?.searchinfo?.totalhits || 0),
      requestId: this.generateRequestId(),
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  }
}

export const wikipediaProvider = new WikipediaSearchProvider()
