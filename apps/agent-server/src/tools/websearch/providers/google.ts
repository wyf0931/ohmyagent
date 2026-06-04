/**
 * Google Search Provider (Placeholder)
 *
 * TODO: Implement Google Search API integration
 * - Google Custom Search JSON API
 * - Requires Google API key and CX ID
 * - Reference: https://developers.google.com/custom-search/v1/overview
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

export class GoogleSearchProvider extends BaseSearchProvider {
  name = SearchProvider.GOOGLE

  isAvailable(): boolean {
    // TODO: Check for Google API credentials
    return false // Disabled until implemented
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    if (!this.isAvailable()) {
      throw new ProviderError(
        this.name,
        'Google Search provider is not yet implemented. Please check back later.'
      )
    }

    // TODO: Implement Google Search API integration
    throw new ProviderError(this.name, 'Not implemented', 'NOT_IMPLEMENTED')
  }
}

export const googleProvider = new GoogleSearchProvider()
