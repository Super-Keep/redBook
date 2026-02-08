import { useState, useEffect, useCallback } from 'react';
import { getStrategies, createStrategy, adjustStrategyNode } from '../api/client';
import StrategyTimeline from '../components/StrategyTimeline';
import type { StrategyDetail } from '../components/StrategyTimeline';

function StrategyPage() {
  const [strategies, setStrategies] = useState<StrategyDetail[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    category: '',
    goal: '',
    platform: 'xiaohongshu',
    duration: '7天',
  });

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStrategies();
      if (result.error) {
        setError(result.error);
        return;
      }
      const data = result.data;
      const list = data?.strategies ?? [];
      setStrategies(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载策略失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const handleCreateStrategy = async () => {
    if (!createForm.category || !createForm.goal) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createStrategy({
        category: createForm.category,
        goal: createForm.goal,
        platform: createForm.platform,
        duration: createForm.duration,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setShowCreateForm(false);
        setCreateForm({ category: '', goal: '', platform: 'xiaohongshu', duration: '7天' });
        fetchStrategies();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建策略失败');
    } finally {
      setCreating(false);
    }
  };

  const handleAdjustNode = async (
    strategyId: string,
    nodeId: string,
    changes: { topic?: string; contentType?: string },
  ) => {
    setError(null);
    try {
      const result = await adjustStrategyNode(strategyId, nodeId, changes);
      if (result.error) {
        setError(result.error);
        return;
      }
      const updated = result.data?.strategy;
      if (updated) {
        setStrategies((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        if (selectedStrategy?.id === updated.id) {
          setSelectedStrategy(updated);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '调整节点失败');
    }
  };

  const handlePublishNode = async (strategyId: string, nodeId: string) => {
    setError(null);
    try {
      const result = await adjustStrategyNode(strategyId, nodeId, {});
      // Use the PUT endpoint to update status - in a real app this would be a dedicated publish endpoint
      // For now we simulate by re-fetching
      if (result.error) {
        setError(result.error);
      }
      await fetchStrategies();
      // Re-select the strategy to refresh detail view
      const refreshed = strategies.find((s) => s.id === strategyId);
      if (refreshed) setSelectedStrategy(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布节点失败');
    }
  };

  const handlePublishAll = async (strategyId: string) => {
    setError(null);
    const strategy = strategies.find((s) => s.id === strategyId);
    if (!strategy) return;

    const readyNodes = strategy.nodes.filter((n) => n.status === 'content_ready');
    for (const node of readyNodes) {
      try {
        await adjustStrategyNode(strategyId, node.id, {});
      } catch {
        // continue with remaining nodes
      }
    }
    await fetchStrategies();
    const refreshed = strategies.find((s) => s.id === strategyId);
    if (refreshed) setSelectedStrategy(refreshed);
  };

  // Detail view
  if (selectedStrategy) {
    return (
      <div>
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
        <StrategyTimeline
          strategy={selectedStrategy}
          onAdjustNode={handleAdjustNode}
          onPublishNode={handlePublishNode}
          onPublishAll={handlePublishAll}
          onBack={() => setSelectedStrategy(null)}
        />
      </div>
    );
  }

  // List view
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
          <h2 style={{ margin: 0 }}>📊 运营策略</h2>
          <p style={{ color: '#666', margin: '4px 0 0' }}>
            查看和管理运营策略计划，包含时间节点、内容主题和发布安排。
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
          ＋ 创建策略
        </button>
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

      {/* Create Strategy Modal */}
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
              width: 460,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px' }}>创建运营策略</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
                赛道/分类 *
              </label>
              <input
                type="text"
                value={createForm.category}
                onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="例如：美妆、美食、旅行"
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
              <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
                运营目标 *
              </label>
              <input
                type="text"
                value={createForm.goal}
                onChange={(e) => setCreateForm((p) => ({ ...p, goal: e.target.value }))}
                placeholder="例如：提升账号粉丝量至1万"
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
              <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
                目标平台
              </label>
              <select
                value={createForm.platform}
                onChange={(e) => setCreateForm((p) => ({ ...p, platform: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="xiaohongshu">小红书</option>
                <option value="douyin">抖音</option>
                <option value="weibo">微博</option>
                <option value="wechat">微信</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
                策略周期
              </label>
              <select
                value={createForm.duration}
                onChange={(e) => setCreateForm((p) => ({ ...p, duration: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="7天">7天</option>
                <option value="14天">14天</option>
                <option value="30天">30天</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateForm({ category: '', goal: '', platform: 'xiaohongshu', duration: '7天' });
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
                取消
              </button>
              <button
                onClick={handleCreateStrategy}
                disabled={creating || !createForm.category || !createForm.goal}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor:
                    creating || !createForm.category || !createForm.goal ? '#ccc' : '#1890ff',
                  color: '#fff',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {creating ? '创建中...' : '创建策略'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          加载中...
        </div>
      ) : strategies.length === 0 ? (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 40,
            border: '1px solid #ddd',
            textAlign: 'center',
            color: '#999',
          }}
        >
          暂无运营策略，通过对话指令生成策略或点击"创建策略"按钮。
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {strategies.map((strategy) => {
            const nodeCount = strategy.nodes?.length ?? 0;
            const readyCount = strategy.nodes?.filter((n) => n.status === 'content_ready').length ?? 0;
            const publishedCount = strategy.nodes?.filter((n) => n.status === 'published').length ?? 0;

            return (
              <div
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy)}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  padding: 20,
                  border: '1px solid #e8e8e8',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#1890ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e8e8e8';
                }}
              >
                {/* Category badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#1890ff',
                      backgroundColor: '#e6f7ff',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontWeight: 500,
                    }}
                  >
                    {strategy.category}
                  </span>
                  {strategy.publishReady && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#52c41a',
                        backgroundColor: '#f6ffed',
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}
                    >
                      ✅ 可发布
                    </span>
                  )}
                </div>

                {/* Goal */}
                <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#1e293b', lineHeight: 1.4 }}>
                  🎯 {strategy.goal}
                </h3>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#8c8c8c' }}>
                  <span>📋 {nodeCount} 个节点</span>
                  {readyCount > 0 && (
                    <span style={{ color: '#1890ff' }}>✅ {readyCount} 就绪</span>
                  )}
                  {publishedCount > 0 && (
                    <span style={{ color: '#52c41a' }}>🚀 {publishedCount} 已发布</span>
                  )}
                </div>

                {/* Created date */}
                <div style={{ marginTop: 10, fontSize: 12, color: '#bbb' }}>
                  创建于 {new Date(strategy.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StrategyPage;
