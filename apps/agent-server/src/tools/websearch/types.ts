/**
 * WebSearch Tool Types
 *
 * Unified abstraction layer for multiple search providers:
 * - Baidu (implemented)
 * - Google (placeholder)
 * - Reddit (placeholder)
 * - Arxiv (placeholder)
 * - HackerNews (placeholder)
 */

/**
 * Search provider types
 */
export enum SearchProvider {
  BAIDU = 'baidu',
  GOOGLE = 'google',
  REDDIT = 'reddit',
  ARXIV = 'arxiv',
  HACKERNEWS = 'hackernews',
}

/**
 * Search time filter options
 */
export enum TimeFilter {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  SEMIYEAR = 'semiyear',
}

/**
 * Search type options
 */
export enum SearchType {
  WEB = 'web',
  IMAGE = 'image',
  VIDEO = 'video',
  NEWS = 'news',
}

/**
 * Unified search request interface
 */
export interface SearchRequest {
  query: string
  maxResults?: number
  provider?: SearchProvider
  searchType?: SearchType
  timeFilter?: TimeFilter
  siteFilter?: string[]
  // Provider-specific options
  options?: Record<string, unknown>
}

/**
 * Unified search result item
 */
export interface SearchResultItem {
  id: string | number
  title: string
  url: string
  content: string
  date?: string
  source?: string
  author?: string
  score?: number
  type?: string
  // Additional metadata
  metadata?: Record<string, unknown>
}

/**
 * Unified search response
 */
export interface SearchResponse {
  query: string
  results: SearchResultItem[]
  total: number
  provider: SearchProvider
  hasMore?: boolean
  requestId?: string
}

/**
 * Provider interface
 * All search providers must implement this interface
 */
export interface SearchProvider {
  name: SearchProvider
  search(request: SearchRequest): Promise<SearchResponse>
  isAvailable(): boolean
}

/**
 * Provider error types
 */
export class ProviderError extends Error {
  constructor(
    public provider: SearchProvider,
    message: string,
    public code?: string
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'ProviderError'
  }
}
