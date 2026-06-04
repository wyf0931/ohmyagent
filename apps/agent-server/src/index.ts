// Agent Server with AGENT integration and SSE streaming
// Load .env FIRST and override any existing env vars
import dotenv from 'dotenv'
dotenv.config({ override: true })

import express from 'express'
import cors from 'cors'
import type { Message } from '@ohmyagent/shared'
import { initializeAgent, processMessage, restoreSession, subscribeToEvents, dispose } from './pi-agent'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Keep track of SSE clients
const clients = new Map<string, express.Response>()

// SSE broadcast function
function broadcastToAllClients(event: any) {
  const eventData = `data: ${JSON.stringify(event)}\n\n`
  clients.forEach((res) => {
    if (res.writable) {
      res.write(eventData)
    }
  })
}

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'agent-server' })
})

// ============================================================================
// SSE Event Stream
// ============================================================================

app.get('/api/events', async (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  }

  res.writeHead(200, headers)

  const clientId = `client_${Date.now()}_${Math.random()}`
  clients.set(clientId, res)

  // Send connection established event
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`)

  // Subscribe to Pi events
  const unsubscribe = subscribeToEvents((event) => {
    if (res.writable) {
      const eventData = `data: ${JSON.stringify(event)}\n\n`
      res.write(eventData)
    }
  })

  // Cleanup on disconnect
  req.on('close', () => {
    clients.delete(clientId)
    unsubscribe()
  })
})

// ============================================================================
// Chat Endpoint
// ============================================================================

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, newSession = false } = req.body

    console.log('[API] Received chat request:', { message: message?.substring(0, 50), sessionId, newSession })

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const result = await processMessage(message, sessionId, newSession)

    console.log('[API] Message processed, session:', result.sessionId)

    res.json({
      role: 'assistant',
      content: 'Response streamed via events',
      sessionId: result.sessionId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Chat error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

// ============================================================================
// Session Restore Endpoint
// ============================================================================

app.post('/api/chat/restore', async (req, res) => {
  try {
    const { messages = [], sessionId } = req.body

    console.log(`[API] Restoring session ${sessionId} with ${messages.length} messages`)

    await restoreSession(messages, sessionId)

    res.json({
      restored: true,
      messageCount: messages.length,
      sessionId,
    })
  } catch (error) {
    console.error('[API] Restore error:', error)
    res.status(500).json({ error: 'Failed to restore session' })
  }
})

// ============================================================================
// Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  clients.forEach((res) => res.end())
  dispose()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...')
  clients.forEach((res) => res.end())
  dispose()
  process.exit(0)
})

// ============================================================================
// Start Server
// ============================================================================

async function start() {
  await initializeAgent()

  console.log(`Agent server starting on port ${PORT}...`)
  app.listen(PORT, () => {
    console.log(`✓ Agent server ready on http://localhost:${PORT}`)
    console.log(`  - POST /api/chat - Send message`)
    console.log(`  - GET /api/events - SSE event stream`)
  })
}

start()

export { app }
