/**
 * 运营策略服务 - Strategy Planner
 *
 * 负责基于竞品分析和热点数据生成运营策略，并为每个策略节点
 * 自动生成可直接发布的内容。
 *
 * 功能：
 * - generateStrategy: 基于竞品和热点数据生成完整运营策略
 * - adjustNode: 调整策略中的单个节点而不影响其他节点
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type {
  StrategyPlanner,
  StrategyRequest,
  OperationStrategy,
  StrategyNode,
  TrendingTopic,
  CompetitorReport,
  NoteRequest,
  Note,
} from '../types/index.js';
import { generateNote } from './content-generator.js';
import { getTrendingTopicsImpl } from './competitor-analyzer.js';

// ============================================================
// 内部存储
// ============================================================

/**
 * 内存中的策略存储
 */
const strategyStore = new Map<string, OperationStrategy>();

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// 策略生成辅助函数
// ============================================================

/**
 * 从热点话题和竞品报告中提取关键词/主题
 * 确保策略的数据驱动性（Property 16）
 */
function extractTopicsFromData(
  trendingTopics: TrendingTopic[],
  competitorReport?: CompetitorReport
): string[] {
  const topics: string[] = [];

  // 从热点话题中提取主题
  for (const topic of trendingTopics) {
    topics.push(topic.title);
  }

  // 从竞品报告中提取关键词
  if (competitorReport) {
    for (const trend of competitorReport.contentTrends) {
      topics.push(trend.topic);
    }
    for (const suggestion of competitorReport.strategySuggestions) {
      topics.push(suggestion);
    }
  }

  return topics;
}

/**
 * 基于数据源选择策略节点的主题
 * 确保每个节点的 topic 与 TrendingTopic 或 CompetitorReport 关键词有交集
 */
function selectNodeTopics(
  dataTopics: string[],
  trendingTopics: TrendingTopic[],
  category: string,
  nodeCount: number
): string[] {
  const selectedTopics: string[] = [];

  // 优先使用热点话题标题作为节点主题
  for (let i = 0; i < nodeCount && i < trendingTopics.length; i++) {
    selectedTopics.push(trendingTopics[i].title);
  }

  // 如果热点话题不够，使用竞品数据中的主题
  if (selectedTopics.length < nodeCount && dataTopics.length > 0) {
    for (let i = 0; selectedTopics.length < nodeCount && i < dataTopics.length; i++) {
      if (!selectedTopics.includes(dataTopics[i])) {
        selectedTopics.push(dataTopics[i]);
      }
    }
  }

  // 如果仍然不够，生成基于赛道的主题
  while (selectedTopics.length < nodeCount) {
    selectedTopics.push(`${category}内容${selectedTopics.length + 1}`);
  }

  return selectedTopics;
}

/**
 * 解析策略周期，返回天数
 */
function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)\s*days?/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  // 默认 30 天
  return 30;
}

/**
 * 计算策略节点数量（基于周期）
 */
function calculateNodeCount(durationDays: number): number {
  // 大约每 3-5 天一个节点，至少 1 个
  const count = Math.max(1, Math.ceil(durationDays / 4));
  // 最多 15 个节点
  return Math.min(count, 15);
}

/**
 * 生成策略节点的内容类型
 */
function getContentTypes(): string[] {
  return ['图文笔记', '视频笔记', '合集', '教程', '测评', '攻略', '清单'];
}

/**
 * 生成策略节点的发布频率描述
 */
function getFrequencyDescription(durationDays: number, nodeCount: number): string {
  const interval = Math.round(durationDays / nodeCount);
  if (interval <= 1) return '每天发布';
  if (interval <= 3) return '每2-3天发布';
  if (interval <= 7) return '每周发布';
  return `每${interval}天发布`;
}

/**
 * 生成预期效果描述
 */
function generateExpectedEffect(topic: string, index: number): string {
  const effects = [
    `通过${topic}内容吸引目标用户关注，预计获得较高互动率`,
    `借助${topic}热点提升账号曝光度，预计增加粉丝关注`,
    `以${topic}为切入点建立专业形象，预计提升用户信任度`,
    `通过${topic}系列内容增强用户粘性，预计提高复访率`,
    `利用${topic}话题引发讨论，预计获得较多评论互动`,
  ];
  return effects[index % effects.length];
}

// ============================================================
// 核心功能实现
// ============================================================

/**
 * 生成运营策略
 *
 * 基于竞品报告和热点数据生成完整的运营策略，包含时间节点、
 * 内容主题、发布频率和预期效果。策略生成后自动为每个节点
 * 调用 Content_Generator 生成 Publish_Ready 内容。
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */
export async function generateStrategy(
  request: StrategyRequest
): Promise<OperationStrategy> {
  const { category, goal, platform, duration, competitorReport, trendingTopics } = request;

  // 1. 获取热点数据（如果未提供）
  const topics: TrendingTopic[] = trendingTopics ?? await getTrendingTopicsImpl(platform, category);

  // 2. 从数据源提取主题关键词
  const dataTopics = extractTopicsFromData(topics, competitorReport);

  // 3. 计算策略参数
  const durationDays = parseDuration(duration);
  const nodeCount = calculateNodeCount(durationDays);
  const contentTypes = getContentTypes();
  const frequencyDesc = getFrequencyDescription(durationDays, nodeCount);

  // 4. 选择节点主题（确保数据驱动性）
  const nodeTopics = selectNodeTopics(dataTopics, topics, category, nodeCount);

  // 5. 生成策略节点
  const nodes: StrategyNode[] = [];
  const now = new Date();

  for (let i = 0; i < nodeCount; i++) {
    const scheduledDate = new Date(now.getTime() + (i + 1) * (durationDays / nodeCount) * 24 * 60 * 60 * 1000);
    const topic = nodeTopics[i];
    const contentType = contentTypes[i % contentTypes.length];

    // 为每个节点生成 Publish_Ready 内容
    const noteRequest: NoteRequest = {
      topic,
      platform,
      category,
    };
    const note: Note = await generateNote(noteRequest);

    const node: StrategyNode = {
      id: generateId('node'),
      scheduledDate,
      topic,
      contentType,
      frequency: frequencyDesc,
      expectedEffect: generateExpectedEffect(topic, i),
      note,
      status: note.status === 'ready' ? 'content_ready' : 'planned',
    };

    nodes.push(node);
  }

  // 6. 构建运营策略
  const strategy: OperationStrategy = {
    id: generateId('strategy'),
    category,
    goal,
    nodes,
    publishReady: true,
    createdAt: new Date(),
  };

  // 7. 存储策略
  strategyStore.set(strategy.id, strategy);

  return strategy;
}

/**
 * 调整策略节点
 *
 * 修改指定策略中的单个节点，其余所有节点保持不变。
 * 支持修改 scheduledDate、topic、contentType、frequency、expectedEffect 等字段。
 *
 * Requirements: 5.4
 */
export async function adjustNode(
  strategyId: string,
  nodeId: string,
  changes: Partial<StrategyNode>
): Promise<OperationStrategy> {
  const strategy = strategyStore.get(strategyId);
  if (!strategy) {
    throw new Error(`策略不存在: ${strategyId}`);
  }

  const nodeIndex = strategy.nodes.findIndex((n) => n.id === nodeId);
  if (nodeIndex === -1) {
    throw new Error(`节点不存在: ${nodeId}`);
  }

  // 创建更新后的节点（只修改指定字段）
  const existingNode = strategy.nodes[nodeIndex];
  const updatedNode: StrategyNode = {
    ...existingNode,
    ...changes,
    // 保持 id 不变
    id: existingNode.id,
  };

  // 如果 topic 发生变化，重新生成内容
  if (changes.topic && changes.topic !== existingNode.topic) {
    const noteRequest: NoteRequest = {
      topic: changes.topic,
      platform: existingNode.note?.platform ?? 'xiaohongshu',
      category: strategy.category,
    };
    const note = await generateNote(noteRequest);
    updatedNode.note = note;
    updatedNode.status = note.status === 'ready' ? 'content_ready' : 'planned';
  }

  // 创建新的节点数组，只替换目标节点
  const updatedNodes = strategy.nodes.map((node, index) =>
    index === nodeIndex ? updatedNode : node
  );

  // 创建更新后的策略
  const updatedStrategy: OperationStrategy = {
    ...strategy,
    nodes: updatedNodes,
  };

  // 更新存储
  strategyStore.set(strategyId, updatedStrategy);

  return updatedStrategy;
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建运营策略服务实例
 */
export function createStrategyPlanner(): StrategyPlanner {
  return {
    generateStrategy,
    adjustNode,
  };
}

// ============================================================
// 辅助函数（用于测试）
// ============================================================

/**
 * 获取策略存储（用于测试）
 */
export function getStrategyStore(): Map<string, OperationStrategy> {
  return strategyStore;
}

/**
 * 清空策略存储（用于测试）
 */
export function clearStrategyStore(): void {
  strategyStore.clear();
}
