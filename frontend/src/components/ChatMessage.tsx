import type { ChatPlan } from '../api/client';
import TaskProgress from './TaskProgress';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'clarification' | 'response';
  plan?: ChatPlan;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isClarification = message.type === 'clarification';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Role label */}
        <span
          style={{
            fontSize: 11,
            color: '#94a3b8',
            marginBottom: 4,
            paddingLeft: isUser ? 0 : 4,
            paddingRight: isUser ? 4 : 0,
          }}
        >
          {isUser ? '我' : '🤖 数字员工'}
        </span>

        {/* Message bubble */}
        <div
          style={{
            padding: '10px 16px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            backgroundColor: isUser
              ? '#0f3460'
              : isClarification
                ? '#fff7ed'
                : '#ffffff',
            color: isUser ? '#ffffff' : '#1e293b',
            border: isUser
              ? 'none'
              : isClarification
                ? '1px solid #fed7aa'
                : '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            lineHeight: 1.6,
            fontSize: 14,
            wordBreak: 'break-word',
          }}
        >
          {/* Clarification icon */}
          {isClarification && (
            <div
              style={{
                fontSize: 12,
                color: '#d97706',
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              💡 需要更多信息
            </div>
          )}

          {message.content}

          {/* Task progress */}
          {message.plan && message.plan.steps.length > 0 && (
            <TaskProgress plan={message.plan} />
          )}
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontSize: 10,
            color: '#cbd5e1',
            marginTop: 4,
            paddingLeft: isUser ? 0 : 4,
            paddingRight: isUser ? 4 : 0,
          }}
        >
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

export default ChatMessage;
