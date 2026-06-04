/**
 * WebFetch Tool Types
 *
 * Complementary to websearch - fetches full page content from URLs.
 * Used when LLM needs to read complete articles, papers, or posts.
 */

/**
 * Fetch request options
 */
export interface FetchRequest {
  url: string
  format?: 'markdown' | 'text' | 'html'
  timeout?: number
  maxLength?: number
}

/**
 * Fetch response
 */
export interface FetchResponse {
  url: string
  title?: string
  content: string
  format: string
  length: number
  truncated: boolean
  metadata?: {
    author?: string
    date?: string
    site?: string
    [key: string]: string | undefined
  }
}

/**
 * Fetcher error types
 */
export class FetcherError extends Error {
  constructor(
    public url: string,
    message: string,
    public code?: string
  ) {
    super(`[Fetch] ${url}: ${message}`)
    this.name = 'FetcherError'
  }
}
