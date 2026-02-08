import StrategyNodeCard from './StrategyNodeCard';
import type { StrategyNodeItem } from './StrategyNodeCard';

export interface StrategyDetail {
  id: string;
  category: string;
  goal: string;
  nodes: StrategyNodeItem[];
  publishReady: boolean;
  createdAt: string;
}

interface StrategyTimelineProps {
  strategy: StrategyDetail;
  onAdjustNode: (strategyId: string, nodeId: string, changes: { topic?: string; contentType?: string }) => void;
  onPublishNode: (strategyId: string, nodeId: string) => void;
  onPublishAll: (strategyId: string) => void;
  onBack: () => void;
}

function StrategyTimeline({ strategy, onAdjustNode, onPublishNode, onPublishAll, onBack }: StrategyTimelineProps) {
  const sortedNodes = [...strategy.nodes].sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
  );

  const contentReadyCount = sortedNodes.filter((n) => n.status === 'content_ready').length;
  const publishedCount = sortedNodes.filter((n) => n.status === 'published').length;
  const plannedCount = sortedNodes.filter((n) => n.status === 'planned').length;

  return (
    <div>
      {/* Back button + header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            padding: '6px 14px',
            backgroundColor: '#fff',
            color: '#666',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          ← 返回策略列表
        </button>

        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 20,
            border: '1px solid #e8e8e8',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, color: '#1e293b' }}>
                📊 {strategy.category} - 运营策略
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#64748b' }}>
                🎯 目标：{strategy.goal}
              </p>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: '#8c8c8c' }}>
                  📋 共 {sortedNodes.length} 个节点
                </span>
                {plannedCount > 0 && (
                  <span style={{ color: '#8c8c8c' }}>⏳ 计划中 {plannedCount}</span>
                )}
                {contentReadyCount > 0 && (
                  <span style={{ color: '#1890ff' }}>✅ 内容就绪 {contentReadyCount}</span>
                )}
                {publishedCount > 0 && (
                  <span style={{ color: '#52c41a' }}>🚀 已发布 {publishedCount}</span>
                )}
              </div>
            </div>

            {/* Publish all button */}
            {contentReadyCount > 0 && (
              <button
                onClick={() => onPublishAll(strategy.id)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#52c41a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                🚀 一键发布全部就绪内容 ({contentReadyCount})
              </button>
            )}
          </div>

          {strategy.publishReady && (
            <div
              style={{
                marginTop: 12,
                padding: '6px 12px',
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                fontSize: 13,
                color: '#52c41a',
              }}
            >
              ✅ 策略已达到可直接发布状态
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ paddingLeft: 4 }}>
        {sortedNodes.length === 0 ? (
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
            该策略暂无节点
          </div>
        ) : (
          sortedNodes.map((node, index) => (
            <StrategyNodeCard
              key={node.id}
              node={node}
              isLast={index === sortedNodes.length - 1}
              onAdjust={(nodeId, changes) => onAdjustNode(strategy.id, nodeId, changes)}
              onPublish={(nodeId) => onPublishNode(strategy.id, nodeId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default StrategyTimeline;
