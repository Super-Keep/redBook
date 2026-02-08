/**
 * 数据分析服务 - Analytics Service
 *
 * 负责监控已发布内容的互动数据、生成运营报告、分析评论情感、
 * 提供优化建议和检测异常波动。
 *
 * 功能：
 * - trackEngagement: 监控内容互动数据
 * - generateSummary: 生成运营报告
 * - analyzeComments: 分析评论情感
 * - getOptimizationSuggestions: 生成优化建议
 * - detectAnomalies: 检测异常波动
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type {
  AnalyticsService,
  EngagementData,
  TimeRange,
  OperationSummary,
  CommentAnalysis,
  OptimizationSuggestion,
  AnomalyAlert,
} from '../types/index.js';

// ============================================================
// 内部存储
// ============================================================

/**
 * 内存中的互动数据存储
 * key: noteId, value: EngagementData 数组（时间序列）
 */
const engagementStore = new Map<string, EngagementData[]>();

/**
 * 内存中的评论存储（用于评论分析）
 * key: noteId, value: 评论文本数组
 */
const commentStore = new Map<string, string[]>();

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// 数据管理辅助函数（用于测试）
// ============================================================

/**
 * 添加互动数据记录
 */
export function addEngagementRecord(data: EngagementData): void {
  const records = engagementStore.get(data.noteId) ?? [];
  records.push(data);
  engagementStore.set(data.noteId, records);
}

/**
 * 添加评论
 */
export function addComments(noteId: string, comments: string[]): void {
  const existing = commentStore.get(noteId) ?? [];
  existing.push(...comments);
  commentStore.set(noteId, existing);
}

/**
 * 获取互动数据存储（用于测试）
 */
export function getEngagementStore(): Map<string, EngagementData[]> {
  return engagementStore;
}

/**
 * 清空所有存储（用于测试）
 */
export function clearAnalyticsStore(): void {
  engagementStore.clear();
  commentStore.clear();
}

// ============================================================
// 情感分析辅助函数
// ============================================================

/** 正面关键词 */
const POSITIVE_KEYWORDS = [
  '好', '棒', '赞', '喜欢', '推荐', '优秀', '不错', '完美', '感谢',
  '太好了', '很棒', '超赞', '爱了', '种草', '必买', '好用', '满意',
  'good', 'great', 'love', 'nice', 'amazing', 'excellent', 'wonderful',
];

/** 负面关键词 */
const NEGATIVE_KEYWORDS = [
  '差', '烂', '坑', '不好', '失望', '难用', '垃圾', '退货', '差评',
  '不推荐', '踩雷', '后悔', '难吃', '太差', '不值', '骗人',
  'bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'horrible',
];

/**
 * 分析单条评论的情感
 * 返回 'positive' | 'neutral' | 'negative'
 */
function analyzeSentiment(comment: string): 'positive' | 'neutral' | 'negative' {
  const lowerComment = comment.toLowerCase();

  let positiveScore = 0;
  let negativeScore = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerComment.includes(keyword)) {
      positiveScore++;
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerComment.includes(keyword)) {
      negativeScore++;
    }
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

/**
 * 提取评论中的关键词
 */
function extractKeywords(comments: string[]): string[] {
  const wordCount = new Map<string, number>();

  for (const comment of comments) {
    // 简单分词：按空格和标点分割
    const words = comment.split(/[\s,，。！？!?.、；;：:]+/).filter((w) => w.length >= 2);
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
    }
  }

  // 按频率排序，取前 10 个
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// ============================================================
// 核心功能实现
// ============================================================

/**
 * 监控内容互动数据
 *
 * 返回指定笔记的最新互动数据。如果没有数据，返回初始化的零值数据。
 * 所有数值字段（views, likes, comments, favorites, shares）为非负整数。
 *
 * Requirements: 6.1
 */
export async function trackEngagement(noteId: string): Promise<EngagementData> {
  const records = engagementStore.get(noteId);

  if (!records || records.length === 0) {
    // 返回初始化的零值数据
    const initialData: EngagementData = {
      noteId,
      views: 0,
      likes: 0,
      comments: 0,
      favorites: 0,
      shares: 0,
      updatedAt: new Date(),
    };
    return initialData;
  }

  // 返回最新的记录
  const latest = records[records.length - 1];
  return {
    ...latest,
    noteId,
    // 确保所有值为非负整数
    views: Math.max(0, Math.floor(latest.views)),
    likes: Math.max(0, Math.floor(latest.likes)),
    comments: Math.max(0, Math.floor(latest.comments)),
    favorites: Math.max(0, Math.floor(latest.favorites)),
    shares: Math.max(0, Math.floor(latest.shares)),
    updatedAt: latest.updatedAt,
  };
}

/**
 * 生成运营报告
 *
 * 聚合指定时间范围内的所有互动数据，生成运营摘要。
 * 各指标总和等于该时间范围内所有记录的逐条累加值（Property 19）。
 *
 * Requirements: 6.2
 */
export async function generateSummary(timeRange: TimeRange): Promise<OperationSummary> {
  const { start, end } = timeRange;

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalFavorites = 0;
  let totalShares = 0;
  const noteIds = new Set<string>();
  const noteEngagement = new Map<string, number>();

  // 遍历所有存储的互动数据
  for (const [noteId, records] of engagementStore.entries()) {
    for (const record of records) {
      const recordTime = record.updatedAt.getTime();
      if (recordTime >= start.getTime() && recordTime <= end.getTime()) {
        noteIds.add(noteId);
        totalViews += record.views;
        totalLikes += record.likes;
        totalComments += record.comments;
        totalFavorites += record.favorites;
        totalShares += record.shares;

        // 累计每个笔记的总互动量（用于排名）
        const totalEngagement = record.views + record.likes + record.comments + record.favorites + record.shares;
        noteEngagement.set(noteId, (noteEngagement.get(noteId) ?? 0) + totalEngagement);
      }
    }
  }

  // 按总互动量排序，取前 5 个表现最好的笔记
  const topPerformingNotes = Array.from(noteEngagement.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([noteId]) => noteId);

  // 生成洞察
  const insights: string[] = [];
  if (noteIds.size > 0) {
    const avgViews = totalViews / noteIds.size;
    const avgLikes = totalLikes / noteIds.size;
    insights.push(`时间段内共有 ${noteIds.size} 篇笔记产生互动数据`);
    insights.push(`平均浏览量: ${Math.round(avgViews)}，平均点赞数: ${Math.round(avgLikes)}`);

    if (totalLikes > 0 && totalViews > 0) {
      const likeRate = ((totalLikes / totalViews) * 100).toFixed(1);
      insights.push(`整体点赞率: ${likeRate}%`);
    }
  } else {
    insights.push('该时间段内暂无互动数据');
  }

  return {
    timeRange,
    totalNotes: noteIds.size,
    totalViews,
    totalLikes,
    totalComments,
    totalFavorites,
    totalShares,
    topPerformingNotes,
    insights,
  };
}

/**
 * 分析评论情感
 *
 * 分析指定笔记的评论情感分布。
 * sentimentDistribution 中 positive + neutral + negative = 1.0（±0.01）（Property 20）。
 *
 * Requirements: 6.3
 */
export async function analyzeComments(noteId: string): Promise<CommentAnalysis> {
  const comments = commentStore.get(noteId) ?? [];
  const totalComments = comments.length;

  if (totalComments === 0) {
    return {
      noteId,
      totalComments: 0,
      sentimentDistribution: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      topKeywords: [],
      summary: '暂无评论数据',
    };
  }

  // 分析每条评论的情感
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;

  for (const comment of comments) {
    const sentiment = analyzeSentiment(comment);
    if (sentiment === 'positive') positiveCount++;
    else if (sentiment === 'negative') negativeCount++;
    else neutralCount++;
  }

  // 计算分布比例，确保总和为 1.0
  const positive = positiveCount / totalComments;
  const negative = negativeCount / totalComments;
  const neutral = 1.0 - positive - negative;

  // 提取关键词
  const topKeywords = extractKeywords(comments);

  // 生成摘要
  let summary: string;
  if (positive > 0.6) {
    summary = `评论整体偏正面，${Math.round(positive * 100)}% 的评论表达了积极态度`;
  } else if (negative > 0.4) {
    summary = `评论中有较多负面反馈，${Math.round(negative * 100)}% 的评论表达了不满`;
  } else {
    summary = `评论情感较为均衡，正面 ${Math.round(positive * 100)}%，中性 ${Math.round(neutral * 100)}%，负面 ${Math.round(negative * 100)}%`;
  }

  return {
    noteId,
    totalComments,
    sentimentDistribution: {
      positive,
      neutral,
      negative,
    },
    topKeywords,
    summary,
  };
}

/**
 * 生成优化建议
 *
 * 基于历史运营数据生成优化建议，包括最佳发布时间、高互动内容类型等。
 *
 * Requirements: 6.4
 */
export async function getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
  const suggestions: OptimizationSuggestion[] = [];

  // 收集所有互动数据
  const allRecords: EngagementData[] = [];
  for (const records of engagementStore.values()) {
    allRecords.push(...records);
  }

  if (allRecords.length === 0) {
    suggestions.push({
      type: 'content',
      title: '开始发布内容',
      description: '目前暂无运营数据，建议开始发布内容以积累数据',
      confidence: 1.0,
      basedOn: '无历史数据',
    });
    return suggestions;
  }

  // 分析发布时间模式
  const hourEngagement = new Map<number, { total: number; count: number }>();
  for (const record of allRecords) {
    const hour = record.updatedAt.getHours();
    const existing = hourEngagement.get(hour) ?? { total: 0, count: 0 };
    existing.total += record.views + record.likes + record.comments + record.favorites;
    existing.count++;
    hourEngagement.set(hour, existing);
  }

  // 找出最佳发布时间
  let bestHour = 0;
  let bestAvg = 0;
  for (const [hour, data] of hourEngagement.entries()) {
    const avg = data.total / data.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = hour;
    }
  }

  if (hourEngagement.size > 0) {
    suggestions.push({
      type: 'timing',
      title: '最佳发布时间',
      description: `数据显示 ${bestHour}:00 左右发布的内容互动量最高，建议在此时间段发布`,
      confidence: Math.min(0.9, allRecords.length / 50),
      basedOn: `基于 ${allRecords.length} 条互动数据分析`,
    });
  }

  // 分析互动率
  const totalViews = allRecords.reduce((sum, r) => sum + r.views, 0);
  const totalLikes = allRecords.reduce((sum, r) => sum + r.likes, 0);
  const totalComments = allRecords.reduce((sum, r) => sum + r.comments, 0);

  if (totalViews > 0) {
    const likeRate = totalLikes / totalViews;
    const commentRate = totalComments / totalViews;

    if (likeRate < 0.03) {
      suggestions.push({
        type: 'content',
        title: '提升点赞率',
        description: '当前点赞率偏低，建议优化内容质量，增加互动引导语',
        confidence: 0.7,
        basedOn: `当前点赞率 ${(likeRate * 100).toFixed(1)}%`,
      });
    }

    if (commentRate < 0.01) {
      suggestions.push({
        type: 'content',
        title: '提升评论互动',
        description: '评论率偏低，建议在内容末尾增加互动话题引导用户评论',
        confidence: 0.65,
        basedOn: `当前评论率 ${(commentRate * 100).toFixed(1)}%`,
      });
    }
  }

  // 分析发布频率
  const noteIds = new Set(allRecords.map((r) => r.noteId));
  if (noteIds.size < 3) {
    suggestions.push({
      type: 'frequency',
      title: '增加发布频率',
      description: '当前内容数量较少，建议增加发布频率以提升账号活跃度',
      confidence: 0.8,
      basedOn: `当前仅有 ${noteIds.size} 篇内容`,
    });
  }

  // 标签优化建议
  suggestions.push({
    type: 'tags',
    title: '优化标签策略',
    description: '建议结合热门话题标签和精准长尾标签，提升内容曝光率',
    confidence: 0.6,
    basedOn: `基于 ${noteIds.size} 篇内容的整体表现`,
  });

  return suggestions;
}

/**
 * 检测异常波动
 *
 * 检测指定笔记的互动数据是否存在异常波动。
 * 当某个指标的变化幅度超过历史均值的 2 倍标准差时，返回非空的 AnomalyAlert 列表（Property 21）。
 *
 * Requirements: 6.5
 */
export async function detectAnomalies(noteId: string): Promise<AnomalyAlert[]> {
  const records = engagementStore.get(noteId);

  if (!records || records.length < 2) {
    return [];
  }

  const alerts: AnomalyAlert[] = [];
  const metrics: Array<'views' | 'likes' | 'comments' | 'favorites' | 'shares'> = [
    'views', 'likes', 'comments', 'favorites', 'shares',
  ];

  for (const metric of metrics) {
    const values = records.map((r) => r[metric]);

    // 计算均值
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    // 计算标准差
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 检查最新值是否超过 2 倍标准差
    const latestValue = values[values.length - 1];
    const deviation = stdDev > 0 ? Math.abs(latestValue - mean) / stdDev : 0;

    if (deviation > 2) {
      const possibleReasons: string[] = [];
      if (latestValue > mean) {
        possibleReasons.push('内容可能被平台推荐');
        possibleReasons.push('可能触发了热门话题');
        possibleReasons.push('可能被大V转发');
      } else {
        possibleReasons.push('内容可能被限流');
        possibleReasons.push('可能触发了平台审核');
        possibleReasons.push('发布时间可能不佳');
      }

      alerts.push({
        noteId,
        metric,
        currentValue: latestValue,
        expectedValue: Math.round(mean),
        deviation: Math.round(deviation * 100) / 100,
        detectedAt: new Date(),
        possibleReasons,
      });
    }
  }

  return alerts;
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建数据分析服务实例
 */
export function createAnalyticsService(): AnalyticsService {
  return {
    trackEngagement,
    generateSummary,
    analyzeComments,
    getOptimizationSuggestions,
    detectAnomalies,
  };
}
