/**
 * Pi Agent Extension for OhMyAgent
 *
 * This extension captures Pi Agent events and makes them available
 * for WebSocket streaming to the frontend.
 *
 * Pi Extension Pattern:
 * - Non-intrusive: extends via event listeners, doesn't modify core
 * - Event-driven: subscribes to tool_execution, message, turn events
 * - Compatible: works with any Pi Agent session
 */

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

export interface EventCapture {
  events: Array<{
    type: string
    data: any
    timestamp: number
  }>
}

// Global event capture for streaming to frontend
let eventCallbacks: Array<(event: any) => void> = []

export function onPiEvent(callback: (event: any) => void) {
  eventCallbacks.push(callback)
  return () => {
    eventCallbacks = eventCallbacks.filter(cb => cb !== callback)
  }
}

function broadcastEvent(event: any) {
  const uiEvent = {
    type: event.type,
    data: event,
    timestamp: Date.now(),
  }
  eventCallbacks.forEach(cb => cb(uiEvent))
}

/**
 * OhMyAgent Extension for Pi Agent
 *
 * Captures all relevant events for UI streaming:
 * - tool_execution_start/update/end
 * - message_start/update/end
 * - turn_start/end
 */
export default function ohMyAgentExtension(pi: ExtensionAPI) {
  // === Tool Execution Events ===
  pi.on('tool_execution_start', async (event) => {
    broadcastEvent({
      type: 'tool_start',
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      args: event.args,
    })
  })

  pi.on('tool_execution_update', async (event) => {
    broadcastEvent({
      type: 'tool_update',
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      partialOutput: JSON.stringify(event.partialResult),
    })
  })

  pi.on('tool_execution_end', async (event) => {
    broadcastEvent({
      type: 'tool_end',
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      result: event.result,
      isError: event.isError,
    })
  })

  // === Message Events ===
  pi.on('message_start', async (event) => {
    broadcastEvent({
      type: 'message_start',
      message: event.message,
    })
  })

  pi.on('message_update', async (event) => {
    if (event.assistantMessageEvent?.type === 'text_delta') {
      broadcastEvent({
        type: 'message_delta',
        delta: event.assistantMessageEvent.delta,
      })
    }
  })

  pi.on('message_end', async (event) => {
    broadcastEvent({
      type: 'message_end',
      message: event.message,
    })
  })

  // === Turn Events ===
  pi.on('turn_start', async (event) => {
    broadcastEvent({
      type: 'turn_start',
      turnIndex: event.turnIndex,
      timestamp: event.timestamp,
    })
  })

  pi.on('turn_end', async (event) => {
    broadcastEvent({
      type: 'turn_end',
      turnIndex: event.turnIndex,
      message: event.message,
    })
  })

  // === Agent Lifecycle ===
  pi.on('agent_start', async () => {
    broadcastEvent({ type: 'agent_start' })
  })

  pi.on('agent_end', async (event) => {
    broadcastEvent({
      type: 'agent_end',
      messageCount: event.messages.length,
    })
  })
}
