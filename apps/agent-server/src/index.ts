// Agent Server with Pi Agent integration

import express from 'express'
import cors from 'cors'
import type { Message } from '@ohmyagent/shared'
import { processMessage, initializeAgent } from './pi-agent'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Initialize Pi Agent on startup
initializeAgent().catch(console.error)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'agent-server' })
})

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const response = await processMessage(message, conversationHistory)

    res.json(response)
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

console.log(`Agent server starting on port ${PORT}...`)
app.listen(PORT, () => {
  console.log(`✓ Agent server ready on http://localhost:${PORT}`)
})

export { app }
