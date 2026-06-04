/**
 * Pi Agent Integration Layer
 *
 * Low-level Agent integration using @earendil-works/pi-agent-core
 * and @earendil-works/pi-ai for LLM streaming.
 */

import { Agent } from '@earendil-works/pi-agent-core'
import { streamSimple, getModel } from '@earendil-works/pi-ai'
import type { Message } from '@ohmyagent/shared'

let currentAgent: Agent | null = null
let eventListeners: Array<(event: any) => void> = []

function emitEvent(event: any) {
  eventListeners.forEach(listener => listener(event))
}

// ============================================================================
// Public API
// ============================================================================

export async function initializeAgent() {
  // Providers are auto-registered by importing from @earendil-works/pi-ai
  // Models are discovered from ~/.pi/agent/models.json
  console.log('✓ Pi Agent initialized (providers ready)')
  return null
}

export async function processMessage(
  message: string,
  conversationHistory: Message[] = []
): Promise<{ sessionId: string }> {
  console.log('[PiAgent] Processing message:', message)

  // Dispose previous agent if exists
  if (currentAgent) {
    currentAgent.reset()
    currentAgent = null
  }

  try {
    console.log('[PiAgent] Creating agent...')

    // Convert conversation history to Pi AgentMessage format
    const initialMessages = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Create Agent with streamSimple as the LLM function
    // Model auto-discovery: pi-ai reads ~/.pi/agent/models.json for configured models
    const agent = new Agent({
      streamFn: streamSimple,
      initialState: {
        messages: initialMessages,
        systemPrompt: 'You are a helpful assistant integrated into OhMyAgent.',
      },
    })

    currentAgent = agent

    // Subscribe to all agent lifecycle events and forward to SSE listeners
    agent.subscribe((event: any) => {
      console.log('[PiAgent] Event:', event.type)
      emitEvent(event)
    })

    // Send the user message
    console.log('[PiAgent] Sending prompt...')
    await agent.prompt(message)
    console.log('[PiAgent] Prompt completed')

    return { sessionId: `session_${Date.now()}` }
  } catch (error) {
    console.error('[PiAgent] Error:', error)
    emitEvent({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

export function subscribeToEvents(callback: (event: any) => void): () => void {
  eventListeners.push(callback)
  return () => {
    eventListeners = eventListeners.filter(l => l !== callback)
  }
}

export function dispose() {
  if (currentAgent) {
    currentAgent.reset()
    currentAgent = null
  }
  eventListeners = []
}
