/**
 * Tools Registry for OhMyAgent
 *
 * Exports AGENT compatible tools.
 * Only implemented tools are enabled to prevent LLM from calling placeholders.
 */

import { webSearchTool } from './websearch'
import { webFetchTool } from './webfetch'

/**
 * Get enabled tools (only implemented ones)
 */
export function getEnabledTools() {
  const tools = []

  // WebSearch - Multi-provider search (Baidu, Wikipedia, ArXiv, HN, Reddit)
  tools.push(webSearchTool)

  // WebFetch - URL content fetching with specialized providers
  tools.push(webFetchTool)

  return tools
}

/**
 * Get tool status information
 */
export function getToolsStatus() {
  const { getWebSearchStatus } = require('./websearch')

  return {
    websearch: getWebSearchStatus(),
    webfetch: {
      available: true,
      message: 'Ready — supports Wikipedia, Reddit, ArXiv, HackerNews, and generic URLs',
    }
  }
}
