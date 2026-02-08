/**
 * 平台规范验证器
 *
 * 为每个平台（小红书、抖音、微博、微信）定义内容验证规则，
 * 确保生成的笔记符合目标平台的发布规范（Publish_Ready）。
 *
 * 验证规则包括：文本长度、标题长度、图片尺寸、标签数量等。
 */

import type {
  Note,
  Platform,
  PlatformSpec,
  ValidationResult,
  ValidationError,
} from '../types/index.js';

/**
 * 各平台的规范配置
 */
export const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  xiaohongshu: {
    platform: 'xiaohongshu',
    maxTextLength: 1000,
    maxTitleLength: 20,
    maxTags: 10,
    maxImages: 9,
    imageSpecs: {
      maxWidth: 2160,
      maxHeight: 2880,
      minWidth: 600,
      minHeight: 600,
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    },
  },
  douyin: {
    platform: 'douyin',
    maxTextLength: 2000,
    maxTitleLength: 30,
    maxTags: 5,
    maxImages: 12,
    imageSpecs: {
      maxWidth: 1920,
      maxHeight: 1080,
      minWidth: 480,
      minHeight: 480,
      allowedFormats: ['jpg', 'jpeg', 'png'],
    },
  },
  weibo: {
    platform: 'weibo',
    maxTextLength: 2000,
    maxTitleLength: 40,
    maxTags: 9,
    maxImages: 9,
    imageSpecs: {
      maxWidth: 4096,
      maxHeight: 4096,
      minWidth: 200,
      minHeight: 200,
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    },
  },
  wechat: {
    platform: 'wechat',
    maxTextLength: 20000,
    maxTitleLength: 64,
    maxTags: 3,
    maxImages: 9,
    imageSpecs: {
      maxWidth: 1440,
      maxHeight: 2560,
      minWidth: 200,
      minHeight: 200,
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
    },
  },
};

/**
 * 获取指定平台的规范配置
 */
export function getPlatformSpec(platform: Platform): PlatformSpec {
  return PLATFORM_SPECS[platform];
}

/**
 * 验证笔记标题
 */
function validateTitle(
  title: string,
  spec: PlatformSpec
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!title || title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: `标题不能为空`,
      rule: 'required',
    });
  } else if (title.length > spec.maxTitleLength) {
    errors.push({
      field: 'title',
      message: `标题长度 ${title.length} 超过平台限制 ${spec.maxTitleLength}`,
      rule: 'maxTitleLength',
    });
  }

  return errors;
}

/**
 * 验证笔记文本内容
 */
function validateTextContent(
  textContent: string,
  spec: PlatformSpec
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!textContent || textContent.trim().length === 0) {
    errors.push({
      field: 'textContent',
      message: `文本内容不能为空`,
      rule: 'required',
    });
  } else if (textContent.length > spec.maxTextLength) {
    errors.push({
      field: 'textContent',
      message: `文本长度 ${textContent.length} 超过平台限制 ${spec.maxTextLength}`,
      rule: 'maxTextLength',
    });
  }

  return errors;
}

/**
 * 验证笔记标签
 */
function validateTags(
  tags: string[],
  spec: PlatformSpec
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (tags.length > spec.maxTags) {
    errors.push({
      field: 'tags',
      message: `标签数量 ${tags.length} 超过平台限制 ${spec.maxTags}`,
      rule: 'maxTags',
    });
  }

  for (let i = 0; i < tags.length; i++) {
    if (!tags[i] || tags[i].trim().length === 0) {
      errors.push({
        field: `tags[${i}]`,
        message: `标签不能为空字符串`,
        rule: 'tagNotEmpty',
      });
    }
  }

  return errors;
}

/**
 * 验证笔记图片
 */
function validateImages(
  images: Note['images'],
  spec: PlatformSpec
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (images.length > spec.maxImages) {
    errors.push({
      field: 'images',
      message: `图片数量 ${images.length} 超过平台限制 ${spec.maxImages}`,
      rule: 'maxImages',
    });
  }

  const { imageSpecs } = spec;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    if (img.width < imageSpecs.minWidth) {
      errors.push({
        field: `images[${i}].width`,
        message: `图片宽度 ${img.width} 低于最小要求 ${imageSpecs.minWidth}`,
        rule: 'minWidth',
      });
    }

    if (img.width > imageSpecs.maxWidth) {
      errors.push({
        field: `images[${i}].width`,
        message: `图片宽度 ${img.width} 超过最大限制 ${imageSpecs.maxWidth}`,
        rule: 'maxWidth',
      });
    }

    if (img.height < imageSpecs.minHeight) {
      errors.push({
        field: `images[${i}].height`,
        message: `图片高度 ${img.height} 低于最小要求 ${imageSpecs.minHeight}`,
        rule: 'minHeight',
      });
    }

    if (img.height > imageSpecs.maxHeight) {
      errors.push({
        field: `images[${i}].height`,
        message: `图片高度 ${img.height} 超过最大限制 ${imageSpecs.maxHeight}`,
        rule: 'maxHeight',
      });
    }

    // Validate image format from URL
    const format = extractImageFormat(img.url);
    if (format && !imageSpecs.allowedFormats.includes(format)) {
      errors.push({
        field: `images[${i}].url`,
        message: `图片格式 "${format}" 不在允许的格式列表中 [${imageSpecs.allowedFormats.join(', ')}]`,
        rule: 'allowedFormats',
      });
    }
  }

  return errors;
}

/**
 * 从 URL 中提取图片格式（文件扩展名）
 */
function extractImageFormat(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\.(\w+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * 验证平台预览数据
 */
function validatePlatformPreview(
  note: Note
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!note.platformPreview) {
    errors.push({
      field: 'platformPreview',
      message: '缺少平台预览数据',
      rule: 'required',
    });
  } else if (note.platformPreview.platform !== note.platform) {
    errors.push({
      field: 'platformPreview.platform',
      message: `预览平台 "${note.platformPreview.platform}" 与笔记目标平台 "${note.platform}" 不一致`,
      rule: 'platformMatch',
    });
  }

  return errors;
}

/**
 * 验证笔记是否符合目标平台的发布规范
 *
 * @param note - 待验证的笔记
 * @returns 验证结果，包含是否通过和错误列表
 */
export function validateNote(note: Note): ValidationResult {
  const spec = getPlatformSpec(note.platform);
  const errors: ValidationError[] = [];

  errors.push(...validateTitle(note.title, spec));
  errors.push(...validateTextContent(note.textContent, spec));
  errors.push(...validateTags(note.tags, spec));
  errors.push(...validateImages(note.images, spec));
  errors.push(...validatePlatformPreview(note));

  return {
    valid: errors.length === 0,
    errors,
  };
}
