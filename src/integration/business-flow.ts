/**
 * 业务流程集成模块 - Business Flow Integration
 *
 * 串联系统各服务模块，实现完整的端到端业务流程：
 *
 * Flow 1: 对话指令 → 意图解析 → 任务编排 → 内容生成 → 预览 → 发布
 * Flow 2: 策略生成 → 节点内容生成 → 定时发布的自动化链路
 *
 * 本模块为薄编排层，不重复实现业务逻辑，仅调用已有服务完成流程串联。
 *
 * Requirements: 1.1, 1.2, 1.3, 3.1, 4.1, 5.1
 */

import type {
  ParsedIntent,
  ExecutionPlan,
  Note,
  PublishResult,
  ScheduleResult,
  OperationStrategy,
  Platform,
} from '../types/index.js';

import { parseIntent, generateClarification, getContext } from '../services/conversation-engine.js';
import { createPlan, executePlan } from '../services/task-orchestrator.js';
import { generateNote } from '../services/content-generator.js';
import { publish, schedulePublish } from '../services/publish-channel.js';
import { generateStrategy } from '../services/strategy-planner.js';
import { validateNote } from '../utils/platform-validators.js';

// ============================================================
// 类型定义
// ============================================================

/**
 * 对话到发布完整流程的结果
 */
export interface FlowResult {
  intent: ParsedIntent;
  plan: ExecutionPlan;
  generatedNotes: Note[];
  publishResults: PublishResult[];
  success: boolean;
}

/**
 * 策略到发布完整流程的结果
 */
export interface StrategyFlowResult {
  strategy: OperationStrategy;
  scheduleResults: ScheduleResult[];
  success: boolean;
}

// ============================================================
// Flow 1: 对话指令到发布的完整链路
// ============================================================

/**
 * 执行从对话指令到内容发布的完整业务流程
 *
 * 步骤：
 * 1. 通过 ConversationEngine 解析用户意图
 * 2. 通过 TaskOrchestrator 创建执行计划
 * 3. 执行计划（触发内容生成、竞品分析等子任务）
 * 4. 对 content_generation 类型的任务：通过 ContentGenerator 生成笔记
 * 5. 验证笔记是否达到 publish-ready 状态
 * 6. 通过 PublishChannel 发布笔记
 * 7. 返回包含所有中间输出的完整流程结果
 *
 * 当意图置信度过低（< 0.4）时，流程仍会继续但标记 success 为 false，
 * 并在 plan 中记录低置信度信息。
 *
 * @param userMessage - 用户的自然语言指令
 * @param sessionId - 会话 ID，用于上下文管理
 * @returns FlowResult - 完整流程结果
 */
export async function executeConversationToPublishFlow(
  userMessage: string,
  sessionId: string
): Promise<FlowResult> {
  // Step 1: 解析用户意图
  const intent = await parseIntent(userMessage);

  // 处理低置信度情况：仍然继续流程但记录状态
  if (intent.confidence < 0.4) {
    // 获取上下文并生成澄清提示
    const context = await getContext(sessionId);
    context.currentIntent = intent;
    const clarification = await generateClarification(context);

    // 返回低置信度结果，plan 为空计划
    return {
      intent,
      plan: {
        id: '',
        steps: [],
        status: 'failed',
        createdAt: new Date(),
      },
      generatedNotes: [],
      publishResults: [],
      success: false,
    };
  }

  // Step 2: 创建执行计划
  const plan = await createPlan(intent);

  // Step 3: 执行计划
  await executePlan(plan.id);

  // Step 4: 生成笔记内容
  // 对于包含 content_generation 步骤的计划，生成实际笔记
  const generatedNotes: Note[] = [];
  const contentSteps = plan.steps.filter((step) => step.type === 'content_generation');

  if (contentSteps.length > 0) {
    // 为每个内容生成步骤创建笔记
    for (const step of contentSteps) {
      const note = await generateNote({
        topic: intent.category || '通用内容',
        platform: intent.platform,
        category: intent.category || '通用',
      });
      generatedNotes.push(note);
    }
  } else {
    // 如果计划中没有 content_generation 步骤，但意图是内容相关的，
    // 也生成一个笔记以完成发布流程
    if (intent.taskType === 'content_generation' || intent.taskType === 'content_publish') {
      const note = await generateNote({
        topic: intent.category || '通用内容',
        platform: intent.platform,
        category: intent.category || '通用',
      });
      generatedNotes.push(note);
    }
  }

  // Step 5: 验证笔记是否 publish-ready
  const publishReadyNotes = generatedNotes.filter((note) => {
    const validation = validateNote(note);
    return validation.valid && note.status === 'ready';
  });

  // Step 6: 发布笔记
  const publishResults: PublishResult[] = [];
  for (const note of publishReadyNotes) {
    const result = await publish(note, {
      mode: 'auto',
      platform: intent.platform,
    });
    publishResults.push(result);
  }

  // Step 7: 判断整体成功状态
  const success =
    generatedNotes.length > 0 &&
    publishResults.length > 0 &&
    publishResults.every((r) => r.success);

  return {
    intent,
    plan,
    generatedNotes,
    publishResults,
    success,
  };
}

// ============================================================
// Flow 2: 策略生成到自动发布的链路
// ============================================================

/**
 * 执行从策略生成到自动定时发布的完整业务流程
 *
 * 步骤：
 * 1. 通过 StrategyPlanner 生成运营策略（自动为每个节点生成内容）
 * 2. 验证所有节点是否达到 content_ready 状态
 * 3. 为每个节点根据 scheduledDate 安排定时发布
 * 4. 返回策略和所有发布调度结果
 *
 * @param category - 赛道/领域（如 "美妆"）
 * @param goal - 运营目标（如 "增加粉丝"）
 * @param platform - 目标平台
 * @returns StrategyFlowResult - 完整策略流程结果
 */
export async function executeStrategyToPublishFlow(
  category: string,
  goal: string,
  platform: Platform
): Promise<StrategyFlowResult> {
  // Step 1: 生成运营策略（StrategyPlanner 会自动为每个节点生成内容）
  const strategy = await generateStrategy({
    category,
    goal,
    platform,
    duration: '30days',
  });

  // Step 2: 验证所有节点的内容状态
  const contentReadyNodes = strategy.nodes.filter(
    (node) => node.status === 'content_ready' && node.note != null
  );

  // Step 3: 为每个 content_ready 节点安排定时发布
  const scheduleResults: ScheduleResult[] = [];
  for (const node of contentReadyNodes) {
    if (node.note) {
      const result = await schedulePublish(node.note, node.scheduledDate);
      scheduleResults.push(result);
    }
  }

  // Step 4: 判断整体成功状态
  const success =
    strategy.nodes.length > 0 &&
    contentReadyNodes.length === strategy.nodes.length &&
    scheduleResults.length === contentReadyNodes.length;

  return {
    strategy,
    scheduleResults,
    success,
  };
}
