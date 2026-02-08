/**
 * 任务编排器 - Task Orchestrator
 *
 * 负责将用户意图转化为可执行的任务计划，并按拓扑排序执行任务步骤。
 * 当前实现使用内存存储（Map），后续可替换为 Redis/数据库持久化。
 *
 * 功能：
 * - createPlan: 将 ParsedIntent 转化为带依赖关系的 ExecutionPlan
 * - executePlan: 按拓扑排序执行计划中的任务步骤
 * - getTaskStatus: 查询任务步骤的当前状态
 *
 * Requirements: 1.2, 1.3, 1.5
 */

import type {
  TaskOrchestrator,
  ParsedIntent,
  ExecutionPlan,
  TaskStep,
  TaskType,
  TaskStatus,
  PlanStatus,
} from '../types/index.js';

// ============================================================
// 内存存储
// ============================================================

/** 执行计划存储：planId -> ExecutionPlan */
const planStore = new Map<string, ExecutionPlan>();

/** 任务步骤索引：stepId -> planId（用于快速查找步骤所属计划） */
const stepIndex = new Map<string, string>();

// ============================================================
// ID 生成
// ============================================================

let planCounter = 0;
let stepCounter = 0;

/**
 * 生成唯一的计划 ID
 */
export function generatePlanId(): string {
  planCounter++;
  return `plan-${Date.now()}-${planCounter}`;
}

/**
 * 生成唯一的步骤 ID
 */
export function generateStepId(): string {
  stepCounter++;
  return `step-${Date.now()}-${stepCounter}`;
}

// ============================================================
// 步骤执行器（占位实现）
// ============================================================

/**
 * 步骤执行器类型
 * 实际执行某个任务步骤的函数，返回执行结果
 */
export type StepExecutor = (step: TaskStep) => Promise<unknown>;

/**
 * 默认步骤执行器
 * 模拟执行任务步骤，后续可替换为实际的服务调用
 */
export const defaultStepExecutor: StepExecutor = async (step: TaskStep): Promise<unknown> => {
  // 模拟异步执行
  return {
    stepId: step.id,
    type: step.type,
    message: `Step ${step.id} of type ${step.type} executed successfully`,
    executedAt: new Date(),
  };
};

// ============================================================
// 计划生成逻辑
// ============================================================

/**
 * 任务类型到执行步骤的映射配置
 *
 * 简单任务（如 competitor_analysis）只需一个步骤
 * 复杂任务（如 strategy_generation）需要多个步骤，且有依赖关系
 */
interface StepTemplate {
  type: TaskType;
  descriptionKey: string;
}

interface PlanTemplate {
  steps: StepTemplate[];
  /** 依赖关系：key 是步骤索引，value 是它依赖的步骤索引数组 */
  dependencies: Record<number, number[]>;
}

/**
 * 获取任务类型对应的计划模板
 *
 * 不同任务类型有不同的执行步骤和依赖关系：
 * - competitor_analysis: 单步骤，直接执行竞品分析
 * - trending_tracking: 单步骤，直接获取热点
 * - content_generation: 单步骤，直接生成内容
 * - content_publish: 单步骤，直接发布内容
 * - strategy_generation: 多步骤，先采集竞品数据和热点，再生成策略，最后生成内容
 * - operation_summary: 单步骤，直接生成运营总结
 * - comment_analysis: 单步骤，直接分析评论
 */
export function getPlanTemplate(taskType: TaskType): PlanTemplate {
  switch (taskType) {
    case 'strategy_generation':
      return {
        steps: [
          { type: 'competitor_analysis', descriptionKey: 'collect_competitor_data' },
          { type: 'trending_tracking', descriptionKey: 'collect_trending_data' },
          { type: 'strategy_generation', descriptionKey: 'generate_strategy' },
          { type: 'content_generation', descriptionKey: 'generate_strategy_content' },
        ],
        dependencies: {
          0: [],     // competitor_analysis: 无依赖
          1: [],     // trending_tracking: 无依赖
          2: [0, 1], // strategy_generation: 依赖竞品分析和热点跟踪
          3: [2],    // content_generation: 依赖策略生成
        },
      };

    case 'content_publish':
      return {
        steps: [
          { type: 'content_generation', descriptionKey: 'prepare_content' },
          { type: 'content_publish', descriptionKey: 'publish_content' },
        ],
        dependencies: {
          0: [],  // content_generation: 无依赖
          1: [0], // content_publish: 依赖内容准备
        },
      };

    case 'operation_summary':
      return {
        steps: [
          { type: 'comment_analysis', descriptionKey: 'analyze_comments' },
          { type: 'operation_summary', descriptionKey: 'generate_summary' },
        ],
        dependencies: {
          0: [],  // comment_analysis: 无依赖
          1: [0], // operation_summary: 依赖评论分析
        },
      };

    // 简单任务：单步骤，无依赖
    case 'competitor_analysis':
    case 'trending_tracking':
    case 'content_generation':
    case 'comment_analysis':
    default:
      return {
        steps: [
          { type: taskType, descriptionKey: `execute_${taskType}` },
        ],
        dependencies: {
          0: [],
        },
      };
  }
}

/**
 * 根据意图和模板生成执行计划中的步骤
 */
function buildSteps(intent: ParsedIntent, template: PlanTemplate): TaskStep[] {
  const stepIds: string[] = [];
  const steps: TaskStep[] = [];

  // 第一遍：创建所有步骤并分配 ID
  for (const stepTemplate of template.steps) {
    const id = generateStepId();
    stepIds.push(id);
    steps.push({
      id,
      type: stepTemplate.type,
      dependencies: [], // 稍后填充
      parameters: {
        ...intent.parameters,
        platform: intent.platform,
        category: intent.category,
        descriptionKey: stepTemplate.descriptionKey,
      },
      status: 'pending',
    });
  }

  // 第二遍：填充依赖关系（将索引转换为实际的步骤 ID）
  for (let i = 0; i < steps.length; i++) {
    const depIndices = template.dependencies[i] ?? [];
    steps[i].dependencies = depIndices.map((depIdx) => stepIds[depIdx]);
  }

  return steps;
}

// ============================================================
// 拓扑排序
// ============================================================

/**
 * 对任务步骤进行拓扑排序
 *
 * 使用 Kahn 算法（BFS）实现：
 * 1. 计算每个节点的入度
 * 2. 将入度为 0 的节点加入队列
 * 3. 依次处理队列中的节点，减少其后继节点的入度
 * 4. 重复直到所有节点处理完毕
 *
 * 返回按层分组的步骤 ID 数组，同一层的步骤可以并行执行
 *
 * @throws Error 如果存在循环依赖
 */
export function topologicalSort(steps: TaskStep[]): string[][] {
  const stepMap = new Map<string, TaskStep>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // 初始化
  for (const step of steps) {
    stepMap.set(step.id, step);
    inDegree.set(step.id, 0);
    adjacency.set(step.id, []);
  }

  // 构建邻接表和入度
  for (const step of steps) {
    for (const depId of step.dependencies) {
      if (!stepMap.has(depId)) {
        throw new Error(`Dependency step "${depId}" not found in plan`);
      }
      const adj = adjacency.get(depId)!;
      adj.push(step.id);
      inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
    }
  }

  // BFS 按层分组
  const layers: string[][] = [];
  let queue: string[] = [];

  // 找到所有入度为 0 的节点
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  let processedCount = 0;

  while (queue.length > 0) {
    layers.push([...queue]);
    processedCount += queue.length;

    const nextQueue: string[] = [];
    for (const nodeId of queue) {
      const successors = adjacency.get(nodeId) ?? [];
      for (const succId of successors) {
        const newDegree = (inDegree.get(succId) ?? 1) - 1;
        inDegree.set(succId, newDegree);
        if (newDegree === 0) {
          nextQueue.push(succId);
        }
      }
    }
    queue = nextQueue;
  }

  if (processedCount !== steps.length) {
    throw new Error('Circular dependency detected in execution plan');
  }

  return layers;
}

// ============================================================
// 核心方法实现
// ============================================================

/**
 * 根据解析后的意图创建执行计划
 *
 * 1. 根据意图的 taskType 获取计划模板
 * 2. 基于模板生成带依赖关系的步骤
 * 3. 存储计划到内存
 * 4. 建立步骤 ID 到计划 ID 的索引
 */
export async function createPlan(intent: ParsedIntent): Promise<ExecutionPlan> {
  const template = getPlanTemplate(intent.taskType);
  const steps = buildSteps(intent, template);
  const planId = generatePlanId();

  const plan: ExecutionPlan = {
    id: planId,
    steps,
    status: 'pending',
    createdAt: new Date(),
  };

  // 存储计划
  planStore.set(planId, plan);

  // 建立步骤索引
  for (const step of steps) {
    stepIndex.set(step.id, planId);
  }

  return plan;
}

/**
 * 执行指定的计划
 *
 * 1. 查找计划
 * 2. 对步骤进行拓扑排序，得到按层分组的执行顺序
 * 3. 逐层执行：同一层的步骤并行执行，层间串行
 * 4. 如果某个步骤失败，标记所有依赖它的后续步骤为 failed
 * 5. 所有步骤完成后更新计划状态
 *
 * @throws Error 如果计划不存在
 */
export async function executePlan(
  planId: string,
  executor: StepExecutor = defaultStepExecutor
): Promise<void> {
  const plan = planStore.get(planId);
  if (!plan) {
    throw new Error(`Plan "${planId}" not found`);
  }

  plan.status = 'running';

  const stepMap = new Map<string, TaskStep>();
  for (const step of plan.steps) {
    stepMap.set(step.id, step);
  }

  // 拓扑排序
  const layers = topologicalSort(plan.steps);

  // 跟踪失败的步骤 ID
  const failedStepIds = new Set<string>();

  // 逐层执行
  for (const layer of layers) {
    const layerPromises = layer.map(async (stepId) => {
      const step = stepMap.get(stepId)!;

      // 检查是否有依赖步骤失败
      const hasFailedDependency = step.dependencies.some((depId) =>
        failedStepIds.has(depId)
      );

      if (hasFailedDependency) {
        step.status = 'failed';
        step.result = { error: 'Dependency step failed' };
        failedStepIds.add(stepId);
        return;
      }

      // 执行步骤
      step.status = 'running';
      try {
        const result = await executor(step);
        step.status = 'completed';
        step.result = result;
      } catch (error) {
        step.status = 'failed';
        step.result = {
          error: error instanceof Error ? error.message : String(error),
        };
        failedStepIds.add(stepId);
      }
    });

    await Promise.all(layerPromises);
  }

  // 更新计划状态
  const hasFailedSteps = plan.steps.some((s) => s.status === 'failed');
  const allCompleted = plan.steps.every((s) => s.status === 'completed');

  if (allCompleted) {
    plan.status = 'completed';
  } else if (hasFailedSteps) {
    plan.status = 'failed';
  }
}

/**
 * 查询任务步骤的当前状态
 *
 * 通过步骤索引找到所属计划，再从计划中查找步骤状态
 *
 * @throws Error 如果步骤不存在
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const planId = stepIndex.get(taskId);
  if (!planId) {
    throw new Error(`Task step "${taskId}" not found`);
  }

  const plan = planStore.get(planId);
  if (!plan) {
    throw new Error(`Plan "${planId}" not found for task step "${taskId}"`);
  }

  const step = plan.steps.find((s) => s.id === taskId);
  if (!step) {
    throw new Error(`Task step "${taskId}" not found in plan "${planId}"`);
  }

  return step.status;
}

// ============================================================
// 辅助方法
// ============================================================

/**
 * 获取指定计划
 */
export function getPlan(planId: string): ExecutionPlan | undefined {
  return planStore.get(planId);
}

/**
 * 获取所有计划
 */
export function getAllPlans(): ExecutionPlan[] {
  return Array.from(planStore.values());
}

/**
 * 创建任务编排器实例
 */
export function createTaskOrchestrator(executor?: StepExecutor): TaskOrchestrator {
  return {
    createPlan,
    executePlan: (planId: string) => executePlan(planId, executor),
    getTaskStatus,
  };
}

/**
 * 清除所有存储数据（主要用于测试）
 */
export function clearAllPlans(): void {
  planStore.clear();
  stepIndex.clear();
  planCounter = 0;
  stepCounter = 0;
}
