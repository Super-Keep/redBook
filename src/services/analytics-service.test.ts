import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackEngagement,
  generateSummary,
  analyzeComments,
  getOptimizationSuggestions,
  detectAnomalies,
  createAnalyticsService,
  addEngagementRecord,
  addComments,
  clearAnalyticsStore,
  getEngagementStore,
} from './analytics-service.js';
import type {
  EngagementData,
  TimeRange,
} from '../types/index.js';

// ============================================================
// 测试前清理
// ============================================================

beforeEach(() => {
  clearAnalyticsStore();
});

// ============================================================
// 辅助函数：创建测试数据
// ============================================================

function createEngagementRecord(
  noteId: string,
  overrides?: Partial<EngagementData>
): EngagementData {
  return {
    noteId,
    views: 100,
    likes: 20,
    comments: 5,
    favorites: 10,
    shares: 3,
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================
// trackEngagement 单元测试
// ============================================================

describe('trackEngagement', () => {
  it('应返回包含所有必需字段的 EngagementData', async () => {
    const record = createEngagementRecord('note-1');
    addEngagementRecord(record);

    const result = await trackEngagement('note-1');

    expect(result.noteId).toBe('note-1');
    expect(typeof result.views).toBe('number');
    expect(typeof result.likes).toBe('number');
    expect(typeof result.comments).toBe('number');
    expect(typeof result.favorites).toBe('number');
    expect(typeof result.shares).toBe('number');
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('所有数值字段应为非负整数', async () => {
    const record = createEngagementRecord('note-1', {
      views: 150,
      likes: 30,
      comments: 8,
      favorites: 15,
      shares: 5,
    });
    addEngagementRecord(record);

    const result = await trackEngagement('note-1');

    expect(result.views).toBeGreaterThanOrEqual(0);
    expect(result.likes).toBeGreaterThanOrEqual(0);
    expect(result.comments).toBeGreaterThanOrEqual(0);
    expect(result.favorites).toBeGreaterThanOrEqual(0);
    expect(result.shares).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.views)).toBe(true);
    expect(Number.isInteger(result.likes)).toBe(true);
    expect(Number.isInteger(result.comments)).toBe(true);
    expect(Number.isInteger(result.favorites)).toBe(true);
    expect(Number.isInteger(result.shares)).toBe(true);
  });

  it('没有数据时应返回零值', async () => {
    const result = await trackEngagement('non-existent-note');

    expect(result.noteId).toBe('non-existent-note');
    expect(result.views).toBe(0);
    expect(result.likes).toBe(0);
    expect(result.comments).toBe(0);
    expect(result.favorites).toBe(0);
    expect(result.shares).toBe(0);
  });

  it('应返回最新的互动数据记录', async () => {
    const oldRecord = createEngagementRecord('note-1', {
      views: 50,
      updatedAt: new Date('2025-01-01'),
    });
    const newRecord = createEngagementRecord('note-1', {
      views: 200,
      updatedAt: new Date('2025-06-01'),
    });
    addEngagementRecord(oldRecord);
    addEngagementRecord(newRecord);

    const result = await trackEngagement('note-1');

    expect(result.views).toBe(200);
  });

  it('不同笔记的数据应互相独立', async () => {
    addEngagementRecord(createEngagementRecord('note-1', { views: 100 }));
    addEngagementRecord(createEngagementRecord('note-2', { views: 500 }));

    const result1 = await trackEngagement('note-1');
    const result2 = await trackEngagement('note-2');

    expect(result1.views).toBe(100);
    expect(result2.views).toBe(500);
  });
});

// ============================================================
// generateSummary 单元测试
// ============================================================

describe('generateSummary', () => {
  it('应正确聚合时间范围内的互动数据', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    addEngagementRecord(createEngagementRecord('note-1', {
      views: 100, likes: 20, comments: 5, favorites: 10, shares: 3,
      updatedAt: new Date('2025-06-01'),
    }));
    addEngagementRecord(createEngagementRecord('note-2', {
      views: 200, likes: 40, comments: 10, favorites: 20, shares: 6,
      updatedAt: new Date('2025-06-15'),
    }));

    const summary = await generateSummary(timeRange);

    expect(summary.totalViews).toBe(300);
    expect(summary.totalLikes).toBe(60);
    expect(summary.totalComments).toBe(15);
    expect(summary.totalFavorites).toBe(30);
    expect(summary.totalShares).toBe(9);
    expect(summary.totalNotes).toBe(2);
  });

  it('各指标总和应等于逐条累加值（Property 19）', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    const records = [
      createEngagementRecord('note-1', {
        views: 150, likes: 30, comments: 8, favorites: 15, shares: 4,
        updatedAt: new Date('2025-03-01'),
      }),
      createEngagementRecord('note-1', {
        views: 200, likes: 50, comments: 12, favorites: 25, shares: 7,
        updatedAt: new Date('2025-06-01'),
      }),
      createEngagementRecord('note-2', {
        views: 300, likes: 60, comments: 15, favorites: 30, shares: 10,
        updatedAt: new Date('2025-09-01'),
      }),
    ];

    for (const record of records) {
      addEngagementRecord(record);
    }

    const summary = await generateSummary(timeRange);

    // 手动累加验证
    const expectedViews = 150 + 200 + 300;
    const expectedLikes = 30 + 50 + 60;
    const expectedComments = 8 + 12 + 15;
    const expectedFavorites = 15 + 25 + 30;
    const expectedShares = 4 + 7 + 10;

    expect(summary.totalViews).toBe(expectedViews);
    expect(summary.totalLikes).toBe(expectedLikes);
    expect(summary.totalComments).toBe(expectedComments);
    expect(summary.totalFavorites).toBe(expectedFavorites);
    expect(summary.totalShares).toBe(expectedShares);
  });

  it('应排除时间范围外的数据', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-06-01'),
      end: new Date('2025-06-30'),
    };

    addEngagementRecord(createEngagementRecord('note-1', {
      views: 100,
      updatedAt: new Date('2025-05-15'), // 范围外
    }));
    addEngagementRecord(createEngagementRecord('note-2', {
      views: 200,
      updatedAt: new Date('2025-06-15'), // 范围内
    }));
    addEngagementRecord(createEngagementRecord('note-3', {
      views: 300,
      updatedAt: new Date('2025-07-15'), // 范围外
    }));

    const summary = await generateSummary(timeRange);

    expect(summary.totalViews).toBe(200);
    expect(summary.totalNotes).toBe(1);
  });

  it('空数据集应返回零值摘要', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    const summary = await generateSummary(timeRange);

    expect(summary.totalNotes).toBe(0);
    expect(summary.totalViews).toBe(0);
    expect(summary.totalLikes).toBe(0);
    expect(summary.totalComments).toBe(0);
    expect(summary.totalFavorites).toBe(0);
    expect(summary.totalShares).toBe(0);
    expect(summary.topPerformingNotes).toEqual([]);
  });

  it('应正确识别表现最好的笔记', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    addEngagementRecord(createEngagementRecord('note-low', {
      views: 10, likes: 1, comments: 0, favorites: 0, shares: 0,
      updatedAt: new Date('2025-06-01'),
    }));
    addEngagementRecord(createEngagementRecord('note-high', {
      views: 1000, likes: 200, comments: 50, favorites: 100, shares: 30,
      updatedAt: new Date('2025-06-01'),
    }));

    const summary = await generateSummary(timeRange);

    expect(summary.topPerformingNotes[0]).toBe('note-high');
  });

  it('应包含 timeRange 字段', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    const summary = await generateSummary(timeRange);

    expect(summary.timeRange).toEqual(timeRange);
  });

  it('应包含 insights 数组', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    const summary = await generateSummary(timeRange);

    expect(Array.isArray(summary.insights)).toBe(true);
    expect(summary.insights.length).toBeGreaterThan(0);
  });

  it('单条数据应正确聚合', async () => {
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    addEngagementRecord(createEngagementRecord('note-1', {
      views: 42, likes: 7, comments: 2, favorites: 3, shares: 1,
      updatedAt: new Date('2025-06-01'),
    }));

    const summary = await generateSummary(timeRange);

    expect(summary.totalNotes).toBe(1);
    expect(summary.totalViews).toBe(42);
    expect(summary.totalLikes).toBe(7);
    expect(summary.totalComments).toBe(2);
    expect(summary.totalFavorites).toBe(3);
    expect(summary.totalShares).toBe(1);
  });
});

// ============================================================
// analyzeComments 单元测试
// ============================================================

describe('analyzeComments', () => {
  it('情感分布总和应等于 1.0（±0.01）（Property 20）', async () => {
    addComments('note-1', [
      '这个产品太好了，强烈推荐！',
      '一般般吧，没什么特别的',
      '差评，完全不值这个价',
      '喜欢这个设计，很棒',
      '不推荐购买，质量太差了',
    ]);

    const analysis = await analyzeComments('note-1');
    const { positive, neutral, negative } = analysis.sentimentDistribution;
    const total = positive + neutral + negative;

    expect(Math.abs(total - 1.0)).toBeLessThanOrEqual(0.01);
  });

  it('应正确识别正面评论', async () => {
    addComments('note-1', [
      '太好了，强烈推荐！',
      '非常棒，喜欢',
      '超赞的产品',
    ]);

    const analysis = await analyzeComments('note-1');

    expect(analysis.sentimentDistribution.positive).toBeGreaterThan(0);
  });

  it('应正确识别负面评论', async () => {
    addComments('note-1', [
      '太差了，不推荐',
      '垃圾产品，后悔购买',
      '差评，完全不值',
    ]);

    const analysis = await analyzeComments('note-1');

    expect(analysis.sentimentDistribution.negative).toBeGreaterThan(0);
  });

  it('没有评论时应返回零值分布', async () => {
    const analysis = await analyzeComments('note-no-comments');

    expect(analysis.totalComments).toBe(0);
    expect(analysis.sentimentDistribution.positive).toBe(0);
    expect(analysis.sentimentDistribution.neutral).toBe(0);
    expect(analysis.sentimentDistribution.negative).toBe(0);
  });

  it('应返回正确的 noteId', async () => {
    addComments('note-1', ['好评']);

    const analysis = await analyzeComments('note-1');

    expect(analysis.noteId).toBe('note-1');
  });

  it('应返回正确的 totalComments 数量', async () => {
    addComments('note-1', ['评论1', '评论2', '评论3']);

    const analysis = await analyzeComments('note-1');

    expect(analysis.totalComments).toBe(3);
  });

  it('应提取关键词', async () => {
    addComments('note-1', [
      '这个护肤品真的很好用',
      '护肤品推荐给大家',
      '好用的护肤品分享',
    ]);

    const analysis = await analyzeComments('note-1');

    expect(Array.isArray(analysis.topKeywords)).toBe(true);
  });

  it('应生成非空的摘要', async () => {
    addComments('note-1', ['好评', '差评', '一般']);

    const analysis = await analyzeComments('note-1');

    expect(analysis.summary).toBeDefined();
    expect(analysis.summary.length).toBeGreaterThan(0);
  });

  it('单条评论的情感分布总和应为 1.0', async () => {
    addComments('note-1', ['这个产品太好了']);

    const analysis = await analyzeComments('note-1');
    const { positive, neutral, negative } = analysis.sentimentDistribution;
    const total = positive + neutral + negative;

    expect(Math.abs(total - 1.0)).toBeLessThanOrEqual(0.01);
  });
});

// ============================================================
// getOptimizationSuggestions 单元测试
// ============================================================

describe('getOptimizationSuggestions', () => {
  it('没有数据时应返回基础建议', async () => {
    const suggestions = await getOptimizationSuggestions();

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].type).toBe('content');
  });

  it('有数据时应返回多种类型的建议', async () => {
    addEngagementRecord(createEngagementRecord('note-1', {
      views: 1000, likes: 10, comments: 1, favorites: 5, shares: 1,
      updatedAt: new Date(),
    }));

    const suggestions = await getOptimizationSuggestions();

    expect(suggestions.length).toBeGreaterThan(0);

    // 每个建议应有完整的结构
    for (const suggestion of suggestions) {
      expect(['timing', 'content', 'tags', 'frequency']).toContain(suggestion.type);
      expect(suggestion.title).toBeDefined();
      expect(suggestion.title.length).toBeGreaterThan(0);
      expect(suggestion.description).toBeDefined();
      expect(suggestion.description.length).toBeGreaterThan(0);
      expect(typeof suggestion.confidence).toBe('number');
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
      expect(suggestion.basedOn).toBeDefined();
      expect(suggestion.basedOn.length).toBeGreaterThan(0);
    }
  });

  it('少量内容时应建议增加发布频率', async () => {
    addEngagementRecord(createEngagementRecord('note-1', {
      updatedAt: new Date(),
    }));

    const suggestions = await getOptimizationSuggestions();

    const frequencySuggestion = suggestions.find((s) => s.type === 'frequency');
    expect(frequencySuggestion).toBeDefined();
  });

  it('应包含标签优化建议', async () => {
    addEngagementRecord(createEngagementRecord('note-1', {
      updatedAt: new Date(),
    }));

    const suggestions = await getOptimizationSuggestions();

    const tagsSuggestion = suggestions.find((s) => s.type === 'tags');
    expect(tagsSuggestion).toBeDefined();
  });
});

// ============================================================
// detectAnomalies 单元测试
// ============================================================

describe('detectAnomalies', () => {
  it('数据不足时应返回空数组', async () => {
    const alerts = await detectAnomalies('note-no-data');

    expect(alerts).toEqual([]);
  });

  it('单条记录时应返回空数组', async () => {
    addEngagementRecord(createEngagementRecord('note-1'));

    const alerts = await detectAnomalies('note-1');

    expect(alerts).toEqual([]);
  });

  it('数据稳定时应返回空数组', async () => {
    // 添加多条相似的数据
    for (let i = 0; i < 5; i++) {
      addEngagementRecord(createEngagementRecord('note-1', {
        views: 100 + i, // 微小变化
        likes: 20,
        comments: 5,
        favorites: 10,
        shares: 3,
        updatedAt: new Date(2025, 0, i + 1),
      }));
    }

    const alerts = await detectAnomalies('note-1');

    expect(alerts).toEqual([]);
  });

  it('当指标变化超过 2 倍标准差时应返回告警（Property 21）', async () => {
    // 添加稳定的历史数据
    for (let i = 0; i < 10; i++) {
      addEngagementRecord(createEngagementRecord('note-1', {
        views: 100,
        likes: 20,
        comments: 5,
        favorites: 10,
        shares: 3,
        updatedAt: new Date(2025, 0, i + 1),
      }));
    }

    // 添加一条异常数据（views 突然暴增）
    addEngagementRecord(createEngagementRecord('note-1', {
      views: 10000,
      likes: 20,
      comments: 5,
      favorites: 10,
      shares: 3,
      updatedAt: new Date(2025, 0, 12),
    }));

    const alerts = await detectAnomalies('note-1');

    expect(alerts.length).toBeGreaterThan(0);

    const viewsAlert = alerts.find((a) => a.metric === 'views');
    expect(viewsAlert).toBeDefined();
    expect(viewsAlert!.noteId).toBe('note-1');
    expect(viewsAlert!.currentValue).toBe(10000);
    expect(viewsAlert!.deviation).toBeGreaterThan(2);
    expect(viewsAlert!.detectedAt).toBeInstanceOf(Date);
    expect(viewsAlert!.possibleReasons.length).toBeGreaterThan(0);
  });

  it('告警应包含正确的 metric 字段', async () => {
    // 添加稳定数据
    for (let i = 0; i < 10; i++) {
      addEngagementRecord(createEngagementRecord('note-1', {
        views: 100,
        likes: 20,
        comments: 5,
        favorites: 10,
        shares: 3,
        updatedAt: new Date(2025, 0, i + 1),
      }));
    }

    // 添加多个指标异常的数据
    addEngagementRecord(createEngagementRecord('note-1', {
      views: 10000,
      likes: 2000,
      comments: 5,
      favorites: 10,
      shares: 3,
      updatedAt: new Date(2025, 0, 12),
    }));

    const alerts = await detectAnomalies('note-1');

    for (const alert of alerts) {
      expect(['views', 'likes', 'comments', 'favorites', 'shares']).toContain(alert.metric);
    }
  });

  it('数据暴跌时也应检测到异常', async () => {
    // 添加高互动的历史数据
    for (let i = 0; i < 10; i++) {
      addEngagementRecord(createEngagementRecord('note-1', {
        views: 1000,
        likes: 200,
        comments: 50,
        favorites: 100,
        shares: 30,
        updatedAt: new Date(2025, 0, i + 1),
      }));
    }

    // 添加一条暴跌数据
    addEngagementRecord(createEngagementRecord('note-1', {
      views: 0,
      likes: 0,
      comments: 0,
      favorites: 0,
      shares: 0,
      updatedAt: new Date(2025, 0, 12),
    }));

    const alerts = await detectAnomalies('note-1');

    expect(alerts.length).toBeGreaterThan(0);
  });
});

// ============================================================
// createAnalyticsService 工厂函数测试
// ============================================================

describe('createAnalyticsService', () => {
  it('应返回包含所有接口方法的对象', () => {
    const service = createAnalyticsService();

    expect(typeof service.trackEngagement).toBe('function');
    expect(typeof service.generateSummary).toBe('function');
    expect(typeof service.analyzeComments).toBe('function');
    expect(typeof service.getOptimizationSuggestions).toBe('function');
    expect(typeof service.detectAnomalies).toBe('function');
  });

  it('通过实例调用 trackEngagement 应正常工作', async () => {
    const service = createAnalyticsService();
    addEngagementRecord(createEngagementRecord('note-1'));

    const result = await service.trackEngagement('note-1');

    expect(result.noteId).toBe('note-1');
    expect(result.views).toBeGreaterThanOrEqual(0);
  });

  it('通过实例调用 generateSummary 应正常工作', async () => {
    const service = createAnalyticsService();
    const timeRange: TimeRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    const summary = await service.generateSummary(timeRange);

    expect(summary.timeRange).toEqual(timeRange);
    expect(summary.totalNotes).toBeGreaterThanOrEqual(0);
  });

  it('通过实例调用 analyzeComments 应正常工作', async () => {
    const service = createAnalyticsService();
    addComments('note-1', ['好评']);

    const analysis = await service.analyzeComments('note-1');

    expect(analysis.noteId).toBe('note-1');
    expect(analysis.totalComments).toBe(1);
  });

  it('通过实例调用 getOptimizationSuggestions 应正常工作', async () => {
    const service = createAnalyticsService();

    const suggestions = await service.getOptimizationSuggestions();

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('通过实例调用 detectAnomalies 应正常工作', async () => {
    const service = createAnalyticsService();

    const alerts = await service.detectAnomalies('note-1');

    expect(Array.isArray(alerts)).toBe(true);
  });
});

// ============================================================
// addEngagementRecord 辅助函数测试
// ============================================================

describe('addEngagementRecord', () => {
  it('应正确存储互动数据', () => {
    const record = createEngagementRecord('note-1');
    addEngagementRecord(record);

    const store = getEngagementStore();
    expect(store.has('note-1')).toBe(true);
    expect(store.get('note-1')!.length).toBe(1);
  });

  it('应支持同一笔记的多条记录', () => {
    addEngagementRecord(createEngagementRecord('note-1', { views: 100 }));
    addEngagementRecord(createEngagementRecord('note-1', { views: 200 }));

    const store = getEngagementStore();
    expect(store.get('note-1')!.length).toBe(2);
  });
});

// ============================================================
// clearAnalyticsStore 辅助函数测试
// ============================================================

describe('clearAnalyticsStore', () => {
  it('应清空所有存储', () => {
    addEngagementRecord(createEngagementRecord('note-1'));
    addComments('note-1', ['评论']);

    clearAnalyticsStore();

    const store = getEngagementStore();
    expect(store.size).toBe(0);
  });
});
