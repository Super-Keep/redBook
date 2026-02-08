import { useState } from 'react';
import {
  getAnalyticsSummary,
  getCommentAnalysis,
  type OperationSummaryResponse,
  type CommentAnalysisResponse,
  type OptimizationSuggestionResponse,
  type AnomalyAlertResponse,
} from '../api/client';

// ============================================================
// Helper: format date to YYYY-MM-DD for input[type=date]
// ============================================================
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Styles
// ============================================================
const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 20,
  border: '1px solid #e0e0e0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '28px 0 14px',
  fontSize: 18,
  fontWeight: 600,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
};

const bigNumberStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  margin: '8px 0 0',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  padding: '7px 12px',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: 14,
};

// ============================================================
// Summary Card Component
// ============================================================
function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <div style={{ ...cardStyle, textAlign: 'center', minWidth: 120 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={bigNumberStyle}>{value}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  );
}

// ============================================================
// Sentiment Bar Component (CSS-based chart)
// ============================================================
function SentimentBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const pPct = Math.round(positive * 100);
  const nPct = Math.round(neutral * 100);
  const negPct = Math.round(negative * 100);

  return (
    <div>
      {/* Stacked bar */}
      <div
        style={{
          display: 'flex',
          height: 28,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        {pPct > 0 && (
          <div
            style={{
              width: `${pPct}%`,
              backgroundColor: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {pPct}%
          </div>
        )}
        {nPct > 0 && (
          <div
            style={{
              width: `${nPct}%`,
              backgroundColor: '#a3a3a3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {nPct}%
          </div>
        )}
        {negPct > 0 && (
          <div
            style={{
              width: `${negPct}%`,
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {negPct}%
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: '#22c55e',
              marginRight: 4,
            }}
          />
          正面 {pPct}%
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: '#a3a3a3',
              marginRight: 4,
            }}
          />
          中性 {nPct}%
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: '#ef4444',
              marginRight: 4,
            }}
          />
          负面 {negPct}%
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Priority / Severity badge helpers
// ============================================================
function priorityBadge(priority: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    high: { bg: '#fee2e2', text: '#dc2626' },
    medium: { bg: '#fff7ed', text: '#ea580c' },
    low: { bg: '#f3f4f6', text: '#6b7280' },
  };
  const c = colors[priority] ?? colors.low;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      {priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}
    </span>
  );
}

function severityBadge(severity: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    high: { bg: '#fee2e2', text: '#dc2626' },
    medium: { bg: '#fff7ed', text: '#ea580c' },
    low: { bg: '#fefce8', text: '#ca8a04' },
  };
  const c = colors[severity] ?? colors.low;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      {severity === 'high' ? '严重' : severity === 'medium' ? '警告' : '提示'}
    </span>
  );
}

function suggestionIcon(type: string) {
  const icons: Record<string, string> = {
    timing: '⏰',
    content: '📝',
    tags: '🏷️',
    frequency: '📅',
  };
  return icons[type] ?? '💡';
}

const metricLabels: Record<string, string> = {
  views: '浏览量',
  likes: '点赞数',
  comments: '评论数',
  favorites: '收藏数',
  shares: '分享数',
};

// ============================================================
// Main Component
// ============================================================
function AnalyticsPage() {
  // Time range state
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const [startDate, setStartDate] = useState(toDateString(weekAgo));
  const [endDate, setEndDate] = useState(toDateString(now));

  // Summary state
  const [summary, setSummary] = useState<OperationSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Comment analysis state
  const [commentNoteId, setCommentNoteId] = useState('');
  const [commentAnalysis, setCommentAnalysis] =
    useState<CommentAnalysisResponse | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Optimization suggestions (derived from summary fetch for demo)
  const [suggestions] = useState<OptimizationSuggestionResponse[]>([
    {
      type: 'timing',
      title: '最佳发布时间',
      description: '数据显示 20:00 左右发布的内容互动量最高，建议在此时间段发布',
      confidence: 0.85,
      basedOn: '基于历史互动数据分析',
    },
    {
      type: 'content',
      title: '提升点赞率',
      description: '当前点赞率偏低，建议优化内容质量，增加互动引导语',
      confidence: 0.7,
      basedOn: '当前点赞率 2.1%',
    },
    {
      type: 'tags',
      title: '优化标签策略',
      description: '建议结合热门话题标签和精准长尾标签，提升内容曝光率',
      confidence: 0.6,
      basedOn: '基于整体内容表现',
    },
  ]);

  // Anomaly alerts (static demo data)
  const [alerts] = useState<AnomalyAlertResponse[]>([
    {
      noteId: 'note-001',
      metric: 'views',
      currentValue: 15200,
      expectedValue: 3200,
      deviation: 3.75,
      detectedAt: new Date().toISOString(),
      possibleReasons: ['内容可能被平台推荐', '可能触发了热门话题'],
    },
  ]);

  // --------------------------------------------------------
  // Fetch summary
  // --------------------------------------------------------
  async function handleFetchSummary() {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await getAnalyticsSummary({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (res.error) {
        setSummaryError(res.error);
      } else {
        setSummary(res.data.summary);
      }
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setSummaryLoading(false);
    }
  }

  // --------------------------------------------------------
  // Fetch comment analysis
  // --------------------------------------------------------
  async function handleFetchComments() {
    if (!commentNoteId.trim()) return;
    setCommentLoading(true);
    setCommentError('');
    try {
      const res = await getCommentAnalysis(commentNoteId.trim());
      if (res.error) {
        setCommentError(res.error);
      } else {
        setCommentAnalysis(res.data.analysis);
      }
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setCommentLoading(false);
    }
  }

  // --------------------------------------------------------
  // Compute engagement rate
  // --------------------------------------------------------
  const engagementRate =
    summary && summary.totalViews > 0
      ? (
          ((summary.totalLikes +
            summary.totalComments +
            summary.totalFavorites) /
            summary.totalViews) *
          100
        ).toFixed(1)
      : '0.0';

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>📈 数据分析</h2>
      <p style={{ color: '#666', marginTop: 0 }}>
        运营数据仪表盘，展示互动趋势、评论分析和优化建议。
      </p>

      {/* ====== Time Range Selector ====== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontSize: 14 }}>
          开始日期：
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          结束日期：
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </label>
        <button
          style={btnStyle}
          onClick={handleFetchSummary}
          disabled={summaryLoading}
        >
          {summaryLoading ? '查询中...' : '查询'}
        </button>
      </div>

      {summaryError && (
        <div
          style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            padding: '8px 14px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {summaryError}
        </div>
      )}

      {/* ====== Summary Cards Row ====== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 14,
          marginBottom: 8,
        }}
      >
        <SummaryCard
          icon="📄"
          value={summary?.totalNotes ?? '-'}
          label="笔记总数"
        />
        <SummaryCard
          icon="👁️"
          value={summary?.totalViews ?? '-'}
          label="总浏览量"
        />
        <SummaryCard
          icon="👍"
          value={summary?.totalLikes ?? '-'}
          label="总点赞数"
        />
        <SummaryCard
          icon="💬"
          value={summary?.totalComments ?? '-'}
          label="总评论数"
        />
        <SummaryCard
          icon="⭐"
          value={summary?.totalFavorites ?? '-'}
          label="总收藏数"
        />
        <SummaryCard
          icon="📊"
          value={summary ? `${engagementRate}%` : '-'}
          label="平均互动率"
        />
      </div>

      {/* Insights */}
      {summary && summary.insights.length > 0 && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 8,
            backgroundColor: '#f0f9ff',
            borderColor: '#bae6fd',
          }}
        >
          <strong style={{ fontSize: 14 }}>📌 数据洞察</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 14 }}>
            {summary.insights.map((insight, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ====== Comment Analysis Section ====== */}
      <h3 style={sectionTitleStyle}>💬 评论分析</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="输入笔记 ID"
          value={commentNoteId}
          onChange={(e) => setCommentNoteId(e.target.value)}
          style={{ ...inputStyle, minWidth: 200 }}
        />
        <button
          style={btnStyle}
          onClick={handleFetchComments}
          disabled={commentLoading || !commentNoteId.trim()}
        >
          {commentLoading ? '分析中...' : '分析评论'}
        </button>
      </div>

      {commentError && (
        <div
          style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            padding: '8px 14px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {commentError}
        </div>
      )}

      {commentAnalysis && (
        <div style={{ ...cardStyle, marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <strong style={{ fontSize: 15 }}>
              笔记 {commentAnalysis.noteId} 的评论分析
            </strong>
            <span style={{ fontSize: 13, color: '#666' }}>
              共 {commentAnalysis.totalComments} 条评论
            </span>
          </div>

          {/* Sentiment bar chart */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
              情感分布
            </div>
            {commentAnalysis.totalComments > 0 ? (
              <SentimentBar
                positive={commentAnalysis.sentimentDistribution.positive}
                neutral={commentAnalysis.sentimentDistribution.neutral}
                negative={commentAnalysis.sentimentDistribution.negative}
              />
            ) : (
              <p style={{ color: '#999', fontSize: 14 }}>暂无评论数据</p>
            )}
          </div>

          {/* Top keywords */}
          {commentAnalysis.topKeywords.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
                热门关键词
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {commentAnalysis.topKeywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      padding: '3px 12px',
                      backgroundColor: '#eef2ff',
                      color: '#4338ca',
                      borderRadius: 14,
                      fontSize: 13,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary text */}
          <div
            style={{
              backgroundColor: '#f9fafb',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.6,
            }}
          >
            {commentAnalysis.summary}
          </div>
        </div>
      )}

      {/* ====== Optimization Suggestions Section ====== */}
      <h3 style={sectionTitleStyle}>💡 优化建议</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
          marginBottom: 8,
        }}
      >
        {suggestions.map((s, i) => (
          <div key={i} style={cardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {suggestionIcon(s.type)} {s.title}
              </span>
              {priorityBadge(
                s.confidence >= 0.8
                  ? 'high'
                  : s.confidence >= 0.6
                    ? 'medium'
                    : 'low',
              )}
            </div>
            <p style={{ fontSize: 14, color: '#555', margin: '0 0 8px' }}>
              {s.description}
            </p>
            <div style={{ fontSize: 12, color: '#999' }}>{s.basedOn}</div>
          </div>
        ))}
        {suggestions.length === 0 && (
          <p style={{ color: '#999' }}>暂无优化建议</p>
        )}
      </div>

      {/* ====== Anomaly Alerts Section ====== */}
      <h3 style={sectionTitleStyle}>🚨 异常告警</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {alerts.map((alert, i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              borderLeft: `4px solid ${
                alert.deviation > 3
                  ? '#dc2626'
                  : alert.deviation > 2
                    ? '#ea580c'
                    : '#ca8a04'
              }`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {metricLabels[alert.metric] ?? alert.metric} 异常
              </span>
              {severityBadge(
                alert.deviation > 3
                  ? 'high'
                  : alert.deviation > 2
                    ? 'medium'
                    : 'low',
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: '#888' }}>当前值</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
                  {alert.currentValue.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888' }}>预期值</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#6b7280' }}>
                  {alert.expectedValue.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888' }}>偏差倍数</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ea580c' }}>
                  {alert.deviation}σ
                </div>
              </div>
            </div>

            {/* Deviation bar */}
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  height: 8,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (alert.currentValue / Math.max(alert.expectedValue, 1)) * 50)}%`,
                    height: '100%',
                    backgroundColor:
                      alert.deviation > 3
                        ? '#dc2626'
                        : alert.deviation > 2
                          ? '#ea580c'
                          : '#ca8a04',
                    borderRadius: 4,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>

            {alert.possibleReasons.length > 0 && (
              <div style={{ fontSize: 13, color: '#555' }}>
                <strong>可能原因：</strong>
                {alert.possibleReasons.join('、')}
              </div>
            )}

            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              检测时间：{new Date(alert.detectedAt).toLocaleString('zh-CN')}
            </div>

            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              笔记 ID：{alert.noteId}
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p style={{ color: '#999' }}>暂无异常告警</p>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
