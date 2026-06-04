/**
 * AGENT Integration for OhMyAgent
 *
 * Uses AGENT framework with tool support.
 */

import { Agent } from '@earendil-works/pi-agent-core'
import { getModel } from '@earendil-works/pi-ai'
import type { Message } from '@ohmyagent/shared'
import { getEnabledTools } from './tools'

let agent: Agent | null = null
let eventCallbacks: Array<(event: any) => void> = []
let unsubscribeFromAgent: (() => void) | null = null

function broadcastEvent(event: any) {
  eventCallbacks.forEach(callback => callback(event))
}

/**
 * Initialize AGENT with tools
 */
export async function initializeAgent() {
  console.log('✓ Initializing AGENT with tools...')

  const tools = getEnabledTools()
  console.log(`✓ Loaded ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`)

  agent = new Agent({
    initialState: {
      systemPrompt: `You are a helpful AI assistant. Use the websearch tool when you need current or real-time information from the web.`,
      model: getModel('deepseek', 'deepseek-v4-flash'),
      tools,
    },
    getApiKey: (provider) => {
      if (provider === 'deepseek') {
        return process.env.DEEPSEEK_API_KEY
      }
      return undefined
    },
  })

  let turnIndex = 0

  unsubscribeFromAgent = agent.subscribe((event) => {
    if (event.type === 'tool_execution_start' || event.type === 'tool_execution_end') {
      console.log(`[PiAgent] ${event.type}: ${(event as any).toolName}`, 
        event.type === 'tool_execution_start' ? `args=${JSON.stringify((event as any).args)}` : `isError=${(event as any).isError}`)
    }
    switch (event.type) {
      case 'agent_start':
        broadcastEvent({ type: 'agent_start' })
        break
      case 'agent_end':
        broadcastEvent({ type: 'agent_end', messages: event.messages })
        break
      case 'turn_start':
        turnIndex++
        broadcastEvent({ type: 'turn_start', turnIndex })
        break
      case 'turn_end':
        broadcastEvent({ type: 'turn_end', turnIndex, message: event.message })
        break
      case 'message_start':
        broadcastEvent({ type: 'message_start', message: event.message })
        break
      case 'message_update':
        broadcastEvent({
          type: 'message_update',
          message: event.message,
          assistantMessageEvent: event.assistantMessageEvent,
        })
        break
      case 'message_end':
        broadcastEvent({ type: 'message_end', message: event.message })
        break
      case 'tool_execution_start':
        broadcastEvent({
          type: 'tool_execution_start',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: event.args,
        })
        break
      case 'tool_execution_update':
        broadcastEvent({
          type: 'tool_execution_update',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: event.args,
          partialResult: event.partialResult,
        })
        break
      case 'tool_execution_end':
        broadcastEvent({
          type: 'tool_execution_end',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          result: event.result,
          isError: event.isError,
        })
        break
    }
  })

  console.log('✓ AGENT initialized successfully')
  return { agent, unsubscribe: unsubscribeFromAgent }
}

/**
 * Process a message with AGENT
 * Note: AGENT maintains its own conversation state (_state.messages).
 * We only need to send the CURRENT message — the agent appends it to existing history.
 */
/**
 * Reset the agent's conversation state (for new chat sessions).
 */
export function resetAgent() {
  agent?.reset()
  console.log('[PiAgent] Agent state reset for new session')
}

/**
 * Process a message with AGENT
 * AGENT maintains its own _state.messages — we only send the current message.
 * Pass newSession=true to clear previous conversation first.
 */
export async function processMessage(
  message: string,
  sessionId?: string,
  newSession: boolean = false
): Promise<{ sessionId: string }> {
  if (!agent) {
    throw new Error('Agent not initialized. Call initializeAgent() first.')
  }

  const effectiveSessionId = sessionId || `session_${Date.now()}`

  if (newSession) {
    agent.reset()
    console.log(`[PiAgent] New session ${effectiveSessionId} — agent state cleared`)
  }

  console.log(`[PiAgent] Processing message for session ${effectiveSessionId}:`, message.substring(0, 100))

  try {
    const now = new Date()
    const timeHint = `\n[Current time: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', hour12: false })} CST / ${now.toISOString()}]`
    const fullMessage = message + timeHint

    await agent.prompt(fullMessage)

    return { sessionId: effectiveSessionId }
  } catch (error) {
    console.error('[PiAgent] Error:', error)
    broadcastEvent({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

/**
 * Subscribe to agent events
 */
export function subscribeToEvents(callback: (event: any) => void): () => void {
  eventCallbacks.push(callback)
  return () => {
    eventCallbacks = eventCallbacks.filter(l => l !== callback)
  }
}

/**
 * Restore agent state by directly injecting conversation history.
 *
 * Converts DB-format messages (user_message, assistant_message, tool_call, tool_result)
 * into the Agent's internal AgentMessage format and sets them directly via
 * `agent.state.messages`. No replay, no LLM calls, no broadcast events.
 */
export async function restoreSession(
  messages: Array<{
    role: string
    content: string
    type: string
    metadata?: Record<string, any>
    created_at?: string
  }>,
  sessionId: string
): Promise<void> {
  if (!agent) {
    throw new Error('Agent not initialized. Call initializeAgent() first.')
  }

  agent.reset()
  console.log(`[PiAgent] Restoring session ${sessionId} with ${messages.length} messages (state injection)`)

  const agentMessages: any[] = []
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]

    switch (msg.type) {
      case 'user_message':
        agentMessages.push({
          role: 'user',
          content: msg.content,
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
        })
        i++
        break

      case 'assistant_message': {
        // Build content blocks: text + any tool_call messages that follow
        const contentBlocks: any[] = [
          { type: 'text', text: msg.content },
        ]

        // Collect immediately following tool_call records
        i++
        while (i < messages.length && messages[i].type === 'tool_call') {
          const tc = messages[i]
          if (tc.metadata?.toolCallId) {
            contentBlocks.push({
              type: 'toolCall',
              id: tc.metadata.toolCallId,
              name: tc.metadata.toolName || 'unknown',
              arguments: tc.metadata.args || {},
            })
          }
          i++
        }

        agentMessages.push({
          role: 'assistant',
          content: contentBlocks,
          api: 'restored' as any,
          provider: 'restored' as any,
          model: 'restored',
          usage: { input: 0, output: 0 },
          stopReason: 'stop' as any,
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
        })
        break
      }

      case 'tool_result':
        agentMessages.push({
          role: 'toolResult',
          toolCallId: msg.metadata?.toolCallId || '',
          toolName: msg.metadata?.toolName || 'unknown',
          content: [{ type: 'text', text: msg.content }],
          isError: msg.metadata?.isError || false,
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
        })
        i++
        break

      default:
        // Skip unknown types (e.g., bare tool_call records without a preceding assistant message)
        i++
        break
    }
  }

  // Direct state injection — no replay, no LLM calls, no events
  agent.state.messages = agentMessages

  console.log(`[PiAgent] Session ${sessionId} restored — ${agentMessages.length} AgentMessages injected`)
}

/**
 * Dispose agent resources
 */
export function dispose() {
  if (unsubscribeFromAgent) {
    unsubscribeFromAgent()
    unsubscribeFromAgent = null
  }
  if (agent) {
    agent.abort()
    agent = null
  }
  eventCallbacks = []
}
