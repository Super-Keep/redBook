import { useState } from 'react';

/**
 * Note type matching the backend Note interface.
 * Defined locally to avoid cross-project imports.
 */
export interface NoteItem {
  id: string;
  title: string;
  textContent: string;
  images: { id: string; url: string; width: number; height: number; altText: string }[];
  tags: string[];
  platform: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const platformLabels: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  weibo: '微博',
  wechat: '微信',
};

const platformColors: Record<string, string> = {
  xiaohongshu: '#ff2442',
  douyin: '#000000',
  weibo: '#ff8200',
  wechat: '#07c160',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  ready: '就绪',
  published: '已发布',
  offline: '已下线',
};

const statusColors: Record<string, string> = {
  draft: '#999',
  ready: '#1890ff',
  published: '#52c41a',
  offline: '#ff4d4f',
};

interface NoteCardProps {
  note: NoteItem;
  selected: boolean;
  onSelect: (note: NoteItem) => void;
  onDelete: (noteId: string) => void;
}

function NoteCard({ note, selected, onSelect, onDelete }: NoteCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(note.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const createdDate = new Date(note.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div
      onClick={() => onSelect(note)}
      style={{
        border: selected ? '2px solid #1890ff' : '1px solid #e8e8e8',
        borderRadius: 8,
        padding: 16,
        cursor: 'pointer',
        backgroundColor: selected ? '#f0f7ff' : '#fff',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {/* Header: title + delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note.title || '无标题'}
        </h4>
        <button
          onClick={handleDelete}
          style={{
            border: 'none',
            background: confirmDelete ? '#ff4d4f' : 'transparent',
            color: confirmDelete ? '#fff' : '#999',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 4,
            marginLeft: 8,
            flexShrink: 0,
          }}
          title={confirmDelete ? '再次点击确认删除' : '删除'}
        >
          {confirmDelete ? '确认删除' : '🗑️'}
        </button>
      </div>

      {/* Badges: platform + status */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 3,
            color: '#fff',
            backgroundColor: platformColors[note.platform] || '#666',
          }}
        >
          {platformLabels[note.platform] || note.platform}
        </span>
        <span
          style={{
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 3,
            color: '#fff',
            backgroundColor: statusColors[note.status] || '#999',
          }}
        >
          {statusLabels[note.status] || note.status}
        </span>
      </div>

      {/* Text preview */}
      <p style={{
        fontSize: 12,
        color: '#666',
        margin: '0 0 8px 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        lineHeight: '1.5',
      }}>
        {note.textContent || '暂无内容'}
      </p>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {note.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                backgroundColor: '#f5f5f5',
                color: '#888',
              }}
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span style={{ fontSize: 10, color: '#bbb' }}>+{note.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Date */}
      <div style={{ fontSize: 11, color: '#bbb' }}>
        {createdDate}
      </div>
    </div>
  );
}

export default NoteCard;
