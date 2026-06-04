# MVP P0 Implementation Task Plan

## Goal
Build MVP according to P0 priority requirements: single user, single skill, basic chat flow.

## Reference
- MVP Requirements: `docs/mvp_requirements.md` (P0 tasks)
- Design: `docs/design.md` (UI/UX style)
- Architecture: `CLAUDE.md`, `docs/tech_stack.md`

---

## Phase 1: Project Initialization (Monorepo)
**Status:** `complete`

### Tasks
- [ ] Initialize pnpm workspace
- [ ] Setup Turborepo config
- [ ] Create directory structure:
  ```
  apps/
    ├── web-ui/          # Next.js
    ├── agent-server/    # Agent service
  packages/
    ├── shared/          # Shared types
    └── db/              # Database
  ```
- [ ] Configure TypeScript strict mode
- [ ] Configure ESLint + Prettier
- [ ] Create package.json scripts

### Decision Log
- Using pnpm + Turborepo for monorepo management
- TypeScript strict mode enforced

---

## Phase 2: Supabase Database Schema
**Status:** `complete`

### Tasks
- [ ] Create sessions table
- [ ] Create messages table
- [ ] Enable RLS on all tables
- [ ] Create RLS policies
- [ ] Generate TypeScript types

### SQL Schema
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 3: Railway Project Setup
**Status:** `complete`

### Tasks
- [ ] Create Railway project
- [ ] Configure railway.toml
- [ ] Setup environment variables
- [ ] Configure deployment

---

## Phase 4: Next.js Web UI
**Status:** `complete` (basic UI functional)

### Tasks
- [ ] Create Next.js app (App Router)
- [ ] Setup Tailwind CSS
- [ ] Setup shadcn/ui
- [ ] Create chat page layout
- [ ] Implement chat components:
  - Message list
  - Input box
  - Send button
- [ ] Zustand state management

### Design Reference (from design.md)
- Colors: bone, ink, gold, lagoon, mist, paper
- Typography: Geist font family
- Rounded corners: 12px-18px (cards), 4px (chips)
- Container: max-w-2xl
- Animations: fade-in-up, pulse-glow

---

## Phase 5: AGENT Integration
**Status:** `complete`

### Tasks
- [ ] Install @earendil-works/pi-agent-core
- [ ] Install @earendil-works/pi-ai
- [ ] Create Agent wrapper
- [ ] Create example SKILL.md
- [ ] Implement skill loading
- [ ] Test Agent with simple prompt

---

## Phase 6: E2E Chat Flow
**Status:** `complete`

### Tasks
- [ ] Create API route `/api/chat`
- [ ] Connect UI to Agent
- [ ] Implement message flow
- [ ] Handle errors
- [ ] Add loading states

---

## Phase 7: Testing
**Status:** `complete`

### Completed
- ✅ Tested with Chrome DevTools MCP
- ✅ Verified E2E chat flow works
- ✅ UI displays correctly with design tokens
- ✅ Message flow: user message → agent response → display

---

## Phase 8: Merge to Main
**Status:** `in_progress`

### Tasks
- [x] Review all changes
- [ ] Run type-check and lint
- [ ] Create PR
- [ ] Merge to main
- [ ] Push to origin

---

## Branch Information
**Current branch:** `feat/mvp-p0-implementation`

---

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (To be filled) | | |
