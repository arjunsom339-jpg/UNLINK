import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Bot,
  User,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import useAiStore from '../../store/aiStore';

const SUGGESTIONS = [
  'How does the Skill Exchange matching work?',
  'Recommend active clubs for Computer Science students',
  'What are top tips to prepare for campus placements?',
  'Help me find a project partner for a hackathon',
  'Explain Dijkstra’s algorithm simply',
];

export default function CampusAIChat() {
  const {
    isOpen,
    messages,
    loading,
    closeChat,
    toggleChat,
    sendMessage,
    clearMessages,
    checkStatus,
  } = useAiStore();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Basic formatting helper for markdown-like syntax
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold rendering
      let formatted = line;

      // Handle simple lists
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const itemText = line.trim().substring(2);
        return (
          <li key={idx} style={{ marginLeft: 16, marginBottom: 4 }}>
            {parseInline(itemText)}
          </li>
        );
      }

      // Handle blockquote / notice
      if (line.trim().startsWith('> ')) {
        return (
          <div
            key={idx}
            style={{
              borderLeft: '3px solid #6366f1',
              paddingLeft: 10,
              margin: '8px 0',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.85rem',
            }}
          >
            {parseInline(line.trim().substring(2))}
          </div>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} style={{ height: 6 }} />;
      }

      return (
        <p key={idx} style={{ margin: '0 0 6px 0', lineHeight: 1.55 }}>
          {parseInline(formatted)}
        </p>
      );
    });
  };

  const parseInline = (str) => {
    // Basic regex replacer for **bold** and `code`
    const parts = [];
    let remaining = str;

    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }

      const m = match[0];
      if (m.startsWith('**') && m.endsWith('**')) {
        parts.push(
          <strong key={match.index} style={{ fontWeight: 600, color: 'inherit' }}>
            {m.slice(2, -2)}
          </strong>
        );
      } else if (m.startsWith('`') && m.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            style={{
              background: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              padding: '2px 5px',
              borderRadius: 4,
              fontSize: '0.82rem',
              fontFamily: 'monospace',
            }}
          >
            {m.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? parts : str;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Slide-over / Modal Chat Window (Triggered by Ask Campus AI button) ── */}
      <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            padding: 16,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeChat();
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              height: 'min(640px, 88vh)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card, #131722)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              color: 'var(--text-main, #f1f5f9)',
              fontFamily: 'var(--font-sans, inherit)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.1) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  }}
                >
                  <Bot size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>UniLink AI</h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Campus Copilot & Academic Assistant
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={clearMessages}
                  title="Clear chat"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={closeChat}
                  title="Close"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '100%',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isUser
                          ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                          : 'var(--bg-subtle, rgba(255,255,255,0.06))',
                        color: isUser ? '#ffffff' : 'var(--text-main, #f1f5f9)',
                        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.88rem',
                        wordBreak: 'break-word',
                        boxShadow: isUser
                          ? '0 4px 12px rgba(79,70,229,0.25)'
                          : '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                    >
                      {renderFormattedText(m.text)}

                      {!isUser && (
                        <div
                          style={{
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted, #94a3b8)',
                          }}
                        >
                          <span>Campus AI</span>
                          <button
                            onClick={() => copyText(m.id, m.text)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: 2,
                            }}
                            title="Copy response"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check size={12} color="#34d399" />
                                <span style={{ color: '#34d399' }}>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'rgba(99,102,241,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={14} color="#818cf8" />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '8px 12px',
                      borderRadius: 12,
                    }}
                  >
                    <span className="ai-dot-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="ai-dot-pulse" style={{ animationDelay: '200ms' }} />
                    <span className="ai-dot-pulse" style={{ animationDelay: '400ms' }} />
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 4 }}>
                      Thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips (when only initial message is visible) */}
            {messages.length <= 2 && (
              <div
                style={{
                  padding: '6px 14px 10px',
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                }}
              >
                {SUGGESTIONS.slice(0, 3).map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(sug)}
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                      padding: '6px 10px',
                      borderRadius: 9999,
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      color: '#c7d2fe',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.25)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                      e.currentTarget.style.color = '#c7d2fe';
                    }}
                  >
                    <Lightbulb size={12} color="#a5b4fc" />
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleSend}
              style={{
                padding: '12px 14px',
                background: 'rgba(0,0,0,0.2)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about clubs, academics, placements..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'inherit',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

      {/* Embedded Animations CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .ai-dot-pulse {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #818cf8;
          animation: dotPulse 1.2s infinite ease-in-out;
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </>
  );
}
