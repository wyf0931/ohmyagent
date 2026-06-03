# OhMyAgent 技术栈总结

## 🎯 核心技术栈

### 前端层
- **框架**: Next.js 14+ (App Router)
- **样式**: Tailwind CSS
- **UI 组件**: Radix UI / shadcn/ui
- **图标**: Lucide React
- **状态管理**: Zustand / React Context
- **实时通信**: WebSocket (Socket.IO)

---

### 后端层
- **运行时**: Node.js 20+
- **语言**: TypeScript
- **API**: Express.js / tRPC
- **认证**: Supabase Auth (OAuth, JWT)

---

### Agent 引擎层 ⭐
- **核心框架**: **Pi Agent Framework** (`@earendil-works/pi-agent-core`)
- **Subagent**: **nicobailon/pi-subagents**
- **备选**: tintinweb/pi-subagents (Claude Code 风格)
- **技能系统**: Agent Skills 标准
- **SOUL 管理**: Pi 原生 SYSTEM.md 支持

**选择理由**:
- ✅ TypeScript 原生实现
- ✅ 动态 Skill 注入（按需加载）
- ✅ 成熟的 Subagent 生态
- ✅ 企业级代码质量
- ✅ 多模型支持（20+ Provider）
- ✅ 不依赖 Claude Code 二进制
- ✅ 更灵活的模型选择

---

### 数据层
- **数据库**: **Supabase** (PostgreSQL)
- **文件存储**: Supabase Storage
- **认证**: Supabase Auth
- **实时订阅**: Supabase Realtime
- **Redis**: BullMQ 队列管理

**选择理由**:
- ✅ Row Level Security (RLS) 多租户隔离
- ✅ 内置 OAuth 认证
- ✅ TypeScript 自动生成类型
- ✅ 免费层慷慨
- ✅ 官方 MCP Server 集成

---

### 部署层
- **主机平台**: **Railway**
- **容器**: Docker
- **负载均衡**: Railway 内置
- **监控**: Railway Logs + Metrics
- **CI/CD**: GitHub Actions

**选择理由**:
- ✅ Serverless 模式（10 分钟空闲超时）
- ✅ GraphQL API 动态扩缩容
- ✅ 支持 4-10 实例弹性池
- ✅ 简单的部署流程
- ✅ 合理的定价（~$70/月）

---

### 队列与任务管理
- **任务队列**: **BullMQ** (Redis)
- **延迟任务**: BullMQ Delayed
- **任务调度**: Cron (内置)
- **会话队列**: 基于 Redis 的等待队列

---

### 开发工具
- **包管理**: pnpm
- **Monorepo**: Turborepo
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript strict mode
- **测试**: Vitest + Playwright

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Web UI (Next.js)                          │
│                   用户交互界面                                │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Pool Manager Service                         │
│  - 实例池管理 (4-10 instances)                               │
│  - 任务队列 (BullMQ)                                         │
│  - 会话路由                                                  │
│  - 状态机                                                    │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Railway GraphQL API                          │
│  - 动态扩缩容                                                │
│  - 实例生命周期管理                                          │
│  - 部署管理                                                  │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Agent Engine Pool (Docker)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Instance│ │ Instance│ │ Instance│ │ Instance│  (Active) │
│  │    1    │ │    2    │ │    3    │ │    4    │           │
│  │  [Pi]   │ │  [Pi]   │ │  [Pi]   │ │  [Pi]   │           │
│  │[Subagent]│ │[Subagent]│ │[Subagent]│ │[Subagent]│       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │Instance │ │ Instance│ │ Instance│ │ Instance│ │ Instance││
│  │    5    │ │    6    │ │    7    │ │    8    │ │    9    ││
│  │(Reserve)│ │(Reserve)│ │(Reserve)│ │(Reserve)│ │(Reserve)││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                       │
│  - PostgreSQL (Sessions, Users, Skills)                      │
│  - Storage (Files, Checkpoints)                              │
│  - Auth (OAuth, RLS)                                         │
│  - Realtime (WebSocket)                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 关键依赖包

### 核心框架
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
    "zod": "^3.22.0"
  }
}
```

### 开发依赖
```json
{
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

---

## 🔑 核心特性实现

### 1. 动态 Skill 注入
```typescript
// 按需加载，<30 个 skill
const { skills } = await loadSkills(env, selectedSkills);
agent.state.systemPrompt = formatSkillInvocation(skills);
```

### 2. SOUL 设定
```typescript
// 多层级 SOUL
- 全局: ~/.pi/agent/SYSTEM.md
- 项目: .pi/SYSTEM.md
- 会话: agent.state.systemPrompt = customSOUL
```

### 3. 实例池管理
```typescript
// 4 活跃，10 最大
const instance = await pool.acquireForSession(sessionId);

// 10 分钟空闲超时
if (idleTime > 10 minutes) {
  await pool.releaseInstance(instanceId);
}
```

### 4. Subagent 协作
```typescript
// 并行 Subagent
const results = await Promise.all([
  subagent.delegate(task1),
  subagent.delegate(task2),
  // ...
]);
```

---

## 💰 成本估算（月）

| 服务 | 规格 | 成本 |
|------|------|------|
| **Railway** | Pro Plan (7 实例平均) | ~$60 |
| **Supabase** | Pro Plan | ~$25 |
| **Redis** | Railway Redis | ~$5 |
| **域名 + SSL** | - | ~$10 |
| **总计** | - | **~$100/月** |

---

## 🚀 部署架构

### 开发环境
```bash
railway link # 连接到开发项目
railway up  # 部署开发环境
```

### 生产环境
```bash
railway link --production
railway up
railway scale --service agent-engine 4
```

### 监控
```bash
railway logs                    # 查看日志
railway status                  # 查看状态
railway domains                 # 查看域名
```

---

## 📚 文档索引

1. **design.md** - Socialistic.ai UI/UX 分析
2. **agent_architecture_analysis.md** - 多租户架构分析
3. **claude_sdk_analysis.md** - Claude Agent SDK 问题分析
4. **pi_framework_analysis.md** - Pi 框架选型分析
5. **platform_mcp_integration.md** - MCP 集成文档
6. **railway_instance_pool_architecture.md** - Railway 实例池架构
7. **railway_implementation_guide.md** - Railway 实现指南
8. **deployment_strategy.md** - 部署策略
9. **tech_stack.md** - 本文档

---

## 🎯 下一步行动

1. **初始化项目**
   ```bash
   mkdir ohmyagent && cd ohmyagent
   pnpm init
   pnpm add -D turbo
   ```

2. **搭建基础框架**
   - Next.js Web UI
   - Supabase 数据库 Schema
   - Railway 项目初始化

3. **实现核心功能**
   - InstancePoolManager
   - SessionRouter
   - Pi Agent 集成

4. **测试与部署**
   - 本地测试
   - Railway 部署
   - 监控配置

---

**技术栈决策时间**: 2026年6月3日
**主要参考**: Pi 框架分析、Railway 能力验证、Claude Agent SDK 问题调研
