/**
 * Reddit Search Provider (Placeholder)
 *
 * TODO: Implement Reddit Search API integration
 * - Reddit JSON API (may require OAuth due to 403 issues)
 * - RSS fallback for subreddit browsing
 * - Reference: https://www.reddit.com/dev/api/
 * - See vibe-coding-setup/skills/reddit-hub for implementation patterns
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

export class RedditSearchProvider extends BaseSearchProvider {
  name = SearchProvider.REDDIT

  isAvailable(): boolean {
    // TODO: Check for Reddit API credentials
    return false // Disabled until implemented
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    if (!this.isAvailable()) {
      throw new ProviderError(
        this.name,
        'Reddit Search provider is not yet implemented. Please check back later.'
      )
    }

    // TODO: Implement Reddit Search API integration
    // Consider using RSS as fallback: https://old.reddit.com/r/[subreddit]/[sort].rss
    throw new ProviderError(this.name, 'Not implemented', 'NOT_IMPLEMENTED')
  }
}

export const redditProvider = new RedditSearchProvider()
