/**
 * HackerNews Search Provider (Placeholder)
 *
 * TODO: Implement HackerNews Search API integration
 * - Algolia Search API: https://hn.algolia.com/api/v1/search
 * - Firebase API for real-time data: https://hacker-news.firebaseio.com/v0/
 * - No API key required
 * - Reference: https://github.com/HackerNews/API
 * - See vibe-coding-setup/skills/hackernews-hub for implementation patterns
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

export class HackerNewsSearchProvider extends BaseSearchProvider {
  name = SearchProvider.HACKERNEWS

  isAvailable(): boolean {
    // HN APIs don't require authentication
    // But we return false until implementation is complete
    return false // Disabled until implemented
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    if (!this.isAvailable()) {
      throw new ProviderError(
        this.name,
        'HackerNews Search provider is not yet implemented. Please check back later.'
      )
    }

    // TODO: Implement HN API integration
    // - Use Algolia for search with filters (tags, time, points)
    // - Use Firebase for top/best/new stories
    throw new ProviderError(this.name, 'Not implemented', 'NOT_IMPLEMENTED')
  }
}

export const hnProvider = new HackerNewsSearchProvider()
