/**
 * Pi Agent Integration Layer
 *
 * Uses Pi Agent's createAgentSession pattern with ExtensionAPI.
 * Mock implementation follows the correct structure for easy swap to real Pi.
 */

import type { Message } from '@ohmyagent/shared'

// Mock Pi types (these would come from @earendil-works/pi-coding-agent)
interface MockSession {
  subscribe: (listener: (event: any) => void) => () => void
  prompt: (message: string) => Promise<void>
  dispose: () => void
  state: {
    messages: any[]
  }
}

interface SessionOptions {
  extensions?: Array<(pi: any) => void>
  onEvent?: (event: any) => void
}

let currentSession: MockSession | null = null
let eventListeners: Array<(event: any) => void> = []

// Mock implementation that follows Pi's pattern
function createMockSession(options: SessionOptions = {}): MockSession {
  const listeners: Set<(event: any) => void> = new Set()
  const messages: any[] = []

  // Simulate Pi Agent event flow
  const simulateAgentRun = async (userMessage: string) => {
    // turn_start
    emitEvent({ type: 'turn_start', turnIndex: messages.length / 2, timestamp: Date.now() })

    // message_start
    emitEvent({
      type: 'message_start',
      message: { role: 'assistant', content: '', timestamp: Date.now() },
    })

    // tool_execution_start
    const toolCallId = `tool_${Date.now()}`
    emitEvent({
      type: 'tool_execution_start',
      toolCallId,
      toolName: 'web_search',
      args: { query: userMessage },
    })

    // Simulate delay
    await sleep(500)

    // tool_execution_update (streaming)
    emitEvent({
      type: 'tool_execution_update',
      toolCallId,
      toolName: 'web_search',
      args: { query: userMessage },
      partialResult: { status: 'Searching...' },
    })

    await sleep(500)

    // tool_execution_end
    emitEvent({
      type: 'tool_execution_end',
      toolCallId,
      toolName: 'web_search',
      result: { results: [`Found info about "${userMessage}"`] },
      isError: false,
    })

    // message_update (streaming response)
    const responseText = generateMockResponse(userMessage)
    for (const char of responseText) {
      emitEvent({
        type: 'message_update',
        message: { role: 'assistant', content: responseText },
        assistantMessageEvent: { type: 'text_delta', delta: char },
      })
      await sleep(10)
    }

    // message_end
    emitEvent({
      type: 'message_end',
      message: { role: 'assistant', content: responseText, timestamp: Date.now() },
    })

    // turn_end
    emitEvent({
      type: 'turn_end',
      turnIndex: messages.length / 2,
      message: { role: 'assistant', content: responseText },
    })

    // agent_end (last)
    emitEvent({ type: 'agent_end', messages: messages.slice() })

    messages.push({ role: 'user', content: userMessage })
    messages.push({ role: 'assistant', content: responseText })
  }

  function emitEvent(event: any) {
    listeners.forEach(listener => listener(event))
    if (options.onEvent) {
      options.onEvent(event)
    }
  }

  return {
    subscribe(listener: (event: any) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async prompt(message: string) {
      emitEvent({ type: 'agent_start' })
      await simulateAgentRun(message)
      emitEvent({ type: 'agent_end', messages: messages.slice() })
    },

    dispose() {
      listeners.clear()
    },

    state: {
      get messages() {
        return messages.slice()
      },
    },
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateMockResponse(message: string): string {
  if (message.toLowerCase().includes('code') || message.toLowerCase().includes('function')) {
    return `Here's an example function:\n\n\`\`\`typescript\nfunction example() {\n  console.log("Hello from Pi Agent!");\n  return true;\n}\n\`\`\`\n\nThis demonstrates **Markdown rendering** with:\n- Code blocks\n- Bold text\n- Syntax highlighting`
  }

  if (message.toLowerCase().includes('list') || message.toLowerCase().includes('todo')) {
    return `Here's a sample todo list:\n\n- [x] Implement UI layer\n- [x] Add Markdown support\n- [x] Display tool calls\n- [ ] Integrate real Pi Agent\n- [ ] Add skill support`
  }

  return `I received your message: "**${message}**"\n\nI'm running in **mock mode** that follows Pi Agent's event pattern:\n- ✅ tool_execution_start/update/end events\n- ✅ message_start/update/end events\n- ✅ turn_start/end events\n- ✅ Streaming response support\n\nThe real Pi Agent will replace the mock createMockSession with createAgentSession from @earendil-works/pi-coding-agent.`
}

// ============================================================================
// Public API
// ============================================================================

export async function initializeAgent() {
  console.log('✓ Mock Agent initialized (Pi Agent pattern)')
  return null
}

export async function processMessage(
  message: string,
  _conversationHistory: Message[] = []
): Promise<{ sessionId: string }> {
  // Create new session for each message (simplified)
  if (currentSession) {
    currentSession.dispose()
  }

  currentSession = createMockSession({
    onEvent: (event) => {
      eventListeners.forEach(listener => listener(event))
    },
  })

  await currentSession.prompt(message)

  return { sessionId: `session_${Date.now()}` }
}

export function subscribeToEvents(callback: (event: any) => void): () => void {
  eventListeners.push(callback)
  return () => {
    eventListeners = eventListeners.filter(l => l !== callback)
  }
}

export function dispose() {
  if (currentSession) {
    currentSession.dispose()
    currentSession = null
  }
  eventListeners = []
}

// TODO: Replace with real Pi Agent
// import { createAgentSession } from '@earendil-works/pi-coding-agent'
// import ohMyAgentExtension from './pi-extension'
//
// export async function processMessage(message: string) {
//   const { session } = await createAgentSession({
//     extensionFactories: [ohMyAgentExtension],
//   })
//
//   const events: any[] = []
//   session.subscribe((event) => {
//     events.push(event)
//   })
//
//   await session.prompt(message)
//   session.dispose()
//
//   return { events }
// }
