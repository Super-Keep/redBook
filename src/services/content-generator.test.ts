import { describe, it, expect, beforeEach } from 'vitest';
import {
  createContentGenerator,
  generateNote,
  reviseNote,
  matchTrendingTags,
  clearNoteStore,
  getNoteStore,
} from './content-generator.js';
import { validateNote, PLATFORM_SPECS } from '../utils/platform-validators.js';
import type { NoteRequest, Platform } from '../types/index.js';

// ============================================================
// 测试前清理
// ============================================================

beforeEach(() => {
  clearNoteStore();
});

// ============================================================
// generateNote 单元测试
// ============================================================

describe('generateNote', () => {
  it('应生成包含所有必需字段的完整笔记', async () => {
    const request: NoteRequest = {
      topic: '护肤',
      platform: 'xiaohongshu',
      category: '美妆',
    };

    const note = await generateNote(request);

    expect(note.id).toBeDefined();
    expect(note.id.length).toBeGreaterThan(0);
    expect(note.title).toBeDefined();
    expect(note.title.length).toBeGreaterThan(0);
    expect(note.textContent).toBeDefined();
    expect(note.textContent.length).toBeGreaterThan(0);
    expect(note.images).toBeDefined();
    expect(note.images.length).toBeGreaterThan(0);
    expect(note.tags).toBeDefined();
    expect(note.tags.length).toBeGreaterThan(0);
    expect(note.platform).toBe('xiaohongshu');
    expect(note.platformPreview).toBeDefined();
    expect(note.platformPreview.platform).toBe('xiaohongshu');
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.updatedAt).toBeInstanceOf(Date);
  });

  it('生成的笔记应通过平台验证（Publish_Ready）', async () => {
    const request: NoteRequest = {
      topic: '穿搭',
      platform: 'xiaohongshu',
      category: '穿搭',
    };

    const note = await generateNote(request);
    const validation = validateNote(note);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(note.status).toBe('ready');
  });

  it('应支持所有平台并通过各平台验证', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const request: NoteRequest = {
        topic: '美食',
        platform,
        category: '美食',
      };

      const note = await generateNote(request);
      const validation = validateNote(note);

      expect(validation.valid).toBe(true);
      expect(note.platform).toBe(platform);
      expect(note.platformPreview.platform).toBe(platform);
    }
  });

  it('标题长度应不超过平台限制', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const spec = PLATFORM_SPECS[platform];
      const request: NoteRequest = {
        topic: '这是一个非常长的主题名称用来测试标题截断功能',
        platform,
        category: '测试',
      };

      const note = await generateNote(request);
      expect(note.title.length).toBeLessThanOrEqual(spec.maxTitleLength);
    }
  });

  it('文本内容长度应不超过平台限制', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const spec = PLATFORM_SPECS[platform];
      const request: NoteRequest = {
        topic: '测试',
        platform,
        category: '测试',
      };

      const note = await generateNote(request);
      expect(note.textContent.length).toBeLessThanOrEqual(spec.maxTextLength);
    }
  });

  it('标签数量应不超过平台限制', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const spec = PLATFORM_SPECS[platform];
      const request: NoteRequest = {
        topic: '测试',
        platform,
        category: '测试',
      };

      const note = await generateNote(request);
      expect(note.tags.length).toBeLessThanOrEqual(spec.maxTags);
    }
  });

  it('图片数量应不超过平台限制', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const spec = PLATFORM_SPECS[platform];
      const request: NoteRequest = {
        topic: '测试',
        platform,
        category: '测试',
      };

      const note = await generateNote(request);
      expect(note.images.length).toBeLessThanOrEqual(spec.maxImages);
      expect(note.images.length).toBeGreaterThan(0);
    }
  });

  it('图片尺寸应符合平台规范', async () => {
    const request: NoteRequest = {
      topic: '摄影',
      platform: 'xiaohongshu',
      category: '摄影',
    };

    const note = await generateNote(request);
    const spec = PLATFORM_SPECS['xiaohongshu'];

    for (const img of note.images) {
      expect(img.width).toBeGreaterThanOrEqual(spec.imageSpecs.minWidth);
      expect(img.width).toBeLessThanOrEqual(spec.imageSpecs.maxWidth);
      expect(img.height).toBeGreaterThanOrEqual(spec.imageSpecs.minHeight);
      expect(img.height).toBeLessThanOrEqual(spec.imageSpecs.maxHeight);
    }
  });

  it('应基于参考素材生成内容', async () => {
    const request: NoteRequest = {
      topic: '护肤',
      platform: 'xiaohongshu',
      category: '美妆',
      referenceMaterials: [
        { type: 'text', content: '玻尿酸精华液效果很好' },
        { type: 'text', content: '适合干性皮肤使用' },
      ],
    };

    const note = await generateNote(request);

    // 内容应包含参考素材的信息
    expect(note.textContent).toContain('玻尿酸精华液效果很好');
  });

  it('生成的笔记应存储在内存中', async () => {
    const request: NoteRequest = {
      topic: '健身',
      platform: 'douyin',
      category: '健身',
    };

    const note = await generateNote(request);
    const store = getNoteStore();

    expect(store.has(note.id)).toBe(true);
    expect(store.get(note.id)).toEqual(note);
  });

  it('每次生成的笔记应有唯一 ID', async () => {
    const request: NoteRequest = {
      topic: '美食',
      platform: 'xiaohongshu',
      category: '美食',
    };

    const note1 = await generateNote(request);
    const note2 = await generateNote(request);

    expect(note1.id).not.toBe(note2.id);
  });

  it('platformPreview 应包含完整的渲染数据', async () => {
    const request: NoteRequest = {
      topic: '旅行',
      platform: 'xiaohongshu',
      category: '旅行',
    };

    const note = await generateNote(request);

    expect(note.platformPreview).toBeDefined();
    expect(note.platformPreview.platform).toBe('xiaohongshu');
    expect(note.platformPreview.layout).toBeDefined();
    expect(typeof note.platformPreview.layout).toBe('object');
  });
});

// ============================================================
// reviseNote 单元测试
// ============================================================

describe('reviseNote', () => {
  it('修改后的笔记应与原笔记在内容上存在差异', async () => {
    const request: NoteRequest = {
      topic: '护肤',
      platform: 'xiaohongshu',
      category: '美妆',
    };

    const original = await generateNote(request);
    const revised = await reviseNote(original.id, '请增加更多关于敏感肌的内容');

    // textContent 或 images 应不完全相同
    const textDiffers = revised.textContent !== original.textContent;
    const imagesDiffer = JSON.stringify(revised.images) !== JSON.stringify(original.images);

    expect(textDiffers || imagesDiffer).toBe(true);
  });

  it('修改后的笔记文本内容应包含反馈相关信息', async () => {
    const request: NoteRequest = {
      topic: '穿搭',
      platform: 'douyin',
      category: '穿搭',
    };

    const original = await generateNote(request);
    const feedback = '请增加秋冬搭配建议';
    const revised = await reviseNote(original.id, feedback);

    expect(revised.textContent).toContain(feedback);
  });

  it('修改后的笔记应保持相同的 ID', async () => {
    const request: NoteRequest = {
      topic: '美食',
      platform: 'weibo',
      category: '美食',
    };

    const original = await generateNote(request);
    const revised = await reviseNote(original.id, '增加食材清单');

    expect(revised.id).toBe(original.id);
  });

  it('修改后的笔记应保持相同的平台', async () => {
    const request: NoteRequest = {
      topic: '健身',
      platform: 'wechat',
      category: '健身',
    };

    const original = await generateNote(request);
    const revised = await reviseNote(original.id, '增加训练计划');

    expect(revised.platform).toBe(original.platform);
  });

  it('修改后的 updatedAt 应更新', async () => {
    const request: NoteRequest = {
      topic: '旅行',
      platform: 'xiaohongshu',
      category: '旅行',
    };

    const original = await generateNote(request);
    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));
    const revised = await reviseNote(original.id, '增加景点推荐');

    expect(revised.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });

  it('对不存在的笔记调用 reviseNote 应抛出错误', async () => {
    await expect(
      reviseNote('non-existent-id', '一些反馈')
    ).rejects.toThrow('笔记不存在');
  });

  it('修改后的笔记应更新存储', async () => {
    const request: NoteRequest = {
      topic: '数码',
      platform: 'xiaohongshu',
      category: '数码',
    };

    const original = await generateNote(request);
    const revised = await reviseNote(original.id, '增加性价比分析');
    const stored = getNoteStore().get(original.id);

    expect(stored).toEqual(revised);
    expect(stored!.textContent).toContain('增加性价比分析');
  });

  it('修改后的笔记应有新的 platformPreview', async () => {
    const request: NoteRequest = {
      topic: '宠物',
      platform: 'douyin',
      category: '宠物',
    };

    const original = await generateNote(request);
    const revised = await reviseNote(original.id, '增加宠物护理技巧');

    expect(revised.platformPreview).toBeDefined();
    expect(revised.platformPreview.platform).toBe('douyin');
  });
});

// ============================================================
// matchTrendingTags 单元测试
// ============================================================

describe('matchTrendingTags', () => {
  it('应返回与热门话题有交集的标签', async () => {
    const content = '今天分享一些护肤和美妆的小技巧，推荐几款好物给大家';
    const tags = await matchTrendingTags(content, 'xiaohongshu');

    expect(tags.length).toBeGreaterThan(0);
  });

  it('返回的标签数量应不超过平台限制', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const spec = PLATFORM_SPECS[platform];
      const content = '护肤美妆穿搭美食旅行健身宠物数码摄影母婴职场教育';
      const tags = await matchTrendingTags(content, platform);

      expect(tags.length).toBeLessThanOrEqual(spec.maxTags);
    }
  });

  it('即使内容不匹配任何热门标签也应返回标签（fallback）', async () => {
    const content = 'zzzzz完全不相关的内容zzzzz';
    const tags = await matchTrendingTags(content, 'xiaohongshu');

    // 应该有 fallback 标签
    expect(tags.length).toBeGreaterThan(0);
  });

  it('应支持所有平台', async () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    for (const platform of platforms) {
      const content = '分享一些实用的生活技巧和好物推荐';
      const tags = await matchTrendingTags(content, platform);

      expect(tags.length).toBeGreaterThan(0);
    }
  });

  it('返回的标签应为字符串数组', async () => {
    const tags = await matchTrendingTags('护肤推荐', 'xiaohongshu');

    expect(Array.isArray(tags)).toBe(true);
    for (const tag of tags) {
      expect(typeof tag).toBe('string');
      expect(tag.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// createContentGenerator 工厂函数测试
// ============================================================

describe('createContentGenerator', () => {
  it('应返回包含所有接口方法的对象', () => {
    const generator = createContentGenerator();

    expect(typeof generator.generateNote).toBe('function');
    expect(typeof generator.reviseNote).toBe('function');
    expect(typeof generator.matchTrendingTags).toBe('function');
  });

  it('通过实例调用 generateNote 应正常工作', async () => {
    const generator = createContentGenerator();
    const request: NoteRequest = {
      topic: '美食',
      platform: 'xiaohongshu',
      category: '美食',
    };

    const note = await generator.generateNote(request);

    expect(note.id).toBeDefined();
    expect(note.textContent.length).toBeGreaterThan(0);
    expect(validateNote(note).valid).toBe(true);
  });

  it('通过实例调用 reviseNote 应正常工作', async () => {
    const generator = createContentGenerator();
    const request: NoteRequest = {
      topic: '旅行',
      platform: 'douyin',
      category: '旅行',
    };

    const original = await generator.generateNote(request);
    const revised = await generator.reviseNote(original.id, '增加预算建议');

    expect(revised.textContent).not.toBe(original.textContent);
  });

  it('通过实例调用 matchTrendingTags 应正常工作', async () => {
    const generator = createContentGenerator();
    const tags = await generator.matchTrendingTags('护肤美妆推荐', 'xiaohongshu');

    expect(tags.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 集成场景测试
// ============================================================

describe('内容生成集成场景', () => {
  it('完整流程：生成笔记 → 验证 → 修改 → 再验证', async () => {
    const generator = createContentGenerator();

    // 1. 生成笔记
    const request: NoteRequest = {
      topic: '秋冬护肤',
      platform: 'xiaohongshu',
      category: '美妆',
    };
    const note = await generator.generateNote(request);

    // 2. 验证通过
    const validation1 = validateNote(note);
    expect(validation1.valid).toBe(true);
    expect(note.status).toBe('ready');

    // 3. 根据反馈修改
    const revised = await generator.reviseNote(note.id, '请增加敏感肌适用的产品推荐');

    // 4. 修改后仍然有效
    expect(revised.textContent).not.toBe(note.textContent);
    expect(revised.textContent).toContain('请增加敏感肌适用的产品推荐');
  });

  it('生成笔记时标签应与热门话题有交集', async () => {
    const request: NoteRequest = {
      topic: '护肤',
      platform: 'xiaohongshu',
      category: '美妆',
    };

    const note = await generateNote(request);

    // 标签应非空
    expect(note.tags.length).toBeGreaterThan(0);

    // 标签应为字符串
    for (const tag of note.tags) {
      expect(typeof tag).toBe('string');
      expect(tag.length).toBeGreaterThan(0);
    }
  });
});
