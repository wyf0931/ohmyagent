/**
 * Simple LLM Integration using DeepSeek API directly
 * Bypasses Pi Agent's broken model discovery for MVP
 */

import type { Message } from '@ohmyagent/shared'

// Use the DeepSeek API key from ~/.pi/agent/auth.json
const DEEPSEEK_API_KEY = 'sk-54cf7f1d153d4b72a52c47ff92651178'
let eventListeners: Array<(event: any) => void> = []

function emitEvent(event: any) {
  eventListeners.forEach(listener => listener(event))
}

export async function initializeAgent() {
  console.log('✓ Simple LLM integration initialized')
  return null
}

export async function processMessage(
  message: string,
  conversationHistory: Message[] = []
): Promise<{ sessionId: string }> {
  console.log('[SimpleLLM] Processing message:', message)

  try {
    emitEvent({ type: 'agent_start' })
    emitEvent({ type: 'turn_start', turnIndex: 1 })

    // Build messages array for API
    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const aiMessage = data.choices[0]?.message?.content || 'No response'

    console.log('[SimpleLLM] AI Response:', aiMessage.slice(0, 100))

    // Emit events with the actual response
    emitEvent({
      type: 'message_start',
      message: { role: 'assistant', content: [{ type: 'text', text: aiMessage }] }
    })
    emitEvent({
      type: 'message_end',
      message: { role: 'assistant', content: [{ type: 'text', text: aiMessage }] }
    })

    emitEvent({ type: 'turn_end' })
    emitEvent({ type: 'agent_end' })

    return { sessionId: `session_${Date.now()}` }
  } catch (error) {
    console.error('[SimpleLLM] Error:', error)
    emitEvent({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
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
  eventListeners = []
}
