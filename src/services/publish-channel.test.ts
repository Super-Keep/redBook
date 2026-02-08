import { describe, it, expect, beforeEach } from 'vitest';
import {
  publish,
  schedulePublish,
  retryPublish,
  createPublishChannel,
  getPublishRecordStore,
  getScheduledTaskStore,
  clearPublishStores,
} from './publish-channel.js';
import type { Note, PublishOptions, Platform } from '../types/index.js';

// ============================================================
// 测试辅助函数
// ============================================================

/**
 * 创建一个有效的测试笔记
 */
function createTestNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? `note-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: '测试笔记标题',
    textContent: '这是一篇测试笔记的内容，用于验证发布通道功能。',
    images: [
      {
        id: 'img-1',
        noteId: 'note-test',
        url: 'https://images.example.com/test.jpg',
        width: 1080,
        height: 1080,
        altText: '测试图片',
      },
    ],
    tags: ['#测试', '#发布'],
    platform: 'xiaohongshu',
    status: 'ready',
    platformPreview: {
      platform: 'xiaohongshu',
      layout: { type: 'card', title: '测试笔记标题' },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================
// 测试前清理
// ============================================================

beforeEach(() => {
  clearPublishStores();
});

// ============================================================
// publish 单元测试
// ============================================================

describe('publish', () => {
  it('应成功发布有效笔记并返回包含 platformUrl 和 publishedAt 的结果', async () => {
    const note = createTestNote();
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(true);
    expect(result.publishId).toBeDefined();
    expect(result.publishId.length).toBeGreaterThan(0);
    expect(result.platformUrl).toBeDefined();
    expect(result.platformUrl!.length).toBeGreaterThan(0);
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it('成功发布时 platformUrl 应包含平台域名', async () => {
    const note = createTestNote();
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(true);
    expect(result.platformUrl).toContain('xiaohongshu.com');
  });

  it('应支持 auto 发布模式', async () => {
    const note = createTestNote();
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(true);
    expect(result.publishId).toBeDefined();
  });

  it('应支持 manual 发布模式', async () => {
    const note = createTestNote();
    const options: PublishOptions = { mode: 'manual', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(true);
    expect(result.publishId).toBeDefined();
  });

  it('验证失败的笔记应返回 success=false 和非空 error', async () => {
    // 创建一个标题过长的无效笔记（小红书标题限制 20 字符）
    const note = createTestNote({
      title: '这是一个非常非常非常非常非常非常非常长的标题超过了平台限制',
    });
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.length).toBeGreaterThan(0);
    expect(result.publishId).toBeDefined();
  });

  it('发布失败时不应包含 platformUrl', async () => {
    const note = createTestNote({
      title: '这是一个非常非常非常非常非常非常非常长的标题超过了平台限制',
    });
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(false);
    expect(result.platformUrl).toBeUndefined();
  });

  it('模拟发布失败时应返回 error 字段', async () => {
    // noteId 包含 'fail' 会触发模拟失败
    const note = createTestNote({ id: 'note-fail-test' });
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.length).toBeGreaterThan(0);
  });

  it('应将发布结果记录到 PublishRecord', async () => {
    const note = createTestNote();
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);
    const store = getPublishRecordStore();

    expect(store.has(result.publishId)).toBe(true);
    const record = store.get(result.publishId)!;
    expect(record.noteId).toBe(note.id);
    expect(record.platform).toBe('xiaohongshu');
    expect(record.success).toBe(true);
    expect(record.platformUrl).toBeDefined();
    expect(record.publishedAt).toBeInstanceOf(Date);
  });

  it('失败的发布也应记录到 PublishRecord', async () => {
    const note = createTestNote({ id: 'note-fail-record' });
    const options: PublishOptions = { mode: 'auto', platform: 'douyin' };

    const result = await publish(note, options);
    const store = getPublishRecordStore();

    expect(store.has(result.publishId)).toBe(true);
    const record = store.get(result.publishId)!;
    expect(record.success).toBe(false);
    expect(record.error).toBeDefined();
  });

  it('应支持所有平台的发布', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const note = createTestNote({
        id: `note-${platform}-${Date.now()}`,
        platform,
        platformPreview: {
          platform,
          layout: { type: 'card', title: '测试' },
        },
      });
      const options: PublishOptions = { mode: 'auto', platform };

      const result = await publish(note, options);

      expect(result.publishId).toBeDefined();
      // 成功的发布应包含对应平台的 URL
      if (result.success) {
        expect(result.platformUrl).toBeDefined();
      }
    }
  });

  it('每次发布应生成唯一的 publishId', async () => {
    const note1 = createTestNote({ id: 'note-unique-1' });
    const note2 = createTestNote({ id: 'note-unique-2' });
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result1 = await publish(note1, options);
    const result2 = await publish(note2, options);

    expect(result1.publishId).not.toBe(result2.publishId);
  });
});

// ============================================================
// schedulePublish 单元测试
// ============================================================

describe('schedulePublish', () => {
  it('应返回包含 scheduleId、scheduledTime 和 noteId 的结果', async () => {
    const note = createTestNote();
    const scheduledTime = new Date('2025-01-15T10:00:00Z');

    const result = await schedulePublish(note, scheduledTime);

    expect(result.scheduleId).toBeDefined();
    expect(result.scheduleId.length).toBeGreaterThan(0);
    expect(result.scheduledTime).toEqual(scheduledTime);
    expect(result.noteId).toBe(note.id);
    expect(result.status).toBe('scheduled');
  });

  it('返回的 scheduledTime 应与输入完全一致', async () => {
    const note = createTestNote();
    const scheduledTime = new Date('2025-06-20T14:30:00Z');

    const result = await schedulePublish(note, scheduledTime);

    expect(result.scheduledTime.getTime()).toBe(scheduledTime.getTime());
  });

  it('应将定时任务存储到内存中', async () => {
    const note = createTestNote();
    const scheduledTime = new Date('2025-03-01T08:00:00Z');

    const result = await schedulePublish(note, scheduledTime);
    const store = getScheduledTaskStore();

    expect(store.has(result.scheduleId)).toBe(true);
    const task = store.get(result.scheduleId)!;
    expect(task.note.id).toBe(note.id);
    expect(task.scheduledTime.getTime()).toBe(scheduledTime.getTime());
    expect(task.status).toBe('scheduled');
  });

  it('每次调度应生成唯一的 scheduleId', async () => {
    const note = createTestNote();
    const time1 = new Date('2025-01-10T10:00:00Z');
    const time2 = new Date('2025-01-11T10:00:00Z');

    const result1 = await schedulePublish(note, time1);
    const result2 = await schedulePublish(note, time2);

    expect(result1.scheduleId).not.toBe(result2.scheduleId);
  });

  it('应支持不同时间的多个定时任务', async () => {
    const note1 = createTestNote({ id: 'note-sched-1' });
    const note2 = createTestNote({ id: 'note-sched-2' });
    const time1 = new Date('2025-02-01T09:00:00Z');
    const time2 = new Date('2025-02-01T15:00:00Z');

    const result1 = await schedulePublish(note1, time1);
    const result2 = await schedulePublish(note2, time2);

    const store = getScheduledTaskStore();
    expect(store.size).toBe(2);
    expect(result1.noteId).toBe('note-sched-1');
    expect(result2.noteId).toBe('note-sched-2');
  });
});

// ============================================================
// retryPublish 单元测试
// ============================================================

describe('retryPublish', () => {
  it('应成功重试失败的发布', async () => {
    // 先创建一个失败的发布记录
    const note = createTestNote({ id: 'note-fail-retry' });
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };
    const failedResult = await publish(note, options);

    expect(failedResult.success).toBe(false);

    // 重试
    const retryResult = await retryPublish(failedResult.publishId);

    expect(retryResult.success).toBe(true);
    expect(retryResult.platformUrl).toBeDefined();
    expect(retryResult.platformUrl!.length).toBeGreaterThan(0);
    expect(retryResult.publishedAt).toBeInstanceOf(Date);
  });

  it('重试成功后应创建新的发布记录', async () => {
    const note = createTestNote({ id: 'note-fail-newrecord' });
    const options: PublishOptions = { mode: 'auto', platform: 'douyin' };
    const failedResult = await publish(note, options);

    const retryResult = await retryPublish(failedResult.publishId);
    const store = getPublishRecordStore();

    // 应有两条记录：原始失败 + 重试成功
    expect(store.size).toBe(2);
    expect(store.has(retryResult.publishId)).toBe(true);
    const retryRecord = store.get(retryResult.publishId)!;
    expect(retryRecord.success).toBe(true);
  });

  it('对不存在的 publishId 重试应返回失败', async () => {
    const result = await retryPublish('non-existent-publish-id');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('发布记录不存在');
  });

  it('对已成功的发布重试应返回原始成功结果', async () => {
    const note = createTestNote();
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };
    const successResult = await publish(note, options);

    expect(successResult.success).toBe(true);

    // 重试已成功的发布
    const retryResult = await retryPublish(successResult.publishId);

    expect(retryResult.success).toBe(true);
    expect(retryResult.publishId).toBe(successResult.publishId);
    expect(retryResult.platformUrl).toBe(successResult.platformUrl);
  });

  it('不存在的 publishId 重试也应记录到 PublishRecord', async () => {
    const result = await retryPublish('non-existent-id');
    const store = getPublishRecordStore();

    expect(store.has(result.publishId)).toBe(true);
    const record = store.get(result.publishId)!;
    expect(record.success).toBe(false);
  });
});

// ============================================================
// createPublishChannel 工厂函数测试
// ============================================================

describe('createPublishChannel', () => {
  it('应返回包含所有接口方法的对象', () => {
    const channel = createPublishChannel();

    expect(typeof channel.publish).toBe('function');
    expect(typeof channel.schedulePublish).toBe('function');
    expect(typeof channel.retryPublish).toBe('function');
  });

  it('通过实例调用 publish 应正常工作', async () => {
    const channel = createPublishChannel();
    const note = createTestNote();
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await channel.publish(note, options);

    expect(result.publishId).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('通过实例调用 schedulePublish 应正常工作', async () => {
    const channel = createPublishChannel();
    const note = createTestNote();
    const scheduledTime = new Date('2025-05-01T12:00:00Z');

    const result = await channel.schedulePublish(note, scheduledTime);

    expect(result.scheduleId).toBeDefined();
    expect(result.scheduledTime.getTime()).toBe(scheduledTime.getTime());
  });

  it('通过实例调用 retryPublish 应正常工作', async () => {
    const channel = createPublishChannel();
    const note = createTestNote({ id: 'note-fail-factory' });
    const options: PublishOptions = { mode: 'auto', platform: 'weibo' };

    const failedResult = await channel.publish(note, options);
    const retryResult = await channel.retryPublish(failedResult.publishId);

    expect(retryResult.success).toBe(true);
  });
});

// ============================================================
// 发布结果结构正确性测试 (Property 12)
// ============================================================

describe('发布结果结构正确性', () => {
  it('成功发布时 PublishResult 应包含非空 platformUrl 和 publishedAt', async () => {
    const note = createTestNote();
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(true);
    expect(result.platformUrl).toBeDefined();
    expect(typeof result.platformUrl).toBe('string');
    expect(result.platformUrl!.length).toBeGreaterThan(0);
    expect(result.publishedAt).toBeDefined();
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it('失败发布时 PublishResult 应包含非空 error 字段', async () => {
    // 使用验证失败的笔记
    const note = createTestNote({
      title: '这是一个非常非常非常非常非常非常非常长的标题超过了平台限制',
    });
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };

    const result = await publish(note, options);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
    expect(result.error!.length).toBeGreaterThan(0);
  });

  it('模拟平台失败时 PublishResult 应包含非空 error 字段', async () => {
    const note = createTestNote({ id: 'note-fail-structure' });
    const options: PublishOptions = { mode: 'auto', platform: 'douyin' };

    const result = await publish(note, options);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 集成场景测试
// ============================================================

describe('发布通道集成场景', () => {
  it('完整流程：发布 → 失败 → 重试 → 成功', async () => {
    const channel = createPublishChannel();

    // 1. 发布失败
    const note = createTestNote({ id: 'note-fail-integration' });
    const options: PublishOptions = { mode: 'auto', platform: 'xiaohongshu' };
    const failedResult = await channel.publish(note, options);

    expect(failedResult.success).toBe(false);
    expect(failedResult.error).toBeDefined();

    // 2. 重试成功
    const retryResult = await channel.retryPublish(failedResult.publishId);

    expect(retryResult.success).toBe(true);
    expect(retryResult.platformUrl).toBeDefined();
    expect(retryResult.publishedAt).toBeInstanceOf(Date);

    // 3. 验证所有记录都已保存
    const store = getPublishRecordStore();
    expect(store.size).toBe(2);
  });

  it('定时发布流程：调度 → 验证存储', async () => {
    const channel = createPublishChannel();
    const note = createTestNote();
    const scheduledTime = new Date('2025-07-01T09:00:00Z');

    // 1. 调度定时发布
    const scheduleResult = await channel.schedulePublish(note, scheduledTime);

    expect(scheduleResult.status).toBe('scheduled');
    expect(scheduleResult.scheduledTime.getTime()).toBe(scheduledTime.getTime());

    // 2. 验证任务已存储
    const taskStore = getScheduledTaskStore();
    expect(taskStore.has(scheduleResult.scheduleId)).toBe(true);
  });

  it('多次发布应生成独立的记录', async () => {
    const note1 = createTestNote({ id: 'note-multi-1' });
    const note2 = createTestNote({ id: 'note-multi-2' });
    const options: PublishOptions = { mode: 'manual', platform: 'xiaohongshu' };

    const result1 = await publish(note1, options);
    const result2 = await publish(note2, options);

    expect(result1.publishId).not.toBe(result2.publishId);

    const store = getPublishRecordStore();
    expect(store.size).toBe(2);
  });
});
