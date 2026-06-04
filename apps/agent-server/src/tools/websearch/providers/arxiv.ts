/**
 * Arxiv Search Provider (Placeholder)
 *
 * TODO: Implement Arxiv Search API integration
 * - Arxiv API: https://export.arxiv.org/api/query
 * - Returns Atom XML format
 * - Support for advanced search syntax (ti:, au:, cat:, etc.)
 * - Reference: https://arxiv.org/help/api
 * - See vibe-coding-setup/skills/arxiv-hub for implementation patterns
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

export class ArxivSearchProvider extends BaseSearchProvider {
  name = SearchProvider.ARXIV

  isAvailable(): boolean {
    // Arxiv API doesn't require authentication
    // But we return false until implementation is complete
    return false // Disabled until implemented
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    if (!this.isAvailable()) {
      throw new ProviderError(
        this.name,
        'Arxiv Search provider is not yet implemented. Please check back later.'
      )
    }

    // TODO: Implement Arxiv API integration
    // - Build query with search syntax support
    // - Parse Atom XML response
    // - Extract paper metadata (authors, categories, etc.)
    throw new ProviderError(this.name, 'Not implemented', 'NOT_IMPLEMENTED')
  }
}

export const arxivProvider = new ArxivSearchProvider()
