// Shared types for OhMyAgent
// Aligned with AGENT event structure

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
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
}

export interface Skill {
  name: string;
  description: string;
  content: string;
}

// ============================================================================
// AGENT Event Types (from @earendil-works/pi-agent-core agent.subscribe())
// ============================================================================

export type AgentEvent =
  | MessageStartEvent
  | MessageUpdateEvent
  | MessageEndEvent
  | ToolExecutionStartEvent
  | ToolExecutionUpdateEvent
  | ToolExecutionEndEvent
  | TurnStartEvent
  | TurnEndEvent
  | AgentStartEvent
  | AgentEndEvent;

export interface MessageStartEvent {
  type: 'message_start';
  message: any; // Pi's AgentMessage
}

export interface MessageUpdateEvent {
  type: 'message_update';
  message: any;
  assistantMessageEvent: any;
}

export interface MessageEndEvent {
  type: 'message_end';
  message: any;
}

export interface ToolExecutionStartEvent {
  type: 'tool_execution_start';
  toolCallId: string;
  toolName: string;
  args: any;
}

export interface ToolExecutionUpdateEvent {
  type: 'tool_execution_update';
  toolCallId: string;
  toolName: string;
  args: any;
  partialResult: any;
}

export interface ToolExecutionEndEvent {
  type: 'tool_execution_end';
  toolCallId: string;
  toolName: string;
  result: any;
  isError: boolean;
}

export interface TurnStartEvent {
  type: 'turn_start';
  turnIndex: number;
  timestamp: number;
}

export interface TurnEndEvent {
  type: 'turn_end';
  turnIndex: number;
  message: any;
}

export interface AgentStartEvent {
  type: 'agent_start';
}

export interface AgentEndEvent {
  type: 'agent_end';
  messages: any[];
}

// ============================================================================
// UI Event Types (for frontend consumption)
// ============================================================================

export interface UIEvent {
  type: 'tool_start' | 'tool_update' | 'tool_end' | 'message_delta' | 'message_end' | 'turn_start' | 'turn_end';
  data: any;
  timestamp: number;
}

export interface ToolStartUIEvent {
  type: 'tool_start';
  toolCallId: string;
  toolName: string;
  args: any;
}

export interface ToolUpdateUIEvent {
  type: 'tool_update';
  toolCallId: string;
  toolName: string;
  partialOutput: string;
}

export interface ToolEndUIEvent {
  type: 'tool_end';
  toolCallId: string;
  toolName: string;
  result: any;
  isError: boolean;
}

export interface MessageDeltaUIEvent {
  type: 'message_delta';
  delta: string;
  fullMessage: string;
}

export interface MessageEndUIEvent {
  type: 'message_end';
  message: any;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface ToolResponse {
  success: boolean;
  tool: string;
  result?: string;
  error?: string;
  timestamp: string;
}
