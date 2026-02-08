/**
 * 对话引擎 - 意图解析器
 *
 * 负责自然语言理解和意图识别，通过关键词模式匹配解析用户指令。
 * 当前实现为基于规则的解析器（占位），后续可替换为 AI 模型调用。
 *
 * 功能：
 * - parseIntent: 解析用户自然语言指令，识别任务类型、平台、赛道等参数
 * - generateClarification: 根据对话上下文生成澄清提示
 * - getContext: 管理基于内存的对话上下文
 *
 * Requirements: 1.1, 1.4
 */

import type {
  ConversationEngine,
  ConversationContext,
  ConversationMessage,
  ParsedIntent,
  TaskType,
  Platform,
} from '../types/index.js';

// ============================================================
// 关键词映射配置
// ============================================================

/**
 * 任务类型关键词映射
 * 每个任务类型对应一组中文关键词，用于从用户输入中识别意图
 */
export const TASK_TYPE_KEYWORDS: Record<TaskType, string[]> = {
  competitor_analysis: ['竞品分析', '竞品', '竞争对手', '分析竞品', '对手分析', '竞品调研'],
  trending_tracking: ['热点', '热门', '趋势', '热搜', '热点跟踪', '追踪热点', '热点追踪'],
  content_generation: ['生成内容', '写笔记', '创建内容', '生成笔记', '写文案', '内容生成', '创作', '写一篇', '生成一篇'],
  content_publish: ['发布', '发送', '推送', '上传', '发布内容', '发布笔记'],
  strategy_generation: ['运营策略', '策略', '运营计划', '生成策略', '制定策略', '运营方案'],
  operation_summary: ['运营总结', '运营报告', '数据总结', '运营摘要', '数据报告', '运营分析'],
  comment_analysis: ['评论分析', '分析评论', '评论', '用户反馈', '评论情感'],
};

/**
 * 平台关键词映射
 */
export const PLATFORM_KEYWORDS: Record<Platform, string[]> = {
  xiaohongshu: ['小红书', 'xhs', '红书'],
  douyin: ['抖音', 'douyin', 'dy'],
  weibo: ['微博', 'weibo', 'wb'],
  wechat: ['微信', '公众号', 'wechat', 'wx'],
};

// ============================================================
// 解析辅助函数
// ============================================================

/**
 * 从用户输入中识别任务类型
 * 返回匹配到的任务类型，如果没有匹配则返回 null
 */
export function identifyTaskType(input: string): TaskType | null {
  const normalizedInput = input.toLowerCase();

  for (const [taskType, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        return taskType as TaskType;
      }
    }
  }

  return null;
}

/**
 * 从用户输入中识别平台
 * 返回匹配到的平台，如果没有匹配则返回 null
 */
export function identifyPlatform(input: string): Platform | null {
  const normalizedInput = input.toLowerCase();

  for (const [platform, keywords] of Object.entries(PLATFORM_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        return platform as Platform;
      }
    }
  }

  return null;
}

/**
 * 从用户输入中提取赛道/领域信息
 * 使用常见赛道关键词进行匹配
 */
export const CATEGORY_KEYWORDS: string[] = [
  '美妆', '护肤', '穿搭', '时尚', '美食', '旅行', '旅游',
  '健身', '运动', '母婴', '育儿', '家居', '装修',
  '数码', '科技', '教育', '学习', '职场', '理财',
  '宠物', '摄影', '音乐', '游戏', '汽车', '医疗', '健康',
];

export function extractCategory(input: string): string {
  const normalizedInput = input.toLowerCase();

  for (const category of CATEGORY_KEYWORDS) {
    if (normalizedInput.includes(category.toLowerCase())) {
      return category;
    }
  }

  return '';
}

/**
 * 计算意图解析的置信度
 * 基于识别到的参数数量计算：
 * - 识别到 taskType: +0.4
 * - 识别到 platform: +0.3
 * - 识别到 category: +0.3
 * 最终值在 0~1 之间
 */
export function calculateConfidence(
  taskType: TaskType | null,
  platform: Platform | null,
  category: string
): number {
  let confidence = 0;

  if (taskType !== null) {
    confidence += 0.4;
  }
  if (platform !== null) {
    confidence += 0.3;
  }
  if (category.length > 0) {
    confidence += 0.3;
  }

  return confidence;
}

// ============================================================
// 对话引擎实现
// ============================================================

/**
 * 内存中的会话存储
 */
const sessionStore = new Map<string, ConversationContext>();

/**
 * 创建对话引擎实例
 */
export function createConversationEngine(): ConversationEngine {
  return {
    parseIntent,
    generateClarification,
    getContext,
  };
}

/**
 * 解析用户输入，返回结构化意图
 *
 * 通过关键词模式匹配识别：
 * 1. 任务类型（TaskType）
 * 2. 目标平台（Platform）
 * 3. 赛道/领域（category）
 * 4. 置信度（confidence）
 *
 * 当无法识别任务类型时，默认返回 content_generation，置信度为 0
 */
export async function parseIntent(input: string): Promise<ParsedIntent> {
  const trimmedInput = input.trim();

  const taskType = identifyTaskType(trimmedInput);
  const platform = identifyPlatform(trimmedInput);
  const category = extractCategory(trimmedInput);
  const confidence = calculateConfidence(taskType, platform, category);

  return {
    taskType: taskType ?? 'content_generation',
    platform: platform ?? 'xiaohongshu',
    category,
    parameters: {
      rawInput: trimmedInput,
    },
    confidence,
  };
}

/**
 * 根据对话上下文生成澄清提示
 *
 * 分析当前意图中缺失的信息，生成引导性提示帮助用户补充：
 * - 缺少任务类型：提示用户说明想要执行的操作
 * - 缺少平台：提示用户指定目标平台
 * - 缺少赛道：提示用户说明内容领域
 * - 完全无法解析：返回通用引导提示
 */
export async function generateClarification(
  context: ConversationContext
): Promise<string> {
  const intent = context.currentIntent;

  // 如果没有当前意图或置信度为 0，返回通用引导
  if (!intent || intent.confidence === 0) {
    return '抱歉，我没有理解您的指令。您可以尝试以下操作：\n' +
      '1. 竞品分析 - 例如："帮我分析小红书上美妆赛道的竞品"\n' +
      '2. 热点跟踪 - 例如："查看抖音上的热门话题"\n' +
      '3. 内容生成 - 例如："帮我写一篇小红书美妆笔记"\n' +
      '4. 内容发布 - 例如："发布这篇笔记到小红书"\n' +
      '5. 运营策略 - 例如："制定一个小红书美妆运营策略"\n' +
      '6. 运营总结 - 例如："生成本周运营数据报告"\n' +
      '7. 评论分析 - 例如："分析最近笔记的评论"';
  }

  const missingParts: string[] = [];

  // 检查置信度各部分，判断缺失信息
  if (intent.confidence < 1.0) {
    // 检查是否缺少有效的任务类型（confidence < 0.4 说明 taskType 未被识别）
    if (intent.confidence < 0.4 || identifyTaskType(String(intent.parameters.rawInput ?? '')) === null) {
      missingParts.push('请说明您想要执行的操作类型（如：竞品分析、内容生成、热点跟踪等）');
    }

    // 检查是否缺少平台
    if (identifyPlatform(String(intent.parameters.rawInput ?? '')) === null) {
      missingParts.push('请指定目标平台（小红书、抖音、微博、微信）');
    }

    // 检查是否缺少赛道
    if (!intent.category || intent.category.length === 0) {
      missingParts.push('请说明内容赛道/领域（如：美妆、美食、旅行、科技等）');
    }
  }

  if (missingParts.length === 0) {
    return '您的指令已理解，正在为您处理。';
  }

  return '为了更好地为您服务，请补充以下信息：\n' +
    missingParts.map((part, index) => `${index + 1}. ${part}`).join('\n');
}

/**
 * 获取或创建对话上下文
 *
 * 基于 sessionId 从内存存储中获取会话上下文。
 * 如果会话不存在，则创建新的空上下文。
 */
export async function getContext(sessionId: string): Promise<ConversationContext> {
  const existing = sessionStore.get(sessionId);
  if (existing) {
    return existing;
  }

  const newContext: ConversationContext = {
    sessionId,
    history: [],
    metadata: {},
  };

  sessionStore.set(sessionId, newContext);
  return newContext;
}

/**
 * 向会话上下文中添加消息
 * 辅助函数，用于维护对话历史
 */
export function addMessageToContext(
  context: ConversationContext,
  role: ConversationMessage['role'],
  content: string
): void {
  context.history.push({
    role,
    content,
    timestamp: new Date(),
  });
  sessionStore.set(context.sessionId, context);
}

/**
 * 清除指定会话的上下文
 */
export function clearContext(sessionId: string): void {
  sessionStore.delete(sessionId);
}

/**
 * 清除所有会话上下文（主要用于测试）
 */
export function clearAllContexts(): void {
  sessionStore.clear();
}
