/**
 * Simple Tool Executor for MVP
 *
 * Temporary tool execution layer that works with the current
 * simple DeepSeek integration. Will be replaced by full AGENT
 * tool integration post-MVP.
 */

import { getEnabledTools } from './index'

/**
 * Execute a tool call
 *
 * Simple MVP implementation - will be enhanced with proper
 * AGENT tool integration post-MVP.
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const tools = getEnabledTools()
  const tool = tools.find(t => t.name === toolName)

  if (!tool) {
    return {
      content: [{
        type: 'text',
        text: `Tool "${toolName}" not found or not enabled.`
      }]
    }
  }

  try {
    return await tool.execute(args)
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

/**
 * Get available tools list
 */
export function getAvailableTools() {
  return getEnabledTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }))
}

/**
 * Check if a tool is available
 */
export function isToolAvailable(toolName: string): boolean {
  return getEnabledTools().some(t => t.name === toolName)
}
