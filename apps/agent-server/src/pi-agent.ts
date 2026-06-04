import type { Message } from '@ohmyagent/shared'

export interface AgentResponse {
  role: string
  content: string
  toolCalls?: ToolCall[]
  turns?: Turn[]
  timestamp: string
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: unknown
  status: 'pending' | 'complete' | 'error'
}

export interface Turn {
  id: string
  type: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: string
}

// Mock implementation for now - Pi Agent integration coming soon
export async function initializeAgent() {
  console.log('✓ Mock Agent initialized (Pi Agent integration pending)')
  return null
}

export async function processMessage(
  message: string,
  conversationHistory: Message[] = []
): Promise<AgentResponse> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Generate mock response with tool calls and turns
  const mockToolCalls: ToolCall[] = [
    {
      id: 'tool_1',
      name: 'web_search',
      input: { query: message },
      output: { results: [`Found information about "${message}"`] },
      status: 'complete',
    },
  ]

  const mockTurns: Turn[] = [
    {
      id: 'turn_1',
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    },
    {
      id: 'turn_2',
      type: 'assistant',
      content: 'Let me search for that information...',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'turn_3',
      type: 'tool',
      content: 'web_search completed',
      timestamp: new Date().toISOString(),
    },
  ]

  return {
    role: 'assistant',
    content: generateMockResponse(message),
    toolCalls: mockToolCalls,
    turns: mockTurns,
    timestamp: new Date().toISOString(),
  }
}

function generateMockResponse(message: string): string {
  if (message.toLowerCase().includes('code') || message.toLowerCase().includes('function')) {
    return `Here's an example function:\n\n\`\`\`typescript\nfunction example() {\n  console.log("Hello from Pi Agent!");\n  return true;\n}\n\`\`\`\n\nThis demonstrates **Markdown rendering** with:\n- Code blocks\n- Bold text\n- Syntax highlighting`
  }

  if (message.toLowerCase().includes('list') || message.toLowerCase().includes('todo')) {
    return `Here's a sample todo list:\n\n- [x] Implement UI layer\n- [x] Add Markdown support\n- [x] Display tool calls\n- [ ] Integrate real Pi Agent\n- [ ] Add skill support`
  }

  return `I received your message: "**${message}**"\n\nI'm currently running in **mock mode** with simulated tool calls and turns. The real Pi Agent integration will be added soon.\n\n**Current capabilities:**\n- ✅ Tool call display\n- ✅ Turn information\n- ✅ Markdown rendering\n- ✅ Clean UI layout`
}
