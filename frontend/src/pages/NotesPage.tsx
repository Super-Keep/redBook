import { useState, useEffect, useCallback } from 'react';
import { getNotes, createNote } from '../api/client';
import NoteCard from '../components/NoteCard';
import PhonePreview from '../components/PhonePreview';
import type { NoteItem } from '../components/NoteCard';

interface Filters {
  platform: string;
  status: string;
  category: string;
  startDate: string;
  endDate: string;
}

const initialFilters: Filters = {
  platform: '',
  status: '',
  category: '',
  startDate: '',
  endDate: '',
};

function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    topic: '',
    platform: 'xiaohongshu',
    category: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.platform) params.platform = filters.platform;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      const hasParams = Object.keys(params).length > 0;
      const result = await getNotes(hasParams ? params : undefined);
      if (result.error) {
        setError(result.error);
        return;
      }
      const raw = result.data as
        | { notes?: NoteItem[]; total?: number }
        | NoteItem[];
      let list: NoteItem[];
      if (Array.isArray(raw)) {
        list = raw;
      } else if (raw && Array.isArray(raw.notes)) {
        list = raw.notes;
      } else {
        list = [];
      }
      if (filters.startDate) {
        const s = new Date(filters.startDate);
        list = list.filter((n) => new Date(n.createdAt) >= s);
      }
      if (filters.endDate) {
        const e = new Date(filters.endDate);
        e.setHours(23, 59, 59, 999);
        list = list.filter((n) => new Date(n.createdAt) <= e);
      }
      setNotes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectNote = (note: NoteItem) => {
    setSelectedNote(note);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const resp = await fetch('/api/notes/' + noteId, { method: 'DELETE' });
      if (resp.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (selectedNote && selectedNote.id === noteId) {
          setSelectedNote(null);
        }
      }
    } catch (_) {
      /* ignore */
    }
  };

  const handleCreateNote = async () => {
    if (!createForm.topic || !createForm.category) return;
    setCreating(true);
    try {
      const result = await createNote({
        topic: createForm.topic,
        platform: createForm.platform,
        category: createForm.category,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setShowCreateForm(false);
        setCreateForm({ topic: '', platform: 'xiaohongshu', category: '' });
        fetchNotes();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{'📝 内容管理'}</h2>
          <p style={{ color: '#666', margin: '4px 0 0' }}>
            {'管理所有已生成的笔记内容，支持按平台、赛道、状态和时间筛选。'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '8px 20px',
            backgroundColor: '#1890ff',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {'＋ 创建笔记'}
        </button>
      </div>

      {/* Create Note Modal */}
      {showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 420,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px' }}>{'创建新笔记'}</h3>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#666',
                  marginBottom: 4,
                }}
              >
                {'主题 *'}
              </label>
              <input
                type="text"
                value={createForm.topic}
                onChange={(ev) =>
                  setCreateForm((p) => ({ ...p, topic: ev.target.value }))
                }
                placeholder="输入笔记主题"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#666',
                  marginBottom: 4,
                }}
              >
                {'目标平台'}
              </label>
              <select
                value={createForm.platform}
                onChange={(ev) =>
                  setCreateForm((p) => ({ ...p, platform: ev.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="xiaohongshu">{'小红书'}</option>
                <option value="douyin">{'抖音'}</option>
                <option value="weibo">{'微博'}</option>
                <option value="wechat">{'微信'}</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#666',
                  marginBottom: 4,
                }}
              >
                {'赛道/分类 *'}
              </label>
              <input
                type="text"
                value={createForm.category}
                onChange={(ev) =>
                  setCreateForm((p) => ({ ...p, category: ev.target.value }))
                }
                placeholder="输入赛道"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div
              style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateForm({
                    topic: '',
                    platform: 'xiaohongshu',
                    category: '',
                  });
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {'取消'}
              </button>
              <button
                onClick={handleCreateNote}
                disabled={
                  creating || !createForm.topic || !createForm.category
                }
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor:
                    creating || !createForm.topic || !createForm.category
                      ? '#ccc'
                      : '#1890ff',
                  color: '#fff',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Left: filters + list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filter bar */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              border: '1px solid #e8e8e8',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'flex-end',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 4,
                  }}
                >
                  {'平台'}
                </label>
                <select
                  value={filters.platform}
                  onChange={(ev) =>
                    handleFilterChange('platform', ev.target.value)
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                    fontSize: 13,
                  }}
                >
                  <option value="">{'全部平台'}</option>
                  <option value="xiaohongshu">{'小红书'}</option>
                  <option value="douyin">{'抖音'}</option>
                  <option value="weibo">{'微博'}</option>
                  <option value="wechat">{'微信'}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 4,
                  }}
                >
                  {'状态'}
                </label>
                <select
                  value={filters.status}
                  onChange={(ev) =>
                    handleFilterChange('status', ev.target.value)
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                    fontSize: 13,
                  }}
                >
                  <option value="">{'全部状态'}</option>
                  <option value="draft">{'草稿'}</option>
                  <option value="ready">{'就绪'}</option>
                  <option value="published">{'已发布'}</option>
                  <option value="offline">{'已下线'}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 4,
                  }}
                >
                  {'赛道'}
                </label>
                <input
                  type="text"
                  value={filters.category}
                  onChange={(ev) =>
                    handleFilterChange('category', ev.target.value)
                  }
                  placeholder="输入赛道关键词"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    width: 130,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 4,
                  }}
                >
                  {'开始日期'}
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(ev) =>
                    handleFilterChange('startDate', ev.target.value)
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                    fontSize: 13,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 4,
                  }}
                >
                  {'结束日期'}
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(ev) =>
                    handleFilterChange('endDate', ev.target.value)
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                    fontSize: 13,
                  }}
                />
              </div>
              <button
                onClick={() => fetchNotes()}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  height: 32,
                }}
              >
                {'筛选'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: 6,
                color: '#ff4d4f',
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* Note list */}
          {loading ? (
            <div
              style={{ textAlign: 'center', padding: 40, color: '#999' }}
            >
              {'加载中...'}
            </div>
          ) : notes.length === 0 ? (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 40,
                border: '1px solid #e8e8e8',
                textAlign: 'center',
                color: '#999',
              }}
            >
              {'暂无内容，通过对话指令生成笔记或点击"创建笔记"按钮。'}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  selected={
                    selectedNote !== null && selectedNote.id === note.id
                  }
                  onSelect={handleSelectNote}
                  onDelete={handleDeleteNote}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div style={{ width: 360, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#333' }}>
              {'📱 内容预览'}
            </h3>
            {selectedNote ? (
              <PhonePreview note={selectedNote} />
            ) : (
              <div
                style={{
                  width: 320,
                  minHeight: 580,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ccc',
                  fontSize: 14,
                  margin: '0 auto',
                }}
              >
                {'选择一条笔记以预览'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotesPage;
