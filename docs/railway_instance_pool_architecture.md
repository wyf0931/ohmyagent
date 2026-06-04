# Railway 弹性实例池架构设计

## 🎯 核心需求回顾

基于你的技术选型，需要在 Railway 上实现：
- **基座引擎**: Pi + nicobailon/pi-subagents
- **动态实例管理**: 4 个活跃实例，最多 10 个
- **队列溢出处理**: 超过 10 个实例时任务排队
- **空闲超时释放**: 10 分钟无消息自动释放实例
- **会话绑定**: 用户 session 动态绑定/释放实例

---

## 🚂 Railway 能力验证

### 1. 动态实例创建 ✅

**Railway 支持的方式:**

```bash
# 方式 A: CLI Scale 命令 (推荐用于生产)
railway scale --service <service-id> <replicas>

# 示例: 扩展到 5 个副本
railway scale --service backend 5

# 方式 B: GraphQL API (推荐用于自动化)
# 变更服务实例数量
mutation UpdateServiceInstances($serviceId: String!, $quantity: Int!) {
  updateService(input: {id: $serviceId, instanceQuantity: $quantity}) {
    service {
      id
      name
      instanceQuantity
    }
  }
}
```

**实例数量限制:**
| Plan | Replicas | Instances |
|------|----------|-----------|
| **Hobby** | 5 | 5 |
| **Pro** | 50 | 50 |
| **Max** | 100 | 100 |

**✅ 你的需求 (4-10 实例) 完全支持**

### 2. 10 分钟空闲超时 ✅

**Railway Serverless Mode 特性:**

```yaml
# railway.yaml
build:
  build_command: "npm run build"
  watch_paths:
    - .

deploy:
  runtime_settings:
    # Serverless 模式
    serverless_mode: true
    # 空闲超时 (Railway 默认 ~10 分钟)
    idle_timeout: 600s

# 或使用环境变量
environment:
  - RAILWAY_SERVERLESS_MODE=true
  - RAILWAY_IDLE_TIMEOUT=600
```

**✅ Railway 原生支持你的超时需求**

### 3. 生命周期管理 ✅

**Railway 提供的生命周期钩子:**

```typescript
// 在你的应用中实现健康检查和优雅关闭
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', lastActivity: lastMessageTimestamp });
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  // 1. 停止接受新任务
  // 2. 完成正在执行的任务
  // 3. 保存状态
  // 4. 关闭连接
  gracefulShutdown();
});
```

---

## 🏗️ 实例池架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Web UI (Next.js)                        │
│                     用户交互界面                              │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Instance Pool Manager                       │
│              (Express.js + BullMQ 集成)                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Pool State  │  │   Queue      │  │  State       │      │
│  │  Manager     │  │  Manager     │  │  Machine     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Railway GraphQL API / CLI                      │
│  - 动态调整实例数量                                          │
│  - 监控实例状态                                              │
│  - 管理部署版本                                              │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Railway Service Pool                       │
│                                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Instance │ │Instance │ │Instance │ │Instance │           │
│  │   1     │ │   2     │ │   3     │ │   4     │  (Active) │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │Instance │ │Instance │ │Instance │ │Instance │ │Instance │ │
│  │   5     │ │   6     │ │   7     │ │   8     │ │   9     │ │
│  │(Reserve)│ │(Reserve)│ │(Reserve)│ │(Reserve)│ │(Reserve)│ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  - Session 存储                                               │
│  - 实例池状态                                                │
│  - 队列任务存储                                              │
│  - 用户数据                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 状态机设计

```
┌─────────────────────────────────────────────────────────────────┐
│                    实例生命周期状态机                            │
└─────────────────────────────────────────────────────────────────┘

     初始化
       │
       ↓
    [CREATING] ──────────────→ [FAILED]
       │                          │
       │ (成功启动)                │ (启动失败)
       ↓                          │
    [IDLE] ◄─────────────────────┘
       │
       │ (分配给 session)
       ↓
    [BUSY] ←──────────────┐
       │                   │
       │ (完成会话)         │ (有新任务)
       │                   │
       ↓                   │
    [RELEASING] ────────→ [BUSY]
       │
       │ (释放完成)
       ↓
    [IDLE] ───────────────────────────────────┐
       │                                       │
       │ (超过 10 分钟空闲)                    │ (保留在池中)
       ↓                                       │
    [TERMINATING]                             │
       │                                       │
       │ (实例终止)                            │
       ↓                                       │
    [TERMINATED] ─────────────────────────────┘
```

**状态定义:**

| 状态 | 描述 | 超时时间 |
|------|------|----------|
| `CREATING` | 实例正在创建中 | 5 分钟 |
| `IDLE` | 实例空闲，可接受新任务 | 无 |
| `BUSY` | 实例正在处理任务 | 无 |
| `RELEASING` | 实例正在释放当前 session | 30 秒 |
| `TERMINATING` | 实例正在关闭 | 1 分钟 |
| `TERMINATED` | 实例已关闭 | - |
| `FAILED` | 实例启动或运行失败 | - |

---

## 💻 实现示例

### 1. 实例池管理器

```typescript
// src/pool/InstancePoolManager.ts

import { RailwayClient } from './railway-client';
import { SupabaseClient } from '@supabase/supabase-js';

interface InstanceState {
  id: string;
  railwayServiceId: string;
  status: 'CREATING' | 'IDLE' | 'BUSY' | 'RELEASING' | 'TERMINATING' | 'TERMINATED' | 'FAILED';
  currentSessionId?: string;
  lastActivityAt: Date;
  createdAt: Date;
}

export class InstancePoolManager {
  private railwayClient: RailwayClient;
  private supabase: SupabaseClient;
  
  // 配置
  private readonly ACTIVE_INSTANCES = 4;
  private readonly MAX_INSTANCES = 10;
  private readonly IDLE_TIMEOUT = 10 * 60 * 1000; // 10 分钟

  async initializePool(): Promise<void> {
    // 1. 检查当前实例数量
    const currentCount = await this.getCurrentInstanceCount();
    
    // 2. 确保至少有 ACTIVE_INSTANCES 个实例
    if (currentCount < this.ACTIVE_INSTANCES) {
      await this.scaleUp(this.ACTIVE_INSTANCES - currentCount);
    }
    
    // 3. 启动空闲监控
    this.startIdleMonitor();
  }

  async acquireInstance(sessionId: string): Promise<InstanceState | null> {
    // 1. 尝试获取空闲实例
    const idleInstance = await this.findIdleInstance();
    if (idleInstance) {
      return await this.assignInstance(idleInstance.id, sessionId);
    }
    
    // 2. 检查是否可以扩容
    const currentCount = await this.getCurrentInstanceCount();
    if (currentCount < this.MAX_INSTANCES) {
      const newInstance = await this.createInstance(sessionId);
      return newInstance;
    }
    
    // 3. 返回 null，调用方应该将任务加入队列
    return null;
  }

  async releaseInstance(sessionId: string): Promise<void> {
    const instance = await this.getInstanceBySession(sessionId);
    if (!instance) return;
    
    // 1. 更新状态为 RELEASING
    await this.updateInstanceState(instance.id, 'RELEASING');
    
    // 2. 保存 session 状态到 Supabase
    await this.saveSessionState(sessionId);
    
    // 3. 清理实例上的 session 数据
    await this.cleanupInstanceSession(instance.id);
    
    // 4. 更新为 IDLE
    await this.updateInstanceState(instance.id, 'IDLE');
    await this.updateLastActivity(instance.id);
  }

  private async findIdleInstance(): Promise<InstanceState | null> {
    const { data } = await this.supabase
      .from('instances')
      .select('*')
      .eq('status', 'IDLE')
      .limit(1);
    
    return data?.[0] || null;
  }

  private async createInstance(sessionId: string): Promise<InstanceState> {
    // 1. 调用 Railway API 创建新实例
    const serviceId = await this.railwayClient.scaleUp(1);
    
    // 2. 记录实例状态
    const { data } = await this.supabase
      .from('instances')
      .insert({
        railway_service_id: serviceId,
        status: 'CREATING',
        current_session_id: sessionId,
        created_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();
    
    // 3. 等待实例就绪
    await this.waitForInstanceReady(data.id);
    
    return data;
  }

  private startIdleMonitor(): void {
    setInterval(async () => {
      const now = new Date();
      const idleThreshold = new Date(now.getTime() - this.IDLE_TIMEOUT);
      
      // 查找超过 10 分钟空闲的实例
      const { data } = await this.supabase
        .from('instances')
        .select('*')
        .eq('status', 'IDLE')
        .lt('last_activity_at', idleThreshold.toISOString());
      
      // 缩容空闲实例
      if (data && data.length > this.ACTIVE_INSTANCES) {
        const toTerminate = data.length - this.ACTIVE_INSTANCES;
        for (let i = 0; i < toTerminate; i++) {
          await this.terminateInstance(data[i].id);
        }
      }
    }, 60 * 1000); // 每分钟检查一次
  }

  private async terminateInstance(instanceId: string): Promise<void> {
    // 1. 更新状态
    await this.updateInstanceState(instanceId, 'TERMINATING');
    
    // 2. 调用 Railway API 缩容
    await this.railwayClient.scaleDown(1);
    
    // 3. 更新为 TERMINATED
    await this.updateInstanceState(instanceId, 'TERMINATED');
  }

  // ... 辅助方法
}
```

### 2. Railway GraphQL 客户端

```typescript
// src/pool/railway-client.ts

import fetch from 'node-fetch';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class RailwayClient {
  private token: string;
  private projectId: string;
  private endpoint = 'https://backboard.railway.app/graphql/v2';

  constructor(token: string, projectId: string) {
    this.token = token;
    this.projectId = projectId;
  }

  async scaleUp(delta: number): Promise<string> {
    const query = `
      mutation ScaleUp($projectId: String!, $delta: Int!) {
        projectUpdate(input: {id: $projectId, instancesDelta: $delta}) {
          project {
            id
            instances {
              id
              name
            }
          }
        }
      }
    `;

    const response = await this.request(query, {
      projectId: this.projectId,
      delta
    });

    return response.data?.projectUpdate?.project?.instances?.[0]?.id || '';
  }

  async scaleDown(delta: number): Promise<void> {
    const query = `
      mutation ScaleDown($projectId: String!, $delta: Int!) {
        projectUpdate(input: {id: $projectId, instancesDelta: -$delta}) {
          project {
            id
          }
        }
      }
    `;

    await this.request(query, {
      projectId: this.projectId,
      delta
    });
  }

  async getServiceStatus(serviceId: string): Promise<any> {
    const query = `
      query GetService($id: String!) {
        service(id: $id) {
          id
          name
          status
          instances {
            id
            status
          }
        }
      }
    `;

    const response = await this.request(query, { id: serviceId });
    return response.data?.service;
  }

  private async request<T>(
    query: string,
    variables: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 3. 会话路由器

```typescript
// src/session/SessionRouter.ts

import { Queue } from 'bull';
import { InstancePoolManager } from '../pool/InstancePoolManager';
import { SupabaseClient } from '@supabase/supabase-js';

export class SessionRouter {
  private pool: InstancePoolManager;
  private taskQueue: Queue;
  private supabase: SupabaseClient;

  async routeSession(sessionId: string): Promise<string> {
    // 1. 检查 session 是否已有绑定的实例
    const existing = await this.getExistingBinding(sessionId);
    if (existing) {
      // 更新活动时间
      await this.updateActivity(sessionId);
      return existing.instanceId;
    }

    // 2. 尝试从池中获取实例
    const instance = await this.pool.acquireInstance(sessionId);
    
    if (instance) {
      // 绑定成功
      await this.createBinding(sessionId, instance.id);
      return instance.id;
    }

    // 3. 没有可用实例，加入队列
    await this.enqueueSession(sessionId);
    throw new Error('NO_AVAILABLE_INSTANCE');
  }

  async releaseSession(sessionId: string): Promise<void> {
    // 1. 释放实例
    await this.pool.releaseInstance(sessionId);
    
    // 2. 检查队列中是否有等待的 session
    const nextSession = await this.dequeueSession();
    if (nextSession) {
      // 将下一个 session 分配给刚刚释放的实例
      await this.routeSession(nextSession.sessionId);
    }
  }

  private async enqueueSession(sessionId: string): Promise<void> {
    await this.taskQueue.add('session_request', { sessionId });
  }

  private async dequeueSession(): Promise<any | null> {
    const job = await this.taskQueue.getNext();
    if (job) {
      await job.remove();
      return job.data;
    }
    return null;
  }
}
```

---

## 📊 数据库 Schema 设计

```sql
-- instances 表
CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  railway_service_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_session_id UUID REFERENCES sessions(id),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instances_status ON instances(status);
CREATE INDEX idx_instances_last_activity ON instances(last_activity_at);

-- sessions 表
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  instance_id UUID REFERENCES instances(id),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- 会话数据
  soul_config JSONB,
  selected_skills TEXT[],
  message_count INT DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_instance ON sessions(instance_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- task_queue 表 (BullMQ 使用 Redis，这里作为备份)
CREATE TABLE task_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) NOT NULL,
  status VARCHAR(50) NOT NULL,
  queued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- RLS 策略
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 💰 成本分析

### Railway 定价模型 (2026)

| Plan | 月费 | CPU | 内存 | 实例限制 |
|------|------|-----|------|----------|
| **Hobby** | $5 | 0.5 vCPU | 512MB | 5 副本 |
| **Pro** | $20 | 1 vCPU | 1GB | 50 副本 |
| **Max** | $500 | 8 vCPU | 16GB | 100 副本 |

### 你的场景成本估算

**假设使用 Pro Plan:**

```
基础费用:
- Pro Plan: $20/月

实例运行成本 (4-10 个实例):
- 平均 7 个实例运行
- 每实例 $0.008/小时 (估算)
- 7 × 24 × 30 × $0.008 = ~$40/月

网络流量:
- 假设 100GB/月
- $0.10/GB = $10/月

总估算: ~$70/月
```

**成本优化建议:**
1. 使用 Railway 的 Serverless 模式减少空闲成本
2. 实现智能缩容，非高峰期减少到 2-3 个实例
3. 利用 Railway 的 $5 免费额度
4. 预留实例 (如果稳定使用)

---

## 🎯 部署流程

### Step 1: 准备 Railway 项目

```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录
railway login

# 3. 创建项目
railway create --name ai-agent-platform

# 4. 初始化服务
railway up --service agent-engine
railway up --service pool-manager
railway up --service web-ui
```

### Step 2: 配置环境变量

```bash
# 在 Railway Dashboard 中设置
RAILWAY_TOKEN=<your-token>
PROJECT_ID=<project-id>

# Supabase 配置
SUPABASE_URL=<supabase-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-key>

# Redis 配置 (用于 BullMQ)
REDIS_URL=<redis-url>

# 实例池配置
ACTIVE_INSTANCES=4
MAX_INSTANCES=10
IDLE_TIMEOUT=600
```

### Step 3: 部署服务

```bash
# 部署所有服务
railway up

# 初始扩容到 4 个实例
railway scale --service agent-engine 4
```

### Step 4: 验证部署

```bash
# 检查服务状态
railway status

# 查看日志
railway logs

# 测试 API
curl https://your-app.railway.app/health
```

---

## 📚 参考资源

### Railway 官方文档
- [Railway GraphQL API](https://docs.railway.com/reference/graphql-api)
- [Scaling Services](https://docs.railway.com/deploy/scaling-services)
- [Serverless Mode](https://docs.railway.com/deploy/serverless-mode)
- [CLI Commands](https://docs.railway.com/reference/cli)

### 相关技术
- [BullMQ 文档](https://docs.bullmq.io/)
- [Supabase 实时订阅](https://supabase.com/docs/guides/realtime)
- [AGENT Framework](https://github.com/earendil-works/pi)
- [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents)

---

**总结**: Railway 完全支持你的弹性实例池架构需求。4-10 实例范围在 Pro Plan 限制内，10 分钟空闲超时可使用 Serverless 模式实现，GraphQL API 提供完整的动态扩缩容能力。
