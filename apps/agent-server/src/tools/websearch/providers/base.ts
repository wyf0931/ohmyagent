/**
 * Base Search Provider
 *
 * Abstract base class for search providers with common utilities.
 */

import type { SearchRequest, SearchResponse, SearchResultItem } from '../types'

export abstract class BaseSearchProvider {
  abstract name: string

  /**
   * Check if provider is available (API keys, etc.)
   */
  abstract isAvailable(): boolean

  /**
   * Execute search request
   */
  abstract search(request: SearchRequest): Promise<SearchResponse>

  /**
   * Validate request parameters
   */
  protected validateRequest(request: SearchRequest): void {
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Query cannot be empty')
    }

    if (request.maxResults && (request.maxResults < 1 || request.maxResults > 100)) {
      throw new Error('maxResults must be between 1 and 100')
    }
  }

  /**
   * Create a standardized result item
   */
  protected createResultItem(data: {
    id: string | number
    title: string
    url: string
    content: string
    date?: string
    source?: string
    author?: string
    score?: number
    type?: string
    metadata?: Record<string, unknown>
  }): SearchResultItem {
    return {
      id: data.id,
      title: this.cleanText(data.title),
      url: this.normalizeUrl(data.url),
      content: this.cleanText(data.content),
      date: data.date,
      source: data.source,
      author: data.author,
      score: data.score,
      type: data.type,
      metadata: data.metadata || {},
    }
  }

  /**
   * Clean text content
   */
  protected cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Normalize URL
   */
  protected normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.href
    } catch {
      return url
    }
  }

  /**
   * Generate a request ID
   */
  protected generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Handle provider errors
   */
  protected handleError(error: unknown, context: string): never {
    if (error instanceof Error) {
      throw new Error(`${this.name} ${context}: ${error.message}`)
    }
    throw new Error(`${this.name} ${context}: Unknown error`)
  }
}
