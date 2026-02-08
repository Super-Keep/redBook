# 实现计划：AI数字员工系统

## 概述

基于设计文档，按照分层架构逐步实现各模块。从核心数据模型和接口开始，逐步构建业务服务，最后集成前端仪表盘。每个模块实现后配套属性测试和单元测试，确保增量验证。

## 任务

- [x] 1. 项目初始化与核心类型定义
  - [x] 1.1 初始化项目结构，配置 TypeScript、Vitest、fast-check、ESLint
    - 创建 `package.json`，安装依赖：`typescript`, `vitest`, `fast-check`, `express`, `pg`, `redis`, `bull`
    - 配置 `tsconfig.json`、`vitest.config.ts`
    - 创建目录结构：`src/types/`, `src/services/`, `src/api/`, `src/utils/`, `tests/`
    - _Requirements: 全局_
  - [x] 1.2 定义核心类型和接口
    - 创建 `src/types/index.ts`，定义 `ParsedIntent`, `TaskType`, `Platform`, `ExecutionPlan`, `TaskStep`, `Note`, `NoteStatus`, `NoteRequest`, `CompetitorReport`, `CompetitorTarget`, `TrendingTopic`, `PublishResult`, `PublishOptions`, `OperationStrategy`, `StrategyNode`, `EngagementData`, `CommentAnalysis`, `AnomalyAlert` 等所有接口和类型
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_
  - [x] 1.3 实现平台规范验证器
    - 创建 `src/utils/platform-validators.ts`，为每个平台（小红书、抖音、微博、微信）定义内容验证规则（文本长度、图片尺寸、标签数量等）
    - 实现 `validateNote(note: Note): ValidationResult` 函数
    - _Requirements: 3.2_
  - [ ]* 1.4 编写平台验证器的属性测试
    - **Property 9: 笔记可直接发布验证**
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 2. 对话引擎实现
  - [x] 2.1 实现意图解析器
    - 创建 `src/services/conversation-engine.ts`
    - 实现 `parseIntent(input: string): Promise<ParsedIntent>`，通过 AI 模型解析用户自然语言指令
    - 实现 `generateClarification(context: ConversationContext): Promise<string>`，生成澄清提示
    - 实现 `getContext(sessionId: string): Promise<ConversationContext>`，管理对话上下文
    - _Requirements: 1.1, 1.4_
  - [ ]* 2.2 编写意图解析的属性测试
    - **Property 1: 意图解析完整性**
    - **Validates: Requirements 1.1**
  - [ ]* 2.3 编写无效输入处理的属性测试
    - **Property 4: 无效输入澄清**
    - **Validates: Requirements 1.4**

- [x] 3. 任务编排器实现
  - [x] 3.1 实现任务编排核心逻辑
    - 创建 `src/services/task-orchestrator.ts`
    - 实现 `createPlan(intent: ParsedIntent): Promise<ExecutionPlan>`，将意图转化为带依赖关系的任务步骤
    - 实现 `executePlan(planId: string): Promise<void>`，按拓扑排序执行任务
    - 实现 `getTaskStatus(taskId: string): Promise<TaskStatus>`，查询任务状态
    - _Requirements: 1.2, 1.3, 1.5_
  - [ ]* 3.2 编写执行计划生成的属性测试
    - **Property 2: 执行计划生成**
    - **Validates: Requirements 1.2**
  - [ ]* 3.3 编写任务依赖顺序的属性测试
    - **Property 3: 任务依赖顺序执行**
    - **Validates: Requirements 1.3**

- [x] 4. Checkpoint - 确保核心框架测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 5. 竞品分析与热点服务实现
  - [x] 5.1 实现竞品分析服务
    - 创建 `src/services/competitor-analyzer.ts`
    - 实现 `collectData(target: CompetitorTarget): Promise<CompetitorData>`，采集竞品数据
    - 实现 `generateReport(data: CompetitorData): Promise<CompetitorReport>`，生成结构化报告
    - 实现 `getTrendingTopics(platform: Platform, category?: string): Promise<TrendingTopic[]>`，获取热点并排序
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 5.2 编写竞品报告完整性的属性测试
    - **Property 6: 竞品报告结构完整且可直接发布**
    - **Validates: Requirements 2.2, 2.4**
  - [ ]* 5.3 编写热点排序的属性测试
    - **Property 7: 热点列表排序**
    - **Validates: Requirements 2.3**
  - [ ]* 5.4 编写热点变化检测的属性测试
    - **Property 8: 热点变化检测**
    - **Validates: Requirements 2.5**

- [x] 6. 内容生成服务实现
  - [x] 6.1 实现内容生成器
    - 创建 `src/services/content-generator.ts`
    - 实现 `generateNote(request: NoteRequest): Promise<Note>`，调用 AI 模型生成文本和图片内容
    - 实现 `reviseNote(noteId: string, feedback: string): Promise<Note>`，根据反馈修改内容
    - 实现 `matchTrendingTags(content: string, platform: Platform): Promise<string[]>`，匹配热门标签
    - 生成的 Note 需通过平台验证器校验，确保 Publish_Ready
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 6.2 编写内容修改有效性的属性测试
    - **Property 10: 内容修改有效性**
    - **Validates: Requirements 3.5**
  - [ ]* 6.3 编写热门标签匹配的属性测试
    - **Property 11: 热门标签匹配**
    - **Validates: Requirements 3.6**

- [x] 7. 发布通道实现
  - [x] 7.1 实现发布通道服务
    - 创建 `src/services/publish-channel.ts`
    - 实现 `publish(note: Note, options: PublishOptions): Promise<PublishResult>`，发布内容到目标平台
    - 实现 `schedulePublish(note: Note, scheduledTime: Date): Promise<ScheduleResult>`，定时发布
    - 实现 `retryPublish(publishId: string): Promise<PublishResult>`，重试失败的发布
    - 实现发布结果记录到 PublishRecord
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 7.2 编写发布结果结构的属性测试
    - **Property 12: 发布结果结构正确性**
    - **Validates: Requirements 4.2, 4.4**
  - [ ]* 7.3 编写定时发布调度的属性测试
    - **Property 13: 定时发布调度一致性**
    - **Validates: Requirements 4.3**

- [x] 8. Checkpoint - 确保内容生产和发布链路测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 9. 运营策略服务实现
  - [x] 9.1 实现策略生成服务
    - 创建 `src/services/strategy-planner.ts`
    - 实现 `generateStrategy(request: StrategyRequest): Promise<OperationStrategy>`，基于竞品和热点数据生成策略
    - 实现 `adjustNode(strategyId: string, nodeId: string, changes: Partial<StrategyNode>): Promise<OperationStrategy>`，调整单个节点
    - 策略生成后自动为每个节点调用 Content_Generator 生成 Publish_Ready 内容
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 9.2 编写策略完整性的属性测试
    - **Property 14: 运营策略结构完整且可直接发布**
    - **Validates: Requirements 5.1, 5.5**
  - [ ]* 9.3 编写策略节点内容完备的属性测试
    - **Property 15: 策略节点内容完备**
    - **Validates: Requirements 5.2**
  - [ ]* 9.4 编写策略数据驱动性的属性测试
    - **Property 16: 策略数据驱动性**
    - **Validates: Requirements 5.3**
  - [ ]* 9.5 编写策略节点独立调整的属性测试
    - **Property 17: 策略节点独立调整**
    - **Validates: Requirements 5.4**

- [x] 10. 数据分析服务实现
  - [x] 10.1 实现数据分析服务
    - 创建 `src/services/analytics-service.ts`
    - 实现 `trackEngagement(noteId: string): Promise<EngagementData>`，监控互动数据
    - 实现 `generateSummary(timeRange: TimeRange): Promise<OperationSummary>`，生成运营报告
    - 实现 `analyzeComments(noteId: string): Promise<CommentAnalysis>`，分析评论情感
    - 实现 `getOptimizationSuggestions(): Promise<OptimizationSuggestion[]>`，生成优化建议
    - 实现 `detectAnomalies(noteId: string): Promise<AnomalyAlert[]>`，检测异常波动
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 10.2 编写互动数据完整性的属性测试
    - **Property 18: 互动数据字段完整性**
    - **Validates: Requirements 6.1**
  - [ ]* 10.3 编写数据聚合正确性的属性测试
    - **Property 19: 运营数据聚合正确性**
    - **Validates: Requirements 6.2**
  - [ ]* 10.4 编写情感分布归一化的属性测试
    - **Property 20: 评论情感分布归一化**
    - **Validates: Requirements 6.3**
  - [ ]* 10.5 编写异常检测的属性测试
    - **Property 21: 异常波动检测**
    - **Validates: Requirements 6.5**

- [x] 11. Checkpoint - 确保所有业务服务测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 12. 数据层实现
  - [x] 12.1 实现数据库模型和迁移
    - 创建 `src/db/migrations/` 目录，编写数据库迁移脚本
    - 创建 `User`, `Note`, `ImageAsset`, `PublishRecord`, `OperationStrategy`, `StrategyNode`, `EngagementData`, `CompetitorReport` 表
    - 实现软删除机制（`deletedAt` 字段）
    - _Requirements: 7.5_
  - [x] 12.2 实现数据访问层（Repository）
    - 创建 `src/db/repositories/` 目录
    - 实现各实体的 CRUD 操作，包括 Note 的软删除和恢复
    - 实现内容筛选查询（按平台、赛道、状态、时间）
    - _Requirements: 7.2, 7.4, 7.5_
  - [ ]* 12.3 编写内容列表完整性的属性测试
    - **Property 22: 内容列表完整性**
    - **Validates: Requirements 7.2**
  - [ ]* 12.4 编写内容筛选正确性的属性测试
    - **Property 23: 内容筛选正确性**
    - **Validates: Requirements 7.4**
  - [ ]* 12.5 编写软删除往返的属性测试
    - **Property 24: 软删除与恢复往返**
    - **Validates: Requirements 7.5**
  - [ ]* 12.6 编写竞品数据采集完整性的单元测试
    - 测试 mock 平台数据的字段提取
    - **Property 5: 竞品数据采集完整性**
    - **Validates: Requirements 2.1**

- [x] 13. API 层实现
  - [x] 13.1 实现 REST API 路由
    - 创建 `src/api/routes/` 目录
    - 实现对话接口：`POST /api/chat`（接收用户消息，返回数字员工响应）
    - 实现内容接口：`GET/POST/PUT/DELETE /api/notes`（内容 CRUD）
    - 实现发布接口：`POST /api/publish`、`POST /api/publish/schedule`
    - 实现策略接口：`GET/POST/PUT /api/strategies`
    - 实现分析接口：`GET /api/analytics/summary`、`GET /api/analytics/comments/:noteId`
    - 实现竞品接口：`GET /api/competitors/report`、`GET /api/trending`
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.2_
  - [ ]* 13.2 编写 API 集成测试
    - 使用 Supertest 测试各 API 端点的请求/响应格式
    - 测试错误处理（无效输入、认证失败等）
    - _Requirements: 1.4, 4.4_

- [x] 14. 运营仪表盘前端实现
  - [x] 14.1 初始化前端项目
    - 使用 Vite + React + TypeScript 创建前端项目
    - 配置路由（React Router）、状态管理、API 客户端
    - _Requirements: 7.1_
  - [x] 14.2 实现对话交互界面
    - 创建聊天组件，支持用户输入自然语言指令
    - 展示数字员工响应、任务执行进度
    - _Requirements: 1.1, 1.5_
  - [x] 14.3 实现内容管理与预览界面
    - 创建内容列表页面，支持按平台/赛道/状态/时间筛选
    - 实现目标平台（小红书手机端）的内容预览组件
    - 实现内容编辑和实时预览更新
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 14.4 实现运营策略展示界面
    - 创建策略时间线视图，展示各节点及其内容
    - 支持单节点调整和一键发布
    - _Requirements: 5.1, 5.4, 4.5_
  - [x] 14.5 实现数据分析仪表盘
    - 创建运营数据图表（浏览量、互动趋势等）
    - 展示评论分析和优化建议
    - 展示异常告警
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 15. 端到端集成与最终验证
  - [x] 15.1 串联完整业务流程
    - 对话指令 → 意图解析 → 任务编排 → 内容生成 → 预览 → 发布的完整链路
    - 策略生成 → 节点内容生成 → 定时发布的自动化链路
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 4.1, 5.1_
  - [ ]* 15.2 编写端到端集成测试
    - 测试从对话输入到内容发布的完整流程
    - 测试策略生成到自动发布的完整流程
    - _Requirements: 1.1, 3.1, 4.1, 5.1_

- [x] 16. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的任务为可选测试任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号，确保可追溯性
- Checkpoint 任务用于增量验证，确保每个阶段的质量
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
