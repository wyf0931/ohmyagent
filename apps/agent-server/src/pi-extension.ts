/**
 * Pi Agent Extension for OhMyAgent
 *
 * Captures Pi Agent events for streaming to the frontend via SSE.
 * Follows the official Pi Extension pattern with ExtensionAPI.
 */

import type { ExtensionFactory, ExtensionAPI } from '@earendil-works/pi-coding-agent'

// Global event broadcast for SSE
let eventCallbacks: Array<(event: any) => void> = []

export function onPiEvent(callback: (event: any) => void) {
  eventCallbacks.push(callback)
  return () => {
    eventCallbacks = eventCallbacks.filter(cb => cb !== callback)
  }
}

function broadcastEvent(event: any) {
  eventCallbacks.forEach(cb => cb(event))
}

/**
 * OhMyAgent Extension for Pi Agent
 *
 * Captures all relevant events for UI streaming:
 * - tool_execution_start/update/end
 * - message_start/update/end
 * - turn_start/end
 * - agent_start/end
 */
const ohMyAgentExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  // === Agent Lifecycle ===
  pi.on('agent_start', async () => {
    broadcastEvent({ type: 'agent_start' })
  })

  pi.on('agent_end', async (event: any) => {
    broadcastEvent({
      type: 'agent_end',
      messages: event.messages,
    })
  })

  // === Turn Events ===
  pi.on('turn_start', async (event: any) => {
    broadcastEvent({
      type: 'turn_start',
      turnIndex: event.turnIndex,
      timestamp: event.timestamp,
    })
  })

  pi.on('turn_end', async (event: any) => {
    broadcastEvent({
      type: 'turn_end',
      turnIndex: event.turnIndex,
      message: event.message,
    })
  })

  // === Message Events ===
  pi.on('message_start', async (event: any) => {
    broadcastEvent({
      type: 'message_start',
      message: event.message,
    })
  })

  pi.on('message_update', async (event: any) => {
    broadcastEvent({
      type: 'message_update',
      message: event.message,
      assistantMessageEvent: event.assistantMessageEvent,
    })
  })

  pi.on('message_end', async (event: any) => {
    broadcastEvent({
      type: 'message_end',
      message: event.message,
    })
  })

  // === Tool Execution Events ===
  pi.on('tool_execution_start', async (event: any) => {
    broadcastEvent({
      type: 'tool_execution_start',
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      args: event.args,
    })
  })

  pi.on('tool_execution_update', async (event: any) => {
    broadcastEvent({
      type: 'tool_execution_update',
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      args: event.args,
      partialResult: event.partialResult,
    })
  })

  pi.on('tool_execution_end', async (event: any) => {
    broadcastEvent({
      type: 'tool_execution_end',
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      result: event.result,
      isError: event.isError,
    })
  })
}

export default ohMyAgentExtension
