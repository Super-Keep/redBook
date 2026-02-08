/**
 * 业务流程集成测试
 *
 * 测试完整的端到端业务流程：
 * 1. 对话指令 → 意图解析 → 任务编排 → 内容生成 → 发布
 * 2. 策略生成 → 节点内容生成 → 定时发布
 *
 * Requirements: 1.1, 1.2, 1.3, 3.1, 4.1, 5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeConversationToPublishFlow,
  executeStrategyToPublishFlow,
} from './business-flow.js';
import type { FlowResult, StrategyFlowResult } from './business-flow.js';
import { clearAllPlans } from '../services/task-orchestrator.js';
import { clearNoteStore } from '../services/content-generator.js';
import { clearPublishStores } from '../services/publish-channel.js';
import { clearStrategyStore } from '../services/strategy-planner.js';
import { clearAllContexts } from '../services/conversation-engine.js';

// ============================================================
// 测试辅助
// ============================================================

/**
 * 清理所有服务的内存存储，确保测试隔离
 */
function cleanupAllStores(): void {
  clearAllPlans();
  clearNoteStore();
  clearPublishStores();
  clearStrategyStore();
  clearAllContexts();
}

// ============================================================
// 测试套件
// ============================================================

describe('业务流程集成测试', () => {
  beforeEach(() => {
    cleanupAllStores();
  });

  // ----------------------------------------------------------
  // Flow 1: 对话指令到发布的完整链路
  // ----------------------------------------------------------

  describe('Flow 1: 对话指令到发布的完整链路', () => {
    it('应完成从对话指令到发布的完整流程', async () => {
      const userMessage = '帮我生成一篇小红书美妆笔记并发布';
      const sessionId = 'test-session-1';

      const result: FlowResult = await executeConversationToPublishFlow(
        userMessage,
        sessionId
      );

      // 验证意图解析
      expect(result.intent).toBeDefined();
      expect(result.intent.confidence).toBeGreaterThan(0);
      expect(result.intent.platform).toBe('xiaohongshu');
      expect(result.intent.category).toBe('美妆');

      // 验证执行计划
      expect(result.plan).toBeDefined();
      expect(result.plan.id).toBeTruthy();
      expect(result.plan.steps.length).toBeGreaterThan(0);

      // 验证内容生成
      expect(result.generatedNotes.length).toBeGreaterThan(0);
      for (const note of result.generatedNotes) {
        expect(note.id).toBeTruthy();
        expect(note.title).toBeTruthy();
        expect(note.textContent).toBeTruthy();
        expect(note.platform).toBe('xiaohongshu');
        expect(note.tags.length).toBeGreaterThan(0);
        expect(note.images.length).toBeGreaterThan(0);
        expect(note.platformPreview).toBeDefined();
      }

      // 验证发布结果
      expect(result.publishResults.length).toBeGreaterThan(0);
      for (const publishResult of result.publishResults) {
        expect(publishResult.success).toBe(true);
        expect(publishResult.publishId).toBeTruthy();
        expect(publishResult.platformUrl).toBeTruthy();
        expect(publishResult.publishedAt).toBeInstanceOf(Date);
      }

      // 验证整体成功
      expect(result.success).toBe(true);
    });

    it('应处理低置信度输入并优雅降级', async () => {
      // 使用无法识别的输入
      const userMessage = 'hello world';
      const sessionId = 'test-session-low-confidence';

      const result: FlowResult = await executeConversationToPublishFlow(
        userMessage,
        sessionId
      );

      // 验证意图解析返回了结果（即使置信度低）
      expect(result.intent).toBeDefined();
      expect(result.intent.confidence).toBeLessThan(0.4);

      // 验证流程优雅降级
      expect(result.success).toBe(false);
      expect(result.generatedNotes).toHaveLength(0);
      expect(result.publishResults).toHaveLength(0);

      // 验证 plan 为空计划
      expect(result.plan.steps).toHaveLength(0);
      expect(result.plan.status).toBe('failed');
    });

    it('应正确处理纯内容生成指令', async () => {
      const userMessage = '帮我写一篇抖音美食笔记';
      const sessionId = 'test-session-content-gen';

      const result: FlowResult = await executeConversationToPublishFlow(
        userMessage,
        sessionId
      );

      // 验证意图解析
      expect(result.intent.taskType).toBe('content_generation');
      expect(result.intent.platform).toBe('douyin');
      expect(result.intent.category).toBe('美食');

      // 验证生成了笔记
      expect(result.generatedNotes.length).toBeGreaterThan(0);
      expect(result.generatedNotes[0].platform).toBe('douyin');

      // 验证发布成功
      expect(result.publishResults.length).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Flow 2: 策略生成到自动发布的链路
  // ----------------------------------------------------------

  describe('Flow 2: 策略生成到自动发布的链路', () => {
    it('应完成从策略生成到定时发布的完整流程', async () => {
      const result: StrategyFlowResult = await executeStrategyToPublishFlow(
        '美妆',
        '增加粉丝',
        'xiaohongshu'
      );

      // 验证策略生成
      expect(result.strategy).toBeDefined();
      expect(result.strategy.id).toBeTruthy();
      expect(result.strategy.category).toBe('美妆');
      expect(result.strategy.goal).toBe('增加粉丝');
      expect(result.strategy.publishReady).toBe(true);
      expect(result.strategy.nodes.length).toBeGreaterThan(0);

      // 验证所有节点都有内容
      for (const node of result.strategy.nodes) {
        expect(node.id).toBeTruthy();
        expect(node.topic).toBeTruthy();
        expect(node.scheduledDate).toBeInstanceOf(Date);
        expect(node.contentType).toBeTruthy();
        expect(node.frequency).toBeTruthy();
        expect(node.expectedEffect).toBeTruthy();
        expect(node.note).toBeDefined();
        expect(node.status).toBe('content_ready');
      }

      // 验证定时发布调度
      expect(result.scheduleResults.length).toBe(result.strategy.nodes.length);
      for (const scheduleResult of result.scheduleResults) {
        expect(scheduleResult.scheduleId).toBeTruthy();
        expect(scheduleResult.scheduledTime).toBeInstanceOf(Date);
        expect(scheduleResult.noteId).toBeTruthy();
        expect(scheduleResult.status).toBe('scheduled');
      }

      // 验证整体成功
      expect(result.success).toBe(true);
    });

    it('应为所有策略节点生成内容', async () => {
      const result: StrategyFlowResult = await executeStrategyToPublishFlow(
        '美食',
        '提升互动率',
        'douyin'
      );

      // 验证每个节点都有关联的笔记
      const nodesWithContent = result.strategy.nodes.filter(
        (node) => node.note != null
      );
      expect(nodesWithContent.length).toBe(result.strategy.nodes.length);

      // 验证每个笔记的内容完整性
      for (const node of nodesWithContent) {
        const note = node.note!;
        expect(note.title).toBeTruthy();
        expect(note.textContent).toBeTruthy();
        expect(note.images.length).toBeGreaterThan(0);
        expect(note.tags.length).toBeGreaterThan(0);
        expect(note.platformPreview).toBeDefined();
      }

      // 验证所有节点的定时发布都已安排
      expect(result.scheduleResults.length).toBe(result.strategy.nodes.length);
    });

    it('策略节点的定时发布时间应与 scheduledDate 一致', async () => {
      const result: StrategyFlowResult = await executeStrategyToPublishFlow(
        '科技',
        '建立品牌影响力',
        'weibo'
      );

      // 验证每个调度结果的时间与对应节点的 scheduledDate 一致
      const contentReadyNodes = result.strategy.nodes.filter(
        (node) => node.status === 'content_ready' && node.note != null
      );

      for (let i = 0; i < result.scheduleResults.length; i++) {
        const scheduleResult = result.scheduleResults[i];
        const node = contentReadyNodes[i];

        expect(scheduleResult.scheduledTime.getTime()).toBe(
          node.scheduledDate.getTime()
        );
        expect(scheduleResult.noteId).toBe(node.note!.id);
      }
    });
  });
});
