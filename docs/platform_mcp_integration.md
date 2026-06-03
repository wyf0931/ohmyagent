# Railway & Supabase 官方 Agent 集成方案笔记

## 🎯 概述

Railway 和 Supabase 都提供了官方的 **MCP (Model Context Protocol)** 服务器和 **Agent Skills**，可以直接让 Claude Code、Cursor、Codex、OpenCode 等 AI Agent 使用。

---

## 🚂 Railway 官方集成

### 1. Railway MCP Server

**官方资源:**
- 📖 [Railway MCP Server 官方文档](https://docs.railway.com/ai/mcp-server)
- 💻 [GitHub: railwayapp/railway-mcp-server](https://github.com/railwayapp/railway-mcp-server)
- 📋 [MCP Market 列表](https://mcpmarket.com/server/railway)
- 🌐 [MCP.Directory 列表](https://mcp.directory/skills/railway-cli)

**核心功能:**
- ✅ 通过自然语言管理 Railway 基础设施
- ✅ 项目、环境、服务管理
- ✅ 部署状态检查
- ✅ 健康检查和监控
- ✅ 日志查看

**MCP Server 能力 (Tools):**

```json
{
  "tools": [
    {
      "name": "list_projects",
      "description": "列出所有 Railway 项目"
    },
    {
      "name": "get_project_status",
      "description": "获取项目状态和详细信息"
    },
    {
      "name": "create_service",
      "description": "创建新服务"
    },
    {
      "name": "deploy_service",
      "description": "部署服务"
    },
    {
      "name": "get_service_logs",
      "description": "获取服务日志"
    },
    {
      "name": "get_environment_variables",
      "description": "获取环境变量"
    },
    {
      "name": "update_environment_variables",
      "description": "更新环境变量"
    }
  ]
}
```

### 2. Railway Claude Code Plugin / Skills

**官方资源:**
- 📖 [Railway Claude Code Plugin 文档](https://docs.railway.com/ai/claude-code-plugin)
- 💻 [GitHub: railwayapp/railway-skills](https://github.com/railwayapp/railway-skills)
- 📹 [YouTube: 使用 Claude Code 部署到 Railway](https://www.youtube.com/watch?v=59ri-f_wv5I)
- 🛒 [Claude Marketplaces 列表](https://claudemarketplaces.com/skills/railwayapp/railway-skills)

**安装方式:**

```bash
# 方式 1: 通过 Claude Code 安装
claude skill install railwayapp/railway-skills

# 方式 2: 克隆到本地技能目录
git clone https://github.com/railwayapp/railway-skills.git ~/.claude/skills/railway-skills
```

**技能功能:**

```markdown
# railway-skills 提供的能力

1. 项目管理
   - railway create
   - railway init
   - railway link

2. 服务管理
   - railway status
   - railway logs
   - railway variables

3. 部署管理
   - railway up
   - railway open
   - railway domain

4. 环境管理
   - railway variables --production
   - railway add VAR=value
```

**Vibe Coding 使用示例:**

```
# 在 Claude Code 中直接说:

"帮我创建一个新的 Railway 项目，部署一个 Next.js 应用"

"查看我的所有 Railway 服务状态"

"将这个新的环境变量添加到生产环境: DATABASE_URL=postgres://..."

"重新部署我的 API 服务"
```

---

## 📊 Supabase 官方集成

### 1. Supabase MCP Server

**官方资源:**
- 📖 [Supabase MCP Server 官方文档](https://supabase.com/docs/guides/ai-tools/mcp)
- 🌟 [功能页面: MCP Server](https://supabase.com/features/mcp-server)
- 📢 [博客: Remote MCP Server 发布](https://supabase.com/blog/remote-mcp-server)
- 🛒 [MCP Market 列表](https://mcpmarket.com/server/supabase-7)
- 🔐 [MCP Authentication 文档](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- 💻 [GitHub: coleam00/supabase-mcp](https://github.com/coleam00/supabase-mcp)

**核心功能:**
- ✅ 数据库查询和操作
- ✅ Schema 管理和迁移
- ✅ Row Level Security (RLS) 管理
- ✅ 函数调用
- ✅ 存储管理
- ✅ 实时订阅管理

**MCP Server 能力 (Tools):**

```json
{
  "tools": [
    {
      "name": "execute_sql",
      "description": "执行 SQL 查询"
    },
    {
      "name": "list_tables",
      "description": "列出所有表"
    },
    {
      "name": "describe_table",
      "description": "获取表结构"
    },
    {
      "name": "create_table",
      "description": "创建新表"
    },
    {
      "name": "alter_table",
      "description": "修改表结构"
    },
    {
      "name": "manage_rls",
      "description": "管理 Row Level Security"
    },
    {
      "name": "call_function",
      "description": "调用数据库函数"
    },
    {
      "name": "upload_file",
      "description": "上传文件到 Storage"
    }
  ]
}
```

### 2. Supabase Agent Skills

**官方资源:**
- 📖 [Supabase Agent Skills 文档](https://supabase.com/docs/guides/ai-tools/ai-skills)
- 💡 [博客: AI Agents Know About Supabase](https://supabase.com/blog/supupabase-agent-skills)
- 💻 [GitHub: supabase/agent-skills](https://github.com/supabase/agent-skills)
- 📹 [YouTube: 如何让 Agent 擅长 Supabase](https://www.youtube.com/watch?v=GmAQKINjv1E)
- 📚 [Medium: Supabase Agent 自动化指南](https://medium.com/the-agent-protocol/supabase-development-with-ai-agents-a-comprehensive-guide-to-automating-your-workflow-5cf0eda5bc16)

**Agent Skills 内容:**

```
supabase/agent-skills/
├── database/          # 数据库操作技能
│   ├── migrations/
│   ├── queries/
│   └── rls/
├── auth/             # 认证相关
├── storage/          # 存储管理
├── realtime/         # 实时功能
└── functions/        # Edge Functions
```

**技能功能:**

```markdown
# supabase-agent-skills 提供的能力

1. 数据库 Schema 管理
   - 创建和修改表
   - 处理迁移
   - 设置 RLS 策略

2. 查询优化
   - 分析查询性能
   - 添加索引
   - 优化复杂查询

3. 安全审计
   - 检查 RLS 策略
   - 验证权限
   - 安全最佳实践

4. Postgres 扩展
   - pg_graphql
   - pg_cron
   - pg_vector
```

### 3. Supabase CLI

**CLI 能力:**
- 项目初始化和管理
- 数据库迁移
- 类型生成
- 函数部署
- 本地开发

**Vibe Coding 使用示例:**

```
# 在 Claude Code 中直接说:

"创建一个 users 表，包含 id, email, created_at 字段"

"为 users 表添加 Row Level Security，确保用户只能访问自己的数据"

"生成 TypeScript 类型定义"

"创建一个 Edge Function 来处理用户注册"

"上传这个文件到 Supabase Storage"
```

---

## 🛠️ Vibe Coding 实战示例

### 场景 1: 初始化项目并部署

**对话流程:**

```bash
# 1. 创建项目
你: "用 Railway 创建一个新项目，命名为 'ai-agent-platform'"

Agent: [使用 railway-mcp] 
- 创建项目
- 返回项目 ID
- 配置初始设置

# 2. 初始化数据库
你: "在 Supabase 创建数据库 schema"

Agent: [使用 supabase-mcp]
- 创建 sessions 表
- 创建 checkpoints 表
- 设置 RLS 策略
- 返回 SQL 迁移文件

# 3. 部署应用
你: "将当前应用部署到 Railway"

Agent: [使用 railway-skills]
- railway up
- 监控部署状态
- 返回部署 URL
```

### 场景 2: 调试和监控

**对话流程:**

```bash
你: "我的 Railway 服务出现了问题，帮我查看日志"

Agent: [使用 railway-mcp]
- 获取服务日志
- 分析错误信息
- 提供修复建议

你: "检查 Supabase 数据库连接是否正常"

Agent: [使用 supabase-mcp]
- 测试数据库连接
- 检查连接池状态
- 返回健康状态
```

### 场景 3: 数据库迁移

**对话流程:**

```bash
你: "添加一个新列 'skill_metadata' 到 sessions 表"

Agent: [使用 supabase-mcp]
- 生成 ALTER TABLE 语句
- 执行迁移
- 验证更改
- 更新 TypeScript 类型

你: "为新列添加注释"

Agent: [使用 supabase-mcp]
- COMMENT ON COLUMN sessions.skill_metadata...
- 确认成功
```

---

## 🔧 MCP 配置和使用

### 在 Claude Code 中配置 MCP

**配置文件位置:**
```bash
~/.claude/settings.json
```

**配置示例:**

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railwaycli/railway-mcp"],
      "env": {
        "RAILWAY_TOKEN": "your_railway_token"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/supabase-mcp"],
      "env": {
        "SUPABASE_URL": "your_supabase_url",
        "SUPABASE_ANON_KEY": "your_anon_key"
      }
    }
  }
}
```

### 在 Cursor 中配置 MCP

**配置文件位置:**
```bash
~/Library/Application Support/Cursor/User/globalStorage/mcp_servers.json
```

**配置示例:**

```json
{
  "mcpServers": {
    "railway": {
      "command": "node",
      "args": ["/path/to/railway-mcp/dist/index.js"],
      "env": {
        "RAILWAY_TOKEN": "${RAILWAY_TOKEN}"
      }
    },
    "supabase": {
      "command": "node", 
      "args": ["/path/to/supabase-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}"
      }
    }
  }
}
```

---

## 💡 高级 Vibe Coding 技巧

### 技巧 1: 组合使用多个 MCP

```bash
你: "创建一个完整的用户认证系统：
     1. 在 Supabase 创建 users 表
     2. 设置 RLS 策略
     3. 在 Railway 创建一个服务
     4. 部署认证 API"

Agent: [组合使用 supabase-mcp + railway-mcp]
- Supabase: 创建表和策略
- Railway: 创建和部署服务
- 完整的端到端实现
```

### 技巧 2: 错误诊断和修复

```bash
你: "我的应用部署后出现数据库连接错误"

Agent: [诊断流程]
1. 检查 Railway 部署状态
2. 检查环境变量配置
3. 测试 Supabase 连接
4. 检查 RLS 策略
5. 提供修复建议
```

### 技巧 3: 性能优化

```bash
你: "优化我的数据库查询性能"

Agent: [优化流程]
1. 分析慢查询日志
2. 检查索引使用情况
3. 建议添加新索引
4. 重构复杂查询
5. 验证改进效果
```

---

## 📝 项目实战示例

### 创建一个 AI Agent 平台

**完整对话流程:**

```bash
# Phase 1: 基础设施设置
你: "帮我创建一个 AI Agent 平台的基础设施：
     - 在 Railway 创建项目
     - 在 Supabase 创建数据库
     - 配置环境变量"

Agent: [执行]
1. Railway MCP:
   - railway create ai-agent-platform
   - 添加三个服务: frontend, api, worker
   
2. Supabase MCP:
   - 创建数据库 schema
   - 设置 RLS
   - 生成 TypeScript 类型
   
3. 配置环境变量:
   - DATABASE_URL
   - SUPABASE_URL
   - JWT_SECRET

# Phase 2: 部署应用
你: "将我的 Next.js 应用部署到 Railway"

Agent: [执行]
1. 构建和部署前端
2. 配置域名
3. 设置健康检查
4. 返回部署 URL

# Phase 3: 监控和调试
你: "监控所有服务的状态，如果有问题告诉我"

Agent: [持续监控]
- 检查服务健康状态
- 查看日志
- 发送警报
- 提供修复建议

# Phase 4: 扩展功能
你: "添加一个新的功能：用户可以上传文件到 Supabase Storage"

Agent: [实现]
1. Supabase MCP:
   - 创建 storage bucket
   - 设置 RLS
   - 生成上传 URL
   
2. Railway:
   - 更新 API 代码
   - 重新部署
   - 测试功能
```

---

## 🚀 快速开始

### Step 1: 安装 Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: 安装 Supabase CLI

```bash
npm install -g supabase
supabase login
```

### Step 3: 配置 Claude Code

```bash
# 安装 Railway Skills
claude skill install railwayapp/railway-skills

# 或手动克隆
git clone https://github.com/railwayapp/railway-skills.git ~/.claude/skills/railway-skills

# 安装 Supabase Skills
git clone https://github.com/supabase/agent-skills.git ~/.claude/skills/supabase-skills
```

### Step 4: 配置 MCP Servers

编辑 `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railwaycli/railway-mcp"],
      "env": {
        "RAILWAY_TOKEN": "your_token_here"
      }
    },
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

### Step 5: 开始 Vibe Coding

```bash
# 启动 Claude Code
claude

# 开始对话
你: "帮我创建一个 Railway 项目并初始化 Supabase 数据库"

Agent: [自动执行一系列操作]
```

---

## 📚 参考资源汇总

### Railway 官方资源
- 📖 [Railway MCP Server 文档](https://docs.railway.com/ai/mcp-server)
- 📖 [Railway Claude Code Plugin 文档](https://docs.railway.com/ai/claude-code-plugin)
- 💻 [GitHub: railway-skills](https://github.com/railwayapp/railway-skills)
- 💻 [GitHub: railway-mcp-server](https://github.com/railwayapp/railway-mcp-server)
- 📹 [YouTube 教程](https://www.youtube.com/watch?v=59ri-f_wv5I)

### Supabase 官方资源
- 📖 [Supabase MCP Server 文档](https://supabase.com/docs/guides/ai-tools/mcp)
- 📖 [Supabase Agent Skills 文档](https://supabase.com/docs/guides/ai-tools/ai-skills)
- 💡 [博客: AI Agents Know About Supabase](https://supabase.com/blog/supabase-agent-skills)
- 💻 [GitHub: supabase/agent-skills](https://github.com/supabase/agent-skills)
- 📹 [YouTube: 如何让 Agent 擅长 Supabase](https://www.youtube.com/watch?v=GmAQKINjv1E)

### MCP 相关资源
- 🌐 [MCP 官方文档](https://modelcontextprotocol.io/)
- 📋 [MCP Market](https://mcpmarket.com)
- 🌐 [MCP.Directory](https://mcp.directory)

---

**最后更新**: 2026年6月3日  
**适用平台**: Claude Code, Cursor, OpenCode, Codex, Gemini CLI  
**关键词**: Vibe Coding, MCP, Agent Skills, Railway, Supabase
