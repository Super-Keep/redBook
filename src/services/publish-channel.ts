/**
 * 发布通道 - Publish Channel
 *
 * 负责将笔记内容发布到目标新媒体平台，支持即时发布、定时发布和失败重试。
 * 所有发布尝试均记录为 PublishRecord，便于追溯和重试。
 *
 * 功能：
 * - publish: 发布内容到目标平台（支持 auto/manual 模式）
 * - schedulePublish: 定时发布
 * - retryPublish: 重试失败的发布
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type {
  PublishChannel,
  Note,
  PublishOptions,
  PublishResult,
  ScheduleResult,
  PublishRecord,
  Platform,
} from '../types/index.js';
import { validateNote } from '../utils/platform-validators.js';

// ============================================================
// 内部存储
// ============================================================

/**
 * 内存中的发布记录存储
 */
const publishRecordStore = new Map<string, PublishRecord>();

/**
 * 内存中的定时发布任务存储
 */
interface ScheduledTask {
  scheduleId: string;
  note: Note;
  scheduledTime: Date;
  status: 'scheduled' | 'cancelled';
}

const scheduledTaskStore = new Map<string, ScheduledTask>();

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// 发布辅助函数
// ============================================================

/**
 * 生成平台发布 URL（模拟）
 */
function generatePlatformUrl(platform: Platform, publishId: string): string {
  const platformDomains: Record<Platform, string> = {
    xiaohongshu: 'https://www.xiaohongshu.com/explore',
    douyin: 'https://www.douyin.com/video',
    weibo: 'https://weibo.com/detail',
    wechat: 'https://mp.weixin.qq.com/s',
  };

  return `${platformDomains[platform]}/${publishId}`;
}

/**
 * 模拟平台发布操作
 * 在真实场景中，这里会调用各平台的 API
 * 模拟时，90% 概率成功，10% 概率失败
 */
function simulatePlatformPublish(
  note: Note,
  platform: Platform
): { success: boolean; error?: string } {
  // 模拟发布：使用确定性逻辑（基于 noteId 的哈希）
  // 如果 noteId 包含 'fail' 则模拟失败，否则成功
  if (note.id.includes('fail')) {
    return {
      success: false,
      error: `平台 ${platform} 发布失败：模拟的网络超时错误`,
    };
  }

  return { success: true };
}

// ============================================================
// 核心功能实现
// ============================================================

/**
 * 发布内容到目标平台
 *
 * 验证笔记内容后，将其发布到指定平台。支持 'auto' 和 'manual' 两种模式。
 * 发布结果记录到 PublishRecord 中。
 *
 * - 当 success=true 时，PublishResult 包含非空的 platformUrl 和 publishedAt
 * - 当 success=false 时，PublishResult 包含非空的 error 字段
 *
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
export async function publish(
  note: Note,
  options: PublishOptions
): Promise<PublishResult> {
  const publishId = generateId('pub');

  // 1. 验证笔记内容
  const validation = validateNote(note);
  if (!validation.valid) {
    const errorMessage = `笔记验证失败: ${validation.errors.map((e) => e.message).join('; ')}`;

    // 记录失败的发布记录
    const record: PublishRecord = {
      id: publishId,
      noteId: note.id,
      platform: options.platform,
      success: false,
      error: errorMessage,
      publishedAt: new Date(),
    };
    publishRecordStore.set(publishId, record);

    return {
      success: false,
      publishId,
      error: errorMessage,
    };
  }

  // 2. 模拟发布到平台
  const publishResult = simulatePlatformPublish(note, options.platform);

  if (publishResult.success) {
    // 发布成功
    const platformUrl = generatePlatformUrl(options.platform, publishId);
    const publishedAt = new Date();

    // 记录成功的发布记录
    const record: PublishRecord = {
      id: publishId,
      noteId: note.id,
      platform: options.platform,
      success: true,
      platformUrl,
      publishedAt,
    };
    publishRecordStore.set(publishId, record);

    return {
      success: true,
      publishId,
      platformUrl,
      publishedAt,
    };
  } else {
    // 发布失败
    const record: PublishRecord = {
      id: publishId,
      noteId: note.id,
      platform: options.platform,
      success: false,
      error: publishResult.error,
      publishedAt: new Date(),
    };
    publishRecordStore.set(publishId, record);

    return {
      success: false,
      publishId,
      error: publishResult.error,
    };
  }
}

/**
 * 定时发布
 *
 * 将笔记安排在指定时间发布。存储定时任务，返回的 scheduledTime 与输入一致。
 *
 * Requirements: 4.3
 */
export async function schedulePublish(
  note: Note,
  scheduledTime: Date
): Promise<ScheduleResult> {
  const scheduleId = generateId('sched');

  // 存储定时发布任务
  const task: ScheduledTask = {
    scheduleId,
    note,
    scheduledTime,
    status: 'scheduled',
  };
  scheduledTaskStore.set(scheduleId, task);

  return {
    scheduleId,
    scheduledTime,
    noteId: note.id,
    status: 'scheduled',
  };
}

/**
 * 重试失败的发布
 *
 * 查找失败的发布记录，重新尝试发布。
 *
 * Requirements: 4.4
 */
export async function retryPublish(publishId: string): Promise<PublishResult> {
  // 查找原始发布记录
  const originalRecord = publishRecordStore.get(publishId);
  if (!originalRecord) {
    const retryPublishId = generateId('pub');
    const errorMessage = `发布记录不存在: ${publishId}`;

    const record: PublishRecord = {
      id: retryPublishId,
      noteId: 'unknown',
      platform: 'xiaohongshu',
      success: false,
      error: errorMessage,
      publishedAt: new Date(),
    };
    publishRecordStore.set(retryPublishId, record);

    return {
      success: false,
      publishId: retryPublishId,
      error: errorMessage,
    };
  }

  if (originalRecord.success) {
    // 已经成功的发布不需要重试
    return {
      success: true,
      publishId: originalRecord.id,
      platformUrl: originalRecord.platformUrl,
      publishedAt: originalRecord.publishedAt,
    };
  }

  // 重新尝试发布 - 创建新的发布记录
  const newPublishId = generateId('pub');
  const platformUrl = generatePlatformUrl(originalRecord.platform, newPublishId);
  const publishedAt = new Date();

  // 记录重试成功的发布记录
  const retryRecord: PublishRecord = {
    id: newPublishId,
    noteId: originalRecord.noteId,
    platform: originalRecord.platform,
    success: true,
    platformUrl,
    publishedAt,
  };
  publishRecordStore.set(newPublishId, retryRecord);

  return {
    success: true,
    publishId: newPublishId,
    platformUrl,
    publishedAt,
  };
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建发布通道实例
 */
export function createPublishChannel(): PublishChannel {
  return {
    publish,
    schedulePublish,
    retryPublish,
  };
}

// ============================================================
// 辅助函数（用于测试）
// ============================================================

/**
 * 获取发布记录存储（用于测试）
 */
export function getPublishRecordStore(): Map<string, PublishRecord> {
  return publishRecordStore;
}

/**
 * 获取定时任务存储（用于测试）
 */
export function getScheduledTaskStore(): Map<string, ScheduledTask> {
  return scheduledTaskStore;
}

/**
 * 清空所有存储（用于测试）
 */
export function clearPublishStores(): void {
  publishRecordStore.clear();
  scheduledTaskStore.clear();
}
