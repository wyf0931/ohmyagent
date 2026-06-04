# AGENT Framework 作为基座引擎的技术选型分析

## 🎯 用户需求回顾

基于你的业务场景，关键需求是：
1. **动态 Skill 注入** - 用户从 skill hub 选择，按需加载（避免上百个 skill 同时注入）
2. **SOUL 设定** - 用户可以设定默认系统提示词/角色
3. **领域聚焦** - 每个会话聚焦特定领域（心理咨询、职场关系等）
4. **Skill 不超过 30 个** - 最佳实践，避免模型推理混乱
5. **Subagent 能力** - 支持子代理协作
6. **TypeScript 实现** - 与技术栈匹配
7. **企业级稳定性** - 产品级部署要求

---

## 📊 Pi 框架深度分析

### 一、Pi 框架概述

**官方定义:**
> Pi is a minimal terminal coding harness. Adapt pi to your workflows, not the other way around.

**核心特点:**
- ✅ **TypeScript 实现** - 完整的 monorepo 架构
- ✅ **极简主义哲学** - 核心最小化，通过扩展实现功能
- ✅ **多 Provider 支持** - Anthropic, OpenAI, Google, DeepSeek 等 20+ 种
- ✅ **灵活扩展系统** - Extensions, Skills, Prompt Templates, Themes
- ✅ **会话管理** - JSONL 格式，支持分支和 checkpoint
- ✅ **事件驱动架构** - 完整的生命周期事件流

### 二、架构组成

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENT Framework                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              @earendil-works/pi-ai                    │ │
│  │  - 统一的多 Provider LLM API                           │ │
│  │  - 模型注册表                                         │ │
│  │  - Token 成本计算                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │            @earendil-works/pi-agent-core               │ │
│  │  - Agent 类 (状态管理)                                │ │
│  │  - Agent Loop (执行循环)                             │ │
│  │  - Tool Calling (工具调用)                           │ │
│  │  - Event Streaming (事件流)                           │ │
│  │  - Message Queues (steering/follow-up)              │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │             @earendil-works/pi-coding-agent              │ │
│  │  - CLI/TUI 界面                                       │ │
│  │  - Skills 系统                                        │ │
│  │  - Extensions 系统                                   │ │
│  │  - Prompt Templates                                   │ │
│  │  - Session Management (JSONL)                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                               │
│  📦 第三方扩展:                                             │
│  ├── nicobailon/pi-subagents (Subagent 支持)             │
│  ├── mjakl/pi-subagent (轻量级 Subagent)                │
│  ├── tintinweb/pi-subagents (Claude Code 风格)         │
│  └── ifi/pi-extension-subagents (增强版 Subagent)        │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Pi 与你的需求匹配度分析

### 需求 1: 动态 Skill 注入 ⭐⭐⭐⭐⭐

**Pi 的 Skill 系统:**

**实现方式:**
```typescript
// packages/agent/src/harness/skills.ts

// 1. Skill 加载机制
async function loadSkills(env, dirs) {
  // 递归遍历目录
  // 加载 SKILL.md 文件
  // 支持 .gitignore/.ignore
  // 返回 skills + diagnostics
}

// 2. Skill 格式 (Agent Skills 标准)
<!-- ~/.pi/agent/skills/my-skill/SKILL.md -->
# My Skill
Use this skill when the user asks about X.

## Steps
1. Do this
2. Then that
```

**3. 动态注入:**
```typescript
// 用户选择 Skill 后
agent.state.systemPrompt = formatSkillInvocation(selectedSkill);

// 或通过命令加载
pi --skill ~/skills/counseling
pi /skill:counseling
```

**✅ 完美匹配需求:**
- ✅ 按需加载，不是一次性全部加载
- ✅ 遵循 Agent Skills 标准
- ✅ 支持从多个目录加载
- ✅ 支持 sourceloading (带来源标记的加载)
- ✅ 用户可以选择性启用

### 需求 2: SOUL 设定 ⭐⭐⭐⭐⭐

**实现方式:**
```typescript
// 1. 全局默认 SOUL
// ~/.pi/agent/SYSTEM.md
You are a helpful assistant with expertise in psychology.

// 2. 项目级 SOUL
// .pi/SYSTEM.md
You are a career counselor specializing in workplace relationships.

// 3. 动态设置
agent.state.systemPrompt = "You are a...";

// 4. 追加模式
// APPEND_SYSTEM.md
// 在现有 SOUL 基础上追加内容
```

**✅ 完美匹配需求:**
- ✅ 支持多层级 SOUL 设定
- ✅ 支持会话级动态修改
- ✅ 支持追加模式 (保留原有设定)

### 需求 3: 领域聚焦 ⭐⭐⭐⭐⭐

**Pi 的 Context Engineering:**
```typescript
// 1. Context Files
// AGENTS.md 或 CLAUDE.md
// 项目级指令、约定、常用命令

// 2. Prompt Templates
// 可重用的提示词模板
// /review → 展开代码审查模板
// /refactor → 展开重构模板

// 3. Transform Context
transformContext: async (messages, signal) => {
  // 自动裁剪旧消息
  // 注入外部上下文
  return pruneOldMessages(messages);
}
```

**✅ 完美匹配需求:**
- ✅ 通过 Skills 聚焦特定领域
- ✅ 通过 Prompt Templates 预设场景
- ✅ 自动 context 管理，避免混乱

### 需求 4: Skill 不超过 30 个 ⭐⭐⭐⭐⭐

**Pi 的设计哲学:**
- 极简主义 - 不预加载大量功能
- 按需加载 - 只加载用户选择的
- 社区包生态 - 通过 pi-packages 分发

**最佳实践支持:**
```typescript
// .pi/settings.json
{
  "skills": {
    "enabled": ["counseling", "workplace", "communication"],
    "disabled": ["general", "coding"]  // 禁用不相关 skill
  }
}

// 命令行
pi --skill counseling --skill workplace  // 只加载需要的
pi --no-skills  // 完全不加载
```

**✅ 完美匹配需求:**
- ✅ 没有预加载大量 skill 的风险
- ✅ 完全可控的 skill 加载
- ✅ 支持启用/禁用配置

### 需求 5: Subagent 能力 ⭐⭐⭐⭐⭐

**官方支持 (通过 Extensions):**

**第三方实现 (都有文档):**

| 包 | 特点 | 链接 |
|----|------|------|
| **nicobailon/pi-subagents** | 官方推荐，异步 subagent，支持 artifacts | [GitHub](https://github.com/nicobailon/pi-subagents) |
| **mjakl/pi-subagent** | 轻量级，最多 4 个并行 agent | [GitHub](https://github.com/mjakl/pi-subagent) |
| **tintinweb/pi-subagents** | Claude Code 风格，独立会话 | [GitHub](https://github.com/tintinweb/pi-subagents) |
| **ifi/pi-extension-subagents** | 增强版，支持链式调用、并行执行 | [npm](https://www.npmjs.com/package/@ifi/pi-extension-subagents) |

**Subagent 工作原理:**
```
主 Agent
    ↓
delegate() 工具调用
    ↓
spawn 子 Pi 进程
    ↓
子 Agent 执行任务
    ↓
return result
    ↓
主 Agent 整合结果
```

**✅ 完美匹配需求:**
- ✅ 官方架构支持 subagent
- ✅ 多个成熟的第三方实现
- ✅ 支持并行、链式、交互式 subagent
- ✅ 社区维护活跃

### 需求 6: TypeScript 实现 ⭐⭐⭐⭐⭐

**代码质量:**
- ✅ 完整的 TypeScript monorepo
- ✅ 严格的类型定义
- ✅ 良好的供应链安全 (pinned dependencies)
- ✅ 企业级的代码质量标准

**架构优势:**
```typescript
// 清晰的类型系统
interface AgentMessage {
  role: 'user' | 'assistant' | 'toolResult';
  content: Array<TextContent | ImageContent>;
  timestamp: number;
  // 可扩展
}

// 扩展性
declare module "@earendil-works/pi-agent-core" {
  interface CustomAgentMessages {
    custom: { role: 'custom'; data: any };
  }
}
```

**✅ 完美匹配需求:**
- ✅ TypeScript 原生实现
- ✅ 类型安全和扩展性
- ✅ 与现有技术栈无缝集成

### 需求 7: 企业级稳定性 ⭐⭐⭐⭐⭐

**供应链安全:**
```
- 所有外部依赖 pinned 到精确版本
- .npmrc 设置 save-exact=true
- package-lock.json 是唯一真相来源
- Pre-commit 阻止意外的 lockfile 变更
- 发布前进行完整的 smoke tests
```

**版本管理:**
```
- 语义化版本控制
- 详细的 CHANGELOG.md
- 自动更新检查
- 可配置的遥测
```

**社区支持:**
- 官方 Discord 社区
- 活跃的开发者 (Mario Zechner)
- 快速的问题修复
- 完善的文档

**✅ 完美匹配需求:**
- ✅ 企业级代码质量标准
- ✅ 成熟的版本管理
- ✅ 活跃的社区支持

---

## 🔄 Pi vs LangGraph 对比

| 维度 | Pi | LangGraph | 推荐 |
|------|----|-----------|------|
| **开发语言** | ✅ TypeScript | ⚠️ Python | **Pi** |
| **State 管理** | ⚠️ 基础 Agent.state | ✅ StateGraph (显式) | **LangGraph** |
| **Skill 注入** | ✅ 按需 loadSkills() | ⚠️ 需要自己实现 | **Pi** |
| **多模型支持** | ✅ 20+ Provider 内置 | ✅ 完全解耦 | 平手 |
| **Subagent** | ✅ 第三方包成熟 | ✅ 原生支持 | 平手 |
| **事件系统** | ✅ 完整生命周期事件 | ⚠️ 基础事件 | **Pi** |
| **会话管理** | ✅ JSONL + 分支 | ⚠️ 需要自己实现 | **Pi** |
| **扩展性** | ✅ Extensions + Packages | ✅ 生态 | 平手 |
| **学习曲线** | ✅ 更快 | ⚠️ 更陡 | **Pi** |
| **生产稳定性** | ✅ 企业级代码质量 | ✅ 成熟框架 | 平手 |
| **社区规模** | ⚠️ 较小 | ✅ 更大 | **LangGraph** |

**综合评估:**
- **你的场景**: Pi 更适合 ⭐⭐⭐⭐⭐
- **复杂编排**: LangGraph 更适合
- **混合方案**: Pi 作为基座 + 必要时用 LangGraph

---

## 💡 推荐架构方案

### 方案 A: 纯 Pi 方案 (推荐 ⭐⭐⭐⭐⭐)

```
┌─────────────────────────────────────────────┐
│          Web UI (Next.js + Tailwind)          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          API Gateway (Express.js)            │
│  - 用户认证                                  │
│  - Skill Hub 接口                           │
│  - Session 管理                              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            AGENT Engine                 │
│                                               │
│  ┌─────────────────────────────────────┐  │
│  │   Session 管理 (JSONL)               │  │
│  │   - 分支和 checkpoint              │  │
│  │   - 持久化和恢复                     │  │
│  └─────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────┐  │
│  │   Skill Manager                       │  │
│  │   - 按需加载 Skills                  │  │
│  │   - 30 个 Skill 上限                 │  │
│  │   - 领域分类                         │  │
│  └─────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────┐  │
│  │   SOUL Manager                        │  │
│  │   - 用户默认设定                     │  │
│  │   - 项目级覆盖                       │  │
│  │   - 会话级定制                       │  │
│  └─────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────┐  │
│  │   Subagent System (第三方包)          │  │
│  │   - nicobailon/pi-subagents          │  │
│  │   - 并行、链式、交互式               │  │
│  └─────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────┐  │
│  │   Multi-Provider Layer                │  │
│  │   - Anthropic, OpenAI, DeepSeek      │  │
│  │   - OpenRouter, 本地模型             │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         数据存储 (Supabase)                   │
│  - Sessions                                  │
│  - Skills Library                            │
│  - User Data                                 │
└─────────────────────────────────────────────┘
```

**优势:**
- ✅ TypeScript 全栈
- ✅ 简单的 state 管理 (够用就好)
- ✅ 成熟的 Skill 系统
- ✅ 强大的会话管理
- ✅ 活跃的 subagent 生态
- ✅ 多模型无缝切换

### 方案 B: 混合方案 (Pi + LangGraph)

```typescript
// 在特定场景使用 LangGraph
import { Agent } from "@earendil-works/pi-agent-core";
import { StateGraph } from "@langchain/langgraph";

// 主编排用 Pi
const mainAgent = new Agent({
  initialState: {
    systemPrompt: "You are a coordinator...",
    tools: [
      {
        name: "delegate_to_langgraph",
        execute: async (args) => {
          // 将复杂编排委托给 LangGraph
          const result = await langGraphWorkflow.invoke(args);
          return { content: [{ type: "text", text: result }] };
        }
      }
    ]
  }
});
```

---

## 🛠️ 实现示例：动态 Skill 注入

### 场景：心理咨询会话

**1. 用户选择 Skills:**
```typescript
// 用户在 Web UI 选择
const selectedSkills = [
  'counseling-basics',
  'active-listening',
  'crisis-intervention',
  'empathy-building'
]; // 4 个 skill，远少于 30 个
```

**2. 动态加载和注入:**
```typescript
import { loadSkills } from "@earendil-works/pi-agent-core";

// 按需加载
const { skills } = await loadSkills(env, [
  `~/.pi/agent/skills/${selectedSkills[0]}`,
  `~/.pi/agent/skills/${selectedSkills[1]}`,
  // ...
]);

// 注入到 Agent
const agent = new Agent({
  initialState: {
    systemPrompt: formatSoul(soulConfig),
    tools: counselorTools,
  },
  transformContext: async (messages, signal) => {
    // 将 skills 格式化为系统提示词
    const skillBlocks = skills.map(s => formatSkillInvocation(s));
    const enhancedSystemPrompt = `${basePrompt}\n\n${skillBlocks.join('\n\n')}`;
    
    // 只注入最近的 30 个 skill 相关内容
    return pruneAndInject(messages, enhancedSystemPrompt, 30);
  }
});
```

**3. Subagent 协作:**
```typescript
// 使用 nicobailon/pi-subagents
import subagents from "@ifi/pi-extension-subagents";

// 注册 subagent 工具
agent.registerTool({
  name: "delegate_to_specialist",
  execute: async (args) => {
    const result = await subagents.delegate({
      agent: 'workplace-relationship-expert',
      task: args.task,
      context: 'narrow-focus'
    });
    return { content: [{ type: "text", text: result }] };
  }
});
```

---

## 📋 关键优势总结

### 1. 完美匹配 Skill 需求
- ✅ **Agent Skills 标准** - 兼容社区标准
- ✅ **按需加载** - 不是一次性全部注入
- ✅ **灵活管理** - 启用/禁用/分类
- ✅ **数量可控** - 不会导致混乱

### 2. SOUL 设定灵活性
- ✅ **多层级** - 全局/项目/会话
- ✅ **动态调整** - 实时修改
- ✅ **追加模式** - 保留原有设定

### 3. Subagent 生态成熟
- ✅ **多个实现** - 可选择最适合的
- ✅ **Claude Code 风格** - tintinweb 版本
- ✅ **增强功能** - ifi 版本
- ✅ **社区维护** - 活跃开发

### 4. TypeScript 技术栈
- ✅ **类型安全** - 完整的类型系统
- ✅ **扩展性** - 声明合并扩展
- ✅ **代码质量** - 企业级标准

### 5. 企业级稳定性
- ✅ **供应链安全** - Pinned dependencies
- ✅ **版本管理** - 语义化版本
- ✅ **社区支持** - 活跃维护

---

## 🎯 最终推荐

**强烈推荐 Pi 作为基座引擎** ⭐⭐⭐⭐⭐

**理由:**
1. ✅ **完美匹配你的核心需求** - Skill 系统、SOUL、领域聚焦、Subagent
2. ✅ **TypeScript 实现** - 与技术栈完美契合
3. ✅ **企业级稳定性** - 代码质量和供应链安全
4. ✅ **学习曲线平缓** - 比 LangGraph 更容易上手
5. ✅ **扩展性强** - Extensions + Packages 生态
6. ✅ **多模型支持** - 不被单一供应商锁定
7. ✅ **成熟的 Subagent 方案** - 多个第三方实现可选

**相比 Claude Agent SDK:**
- ✅ **更稳定** - 不依赖 Claude Code 二进制
- ✅ **更灵活** - 支持 DeepSeek 等第三方模型
- ✅ **更透明** - TypeScript 源码可审查

**相比 LangGraph:**
- ✅ **更简单的 Skill 系统** - 开箱即用
- ✅ **更强大的会话管理** - JSONL + 分支
- ✅ **更快的开发** - 不需要定义 StateGraph

---

## 📦 推荐的 Pi 生态系统

**核心包:**
```bash
npm install @earendil-works/pi-agent-core
npm install @earendil-works/pi-ai
npm install @earendil-works/pi-coding-agent
```

**Subagent 支持:**
```bash
# Claude Code 风格 (推荐)
pi install git:tintinweb/pi-subagents

# 增强版
npm install @ifi/pi-extension-subagents

# 轻量级
pi install git:mjakl/pi-subagent
```

**开发资源:**
- 官方文档: [pi.dev](https://pi.dev)
- Discord: [Pi Discord](https://discord.com/channels/1456806362351669492/1457744485428629628)
- GitHub: [earendil-works/pi](https://github.com/earendil-works/pi)

---

**结论:** Pi 是你需求的理想基座引擎，特别是在 Skill 管理、SOUL 设定、Subagent 支持方面都有成熟的实现。结合 Railway + Supabase 部署方案，可以构建一个稳定、灵活、可扩展的企业级 AI Agent 平台。
