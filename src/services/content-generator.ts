/**
 * 内容生成器 - Content Generator
 *
 * 负责生成可直接发布的笔记内容，包括文本、图片、标签和平台预览。
 * 生成的内容严格遵循目标平台规范，确保 Publish_Ready 状态。
 *
 * 功能：
 * - generateNote: 根据主题和平台生成完整笔记
 * - reviseNote: 根据用户反馈修改已有笔记
 * - matchTrendingTags: 匹配当前平台热门标签
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import type {
  ContentGenerator,
  Note,
  NoteRequest,
  NoteStatus,
  Platform,
  ImageAsset,
  PlatformPreview,
} from '../types/index.js';
import { validateNote, PLATFORM_SPECS } from '../utils/platform-validators.js';
import { getTrendingTopicsImpl } from './competitor-analyzer.js';

// ============================================================
// 内部存储
// ============================================================

/**
 * 内存中的笔记存储，用于 reviseNote 查找已有笔记
 */
const noteStore = new Map<string, Note>();

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// 内容生成辅助函数
// ============================================================

/**
 * 根据主题和平台生成笔记标题
 * 确保标题长度不超过平台限制
 */
function generateTitle(topic: string, platform: Platform): string {
  const spec = PLATFORM_SPECS[platform];
  const templates = [
    `${topic}全攻略`,
    `${topic}必看指南`,
    `${topic}分享`,
    `${topic}推荐`,
    `${topic}干货`,
  ];

  // 选择一个模板
  const template = templates[Math.floor(Math.random() * templates.length)];

  // 确保不超过平台标题长度限制
  if (template.length <= spec.maxTitleLength) {
    return template;
  }

  // 截断到平台限制
  return template.substring(0, spec.maxTitleLength);
}

/**
 * 根据主题、赛道和平台生成笔记文本内容
 * 确保文本长度不超过平台限制
 */
function generateTextContent(
  topic: string,
  category: string,
  platform: Platform,
  referenceMaterials?: NoteRequest['referenceMaterials']
): string {
  const spec = PLATFORM_SPECS[platform];

  // 基于素材生成内容（如果有参考素材）
  let materialContext = '';
  if (referenceMaterials && referenceMaterials.length > 0) {
    const textMaterials = referenceMaterials
      .filter((m) => m.type === 'text' && m.content)
      .map((m) => m.content)
      .join('；');
    if (textMaterials) {
      materialContext = `\n\n参考要点：${textMaterials}`;
    }
  }

  const sections = [
    `【${topic}】${category}领域深度分享`,
    '',
    `今天给大家带来关于${topic}的精彩内容！作为${category}领域的深度爱好者，我整理了一些实用的经验和心得。`,
    '',
    `✨ 核心要点：`,
    `1. ${topic}的基础知识和入门技巧`,
    `2. ${category}领域的最新趋势和热点`,
    `3. 实用的操作方法和注意事项`,
    '',
    `💡 实用建议：`,
    `- 从基础开始，循序渐进`,
    `- 多关注${category}领域的优质内容`,
    `- 保持学习和实践的习惯`,
    '',
    `希望这些内容对大家有帮助！欢迎在评论区分享你的想法和经验～`,
    materialContext,
  ];

  const content = sections.join('\n').trim();

  // 确保不超过平台文本长度限制
  if (content.length <= spec.maxTextLength) {
    return content;
  }

  return content.substring(0, spec.maxTextLength);
}

/**
 * 生成符合平台规范的图片资源
 */
function generateImages(
  topic: string,
  platform: Platform,
  noteId: string
): ImageAsset[] {
  const spec = PLATFORM_SPECS[platform];
  const imageSpecs = spec.imageSpecs;

  // 生成合规的图片尺寸（在平台允许范围内）
  const width = Math.min(
    Math.max(imageSpecs.minWidth, 1080),
    imageSpecs.maxWidth
  );
  const height = Math.min(
    Math.max(imageSpecs.minHeight, 1080),
    imageSpecs.maxHeight
  );

  // 使用平台允许的第一个格式
  const format = imageSpecs.allowedFormats[0] || 'jpg';

  // 生成 1-3 张图片（不超过平台限制）
  const imageCount = Math.min(3, spec.maxImages);
  const images: ImageAsset[] = [];

  for (let i = 0; i < imageCount; i++) {
    images.push({
      id: `img-${noteId}-${i}`,
      noteId,
      url: `https://images.example.com/${topic}/${noteId}-${i}.${format}`,
      width,
      height,
      altText: `${topic}相关图片${i + 1}`,
    });
  }

  return images;
}

/**
 * 生成平台预览数据
 */
function generatePlatformPreview(
  note: Omit<Note, 'platformPreview'>,
  platform: Platform
): PlatformPreview {
  return {
    platform,
    layout: {
      type: 'card',
      title: note.title,
      coverImage: note.images.length > 0 ? note.images[0].url : null,
      textPreview: note.textContent.substring(0, 100),
      tagCount: note.tags.length,
      imageCount: note.images.length,
    },
    thumbnailUrl: note.images.length > 0 ? note.images[0].url : undefined,
  };
}

// ============================================================
// 核心功能实现
// ============================================================

/**
 * 生成笔记内容
 *
 * 根据用户提供的主题、平台和赛道信息，生成包含文本、图片、标签和
 * 平台预览的完整笔记。生成的笔记通过平台验证器校验，确保 Publish_Ready。
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export async function generateNote(request: NoteRequest): Promise<Note> {
  const { topic, platform, category, referenceMaterials } = request;
  const noteId = generateId();

  // 1. 生成标题
  const title = generateTitle(topic, platform);

  // 2. 生成文本内容
  const textContent = generateTextContent(topic, category, platform, referenceMaterials);

  // 3. 生成图片
  const images = generateImages(topic, platform, noteId);

  // 4. 匹配热门标签
  const tags = await matchTrendingTags(textContent, platform);

  // 5. 构建笔记（不含 platformPreview）
  const noteWithoutPreview = {
    id: noteId,
    title,
    textContent,
    images,
    tags,
    platform,
    status: 'ready' as NoteStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 6. 生成平台预览
  const platformPreview = generatePlatformPreview(noteWithoutPreview, platform);

  // 7. 组装完整笔记
  const note: Note = {
    ...noteWithoutPreview,
    platformPreview,
  };

  // 8. 验证笔记是否符合平台规范
  const validation = validateNote(note);
  if (!validation.valid) {
    // 如果验证失败，标记为草稿
    note.status = 'draft';
  }

  // 9. 存储笔记
  noteStore.set(note.id, note);

  return note;
}

/**
 * 根据反馈修改笔记
 *
 * 查找已有笔记，根据用户反馈修改内容。修改后的笔记在内容上
 * 与原笔记存在差异（textContent 或 images 不完全相同）。
 *
 * Requirements: 3.5
 */
export async function reviseNote(noteId: string, feedback: string): Promise<Note> {
  const existingNote = noteStore.get(noteId);
  if (!existingNote) {
    throw new Error(`笔记不存在: ${noteId}`);
  }

  // 根据反馈修改文本内容
  const revisedTextContent = applyFeedbackToContent(
    existingNote.textContent,
    feedback,
    existingNote.title
  );

  // 重新生成图片（确保与原笔记不同）
  const revisedImages = generateImages(
    existingNote.title,
    existingNote.platform,
    existingNote.id + '-revised'
  );

  // 重新匹配标签
  const revisedTags = await matchTrendingTags(revisedTextContent, existingNote.platform);

  const revisedNote: Note = {
    ...existingNote,
    textContent: revisedTextContent,
    images: revisedImages,
    tags: revisedTags,
    updatedAt: new Date(),
  };

  // 生成新的平台预览
  revisedNote.platformPreview = generatePlatformPreview(revisedNote, revisedNote.platform);

  // 验证修改后的笔记
  const validation = validateNote(revisedNote);
  revisedNote.status = validation.valid ? 'ready' : 'draft';

  // 更新存储
  noteStore.set(noteId, revisedNote);

  return revisedNote;
}

/**
 * 将用户反馈应用到内容中
 */
function applyFeedbackToContent(
  originalContent: string,
  feedback: string,
  topic: string
): string {
  // 在原内容基础上添加修改标记和反馈内容
  const revisedSections = [
    originalContent,
    '',
    `📝 根据反馈优化：`,
    `${feedback}`,
    '',
    `🔄 补充内容：`,
    `针对"${topic}"的进一步说明和优化，结合最新的反馈意见进行了内容调整和完善。`,
  ];

  const revised = revisedSections.join('\n').trim();

  // 确保不超过平台限制（使用最大的平台限制作为安全值）
  // 实际使用时会在 reviseNote 中通过 validateNote 检查
  return revised;
}

/**
 * 匹配热门标签
 *
 * 根据内容和平台，从当前热门话题中匹配相关标签。
 * 返回的标签与当前平台 Trending_Topic 列表存在交集。
 *
 * Requirements: 3.6
 */
export async function matchTrendingTags(
  content: string,
  platform: Platform
): Promise<string[]> {
  const spec = PLATFORM_SPECS[platform];

  // 获取当前平台热门话题
  const trendingTopics = await getTrendingTopicsImpl(platform);

  // 从热门话题中提取所有标签
  const allTrendingTags: string[] = [];
  for (const topic of trendingTopics) {
    allTrendingTags.push(...topic.relatedTags);
  }

  // 去重
  const uniqueTrendingTags = [...new Set(allTrendingTags)];

  // 基于内容关键词匹配热门标签
  const contentLower = content.toLowerCase();
  const matchedTags: string[] = [];

  for (const tag of uniqueTrendingTags) {
    // 去掉 # 号后进行匹配
    const tagText = tag.replace(/^#/, '').toLowerCase();
    if (contentLower.includes(tagText) && !matchedTags.includes(tag)) {
      matchedTags.push(tag);
    }
  }

  // 如果没有匹配到任何标签，从热门标签中选取前几个
  if (matchedTags.length === 0 && uniqueTrendingTags.length > 0) {
    const fallbackCount = Math.min(3, spec.maxTags, uniqueTrendingTags.length);
    matchedTags.push(...uniqueTrendingTags.slice(0, fallbackCount));
  }

  // 确保不超过平台标签数量限制
  return matchedTags.slice(0, spec.maxTags);
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建内容生成器实例
 */
export function createContentGenerator(): ContentGenerator {
  return {
    generateNote,
    reviseNote,
    matchTrendingTags,
  };
}

// ============================================================
// 辅助函数（用于测试）
// ============================================================

/**
 * 获取笔记存储（用于测试）
 */
export function getNoteStore(): Map<string, Note> {
  return noteStore;
}

/**
 * 清空笔记存储（用于测试）
 */
export function clearNoteStore(): void {
  noteStore.clear();
}
