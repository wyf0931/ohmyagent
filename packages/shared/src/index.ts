// Shared types for OhMyAgent

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  toolCalls?: ToolCall[];
  turns?: Turn[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'complete' | 'error';
}

export interface Turn {
  id: string;
  type: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error?: string;
  currentToolCall?: ToolCall;
  agentTurns?: Turn[];
}

export interface Skill {
  name: string;
  description: string;
  content: string;
}
