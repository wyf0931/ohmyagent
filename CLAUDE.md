# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OhMyAgent is an AI Agent platform with dynamic skill injection, multi-user session management, and elastic instance pooling. The platform uses **AGENT Framework** as the base engine (not Claude Agent SDK) for multi-model support and TypeScript-native implementation.

### Architecture Layers

1. **Web UI (Next.js)** - User interface with Tailwind CSS and shadcn/ui
2. **Pool Manager** - Elastic instance pool (4 active, 10 max) with Railway GraphQL API
3. **Agent Engine** - Pi Framework with dynamic skill loading and subagent support
4. **Data Layer** - Supabase (PostgreSQL + Auth + Storage + Realtime)

### Key Design Decisions

- **Pi over Claude Agent SDK**: TypeScript native, not model-locked, no binary dependency
- **Supabase over vanilla Postgres**: Built-in RLS for multi-tenant isolation, OAuth, official MCP
- **Railway over Vercel**: Serverless with 10-min idle timeout, GraphQL API for dynamic scaling
- **MVP scope**: Single user, single skill, basic chat flow (no multi-instance, no Redis queue)

See `docs/mvp_requirements.md` for the prioritized feature list and roadmap.

---

## Monorepo Structure

```
apps/
  ├── web-ui/          # Next.js frontend (App Router, Tailwind)
  ├── pool-manager/    # Instance pool management (Express + BullMQ)
  └── agent-server/    # AGENT service
packages/
  ├── shared/          # Shared types and utilities
  └── db/              # Database migrations
```

Use Turborepo for orchestrating builds and running commands across packages.

---

## Common Commands

### Development
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start all dev servers
pnpm dev --filter web-ui  # Start specific app
pnpm build                # Build all packages
pnpm test                 # Run tests (Vitest + Playwright)
```

### Linting & Type Checking
```bash
pnpm lint                 # ESLint
pnpm type-check           # TypeScript strict mode check
pnpm format               # Prettier
```

### Deployment
```bash
railway up                # Deploy to Railway
railway logs              # View logs
railway status            # Check service status
```

---

## Key Concepts

### AGENT Framework

**Agent Skills Standard**: Skills are Markdown files with structured steps, loaded on-demand (max 30 per session).

**SOUL System**: Multi-level system prompts:
- Global: `~/.pi/agent/SYSTEM.md`
- Project: `.pi/SYSTEM.md`
- Session: `agent.state.systemPrompt = customSOUL`

**Subagent Integration**: Uses `nicobailon/pi-subagents` for parallel/chain/interactive subagent delegation.

```typescript
import { Agent } from '@earendil-works/pi-agent-core';
import { createAnthropicProvider } from '@earendil-works/pi-ai';

const agent = new Agent({
  initialState: {
    systemPrompt: formatSoul(soulConfig),
    tools: counselorTools,
  },
});
```

### Instance Pool Architecture

Railway manages elastic scaling via GraphQL API. Pool states: `CREATING → IDLE → BUSY → RELEASING → TERMINATING → TERMINATED`. Sessions map to instances with 10-min idle timeout before release.

State machine is in `apps/pool-manager/src/pool/state-machine.ts`. Pool manager handles acquisition/release and communicates with Railway GraphQL API.

### Supabase Integration

**RLS (Row Level Security)**: All tables enable RLS with policies ensuring `auth.uid() = user_id`.

**MCP/Skill Usage**: Configure Supabase MCP in `~/.claude/settings.json` for database operations via Claude Code. Supabase Agent Skills provide helpers for migrations, RLS, and type generation.

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/supabase-mcp"],
      "env": {
        "SUPABASE_URL": "your_url",
        "SUPABASE_ANON_KEY": "your_key"
      }
    }
  }
}
```

### Railway Integration

**MCP/Skill Usage**: Configure Railway MCP for project/service management without leaving Claude Code. Railway Skills enable `railway up`, `railway logs`, etc.

**Scaling**: Use Railway GraphQL API to adjust instance count (4-10 range). Pool manager auto-scales based on demand.

---

## Data Schema (MVP)

```sql
-- Core tables
sessions (id, user_id, created_at, updated_at)
messages (id, session_id, role, content, created_at)

-- Post-MVP tables
instances (id, railway_service_id, status, current_session_id, last_activity_at)
checkpoints (id, session_id, checkpoint_point, state_data, timestamp)
```

All tables use UUID primary keys and RLS. `sessions` and `messages` are MVP scope; `instances` and `checkpoints` are post-MVP.

---

## Development Workflow

### Branching Strategy

1. **Classify the task** — is it a `feat` (new feature) or `fix` (bug)?
2. **Create a branch**: `feat/<description>` or `fix/<description>`
   ```bash
   git checkout -b feat/pi-agent-streaming
   git checkout -b fix/deepseek-model-name
   ```
3. **Develop on the branch** — all work stays on the feature/fix branch
4. **Merge only when requested** — do NOT merge to `main` unless explicitly asked
5. **`main` is protected** — never commit directly to `main`; it's the stable integration target only

### Task Flow

1. **Start with `docs/mvp_requirements.md`** - Prioritized P0/P1/P2 tasks guide all development
2. **Use MCP tools** - Supabase/Railway MCP for infra operations, not manual dashboard clicks
3. **Schema changes** - Write SQL in `packages/db/migrations/`, apply via Supabase MCP
4. **Type generation** - Run Supabase type gen after schema changes: `supabase gen types typescript`
5. **Testing** - Unit tests with Vitest, E2E with Playwright (focus on chat flow for MVP)

---

## Important Constraints

- **TypeScript strict mode** is enforced - no `any`, explicit returns
- **Max 30 skills per session** - Pi framework guideline, enforce in skill loader
- **RLS on all tables** - Never bypass RLS, use `service_role` key only in server contexts
- **MVP excludes** - Multi-instance pooling, Redis/BullMQ, WebSocket (HTTP polling sufficient)
- **Cost target** - ~$100/month total (Railway Pro + Supabase Pro + Redis)

---

## Documentation Index

- `docs/mvp_requirements.md` - **START HERE** - P0/P1/P2 prioritization
- `docs/tech_stack.md` - Detailed tech stack rationale
- `docs/pi_framework_analysis.md` - Why Pi over alternatives
- `docs/railway_instance_pool_architecture.md` - Elastic pool design
- `docs/platform_mcp_integration.md` - Supabase/Railway MCP setup

---

## Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Railway
RAILWAY_TOKEN=
PROJECT_ID=

# Optional
ANTHROPIC_API_KEY=       # For Claude models
OPENAI_API_KEY=          # For multi-model testing
```

Never commit secrets. Use Railway/Supabase dashboards for production values.
