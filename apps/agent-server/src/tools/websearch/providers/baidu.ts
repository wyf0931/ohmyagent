/**
 * Baidu Search Provider
 *
 * Implementation using Qiniu Baidu Search API.
 * API Documentation: https://api.qnaigc.com/v1
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse, SearchResultItem } from '../types'
import { SearchProvider, ProviderError } from '../types'

const BAIDU_API_BASE = 'https://api.qnaigc.com/v1'

export class BaiduSearchProvider extends BaseSearchProvider {
  name = SearchProvider.BAIDU

  private getApiKey(): string {
    return process.env.QINIU_API_KEY || ''
  }

  /**
   * Check if Baidu API key is configured
   */
  isAvailable(): boolean {
    const key = this.getApiKey()
    return !!key && key.length > 0
  }

  /**
   * Execute Baidu search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    this.validateRequest(request)

    if (!this.isAvailable()) {
      throw new ProviderError(
        this.name,
        'QINIU_API_KEY not configured. Please set QINIU_API_KEY environment variable.'
      )
    }

    try {
      const response = await fetch(`${BAIDU_API_BASE}/search/web`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify({
          query: request.query,
          max_results: request.maxResults || 10,
          search_type: request.searchType || 'web',
          time_filter: request.timeFilter,
          site_filter: request.siteFilter,
        }),
      })

      if (!response.ok) {
        throw new ProviderError(
          this.name,
          `API request failed: ${response.status} ${response.statusText}`,
          response.status.toString()
        )
      }

      const data = await response.json()

      if (!data.success) {
        throw new ProviderError(this.name, data.message || 'Search failed', 'API_ERROR')
      }

      return this.transformResponse(data.data, request.query)
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      this.handleError(error, 'search request failed')
    }
  }

  /**
   * Transform Baidu API response to standard format
   */
  private transformResponse(data: any, query: string): SearchResponse {
    const results: SearchResultItem[] = (data.results || []).map((item: any) =>
      this.createResultItem({
        id: item.id,
        title: item.title || '',
        url: item.url || '',
        content: item.content || '',
        date: item.date,
        source: item.source,
        score: item.score,
        type: item.type,
        metadata: {
          icon: item.icon,
          authorityScore: item.authority_score,
          image: item.image,
          video: item.video,
        },
      })
    )

    return {
      query,
      results,
      total: data.total || results.length,
      provider: this.name,
      hasMore: results.length < (data.total || 0),
      requestId: data.request_id,
    }
  }
}

// Export singleton instance
export const baiduProvider = new BaiduSearchProvider()
