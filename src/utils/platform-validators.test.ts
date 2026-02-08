import { describe, it, expect } from 'vitest';
import {
  validateNote,
  getPlatformSpec,
  PLATFORM_SPECS,
} from './platform-validators.js';
import type { Note, Platform, ImageAsset } from '../types/index.js';

/**
 * 创建一个符合指定平台规范的有效笔记
 */
function createValidNote(platform: Platform): Note {
  const spec = getPlatformSpec(platform);
  return {
    id: 'test-note-1',
    title: '测试标题'.slice(0, spec.maxTitleLength),
    textContent: '这是一段测试内容，用于验证平台规范。',
    images: [
      {
        id: 'img-1',
        noteId: 'test-note-1',
        url: 'https://example.com/image1.jpg',
        width: spec.imageSpecs.minWidth,
        height: spec.imageSpecs.minHeight,
        altText: '测试图片',
      },
    ],
    tags: ['测试标签'],
    platform,
    status: 'draft',
    platformPreview: {
      platform,
      layout: {},
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('平台规范验证器', () => {
  describe('getPlatformSpec', () => {
    it('应返回小红书平台规范', () => {
      const spec = getPlatformSpec('xiaohongshu');
      expect(spec.platform).toBe('xiaohongshu');
      expect(spec.maxTextLength).toBe(1000);
      expect(spec.maxTitleLength).toBe(20);
      expect(spec.maxTags).toBe(10);
      expect(spec.maxImages).toBe(9);
    });

    it('应返回抖音平台规范', () => {
      const spec = getPlatformSpec('douyin');
      expect(spec.platform).toBe('douyin');
      expect(spec.maxTextLength).toBe(2000);
      expect(spec.maxTitleLength).toBe(30);
    });

    it('应返回微博平台规范', () => {
      const spec = getPlatformSpec('weibo');
      expect(spec.platform).toBe('weibo');
      expect(spec.maxTextLength).toBe(2000);
    });

    it('应返回微信平台规范', () => {
      const spec = getPlatformSpec('wechat');
      expect(spec.platform).toBe('wechat');
      expect(spec.maxTextLength).toBe(20000);
      expect(spec.maxTitleLength).toBe(64);
    });
  });

  describe('PLATFORM_SPECS 覆盖所有平台', () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    it.each(platforms)('应包含 %s 平台的规范', (platform) => {
      expect(PLATFORM_SPECS[platform]).toBeDefined();
      expect(PLATFORM_SPECS[platform].platform).toBe(platform);
    });
  });

  describe('validateNote - 有效笔记', () => {
    const platforms: Platform[] = ['xiaohongshu', 'douyin', 'weibo', 'wechat'];

    it.each(platforms)('符合 %s 平台规范的笔记应通过验证', (platform) => {
      const note = createValidNote(platform);
      const result = validateNote(note);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateNote - 标题验证', () => {
    it('标题为空时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.title = '';
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title' && e.rule === 'required')).toBe(true);
    });

    it('标题仅含空白时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.title = '   ';
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title' && e.rule === 'required')).toBe(true);
    });

    it('标题超过小红书限制（20字）时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.title = '这是一个超过二十个字符的标题用于测试验证功能是否正常';
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title' && e.rule === 'maxTitleLength')).toBe(true);
    });

    it('标题恰好等于限制长度时应通过', () => {
      const note = createValidNote('xiaohongshu');
      note.title = '一'.repeat(20);
      const result = validateNote(note);
      const titleErrors = result.errors.filter((e) => e.field === 'title');
      expect(titleErrors).toHaveLength(0);
    });
  });

  describe('validateNote - 文本内容验证', () => {
    it('文本内容为空时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.textContent = '';
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'textContent' && e.rule === 'required')).toBe(true);
    });

    it('文本内容超过小红书限制（1000字）时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.textContent = '字'.repeat(1001);
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'textContent' && e.rule === 'maxTextLength')).toBe(true);
    });

    it('文本内容恰好等于限制长度时应通过', () => {
      const note = createValidNote('xiaohongshu');
      note.textContent = '字'.repeat(1000);
      const result = validateNote(note);
      const textErrors = result.errors.filter((e) => e.field === 'textContent');
      expect(textErrors).toHaveLength(0);
    });

    it('微信平台允许更长的文本（20000字）', () => {
      const note = createValidNote('wechat');
      note.textContent = '字'.repeat(20000);
      const result = validateNote(note);
      const textErrors = result.errors.filter((e) => e.field === 'textContent');
      expect(textErrors).toHaveLength(0);
    });
  });

  describe('validateNote - 标签验证', () => {
    it('标签数量超过限制时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.tags = Array.from({ length: 11 }, (_, i) => `标签${i + 1}`);
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tags' && e.rule === 'maxTags')).toBe(true);
    });

    it('标签数量恰好等于限制时应通过', () => {
      const note = createValidNote('xiaohongshu');
      note.tags = Array.from({ length: 10 }, (_, i) => `标签${i + 1}`);
      const result = validateNote(note);
      const tagErrors = result.errors.filter((e) => e.field === 'tags');
      expect(tagErrors).toHaveLength(0);
    });

    it('空标签字符串应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.tags = ['有效标签', '', '另一个标签'];
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'tagNotEmpty')).toBe(true);
    });

    it('没有标签时应通过验证', () => {
      const note = createValidNote('xiaohongshu');
      note.tags = [];
      const result = validateNote(note);
      const tagErrors = result.errors.filter((e) => e.field === 'tags' || e.field.startsWith('tags['));
      expect(tagErrors).toHaveLength(0);
    });
  });

  describe('validateNote - 图片验证', () => {
    it('图片数量超过限制时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      const spec = getPlatformSpec('xiaohongshu');
      note.images = Array.from({ length: 10 }, (_, i): ImageAsset => ({
        id: `img-${i}`,
        noteId: 'test-note-1',
        url: `https://example.com/image${i}.jpg`,
        width: spec.imageSpecs.minWidth,
        height: spec.imageSpecs.minHeight,
        altText: `图片${i}`,
      }));
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'images' && e.rule === 'maxImages')).toBe(true);
    });

    it('图片宽度低于最小要求时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/small.jpg',
          width: 100,
          height: 600,
          altText: '小图',
        },
      ];
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'minWidth')).toBe(true);
    });

    it('图片高度低于最小要求时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/small.jpg',
          width: 600,
          height: 100,
          altText: '小图',
        },
      ];
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'minHeight')).toBe(true);
    });

    it('图片宽度超过最大限制时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/big.jpg',
          width: 5000,
          height: 600,
          altText: '大图',
        },
      ];
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'maxWidth')).toBe(true);
    });

    it('图片高度超过最大限制时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/big.jpg',
          width: 600,
          height: 5000,
          altText: '大图',
        },
      ];
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'maxHeight')).toBe(true);
    });

    it('不允许的图片格式应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/image.bmp',
          width: 600,
          height: 600,
          altText: 'BMP图片',
        },
      ];
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'allowedFormats')).toBe(true);
    });

    it('允许的图片格式应通过验证', () => {
      const note = createValidNote('xiaohongshu');
      note.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/image.png',
          width: 600,
          height: 600,
          altText: 'PNG图片',
        },
      ];
      const result = validateNote(note);
      const formatErrors = result.errors.filter((e) => e.rule === 'allowedFormats');
      expect(formatErrors).toHaveLength(0);
    });

    it('没有图片时应通过验证', () => {
      const note = createValidNote('xiaohongshu');
      note.images = [];
      const result = validateNote(note);
      const imageErrors = result.errors.filter(
        (e) => e.field === 'images' || e.field.startsWith('images[')
      );
      expect(imageErrors).toHaveLength(0);
    });
  });

  describe('validateNote - 平台预览验证', () => {
    it('缺少平台预览数据时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.platformPreview = undefined as unknown as Note['platformPreview'];
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'platformPreview' && e.rule === 'required')).toBe(true);
    });

    it('预览平台与笔记平台不一致时应返回错误', () => {
      const note = createValidNote('xiaohongshu');
      note.platformPreview = {
        platform: 'douyin',
        layout: {},
      };
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'platformMatch')).toBe(true);
    });
  });

  describe('validateNote - 多个错误同时返回', () => {
    it('多个字段不合规时应返回所有错误', () => {
      const note = createValidNote('xiaohongshu');
      note.title = '';
      note.textContent = '';
      note.tags = Array.from({ length: 11 }, (_, i) => `标签${i + 1}`);
      const result = validateNote(note);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateNote - 跨平台差异验证', () => {
    it('微信允许3个标签但小红书允许10个', () => {
      const wechatNote = createValidNote('wechat');
      wechatNote.tags = ['标签1', '标签2', '标签3', '标签4'];
      const wechatResult = validateNote(wechatNote);
      expect(wechatResult.valid).toBe(false);
      expect(wechatResult.errors.some((e) => e.rule === 'maxTags')).toBe(true);

      const xhsNote = createValidNote('xiaohongshu');
      xhsNote.tags = ['标签1', '标签2', '标签3', '标签4'];
      const xhsResult = validateNote(xhsNote);
      const xhsTagErrors = xhsResult.errors.filter((e) => e.rule === 'maxTags');
      expect(xhsTagErrors).toHaveLength(0);
    });

    it('微博允许 gif 格式但小红书不允许', () => {
      const spec = getPlatformSpec('weibo');
      const weiboNote = createValidNote('weibo');
      weiboNote.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/animation.gif',
          width: spec.imageSpecs.minWidth,
          height: spec.imageSpecs.minHeight,
          altText: 'GIF动图',
        },
      ];
      const weiboResult = validateNote(weiboNote);
      const weiboFormatErrors = weiboResult.errors.filter((e) => e.rule === 'allowedFormats');
      expect(weiboFormatErrors).toHaveLength(0);

      const xhsNote = createValidNote('xiaohongshu');
      xhsNote.images = [
        {
          id: 'img-1',
          noteId: 'test-note-1',
          url: 'https://example.com/animation.gif',
          width: 600,
          height: 600,
          altText: 'GIF动图',
        },
      ];
      const xhsResult = validateNote(xhsNote);
      expect(xhsResult.errors.some((e) => e.rule === 'allowedFormats')).toBe(true);
    });
  });
});
