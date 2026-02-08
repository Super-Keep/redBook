import { useState, useRef, useEffect, useCallback } from 'react';
import { sendMessage } from '../api/client';
import ChatMessage from '../components/ChatMessage';
import type { Message } from '../components/ChatMessage';

/** Generate a unique session ID */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

let idCounter = 0;
function generateMessageId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

const exampleCommands = [
  '帮我分析小红书美妆赛道的竞品',
  '生成一篇关于秋季护肤的小红书笔记',
  '查看当前热门话题',
  '制定本周运营策略',
];

function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendMessage(messageText, sessionId);

      if (result.error) {
        const errorMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: `错误: ${result.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const data = result.data;
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.message,
          type: data.type,
          plan: data.plan,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: '网络错误，请检查网络连接后重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 48px)',
        maxHeight: 'calc(100vh - 48px)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>
          💬 对话交互
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          通过自然语言与数字员工对话，下达运营任务指令
        </p>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: 20,
          marginBottom: 12,
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94a3b8',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#64748b', margin: '0 0 8px' }}>
              你好！我是你的AI数字员工
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>
              输入自然语言指令，我来帮你完成运营任务
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                maxWidth: 500,
              }}
            >
              {exampleCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleSend(cmd)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#fff',
                    color: '#475569',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#0f3460';
                    e.currentTarget.style.color = '#0f3460';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
            }}
          >
            <span style={{ fontSize: 11, color: '#94a3b8' }}>🤖 数字员工</span>
            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: '10px 16px',
                backgroundColor: '#fff',
                borderRadius: '16px 16px 16px 4px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ animation: 'pulse 1.4s infinite', color: '#94a3b8', fontSize: 20 }}>·</span>
              <span style={{ animation: 'pulse 1.4s infinite 0.2s', color: '#94a3b8', fontSize: 20 }}>·</span>
              <span style={{ animation: 'pulse 1.4s infinite 0.4s', color: '#94a3b8', fontSize: 20 }}>·</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 0 0',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? '数字员工正在处理中...' : '输入指令，例如："帮我分析小红书美妆赛道的竞品"'}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            outline: 'none',
            backgroundColor: loading ? '#f8fafc' : '#fff',
            color: '#1e293b',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#0f3460';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            border: 'none',
            backgroundColor: loading || !input.trim() ? '#94a3b8' : '#0f3460',
            color: '#fff',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {loading ? '处理中...' : '发送 ↗'}
        </button>
      </div>

      {/* Session info */}
      <div
        style={{
          fontSize: 11,
          color: '#cbd5e1',
          textAlign: 'right',
          marginTop: 4,
        }}
      >
        会话: {sessionId.substring(0, 20)}...
      </div>
    </div>
  );
}

export default ChatPage;
