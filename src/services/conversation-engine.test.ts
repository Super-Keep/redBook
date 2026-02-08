import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConversationEngine,
  parseIntent,
  generateClarification,
  getContext,
  addMessageToContext,
  clearContext,
  clearAllContexts,
  identifyTaskType,
  identifyPlatform,
  extractCategory,
  calculateConfidence,
  TASK_TYPE_KEYWORDS,
  PLATFORM_KEYWORDS,
  CATEGORY_KEYWORDS,
} from './conversation-engine.js';
import type {
  ConversationContext,
  ParsedIntent,
  TaskType,
  Platform,
} from '../types/index.js';

// 每个测试前清除所有会话上下文
beforeEach(() => {
  clearAllContexts();
});

// ============================================================
// identifyTaskType 单元测试
// ============================================================

describe('identifyTaskType', () => {
  it('应识别竞品分析关键词', () => {
    expect(identifyTaskType('帮我做竞品分析')).toBe('competitor_analysis');
    expect(identifyTaskType('分析一下竞品')).toBe('competitor_analysis');
    expect(identifyTaskType('看看竞争对手')).toBe('competitor_analysis');
  });

  it('应识别热点跟踪关键词', () => {
    expect(identifyTaskType('查看热点')).toBe('trending_tracking');
    expect(identifyTaskType('最近有什么热门话题')).toBe('trending_tracking');
    expect(identifyTaskType('追踪趋势')).toBe('trending_tracking');
  });

  it('应识别内容生成关键词', () => {
    expect(identifyTaskType('帮我写笔记')).toBe('content_generation');
    expect(identifyTaskType('生成内容')).toBe('content_generation');
    expect(identifyTaskType('写一篇文案')).toBe('content_generation');
    expect(identifyTaskType('创作一篇关于美妆的文章')).toBe('content_generation');
  });

  it('应识别内容发布关键词', () => {
    expect(identifyTaskType('发布这篇笔记')).toBe('content_publish');
    expect(identifyTaskType('推送内容')).toBe('content_publish');
    expect(identifyTaskType('上传到平台')).toBe('content_publish');
  });

  it('应识别运营策略关键词', () => {
    expect(identifyTaskType('制定运营策略')).toBe('strategy_generation');
    expect(identifyTaskType('生成运营计划')).toBe('strategy_generation');
    expect(identifyTaskType('帮我做运营方案')).toBe('strategy_generation');
  });

  it('应识别运营总结关键词', () => {
    expect(identifyTaskType('生成运营总结')).toBe('operation_summary');
    expect(identifyTaskType('看看运营报告')).toBe('operation_summary');
    expect(identifyTaskType('数据总结')).toBe('operation_summary');
  });

  it('应识别评论分析关键词', () => {
    expect(identifyTaskType('分析评论')).toBe('comment_analysis');
    expect(identifyTaskType('看看评论分析')).toBe('comment_analysis');
    expect(identifyTaskType('用户反馈怎么样')).toBe('comment_analysis');
  });

  it('无法识别时应返回 null', () => {
    expect(identifyTaskType('你好')).toBeNull();
    expect(identifyTaskType('今天天气怎么样')).toBeNull();
    expect(identifyTaskType('')).toBeNull();
    expect(identifyTaskType('随便聊聊')).toBeNull();
  });
});

// ============================================================
// identifyPlatform 单元测试
// ============================================================

describe('identifyPlatform', () => {
  it('应识别小红书', () => {
    expect(identifyPlatform('在小红书上发布')).toBe('xiaohongshu');
    expect(identifyPlatform('xhs平台')).toBe('xiaohongshu');
    expect(identifyPlatform('红书笔记')).toBe('xiaohongshu');
  });

  it('应识别抖音', () => {
    expect(identifyPlatform('抖音热门')).toBe('douyin');
    expect(identifyPlatform('douyin平台')).toBe('douyin');
  });

  it('应识别微博', () => {
    expect(identifyPlatform('微博热搜')).toBe('weibo');
    expect(identifyPlatform('weibo平台')).toBe('weibo');
  });

  it('应识别微信', () => {
    expect(identifyPlatform('微信公众号')).toBe('wechat');
    expect(identifyPlatform('发到公众号')).toBe('wechat');
    expect(identifyPlatform('wechat平台')).toBe('wechat');
  });

  it('无法识别时应返回 null', () => {
    expect(identifyPlatform('某个平台')).toBeNull();
    expect(identifyPlatform('帮我写笔记')).toBeNull();
    expect(identifyPlatform('')).toBeNull();
  });
});

// ============================================================
// extractCategory 单元测试
// ============================================================

describe('extractCategory', () => {
  it('应提取美妆赛道', () => {
    expect(extractCategory('美妆赛道的竞品分析')).toBe('美妆');
  });

  it('应提取美食赛道', () => {
    expect(extractCategory('写一篇美食笔记')).toBe('美食');
  });

  it('应提取旅行赛道', () => {
    expect(extractCategory('旅行攻略内容')).toBe('旅行');
  });

  it('应提取科技赛道', () => {
    expect(extractCategory('最新科技产品评测')).toBe('科技');
  });

  it('无法识别赛道时应返回空字符串', () => {
    expect(extractCategory('帮我写笔记')).toBe('');
    expect(extractCategory('你好')).toBe('');
    expect(extractCategory('')).toBe('');
  });

  it('当输入包含多个赛道关键词时应返回第一个匹配', () => {
    // 由于遍历顺序，返回 CATEGORY_KEYWORDS 中先出现的
    const result = extractCategory('美妆和美食');
    expect(CATEGORY_KEYWORDS).toContain(result);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ============================================================
// calculateConfidence 单元测试
// ============================================================

describe('calculateConfidence', () => {
  it('所有参数都识别到时置信度应为 1.0', () => {
    expect(calculateConfidence('competitor_analysis', 'xiaohongshu', '美妆')).toBe(1.0);
  });

  it('只识别到任务类型时置信度应为 0.4', () => {
    expect(calculateConfidence('competitor_analysis', null, '')).toBe(0.4);
  });

  it('只识别到平台时置信度应为 0.3', () => {
    expect(calculateConfidence(null, 'xiaohongshu', '')).toBe(0.3);
  });

  it('只识别到赛道时置信度应为 0.3', () => {
    expect(calculateConfidence(null, null, '美妆')).toBe(0.3);
  });

  it('识别到任务类型和平台时置信度应为 0.7', () => {
    expect(calculateConfidence('content_generation', 'douyin', '')).toBe(0.7);
  });

  it('识别到任务类型和赛道时置信度应为 0.7', () => {
    expect(calculateConfidence('content_generation', null, '美妆')).toBe(0.7);
  });

  it('识别到平台和赛道时置信度应为 0.6', () => {
    expect(calculateConfidence(null, 'xiaohongshu', '美妆')).toBe(0.6);
  });

  it('什么都没识别到时置信度应为 0', () => {
    expect(calculateConfidence(null, null, '')).toBe(0);
  });
});

// ============================================================
// parseIntent 单元测试
// ============================================================

describe('parseIntent', () => {
  it('应正确解析包含所有参数的完整指令', async () => {
    const result = await parseIntent('帮我分析小红书上美妆赛道的竞品');
    expect(result.taskType).toBe('competitor_analysis');
    expect(result.platform).toBe('xiaohongshu');
    expect(result.category).toBe('美妆');
    expect(result.confidence).toBe(1.0);
    expect(result.parameters.rawInput).toBe('帮我分析小红书上美妆赛道的竞品');
  });

  it('应正确解析只有任务类型的指令', async () => {
    const result = await parseIntent('帮我做竞品分析');
    expect(result.taskType).toBe('competitor_analysis');
    expect(result.confidence).toBe(0.4);
  });

  it('应正确解析包含任务类型和平台的指令', async () => {
    const result = await parseIntent('在抖音上写笔记');
    expect(result.taskType).toBe('content_generation');
    expect(result.platform).toBe('douyin');
    expect(result.confidence).toBe(0.7);
  });

  it('无法解析时应返回默认值且置信度为 0', async () => {
    const result = await parseIntent('你好世界');
    expect(result.taskType).toBe('content_generation'); // 默认值
    expect(result.platform).toBe('xiaohongshu'); // 默认值
    expect(result.category).toBe('');
    expect(result.confidence).toBe(0);
  });

  it('应处理空字符串输入', async () => {
    const result = await parseIntent('');
    expect(result.confidence).toBe(0);
    expect(result.parameters.rawInput).toBe('');
  });

  it('应处理只有空白的输入', async () => {
    const result = await parseIntent('   ');
    expect(result.confidence).toBe(0);
    expect(result.parameters.rawInput).toBe('');
  });

  it('应正确解析内容发布指令', async () => {
    const result = await parseIntent('把这篇笔记发布到微博');
    expect(result.taskType).toBe('content_publish');
    expect(result.platform).toBe('weibo');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('应正确解析运营策略指令', async () => {
    const result = await parseIntent('帮我制定一个微信公众号的美食运营策略');
    expect(result.taskType).toBe('strategy_generation');
    expect(result.platform).toBe('wechat');
    expect(result.category).toBe('美食');
    expect(result.confidence).toBe(1.0);
  });

  it('应正确解析运营总结指令', async () => {
    const result = await parseIntent('生成本周的运营报告');
    expect(result.taskType).toBe('operation_summary');
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it('应正确解析评论分析指令', async () => {
    const result = await parseIntent('帮我分析评论');
    expect(result.taskType).toBe('comment_analysis');
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
  });
});

// ============================================================
// generateClarification 单元测试
// ============================================================

describe('generateClarification', () => {
  it('当没有当前意图时应返回通用引导', async () => {
    const context: ConversationContext = {
      sessionId: 'test-session',
      history: [],
      metadata: {},
    };

    const clarification = await generateClarification(context);
    expect(clarification).toContain('竞品分析');
    expect(clarification).toContain('内容生成');
    expect(clarification).toContain('热点跟踪');
    expect(clarification.length).toBeGreaterThan(0);
  });

  it('当置信度为 0 时应返回通用引导', async () => {
    const context: ConversationContext = {
      sessionId: 'test-session',
      history: [],
      currentIntent: {
        taskType: 'content_generation',
        platform: 'xiaohongshu',
        category: '',
        parameters: { rawInput: '你好' },
        confidence: 0,
      },
      metadata: {},
    };

    const clarification = await generateClarification(context);
    expect(clarification).toContain('没有理解');
    expect(clarification.length).toBeGreaterThan(0);
  });

  it('当缺少平台和赛道时应提示补充', async () => {
    const context: ConversationContext = {
      sessionId: 'test-session',
      history: [],
      currentIntent: {
        taskType: 'competitor_analysis',
        platform: 'xiaohongshu', // 默认值
        category: '',
        parameters: { rawInput: '帮我做竞品分析' },
        confidence: 0.4,
      },
      metadata: {},
    };

    const clarification = await generateClarification(context);
    expect(clarification).toContain('平台');
    expect(clarification).toContain('赛道');
  });

  it('当缺少赛道时应提示补充赛道信息', async () => {
    const context: ConversationContext = {
      sessionId: 'test-session',
      history: [],
      currentIntent: {
        taskType: 'competitor_analysis',
        platform: 'xiaohongshu',
        category: '',
        parameters: { rawInput: '帮我分析小红书的竞品' },
        confidence: 0.7,
      },
      metadata: {},
    };

    const clarification = await generateClarification(context);
    expect(clarification).toContain('赛道');
  });

  it('当所有信息完整时应返回确认消息', async () => {
    const context: ConversationContext = {
      sessionId: 'test-session',
      history: [],
      currentIntent: {
        taskType: 'competitor_analysis',
        platform: 'xiaohongshu',
        category: '美妆',
        parameters: { rawInput: '帮我分析小红书上美妆赛道的竞品' },
        confidence: 1.0,
      },
      metadata: {},
    };

    const clarification = await generateClarification(context);
    expect(clarification).toContain('已理解');
  });

  it('返回的澄清提示应为非空字符串', async () => {
    const context: ConversationContext = {
      sessionId: 'test-session',
      history: [],
      metadata: {},
    };

    const clarification = await generateClarification(context);
    expect(typeof clarification).toBe('string');
    expect(clarification.length).toBeGreaterThan(0);
  });
});

// ============================================================
// getContext 单元测试
// ============================================================

describe('getContext', () => {
  it('应为新会话创建空上下文', async () => {
    const context = await getContext('new-session-123');
    expect(context.sessionId).toBe('new-session-123');
    expect(context.history).toEqual([]);
    expect(context.currentIntent).toBeUndefined();
    expect(context.metadata).toEqual({});
  });

  it('应返回已存在的会话上下文', async () => {
    const context1 = await getContext('session-abc');
    context1.metadata = { key: 'value' };

    const context2 = await getContext('session-abc');
    expect(context2.metadata).toEqual({ key: 'value' });
  });

  it('不同 sessionId 应返回不同的上下文', async () => {
    const context1 = await getContext('session-1');
    const context2 = await getContext('session-2');

    context1.metadata = { session: '1' };
    context2.metadata = { session: '2' };

    const retrieved1 = await getContext('session-1');
    const retrieved2 = await getContext('session-2');

    expect(retrieved1.metadata).toEqual({ session: '1' });
    expect(retrieved2.metadata).toEqual({ session: '2' });
  });

  it('应保持对话历史', async () => {
    const context = await getContext('session-history');
    addMessageToContext(context, 'user', '你好');
    addMessageToContext(context, 'assistant', '你好！有什么可以帮您的？');

    const retrieved = await getContext('session-history');
    expect(retrieved.history).toHaveLength(2);
    expect(retrieved.history[0].role).toBe('user');
    expect(retrieved.history[0].content).toBe('你好');
    expect(retrieved.history[1].role).toBe('assistant');
    expect(retrieved.history[1].content).toBe('你好！有什么可以帮您的？');
  });
});

// ============================================================
// addMessageToContext 单元测试
// ============================================================

describe('addMessageToContext', () => {
  it('应向上下文添加消息', async () => {
    const context = await getContext('msg-session');
    addMessageToContext(context, 'user', '测试消息');

    expect(context.history).toHaveLength(1);
    expect(context.history[0].role).toBe('user');
    expect(context.history[0].content).toBe('测试消息');
    expect(context.history[0].timestamp).toBeInstanceOf(Date);
  });

  it('应按顺序添加多条消息', async () => {
    const context = await getContext('multi-msg-session');
    addMessageToContext(context, 'user', '第一条');
    addMessageToContext(context, 'assistant', '第二条');
    addMessageToContext(context, 'system', '第三条');

    expect(context.history).toHaveLength(3);
    expect(context.history[0].content).toBe('第一条');
    expect(context.history[1].content).toBe('第二条');
    expect(context.history[2].content).toBe('第三条');
  });

  it('添加的消息应持久化到会话存储', async () => {
    const context = await getContext('persist-session');
    addMessageToContext(context, 'user', '持久化测试');

    const retrieved = await getContext('persist-session');
    expect(retrieved.history).toHaveLength(1);
    expect(retrieved.history[0].content).toBe('持久化测试');
  });
});

// ============================================================
// clearContext 单元测试
// ============================================================

describe('clearContext', () => {
  it('应清除指定会话的上下文', async () => {
    const context = await getContext('clear-session');
    addMessageToContext(context, 'user', '消息');

    clearContext('clear-session');

    const newContext = await getContext('clear-session');
    expect(newContext.history).toEqual([]);
    expect(newContext.metadata).toEqual({});
  });

  it('清除一个会话不应影响其他会话', async () => {
    const context1 = await getContext('keep-session');
    addMessageToContext(context1, 'user', '保留的消息');

    const context2 = await getContext('remove-session');
    addMessageToContext(context2, 'user', '删除的消息');

    clearContext('remove-session');

    const retrieved = await getContext('keep-session');
    expect(retrieved.history).toHaveLength(1);
    expect(retrieved.history[0].content).toBe('保留的消息');
  });
});

// ============================================================
// createConversationEngine 单元测试
// ============================================================

describe('createConversationEngine', () => {
  it('应返回包含所有接口方法的对象', () => {
    const engine = createConversationEngine();
    expect(typeof engine.parseIntent).toBe('function');
    expect(typeof engine.generateClarification).toBe('function');
    expect(typeof engine.getContext).toBe('function');
  });

  it('通过引擎实例调用 parseIntent 应正常工作', async () => {
    const engine = createConversationEngine();
    const result = await engine.parseIntent('帮我分析小红书上美妆赛道的竞品');
    expect(result.taskType).toBe('competitor_analysis');
    expect(result.platform).toBe('xiaohongshu');
    expect(result.category).toBe('美妆');
    expect(result.confidence).toBe(1.0);
  });

  it('通过引擎实例调用 getContext 应正常工作', async () => {
    const engine = createConversationEngine();
    const context = await engine.getContext('engine-session');
    expect(context.sessionId).toBe('engine-session');
  });

  it('通过引擎实例调用 generateClarification 应正常工作', async () => {
    const engine = createConversationEngine();
    const context = await engine.getContext('engine-clarify');
    const clarification = await engine.generateClarification(context);
    expect(typeof clarification).toBe('string');
    expect(clarification.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 集成场景测试
// ============================================================

describe('对话引擎集成场景', () => {
  it('完整对话流程：解析 → 澄清 → 补充', async () => {
    const engine = createConversationEngine();

    // 1. 用户发送不完整指令
    const context = await engine.getContext('flow-session');
    const intent = await engine.parseIntent('帮我做竞品分析');
    context.currentIntent = intent;
    addMessageToContext(context, 'user', '帮我做竞品分析');

    expect(intent.taskType).toBe('competitor_analysis');
    expect(intent.confidence).toBe(0.4); // 只识别到任务类型

    // 2. 生成澄清提示
    const clarification = await engine.generateClarification(context);
    expect(clarification).toContain('平台');
    addMessageToContext(context, 'assistant', clarification);

    // 3. 用户补充信息
    const fullIntent = await engine.parseIntent('帮我分析小红书上美妆赛道的竞品');
    context.currentIntent = fullIntent;
    addMessageToContext(context, 'user', '帮我分析小红书上美妆赛道的竞品');

    expect(fullIntent.confidence).toBe(1.0);

    // 4. 验证对话历史
    const finalContext = await engine.getContext('flow-session');
    expect(finalContext.history).toHaveLength(3);
  });

  it('无效输入不应抛出异常', async () => {
    const engine = createConversationEngine();

    // 各种边界输入都不应抛出异常
    await expect(engine.parseIntent('')).resolves.toBeDefined();
    await expect(engine.parseIntent('   ')).resolves.toBeDefined();
    await expect(engine.parseIntent('!@#$%^&*()')).resolves.toBeDefined();
    await expect(engine.parseIntent('a'.repeat(10000))).resolves.toBeDefined();
  });

  it('无效输入的 generateClarification 不应抛出异常', async () => {
    const engine = createConversationEngine();
    const context: ConversationContext = {
      sessionId: 'invalid-test',
      history: [],
      metadata: {},
    };

    await expect(engine.generateClarification(context)).resolves.toBeDefined();
  });
});
