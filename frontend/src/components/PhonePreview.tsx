import type { NoteItem } from './NoteCard';

const platformLabels: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  weibo: '微博',
  wechat: '微信',
};

interface PhonePreviewProps {
  note: NoteItem;
}

/**
 * PhonePreview - 模拟小红书手机端的内容预览组件
 *
 * 以手机外框形式展示笔记内容，包括：
 * - 状态栏
 * - 图片区域
 * - 标题
 * - 正文内容
 * - 标签
 * - 互动按钮区
 *
 * Requirements: 7.1, 7.3
 */
function PhonePreview({ note }: PhonePreviewProps) {
  return (
    <div style={{
      width: 320,
      minHeight: 580,
      backgroundColor: '#000',
      borderRadius: 36,
      padding: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      margin: '0 auto',
    }}>
      {/* Phone inner screen */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 28,
        overflow: 'hidden',
        minHeight: 564,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Status bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          fontSize: 12,
          color: '#333',
          backgroundColor: '#fafafa',
        }}>
          <span>9:41</span>
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {platformLabels[note.platform] || note.platform}
          </span>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span>📶</span>
            <span>🔋</span>
          </span>
        </div>

        {/* Image area */}
        <div style={{
          width: '100%',
          height: 200,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {note.images && note.images.length > 0 ? (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 40 }}>🖼️</span>
              <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>
                {note.images.length} 张图片
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 40 }}>📷</span>
              <p style={{ fontSize: 11, color: '#ccc', margin: '4px 0 0' }}>暂无图片</p>
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ padding: '12px 16px', flex: 1 }}>
          {/* Author row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#ff2442',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
            }}>
              AI
            </div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>AI数字员工</span>
          </div>

          {/* Title */}
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            margin: '0 0 8px 0',
            lineHeight: 1.4,
            color: '#333',
          }}>
            {note.title || '无标题'}
          </h3>

          {/* Text content */}
          <div style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: '#555',
            marginBottom: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 160,
            overflow: 'auto',
          }}>
            {note.textContent || '暂无内容'}
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {note.tags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 13,
                    color: '#1890ff',
                    marginRight: 6,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Date */}
          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 12 }}>
            {new Date(note.createdAt).toLocaleDateString('zh-CN')} 发布
          </div>
        </div>

        {/* Bottom interaction bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: '10px 16px',
          borderTop: '1px solid #f0f0f0',
          fontSize: 13,
          color: '#666',
        }}>
          <span>❤️ 点赞</span>
          <span>⭐ 收藏</span>
          <span>💬 评论</span>
          <span>↗️ 分享</span>
        </div>
      </div>
    </div>
  );
}

export default PhonePreview;
