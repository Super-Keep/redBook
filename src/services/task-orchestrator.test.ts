import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPlan,
  executePlan,
  getTaskStatus,
  getPlan,
  clearAllPlans,
  topologicalSort,
  getPlanTemplate,
  createTaskOrchestrator,
  defaultStepExecutor,
} from './task-orchestrator.js';
import type {
  ParsedIntent,
  TaskStep,
  TaskType,
  Platform,
} from '../types/index.js';

// ============================================================
// 测试辅助函数
// ============================================================

/**
 * 创建一个标准的 ParsedIntent 用于测试
 */
function createTestIntent(overrides?: Partial<ParsedIntent>): ParsedIntent {
  return {
    taskType: 'competitor_analysis',
    platform: 'xiaohongshu',
    category: '美妆',
    parameters: { rawInput: '帮我分析小红书上美妆赛道的竞品' },
    confidence: 1.0,
    ...overrides,
  };
}

// 每个测试前清除所有计划数据
beforeEach(() => {
  clearAllPlans();
});

// ============================================================
// getPlanTemplate 单元测试
// ============================================================

describe('getPlanTemplate', () => {
  it('competitor_analysis 应返回单步骤模板', () => {
    const template = getPlanTemplate('competitor_analysis');
    expect(template.steps).toHaveLength(1);
    expect(template.steps[0].type).toBe('competitor_analysis');
    expect(template.dependencies[0]).toEqual([]);
  });

  it('trending_tracking 应返回单步骤模板', () => {
    const template = getPlanTemplate('trending_tracking');
    expect(template.steps).toHaveLength(1);
    expect(template.steps[0].type).toBe('trending_tracking');
  });

  it('content_generation 应返回单步骤模板', () => {
    const template = getPlanTemplate('content_generation');
    expect(template.steps).toHaveLength(1);
    expect(template.steps[0].type).toBe('content_generation');
  });

  it('comment_analysis 应返回单步骤模板', () => {
    const template = getPlanTemplate('comment_analysis');
    expect(template.steps).toHaveLength(1);
    expect(template.steps[0].type).toBe('comment_analysis');
  });

  it('strategy_generation 应返回多步骤模板（含依赖关系）', () => {
    const template = getPlanTemplate('strategy_generation');
    expect(template.steps.length).toBeGreaterThan(1);

    // 应包含竞品分析、热点跟踪、策略生成、内容生成
    const types = template.steps.map((s) => s.type);
    expect(types).toContain('competitor_analysis');
    expect(types).toContain('trending_tracking');
    expect(types).toContain('strategy_generation');
    expect(types).toContain('content_generation');

    // 策略生成步骤应依赖竞品分析和热点跟踪
    expect(template.dependencies[2]).toEqual([0, 1]);
    // 内容生成步骤应依赖策略生成
    expect(template.dependencies[3]).toEqual([2]);
  });

  it('content_publish 应返回两步骤模板（内容准备 → 发布）', () => {
    const template = getPlanTemplate('content_publish');
    expect(template.steps).toHaveLength(2);
    expect(template.steps[0].type).toBe('content_generation');
    expect(template.steps[1].type).toBe('content_publish');
    expect(template.dependencies[1]).toEqual([0]);
  });

  it('operation_summary 应返回两步骤模板（评论分析 → 总结）', () => {
    const template = getPlanTemplate('operation_summary');
    expect(template.steps).toHaveLength(2);
    expect(template.steps[0].type).toBe('comment_analysis');
    expect(template.steps[1].type).toBe('operation_summary');
    expect(template.dependencies[1]).toEqual([0]);
  });
});

// ============================================================
// createPlan 单元测试
// ============================================================

describe('createPlan', () => {
  it('应为简单任务创建包含一个步骤的计划', async () => {
    const intent = createTestIntent({ taskType: 'competitor_analysis' });
    const plan = await createPlan(intent);

    expect(plan.id).toBeDefined();
    expect(plan.id.startsWith('plan-')).toBe(true);
    expect(plan.steps).toHaveLength(1);
    expect(plan.status).toBe('pending');
    expect(plan.createdAt).toBeInstanceOf(Date);
  });

  it('应为 strategy_generation 创建多步骤计划', async () => {
    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    expect(plan.steps.length).toBe(4);
    expect(plan.steps.every((s) => s.status === 'pending')).toBe(true);
  });

  it('步骤应包含意图中的参数', async () => {
    const intent = createTestIntent({
      taskType: 'content_generation',
      platform: 'douyin',
      category: '美食',
      parameters: { rawInput: '写一篇抖音美食笔记', topic: '火锅' },
    });
    const plan = await createPlan(intent);

    const step = plan.steps[0];
    expect(step.parameters.platform).toBe('douyin');
    expect(step.parameters.category).toBe('美食');
    expect(step.parameters.rawInput).toBe('写一篇抖音美食笔记');
    expect(step.parameters.topic).toBe('火锅');
  });

  it('多步骤计划的依赖关系应正确设置', async () => {
    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    // 前两个步骤无依赖
    expect(plan.steps[0].dependencies).toEqual([]);
    expect(plan.steps[1].dependencies).toEqual([]);

    // 第三个步骤依赖前两个
    expect(plan.steps[2].dependencies).toContain(plan.steps[0].id);
    expect(plan.steps[2].dependencies).toContain(plan.steps[1].id);

    // 第四个步骤依赖第三个
    expect(plan.steps[3].dependencies).toContain(plan.steps[2].id);
  });

  it('每个步骤应有唯一的 ID', async () => {
    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    const ids = plan.steps.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('创建的计划应可通过 getPlan 获取', async () => {
    const intent = createTestIntent();
    const plan = await createPlan(intent);

    const retrieved = getPlan(plan.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(plan.id);
  });

  it('不同计划应有不同的 ID', async () => {
    const plan1 = await createPlan(createTestIntent());
    const plan2 = await createPlan(createTestIntent());

    expect(plan1.id).not.toBe(plan2.id);
  });

  it('所有任务类型都应能创建计划', async () => {
    const taskTypes: TaskType[] = [
      'competitor_analysis',
      'trending_tracking',
      'content_generation',
      'content_publish',
      'strategy_generation',
      'operation_summary',
      'comment_analysis',
    ];

    for (const taskType of taskTypes) {
      const intent = createTestIntent({ taskType });
      const plan = await createPlan(intent);
      expect(plan.steps.length).toBeGreaterThanOrEqual(1);
      expect(plan.status).toBe('pending');
    }
  });
});

// ============================================================
// topologicalSort 单元测试
// ============================================================

describe('topologicalSort', () => {
  it('单步骤应返回一层', () => {
    const steps: TaskStep[] = [
      { id: 'a', type: 'competitor_analysis', dependencies: [], parameters: {}, status: 'pending' },
    ];

    const layers = topologicalSort(steps);
    expect(layers).toEqual([['a']]);
  });

  it('无依赖的多步骤应在同一层', () => {
    const steps: TaskStep[] = [
      { id: 'a', type: 'competitor_analysis', dependencies: [], parameters: {}, status: 'pending' },
      { id: 'b', type: 'trending_tracking', dependencies: [], parameters: {}, status: 'pending' },
    ];

    const layers = topologicalSort(steps);
    expect(layers).toHaveLength(1);
    expect(layers[0]).toContain('a');
    expect(layers[0]).toContain('b');
  });

  it('线性依赖应产生多层', () => {
    const steps: TaskStep[] = [
      { id: 'a', type: 'competitor_analysis', dependencies: [], parameters: {}, status: 'pending' },
      { id: 'b', type: 'strategy_generation', dependencies: ['a'], parameters: {}, status: 'pending' },
      { id: 'c', type: 'content_generation', dependencies: ['b'], parameters: {}, status: 'pending' },
    ];

    const layers = topologicalSort(steps);
    expect(layers).toHaveLength(3);
    expect(layers[0]).toEqual(['a']);
    expect(layers[1]).toEqual(['b']);
    expect(layers[2]).toEqual(['c']);
  });

  it('菱形依赖应正确分层', () => {
    const steps: TaskStep[] = [
      { id: 'a', type: 'competitor_analysis', dependencies: [], parameters: {}, status: 'pending' },
      { id: 'b', type: 'trending_tracking', dependencies: ['a'], parameters: {}, status: 'pending' },
      { id: 'c', type: 'content_generation', dependencies: ['a'], parameters: {}, status: 'pending' },
      { id: 'd', type: 'strategy_generation', dependencies: ['b', 'c'], parameters: {}, status: 'pending' },
    ];

    const layers = topologicalSort(steps);
    expect(layers).toHaveLength(3);
    expect(layers[0]).toEqual(['a']);
    expect(layers[1]).toContain('b');
    expect(layers[1]).toContain('c');
    expect(layers[2]).toEqual(['d']);
  });

  it('应检测循环依赖并抛出错误', () => {
    const steps: TaskStep[] = [
      { id: 'a', type: 'competitor_analysis', dependencies: ['b'], parameters: {}, status: 'pending' },
      { id: 'b', type: 'trending_tracking', dependencies: ['a'], parameters: {}, status: 'pending' },
    ];

    expect(() => topologicalSort(steps)).toThrow('Circular dependency');
  });

  it('应检测不存在的依赖并抛出错误', () => {
    const steps: TaskStep[] = [
      { id: 'a', type: 'competitor_analysis', dependencies: ['nonexistent'], parameters: {}, status: 'pending' },
    ];

    expect(() => topologicalSort(steps)).toThrow('not found');
  });

  it('空步骤列表应返回空层', () => {
    const layers = topologicalSort([]);
    expect(layers).toEqual([]);
  });
});

// ============================================================
// executePlan 单元测试
// ============================================================

describe('executePlan', () => {
  it('应成功执行单步骤计划', async () => {
    const intent = createTestIntent({ taskType: 'competitor_analysis' });
    const plan = await createPlan(intent);

    await executePlan(plan.id);

    const updatedPlan = getPlan(plan.id)!;
    expect(updatedPlan.status).toBe('completed');
    expect(updatedPlan.steps[0].status).toBe('completed');
    expect(updatedPlan.steps[0].result).toBeDefined();
  });

  it('应成功执行多步骤计划', async () => {
    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    await executePlan(plan.id);

    const updatedPlan = getPlan(plan.id)!;
    expect(updatedPlan.status).toBe('completed');
    expect(updatedPlan.steps.every((s) => s.status === 'completed')).toBe(true);
  });

  it('应按拓扑顺序执行步骤', async () => {
    const executionOrder: string[] = [];

    const trackingExecutor = async (step: TaskStep) => {
      executionOrder.push(step.id);
      return { stepId: step.id };
    };

    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    await executePlan(plan.id, trackingExecutor);

    // 验证执行顺序：前两个步骤（无依赖）应在第三个步骤之前
    const step0Idx = executionOrder.indexOf(plan.steps[0].id);
    const step1Idx = executionOrder.indexOf(plan.steps[1].id);
    const step2Idx = executionOrder.indexOf(plan.steps[2].id);
    const step3Idx = executionOrder.indexOf(plan.steps[3].id);

    expect(step0Idx).toBeLessThan(step2Idx);
    expect(step1Idx).toBeLessThan(step2Idx);
    expect(step2Idx).toBeLessThan(step3Idx);
  });

  it('步骤失败时应标记依赖步骤为 failed', async () => {
    const failingExecutor = async (step: TaskStep) => {
      // 让第一个步骤失败
      if (step.type === 'competitor_analysis') {
        throw new Error('Data collection failed');
      }
      return { stepId: step.id };
    };

    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    await executePlan(plan.id, failingExecutor);

    const updatedPlan = getPlan(plan.id)!;
    expect(updatedPlan.status).toBe('failed');

    // 第一个步骤（competitor_analysis）应失败
    expect(updatedPlan.steps[0].status).toBe('failed');

    // 第二个步骤（trending_tracking）无依赖于第一个，应成功
    expect(updatedPlan.steps[1].status).toBe('completed');

    // 第三个步骤（strategy_generation）依赖第一个，应失败
    expect(updatedPlan.steps[2].status).toBe('failed');

    // 第四个步骤（content_generation）依赖第三个，应失败
    expect(updatedPlan.steps[3].status).toBe('failed');
  });

  it('步骤失败时 result 应包含错误信息', async () => {
    const failingExecutor = async (step: TaskStep) => {
      if (step.type === 'content_generation') {
        throw new Error('AI model timeout');
      }
      return { stepId: step.id };
    };

    const intent = createTestIntent({ taskType: 'content_generation' });
    const plan = await createPlan(intent);

    await executePlan(plan.id, failingExecutor);

    const updatedPlan = getPlan(plan.id)!;
    expect(updatedPlan.steps[0].status).toBe('failed');
    expect((updatedPlan.steps[0].result as Record<string, unknown>).error).toBe('AI model timeout');
  });

  it('不存在的计划应抛出错误', async () => {
    await expect(executePlan('nonexistent-plan')).rejects.toThrow('not found');
  });

  it('计划执行期间状态应为 running', async () => {
    let capturedStatus: string | undefined;

    const statusCheckExecutor = async (step: TaskStep) => {
      // 在执行期间检查计划状态
      const plan = getPlan(step.parameters.planId as string);
      if (plan) {
        capturedStatus = plan.status;
      }
      return { stepId: step.id };
    };

    const intent = createTestIntent({ taskType: 'competitor_analysis' });
    const plan = await createPlan(intent);

    // 给步骤添加 planId 参数以便在执行器中查找
    plan.steps[0].parameters.planId = plan.id;

    await executePlan(plan.id, statusCheckExecutor);

    expect(capturedStatus).toBe('running');
  });

  it('使用默认执行器应成功执行', async () => {
    const intent = createTestIntent({ taskType: 'competitor_analysis' });
    const plan = await createPlan(intent);

    await executePlan(plan.id, defaultStepExecutor);

    const updatedPlan = getPlan(plan.id)!;
    expect(updatedPlan.status).toBe('completed');
  });

  it('content_publish 计划应按顺序执行两个步骤', async () => {
    const executionOrder: string[] = [];

    const trackingExecutor = async (step: TaskStep) => {
      executionOrder.push(step.type);
      return { stepId: step.id };
    };

    const intent = createTestIntent({ taskType: 'content_publish' });
    const plan = await createPlan(intent);

    await executePlan(plan.id, trackingExecutor);

    expect(executionOrder[0]).toBe('content_generation');
    expect(executionOrder[1]).toBe('content_publish');
  });
});

// ============================================================
// getTaskStatus 单元测试
// ============================================================

describe('getTaskStatus', () => {
  it('新创建的步骤状态应为 pending', async () => {
    const intent = createTestIntent();
    const plan = await createPlan(intent);

    const status = await getTaskStatus(plan.steps[0].id);
    expect(status).toBe('pending');
  });

  it('执行完成后步骤状态应为 completed', async () => {
    const intent = createTestIntent();
    const plan = await createPlan(intent);

    await executePlan(plan.id);

    const status = await getTaskStatus(plan.steps[0].id);
    expect(status).toBe('completed');
  });

  it('执行失败后步骤状态应为 failed', async () => {
    const failingExecutor = async () => {
      throw new Error('Execution failed');
    };

    const intent = createTestIntent();
    const plan = await createPlan(intent);

    await executePlan(plan.id, failingExecutor);

    const status = await getTaskStatus(plan.steps[0].id);
    expect(status).toBe('failed');
  });

  it('不存在的步骤应抛出错误', async () => {
    await expect(getTaskStatus('nonexistent-step')).rejects.toThrow('not found');
  });

  it('多步骤计划中应能查询每个步骤的状态', async () => {
    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    // 所有步骤初始状态为 pending
    for (const step of plan.steps) {
      const status = await getTaskStatus(step.id);
      expect(status).toBe('pending');
    }

    await executePlan(plan.id);

    // 所有步骤执行后状态为 completed
    for (const step of plan.steps) {
      const status = await getTaskStatus(step.id);
      expect(status).toBe('completed');
    }
  });
});

// ============================================================
// createTaskOrchestrator 单元测试
// ============================================================

describe('createTaskOrchestrator', () => {
  it('应返回包含所有接口方法的对象', () => {
    const orchestrator = createTaskOrchestrator();
    expect(typeof orchestrator.createPlan).toBe('function');
    expect(typeof orchestrator.executePlan).toBe('function');
    expect(typeof orchestrator.getTaskStatus).toBe('function');
  });

  it('通过编排器实例创建和执行计划应正常工作', async () => {
    const orchestrator = createTaskOrchestrator();
    const intent = createTestIntent();
    const plan = await orchestrator.createPlan(intent);

    expect(plan.id).toBeDefined();
    expect(plan.steps.length).toBeGreaterThanOrEqual(1);

    await orchestrator.executePlan(plan.id);

    const status = await orchestrator.getTaskStatus(plan.steps[0].id);
    expect(status).toBe('completed');
  });

  it('应支持自定义执行器', async () => {
    let executorCalled = false;
    const customExecutor = async (step: TaskStep) => {
      executorCalled = true;
      return { custom: true, stepId: step.id };
    };

    const orchestrator = createTaskOrchestrator(customExecutor);
    const intent = createTestIntent();
    const plan = await orchestrator.createPlan(intent);

    await orchestrator.executePlan(plan.id);

    expect(executorCalled).toBe(true);
  });
});

// ============================================================
// 错误处理测试
// ============================================================

describe('错误处理', () => {
  it('非 Error 类型的异常应被正确捕获', async () => {
    const stringThrowExecutor = async () => {
      throw 'string error';
    };

    const intent = createTestIntent();
    const plan = await createPlan(intent);

    await executePlan(plan.id, stringThrowExecutor);

    const updatedPlan = getPlan(plan.id)!;
    expect(updatedPlan.steps[0].status).toBe('failed');
    expect((updatedPlan.steps[0].result as Record<string, unknown>).error).toBe('string error');
  });

  it('级联失败应正确传播', async () => {
    // 让 trending_tracking 步骤失败
    const selectiveFailExecutor = async (step: TaskStep) => {
      if (step.type === 'trending_tracking') {
        throw new Error('Trending API unavailable');
      }
      return { stepId: step.id };
    };

    const intent = createTestIntent({ taskType: 'strategy_generation' });
    const plan = await createPlan(intent);

    await executePlan(plan.id, selectiveFailExecutor);

    const updatedPlan = getPlan(plan.id)!;

    // competitor_analysis 应成功（无依赖于 trending_tracking）
    expect(updatedPlan.steps[0].status).toBe('completed');

    // trending_tracking 应失败
    expect(updatedPlan.steps[1].status).toBe('failed');

    // strategy_generation 依赖 trending_tracking，应失败
    expect(updatedPlan.steps[2].status).toBe('failed');

    // content_generation 依赖 strategy_generation，应失败
    expect(updatedPlan.steps[3].status).toBe('failed');
  });
});

// ============================================================
// 集成场景测试
// ============================================================

describe('任务编排器集成场景', () => {
  it('完整流程：创建计划 → 执行 → 查询状态', async () => {
    const intent = createTestIntent({
      taskType: 'strategy_generation',
      platform: 'douyin',
      category: '美食',
    });

    // 1. 创建计划
    const plan = await createPlan(intent);
    expect(plan.status).toBe('pending');
    expect(plan.steps.length).toBe(4);

    // 2. 执行计划
    await executePlan(plan.id);

    // 3. 查询状态
    const updatedPlan = getPlan(plan.id)!;
    expect(updatedPlan.status).toBe('completed');

    for (const step of updatedPlan.steps) {
      const status = await getTaskStatus(step.id);
      expect(status).toBe('completed');
    }
  });

  it('多个计划应独立运行', async () => {
    const plan1 = await createPlan(createTestIntent({ taskType: 'competitor_analysis' }));
    const plan2 = await createPlan(createTestIntent({ taskType: 'content_generation' }));

    // 只执行第一个计划
    await executePlan(plan1.id);

    expect(getPlan(plan1.id)!.status).toBe('completed');
    expect(getPlan(plan2.id)!.status).toBe('pending');
  });

  it('所有平台的意图都应能创建和执行计划', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const intent = createTestIntent({ platform });
      const plan = await createPlan(intent);
      await executePlan(plan.id);

      expect(getPlan(plan.id)!.status).toBe('completed');
    }
  });
});
