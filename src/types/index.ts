/**
 * AI数字员工系统 - 核心类型和接口定义
 *
 * 本文件定义了系统中所有核心数据类型和接口，涵盖：
 * - 对话引擎（Conversation Engine）
 * - 任务编排器（Task Orchestrator）
 * - 内容生成器（Content Generator）
 * - 竞品分析服务（Competitor Analyzer）
 * - 发布通道（Publish Channel）
 * - 运营策略服务（Strategy Planner）
 * - 数据分析服务（Analytics Service）
 * - 数据模型实体
 */

// ============================================================
// 1. 对话引擎（Conversation Engine）相关类型
// ============================================================

/**
 * 任务类型枚举
 * 定义系统支持的所有任务类型
 */
export type TaskType =
  | 'competitor_analysis'
  | 'trending_tracking'
  | 'content_generation'
  | 'content_publish'
  | 'strategy_generation'
  | 'operation_summary'
  | 'comment_analysis';

/**
 * 支持的平台类型
 */
export type Platform = 'xiaohongshu' | 'douyin' | 'weibo' | 'wechat';

/**
 * 解析后的用户意图
 */
export interface ParsedIntent {
  taskType: TaskType;
  platform: Platform;
  category: string;                    // 赛道/领域
  parameters: Record<string, unknown>;
  confidence: number;
}

/**
 * 对话上下文
 */
export interface ConversationContext {
  sessionId: string;
  history: ConversationMessage[];
  currentIntent?: ParsedIntent;
  metadata: Record<string, unknown>;
}

/**
 * 对话消息
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * 对话引擎接口
 */
export interface ConversationEngine {
  parseIntent(input: string): Promise<ParsedIntent>;
  generateClarification(context: ConversationContext): Promise<string>;
  getContext(sessionId: string): Promise<ConversationContext>;
}

// ============================================================
// 2. 任务编排器（Task Orchestrator）相关类型
// ============================================================

/**
 * 计划状态
 */
export type PlanStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 执行计划
 */
export interface ExecutionPlan {
  id: string;
  steps: TaskStep[];
  status: PlanStatus;
  createdAt: Date;
}

/**
 * 任务步骤
 */
export interface TaskStep {
  id: string;
  type: TaskType;
  dependencies: string[];              // 依赖的前置步骤 ID
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
}

/**
 * 任务编排器接口
 */
export interface TaskOrchestrator {
  createPlan(intent: ParsedIntent): Promise<ExecutionPlan>;
  executePlan(planId: string): Promise<void>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
}

// ============================================================
// 3. 内容生成器（Content Generator）相关类型
// ============================================================

/**
 * 笔记状态
 */
export type NoteStatus = 'draft' | 'ready' | 'published' | 'offline';

/**
 * 内容风格
 */
export interface ContentStyle {
  tone: string;                        // 语调（如：专业、轻松、幽默）
  length: 'short' | 'medium' | 'long';
  format: string;                      // 格式偏好
}

/**
 * 素材
 */
export interface Material {
  type: 'image' | 'text' | 'video' | 'link';
  url?: string;
  content?: string;
  description?: string;
}

/**
 * 图片资源
 */
export interface ImageAsset {
  id: string;
  noteId?: string;
  url: string;
  width: number;
  height: number;
  altText: string;
}

/**
 * 平台预览数据
 */
export interface PlatformPreview {
  platform: Platform;
  layout: Record<string, unknown>;
  renderedHtml?: string;
  thumbnailUrl?: string;
}

/**
 * 笔记请求
 */
export interface NoteRequest {
  topic: string;
  platform: Platform;
  category: string;
  referenceMaterials?: Material[];
  style?: ContentStyle;
}

/**
 * 笔记
 */
export interface Note {
  id: string;
  title: string;
  textContent: string;
  images: ImageAsset[];
  tags: string[];
  platform: Platform;
  status: NoteStatus;
  platformPreview: PlatformPreview;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 内容生成器接口
 */
export interface ContentGenerator {
  generateNote(request: NoteRequest): Promise<Note>;
  reviseNote(noteId: string, feedback: string): Promise<Note>;
  matchTrendingTags(content: string, platform: Platform): Promise<string[]>;
}

// ============================================================
// 4. 竞品分析服务（Competitor Analyzer）相关类型
// ============================================================

/**
 * 竞品目标
 */
export interface CompetitorTarget {
  type: 'account' | 'keyword';
  value: string;                       // 账号名或关键词
  platform: Platform;
}

/**
 * 趋势分析
 */
export interface TrendAnalysis {
  topic: string;
  trend: 'rising' | 'stable' | 'declining';
  dataPoints: number[];
  period: string;
}

/**
 * 互动数据摘要
 */
export interface EngagementSummary {
  averageLikes: number;
  averageComments: number;
  averageFavorites: number;
  averageShares: number;
  engagementRate: number;
}

/**
 * 竞品数据
 */
export interface CompetitorData {
  target: CompetitorTarget;
  contentData: ContentDataItem[];
  engagementData: EngagementSummary;
  publishFrequency: PublishFrequency;
  collectedAt: Date;
}

/**
 * 内容数据项
 */
export interface ContentDataItem {
  title: string;
  type: string;
  publishedAt: Date;
  engagement: {
    likes: number;
    comments: number;
    favorites: number;
    shares: number;
  };
  tags: string[];
}

/**
 * 发布频率
 */
export interface PublishFrequency {
  postsPerWeek: number;
  peakDays: string[];
  peakHours: number[];
}

/**
 * 竞品分析报告
 */
export interface CompetitorReport {
  id: string;
  target: CompetitorTarget;
  contentTrends: TrendAnalysis[];
  engagementMetrics: EngagementSummary;
  strategySuggestions: string[];
  generatedAt: Date;
  publishReady: boolean;
}

/**
 * 热点话题
 */
export interface TrendingTopic {
  id: string;
  title: string;
  platform: Platform;
  category?: string;
  hotScore: number;                    // 热度值
  relatedTags: string[];
  discoveredAt: Date;
}

/**
 * 竞品分析服务接口
 */
export interface CompetitorAnalyzer {
  collectData(target: CompetitorTarget): Promise<CompetitorData>;
  generateReport(data: CompetitorData): Promise<CompetitorReport>;
  getTrendingTopics(platform: Platform, category?: string): Promise<TrendingTopic[]>;
}

// ============================================================
// 5. 发布通道（Publish Channel）相关类型
// ============================================================

/**
 * 发布选项
 */
export interface PublishOptions {
  mode: 'auto' | 'manual';
  platform: Platform;
}

/**
 * 发布结果
 */
export interface PublishResult {
  success: boolean;
  publishId: string;
  platformUrl?: string;
  error?: string;
  publishedAt?: Date;
}

/**
 * 定时发布结果
 */
export interface ScheduleResult {
  scheduleId: string;
  scheduledTime: Date;
  noteId: string;
  status: 'scheduled' | 'cancelled';
}

/**
 * 发布记录
 */
export interface PublishRecord {
  id: string;
  noteId: string;
  platform: Platform;
  success: boolean;
  platformUrl?: string;
  error?: string;
  publishedAt: Date;
}

/**
 * 发布通道接口
 */
export interface PublishChannel {
  publish(note: Note, options: PublishOptions): Promise<PublishResult>;
  schedulePublish(note: Note, scheduledTime: Date): Promise<ScheduleResult>;
  retryPublish(publishId: string): Promise<PublishResult>;
}

// ============================================================
// 6. 运营策略服务（Strategy Planner）相关类型
// ============================================================

/**
 * 策略请求
 */
export interface StrategyRequest {
  category: string;
  goal: string;
  platform: Platform;
  duration: string;                    // 策略周期（如 "30days"）
  competitorReport?: CompetitorReport;
  trendingTopics?: TrendingTopic[];
}

/**
 * 策略节点
 */
export interface StrategyNode {
  id: string;
  scheduledDate: Date;
  topic: string;
  contentType: string;
  frequency: string;
  expectedEffect: string;
  note?: Note;                         // 该节点对应的具体内容
  status: 'planned' | 'content_ready' | 'published';
}

/**
 * 运营策略
 */
export interface OperationStrategy {
  id: string;
  category: string;
  goal: string;
  nodes: StrategyNode[];
  publishReady: boolean;
  createdAt: Date;
}

/**
 * 运营策略服务接口
 */
export interface StrategyPlanner {
  generateStrategy(request: StrategyRequest): Promise<OperationStrategy>;
  adjustNode(strategyId: string, nodeId: string, changes: Partial<StrategyNode>): Promise<OperationStrategy>;
}

// ============================================================
// 7. 数据分析服务（Analytics Service）相关类型
// ============================================================

/**
 * 时间范围
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * 互动数据
 */
export interface EngagementData {
  noteId: string;
  views: number;
  likes: number;
  comments: number;
  favorites: number;
  shares: number;
  updatedAt: Date;
}

/**
 * 评论分析
 */
export interface CommentAnalysis {
  noteId: string;
  totalComments: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topKeywords: string[];
  summary: string;
}

/**
 * 运营摘要
 */
export interface OperationSummary {
  timeRange: TimeRange;
  totalNotes: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalFavorites: number;
  totalShares: number;
  topPerformingNotes: string[];
  insights: string[];
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  type: 'timing' | 'content' | 'tags' | 'frequency';
  title: string;
  description: string;
  confidence: number;
  basedOn: string;                     // 基于什么数据得出
}

/**
 * 异常告警
 */
export interface AnomalyAlert {
  noteId: string;
  metric: 'views' | 'likes' | 'comments' | 'favorites' | 'shares';
  currentValue: number;
  expectedValue: number;
  deviation: number;                   // 偏差倍数
  detectedAt: Date;
  possibleReasons: string[];
}

/**
 * 数据分析服务接口
 */
export interface AnalyticsService {
  trackEngagement(noteId: string): Promise<EngagementData>;
  generateSummary(timeRange: TimeRange): Promise<OperationSummary>;
  analyzeComments(noteId: string): Promise<CommentAnalysis>;
  getOptimizationSuggestions(): Promise<OptimizationSuggestion[]>;
  detectAnomalies(noteId: string): Promise<AnomalyAlert[]>;
}

// ============================================================
// 8. 数据模型实体类型（对应数据库表）
// ============================================================

/**
 * 用户
 */
export interface User {
  id: string;
  name: string;
  email: string;
  platformCredentials: Record<string, unknown>;
  createdAt: Date;
}

/**
 * 内容验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  message: string;
  rule: string;
}

/**
 * 平台规范配置
 */
export interface PlatformSpec {
  platform: Platform;
  maxTextLength: number;
  maxTitleLength: number;
  maxTags: number;
  maxImages: number;
  imageSpecs: {
    maxWidth: number;
    maxHeight: number;
    minWidth: number;
    minHeight: number;
    allowedFormats: string[];
  };
}
