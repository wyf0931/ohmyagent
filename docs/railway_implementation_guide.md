# Railway 实例池实现指南

## 📦 项目结构

```
ai-agent-platform/
├── apps/
│   ├── web-ui/              # Next.js Web UI
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   │
│   ├── pool-manager/        # 实例池管理服务
│   │   ├── src/
│   │   │   ├── pool/
│   │   │   │   ├── InstancePoolManager.ts
│   │   │   │   ├── railway-client.ts
│   │   │   │   └── state-machine.ts
│   │   │   ├── session/
│   │   │   │   ├── SessionRouter.ts
│   │   │   │   └── SessionManager.ts
│   │   │   ├── queue/
│   │   │   │   └── TaskQueueManager.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── agent-engine/        # Pi Agent Engine 服务
│       ├── src/
│       │   ├── agent/
│       │   │   ├── PiAgentWrapper.ts
│       │   │   └── SkillManager.ts
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── shared/              # 共享类型和工具
│   │   ├── types/
│   │   │   ├── instance.ts
│   │   │   ├── session.ts
│   │   │   └── events.ts
│   │   └── utils/
│   │
│   └── db/                  # 数据库迁移和工具
│       ├── migrations/
│       └── seed.ts
│
├── railway.yaml
├── package.json
└── turbo.json
```

---

## 🔧 详细实现

### 1. 状态机实现

```typescript
// packages/shared/types/state-machine.ts

export type InstanceState =
  | 'CREATING'
  | 'IDLE'
  | 'BUSY'
  | 'RELEASING'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'FAILED';

export type InstanceEvent =
  | { type: 'CREATE' }
  | { type: 'ASSIGN'; sessionId: string }
  | { type: 'COMPLETE' }
  | { type: 'RELEASE' }
  | { type: 'IDLE_TIMEOUT' }
  | { type: 'TERMINATE' }
  | { type: 'FAIL'; reason: string };

export interface StateTransition {
  from: InstanceState;
  event: InstanceEvent['type'];
  to: InstanceState;
  action?: () => Promise<void>;
}

// 状态转换表
const STATE_TRANSITIONS: Record<InstanceState, Record<string, InstanceState>> = {
  CREATING: {
    CREATE: 'CREATING',
    ASSIGN: 'BUSY',
    FAIL: 'FAILED'
  },
  IDLE: {
    ASSIGN: 'BUSY',
    TERMINATE: 'TERMINATING',
    FAIL: 'FAILED'
  },
  BUSY: {
    COMPLETE: 'RELEASING',
    FAIL: 'FAILED'
  },
  RELEASING: {
    RELEASE: 'IDLE',
    TERMINATE: 'TERMINATING',
    FAIL: 'FAILED'
  },
  TERMINATING: {
    TERMINATE: 'TERMINATED'
  },
  TERMINATED: {},
  FAILED: {}
};

export class InstanceStateMachine {
  private currentState: InstanceState = 'CREATING';
  private instanceId: string;
  private onTransition?: (from: InstanceState, to: InstanceState) => void;

  constructor(instanceId: string, initialState: InstanceState = 'CREATING') {
    this.instanceId = instanceId;
    this.currentState = initialState;
  }

  async transition(event: InstanceEvent): Promise<InstanceState> {
    const eventType = event.type;
    const transitions = STATE_TRANSITIONS[this.currentState];
    
    if (!transitions || !transitions[eventType]) {
      throw new Error(
        `Invalid transition: ${this.currentState} + ${eventType}`
      );
    }

    const nextState = transitions[eventType];
    const previousState = this.currentState;
    
    // 执行转换
    await this.executeTransitionAction(event, nextState);
    
    this.currentState = nextState;
    
    // 触发回调
    if (this.onTransition) {
      this.onTransition(previousState, nextState);
    }

    return nextState;
  }

  private async executeTransitionAction(
    event: InstanceEvent,
    nextState: InstanceState
  ): Promise<void> {
    // 这里可以执行状态转换时的具体操作
    // 例如：发送通知、记录日志、更新数据库等
    
    switch (nextState) {
      case 'BUSY':
        // 实例被分配给 session
        break;
      case 'IDLE':
        // 实例变为空闲，可以接受新任务
        break;
      case 'TERMINATING':
        // 开始关闭实例
        break;
      case 'FAILED':
        // 实例失败，需要重启
        break;
    }
  }

  getState(): InstanceState {
    return this.currentState;
  }

  onStateChange(callback: (from: InstanceState, to: InstanceState) => void): void {
    this.onTransition = callback;
  }
}
```

### 2. 实例池管理器（完整版）

```typescript
// apps/pool-manager/src/pool/InstancePoolManager.ts

import { RailwayClient } from './railway-client';
import { SupabaseClient } from '@supabase/supabase-js';
import { InstanceStateMachine, InstanceState, InstanceEvent } from '../../../shared/types/state-machine';
import { EventEmitter } from 'events';

interface InstanceConfig {
  activeInstances: number;
  maxInstances: number;
  idleTimeout: number;
}

interface PoolMetrics {
  total: number;
  active: number;
  idle: number;
  creating: number;
  queued: number;
}

export class InstancePoolManager extends EventEmitter {
  private railway: RailwayClient;
  private supabase: SupabaseClient;
  private config: InstanceConfig;
  private stateMachines: Map<string, InstanceStateMachine> = new Map();
  private monitorInterval?: NodeJS.Timeout;

  constructor(
    railwayToken: string,
    projectId: string,
    supabase: SupabaseClient,
    config: InstanceConfig = {
      activeInstances: 4,
      maxInstances: 10,
      idleTimeout: 10 * 60 * 1000 // 10 分钟
    }
  ) {
    super();
    this.railway = new RailwayClient(railwayToken, projectId);
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * 初始化实例池
   */
  async initialize(): Promise<void> {
    console.log('Initializing instance pool...');
    
    // 1. 加载现有实例
    await this.loadExistingInstances();
    
    // 2. 确保最小实例数量
    await this.ensureMinimumCapacity();
    
    // 3. 启动监控
    this.startMonitoring();
    
    console.log('Instance pool initialized');
  }

  /**
   * 获取实例池指标
   */
  async getMetrics(): Promise<PoolMetrics> {
    const { data } = await this.supabase
      .from('instances')
      .select('status');
    
    const instances = data || [];
    
    return {
      total: instances.length,
      active: instances.filter(i => i.status === 'BUSY').length,
      idle: instances.filter(i => i.status === 'IDLE').length,
      creating: instances.filter(i => i.status === 'CREATING').length,
      queued: await this.getQueueLength()
    };
  }

  /**
   * 为 session 获取实例
   */
  async acquireForSession(sessionId: string): Promise<string | null> {
    // 1. 尝试获取空闲实例
    const idleInstance = await this.findIdleInstance();
    
    if (idleInstance) {
      await this.assignInstance(idleInstance.id, sessionId);
      return idleInstance.railway_service_id;
    }
    
    // 2. 检查是否可以创建新实例
    const metrics = await this.getMetrics();
    if (metrics.total < this.config.maxInstances) {
      const newInstance = await this.createNewInstance(sessionId);
      return newInstance.railway_service_id;
    }
    
    // 3. 没有可用实例，返回 null（需要排队）
    return null;
  }

  /**
   * 释放 session 的实例
   */
  async releaseFromSession(sessionId: string): Promise<void> {
    const { data } = await this.supabase
      .from('instances')
      .select('*')
      .eq('current_session_id', sessionId)
      .single();
    
    if (!data) return;
    
    const stateMachine = this.getStateMachine(data.id);
    
    // 状态转换: BUSY -> RELEASING -> IDLE
    await stateMachine.transition({ type: 'COMPLETE' });
    await this.updateInstanceState(data.id, 'RELEASING');
    
    // 保存 session 状态
    await this.saveSessionCheckpoint(sessionId);
    
    await stateMachine.transition({ type: 'RELEASE' });
    await this.updateInstanceState(data.id, 'IDLE');
    await this.clearSessionBinding(data.id);
    
    // 更新活动时间
    await this.updateLastActivity(data.id);
    
    this.emit('instance-released', { instanceId: data.id, sessionId });
  }

  /**
   * 查找空闲实例
   */
  private async findIdleInstance(): Promise<any | null> {
    const { data } = await this.supabase
      .from('instances')
      .select('*')
      .eq('status', 'IDLE')
      .order('last_activity_at', { ascending: true })
      .limit(1);
    
    return data?.[0] || null;
  }

  /**
   * 创建新实例
   */
  private async createNewInstance(sessionId: string): Promise<any> {
    console.log(`Creating new instance for session ${sessionId}`);
    
    // 1. 调用 Railway API 扩容
    const railwayServiceId = await this.railway.scaleUp(1);
    
    // 2. 创建数据库记录
    const { data, error } = await this.supabase
      .from('instances')
      .insert({
        railway_service_id: railwayServiceId,
        status: 'CREATING',
        current_session_id: sessionId,
        created_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 3. 创建状态机
    const stateMachine = new InstanceStateMachine(data.id, 'CREATING');
    stateMachine.onStateChange((from, to) => {
      console.log(`Instance ${data.id}: ${from} -> ${to}`);
      this.emit('state-change', { instanceId: data.id, from, to });
    });
    this.stateMachines.set(data.id, stateMachine);
    
    // 4. 等待实例就绪
    await this.waitForInstanceReady(data.id);
    
    // 5. 转换到 BUSY 状态
    await stateMachine.transition({ type: 'ASSIGN', sessionId });
    await this.updateInstanceState(data.id, 'BUSY');
    
    this.emit('instance-created', { instanceId: data.id, sessionId });
    
    return data;
  }

  /**
   * 分配实例给 session
   */
  private async assignInstance(instanceId: string, sessionId: string): Promise<void> {
    const stateMachine = this.getStateMachine(instanceId);
    await stateMachine.transition({ type: 'ASSIGN', sessionId });
    
    await this.updateInstanceState(instanceId, 'BUSY');
    await this.bindSession(instanceId, sessionId);
    
    this.emit('instance-assigned', { instanceId, sessionId });
  }

  /**
   * 等待实例就绪
   */
  private async waitForInstanceReady(instanceId: string): Promise<void> {
    const maxAttempts = 60; // 最多等待 5 分钟
    const interval = 5000; // 每 5 秒检查一次
    
    for (let i = 0; i < maxAttempts; i++) {
      const { data } = await this.supabase
        .from('instances')
        .select('railway_service_id')
        .eq('id', instanceId)
        .single();
      
      if (!data) continue;
      
      // 检查 Railway 服务状态
      const serviceStatus = await this.railway.getServiceStatus(data.railway_service_id);
      
      if (serviceStatus?.status === 'READY') {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Instance ${instanceId} failed to become ready`);
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    this.monitorInterval = setInterval(async () => {
      await this.checkIdleInstances();
      await this.ensureMinimumCapacity();
    }, 60 * 1000); // 每分钟检查
  }

  /**
   * 检查并释放空闲实例
   */
  private async checkIdleInstances(): Promise<void> {
    const now = new Date();
    const threshold = new Date(now.getTime() - this.config.idleTimeout);
    
    const { data } = await this.supabase
      .from('instances')
      .select('*')
      .eq('status', 'IDLE')
      .lt('last_activity_at', threshold.toISOString())
      .order('last_activity_at', { ascending: true });
    
    const idleInstances = data || [];
    const metrics = await this.getMetrics();
    
    // 确保不低于最小实例数
    const keepMinimum = Math.max(
      this.config.activeInstances,
      metrics.active + metrics.creating
    );
    
    const toTerminate = Math.max(0, idleInstances.length - keepMinimum);
    
    for (let i = 0; i < toTerminate; i++) {
      await this.terminateInstance(idleInstances[i].id);
    }
  }

  /**
   * 终止实例
   */
  private async terminateInstance(instanceId: string): Promise<void> {
    console.log(`Terminating instance ${instanceId}`);
    
    const { data } = await this.supabase
      .from('instances')
      .select('railway_service_id')
      .eq('id', instanceId)
      .single();
    
    if (!data) return;
    
    const stateMachine = this.getStateMachine(instanceId);
    await stateMachine.transition({ type: 'TERMINATE' });
    await this.updateInstanceState(instanceId, 'TERMINATING');
    
    // 调用 Railway API 缩容
    await this.railway.scaleDown(1);
    
    await this.updateInstanceState(instanceId, 'TERMINATED');
    this.stateMachines.delete(instanceId);
    
    this.emit('instance-terminated', { instanceId });
  }

  /**
   * 确保最小容量
   */
  private async ensureMinimumCapacity(): Promise<void> {
    const metrics = await this.getMetrics();
    const totalAvailable = metrics.idle + metrics.active + metrics.creating;
    
    if (totalAvailable < this.config.activeInstances) {
      const needed = this.config.activeInstances - totalAvailable;
      console.log(`Scaling up by ${needed} to meet minimum capacity`);
      await this.railway.scaleUp(needed);
    }
  }

  /**
   * 加载现有实例
   */
  private async loadExistingInstances(): Promise<void> {
    const { data } = await this.supabase
      .from('instances')
      .select('*')
      .in('status', ['CREATING', 'IDLE', 'BUSY', 'RELEASING']);
    
    for (const instance of data || []) {
      const stateMachine = new InstanceStateMachine(instance.id, instance.status);
      this.stateMachines.set(instance.id, stateMachine);
    }
  }

  /**
   * 获取队列长度
   */
  private async getQueueLength(): Promise<number> {
    const { count } = await this.supabase
      .from('task_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    return count || 0;
  }

  // 辅助方法
  private getStateMachine(instanceId: string): InstanceStateMachine {
    let machine = this.stateMachines.get(instanceId);
    if (!machine) {
      machine = new InstanceStateMachine(instanceId);
      this.stateMachines.set(instanceId, machine);
    }
    return machine;
  }

  private async updateInstanceState(instanceId: string, status: InstanceState): Promise<void> {
    await this.supabase
      .from('instances')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', instanceId);
  }

  private async updateLastActivity(instanceId: string): Promise<void> {
    await this.supabase
      .from('instances')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', instanceId);
  }

  private async bindSession(instanceId: string, sessionId: string): Promise<void> {
    await this.supabase
      .from('instances')
      .update({ current_session_id: sessionId })
      .eq('id', instanceId);
  }

  private async clearSessionBinding(instanceId: string): Promise<void> {
    await this.supabase
      .from('instances')
      .update({ current_session_id: null })
      .eq('id', instanceId);
  }

  private async saveSessionCheckpoint(sessionId: string): Promise<void> {
    // 保存 session 状态到 Supabase Storage
    // 这里可以实现 checkpoint 逻辑
  }

  /**
   * 关闭实例池
   */
  async shutdown(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    // 释放所有空闲实例
    const metrics = await this.getMetrics();
    const idleCount = metrics.idle;
    for (let i = 0; i < idleCount; i++) {
      // 逐个终止
    }
  }
}
```

### 3. 任务队列管理器

```typescript
// apps/pool-manager/src/queue/TaskQueueManager.ts

import { Queue, Worker, Job } from 'bullmq';
import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface SessionTask {
  sessionId: string;
  userId: string;
  priority: number;
  queuedAt: Date;
}

export class TaskQueueManager extends EventEmitter {
  private queue: Queue;
  private worker?: Worker;
  private supabase: SupabaseClient;

  constructor(
    redisUrl: string,
    supabase: SupabaseClient
  ) {
    super();
    this.supabase = supabase;
    
    this.queue = new Queue('session-queue', {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });
  }

  /**
   * 将 session 加入队列
   */
  async enqueueSession(task: SessionTask): Promise<void> {
    await this.queue.add('session-request', task, {
      priority: task.priority,
      jobId: task.sessionId // 确保同一个 session 不会重复排队
    });
    
    // 同时保存到数据库
    await this.supabase.from('task_queue').insert({
      session_id: task.sessionId,
      user_id: task.userId,
      status: 'pending',
      queued_at: task.queuedAt.toISOString()
    });
    
    this.emit('session-enqueued', task);
  }

  /**
   * 获取队列中的下一个任务
   */
  async getNextSession(): Promise<SessionTask | null> {
    const job = await this.queue.getNextJob('session-request');
    
    if (!job) return null;
    
    const task = job.data as SessionTask;
    
    // 更新数据库状态
    await this.supabase
      .from('task_queue')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('session_id', task.sessionId);
    
    return task;
  }

  /**
   * 完成任务处理
   */
  async completeSession(sessionId: string): Promise<void> {
    const job = await this.queue.getJob(sessionId);
    if (job) {
      await job.moveToCompleted('success');
    }
    
    // 从数据库删除
    await this.supabase
      .from('task_queue')
      .delete()
      .eq('session_id', sessionId);
    
    this.emit('session-completed', { sessionId });
  }

  /**
   * 获取队列统计
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const counts = await this.queue.getJobCounts();
    
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0
    };
  }

  /**
   * 启动工作进程
   */
  async startWorker(handler: (task: SessionTask) => Promise<void>): Promise<void> {
    this.worker = new Worker(
      'session-queue',
      async (job: Job) => {
        const task = job.data as SessionTask;
        await handler(task);
      },
      {
        connection: { url: process.env.REDIS_URL },
        concurrency: 1 // 一次处理一个任务
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }

  /**
   * 关闭队列
   */
  async close(): Promise<void> {
    await this.queue.close();
    if (this.worker) {
      await this.worker.close();
    }
  }
}
```

---

## 🚀 部署配置

### Railway 配置文件

```yaml
# railway.yaml
---
build:
  build_command: "npm run build"
  watch_paths:
    - .

deploy:
  runtime_settings:
    serverless_mode: true
    idle_timeout: 600s
  
  healthcheck_path: "/health"
  healthcheck_timeout: 300s
  restart_policy_type: "on-failure"
  restart_policy_max_retries: 3

# 环境变量（在 Dashboard 中配置）
# RAILWAY_TOKEN
# PROJECT_ID
# SUPABASE_URL
# SUPABASE_SERVICE_KEY
# REDIS_URL
# ACTIVE_INSTANCES=4
# MAX_INSTANCES=10
# IDLE_TIMEOUT=600
```

### Docker Compose（本地开发）

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  pool-manager:
    build: ./apps/pool-manager
    environment:
      - SUPABASE_URL=http://postgres:5432
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  agent-engine:
    build: ./apps/agent-engine
    environment:
      - SUPABASE_URL=http://postgres:5432
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## 🧪 测试

### 单元测试示例

```typescript
// apps/pool-manager/src/pool/__tests__/InstancePoolManager.test.ts

import { InstancePoolManager } from '../InstancePoolManager';
import { mockSupabaseClient, mockRailwayClient } from '../../../../shared/mocks';

describe('InstancePoolManager', () => {
  let poolManager: InstancePoolManager;
  let supabase: any;
  let railway: any;

  beforeEach(() => {
    supabase = mockSupabaseClient();
    railway = mockRailwayClient();
    poolManager = new InstancePoolManager('token', 'project-id', supabase, {
      activeInstances: 2,
      maxInstances: 5,
      idleTimeout: 60000 // 1 分钟（测试用）
    });
  });

  describe('acquireForSession', () => {
    it('应该返回空闲实例', async () => {
      const mockInstance = {
        id: 'inst-1',
        railway_service_id: 'rs-1',
        status: 'IDLE'
      };
      supabase.from.mockReturnValue({
        select: mockResolvedValue({ data: [mockInstance] })
      });

      const result = await poolManager.acquireForSession('session-1');
      
      expect(result).toBe('rs-1');
    });

    it('应该在达到最大实例数时返回 null', async () => {
      // Mock 没有空闲实例
      supabase.from.mockReturnValue({
        select: mockResolvedValue({ data: [] })
      });
      
      // Mock 已达到最大实例数
      supabase.from.mockReturnValue({
        select: mockResolvedValue({ data: Array(5).fill({ status: 'BUSY' }) })
      });

      const result = await poolManager.acquireForSession('session-1');
      
      expect(result).toBeNull();
    });
  });

  describe('releaseFromSession', () => {
    it('应该正确释放实例', async () => {
      const mockInstance = {
        id: 'inst-1',
        railway_service_id: 'rs-1',
        status: 'BUSY',
        current_session_id: 'session-1'
      };
      
      supabase.from.mockReturnValue({
        select: mockResolvedValue({ data: [mockInstance] }),
        update: mockResolvedValue({}),
        single: mockResolvedValue({ data: mockInstance })
      });

      await poolManager.releaseFromSession('session-1');
      
      // 验证状态更新
      expect(supabase.from).toHaveBeenCalledWith('instances');
    });
  });
});
```

---

## 📚 补充资源

- [Railway CLI 完整命令参考](https://docs.railway.com/reference/cli)
- [BullMQ 队列管理最佳实践](https://docs.bullmq.io/bullmq/patterns)
- [Supabase 实时订阅实现](https://supabase.com/docs/guides/realtime)
- [Pi Agent Core 使用文档](https://pi.dev/docs)
