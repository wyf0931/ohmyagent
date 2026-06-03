# AI Agent 平台部署与实例管理完整方案

## 🎯 核心问题解答

### 1. 在哪里部署？有免费平台吗？

**免费平台对比分析 (2026):**

| 平台 | 免费额度 | Docker 支持 | 长期运行 | 推荐度 |
|------|---------|------------|---------|--------|
| **Railway** | $5/月额度 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Fly.io** | 3个 VM + 3GB 存储 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Render** | 750小时/月 | ✅ | ❌ (15分钟休眠) | ⭐⭐⭐ |
| **Vercel** | 无限请求 | ❌ (仅 Serverless) | ❌ | ⭐⭐ |
| **Supabase** | 500MB 数据库 | ❌ (仅 DB+Storage) | ❌ | ⭐⭐⭐ |

**推荐方案: Railway + Fly.io 组合**

**为什么推荐 Railway:**
- ✅ 真正的免费额度 ($5/月，不是试用)
- ✅ 支持 Docker 容器
- ✅ 自动休眠/唤醒机制
- ✅ 内置 PostgreSQL
- ✅ 简单的部署流程
- ✅ 良好的文档支持

**为什么推荐 Fly.io:**
- ✅ 全球部署 (边缘计算)
- ✅ 持久化存储卷
- ✅ 更好的性能
- ✅ 灵活的配置

**参考资料:**
- [Railway Serverless 文档](https://docs.railway.com/deployments/serverless)
- [Railway vs Render 2026 对比](https://www.mgsoftware.nl/en/vergelijking/railway-vs-render)
- [Fly.io 持久化存储](https://fly.io/blog/persistent-storage-and-fast-remote-builds/)
- [Render 免费层限制](https://render.com/docs/free)

### 2. Skill 加载时机与容器管理策略

**方案设计:**

```
用户请求 → 检查是否有活跃容器
                ↓
           有活跃容器?
                ↓
        YES          NO
         ↓             ↓
   复用现有容器   创建新容器
         ↓             ↓
   加载请求的 Skill   初始化 Agent
         ↓             ↓
      执行任务      执行任务
         ↓             ↓
      返回结果      返回结果
         ↓             ↓
   保持活跃 N 分钟  设置超时
```

**详细实现流程:**

```javascript
// 伪代码示例
async function handleUserRequest(userId, skillId, task) {
    // 1. 检查用户是否有活跃容器
    let container = await getActiveContainer(userId);
    
    if (!container) {
        // 2. 创建新容器
        container = await createContainer(userId);
        
        // 3. 初始化 Agent Engine
        await initAgentEngine(container);
        
        // 4. 加载请求的 Skill
        await loadSkill(container, skillId);
        
        // 5. 设置超时 (如 30 分钟无活动)
        setContainerTimeout(container, 30 * 60 * 1000);
    } else {
        // 6. 如果容器已存在，检查 Skill 是否已加载
        if (!isSkillLoaded(container, skillId)) {
            await loadSkill(container, skillId);
        }
        
        // 7. 重置超时计时器
        resetContainerTimeout(container);
    }
    
    // 8. 执行任务
    const result = await executeTask(container, task);
    
    return result;
}
```

### 3. Docker 实例与用户绑定机制

**核心设计: Container Pool + Session Mapping**

**架构图:**

```
┌──────────────────────────────────────────────────────────┐
│                     API Gateway Layer                    │
│  (Next.js API Routes / Express.js)                        │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│              Container Manager Service                    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │      Session ↔ Container Mapping Table          │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ user_id | session_id | container_id     │   │   │
│  │  │────────┼────────────┼──────────────────│   │   │
│  │  │ user_1 │ sess_A123 │ container_uuid_1  │   │   │
│  │  │ user_2 │ sess_B456 │ container_uuid_2  │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│              Docker Container Pool                        │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Container 1  │  │ Container 2  │  │ Container 3  │  │
│  │ ├─ user_id   │  │ ├─ user_id   │  │ ├─ user_id   │  │
│  │ ├─ session_id│  │ ├─ session_id│  │ ├─ session_id│  │
│  │ ├─ skills[]  │  │ ├─ skills[]  │  │ ├─ skills[]  │  │
│  │ ├─ agent_ctx │  │ ├─ agent_ctx │  │ ├─ agent_ctx │  │
│  │ └─ workspace │  │ └─ workspace │  │ └─ workspace │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**实现细节:**

#### A. Session ID 生成策略

```javascript
// Session ID 生成
function generateSessionId() {
    // 格式: {user_id}_{timestamp}_{random}
    return `${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// 完整示例
// 用户 user_123 在 2026-06-03 10:30:00 请求
// 生成 Session ID: user_123_1717434000_a3f8b2c1
```

#### B. 容器创建与绑定

```javascript
async function createAndBindContainer(userId, sessionId) {
    // 1. 生成唯一容器 ID
    const containerId = `agent_${userId}_${sessionId.slice(-8)}`;
    
    // 2. 创建容器
    const container = await docker.createContainer({
        name: containerId,
        Image: 'agent-engine:latest',
        Env: [
            `USER_ID=${userId}`,
            `SESSION_ID=${sessionId}`,
            `CONTAINER_ID=${containerId}`
        ],
        HostConfig: {
            Binds: {
                '/workspace': {
                    path: `/data/${userId}/${sessionId}`,
                    type: 'volume'
                }
            },
            Memory: 1024 * 1024 * 1024, // 1GB 限制
            CpuShares: 512
        }
    });
    
    // 3. 启动容器
    await container.start();
    
    // 4. 存储映射关系
    await db.sessions.insert({
        user_id: userId,
        session_id: sessionId,
        container_id: containerId,
        status: 'active',
        created_at: new Date(),
        last_activity: new Date()
    });
    
    return container;
}
```

#### C. WebSocket 连接管理

```javascript
// WebSocket 连接路由
const WebSocket = require('ws');
const sessionMap = new Map(); // session_id → WebSocket

wss.on('connection', (ws, req) => {
    // 1. 从 URL 参数提取 Session ID
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('session');
    
    if (!sessionId) {
        ws.close(4001, 'Missing session ID');
        return;
    }
    
    // 2. 验证 Session
    const session = await db.sessions.findOne({ session_id: sessionId });
    
    if (!session || session.status !== 'active') {
        ws.close(4002, 'Invalid or expired session');
        return;
    }
    
    // 3. 存储 WebSocket 连接
    sessionMap.set(sessionId, ws);
    
    // 4. 发送连接成功消息
    ws.send(JSON.stringify({
        type: 'connected',
        session_id: sessionId,
        container_id: session.container_id
    }));
    
    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        
        // 5. 路由消息到对应容器
        const container = await getContainer(session.container_id);
        await container.sendMessage(data);
    });
    
    ws.on('close', async () => {
        // 6. 清理映射
        sessionMap.delete(sessionId);
    });
});
```

**参考资料:**
- [WebSocket 架构最佳实践 - Ably](https://ably.com/topic/websocket-architecture-best-practices)
- [Spring Boot WebSocket 多节点架构](https://medium.com/@rukshan1122/building-a-scalable-realtime-chat-application-a-deep-dive-into-spring-boot-websocket-and-redis-8f16f9f7fa37)
- [Google Cloud Run WebSocket 指南](https://docs.cloud.google.com/run/docs/triggering/websockets)

### 4. 容器生命周期与成本优化

**完整的容器生命周期管理:**

```
┌─────────────────────────────────────────────────────────┐
│              Container Lifecycle States                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [CREATING] → [IDLE] → [BUSY] → [IDLE] → [SUSPENDING]  │
│                      ↓                                   │
│                  [DESTROYED]                             │
│                                                          │
└─────────────────────────────────────────────────────────┘

状态转换条件:
- CREATING → IDLE: 容器创建完成，等待任务
- IDLE → BUSY: 接收到用户任务
- BUSY → IDLE: 任务完成，等待下一个任务
- IDLE → SUSPENDING: 超过空闲超时 (30分钟)
- SUSPENDING → SUSPENDED: 状态保存完成
- SUSPENDED → DESTROYED: 超过保留时间 (24小时) 或手动清理
```

**成本优化策略:**

#### A. 基于活动的自动休眠

```javascript
// 容器超时管理
const containerTimeouts = new Map(); // container_id → timeout_id

function setContainerTimeout(containerId, minutes = 30) {
    // 清除现有超时
    if (containerTimeouts.has(containerId)) {
        clearTimeout(containerTimeouts.get(containerId));
    }
    
    // 设置新超时
    const timeoutId = setTimeout(async () => {
        await suspendContainer(containerId);
    }, minutes * 60 * 1000);
    
    containerTimeouts.set(containerId, timeoutId);
}

function resetContainerTimeout(containerId) {
    setContainerTimeout(containerId);
}
```

#### B. Railway Serverless 自动休眠

**Railway 内置机制:**
- 自动检测出站流量不活跃
- 15分钟后自动休眠
- 下次请求时自动唤醒 (~30秒)

**配置示例:**

```toml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on-failure"

# 启用 Serverless 模式 (Railway 自动检测不活跃并休眠)
# 无需额外配置
```

#### C. Fly.io Volume 持久化策略

**成本优化:**
- 持续计费存储: $0.15-0.28/GB
- 建议使用对象存储 (S3) 存储大文件

**配置示例:**

```toml
# fly.toml
[build]
  dockerfile = "Dockerfile"

[[mounts]]
  source = "data"
  destination = "/workspace"

[env]
  SESSION_TIMEOUT = "1800"  # 30分钟

# 配置自动停止策略
[experimental]
  cmd = ["./agent-server", "--auto-suspend"]
```

### 5. Session 持久化与恢复机制

**问题:**
> 如果用户对话完成了，容器是否会释放？如果释放了，session 信息存到哪里去？如何 reload？

**解决方案: 多层持久化**

#### A. Session 存储架构

```
┌─────────────────────────────────────────────────────────┐
│                    Session Storage                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. 实时存储 (Supabase Database)                        │
│     - 会话元数据                                         │
│     - 用户对话历史                                       │
│     - Agent 思考过程                                     │
│     - 状态快照                                           │
│                                                          │
│  2. 工作空间存储 (Supabase Storage / S3)                │
│     - 上传的文件                                         │
│     - 生成的文档                                         │
│     - 代码文件                                           │
│     - 大型输出                                           │
│                                                          │
│  3. 容器本地存储 (临时)                                  │
│     - 当前工作目录                                       │
│     - 缓存的文件                                         │
│     - 临时状态                                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### B. Session Checkpoint 机制

**关键概念: Checkpoint Points**

```javascript
// Agent 执行的关键点
const CHECKPOINT_POINTS = {
    TASK_START: 'task_start',
    TOOL_CALL: 'tool_call',
    TOOL_RESULT: 'tool_result',
    SUB_AGENT_START: 'sub_agent_start',
    SUB_AGENT_END: 'sub_agent_end',
    TASK_COMPLETE: 'task_complete'
};

// 在每个关键点保存状态
async function saveCheckpoint(sessionId, point, state) {
    await db.checkpoints.insert({
        session_id: sessionId,
        checkpoint_point: point,
        state_data: JSON.stringify(state),
        timestamp: new Date(),
        metadata: {
            point_type: point,
            tools_used: state.tools,
            context_size: state.context.length
        }
    });
}
```

**保存的数据结构:**

```sql
-- sessions 表
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    container_id VARCHAR(255),
    status VARCHAR(50), -- active, suspended, completed
    metadata JSONB,
    created_at TIMESTAMP,
    last_activity TIMESTAMP,
    suspended_at TIMESTAMP
);

-- checkpoints 表
CREATE TABLE checkpoints (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    checkpoint_point VARCHAR(100),
    state_data JSONB,
    timestamp TIMESTAMP,
    metadata JSONB
);

-- messages 表
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    role VARCHAR(20), -- user, assistant, system
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP
);
```

#### C. Session 恢复流程

```javascript
async function restoreSession(sessionId) {
    // 1. 从数据库加载 Session 元数据
    const session = await db.sessions.findOne({ session_id: sessionId });
    
    if (!session) {
        throw new Error('Session not found');
    }
    
    // 2. 创建新容器
    const container = await createContainer(session.user_id, sessionId);
    
    // 3. 加载最后一个 Checkpoint
    const lastCheckpoint = await db.checkpoints.findOne(
        { session_id: sessionId },
        { order: { timestamp: -1 } }
    );
    
    if (lastCheckpoint) {
        // 4. 恢复 Agent 状态
        const state = JSON.parse(lastCheckpoint.state_data);
        
        await container.restoreState({
            context: state.context,
            tools: state.tools,
            variables: state.variables,
            workspace: state.workspace
        });
    }
    
    // 5. 重新加载对话历史
    const messages = await db.messages.find({ session_id: sessionId });
    await container.loadHistory(messages);
    
    // 6. 恢复工作空间文件
    await restoreWorkspaceFiles(sessionId, container);
    
    return container;
}

async function restoreWorkspaceFiles(sessionId, container) {
    // 从 Supabase Storage 下载文件到容器
    const files = await supabase.storage
        .from(`workspaces/${sessionId}`)
        .list();
    
    for (const file of files.data) {
        const { data, error } = await supabase.storage
            .from(`workspaces/${sessionId}`)
            .download(file.name);
        
        if (!error) {
            await container.writeFile(file.name, data);
        }
    }
}
```

#### D. 透明恢复体验

**前端处理:**

```javascript
// 前端连接时显示恢复状态
async function connectToSession(sessionId) {
    try {
        // 1. 尝试连接现有 Session
        const ws = new WebSocket(`wss://api.example.com/ws?session=${sessionId}`);
        
        ws.onopen = () => {
            showStatus('Connected');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'restoring':
                    showProgress('Restoring session...', data.progress);
                    break;
                case 'restored':
                    hideProgress();
                    loadMessages(data.messages);
                    break;
                case 'message':
                    appendMessage(data.message);
                    break;
            }
        };
        
    } catch (error) {
        // 2. Session 不存在或已过期
        showError('Session not found or expired');
        offerNewSession();
    }
}
```

**参考资料:**
- [LangGraph Persistence](https://medium.com/@iambeingferoz/persistence-in-langgraph-building-ai-agents-with-memory-fault-tolerance-and-human-in-the-loop-d07977980931)
- [AgentKeeper - Crash-Resistant Cognitive Continuity](https://github.com/Thinklanceai/agentkeeper)
- [Checkpoint/Restore Systems 演进](https://eunomia.dev/zh/blog/2025/05/11/checkpointrestore-systems-evolution-techniques-and-applications-in-ai-agents/)
- [Microsoft Agent Framework Checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints)

### 6. 完整的部署架构方案

**推荐架构: Railway + Supabase**

```
┌──────────────────────────────────────────────────────────┐
│                    Railway Platform                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Frontend (Next.js)                   │    │
│  │  - 静态资源托管                                  │    │
│  │  - 自动 HTTPS                                    │    │
│  │  - CDN 分发                                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │            API Gateway (Express)                │    │
│  │  - RESTful API                                   │    │
│  │  - WebSocket 服务                                │    │
│  │  - Session 管理                                   │    │
│  │  - 容器调度                                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Agent Engine Service (Docker)            │    │
│  │  - Container Pool Manager                        │    │
│  │  - 生命周期管理                                  │    │
│  │  - Session Checkpoint/Restore                   │    │
│  │  - Skill Loading                                │    │
│  │  - 自动休眠/唤醒 (Railway Serverless)          │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌──────────────────────────────────────────────────────────┐
│                   Supabase Platform                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │         PostgreSQL Database                       │    │
│  │  - 用户数据                                       │    │
│  │  - Session 状态                                  │    │
│  │  - Checkpoints                                   │    │
│  │  - 对话历史                                       │    │
│  │  - Row Level Security                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Storage Service                       │    │
│  │  - Skills 文件库                                 │    │
│  │  - 用户上传文件                                  │    │
│  │  - Workspace 存档                                │    │
│  │  - 生成文件                                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Auth Service                            │    │
│  │  - Google OAuth                                  │    │
│  │  - GitHub OAuth                                  │    │
│  │  - Session Tokens                               │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**成本估算:**

| 组件 | 平台 | 免费额度 | 超出费用 |
|------|------|---------|---------|
| Frontend | Railway | $5/月 | $0.05/GB-hr |
| API Service | Railway | 包含在 $5 内 | $0.05/GB-hr |
| Agent Container | Railway | ~50-100小时/月 | $0.05/GB-hr |
| Database | Supabase | 500MB | $0.125/GB |
| Storage | Supabase | 1GB | $0.021/GB-mo |
| Auth | Supabase | 包含 | - |

**月度成本估算 (100个活跃用户):**
- Railway: ~$10-20 (假设平均每用户每天使用 1 小时)
- Supabase: ~$5-10 (假设每用户 100MB 数据 + 100MB 存储)
- **总计**: ~$15-30/月

### 7. 具体实现步骤

#### Step 1: Railway 项目设置

```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
railway init

# 4. 添加服务
railway add
# 选择: Dockerfile

# 5. 配置环境变量
railway variables
# 设置:
# - DATABASE_URL
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SESSION_TIMEOUT=1800
```

#### Step 2: Dockerfile 配置

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制代码
COPY . .

# 构建 Next.js
RUN npm run build

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 启动
CMD ["npm", "start"]
```

#### Step 3: Agent Engine 服务

```dockerfile
# agent-engine/Dockerfile
FROM python:3.11-slim

WORKDIR /agent

# 安装 Claude Agent SDK
RUN pip install anthropic agent-sdk

# 复制 Agent 代码
COPY agent/ ./agent/

# 创建工作目录
RUN mkdir -p /workspace

# 暴露端口
EXPOSE 8000

# 启动 Agent 服务
CMD ["python", "-m", "agent.server"]
```

#### Step 4: Supabase 数据库设置

```sql
-- 启用 Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can only access their own data"
ON users FOR ALL
USING (auth.uid() = id);

CREATE POLICY "Users can only access their own sessions"
ON sessions FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can only access their own checkpoints"
ON checkpoints FOR ALL
USING (
    session_id IN (
        SELECT id FROM sessions WHERE user_id = auth.uid()
    )
);
```

#### Step 5: 部署命令

```bash
# 部署到 Railway
railway up

# 查看日志
railway logs

# 打开 URL
railway open
```

## 📊 总结与建议

### 关键决策点

1. **部署平台**: Railway (开发/小规模) → Fly.io (生产/大规模)
2. **数据库**: Supabase (免费层慷慨，内置功能丰富)
3. **隔离策略**: Process-based (MVP) → Docker (生产)
4. **Session 管理**: Checkpoint + 持久化存储
5. **成本优化**: 自动休眠 + 按需启动

### 开发路线图

**阶段 1: MVP (2-4周)**
- ✅ Railway + Supabase 基础部署
- ✅ 单用户 Session 管理
- ✅ 基本 Skill 加载
- ✅ 简单的 Web UI

**阶段 2: 多用户 (4-6周)**
- ✅ 容器隔离和池管理
- ✅ WebSocket 实时通信
- ✅ Session Checkpoint/Restore
- ✅ 用户认证和授权

**阶段 3: 生产就绪 (6-8周)**
- ✅ 完整的生命周期管理
- ✅ 成本优化和监控
- ✅ 高可用部署
- ✅ Skills Hub 功能

### 风险和缓解

| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| 容器启动延迟 | 用户体验差 | 预热容器池 + 快速恢复 |
| 成本超支 | 资金压力 | 设置预算告警 + 自动休眠 |
| 数据丢失 | 严重 | 多层持久化 + 定期备份 |
| 安全漏洞 | 数据泄露 | RLS + 容器隔离 + 定期审计 |

---

**最后更新**: 2026年6月3日  
**基于**: Railway, Fly.io, Supabase 2026年6月文档和定价
