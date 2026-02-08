import type { ChatPlan } from '../api/client';

interface TaskProgressProps {
  plan: ChatPlan;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: '等待中', color: '#8b8b8b', bg: '#f0f0f0', icon: '⏳' },
  running: { label: '执行中', color: '#d97706', bg: '#fef3c7', icon: '🔄' },
  completed: { label: '已完成', color: '#059669', bg: '#d1fae5', icon: '✅' },
  failed: { label: '失败', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
};

const taskTypeLabels: Record<string, string> = {
  competitor_analysis: '竞品分析',
  trending_tracking: '热点跟踪',
  content_generation: '内容生成',
  content_publish: '内容发布',
  strategy_generation: '策略生成',
  operation_summary: '运营总结',
  comment_analysis: '评论分析',
};

function TaskProgress({ plan }: TaskProgressProps) {
  const completedCount = plan.steps.filter((s) => s.status === 'completed').length;
  const totalCount = plan.steps.length;

  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
          📋 任务执行计划
        </span>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {completedCount}/{totalCount} 步骤完成
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          backgroundColor: '#e2e8f0',
          borderRadius: 2,
          marginBottom: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
            backgroundColor: '#059669',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Steps list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.steps.map((step) => {
          const config = statusConfig[step.status] || statusConfig.pending;
          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                backgroundColor: '#fff',
              }}
            >
              <span style={{ fontSize: 14 }}>{config.icon}</span>
              <span style={{ flex: 1, fontSize: 13, color: '#334155' }}>
                {taskTypeLabels[step.type] || step.type}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 10,
                  backgroundColor: config.bg,
                  color: config.color,
                  fontWeight: 500,
                }}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskProgress;
