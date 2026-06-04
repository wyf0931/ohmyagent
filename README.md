# ohmyagent

An AI Agent platform with dynamic skill injection, multi-user session management, and elastic instance pooling.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- DeepSeek API key (get from [platform.deepseek.com](https://platform.deepseek.com))

### Installation
```bash
# Install dependencies
pnpm install

# Or use npm
npm install
```

### Configuration

Set up your DeepSeek API key in `apps/agent-server/src/pi-agent.ts`:

```typescript
const DEEPSEEK_API_KEY = 'your-deepseek-api-key-here'
```

### Start Development Servers

**Using ops.sh script (recommended):**
```bash
# Start all services (default: agent on 4000, web on 3002)
./bin/ops.sh start

# Start with custom ports
./bin/ops.sh --port 3000 start  # agent:3000, web:3001

# Check status
./bin/ops.sh status

# View logs
./bin/ops.sh logs agent
./bin/ops.sh logs -f web  # Follow web UI logs

# Stop all services
./bin/ops.sh stop
```

**Manual startup (separate terminals):**
```bash
# Terminal 1 - Agent Server
cd apps/agent-server
pnpm dev  # Runs on http://localhost:4000

# Terminal 2 - Web UI
cd apps/web-ui
pnpm dev  # Runs on http://localhost:3002
```

### Usage
1. Open http://localhost:3002 in your browser
2. Type a message in the input box
3. Click "Send" or press Enter
4. AI responses will appear in real-time

### Project Structure
```
ohmyagent/
├── apps/
│   ├── web-ui/          # Next.js frontend (port 3002)
│   ├── agent-server/    # Express backend (port 4000)
│   └── pool-manager/    # Instance pool (post-MVP)
├── packages/
│   ├── shared/          # Shared types
│   └── db/              # Database schemas
├── docs/                # Documentation
└── PLANNING.md          # MVP planning tracker
```

### Current Status ✅
- **P0 MVP Complete**: Basic chat flow with real AI responses working
- **LLM Integration**: DeepSeek API (direct integration)
- **UI**: ChatGPT-style interface with Markdown support
- **Events**: SSE streaming for real-time updates
- **Testing**: Manual testing with Chrome DevTools MCP

### Development Commands

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI / shadcn/ui
- **Icons**: Lucide React
- **State**: Zustand / React Context
- **Real-time**: WebSocket (Socket.IO)

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **API**: Express.js / tRPC
- **Auth**: Supabase Auth (OAuth, JWT)

### Agent Engine ⭐
- **Core**: AGENT Framework (`@earendil-works/pi-agent-core`)
- **Subagent**: `nicobailon/pi-subagents`
- **Skills**: Agent Skills standard (max 30 per session)
- **SOUL**: Multi-level system prompts (global/project/session)

**Why Pi?** TypeScript native, dynamic skill injection, mature subagent ecosystem, multi-model support (20+ providers), not locked to Claude Code binary

### Data & Queue
- **Database**: Supabase (PostgreSQL with RLS)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Queue**: BullMQ (Redis)

### Deployment
- **Platform**: Railway (serverless with 10-min idle timeout)
- **Scaling**: 4 active instances, 10 max (elastic pool)
- **Monitoring**: Railway Logs + Metrics

### Development
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Testing**: Vitest + Playwright
- **Linting**: ESLint + Prettier

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Web UI (Next.js + Tailwind)          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          API Gateway (Express.js)            │
│  - User Authentication                       │
│  - Skill Hub Interface                       │
│  - Session Management                        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            AGENT Engine                   │
│  - Dynamic Skill Loading                     │
│  - Subagent System                           │
│  - Multi-Provider Support                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Railway Instance Pool (4-10)         │
│  - Elastic Scaling                           │
│  - 10-min Idle Timeout                       │
│  - Auto-suspend/wake                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Supabase Backend                     │
│  - PostgreSQL (RLS)                           │
│  - Auth (OAuth)                              │
│  - Storage (Files/Sessions)                 │
└─────────────────────────────────────────────┘
```

## Key Features

- **Dynamic Skill Injection** - Load skills on-demand from Skill Hub (max 30 per session)
- **SOUL Configuration** - Multi-level system prompt customization (global/project/session)
- **Multi-User Isolation** - Container-based session isolation with elastic pooling
- **Session Persistence** - Checkpoint/restore mechanism for transparent resume
- **GitHub Integration** - Clone skills directly from repositories

## Key Dependencies

```json
{
  "dependencies": {
    "@earendil-works/pi-agent-core": "latest",
    "@earendil-works/pi-ai": "latest",
    "@nicobailon/pi-subagents": "latest",
    "@supabase/supabase-js": "^2.39.0",
    "bullmq": "^5.0.0",
    "next": "^14.0.0",
    "express": "^4.18.0",
    "socket.io": "^4.6.0",
    "zustand": "^4.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "turbo": "^1.11.0",
    "vitest": "^1.0.0",
    "playwright": "^1.40.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

## Documentation

See `/docs` for detailed design and implementation guides:
- `mvp_requirements.md` - **MVP requirements priority list (start here!)**
- `design.md` - Socialistic.ai UI/UX analysis and reference
- `agent_architecture_analysis.md` - Multi-user isolation strategies
- `claude_sdk_analysis.md` - Claude Agent SDK issues and alternatives
- `pi_framework_analysis.md` - Pi framework evaluation and selection
- `platform_mcp_integration.md` - Railway & Supabase MCP integration
- `railway_instance_pool_architecture.md` - Elastic instance pool design
- `railway_implementation_guide.md` - Instance pool implementation guide
- `deployment_strategy.md` - Complete deployment strategy
- `tech_stack.md` - Detailed tech stack documentation

## Cost Estimation

| Service | Spec | Monthly Cost |
|---------|------|--------------|
| Railway | Pro Plan (7 instances avg) | ~$60 |
| Supabase | Pro Plan | ~$25 |
| Redis | Railway Redis | ~$5 |
| Domain + SSL | - | ~$10 |
| **Total** | - | **~$100/month** |

## License

MIT
