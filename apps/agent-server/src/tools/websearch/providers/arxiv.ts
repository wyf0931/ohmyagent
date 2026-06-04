/**
 * ArXiv Search Provider
 *
 * Uses the ArXiv Export API (Atom XML format).
 * No API key required.
 * Reference: https://arxiv.org/help/api
 */

import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'
import { SearchProvider, ProviderError } from '../types'

const ARXIV_API_BASE = 'https://export.arxiv.org/api/query'

export class ArxivSearchProvider extends BaseSearchProvider {
  name = SearchProvider.ARXIV

  isAvailable(): boolean {
    return true // No auth required
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    this.validateRequest(request)

    const maxResults = Math.min(request.maxResults || 10, 50)
    let searchQuery = `all:${encodeURIComponent(request.query)}`

    if (request.category) {
      searchQuery += `+AND+cat:${encodeURIComponent(request.category)}`
    }

    try {
      const url = `${ARXIV_API_BASE}?search_query=${searchQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`
      const response = await fetch(url)

      if (!response.ok) {
        throw new ProviderError(
          this.name,
          `API request failed: ${response.status} ${response.statusText}`,
          response.status.toString()
        )
      }

      const xml = await response.text()
      return this.parseAtomResponse(xml, request.query)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      this.handleError(error, 'search request failed')
    }
  }

  private parseAtomResponse(xml: string, query: string): SearchResponse {
    const entries = this.splitEntries(xml)
    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/)
    const total = totalMatch ? parseInt(totalMatch[1]) : entries.length

    const results = entries.map((entry) => {
      const id = this.extractTag(entry, 'id') || ''
      const arxivId = id.replace('http://arxiv.org/abs/', '').replace(/v\d+$/, '')
      const title = this.extractTag(entry, 'title')
      const summary = this.extractTag(entry, 'summary')
      const published = this.extractTag(entry, 'published')
      const authors = this.extractAllTags(entry, 'name')
      const primaryCat = this.extractAttr(entry, 'arxiv:primary_category', 'term')
      const categories = this.extractAllAttrs(entry, 'category', 'term')

      // Extract PDF link
      const pdfLink = this.extractLinkByTitle(entry, 'pdf')
      const abstractLink = this.extractLinkByRel(entry, 'alternate')

      return this.createResultItem({
        id: arxivId,
        title: title || 'Untitled',
        url: abstractLink || `https://arxiv.org/abs/${arxivId}`,
        content: summary || '',
        date: published,
        author: authors.join(', '),
        metadata: {
          arxivId,
          authors,
          primaryCategory: primaryCat,
          categories,
          pdfUrl: pdfLink,
          published,
        },
      })
    })

    return {
      query,
      results,
      total,
      provider: this.name,
      hasMore: results.length < total,
      requestId: this.generateRequestId(),
    }
  }

  // ── XML helpers ──

  private splitEntries(xml: string): string[] {
    const entries: string[] = []
    const regex = /<entry>([\s\S]*?)<\/entry>/g
    let match
    while ((match = regex.exec(xml)) !== null) {
      entries.push(match[1])
    }
    return entries
  }

  private extractTag(entry: string, tag: string): string | undefined {
    const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return match ? this.decodeXmlEntities(match[1].trim()) : undefined
  }

  private extractAllTags(entry: string, tag: string): string[] {
    const results: string[] = []
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
    let match
    while ((match = regex.exec(entry)) !== null) {
      results.push(this.decodeXmlEntities(match[1].trim()))
    }
    return results
  }

  private extractAttr(entry: string, tag: string, attr: string): string | undefined {
    const match = entry.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
    return match ? match[1] : undefined
  }

  private extractAllAttrs(entry: string, tag: string, attr: string): string[] {
    const results: string[] = []
    const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'gi')
    let match
    while ((match = regex.exec(entry)) !== null) {
      results.push(match[1])
    }
    return results
  }

  private extractLinkByTitle(entry: string, title: string): string | undefined {
    const match = entry.match(new RegExp(`<link[^>]*title="${title}"[^>]*href="([^"]*)"`, 'i'))
    return match ? match[1] : undefined
  }

  private extractLinkByRel(entry: string, rel: string): string | undefined {
    const match = entry.match(new RegExp(`<link[^>]*rel="${rel}"[^>]*href="([^"]*)"`, 'i'))
    return match ? match[1] : undefined
  }

  private decodeXmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }
}

export const arxivProvider = new ArxivSearchProvider()
