# AGENT Integration - P0 MVP Planning

## Branch: feat/pi-agent-integration

### P0 Requirements (from docs/mvp_requirements.md)

#### ✅ Completed
- [x] UI layer for AGENT integration
- [x] ChatGPT-style layout (navbar, sidebar, content area)
- [x] Basic chat flow (user message → AGENT → display response)
- [x] Markdown rendering support
- [x] Table support (remark-gfm)

#### 🔄 In Progress
- [ ] **API Integration** - Needs completion
  - [ ] Set up ANTHROPIC_API_KEY environment variable
  - [ ] Configure AGENT model (~/.pi/agent/models.json)
  - [ ] Test actual LLM responses

- [ ] **Session Management** - Basic implementation needed
  - [ ] New chat functionality
  - [ ] Session history display
  - [ ] Load more history

#### ❌ Not Started (Post-MVP)
- Multi-instance pooling
- Redis queue
- WebSocket (HTTP polling sufficient for MVP)
- Skill support (dynamic loading)
- Data persistence (Supabase)

### Current Status

**Working:**
- ✅ SSE event streaming (agent-server → web-ui)
- ✅ Event handlers for tool calls, turns, messages
- ✅ ChatGPT-style layout with navbar/sidebar/content
- ✅ Markdown table support
- ✅ No blank message blocks

**Blocked:**
- ❌ No actual AI responses (missing API key)
- ❌ Session management not connected

### Next Steps

1. **Configure API Key**
   - Set ANTHROPIC_API_KEY in environment
   - Test with actual LLM responses
   - Verify message content displays correctly

2. **Test Chat Flow**
   - Send test message
   - Verify tool calls display
   - Verify streaming responses work
   - Check Markdown rendering (including tables)

3. **Merge Criteria**
   - All P0 requirements working
   - At least one successful end-to-end test
   - No blank message blocks
   - Loading states work correctly

### Technical Notes

**Files Modified:**
- `apps/agent-server/src/pi-agent.ts` - AGENT integration
- `apps/agent-server/src/pi-agent.ts` - Event capture (via `agent.subscribe()`)
- `apps/agent-server/src/index.ts` - SSE streaming
- `apps/web-ui/src/app/page.tsx` - Chat interface
- `apps/web-ui/src/components/*.tsx` - Layout components
- `apps/web-ui/src/app/globals.css` - Styling

**Architecture:**
- Uses AGENT's `Agent` API (not createAgentSession)
- SSE for real-time event streaming
- Event-driven architecture (tool_execution, message, turn events)
- ChatGPT-style layout pattern

### Testing Status

- [ ] End-to-end: Send message → Receive response
- [ ] Tool calls display correctly
- [ ] Markdown renders properly
- [ ] Tables display correctly
- [ ] No duplicate message blocks
- [ ] Loading states work
- [ ] Session switching works

Last updated: 2024-06-04
