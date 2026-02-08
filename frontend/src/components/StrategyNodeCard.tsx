import { useState } from 'react';

export interface StrategyNodeItem {
  id: string;
  scheduledDate: string;
  topic: string;
  contentType: string;
  frequency: string;
  expectedEffect: string;
  note?: {
    id: string;
    title: string;
    textContent: string;
    status: string;
  };
  status: 'planned' | 'content_ready' | 'published';
}

interface StrategyNodeCardProps {
  node: StrategyNodeItem;
  onAdjust: (nodeId: string, changes: { topic?: string; contentType?: string }) => void;
  onPublish: (nodeId: string) => void;
  isLast: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: '计划中', color: '#8c8c8c', bg: '#f5f5f5' },
  content_ready: { label: '内容就绪', color: '#1890ff', bg: '#e6f7ff' },
  published: { label: '已发布', color: '#52c41a', bg: '#f6ffed' },
};

function StrategyNodeCard({ node, onAdjust, onPublish, isLast }: StrategyNodeCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTopic, setEditTopic] = useState(node.topic);
  const [editContentType, setEditContentType] = useState(node.contentType);

  const status = statusConfig[node.status] || statusConfig.planned;

  const handleSave = () => {
    const changes: { topic?: string; contentType?: string } = {};
    if (editTopic !== node.topic) changes.topic = editTopic;
    if (editContentType !== node.contentType) changes.contentType = editContentType;
    if (Object.keys(changes).length > 0) {
      onAdjust(node.id, changes);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTopic(node.topic);
    setEditContentType(node.contentType);
    setEditing(false);
  };

  const formattedDate = (() => {
    try {
      const d = new Date(node.scheduledDate);
      return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    } catch {
      return node.scheduledDate;
    }
  })();

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Timeline connector */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 24,
          flexShrink: 0,
        }}
      >
        {/* Dot */}
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: status.color,
            border: `3px solid ${status.bg}`,
            boxShadow: `0 0 0 2px ${status.color}`,
            flexShrink: 0,
            marginTop: 18,
          }}
        />
        {/* Vertical line */}
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              backgroundColor: '#e8e8e8',
              marginTop: 4,
            }}
          />
        )}
      </div>

      {/* Card content */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#fff',
          borderRadius: 10,
          padding: 18,
          border: '1px solid #e8e8e8',
          marginBottom: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}>
            📅 {formattedDate}
          </span>
          <span
            style={{
              fontSize: 12,
              color: status.color,
              backgroundColor: status.bg,
              padding: '2px 10px',
              borderRadius: 12,
              fontWeight: 500,
            }}
          >
            {status.label}
          </span>
        </div>

        {/* Editable fields */}
        {editing ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
                主题
              </label>
              <input
                type="text"
                value={editTopic}
                onChange={(e) => setEditTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
                内容类型
              </label>
              <input
                type="text"
                value={editContentType}
                onChange={(e) => setEditContentType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '4px 14px',
                  backgroundColor: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                保存
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '4px 14px',
                  backgroundColor: '#fff',
                  color: '#666',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 16, color: '#1e293b' }}>
              {node.topic}
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px 16px',
                fontSize: 13,
                color: '#666',
              }}
            >
              <div>
                <span style={{ color: '#999' }}>内容类型：</span>
                {node.contentType}
              </div>
              <div>
                <span style={{ color: '#999' }}>发布频率：</span>
                {node.frequency}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#999' }}>预期效果：</span>
                {node.expectedEffect}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            {node.status !== 'published' && (
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: '5px 14px',
                  backgroundColor: '#fff',
                  color: '#1890ff',
                  border: '1px solid #1890ff',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                ✏️ 调整
              </button>
            )}
            {node.status === 'content_ready' && (
              <button
                onClick={() => onPublish(node.id)}
                style={{
                  padding: '5px 14px',
                  backgroundColor: '#52c41a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                🚀 发布
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StrategyNodeCard;
