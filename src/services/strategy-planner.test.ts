import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateStrategy,
  adjustNode,
  createStrategyPlanner,
  clearStrategyStore,
  getStrategyStore,
} from './strategy-planner.js';
import { clearNoteStore } from './content-generator.js';
import type {
  StrategyRequest,
  StrategyNode,
  TrendingTopic,
  CompetitorReport,
  Platform,
} from '../types/index.js';

// ============================================================
// 测试前清理
// ============================================================

beforeEach(() => {
  clearStrategyStore();
  clearNoteStore();
});

// ============================================================
// 辅助函数：创建测试数据
// ============================================================

function createTestTrendingTopics(platform: Platform = 'xiaohongshu'): TrendingTopic[] {
  return [
    {
      id: 'trend-1',
      title: '秋冬护肤必备好物',
      platform,
      category: '美妆',
      hotScore: 950,
      relatedTags: ['#护肤', '#秋冬好物'],
      discoveredAt: new Date(),
    },
    {
      id: 'trend-2',
      title: '极简穿搭公式',
      platform,
      category: '穿搭',
      hotScore: 880,
      relatedTags: ['#穿搭', '#极简风'],
      discoveredAt: new Date(),
    },
    {
      id: 'trend-3',
      title: '一人食晚餐食谱',
      platform,
      category: '美食',
      hotScore: 820,
      relatedTags: ['#美食', '#一人食'],
      discoveredAt: new Date(),
    },
  ];
}

function createTestCompetitorReport(): CompetitorReport {
  return {
    id: 'report-1',
    target: { type: 'keyword', value: '美妆', platform: 'xiaohongshu' },
    contentTrends: [
      { topic: '护肤品测评', trend: 'rising', dataPoints: [100, 200, 300], period: '最近30天' },
      { topic: '化妆教程', trend: 'stable', dataPoints: [150, 160, 155], period: '最近30天' },
    ],
    engagementMetrics: {
      averageLikes: 500,
      averageComments: 50,
      averageFavorites: 200,
      averageShares: 30,
      engagementRate: 0.05,
    },
    strategySuggestions: ['增加视频内容', '关注敏感肌话题'],
    generatedAt: new Date(),
    publishReady: true,
  };
}

function createTestStrategyRequest(overrides?: Partial<StrategyRequest>): StrategyRequest {
  return {
    category: '美妆',
    goal: '提升账号影响力',
    platform: 'xiaohongshu',
    duration: '30days',
    trendingTopics: createTestTrendingTopics(),
    competitorReport: createTestCompetitorReport(),
    ...overrides,
  };
}

// ============================================================
// generateStrategy 单元测试
// ============================================================

describe('generateStrategy', () => {
  it('应生成包含所有必需字段的完整策略', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    expect(strategy.id).toBeDefined();
    expect(strategy.id.length).toBeGreaterThan(0);
    expect(strategy.category).toBe('美妆');
    expect(strategy.goal).toBe('提升账号影响力');
    expect(strategy.nodes).toBeDefined();
    expect(Array.isArray(strategy.nodes)).toBe(true);
    expect(strategy.createdAt).toBeInstanceOf(Date);
  });

  it('策略应包含至少一个 StrategyNode', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    expect(strategy.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('每个节点应包含 scheduledDate、topic、contentType、frequency、expectedEffect 字段', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    for (const node of strategy.nodes) {
      expect(node.id).toBeDefined();
      expect(node.id.length).toBeGreaterThan(0);
      expect(node.scheduledDate).toBeInstanceOf(Date);
      expect(node.topic).toBeDefined();
      expect(node.topic.length).toBeGreaterThan(0);
      expect(node.contentType).toBeDefined();
      expect(node.contentType.length).toBeGreaterThan(0);
      expect(node.frequency).toBeDefined();
      expect(node.frequency.length).toBeGreaterThan(0);
      expect(node.expectedEffect).toBeDefined();
      expect(node.expectedEffect.length).toBeGreaterThan(0);
    }
  });

  it('策略的 publishReady 应为 true', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    expect(strategy.publishReady).toBe(true);
  });

  it('每个节点应关联一个 Note（Publish_Ready 内容）', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    for (const node of strategy.nodes) {
      expect(node.note).toBeDefined();
      expect(node.note!.id).toBeDefined();
      expect(node.note!.textContent.length).toBeGreaterThan(0);
      expect(node.note!.status).toBe('ready');
      expect(node.status).toBe('content_ready');
    }
  });

  it('策略节点的 topic 应与 TrendingTopic 或 CompetitorReport 关键词有交集', async () => {
    const trendingTopics = createTestTrendingTopics();
    const competitorReport = createTestCompetitorReport();
    const request = createTestStrategyRequest({ trendingTopics, competitorReport });

    const strategy = await generateStrategy(request);

    // 收集所有数据源中的关键词
    const dataKeywords = new Set<string>();
    for (const topic of trendingTopics) {
      dataKeywords.add(topic.title);
    }
    for (const trend of competitorReport.contentTrends) {
      dataKeywords.add(trend.topic);
    }
    for (const suggestion of competitorReport.strategySuggestions) {
      dataKeywords.add(suggestion);
    }

    // 至少有一个节点的 topic 与数据源关键词有交集
    const hasOverlap = strategy.nodes.some((node) => dataKeywords.has(node.topic));
    expect(hasOverlap).toBe(true);
  });

  it('策略应存储在内存中', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    const store = getStrategyStore();
    expect(store.has(strategy.id)).toBe(true);
    expect(store.get(strategy.id)).toEqual(strategy);
  });

  it('每次生成的策略应有唯一 ID', async () => {
    const request = createTestStrategyRequest();
    const strategy1 = await generateStrategy(request);
    const strategy2 = await generateStrategy(request);

    expect(strategy1.id).not.toBe(strategy2.id);
  });

  it('节点的 scheduledDate 应在未来', async () => {
    const request = createTestStrategyRequest();
    const now = new Date();
    const strategy = await generateStrategy(request);

    for (const node of strategy.nodes) {
      expect(node.scheduledDate.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it('节点的 scheduledDate 应按时间顺序排列', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    for (let i = 1; i < strategy.nodes.length; i++) {
      expect(strategy.nodes[i].scheduledDate.getTime())
        .toBeGreaterThanOrEqual(strategy.nodes[i - 1].scheduledDate.getTime());
    }
  });

  it('短周期策略应生成较少节点', async () => {
    const request = createTestStrategyRequest({ duration: '7days' });
    const strategy = await generateStrategy(request);

    expect(strategy.nodes.length).toBeGreaterThanOrEqual(1);
    expect(strategy.nodes.length).toBeLessThanOrEqual(7);
  });

  it('长周期策略应生成较多节点', async () => {
    const request = createTestStrategyRequest({ duration: '60days' });
    const strategy = await generateStrategy(request);

    expect(strategy.nodes.length).toBeGreaterThan(1);
  });

  it('不提供 trendingTopics 时应自动获取热点数据', async () => {
    const request = createTestStrategyRequest({
      trendingTopics: undefined,
      competitorReport: undefined,
    });

    const strategy = await generateStrategy(request);

    expect(strategy.nodes.length).toBeGreaterThanOrEqual(1);
    expect(strategy.publishReady).toBe(true);
  });

  it('应支持所有平台', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const request = createTestStrategyRequest({
        platform,
        trendingTopics: createTestTrendingTopics(platform),
      });
      const strategy = await generateStrategy(request);

      expect(strategy.nodes.length).toBeGreaterThanOrEqual(1);
      expect(strategy.publishReady).toBe(true);

      // 每个节点的 note 应属于正确的平台
      for (const node of strategy.nodes) {
        expect(node.note).toBeDefined();
        expect(node.note!.platform).toBe(platform);
      }
    }
  });
});

// ============================================================
// adjustNode 单元测试
// ============================================================

describe('adjustNode', () => {
  it('应成功修改指定节点的字段', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);
    const targetNode = strategy.nodes[0];

    const changes: Partial<StrategyNode> = {
      contentType: '视频笔记',
      frequency: '每天发布',
    };

    const updated = await adjustNode(strategy.id, targetNode.id, changes);
    const updatedNode = updated.nodes.find((n) => n.id === targetNode.id)!;

    expect(updatedNode.contentType).toBe('视频笔记');
    expect(updatedNode.frequency).toBe('每天发布');
  });

  it('修改一个节点后其余节点应保持不变', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    // 确保有多个节点
    expect(strategy.nodes.length).toBeGreaterThan(1);

    const targetNode = strategy.nodes[0];
    const otherNodes = strategy.nodes.slice(1);

    // 深拷贝其他节点用于比较
    const otherNodeSnapshots = otherNodes.map((n) => ({
      id: n.id,
      scheduledDate: n.scheduledDate.getTime(),
      topic: n.topic,
      contentType: n.contentType,
      frequency: n.frequency,
      expectedEffect: n.expectedEffect,
      noteId: n.note?.id,
      status: n.status,
    }));

    const changes: Partial<StrategyNode> = {
      expectedEffect: '全新的预期效果描述',
    };

    const updated = await adjustNode(strategy.id, targetNode.id, changes);

    // 验证其他节点未变
    for (let i = 0; i < otherNodeSnapshots.length; i++) {
      const snapshot = otherNodeSnapshots[i];
      const currentNode = updated.nodes.find((n) => n.id === snapshot.id)!;

      expect(currentNode).toBeDefined();
      expect(currentNode.scheduledDate.getTime()).toBe(snapshot.scheduledDate);
      expect(currentNode.topic).toBe(snapshot.topic);
      expect(currentNode.contentType).toBe(snapshot.contentType);
      expect(currentNode.frequency).toBe(snapshot.frequency);
      expect(currentNode.expectedEffect).toBe(snapshot.expectedEffect);
      expect(currentNode.note?.id).toBe(snapshot.noteId);
      expect(currentNode.status).toBe(snapshot.status);
    }
  });

  it('修改 topic 时应重新生成 note', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);
    const targetNode = strategy.nodes[0];
    const originalNoteId = targetNode.note?.id;

    const changes: Partial<StrategyNode> = {
      topic: '全新的主题内容',
    };

    const updated = await adjustNode(strategy.id, targetNode.id, changes);
    const updatedNode = updated.nodes.find((n) => n.id === targetNode.id)!;

    expect(updatedNode.topic).toBe('全新的主题内容');
    expect(updatedNode.note).toBeDefined();
    expect(updatedNode.note!.id).not.toBe(originalNoteId);
  });

  it('不修改 topic 时应保留原有 note', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);
    const targetNode = strategy.nodes[0];
    const originalNoteId = targetNode.note?.id;

    const changes: Partial<StrategyNode> = {
      contentType: '测评',
    };

    const updated = await adjustNode(strategy.id, targetNode.id, changes);
    const updatedNode = updated.nodes.find((n) => n.id === targetNode.id)!;

    expect(updatedNode.note?.id).toBe(originalNoteId);
  });

  it('节点 ID 应保持不变', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);
    const targetNode = strategy.nodes[0];

    const changes: Partial<StrategyNode> = {
      contentType: '合集',
    };

    const updated = await adjustNode(strategy.id, targetNode.id, changes);
    const updatedNode = updated.nodes.find((n) => n.id === targetNode.id);

    expect(updatedNode).toBeDefined();
    expect(updatedNode!.id).toBe(targetNode.id);
  });

  it('对不存在的策略调用 adjustNode 应抛出错误', async () => {
    await expect(
      adjustNode('non-existent-strategy', 'node-1', { contentType: '视频' })
    ).rejects.toThrow('策略不存在');
  });

  it('对不存在的节点调用 adjustNode 应抛出错误', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);

    await expect(
      adjustNode(strategy.id, 'non-existent-node', { contentType: '视频' })
    ).rejects.toThrow('节点不存在');
  });

  it('修改后的策略应更新存储', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);
    const targetNode = strategy.nodes[0];

    const changes: Partial<StrategyNode> = {
      expectedEffect: '更新后的预期效果',
    };

    const updated = await adjustNode(strategy.id, targetNode.id, changes);
    const stored = getStrategyStore().get(strategy.id);

    expect(stored).toEqual(updated);
  });

  it('应支持修改 scheduledDate', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);
    const targetNode = strategy.nodes[0];
    const newDate = new Date('2025-12-31');

    const changes: Partial<StrategyNode> = {
      scheduledDate: newDate,
    };

    const updated = await adjustNode(strategy.id, targetNode.id, changes);
    const updatedNode = updated.nodes.find((n) => n.id === targetNode.id)!;

    expect(updatedNode.scheduledDate).toEqual(newDate);
  });

  it('节点总数应保持不变', async () => {
    const request = createTestStrategyRequest();
    const strategy = await generateStrategy(request);
    const originalCount = strategy.nodes.length;
    const targetNode = strategy.nodes[0];

    const updated = await adjustNode(strategy.id, targetNode.id, {
      contentType: '教程',
    });

    expect(updated.nodes.length).toBe(originalCount);
  });
});

// ============================================================
// createStrategyPlanner 工厂函数测试
// ============================================================

describe('createStrategyPlanner', () => {
  it('应返回包含所有接口方法的对象', () => {
    const planner = createStrategyPlanner();

    expect(typeof planner.generateStrategy).toBe('function');
    expect(typeof planner.adjustNode).toBe('function');
  });

  it('通过实例调用 generateStrategy 应正常工作', async () => {
    const planner = createStrategyPlanner();
    const request = createTestStrategyRequest();

    const strategy = await planner.generateStrategy(request);

    expect(strategy.id).toBeDefined();
    expect(strategy.nodes.length).toBeGreaterThanOrEqual(1);
    expect(strategy.publishReady).toBe(true);
  });

  it('通过实例调用 adjustNode 应正常工作', async () => {
    const planner = createStrategyPlanner();
    const request = createTestStrategyRequest();

    const strategy = await planner.generateStrategy(request);
    const targetNode = strategy.nodes[0];

    const updated = await planner.adjustNode(strategy.id, targetNode.id, {
      contentType: '攻略',
    });

    const updatedNode = updated.nodes.find((n) => n.id === targetNode.id)!;
    expect(updatedNode.contentType).toBe('攻略');
  });
});
