import { describe, it, expect } from 'vitest';
import {
  createCompetitorAnalyzer,
  collectData,
  generateReport,
  getTrendingTopicsImpl,
  detectTrendingChanges,
} from './competitor-analyzer.js';
import type {
  CompetitorTarget,
  CompetitorData,
  TrendingTopic,
  Platform,
} from '../types/index.js';

// ============================================================
// collectData 单元测试
// ============================================================

describe('collectData', () => {
  it('应为账号类型目标返回完整的竞品数据', async () => {
    const target: CompetitorTarget = {
      type: 'account',
      value: '美妆达人小红',
      platform: 'xiaohongshu',
    };

    const data = await collectData(target);

    expect(data.target).toEqual(target);
    expect(data.contentData).toBeDefined();
    expect(data.contentData.length).toBeGreaterThan(0);
    expect(data.engagementData).toBeDefined();
    expect(data.publishFrequency).toBeDefined();
    expect(data.collectedAt).toBeInstanceOf(Date);
  });

  it('应为关键词类型目标返回完整的竞品数据', async () => {
    const target: CompetitorTarget = {
      type: 'keyword',
      value: '护肤',
      platform: 'douyin',
    };

    const data = await collectData(target);

    expect(data.target).toEqual(target);
    expect(data.contentData.length).toBeGreaterThan(0);
    expect(data.engagementData).toBeDefined();
    expect(data.publishFrequency).toBeDefined();
  });

  it('contentData 中每个项目应包含所有必需字段', async () => {
    const target: CompetitorTarget = {
      type: 'account',
      value: '测试账号',
      platform: 'weibo',
    };

    const data = await collectData(target);

    for (const item of data.contentData) {
      expect(item.title).toBeDefined();
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.type).toBeDefined();
      expect(item.type.length).toBeGreaterThan(0);
      expect(item.publishedAt).toBeInstanceOf(Date);
      expect(item.engagement).toBeDefined();
      expect(item.engagement.likes).toBeGreaterThanOrEqual(0);
      expect(item.engagement.comments).toBeGreaterThanOrEqual(0);
      expect(item.engagement.favorites).toBeGreaterThanOrEqual(0);
      expect(item.engagement.shares).toBeGreaterThanOrEqual(0);
      expect(item.tags).toBeDefined();
      expect(item.tags.length).toBeGreaterThan(0);
    }
  });

  it('engagementData 应包含所有必需字段且非空', async () => {
    const target: CompetitorTarget = {
      type: 'keyword',
      value: '美食',
      platform: 'wechat',
    };

    const data = await collectData(target);
    const engagement = data.engagementData;

    expect(typeof engagement.averageLikes).toBe('number');
    expect(typeof engagement.averageComments).toBe('number');
    expect(typeof engagement.averageFavorites).toBe('number');
    expect(typeof engagement.averageShares).toBe('number');
    expect(typeof engagement.engagementRate).toBe('number');
    expect(engagement.averageLikes).toBeGreaterThan(0);
    expect(engagement.averageComments).toBeGreaterThan(0);
    expect(engagement.averageFavorites).toBeGreaterThan(0);
    expect(engagement.averageShares).toBeGreaterThan(0);
    expect(engagement.engagementRate).toBeGreaterThan(0);
  });

  it('publishFrequency 应包含所有必需字段且非空', async () => {
    const target: CompetitorTarget = {
      type: 'account',
      value: '旅行博主',
      platform: 'xiaohongshu',
    };

    const data = await collectData(target);
    const freq = data.publishFrequency;

    expect(typeof freq.postsPerWeek).toBe('number');
    expect(freq.postsPerWeek).toBeGreaterThan(0);
    expect(freq.peakDays).toBeDefined();
    expect(freq.peakDays.length).toBeGreaterThan(0);
    expect(freq.peakHours).toBeDefined();
    expect(freq.peakHours.length).toBeGreaterThan(0);
  });

  it('应支持所有平台', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const target: CompetitorTarget = {
        type: 'keyword',
        value: '测试',
        platform,
      };

      const data = await collectData(target);
      expect(data.target.platform).toBe(platform);
      expect(data.contentData.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// generateReport 单元测试
// ============================================================

describe('generateReport', () => {
  async function createSampleData(): Promise<CompetitorData> {
    const target: CompetitorTarget = {
      type: 'account',
      value: '美妆达人',
      platform: 'xiaohongshu',
    };
    return collectData(target);
  }

  it('应生成包含所有必需字段的报告', async () => {
    const data = await createSampleData();
    const report = await generateReport(data);

    expect(report.id).toBeDefined();
    expect(report.id.length).toBeGreaterThan(0);
    expect(report.target).toEqual(data.target);
    expect(report.contentTrends).toBeDefined();
    expect(report.engagementMetrics).toBeDefined();
    expect(report.strategySuggestions).toBeDefined();
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.publishReady).toBe(true);
  });

  it('contentTrends 应为非空数组', async () => {
    const data = await createSampleData();
    const report = await generateReport(data);

    expect(Array.isArray(report.contentTrends)).toBe(true);
    expect(report.contentTrends.length).toBeGreaterThan(0);
  });

  it('每个 contentTrend 应包含完整字段', async () => {
    const data = await createSampleData();
    const report = await generateReport(data);

    for (const trend of report.contentTrends) {
      expect(trend.topic).toBeDefined();
      expect(trend.topic.length).toBeGreaterThan(0);
      expect(['rising', 'stable', 'declining']).toContain(trend.trend);
      expect(trend.dataPoints).toBeDefined();
      expect(trend.dataPoints.length).toBeGreaterThan(0);
      expect(trend.period).toBeDefined();
      expect(trend.period.length).toBeGreaterThan(0);
    }
  });

  it('engagementMetrics 应与输入数据一致', async () => {
    const data = await createSampleData();
    const report = await generateReport(data);

    expect(report.engagementMetrics).toEqual(data.engagementData);
  });

  it('strategySuggestions 应为非空字符串数组', async () => {
    const data = await createSampleData();
    const report = await generateReport(data);

    expect(Array.isArray(report.strategySuggestions)).toBe(true);
    expect(report.strategySuggestions.length).toBeGreaterThan(0);

    for (const suggestion of report.strategySuggestions) {
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    }
  });

  it('publishReady 应始终为 true', async () => {
    const data = await createSampleData();
    const report = await generateReport(data);

    expect(report.publishReady).toBe(true);
  });

  it('每次生成的报告应有唯一 ID', async () => {
    const data = await createSampleData();
    const report1 = await generateReport(data);
    const report2 = await generateReport(data);

    expect(report1.id).not.toBe(report2.id);
  });
});

// ============================================================
// getTrendingTopics 单元测试
// ============================================================

describe('getTrendingTopics', () => {
  it('应返回按 hotScore 降序排列的热点列表', async () => {
    const topics = await getTrendingTopicsImpl('xiaohongshu');

    expect(topics.length).toBeGreaterThan(0);

    for (let i = 0; i < topics.length - 1; i++) {
      expect(topics[i].hotScore).toBeGreaterThanOrEqual(topics[i + 1].hotScore);
    }
  });

  it('每个热点话题应包含所有必需字段', async () => {
    const topics = await getTrendingTopicsImpl('douyin');

    for (const topic of topics) {
      expect(topic.id).toBeDefined();
      expect(topic.id.length).toBeGreaterThan(0);
      expect(topic.title).toBeDefined();
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.platform).toBe('douyin');
      expect(typeof topic.hotScore).toBe('number');
      expect(topic.hotScore).toBeGreaterThan(0);
      expect(topic.relatedTags).toBeDefined();
      expect(topic.relatedTags.length).toBeGreaterThan(0);
      expect(topic.discoveredAt).toBeInstanceOf(Date);
    }
  });

  it('应支持按 category 过滤', async () => {
    const topics = await getTrendingTopicsImpl('xiaohongshu', '美妆');

    expect(topics.length).toBeGreaterThan(0);

    for (const topic of topics) {
      expect(topic.category).toBe('美妆');
    }
  });

  it('不存在的 category 应返回空数组', async () => {
    const topics = await getTrendingTopicsImpl('xiaohongshu', '不存在的赛道');

    expect(topics).toEqual([]);
  });

  it('应支持所有平台', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const topics = await getTrendingTopicsImpl(platform);
      expect(topics.length).toBeGreaterThan(0);
      for (const topic of topics) {
        expect(topic.platform).toBe(platform);
      }
    }
  });

  it('不指定 category 时应返回所有类别的热点', async () => {
    const topics = await getTrendingTopicsImpl('xiaohongshu');
    const categories = new Set(topics.map((t) => t.category));

    expect(categories.size).toBeGreaterThan(1);
  });
});

// ============================================================
// detectTrendingChanges 单元测试
// ============================================================

describe('detectTrendingChanges', () => {
  function createTopic(title: string, hotScore: number): TrendingTopic {
    return {
      id: `topic-${title}`,
      title,
      platform: 'xiaohongshu',
      category: '测试',
      hotScore,
      relatedTags: [`#${title}`],
      discoveredAt: new Date(),
    };
  }

  it('当 Top 10 中超过 50% 是新话题时应触发通知', () => {
    const previous = [
      createTopic('话题A', 1000),
      createTopic('话题B', 900),
      createTopic('话题C', 800),
      createTopic('话题D', 700),
      createTopic('话题E', 600),
      createTopic('话题F', 500),
      createTopic('话题G', 400),
      createTopic('话题H', 300),
      createTopic('话题I', 200),
      createTopic('话题J', 100),
    ];

    const current = [
      createTopic('新话题1', 1000),
      createTopic('新话题2', 900),
      createTopic('新话题3', 800),
      createTopic('新话题4', 700),
      createTopic('新话题5', 600),
      createTopic('新话题6', 500),
      createTopic('话题A', 400),
      createTopic('话题B', 300),
      createTopic('话题C', 200),
      createTopic('话题D', 100),
    ];

    const notification = detectTrendingChanges(previous, current);

    expect(notification).not.toBeNull();
    expect(notification!.changeRatio).toBeGreaterThan(0.5);
    expect(notification!.newTopics.length).toBeGreaterThan(5);
    expect(notification!.message).toBeDefined();
    expect(notification!.message.length).toBeGreaterThan(0);
  });

  it('当 Top 10 变化不超过 50% 时不应触发通知', () => {
    const previous = [
      createTopic('话题A', 1000),
      createTopic('话题B', 900),
      createTopic('话题C', 800),
      createTopic('话题D', 700),
      createTopic('话题E', 600),
      createTopic('话题F', 500),
      createTopic('话题G', 400),
      createTopic('话题H', 300),
      createTopic('话题I', 200),
      createTopic('话题J', 100),
    ];

    const current = [
      createTopic('话题A', 1000),
      createTopic('话题B', 900),
      createTopic('话题C', 800),
      createTopic('话题D', 700),
      createTopic('话题E', 600),
      createTopic('新话题1', 500),
      createTopic('新话题2', 400),
      createTopic('新话题3', 300),
      createTopic('话题H', 200),
      createTopic('话题I', 100),
    ];

    const notification = detectTrendingChanges(previous, current);

    expect(notification).toBeNull();
  });

  it('当完全相同的快照时不应触发通知', () => {
    const snapshot = [
      createTopic('话题A', 1000),
      createTopic('话题B', 900),
      createTopic('话题C', 800),
    ];

    const notification = detectTrendingChanges([...snapshot], [...snapshot]);

    expect(notification).toBeNull();
  });

  it('当所有话题都是新的时应触发通知', () => {
    const previous = [
      createTopic('旧话题1', 1000),
      createTopic('旧话题2', 900),
      createTopic('旧话题3', 800),
      createTopic('旧话题4', 700),
      createTopic('旧话题5', 600),
      createTopic('旧话题6', 500),
      createTopic('旧话题7', 400),
      createTopic('旧话题8', 300),
      createTopic('旧话题9', 200),
      createTopic('旧话题10', 100),
    ];

    const current = [
      createTopic('新话题1', 1000),
      createTopic('新话题2', 900),
      createTopic('新话题3', 800),
      createTopic('新话题4', 700),
      createTopic('新话题5', 600),
      createTopic('新话题6', 500),
      createTopic('新话题7', 400),
      createTopic('新话题8', 300),
      createTopic('新话题9', 200),
      createTopic('新话题10', 100),
    ];

    const notification = detectTrendingChanges(previous, current);

    expect(notification).not.toBeNull();
    expect(notification!.changeRatio).toBe(1.0);
    expect(notification!.newTopics.length).toBe(10);
    expect(notification!.removedTopics.length).toBe(10);
  });

  it('通知消息应包含新话题信息', () => {
    const previous = Array.from({ length: 10 }, (_, i) =>
      createTopic(`旧话题${i + 1}`, 1000 - i * 100)
    );
    const current = Array.from({ length: 10 }, (_, i) =>
      createTopic(`新话题${i + 1}`, 1000 - i * 100)
    );

    const notification = detectTrendingChanges(previous, current);

    expect(notification).not.toBeNull();
    expect(notification!.message).toContain('热点变化显著');
    expect(notification!.message).toContain('新话题1');
  });

  it('恰好 50% 变化时不应触发通知（需要超过 50%）', () => {
    const previous = Array.from({ length: 10 }, (_, i) =>
      createTopic(`话题${i + 1}`, 1000 - i * 100)
    );

    // 替换恰好 5 个（50%）
    const current = [
      createTopic('新话题1', 1000),
      createTopic('新话题2', 900),
      createTopic('新话题3', 800),
      createTopic('新话题4', 700),
      createTopic('新话题5', 600),
      createTopic('话题1', 500),
      createTopic('话题2', 400),
      createTopic('话题3', 300),
      createTopic('话题4', 200),
      createTopic('话题5', 100),
    ];

    const notification = detectTrendingChanges(previous, current);

    expect(notification).toBeNull();
  });

  it('少于 10 个话题时也应正常工作', () => {
    const previous = [
      createTopic('话题A', 1000),
      createTopic('话题B', 900),
      createTopic('话题C', 800),
    ];

    const current = [
      createTopic('新话题1', 1000),
      createTopic('新话题2', 900),
      createTopic('新话题3', 800),
    ];

    const notification = detectTrendingChanges(previous, current);

    expect(notification).not.toBeNull();
    expect(notification!.changeRatio).toBe(1.0);
  });
});

// ============================================================
// createCompetitorAnalyzer 单元测试
// ============================================================

describe('createCompetitorAnalyzer', () => {
  it('应返回包含所有接口方法的对象', () => {
    const analyzer = createCompetitorAnalyzer();

    expect(typeof analyzer.collectData).toBe('function');
    expect(typeof analyzer.generateReport).toBe('function');
    expect(typeof analyzer.getTrendingTopics).toBe('function');
  });

  it('通过实例调用 collectData 应正常工作', async () => {
    const analyzer = createCompetitorAnalyzer();
    const target: CompetitorTarget = {
      type: 'keyword',
      value: '美妆',
      platform: 'xiaohongshu',
    };

    const data = await analyzer.collectData(target);

    expect(data.contentData.length).toBeGreaterThan(0);
    expect(data.engagementData).toBeDefined();
    expect(data.publishFrequency).toBeDefined();
  });

  it('通过实例调用 generateReport 应正常工作', async () => {
    const analyzer = createCompetitorAnalyzer();
    const target: CompetitorTarget = {
      type: 'account',
      value: '测试账号',
      platform: 'douyin',
    };

    const data = await analyzer.collectData(target);
    const report = await analyzer.generateReport(data);

    expect(report.publishReady).toBe(true);
    expect(report.contentTrends.length).toBeGreaterThan(0);
    expect(report.strategySuggestions.length).toBeGreaterThan(0);
  });

  it('通过实例调用 getTrendingTopics 应正常工作', async () => {
    const analyzer = createCompetitorAnalyzer();
    const topics = await analyzer.getTrendingTopics('weibo');

    expect(topics.length).toBeGreaterThan(0);
    // 验证排序
    for (let i = 0; i < topics.length - 1; i++) {
      expect(topics[i].hotScore).toBeGreaterThanOrEqual(topics[i + 1].hotScore);
    }
  });
});

// ============================================================
// 集成场景测试
// ============================================================

describe('竞品分析集成场景', () => {
  it('完整流程：采集数据 → 生成报告', async () => {
    const analyzer = createCompetitorAnalyzer();

    // 1. 采集竞品数据
    const target: CompetitorTarget = {
      type: 'account',
      value: '美妆博主小红',
      platform: 'xiaohongshu',
    };
    const data = await analyzer.collectData(target);

    // 2. 验证数据完整性
    expect(data.contentData.length).toBeGreaterThan(0);
    expect(data.engagementData.averageLikes).toBeGreaterThan(0);
    expect(data.publishFrequency.postsPerWeek).toBeGreaterThan(0);

    // 3. 生成报告
    const report = await analyzer.generateReport(data);

    // 4. 验证报告完整性
    expect(report.publishReady).toBe(true);
    expect(report.contentTrends.length).toBeGreaterThan(0);
    expect(report.engagementMetrics.averageLikes).toBeGreaterThan(0);
    expect(report.strategySuggestions.length).toBeGreaterThan(0);
    expect(report.target).toEqual(target);
  });

  it('热点跟踪 → 变化检测流程', async () => {
    const analyzer = createCompetitorAnalyzer();

    // 1. 获取第一次热点快照
    const snapshot1 = await analyzer.getTrendingTopics('xiaohongshu');
    expect(snapshot1.length).toBeGreaterThan(0);

    // 2. 验证排序
    for (let i = 0; i < snapshot1.length - 1; i++) {
      expect(snapshot1[i].hotScore).toBeGreaterThanOrEqual(snapshot1[i + 1].hotScore);
    }

    // 3. 模拟完全不同的快照进行变化检测
    const fakeSnapshot: TrendingTopic[] = Array.from({ length: 10 }, (_, i) => ({
      id: `fake-${i}`,
      title: `完全不同的话题${i + 1}`,
      platform: 'xiaohongshu' as Platform,
      category: '测试',
      hotScore: 1000 - i * 100,
      relatedTags: [`#测试${i}`],
      discoveredAt: new Date(),
    }));

    const notification = detectTrendingChanges(fakeSnapshot, snapshot1);
    // 由于话题完全不同，应该触发通知
    expect(notification).not.toBeNull();
  });
});
