/**
 * Tools Registry for OhMyAgent
 *
 * Exports AGENT compatible tools.
 * Only implemented tools are enabled to prevent LLM from calling placeholders.
 */

import { webSearchTool } from './websearch'

/**
 * Get enabled tools (only implemented ones)
 *
 * Note: Only include tools that are fully implemented to prevent
 * the LLM from calling placeholder tools that will fail.
 */
export function getEnabledTools() {
  const tools = []

  // WebSearch - Baidu provider is implemented
  tools.push(webSearchTool)

  // WebFetch - Not yet implemented
  // tools.push(webFetchTool)

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
      available: false,
      message: 'Not yet implemented'
    }
  }
}
