# ohmyagent

An AI Agent platform with dynamic skill injection, multi-user session management, and elastic instance pooling.

## Tech Stack

| Category | Technology |
|----------|------------|
| **Agent Engine** | Pi Framework + subagent plugin (nicobailon/pi-subagents) |
| **Frontend** | Next.js + Tailwind CSS + Lucide Icons |
| **Backend/Database** | Supabase (Auth, Storage, PostgreSQL) |
| **Deployment** | Railway (with serverless auto-suspend) |
| **Language** | TypeScript (full stack) |
| **Real-time** | WebSocket + BullMQ (Redis) |

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
│            Pi Agent Engine                   │
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

## Documentation

See `/docs` for detailed design and implementation guides:
- `design.md` - Platform architecture and requirements
- `pi_framework_analysis.md` - Pi framework evaluation
- `agent_architecture_analysis.md` - Multi-user isolation strategies
- `platform_mcp_integration.md` - Railway & Supabase MCP integration
- `railway_instance_pool_architecture.md` - Elastic instance pool design
- `deployment_strategy.md` - Complete deployment guide

## License

MIT
