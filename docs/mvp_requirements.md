# OhMyAgent MVP 需求优先级清单

## 🎯 MVP 目标

**核心目标**: 验证单用户、单技能的 AI Agent 聊天流程

**不做的范围 (MVP 阶段)**:
- ❌ 多实例池管理
- ❌ Redis/BullMQ 队列
- ❌ 多用户并发
- ❌ 复杂的 Skill Hub
- ❌ Session 持久化恢复

**专注范围**:
- ✅ 单用户聊天体验
- ✅ 单个 Skill 加载和执行
- ✅ 基础 UI 交互

---

## 📋 优先级定义

| 优先级 | 定义 | 交付标准 |
|--------|------|----------|
| **P0** | MVP 核心阻塞项 | 必须完成，否则 MVP 无法运行 |
| **P1** | MVP 重要功能 | 应该完成，显著提升体验 |
| **P2** | MVP 增强功能 | 可以延后，后续迭代 |

---

## 🚀 P0: MVP 核心阻塞项 (必须完成)

### 1. 项目初始化与环境配置

#### 1.1 初始化 Monorepo 结构
- [ ] 使用 pnpm + Turborepo 初始化项目
- [ ] 创建基础目录结构:
  ```
  apps/
    ├── web-ui/          # Next.js 前端
    ├── agent-server/    # Agent 服务
  packages/
    ├── shared/          # 共享类型
  ```
- [ ] 配置 TypeScript strict mode
- [ ] 配置 ESLint + Prettier

#### 1.2 初始化 CLAUDE.md
- [ ] 在项目根目录创建 CLAUDE.md
- [ ] 记录项目架构、技术栈、关键决策
- [ ] 记录常用命令和开发流程

**交付标准**: 开发者可以 `pnpm install` 并运行开发服务器

---

### 2. Supabase 基础集成

#### 2.1 创建 Supabase 项目
- [ ] 在 Supabase Dashboard 创建项目
- [ ] 获取环境变量: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

#### 2.2 安装 Supabase MCP/Skill
- [ ] 安装 Supabase MCP Server 到 Claude Code
- [ ] 配置 `~/.claude/settings.json`:
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
- [ ] 安装 Supabase Agent Skills:
  ```bash
  git clone https://github.com/supabase/agent-skills.git ~/.claude/skills/supabase-skills
  ```

#### 2.3 基础数据库 Schema
- [ ] 创建最简表结构:
  ```sql
  -- 用户表 (使用 Supabase Auth)
  -- 会话表
  CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- 消息表
  CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id),
    role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- 启用 RLS
  ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  ```

#### 2.4 安装 Supabase 客户端
- [ ] `pnpm add @supabase/supabase-js`
- [ ] 创建 `packages/shared/src/supabase.ts`
- [ ] 配置环境变量

**交付标准**: 可以通过 Supabase MCP 查询数据库，可以运行 SQL 迁移

---

### 3. Railway 基础集成

#### 3.1 创建 Railway 项目
- [ ] 在 Railway Dashboard 创建项目
- [ ] 安装 Railway CLI: `pnpm add -g @railway/cli`
- [ ] `railway login` 并 `railway init`

#### 3.2 安装 Railway MCP/Skill
- [ ] 安装 Railway MCP Server:
  ```json
  {
    "mcpServers": {
      "railway": {
        "command": "npx",
        "args": ["-y", "@railwaycli/railway-mcp"],
        "env": {
          "RAILWAY_TOKEN": "your_token"
        }
      }
    }
  }
  ```
- [ ] 安装 Railway Skills:
  ```bash
  git clone https://github.com/railwayapp/railway-skills.git ~/.claude/skills/railway-skills
  ```

#### 3.3 配置 Railway 服务
- [ ] 创建 `railway.toml`
- [ ] 配置单个服务 (MVP 不需要多服务)

**交付标准**: 可以通过 Railway MCP 查看项目状态，可以部署到 Railway

---

### 4. 基础 Web UI (Next.js)

#### 4.1 创建 Next.js 应用
- [ ] `pnpm create next-app@latest apps/web-ui`
- [ ] 配置 Tailwind CSS
- [ ] 配置 App Router

#### 4.2 最简聊天界面
- [ ] 创建单页面 `/app/page.tsx`
- [ ] 实现基础组件:
  - 聊天消息列表
  - 输入框
  - 发送按钮
- [ ] 使用 shadcn/ui 的 `Button`, `Input`, `ScrollArea` 组件

#### 4.3 状态管理
- [ ] 使用 Zustand 创建聊天状态:
  ```typescript
  interface ChatStore {
    messages: Array<{ role: string; content: string }>;
    addMessage: (message: { role: string; content: string }) => void;
  }
  ```

**交付标准**: 有一个可输入的聊天界面，消息可以显示在列表中

---

### 5. AGENT 基础集成

#### 5.1 安装 Pi 核心包
```bash
pnpm add @earendil-works/pi-agent-core @earendil-works/pi-ai
```

#### 5.2 创建最简 Agent Wrapper
- [ ] 创建 `apps/agent-server/src/pi-agent.ts`
- [ ] 实现基础 Agent 初始化:
  ```typescript
  import { Agent } from '@earendil-works/pi-agent-core';
  import { createAnthropicProvider } from '@earendil-works/pi-ai';

  const agent = new Agent({
    initialState: {
      systemPrompt: "You are a helpful assistant."
    }
  });
  ```

#### 5.3 单 Skill 加载
- [ ] 创建示例 SKILL.md
- [ ] 实现 `loadSkill()` 函数
- [ ] 验证 Skill 可以注入到 Agent

**交付标准**: 可以创建 Agent 实例，可以加载一个 Skill

---

### 6. 端到端聊天流程

#### 6.1 API 路由
- [ ] 创建 `/app/api/chat/route.ts`
- [ ] 接收用户消息
- [ ] 调用 Agent 处理
- [ ] 返回助手回复

#### 6.2 连接 UI 和 Agent
- [ ] 在聊天界面调用 API
- [ ] 显示用户消息
- [ ] 显示助手回复
- [ ] 处理加载状态

**交付标准**: 用户可以输入消息，看到 AI 回复，形成完整对话循环

---

## 🎨 P1: MVP 重要功能 (应该完成)

### 1. 用户认证

#### 1.1 Supabase Auth 集成
- [ ] 安装 `@supabase/ssr`
- [ ] 配置 Auth Helpers
- [ ] 实现登录页面
- [ ] 实现登出功能

#### 1.2 受保护路由
- [ ] 聊天页面需要登录
- [ ] 未登录重定向到登录页

**交付标准**: 用户必须登录才能使用聊天

---

### 2. 会话持久化

#### 2.1 保存对话到 Supabase
- [ ] 发送消息时保存到 `messages` 表
- [ ] 创建 `sessions` 记录

#### 2.2 加载历史对话
- [ ] 进入聊天页面时加载历史
- [ ] 显示在消息列表中

**交付标准**: 刷新页面后对话历史保留

---

### 3. Skill 选择界面

#### 3.1 创建 Skill 列表页面
- [ ] 预定义 3-5 个示例 Skills
- [ ] 显示 Skill 名称和描述
- [ ] 点击选择 Skill

#### 3.2 应用 Skill 到对话
- [ ] 选择 Skill 后重新初始化 Agent
- [ ] 更新系统提示词

**交付标准**: 用户可以选择不同的 Skill 开始对话

---

### 4. 基础错误处理

#### 4.1 API 错误处理
- [ ] 网络错误提示
- [ ] Agent 错误提示
- [ ] 超时处理

#### 4.2 UI 错误提示
- [ ] 使用 Toast 显示错误
- [ ] 重试按钮

**交付标准**: 用户可以看到错误信息并尝试重试

---

## ✨ P2: MVP 增强功能 (可以延后)

### 1. UI 美化

#### 1.1 高级组件
- [ ] 使用 shadcn/ui 的更多组件
- [ ] 添加动画效果
- [ ] 响应式设计优化

#### 1.2 暗色模式
- [ ] 使用 next-themes
- [ ] 切换按钮

---

### 2. 用户体验增强

#### 2.1 流式响应
- [ ] 实现打字机效果
- [ ] 实时显示 AI 回复

#### 2.2 消息操作
- [ ] 复制消息
- [ ] 重新生成回复
- [ ] 编辑消息

---

### 3. Skill 增强

#### 3.1 动态 Skill 加载
- [ ] 从 GitHub 加载 Skill
- [ ] 解析 SKILL.md

#### 3.2 Skill 管理
- [ ] 上传自定义 Skill
- [ ] 删除 Skill

---

### 4. 监控和日志

#### 4.1 基础日志
- [ ] 记录 API 调用
- [ ] 记录 Agent 行为

#### 4.2 错误追踪
- [ ] 集成 Sentry (可选)

---

## 🗂️ MVP 不做功能列表 (明确排除)

| 功能 | 原因 | 后续考虑 |
|------|------|----------|
| 多实例池管理 | 过早优化 | P1 后期 |
| Redis/BullMQ 队列 | 单用户不需要 | 多用户阶段 |
| WebSocket 实时通信 | HTTP 轮询足够 | 实时协作需求 |
| Session 恢复/Checkpoint | MVP 不需要 | P1 |
| 复杂权限系统 | Supabase RLS 够用 | 企业版需求 |
| Skill Marketplace | 手动选择够用 | P2 |
| GitHub OAuth | Google OAuth 够用 | P1 |
| 多语言支持 | 中文优先 | 国际化阶段 |
| 支付/订阅系统 | MVP 免费试用 | 商业化阶段 |

---

## 📊 MVP 验收标准

### 功能验收

- [ ] 用户可以通过 Google OAuth 登录
- [ ] 用户可以看到聊天界面
- [ ] 用户可以选择一个 Skill
- [ ] 用户可以输入消息
- [ ] 用户可以看到 AI 回复
- [ ] 刷新页面后对话历史保留

### 技术验收

- [ ] 可以通过 Supabase MCP 管理数据库
- [ ] 可以通过 Railway MCP 部署应用
- [ ] 代码符合 ESLint 规则
- [ ] TypeScript 类型检查通过
- [ ] 可以通过 `pnpm dev` 启动开发环境

---

## 🛣️ 实施路线图

### Week 1: 环境搭建 (P0)
- Day 1-2: 项目初始化 + CLAUDE.md
- Day 3-4: Supabase + Railway MCP/Skill 集成
- Day 5: 基础 Web UI 框架

### Week 2: 核心功能 (P0)
- Day 1-2: AGENT 集成
- Day 3-4: API 路由 + 聊天流程
- Day 5: 端到端测试

### Week 3: 重要功能 (P1)
- Day 1-2: 用户认证
- Day 3-4: 会话持久化
- Day 5: Skill 选择界面

### Week 4: 完善体验 (P1 + P2)
- Day 1-2: 错误处理
- Day 3-4: UI 美化
- Day 5: 测试和修复

---

## 📝 每日检查清单模板

```markdown
## [日期] 进度

### P0 任务
- [ ] 任务描述

### P1 任务
- [ ] 任务描述

### 阻塞问题
- 问题描述

### 明日计划
- 任务描述
```

---

**文档创建时间**: 2026年6月3日
**MVP 目标交付**: 4周后
**负责人**: [待填写]
