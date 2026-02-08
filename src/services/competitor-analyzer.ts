/**
 * 竞品分析服务 - Competitor Analyzer
 *
 * 负责竞品数据采集、分析报告生成和热点话题跟踪。
 * 当前实现为模拟数据（无实际爬取），后续可替换为真实平台数据采集。
 *
 * 功能：
 * - collectData: 采集竞品的内容数据、互动数据和发布频率
 * - generateReport: 基于竞品数据生成结构化分析报告
 * - getTrendingTopics: 获取目标平台热点话题列表（按热度降序排列）
 * - detectTrendingChanges: 比较两个热点快照，检测显著变化并触发通知
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import type {
  CompetitorAnalyzer,
  CompetitorTarget,
  CompetitorData,
  CompetitorReport,
  TrendingTopic,
  TrendAnalysis,
  EngagementSummary,
  ContentDataItem,
  PublishFrequency,
  Platform,
} from '../types/index.js';

// ============================================================
// 通知回调类型
// ============================================================

/**
 * 热点变化通知的回调函数类型
 */
export type TrendingChangeNotification = {
  newTopics: TrendingTopic[];
  removedTopics: TrendingTopic[];
  changeRatio: number;
  message: string;
};

// ============================================================
// 模拟数据生成辅助函数
// ============================================================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 根据竞品目标生成模拟内容数据
 */
function generateMockContentData(target: CompetitorTarget): ContentDataItem[] {
  const baseTopics = getTopicsForTarget(target);
  const contentTypes = ['图文笔记', '视频笔记', '合集', '教程', '测评'];

  return baseTopics.map((topic, index) => ({
    title: `${topic} - ${target.value}的内容`,
    type: contentTypes[index % contentTypes.length],
    publishedAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000),
    engagement: {
      likes: Math.floor(100 + Math.random() * 9900),
      comments: Math.floor(10 + Math.random() * 990),
      favorites: Math.floor(50 + Math.random() * 4950),
      shares: Math.floor(5 + Math.random() * 495),
    },
    tags: [`#${topic}`, `#${target.platform}热门`, `#${target.value}`],
  }));
}

/**
 * 根据竞品目标获取相关话题
 */
function getTopicsForTarget(target: CompetitorTarget): string[] {
  if (target.type === 'keyword') {
    return [
      `${target.value}入门指南`,
      `${target.value}进阶技巧`,
      `${target.value}最新趋势`,
      `${target.value}实战案例`,
      `${target.value}常见误区`,
    ];
  }
  return [
    `账号${target.value}的爆款内容`,
    `${target.value}的运营策略`,
    `${target.value}的粉丝互动`,
    `${target.value}的内容风格`,
    `${target.value}的发布节奏`,
  ];
}

/**
 * 根据内容数据计算互动数据摘要
 */
function calculateEngagementSummary(contentData: ContentDataItem[]): EngagementSummary {
  if (contentData.length === 0) {
    return {
      averageLikes: 0,
      averageComments: 0,
      averageFavorites: 0,
      averageShares: 0,
      engagementRate: 0,
    };
  }

  const totalLikes = contentData.reduce((sum, item) => sum + item.engagement.likes, 0);
  const totalComments = contentData.reduce((sum, item) => sum + item.engagement.comments, 0);
  const totalFavorites = contentData.reduce((sum, item) => sum + item.engagement.favorites, 0);
  const totalShares = contentData.reduce((sum, item) => sum + item.engagement.shares, 0);
  const count = contentData.length;

  const avgLikes = totalLikes / count;
  const avgComments = totalComments / count;
  const avgFavorites = totalFavorites / count;
  const avgShares = totalShares / count;

  // 互动率 = (总互动数 / 内容数) / 基准值（假设平均曝光 10000）
  const totalEngagement = totalLikes + totalComments + totalFavorites + totalShares;
  const engagementRate = (totalEngagement / count) / 10000;

  return {
    averageLikes: Math.round(avgLikes),
    averageComments: Math.round(avgComments),
    averageFavorites: Math.round(avgFavorites),
    averageShares: Math.round(avgShares),
    engagementRate: Math.round(engagementRate * 10000) / 10000,
  };
}

/**
 * 生成模拟发布频率数据
 */
function generateMockPublishFrequency(): PublishFrequency {
  return {
    postsPerWeek: Math.floor(3 + Math.random() * 10),
    peakDays: ['周一', '周三', '周五'],
    peakHours: [10, 14, 20],
  };
}

// ============================================================
// 报告生成辅助函数
// ============================================================

/**
 * 从竞品数据中分析内容趋势
 */
function analyzeContentTrends(data: CompetitorData): TrendAnalysis[] {
  const topicMap = new Map<string, ContentDataItem[]>();

  // 按内容类型分组
  for (const item of data.contentData) {
    const existing = topicMap.get(item.type) ?? [];
    existing.push(item);
    topicMap.set(item.type, existing);
  }

  const trends: TrendAnalysis[] = [];

  for (const [type, items] of topicMap) {
    const engagementValues = items.map(
      (item) => item.engagement.likes + item.engagement.comments + item.engagement.favorites
    );

    // 判断趋势方向
    let trend: 'rising' | 'stable' | 'declining' = 'stable';
    if (engagementValues.length >= 2) {
      const firstHalf = engagementValues.slice(0, Math.ceil(engagementValues.length / 2));
      const secondHalf = engagementValues.slice(Math.ceil(engagementValues.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) {
        trend = 'rising';
      } else if (secondAvg < firstAvg * 0.9) {
        trend = 'declining';
      }
    }

    trends.push({
      topic: type,
      trend,
      dataPoints: engagementValues,
      period: '最近30天',
    });
  }

  return trends;
}

/**
 * 基于竞品数据生成策略建议
 */
function generateStrategySuggestions(data: CompetitorData): string[] {
  const suggestions: string[] = [];
  const engagement = data.engagementData;

  // 基于互动率的建议
  if (engagement.engagementRate > 0.05) {
    suggestions.push(`竞品互动率较高(${(engagement.engagementRate * 100).toFixed(1)}%)，建议加强内容质量和互动引导`);
  } else {
    suggestions.push(`竞品互动率一般(${(engagement.engagementRate * 100).toFixed(1)}%)，存在超越机会，建议差异化内容策略`);
  }

  // 基于发布频率的建议
  if (data.publishFrequency.postsPerWeek > 7) {
    suggestions.push(`竞品发布频率较高(每周${data.publishFrequency.postsPerWeek}篇)，建议保持稳定更新节奏`);
  } else {
    suggestions.push(`竞品发布频率适中(每周${data.publishFrequency.postsPerWeek}篇)，建议适当提高发布频率以获取更多曝光`);
  }

  // 基于内容类型的建议
  if (data.contentData.length > 0) {
    const types = [...new Set(data.contentData.map((item) => item.type))];
    suggestions.push(`竞品主要内容类型包括：${types.join('、')}，建议关注高互动类型并创新内容形式`);
  }

  // 基于发布时间的建议
  const peakHours = data.publishFrequency.peakHours;
  if (peakHours.length > 0) {
    suggestions.push(`竞品高峰发布时段为${peakHours.map((h) => `${h}:00`).join('、')}，建议在这些时段发布以获取更多流量`);
  }

  return suggestions;
}

// ============================================================
// 热点话题生成
// ============================================================

/**
 * 各平台的模拟热点话题库
 */
const PLATFORM_TRENDING_TOPICS: Record<Platform, { title: string; category: string; tags: string[] }[]> = {
  xiaohongshu: [
    { title: '秋冬护肤必备好物', category: '美妆', tags: ['#护肤', '#秋冬好物', '#美妆推荐'] },
    { title: '极简穿搭公式', category: '穿搭', tags: ['#穿搭', '#极简风', '#日常穿搭'] },
    { title: '一人食晚餐食谱', category: '美食', tags: ['#美食', '#一人食', '#晚餐'] },
    { title: '小户型收纳技巧', category: '家居', tags: ['#家居', '#收纳', '#小户型'] },
    { title: '周末露营攻略', category: '旅行', tags: ['#露营', '#周末', '#户外'] },
    { title: '新手化妆教程', category: '美妆', tags: ['#化妆', '#新手', '#教程'] },
    { title: '健身打卡30天', category: '健身', tags: ['#健身', '#打卡', '#运动'] },
    { title: '宠物日常vlog', category: '宠物', tags: ['#宠物', '#日常', '#萌宠'] },
    { title: '数码好物推荐', category: '数码', tags: ['#数码', '#好物', '#科技'] },
    { title: '职场穿搭指南', category: '穿搭', tags: ['#职场', '#穿搭', '#通勤'] },
    { title: '母婴好物分享', category: '母婴', tags: ['#母婴', '#好物', '#育儿'] },
    { title: '摄影构图技巧', category: '摄影', tags: ['#摄影', '#构图', '#拍照'] },
  ],
  douyin: [
    { title: '热门舞蹈挑战', category: '娱乐', tags: ['#舞蹈', '#挑战', '#热门'] },
    { title: '美食制作教程', category: '美食', tags: ['#美食', '#教程', '#做饭'] },
    { title: '搞笑日常', category: '娱乐', tags: ['#搞笑', '#日常', '#段子'] },
    { title: '旅行打卡', category: '旅行', tags: ['#旅行', '#打卡', '#风景'] },
    { title: '健身教程', category: '健身', tags: ['#健身', '#教程', '#运动'] },
    { title: '宠物搞笑瞬间', category: '宠物', tags: ['#宠物', '#搞笑', '#萌宠'] },
    { title: '科技产品测评', category: '数码', tags: ['#科技', '#测评', '#数码'] },
    { title: '穿搭变装', category: '穿搭', tags: ['#穿搭', '#变装', '#时尚'] },
    { title: '亲子互动', category: '母婴', tags: ['#亲子', '#互动', '#育儿'] },
    { title: '学习打卡', category: '教育', tags: ['#学习', '#打卡', '#知识'] },
    { title: '游戏精彩操作', category: '游戏', tags: ['#游戏', '#精彩', '#操作'] },
    { title: '汽车评测', category: '汽车', tags: ['#汽车', '#评测', '#驾驶'] },
  ],
  weibo: [
    { title: '热搜话题讨论', category: '社会', tags: ['#热搜', '#话题', '#讨论'] },
    { title: '明星动态', category: '娱乐', tags: ['#明星', '#动态', '#娱乐'] },
    { title: '科技新闻', category: '科技', tags: ['#科技', '#新闻', '#互联网'] },
    { title: '体育赛事', category: '体育', tags: ['#体育', '#赛事', '#比赛'] },
    { title: '美食探店', category: '美食', tags: ['#美食', '#探店', '#推荐'] },
    { title: '旅游攻略', category: '旅行', tags: ['#旅游', '#攻略', '#出行'] },
    { title: '时尚穿搭', category: '穿搭', tags: ['#时尚', '#穿搭', '#潮流'] },
    { title: '健康养生', category: '健康', tags: ['#健康', '#养生', '#生活'] },
    { title: '教育资讯', category: '教育', tags: ['#教育', '#资讯', '#学习'] },
    { title: '游戏资讯', category: '游戏', tags: ['#游戏', '#资讯', '#新游'] },
    { title: '汽车资讯', category: '汽车', tags: ['#汽车', '#资讯', '#新车'] },
    { title: '理财知识', category: '理财', tags: ['#理财', '#知识', '#投资'] },
  ],
  wechat: [
    { title: '深度行业分析', category: '职场', tags: ['#行业', '#分析', '#深度'] },
    { title: '职场成长指南', category: '职场', tags: ['#职场', '#成长', '#指南'] },
    { title: '育儿经验分享', category: '母婴', tags: ['#育儿', '#经验', '#分享'] },
    { title: '健康生活方式', category: '健康', tags: ['#健康', '#生活', '#方式'] },
    { title: '理财入门知识', category: '理财', tags: ['#理财', '#入门', '#知识'] },
    { title: '科技前沿动态', category: '科技', tags: ['#科技', '#前沿', '#动态'] },
    { title: '美食菜谱大全', category: '美食', tags: ['#美食', '#菜谱', '#做饭'] },
    { title: '旅行见闻', category: '旅行', tags: ['#旅行', '#见闻', '#游记'] },
    { title: '教育方法论', category: '教育', tags: ['#教育', '#方法', '#学习'] },
    { title: '家居装修指南', category: '家居', tags: ['#家居', '#装修', '#设计'] },
    { title: '宠物养护知识', category: '宠物', tags: ['#宠物', '#养护', '#知识'] },
    { title: '摄影后期技巧', category: '摄影', tags: ['#摄影', '#后期', '#修图'] },
  ],
};

/**
 * 生成平台热点话题列表
 */
function generateTrendingTopics(platform: Platform, category?: string): TrendingTopic[] {
  const topicPool = PLATFORM_TRENDING_TOPICS[platform];

  // 按 category 过滤（如果指定）
  const filtered = category
    ? topicPool.filter((t) => t.category === category)
    : topicPool;

  // 为每个话题生成热度值并构建 TrendingTopic
  const topics: TrendingTopic[] = filtered.map((item, index) => ({
    id: generateId(),
    title: item.title,
    platform,
    category: item.category,
    hotScore: Math.round((1000 - index * 50 + Math.random() * 100) * 100) / 100,
    relatedTags: item.tags,
    discoveredAt: new Date(),
  }));

  // 按 hotScore 降序排序
  topics.sort((a, b) => b.hotScore - a.hotScore);

  return topics;
}

// ============================================================
// 热点变化检测
// ============================================================

/**
 * 检测热点变化
 *
 * 比较两个时间点的热点数据快照，当 Top 10 中有超过 50% 的新话题时，
 * 触发通知事件。
 *
 * @param previousSnapshot - 之前的热点快照
 * @param currentSnapshot - 当前的热点快照
 * @returns 如果变化显著，返回通知信息；否则返回 null
 *
 * Requirements: 2.5
 */
export function detectTrendingChanges(
  previousSnapshot: TrendingTopic[],
  currentSnapshot: TrendingTopic[]
): TrendingChangeNotification | null {
  // 取 Top 10
  const previousTop10 = previousSnapshot
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 10);
  const currentTop10 = currentSnapshot
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 10);

  // 获取之前 Top 10 的标题集合
  const previousTitles = new Set(previousTop10.map((t) => t.title));
  const currentTitles = new Set(currentTop10.map((t) => t.title));

  // 找出新话题和移除的话题
  const newTopics = currentTop10.filter((t) => !previousTitles.has(t.title));
  const removedTopics = previousTop10.filter((t) => !currentTitles.has(t.title));

  // 计算变化比例：基于 Top 10 中新话题的占比
  const top10Size = Math.max(previousTop10.length, currentTop10.length, 1);
  const changeRatio = newTopics.length / top10Size;

  // 当超过 50% 的 Top 10 话题是新的时，触发通知
  if (changeRatio > 0.5) {
    return {
      newTopics,
      removedTopics,
      changeRatio,
      message: `热点变化显著！Top 10 中有 ${newTopics.length} 个新话题（变化率 ${(changeRatio * 100).toFixed(1)}%）。建议关注：${newTopics.map((t) => t.title).join('、')}`,
    };
  }

  return null;
}

// ============================================================
// 竞品分析服务实现
// ============================================================

/**
 * 创建竞品分析服务实例
 */
export function createCompetitorAnalyzer(): CompetitorAnalyzer {
  return {
    collectData,
    generateReport,
    getTrendingTopics: getTrendingTopicsImpl,
  };
}

/**
 * 采集竞品数据
 *
 * 根据竞品目标（账号或关键词）采集内容数据、互动数据和发布频率。
 * 当前实现为模拟数据生成，后续可替换为真实平台数据采集。
 *
 * 返回的 CompetitorData 包含：
 * - contentData: 非空的内容数据列表
 * - engagementData: 互动数据摘要（各字段非空）
 * - publishFrequency: 发布频率信息（各字段非空）
 *
 * Requirements: 2.1
 */
export async function collectData(target: CompetitorTarget): Promise<CompetitorData> {
  // 生成模拟内容数据
  const contentData = generateMockContentData(target);

  // 计算互动数据摘要
  const engagementData = calculateEngagementSummary(contentData);

  // 生成发布频率数据
  const publishFrequency = generateMockPublishFrequency();

  return {
    target,
    contentData,
    engagementData,
    publishFrequency,
    collectedAt: new Date(),
  };
}

/**
 * 生成竞品分析报告
 *
 * 基于采集的竞品数据生成结构化报告，包含：
 * - contentTrends: 内容趋势分析（非空）
 * - engagementMetrics: 互动数据摘要（非空）
 * - strategySuggestions: 策略建议（非空）
 * - publishReady: true（报告可直接使用）
 *
 * Requirements: 2.2, 2.4
 */
export async function generateReport(data: CompetitorData): Promise<CompetitorReport> {
  // 分析内容趋势
  const contentTrends = analyzeContentTrends(data);

  // 生成策略建议
  const strategySuggestions = generateStrategySuggestions(data);

  return {
    id: generateId(),
    target: data.target,
    contentTrends,
    engagementMetrics: data.engagementData,
    strategySuggestions,
    generatedAt: new Date(),
    publishReady: true,
  };
}

/**
 * 获取热点话题列表
 *
 * 返回目标平台当前的热点话题列表，按热度值（hotScore）降序排列。
 * 可选按赛道（category）过滤。
 *
 * Requirements: 2.3
 */
export async function getTrendingTopicsImpl(
  platform: Platform,
  category?: string
): Promise<TrendingTopic[]> {
  return generateTrendingTopics(platform, category);
}
