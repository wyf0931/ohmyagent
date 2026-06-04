// Simple Agent Server for MVP (Pi integration deferred to post-MVP)

import express from 'express'
import cors from 'cors'
import type { Message } from '@ohmyagent/shared'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Simple agent response for MVP
const generateResponse = (userMessage: string): string => {
  const responses = [
    `I understand you said: "${userMessage}"`,
    `That's interesting! Tell me more.`,
    `How can I help you with that?`,
    `Let me think about "${userMessage}" for a moment.`,
  ]

  // Simple pattern matching
  if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
    return 'Hello! How can I help you today?'
  }

  if (userMessage.toLowerCase().includes('help')) {
    return 'I can assist you with various tasks. What do you need help with?'
  }

  // Return random response
  return responses[Math.floor(Math.random() * responses.length)]
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'agent-server' })
})

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500))

    const response = generateResponse(message)

    res.json({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

// Skill loading endpoint (MVP - stores in memory)
let currentSkill: string | null = null

app.post('/api/skill', async (req, res) => {
  try {
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Skill content is required' })
    }

    currentSkill = content
    console.log('Skill loaded:', content.substring(0, 50) + '...')

    res.json({ success: true, message: 'Skill loaded successfully' })
  } catch (error) {
    console.error('Skill load error:', error)
    res.status(500).json({ error: 'Failed to load skill' })
  }
})

app.get('/api/skill', (req, res) => {
  res.json({ skill: currentSkill ? currentSkill.substring(0, 100) + '...' : null })
})

console.log(`Agent server starting on port ${PORT}...`)
app.listen(PORT, () => {
  console.log(`✓ Agent server ready on http://localhost:${PORT}`)
})

export { app }
