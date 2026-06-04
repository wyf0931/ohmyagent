/**
 * WebSearch Tool - AGENT Tool Definition
 *
 * Multi-provider web search tool for AGENT.
 * Supports: Baidu (implemented), Google, Reddit, Arxiv, HackerNews (placeholders)
 */

import { Type } from 'typebox'
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core'
import { SearchProvider } from './types'
import { baiduProvider } from './providers/baidu'
import { googleProvider } from './providers/google'
import { redditProvider } from './providers/reddit'
import { arxivProvider } from './providers/arxiv'
import { hnProvider } from './providers/hackernews'

/**
 * Provider registry
 */
const providers = {
  [SearchProvider.BAIDU]: baiduProvider,
  [SearchProvider.GOOGLE]: googleProvider,
  [SearchProvider.REDDIT]: redditProvider,
  [SearchProvider.ARXIV]: arxivProvider,
  [SearchProvider.HACKERNEWS]: hnProvider,
}

/**
 * Get available providers
 */
function getAvailableProviders(): SearchProvider[] {
  return Object.entries(providers)
    .filter(([_, provider]) => provider.isAvailable())
    .map(([name]) => name as SearchProvider)
}

/**
 * WebSearch Tool Definition for AGENT
 */
export const webSearchTool: AgentTool = {
  name: 'websearch',
  label: 'Web Search',
  description: `Search the web for information using multiple search providers.

**Available Providers:**
- baidu: Chinese search engine (default, implemented)
- google: Global search (placeholder)
- reddit: Reddit community discussions (placeholder)
- arxiv: Academic paper search (placeholder)
- hackernews: Tech news and discussions (placeholder)

**Usage:**
- Simple search: websearch(query="your search query")
- Specify provider: websearch(query="...", provider="baidu")
- Limit results: websearch(query="...", max_results=5)
- Time filter: websearch(query="...", time_filter="week")

**Returns:** Structured search results with titles, URLs, summaries, and metadata.`,

  parameters: Type.Object({
    query: Type.String({ description: 'Search query or keywords' }),
    provider: Type.Optional(
      Type.Union([
        Type.Literal('baidu'),
        Type.Literal('google'),
        Type.Literal('reddit'),
        Type.Literal('arxiv'),
        Type.Literal('hackernews'),
      ])
    ),
    max_results: Type.Optional(Type.Number({ description: 'Maximum number of results (default: 10, max: 50)' })),
    time_filter: Type.Optional(
      Type.Union([
        Type.Literal('week'),
        Type.Literal('month'),
        Type.Literal('year'),
        Type.Literal('semiyear'),
      ])
    ),
    site_filter: Type.Optional(Type.String({ description: 'Limit search to specific sites (comma-separated)' })),
  }),

  /**
   * Execute web search
   */
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { query, provider = 'baidu', max_results = 10, time_filter, site_filter } = params as any

    try {
      const providerName = provider as SearchProvider
      const searchProvider = providers[providerName]

      if (!searchProvider) {
        throw new Error(`Unknown provider: ${providerName}`)
      }

      if (!searchProvider.isAvailable()) {
        const available = getAvailableProviders().join(', ')
        throw new Error(
          `Provider ${providerName} is not available. ` +
          (available ? `Available providers: ${available}` : 'No providers configured. Set QINIU_API_KEY environment variable.')
        )
      }

      // Execute search
      const response = await searchProvider.search({
        query,
        maxResults: max_results,
        provider: providerName,
        timeFilter: time_filter,
        siteFilter: site_filter ? site_filter.split(',').map((s: string) => s.trim()) : undefined,
      })

      // Format results for LLM
      const formattedResults = formatResultsForLLM(response)

      return {
        content: [{
          type: 'text',
          text: formattedResults
        }],
        details: {
          provider: response.provider,
          total: response.total,
          resultCount: response.results.length,
        }
      }
    } catch (error) {
      throw error
    }
  },
}

/**
 * Format search results for LLM consumption
 */
function formatResultsForLLM(response: any): string {
  const parts = [
    `Search Query: ${response.query}`,
    `Provider: ${response.provider}`,
    `Total Results: ${response.total}`,
    '',
  ]

  if (response.results.length === 0) {
    parts.push('No results found.')
    return parts.join('\n')
  }

  parts.push('Top Results:\n')

  response.results.forEach((result: any, index: number) => {
    parts.push(`${index + 1}. ${result.title}`)
    parts.push(`   URL: ${result.url}`)

    if (result.author) {
      parts.push(`   Author: ${result.author}`)
    }

    if (result.source) {
      parts.push(`   Source: ${result.source}`)
    }

    if (result.date) {
      parts.push(`   Date: ${result.date}`)
    }

    if (result.score) {
      parts.push(`   Score: ${result.score}`)
    }

    parts.push(`   Summary: ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`)
    parts.push('')
  })

  return parts.join('\n')
}

/**
 * Export tool for AGENT integration
 */
export function getWebSearchTool(): AgentTool {
  return webSearchTool
}

/**
 * Get tool status
 */
export function getWebSearchStatus() {
  return {
    available: getAvailableProviders(),
    providers: Object.entries(providers).map(([name, provider]) => ({
      name,
      available: provider.isAvailable()
    }))
  }
}
